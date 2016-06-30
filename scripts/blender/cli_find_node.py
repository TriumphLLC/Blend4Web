import bpy
import sys

paths = {}

for mat in bpy.data.materials:
   if mat.node_tree:
       for node in mat.node_tree.nodes:
           if node.type == "GROUP":
               if node.node_tree.name in sys.argv[1:]:
                   if not node.node_tree.name in paths.keys():
                       paths[node.node_tree.name] = []
                   paths[node.node_tree.name].append((mat.name, node.name))

if len(paths):
    print("B4W_TRAVERSE_TAG: %s\n" % paths, file=sys.stderr)
