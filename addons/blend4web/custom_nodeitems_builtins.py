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


# ##### BEGIN GPL LICENSE BLOCK #####
#
#  This program is free software; you can redistribute it and/or
#  modify it under the terms of the GNU General Public License
#  as published by the Free Software Foundation; either version 2
#  of the License, or (at your option) any later version.
#
#  This program is distributed in the hope that it will be useful,
#  but WITHOUT ANY WARRANTY; without even the implied warranty of
#  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#  GNU General Public License for more details.
#
#  You should have received a copy of the GNU General Public License
#  along with this program; if not, write to the Free Software Foundation,
#  Inc., 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301, USA.
#
# ##### END GPL LICENSE BLOCK #####

# <pep8 compliant>
import bpy
import nodeitems_utils
from nodeitems_utils import NodeCategory, NodeItem, NodeItemCustom
import blend4web

b4w_modules =  ["translator"]
for m in b4w_modules:
    exec(blend4web.load_module_script.format(m))

from blend4web.translator import _, p_

b4w_node_names = {"B4W_CLAMP": _("Clamp"), "B4W_LINEAR_TO_SRGB": _("Linear to SRGB"),
                  "B4W_SRGB_TO_LINEAR": _("SRGB to Linear"), "B4W_VECTOR_VIEW": _("Vector View"), "B4W_NORMAL_VIEW": _("Normal View"),
                  "B4W_REFLECT": _("Reflect"), "B4W_REFRACTION": _("Refraction"), "B4W_PARALLAX": _("Parallax"),
                  "B4W_TRANSLUCENCY": _("Translucency"), "B4W_TIME": _("Time"), "B4W_SMOOTHSTEP": _("Smoothstep"),
                  "B4W_GLOW_OUTPUT": _("Glow Output"), "B4W_REPLACE": _("Replace"), "B4W_LEVELS_OF_QUALITY": _("Levels of Quality")}

def convert_to_camel(str):
    new_word = True
    word_sep = ['_', ' ']
    inside_word = False
    result = ''

    for c in str[4:]:
        if c in ['_', ' ']:
            new_word = True
            inside_word = False
            result += ' '
            continue
        if c not in word_sep and not inside_word:
            result += c.upper()
            new_word = False
            inside_word = True
            continue
        result += c.lower()
    return result

def gen_b4w_gr_node(context):
    for group in context.blend_data.node_groups:
        if str(group.name).startswith("B4W_") and not group.library:
            if group.name in b4w_node_names:
                item_name = b4w_node_names[group.name]
            else:
                item_name = convert_to_camel(group.name)
            yield NodeItem("ShaderNodeGroup", item_name, {"node_tree": "bpy.data.node_groups[%r]" % group.name})

class ShaderNodeCategoryNew(NodeCategory):
    @classmethod
    def poll(cls, context):
        return (context.space_data.tree_type == 'ShaderNodeTree' and
                context.scene.render.use_shading_nodes)

class ShaderNodeCategory(NodeCategory):
    @classmethod
    def poll(cls, context):
        return (context.space_data.tree_type == 'ShaderNodeTree' and
                not context.scene.render.use_shading_nodes)

# menu entry for node group tools
def group_tools_draw(self, layout, context):
    layout.operator("node.group_make")
    layout.operator("node.group_ungroup")
    layout.separator()

# maps node tree type to group node type
node_tree_group_type = {
    'CompositorNodeTree': 'CompositorNodeGroup',
    'ShaderNodeTree': 'ShaderNodeGroup',
    'TextureNodeTree': 'TextureNodeGroup',
    }

# generic node group items generator for shader, compositor and texture node groups
def node_group_items(context):
    if context is None:
        return
    space = context.space_data
    if not space:
        return
    ntree = space.edit_tree
    if not ntree:
        return

    yield NodeItemCustom(draw=group_tools_draw)

    def contains_group(nodetree, group):
        if nodetree == group:
            return True
        else:
            for node in nodetree.nodes:
                if node.bl_idname in node_tree_group_type.values() and node.node_tree is not None:
                    if contains_group(node.node_tree, group):
                        return True
        return False

    for group in context.blend_data.node_groups:
        if group.bl_idname != ntree.bl_idname:
            continue
        # filter out recursive groups
        if contains_group(group, ntree):
            continue
        # Hack
        if str(group.name).startswith("B4W_"):
            continue

        yield NodeItem(node_tree_group_type[group.bl_idname],
                       group.name,
                       {"node_tree": "bpy.data.node_groups[%r]" % group.name})


# only show input/output nodes inside node groups
def group_input_output_item_poll(context):
    space = context.space_data
    if space.edit_tree in bpy.data.node_groups.values():
        return True
    return False


# only show input/output nodes when editing line style node trees
def line_style_shader_nodes_poll(context):
    snode = context.space_data
    return (snode.tree_type == 'ShaderNodeTree' and
            snode.shader_type == 'LINESTYLE')


