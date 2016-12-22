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


import bpy
import imp
import mathutils
import math
import os
import cProfile
import bgl
import blend4web

from bpy.types import Panel

b4w_modules = ["translator"]
for m in b4w_modules:
    exec(blend4web.load_module_script.format(m))
from blend4web.translator import _, p_

# common properties for all B4W scene panels
class SceneButtonsPanel:
    bl_space_type = 'PROPERTIES'
    bl_region_type = 'WINDOW'
    bl_context = "scene"
    COMPAT_ENGINES = ["BLEND4WEB"]

    @classmethod
    def poll(cls, context):
        scene = context.scene
        return scene and (scene.render.engine in cls.COMPAT_ENGINES)

class B4W_SCENE_PT_scene(SceneButtonsPanel, Panel):
    bl_label = _("Scene")

    def draw(self, context):
        layout = self.layout

        scene = context.scene

        row = layout.row()
        row.prop(scene, "camera")
        row = layout.row()
        row.prop(scene, "background_set", text=_("Background"))

class B4W_SCENE_PT_unit(SceneButtonsPanel, Panel):
    bl_label = _("Units")

    def draw(self, context):
        layout = self.layout

        unit = context.scene.unit_settings

        col = layout.column()
        col.row().prop(unit, "system", expand=True)
        col.row().prop(unit, "system_rotation", expand=True)

        if unit.system != 'NONE':
            row = layout.row()
            row.prop(unit, "scale_length", text=_("Scale"))
            row.prop(unit, "use_separate")

class B4W_SCENE_PT_simplify(SceneButtonsPanel, Panel):
    bl_label = _("Simplify")
    COMPAT_ENGINES = {'BLENDER_RENDER'}

    def draw_header(self, context):
        rd = context.scene.render
        self.layout.prop(rd, "use_simplify", text="")

    def draw(self, context):
        layout = self.layout

        rd = context.scene.render
        layout.active = rd.use_simplify

        split = layout.split()

        col = split.column()
        col.label(text=_("Viewport:"))
        col.prop(rd, "simplify_subdivision", text=_("Subdivision"))
        col.prop(rd, "simplify_child_particles", text=_("Child Particles"))

        col = split.column()
        col.label(text=_("Render:"))
        col.prop(rd, "simplify_subdivision_render", text=_("Subdivision"))
        col.prop(rd, "simplify_child_particles_render", text=_("Child Particles"))
        col.prop(rd, "simplify_shadow_samples", text=_("Shadow Samples"))
        col.prop(rd, "simplify_ao_sss", text=_("AO and SSS"))
        col.prop(rd, "use_simplify_triangulate")

class B4W_SceneAudio(SceneButtonsPanel, Panel):
    bl_label = _("Audio")
    bl_idname = "SCENE_PT_b4w_audio"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        scene = context.scene        
        dcompr = scene.b4w_dynamic_compressor_settings

        layout = self.layout

        layout.prop(scene, "audio_volume")

        row = layout.row()
        row.prop(scene, "audio_distance_model", text="Distance Model")

        row = layout.row()
        row.prop(scene, "audio_doppler_speed", text="Speed")
        row.prop(scene, "audio_doppler_factor", text="Doppler")

        row = layout.row()
        row.prop(scene, "b4w_enable_dynamic_compressor", text=_("Dynamic Compressor"))

        row = layout.row()
        box = row.box()
        box.active = getattr(scene, "b4w_enable_dynamic_compressor")
        col = box.column()
        col.label(text=_("Compressor settings:"))
        col.prop(dcompr, "threshold", text=_("Threshold"))
        col.prop(dcompr, "knee", text=_("Knee"))
        col.prop(dcompr, "ratio", text=_("Ratio"))
        col.prop(dcompr, "attack", text=_("Attack"))
        col.prop(dcompr, "release", text=_("Release"))

def b4w_logic_editor_refresh_available_trees():
    trees = bpy.context.scene.b4w_available_logic_trees
    trees.clear()
    for t in bpy.data.node_groups:
        if t.bl_idname == 'B4WLogicNodeTreeType':
            trees.add()
            trees[-1].name = t.name

class B4W_LogicEditorRefreshAvailableTrees(bpy.types.Operator):
    bl_idname      = 'scene.b4w_logic_editor_refresh_available_trees'
    bl_label       = p_("Refresh", "Operator")
    bl_description = _("Refresh list of available Trees")

    def invoke(self, context, event):
        b4w_logic_editor_refresh_available_trees()

        return {'FINISHED'}

class B4W_LogicEditorAddNodeTree(bpy.types.Operator):
    bl_idname      = 'scene.b4w_logic_editor_add_tree'
    bl_label       = p_("Add", "Operator")
    bl_description = _("Add new logic node tree")

    def invoke(self, context, event):
        ntree = bpy.data.node_groups.new("B4WLogicNodeTree", "B4WLogicNodeTreeType")
        ntree.use_fake_user = True
        node = ntree.nodes.new("B4W_logic_node")
        node.type = "ENTRYPOINT"
        node.location = (-500, 0)
        context.scene.b4w_active_logic_node_tree = ntree.name
        b4w_logic_editor_refresh_available_trees()

        return {'FINISHED'}

