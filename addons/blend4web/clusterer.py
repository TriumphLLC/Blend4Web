# Copyright (C) 2014-2017 Triumph LLC
# 
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
# 
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
# 
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.


from collections import OrderedDict
import mathutils

import math

_export_uuid_cache = None
_bpy_uuid_cache = None
_cluster_size = 0

NON_LEAF_NEIGHBOR_MARGIN_HACK = 1.01

NON_LOD_DIAG_SIZE = -1

class Cluster():

    def __init__(self, node):
        self.bb_indices = node.bb_indices[:]
        self.center = node.overall_bb.get_center()
        self.radius = math.sqrt(node.overall_bb.get_squared_diag_len()) / 2

class BoundingBox():

    def __init__(self, min_x, min_y, min_z, max_x, max_y, max_z, name="", 
            uuids_arr=[]):
        self.min_x = min_x
        self.min_y = min_y
        self.min_z = min_z
        self.max_x = max_x
        self.max_y = max_y
        self.max_z = max_z

        self.name = name
        self.uuids_arr = uuids_arr

    def expand(self, bb):
        # optimized for intensive use, min() & max() are much slower
        if bb.min_x < self.min_x:
            self.min_x = bb.min_x
        if bb.min_y < self.min_y:
            self.min_y = bb.min_y
        if bb.min_z < self.min_z:
            self.min_z = bb.min_z

        if bb.max_x > self.max_x:
            self.max_x = bb.max_x
        if bb.max_y > self.max_y:
            self.max_y = bb.max_y
        if bb.max_z > self.max_z:
            self.max_z = bb.max_z

    def copy(self):
        bb_copy = BoundingBox(self.min_x, self.min_y, self.min_z, self.max_x, 
                self.max_y, self.max_z, self.name, self.uuids_arr)
        return bb_copy

    def get_center(self):
        cen_x = (self.max_x + self.min_x) / 2
        cen_y = (self.max_y + self.min_y) / 2
        cen_z = (self.max_z + self.min_z) / 2
        return [cen_x, cen_y, cen_z]

    def get_sizes(self):
        size_x = self.max_x - self.min_x
        size_y = self.max_y - self.min_y
        size_z = self.max_z - self.min_z
        return [size_x, size_y, size_z]

    def get_volume(self):
        size_x = self.max_x - self.min_x
        size_y = self.max_y - self.min_y
        size_z = self.max_z - self.min_z
        return size_x * size_y * size_z 

    def is_above_limit(self, diag_limit=NON_LOD_DIAG_SIZE):
        size_x = self.max_x - self.min_x
        size_y = self.max_y - self.min_y
        size_z = self.max_z - self.min_z
        
        is_above = False
        
        if _cluster_size:
            is_above = is_above or (size_x > _cluster_size or size_y > _cluster_size 
                    or size_z > _cluster_size)

        if diag_limit != NON_LOD_DIAG_SIZE:
            is_above = is_above or math.sqrt(self.get_squared_diag_len()) > diag_limit

        return is_above

    def get_squared_diag_len(self):
        sizes = self.get_sizes()
        return sizes[0] * sizes[0] + sizes[1] * sizes[1] + sizes[2] * sizes[2]

    def is_dim_equal_to(self, bb):
        a = self.min_x == bb.min_x
        b = self.min_y == bb.min_y
        c = self.min_z == bb.min_z
        d = self.max_x == bb.max_x
        e = self.max_y == bb.max_y
        f = self.max_z == bb.max_z

        return a and b and c and d and e and f