# only show nodes working in world node trees
def world_shader_nodes_poll(context):
    snode = context.space_data
    return (snode.tree_type == 'ShaderNodeTree' and
                snode.shader_type == 'WORLD')


# only show nodes working in object node trees
def object_shader_nodes_poll(context):
    snode = context.space_data
    return (snode.tree_type == 'ShaderNodeTree' and
            snode.shader_type == 'OBJECT')

# All standard node categories currently used in nodes.

def draw_node_item(self, context):
    layout = self.layout
    col = layout.column()
    for item in self.category.items(context):
        item.draw(item, col, context)

def add_menu_cat(tpl, cat):
    tpl[0].append(cat[0])
    tpl[2].append(cat[1])
    tpl[3].append(cat[2])
    bpy.utils.register_class(cat[1])
    bpy.utils.register_class(cat[2])

def register_menu_cat(tpl, node_cat, insert_before_id):
    if insert_before_id:
        ind = find_cat_ind(tpl[0], insert_before_id)
        tpl[0].insert(ind, node_cat)
    else:
        tpl[0].append(node_cat)
    menu_type = type("NODE_MT_category_" + node_cat.identifier, (bpy.types.Menu,), {
            "bl_space_type": 'NODE_EDITOR',
            "bl_label": node_cat.name,
            "category": node_cat,
            "poll": node_cat.poll,
            "draw": draw_node_item,
            })
    panel_type = type("NODE_PT_category_" + node_cat.identifier, (bpy.types.Panel,), {
        "bl_space_type": 'NODE_EDITOR',
        "bl_region_type": 'TOOLS',
        "bl_label": node_cat.name,
        "bl_category": node_cat.name,
        "category": node_cat,
        "poll": node_cat.poll,
        "draw": draw_node_item,
        })

    tpl[2].append(menu_type)
    tpl[3].append(panel_type)
    bpy.utils.register_class(menu_type)
    bpy.utils.register_class(panel_type)
    return (menu_type, panel_type)

def unregister_menu_cat(tpl, cat):
    bpy.utils.unregister_class(cat[1])
    bpy.utils.unregister_class(cat[2])
    tpl[0].remove(cat[0])
    tpl[2].remove(cat[1])
    tpl[3].remove(cat[2])

def find_cat(cat_list, id):
    for c in cat_list:
        if c.identifier == id:
            return c
    return None

def find_cat_ind(cat_list, id):
    for c in range(0, len(cat_list)):
        if cat_list[c].identifier == id:
            return c
    return -1

def remove_orig_cat(id):
    tpl = nodeitems_utils._node_categories["SHADER"]
    orig_grp_cat = find_cat(tpl[0], id)
    menu = getattr(bpy.types, "NODE_MT_category_" + id)
    panel = getattr(bpy.types, "NODE_PT_category_" + id)
    cat = (orig_grp_cat, menu, panel)
    unregister_menu_cat(tpl, cat)
    return cat

def remove_orig_groups(tpl):
    global orig_grp_cat_list
    orig_grp_cat_list = []

    cat = remove_orig_cat("SH_GROUP")
    orig_grp_cat_list.append(cat)
    cat = remove_orig_cat("SH_NEW_GROUP")
    orig_grp_cat_list.append(cat)

def return_orig_group(tpl):
    global orig_grp_cat_list
    for c in orig_grp_cat_list:
        add_menu_cat(tpl, c)

def create_category(cat_type, id, cat_label, insert_before_id, items):
    tpl = nodeitems_utils._node_categories["SHADER"]
    node_cat = cat_type(id, cat_label, items=items)
    menu_type, panel_type = register_menu_cat(tpl, node_cat, insert_before_id)
    cat = (node_cat, menu_type, panel_type)
    return cat

def register():
    tpl = nodeitems_utils._node_categories["SHADER"]

    # remove original groups
    remove_orig_groups(tpl)

    # add own categories
    global cat_list
    cat_list = []
    cat = create_category(ShaderNodeCategory, "B4W_SHADER_GROUPS", "Blend4Web", None, gen_b4w_gr_node)
    cat_list.append(cat)
    cat = create_category(ShaderNodeCategory, "SH_GROUP", "Group", "SH_LAYOUT", node_group_items)
    cat_list.append(cat)
    cat = create_category(ShaderNodeCategoryNew, "B4W_SHADER_NEW_GROUPS", "Blend4Web", None, gen_b4w_gr_node)
    cat_list.append(cat)
    cat = create_category(ShaderNodeCategoryNew, "SH_NEW_GROUP", "Group", "SH_NEW_LAYOUT", node_group_items)
    cat_list.append(cat)

def unregister():
    tpl = nodeitems_utils._node_categories["SHADER"]

    # remove own categories
    global cat_list
    for cat in cat_list:
        unregister_menu_cat(tpl, cat)

    # return original groups
    return_orig_group(tpl)

