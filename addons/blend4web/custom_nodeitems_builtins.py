# Copyright (C) 2014-2016 Triumph LLC
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


################ KEEP THIS STUFF UP TO DATE !!! #############
class ShaderNewNodeCategory(NodeCategory):
    @classmethod
    def poll(cls, context):
        return (context.space_data.tree_type == 'ShaderNodeTree' and
                context.scene.render.use_shading_nodes)

class ShaderOldNodeCategory(NodeCategory):
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

shader_node_categories = [

    # Shader Nodes
    ShaderOldNodeCategory("SH_INPUT", "Input", items=[
        NodeItem("ShaderNodeMaterial"),
        NodeItem("ShaderNodeCameraData"),
        NodeItem("ShaderNodeLampData"),
        NodeItem("ShaderNodeValue"),
        NodeItem("ShaderNodeRGB"),
        NodeItem("ShaderNodeTexture"),
        NodeItem("ShaderNodeGeometry"),
        NodeItem("ShaderNodeExtendedMaterial"),
        NodeItem("ShaderNodeParticleInfo"),
        NodeItem("NodeGroupInput", poll=group_input_output_item_poll),
        ]),
    ShaderOldNodeCategory("SH_OUTPUT", "Output", items=[
        NodeItem("ShaderNodeOutput"),
        NodeItem("NodeGroupOutput", poll=group_input_output_item_poll),
        ]),
    ShaderOldNodeCategory("SH_OP_COLOR", "Color", items=[
        NodeItem("ShaderNodeMixRGB"),
        NodeItem("ShaderNodeRGBCurve"),
        NodeItem("ShaderNodeInvert"),
        NodeItem("ShaderNodeHueSaturation"),
        NodeItem("ShaderNodeGamma"),
        ]),
    ShaderOldNodeCategory("SH_OP_VECTOR", "Vector", items=[
        NodeItem("ShaderNodeNormal"),
        NodeItem("ShaderNodeMapping"),
        NodeItem("ShaderNodeVectorCurve"),
        NodeItem("ShaderNodeVectorTransform"),
        NodeItem("ShaderNodeNormalMap"),
        ]),
    ShaderOldNodeCategory("SH_CONVERTOR", "Converter", items=[
        NodeItem("ShaderNodeValToRGB"),
        NodeItem("ShaderNodeRGBToBW"),
        NodeItem("ShaderNodeMath"),
        NodeItem("ShaderNodeVectorMath"),
        NodeItem("ShaderNodeSqueeze"),
        NodeItem("ShaderNodeSeparateRGB"),
        NodeItem("ShaderNodeCombineRGB"),
        NodeItem("ShaderNodeSeparateHSV"),
        NodeItem("ShaderNodeCombineHSV"),
        ]),
    ShaderOldNodeCategory("SH_GROUP", "Group", items=node_group_items),
    ShaderOldNodeCategory("SH_LAYOUT", "Layout", items=[
        NodeItem("NodeFrame"),
        NodeItem("NodeReroute"),
        ]),

    # New Shader Nodes (Cycles)
    ShaderNewNodeCategory("SH_NEW_INPUT", "Input", items=[
        NodeItem("ShaderNodeTexCoord"),
        NodeItem("ShaderNodeAttribute"),
        NodeItem("ShaderNodeLightPath"),
        NodeItem("ShaderNodeFresnel"),
        NodeItem("ShaderNodeLayerWeight"),
        NodeItem("ShaderNodeRGB"),
        NodeItem("ShaderNodeValue"),
        NodeItem("ShaderNodeTangent"),
        NodeItem("ShaderNodeNewGeometry"),
        NodeItem("ShaderNodeWireframe"),
        NodeItem("ShaderNodeObjectInfo"),
        NodeItem("ShaderNodeHairInfo"),
        NodeItem("ShaderNodeParticleInfo"),
        NodeItem("ShaderNodeCameraData"),
        NodeItem("ShaderNodeUVMap"),
        NodeItem("ShaderNodeUVAlongStroke", poll=line_style_shader_nodes_poll),
        NodeItem("NodeGroupInput", poll=group_input_output_item_poll),
        ]),
    ShaderNewNodeCategory("SH_NEW_OUTPUT", "Output", items=[
        NodeItem("ShaderNodeOutputMaterial", poll=object_shader_nodes_poll),
        NodeItem("ShaderNodeOutputLamp", poll=object_shader_nodes_poll),
        NodeItem("ShaderNodeOutputWorld", poll=world_shader_nodes_poll),
        NodeItem("ShaderNodeOutputLineStyle", poll=line_style_shader_nodes_poll),
        NodeItem("NodeGroupOutput", poll=group_input_output_item_poll),
        ]),
    ShaderNewNodeCategory("SH_NEW_SHADER", "Shader", items=[
        NodeItem("ShaderNodeMixShader"),
        NodeItem("ShaderNodeAddShader"),
        NodeItem("ShaderNodeBsdfDiffuse", poll=object_shader_nodes_poll),
        NodeItem("ShaderNodeBsdfGlossy", poll=object_shader_nodes_poll),
        NodeItem("ShaderNodeBsdfTransparent", poll=object_shader_nodes_poll),
        NodeItem("ShaderNodeBsdfRefraction", poll=object_shader_nodes_poll),
        NodeItem("ShaderNodeBsdfGlass", poll=object_shader_nodes_poll),
        NodeItem("ShaderNodeBsdfTranslucent", poll=object_shader_nodes_poll),
        NodeItem("ShaderNodeBsdfAnisotropic", poll=object_shader_nodes_poll),
        NodeItem("ShaderNodeBsdfVelvet", poll=object_shader_nodes_poll),
        NodeItem("ShaderNodeBsdfToon", poll=object_shader_nodes_poll),
        NodeItem("ShaderNodeSubsurfaceScattering", poll=object_shader_nodes_poll),
        NodeItem("ShaderNodeEmission", poll=object_shader_nodes_poll),
        NodeItem("ShaderNodeBsdfHair", poll=object_shader_nodes_poll),
        NodeItem("ShaderNodeBackground", poll=world_shader_nodes_poll),
        NodeItem("ShaderNodeAmbientOcclusion", poll=object_shader_nodes_poll),
        NodeItem("ShaderNodeHoldout", poll=object_shader_nodes_poll),
        NodeItem("ShaderNodeVolumeAbsorption"),
        NodeItem("ShaderNodeVolumeScatter"),
        ]),
    ShaderNewNodeCategory("SH_NEW_TEXTURE", "Texture", items=[
        NodeItem("ShaderNodeTexImage"),
        NodeItem("ShaderNodeTexEnvironment"),
        NodeItem("ShaderNodeTexSky"),
        NodeItem("ShaderNodeTexNoise"),
        NodeItem("ShaderNodeTexWave"),
        NodeItem("ShaderNodeTexVoronoi"),
        NodeItem("ShaderNodeTexMusgrave"),
        NodeItem("ShaderNodeTexGradient"),
        NodeItem("ShaderNodeTexMagic"),
        NodeItem("ShaderNodeTexChecker"),
        NodeItem("ShaderNodeTexBrick"),
        NodeItem("ShaderNodeTexPointDensity"),
        ]),
    ShaderNewNodeCategory("SH_NEW_OP_COLOR", "Color", items=[
        NodeItem("ShaderNodeMixRGB"),
        NodeItem("ShaderNodeRGBCurve"),
        NodeItem("ShaderNodeInvert"),
        NodeItem("ShaderNodeLightFalloff"),
        NodeItem("ShaderNodeHueSaturation"),
        NodeItem("ShaderNodeGamma"),
        NodeItem("ShaderNodeBrightContrast"),
        ]),
    ShaderNewNodeCategory("SH_NEW_OP_VECTOR", "Vector", items=[
        NodeItem("ShaderNodeMapping"),
        NodeItem("ShaderNodeBump"),
        NodeItem("ShaderNodeNormalMap"),
        NodeItem("ShaderNodeNormal"),
        NodeItem("ShaderNodeVectorCurve"),
        NodeItem("ShaderNodeVectorTransform"),
        ]),
    ShaderNewNodeCategory("SH_NEW_CONVERTOR", "Converter", items=[
        NodeItem("ShaderNodeMath"),
        NodeItem("ShaderNodeValToRGB"),
        NodeItem("ShaderNodeRGBToBW"),
        NodeItem("ShaderNodeVectorMath"),
        NodeItem("ShaderNodeSeparateRGB"),
        NodeItem("ShaderNodeCombineRGB"),
        NodeItem("ShaderNodeSeparateXYZ"),
        NodeItem("ShaderNodeCombineXYZ"),
        NodeItem("ShaderNodeSeparateHSV"),
        NodeItem("ShaderNodeCombineHSV"),
        NodeItem("ShaderNodeWavelength"),
        NodeItem("ShaderNodeBlackbody"),
        ]),
    ShaderNewNodeCategory("SH_NEW_SCRIPT", "Script", items=[
        NodeItem("ShaderNodeScript"),
        ]),
    ShaderNewNodeCategory("SH_NEW_GROUP", "Group", items=node_group_items),
    ShaderNewNodeCategory("SH_NEW_LAYOUT", "Layout", items=[
        NodeItem("NodeFrame"),
        NodeItem("NodeReroute"),
        ]),
############# END ### KEEP THIS STUFF UP TO DATE !!! #############
    ShaderOldNodeCategory("B4W_SHADER_GROUPS", "Blend4Web", items=gen_b4w_gr_node)
    ]

def register():
    nodeitems_utils.unregister_node_categories('SHADER')
    nodeitems_utils.register_node_categories('SHADER', shader_node_categories)

def unregister():
    nodeitems_utils.unregister_node_categories('SHADER')

    import nodeitems_builtins
    nodeitems_utils.register_node_categories('SHADER', nodeitems_builtins.shader_node_categories)