class BoundingKDTree():

    def __init__(self, bboxes=[], lod_max_diag_size=NON_LOD_DIAG_SIZE):
        self.root = None
        self.index_counter = 0
        self.bboxes = bboxes
        self.lod_max_diag_size = lod_max_diag_size

    def get_some_leaf(self):
        if self.is_empty():
            return None
        else:
            node = self.root
            while node.has_children():
                node = node.left
            return node

    def is_empty(self):
        return self.root is None

    def get_unique_index(self):
        self.index_counter += 1
        return self.index_counter - 1

    def iterate_all_nodes(self, cb, cb_param=None):
        if not self.is_empty():

            # nesting on big scenes can be too heavy for recursion
            nodes = [self.root]
            while len(nodes):
                nodes_next = []
                for node in nodes:
                    cb(self, node, cb_param)
                    if node.has_children():
                        nodes_next.append(node.left)
                        nodes_next.append(node.right)
                nodes = nodes_next

    def build(self):
        # top-down building
        if len(self.bboxes):
            bb_indices = [i for i in range(len(self.bboxes))]
            self.root = BoundingKDTreeNode(self, bb_indices)
            self.root.index = self.get_unique_index()

            def split_cb(kdtree, node, cb_param):
                kdtree.split_node(node)

            self.iterate_all_nodes(split_cb)

    def is_root_node(self, node):
        return self.root == node

    def create_merged_node(self, node0, node1):
        merged_bb_indices = list(set(node0.bb_indices) | set(node1.bb_indices))
        return BoundingKDTreeNode(self, merged_bb_indices)

    # inserting a node based on those bboxes that already exist in this tree;
    # it's used after the merging of already existed nodes
    def insert_merged_node(self, node):
        if self.is_empty():
            self.root = node
            node.index = self.get_unique_index()
            return None
        else:
            node.index = self.get_unique_index()
            nearest_node = self.find_nearest_neighbor(node)
                
            common_bb_indices = list(set(node.bb_indices) | set(nearest_node.bb_indices))
            common_node = BoundingKDTreeNode(self, common_bb_indices)
            common_node.index = self.get_unique_index()

            # setup relation between the new common node and its parent
            if self.is_root_node(nearest_node):
                self.root = common_node
            else:
                if nearest_node.index == nearest_node.parent.left.index:
                    nearest_node.parent.left = common_node
                else:
                    nearest_node.parent.right = common_node
                
                common_node.parent = nearest_node.parent

            # setup relations between the new common node and 2 childs: already 
            # existed node and inserted node
            common_node.left = nearest_node
            common_node.right = node

            nearest_node.parent = common_node
            node.parent = common_node

            curr_node = common_node.parent
            need_update_bb = True
            while curr_node is not None:
                curr_node.bb_indices = list(set(curr_node.left.bb_indices) | set(curr_node.right.bb_indices))

                # update only those bboxes, that were affected by expanding the 
                # overall bbox
                if need_update_bb:
                    old_bb = curr_node.overall_bb.copy()
                    curr_node.update_overall_bb_fast_nonleaf()
                    need_update_bb = not old_bb.is_dim_equal_to(curr_node.overall_bb) 

                curr_node = curr_node.parent

    def insert_node(self, node, node_bboxes):
        # not implemented
        pass

    def remove_node(self, node):
        if not node.has_children():
            if self.is_root_node(node):
                self.root = None
            elif self.is_root_node(node.parent):
                sibling = node.get_sibling()
                self.root = sibling
                sibling.parent = None
            else:
                grand_par = node.parent.parent
                sibling = node.get_sibling()
                if node.parent.index == grand_par.left.index:
                    grand_par.left = sibling
                else:
                    grand_par.right = sibling
                sibling.parent = grand_par

                curr_node = grand_par
                need_update_bb = True
                while curr_node is not None:
                    curr_node.bb_indices = list(set(curr_node.bb_indices) - set(node.bb_indices))

                    # update only those bboxes, that were affected by shrinking 
                    # the overall bbox
                    if need_update_bb:
                        old_bb = curr_node.overall_bb.copy()
                        curr_node.update_overall_bb_fast_nonleaf()
                        need_update_bb = not old_bb.is_dim_equal_to(curr_node.overall_bb) 

                    curr_node = curr_node.parent

            if node.parent is not None:
                node.parent.cleanup()
            node.cleanup()

            # don't cleanup kdtree.bboxes, they stay the same all the time 

    def split_node(self, node):
        names = []
        for index in node.bb_indices:
            bb = self.bboxes[index]
            names.append(bb.name)

        if node.can_split():
            median = [0, 0, 0]
            for index in node.bb_indices:
                bb = self.bboxes[index]
                bb_cen = bb.get_center()
                median[0] += bb_cen[0]
                median[1] += bb_cen[1]
                median[2] += bb_cen[2]
            median[0] /= len(node.bb_indices)
            median[1] /= len(node.bb_indices)
            median[2] /= len(node.bb_indices)

            bb_indices_left_x = []
            bb_indices_right_x = []
            bb_indices_left_y = []
            bb_indices_right_y = []
            bb_indices_left_z = []
            bb_indices_right_z = []

            for index in node.bb_indices:
                bb = self.bboxes[index]
                bb_cen = bb.get_center()

                if bb_cen[0] <= median[0]:
                    bb_indices_left_x.append(index)
                else:
                    bb_indices_right_x.append(index)

                if bb_cen[1] <= median[1]:
                    bb_indices_left_y.append(index)
                else:
                    bb_indices_right_y.append(index)

                if bb_cen[2] <= median[2]:
                    bb_indices_left_z.append(index)
                else:
                    bb_indices_right_z.append(index)

            diff_x = abs(len(bb_indices_left_x) - len(bb_indices_right_x))
            diff_y = abs(len(bb_indices_left_y) - len(bb_indices_right_y))
            diff_z = abs(len(bb_indices_left_z) - len(bb_indices_right_z))
            min_diff = min(diff_x, diff_y, diff_z)

            if min_diff == len(node.bb_indices):
                # bboxes have exactly the same center, split them in-half
                bb_indices_left = node.bb_indices[0:min_diff//2]
                bb_indices_right = node.bb_indices[min_diff//2:]
            elif min_diff == diff_x:
                bb_indices_left = bb_indices_left_x
                bb_indices_right = bb_indices_right_x
            elif min_diff == diff_y:
                bb_indices_left = bb_indices_left_y
                bb_indices_right = bb_indices_right_y
            else:
                bb_indices_left = bb_indices_left_z
                bb_indices_right = bb_indices_right_z

            node.left = BoundingKDTreeNode(self, bb_indices_left)
            node.left.index = self.get_unique_index()
            node.left.parent = node

            names = []
            for index in node.left.bb_indices:
                bb = self.bboxes[index]
                names.append(bb.name)

            node.right = BoundingKDTreeNode(self, bb_indices_right)
            node.right.index = self.get_unique_index()
            node.right.parent = node

            names = []
            for index in node.right.bb_indices:
                bb = self.bboxes[index]
                names.append(bb.name)

    def find_nearest_neighbor(self, node, use_limits=False):
        best_match_vol = float("inf")
        best_match_node = None

        # if the node in the tree we can make initial approximation based on its 
        # sibling
        node_sibling = node.get_sibling()
        if node_sibling is not None:
            bb = node.overall_bb.copy()
            bb.expand(node_sibling.overall_bb)

            if not bb.is_above_limit(self.lod_max_diag_size):
                bb_sq_diag = bb.get_squared_diag_len()
                best_match_vol = bb_sq_diag
                best_match_node = node_sibling
                
                # HACK: rare case when the sibling node isn't a leaf and its bbox 
                # and bboxes of every its child are the same, thereby this node can 
                # become the nearest neighbor - this is not an option, because 
                # the neighbor should be a leaf
                if best_match_node.has_children():
                    best_match_vol *= NON_LEAF_NEIGHBOR_MARGIN_HACK

        [best_match_node, best_match_vol] = self.test_nearest_node_recoursive(node, 
                self.root, best_match_node, best_match_vol, use_limits)

        return best_match_node

    def test_nearest_node_recoursive(self, node, node_to_test, best_match_node, 
            best_match_vol, use_limits=False):

        # don't process the original node
        if node.index == node_to_test.index:
            return [best_match_node, best_match_vol]

        if not node_to_test.has_children():
            bb = node.overall_bb.copy()
            bb.expand(node_to_test.overall_bb)

            # don't process nodes that produce big bboxes (for optimization)
            if not(use_limits and bb.is_above_limit(self.lod_max_diag_size)):
                bb_sq_diag = bb.get_squared_diag_len()
                if bb_sq_diag < best_match_vol:
                    best_match_vol = bb_sq_diag
                    best_match_node = node_to_test
        else:
            lb_left = node.calc_diag_lower_bound(node_to_test.left, use_limits)
            lb_right = node.calc_diag_lower_bound(node_to_test.right, use_limits)

            if lb_left < lb_right:
                if lb_left < best_match_vol:
                    [best_match_node, best_match_vol] = self.test_nearest_node_recoursive(
                            node, node_to_test.left, best_match_node, 
                            best_match_vol, use_limits)
                if lb_right < best_match_vol:
                    [best_match_node, best_match_vol] = self.test_nearest_node_recoursive(
                            node, node_to_test.right, best_match_node, 
                            best_match_vol, use_limits)
            else:
                if lb_right < best_match_vol:
                    [best_match_node, best_match_vol] = self.test_nearest_node_recoursive(
                            node, node_to_test.right, best_match_node, 
                            best_match_vol, use_limits)
                if lb_left < best_match_vol:
                    [best_match_node, best_match_vol] = self.test_nearest_node_recoursive(
                            node, node_to_test.left, best_match_node, 
                            best_match_vol, use_limits)

        return [best_match_node, best_match_vol]

    def to_dot(self):
        PAPER_SIZE = "11.7,16.5";   # A3
        # PAPER_SIZE = "8.3,11.7";    # A4

        dot_str = "digraph scene_kdtree {\n"
        
        dot_str += "    "
        dot_str += "size=\"" + PAPER_SIZE + "\";\n"
        dot_str += "    "
        dot_str += "ratio=\"fill\";\n"

        dot_str += "    "
        dot_str += "node [shape=box margin=\"0.25,0.055\"];\n"


        def dot_cb(kdtree, node, cb_param):
            cb_param["nodes_str"] += "    "
            cb_param["nodes_str"] += node.to_dot()
            if node.has_children():
                cb_param["edges_str"] += "    "
                cb_param["edges_str"] += kdtree.edge_to_dot(node, node.left)
                cb_param["edges_str"] += "    "
                cb_param["edges_str"] += kdtree.edge_to_dot(node, node.right)

        cb_param = {
            "nodes_str": "",
            "edges_str": ""
        }

        self.iterate_all_nodes(dot_cb, cb_param)

        dot_str += cb_param["nodes_str"] + cb_param["edges_str"]
        dot_str += "}"

        return dot_str

    def edge_to_dot(self, node_from, node_to):
        return str(node_from.index) + " -> " + str(node_to.index) + ";\n";
        

class BoundingKDTreeNode():

    def __init__(self, kdtree, bb_indices):
        self.kdtree = kdtree
        self.index = -1

        self.left = None
        self.right = None
        self.parent = None
        self.overall_bb = None
        
        self.bb_indices = bb_indices
        self.update_overall_bb()

    def update_overall_bb(self):
        # optimized for intensive use
        if len(self.bb_indices):
            bbox_0 = self.kdtree.bboxes[self.bb_indices[0]].copy()
            min_x = bbox_0.min_x
            min_y = bbox_0.min_y
            min_z = bbox_0.min_z
            max_x = bbox_0.max_x
            max_y = bbox_0.max_y
            max_z = bbox_0.max_z

            for i in range(1, len(self.bb_indices)):
                bbox = self.kdtree.bboxes[self.bb_indices[i]]

                if bbox.min_x < min_x:
                    min_x = bbox.min_x
                if bbox.min_y < min_y:
                    min_y = bbox.min_y
                if bbox.min_z < min_z:
                    min_z = bbox.min_z

                if bbox.max_x > max_x:
                    max_x = bbox.max_x
                if bbox.max_y > max_y:
                    max_y = bbox.max_y
                if bbox.max_z > max_z:
                    max_z = bbox.max_z
            self.overall_bb = BoundingBox(min_x, min_y, min_z, max_x, max_y, max_z)
        else:
            self.overall_bb = BoundingBox(0, 0, 0, 0, 0, 0)

    def update_overall_bb_fast_nonleaf(self):
        # with assumption that left and right children have correct bounding boxes
        # suitable for bottom-up updates
        if self.has_children():
            min_x = min(self.left.overall_bb.min_x, self.right.overall_bb.min_x)
            min_y = min(self.left.overall_bb.min_y, self.right.overall_bb.min_y)
            min_z = min(self.left.overall_bb.min_z, self.right.overall_bb.min_z)

            max_x = max(self.left.overall_bb.max_x, self.right.overall_bb.max_x)
            max_y = max(self.left.overall_bb.max_y, self.right.overall_bb.max_y)
            max_z = max(self.left.overall_bb.max_z, self.right.overall_bb.max_z)

            self.overall_bb = BoundingBox(min_x, min_y, min_z, max_x, max_y, max_z)

    def calc_diag_lower_bound(self, test_node, use_limits=False):
        # optimized for intensive use
        bb_src = self.overall_bb
        bb_test = test_node.overall_bb

        bb_sizes = bb_src.get_sizes()

        if bb_src.min_x > bb_test.max_x:
            lb_x = bb_sizes[0] + bb_src.min_x - bb_test.max_x
        elif bb_src.max_x < bb_test.min_x:
            lb_x = bb_sizes[0] + bb_test.min_x - bb_src.max_x
        else:
            lb_x = bb_sizes[0]

        if bb_src.min_y > bb_test.max_y:
            lb_y = bb_sizes[1] + bb_src.min_y - bb_test.max_y
        elif bb_src.max_y < bb_test.min_y:
            lb_y = bb_sizes[1] + bb_test.min_y - bb_src.max_y
        else:
            lb_y = bb_sizes[1]

        if bb_src.min_z > bb_test.max_z:
            lb_z = bb_sizes[2] + bb_src.min_z - bb_test.max_z
        elif bb_src.max_z < bb_test.min_z:
            lb_z = bb_sizes[2] + bb_test.min_z - bb_src.max_z
        else:
            lb_z = bb_sizes[2]

        sq_diag = lb_x * lb_x + lb_y * lb_y + lb_z * lb_z

        # prune the branches that produce big bboxes by returning the infinity,
        # so they can't compete with other branches (for optimization)
        if use_limits:
            if _cluster_size and (lb_x > _cluster_size or lb_y > _cluster_size 
                    or lb_z > _cluster_size):
                return float("inf")

            diag_lim = self.kdtree.lod_max_diag_size
            if diag_lim != NON_LOD_DIAG_SIZE and math.sqrt(sq_diag) > diag_lim:
                return float("inf")
        
        return sq_diag

    def has_children(self):
        # can only have zero or 2 children
        return self.left is not None and self.right is not None

    def can_split(self):
        return not self.has_children() and len(self.bb_indices) > 1

    def get_sibling(self):
        if self.parent is None:
            return None
        elif self.index == self.parent.left.index:
            return self.parent.right
        else:
            return self.parent.left

    def cleanup(self):
        self.index = -1
        self.left = None
        self.right = None
        self.parent = None
        self.bb_indices = []
        self.overall_bb = None

    def to_dot(self):
        index = str(self.index)
        label = "node_" + index

        if self.has_children():
            style = "solid"
            fillcolor = "white"
        else:
            names = []
            for i in self.bb_indices:
                names.append(self.kdtree.bboxes[i].name)
            label += ": " + "|".join(names)
            style = "filled"
            fillcolor = "lightgray"

        color = "black"        

        dot_str = index + " [label=\"" + label + "\" "
        dot_str += "color=\"" + color + "\" "
        dot_str += "style=\"" + style + "\" "
        dot_str += "fillcolor=\"" + fillcolor + "\""
        dot_str += "];\n"
        return dot_str


def get_export_datablock(uuid):
    return _export_uuid_cache and _export_uuid_cache[uuid]

def get_bpy_datablock(uuid):
    return _bpy_uuid_cache and _bpy_uuid_cache[uuid]

def run(export_uuid_cache, bpy_uuid_cache, scene, cluster_size, lod_cluster_size_mult):
    global _export_uuid_cache
    _export_uuid_cache = export_uuid_cache
    global _bpy_uuid_cache
    _bpy_uuid_cache = bpy_uuid_cache
    global _cluster_size
    _cluster_size = cluster_size

    bboxes_all = process_objs_boundings_rec(scene["objects"])
    bboxes_lods_groups = separate_lods_bboxes(bboxes_all, lod_cluster_size_mult)

    cluster_counter = 0
    for dist_id in bboxes_lods_groups:

        # 0 means that non-lods clustering is disabled
        if _cluster_size == 0 and dist_id == NON_LOD_DIAG_SIZE:
            continue

        bboxes = bboxes_lods_groups[dist_id]

        kdtree = BoundingKDTree(bboxes, dist_id)
        kdtree.build()

        clusters = make_clusters_from_kd(kdtree)
        for i in range(len(clusters)):
            cluster = clusters[i]

            for index in cluster.bb_indices:
                bbox = kdtree.bboxes[index]

                root_obj = get_export_datablock(bbox.uuids_arr[0])
                curr_level = root_obj["b4w_cluster_data"]
                for j in range(1, len(bbox.uuids_arr)):
                    uuid = bbox.uuids_arr[j]
                    if not uuid in curr_level:
                        curr_level[uuid] = OrderedDict()
                    curr_level = curr_level[uuid]
                curr_level["cluster_id"] = cluster_counter
                curr_level["cluster_center"] = cluster.center
                # NOTE: unused
                curr_level["cluster_radius"] = cluster.radius
            cluster_counter += 1

def separate_lods_bboxes(bboxes, lod_cluster_size_mult):
    uuids_to_distances = {}

    for bbox in bboxes:

        obj = get_export_datablock(bbox.uuids_arr[-1])
        if len(obj["lod_levels"]):
            dist = obj["lod_levels"][0]["distance"]
            uuids_to_distances["".join(bbox.uuids_arr)] = dist

            for level in obj["lod_levels"]:
                if level["object"]:
                    uuids_to_distances["".join(bbox.uuids_arr[0:-1]) + level["object"]["uuid"]] = dist


    bboxes_lods_groups = {NON_LOD_DIAG_SIZE: []}
    for bbox in bboxes:
        uuid_key = "".join(bbox.uuids_arr)

        if uuid_key in uuids_to_distances:
            dist = uuids_to_distances[uuid_key]
            lod_max_diag_size = dist * lod_cluster_size_mult

            if lod_max_diag_size not in bboxes_lods_groups:
                bboxes_lods_groups[lod_max_diag_size] = []
            bboxes_lods_groups[lod_max_diag_size].append(bbox)
        else:
            # non-lods
            bboxes_lods_groups[NON_LOD_DIAG_SIZE].append(bbox)

    return bboxes_lods_groups

def process_objs_boundings_rec(objs_refs, dupli_wmat=mathutils.Matrix.Identity(4), uuids_arr=[]):
    bboxes = []
    for obj_ref in objs_refs:
        obj = get_export_datablock(obj_ref["uuid"])
        res_wmat = dupli_wmat * get_obj_wmat_wo_dupli_rec(obj)

        if obj["type"] == "MESH":
            bpy_mesh = get_bpy_datablock(obj["data"]["uuid"])
            obj_uuids_arr = uuids_arr[:]
            obj_uuids_arr.append(obj["uuid"])
            bb = get_bpy_world_bb(bpy_mesh, res_wmat, obj["name"], obj_uuids_arr)
            bboxes.append(bb)

        if obj["dupli_group"] is not None:
            group = get_export_datablock(obj["dupli_group"]["uuid"])
            dg_uuids_arr = uuids_arr[:]
            dg_uuids_arr.append(obj["uuid"])
            group_bboxes = process_objs_boundings_rec(group["objects"], res_wmat, dg_uuids_arr)
            bboxes.extend(group_bboxes)

    return bboxes

def get_obj_wmat_wo_dupli_rec(obj):
    wmat = get_b4w_to_bpy_wmat(obj)

    # NOTE: a parent is assumed to be in the same dupli group with its child
    if obj["parent"] is not None:
        obj_par = get_export_datablock(obj["parent"]["uuid"])
        wmat = get_obj_wmat_wo_dupli_rec(obj_par) * wmat
    return wmat

def get_b4w_to_bpy_wmat(obj):
    bpy_loc = [obj["location"][0], obj["location"][1], obj["location"][2]]
    
    # NOTE: consider uniform scale
    bpy_scale = [obj["scale"][0], obj["scale"][0], obj["scale"][0]]
    
    bpy_quat = [obj["rotation_quaternion"][0], obj["rotation_quaternion"][1], 
            obj["rotation_quaternion"][2], obj["rotation_quaternion"][3]]

    mat_loc = mathutils.Matrix.Translation(bpy_loc)
    mat_scale = mathutils.Matrix()
    mat_scale[0][0] = bpy_scale[0]
    mat_scale[1][1] = bpy_scale[1]
    mat_scale[2][2] = bpy_scale[2]
    mat_rot = mathutils.Quaternion(bpy_quat).to_matrix()
    mat_rot.resize_4x4()

    return mat_loc * mat_rot * mat_scale

def get_bpy_world_bb(bpy_mesh, wmat, name, uuids_arr):
    # optimized for intensive use

    coords = [(wmat * v.co) for v in bpy_mesh.vertices]
    coord_x = [co.x for co in coords]
    coord_y = [co.y for co in coords]
    coord_z = [co.z for co in coords]

    min_x = min(coord_x)
    min_y = min(coord_y)
    min_z = min(coord_z)

    max_x = max(coord_x)
    max_y = max(coord_y)
    max_z = max(coord_z)

    bb = BoundingBox(min_x, min_y, min_z, max_x, max_y, max_z, name, uuids_arr)
    return bb

def make_clusters_from_kd(kdtree):

    # filtering actions for lightening the tree
    clusters = extract_one_object_clusters(kdtree)

    while not kdtree.is_empty():
        elem_a = kdtree.get_some_leaf()
        elem_b = kdtree.find_nearest_neighbor(elem_a, True)

        # store multiple ids to avoid possible circular structures
        elem_ids = []
        if elem_a is not None:
            elem_ids.append(elem_a.index)
        if elem_b is not None:
            elem_ids.append(elem_b.index)

        while elem_b is not None:
            # elem_c always exists here
            elem_c = kdtree.find_nearest_neighbor(elem_b, True)

            if elem_c.index in elem_ids:
                merged_node = kdtree.create_merged_node(elem_a, elem_b)
                kdtree.remove_node(elem_a)
                kdtree.remove_node(elem_b)
                kdtree.insert_merged_node(merged_node)

                elem_a = merged_node
                elem_b = kdtree.find_nearest_neighbor(elem_a, True)

                elem_ids = []
                if elem_a is not None:
                    elem_ids.append(elem_a.index)
                if elem_b is not None:
                    elem_ids.append(elem_b.index)
            else:
                elem_a = elem_b
                elem_b = elem_c
                elem_ids.append(elem_c.index)

        clusters.append(Cluster(elem_a))
        kdtree.remove_node(elem_a)

    return clusters

def extract_one_object_clusters(kdtree):
    clusters = []

    def filter_cb(kdtree, node, cb_param):
        if not node.has_children():
            if node.overall_bb.is_above_limit(kdtree.lod_max_diag_size):
                cb_param.append(node)
            else:
                # one bbox per one object before building the clusters
                bb = kdtree.bboxes[node.bb_indices[0]]
                bpy_obj = get_export_datablock(bb.uuids_arr[-1])

                if bpy_obj_is_dynamic_rec(bpy_obj):
                    cb_param.append(node)                

    cb_param = []
    kdtree.iterate_all_nodes(filter_cb, cb_param)
    for node in cb_param:
        clusters.append(Cluster(node))
        kdtree.remove_node(node)

    return clusters

def bpy_obj_is_dynamic_rec(bpy_obj):
    if bpy_obj["type"] == "MESH":
        bpy_obj_data = get_export_datablock(bpy_obj["data"]["uuid"])

        # just dynamic
        if bpy_obj["b4w_do_not_batch"] or bpy_obj["b4w_dynamic_geometry"]:
            return True

        # physics
        if (bpy_obj["b4w_collision"] or bpy_obj["b4w_vehicle"] 
                or bpy_obj["b4w_floating"] or bpy_obj["b4w_character"]):
            return True

        # shape keys
        if len(bpy_obj_data["b4w_shape_keys"]):
            return True

        # lens flares material
        for mat_link in bpy_obj_data["materials"]:
            mat = get_export_datablock(mat_link["uuid"])
            if mat["name"] == "LENS_FLARES":
                return True

        # vertex animation
        if len(bpy_obj_data["b4w_vertex_anim"]):
            return True

        # anim/dynamic particles
        for psys in bpy_obj["particle_systems"]:
            pset = get_export_datablock(psys["settings"]["uuid"])
            if pset["type"] == "EMITTER" or pset["type"] == "HAIR" and pset["b4w_dynamic_grass"]:
                return True

        # skeletal animation
        for mod in bpy_obj["modifiers"]:
            if mod["type"] == "ARMATURE":
                return True
    elif bpy_obj["type"] == "EMPTY":
        if bpy_obj["b4w_do_not_batch"] or bpy_obj["b4w_anchor"] is not None:
            return True
    else:
        return True

    # object animation
    if (bpy_obj["animation_data"] is not None and 
            (bpy_obj["animation_data"]["action"] is not None 
            or len(bpy_obj["animation_data"]["nla_tracks"]))):
        return True

    if bpy_obj["parent"] is not None:
        par = get_export_datablock(bpy_obj["parent"]["uuid"])
        if bpy_obj_is_dynamic_rec(par):
            return True

    # NOTE: node material's animation and mesh animation are not checked 
    # (it's hard and may not be beneficial)

    return False