class B4W_LogicEditorRemoveNodeTree(bpy.types.Operator):
    bl_idname      = 'scene.b4w_logic_editor_remove_tree'
    bl_label       = p_("Remove", "Operator")
    bl_description = _("Remove logic node tree")

    def invoke(self, context, event):
        if context.scene.b4w_active_logic_node_tree in bpy.data.node_groups:
            for area in bpy.context.screen.areas:
                if area.type == "NODE_EDITOR":
                    for s in area.spaces:
                        if s.type == "NODE_EDITOR":
                            if s.tree_type == "B4WLogicNodeTreeType":
                                if s.node_tree:
                                    if s.node_tree.name == context.scene.b4w_active_logic_node_tree:
                                        s.node_tree = None
            bpy.data.node_groups[context.scene.b4w_active_logic_node_tree].use_fake_user = False
            if bpy.data.node_groups[context.scene.b4w_active_logic_node_tree].users == 0:
                bpy.data.node_groups.remove(bpy.data.node_groups[context.scene.b4w_active_logic_node_tree])
        context.scene.b4w_active_logic_node_tree = ""
        b4w_logic_editor_refresh_available_trees()

        return {'FINISHED'}

class B4W_SceneLogicEditor(SceneButtonsPanel, Panel):
    bl_label = _("Logic Editor")
    bl_idname = "SCENE_PT_b4w_logic_editor"
    bl_options = {'DEFAULT_CLOSED'}

    def draw_header(self, context):
        self.layout.prop(context.scene, "b4w_use_logic_editor", text="")

    def draw(self, context):
        scene = context.scene

        layout = self.layout
        layout.active = getattr(scene, "b4w_use_logic_editor")
        row = layout.row()
        row.label(text=_("Active Node Tree:"))
        row = layout.row(align=True)
        row.operator('scene.b4w_logic_editor_refresh_available_trees', icon='FILE_REFRESH', text='')
        row.operator('scene.b4w_logic_editor_add_tree', icon='ZOOMIN', text='')
        row.operator('scene.b4w_logic_editor_remove_tree', icon='ZOOMOUT', text='')
        icon='NODETREE'
        if scene.b4w_use_logic_editor and not scene.b4w_active_logic_node_tree in scene.b4w_available_logic_trees:
            icon = 'ERROR'
        row.prop_search(scene, 'b4w_active_logic_node_tree', bpy.context.scene, 'b4w_available_logic_trees', icon=icon, text='')

class B4W_SceneNLA(SceneButtonsPanel, Panel):
    bl_label = _("NLA")
    bl_idname = "SCENE_PT_b4w_nla"
    bl_options = {'DEFAULT_CLOSED'}

    def draw_header(self, context):
        self.layout.prop(context.scene, "b4w_use_nla", text="")

    def draw(self, context):
        scene = context.scene

        layout = self.layout
        row = layout.row()
        row.active = getattr(scene, "b4w_use_nla")
        row.prop(scene, "b4w_nla_cyclic", text=_("Cyclic NLA"))

class B4W_SceneMetaTags(SceneButtonsPanel, Panel):
    bl_label = _("Meta Tags")
    bl_idname = "SCENE_PT_b4w_meta_tags"
    bl_options = {'DEFAULT_CLOSED'}

    def draw_header(self, context):
        self.layout.prop(context.scene, "b4w_enable_tags", text="")

    def draw(self, context):
        scene = context.scene
        b4w_tags = scene.b4w_tags

        layout = self.layout
        layout.active = getattr(scene, "b4w_enable_tags");

        row = layout.row()
        row.prop(b4w_tags, "title", text=_("Title"))

        row = layout.row()
        if b4w_tags.desc_source == "TEXT":
            icon = "NONE"
        else:
            icon = "ERROR"
            for text in bpy.data.texts:
                if text.name == b4w_tags.description:
                    icon = "TEXT"
                    break
        row.prop(b4w_tags, "description", icon=icon)

        row = layout.row()
        row.label(text=_("Description Source:"))
        row.prop(b4w_tags, "desc_source", expand=True, text=_("Source"))

class B4W_ScenePhysics(SceneButtonsPanel, Panel):
    bl_label = _("Physics")
    bl_idname = "SCENE_PT_b4w_physics"

    def draw(self, context):
        scene = context.scene
        layout = self.layout
        layout.prop(scene, "b4w_enable_physics", text=_("Enable Physics"))

class B4W_SceneClusterBatching(SceneButtonsPanel, Panel):
    bl_label = _("Objects Clustering")
    bl_idname = "SCENE_PT_b4w_cluster_batching"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        scene = context.scene
        layout = self.layout
        layout.prop(scene, "b4w_cluster_size", text=_("Cluster Size"))
        layout.prop(scene, "b4w_lod_cluster_size_mult", text=_("LOD Cluster Size Multiplier"))

class B4W_SceneObjsSelection(SceneButtonsPanel, Panel):
    bl_label = _("Objects Selection")
    bl_idname = "SCENE_PT_b4w_objs_selection"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        scene = context.scene

        layout = self.layout

        row = layout.row()
        row.prop(scene, "b4w_enable_object_selection", text=_("Enable"))

class B4W_SceneAnchors(SceneButtonsPanel, Panel):
    bl_label = _("Anchors")
    bl_idname = "SCENE_PT_b4w_anchors"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        scene = context.scene

        layout = self.layout

        row = layout.row()
        row.prop(scene, "b4w_enable_anchors_visibility", text=_("Detect Anchor Visibility"))

class B4W_SceneExportOptions(SceneButtonsPanel, Panel):
    bl_label = _("Export Options")
    bl_idname = "SCENE_PT_b4w_scenes_export_options"
    bl_options = {'DEFAULT_CLOSED'}

    def draw(self, context):
        scene = context.scene
        layout = self.layout

        row = layout.row()
        row.prop(scene, "b4w_do_not_export", text=_("Do Not Export"))

