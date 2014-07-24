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

bl_info = {
    "name": "Oscurart Tools",
    "author": "Oscurart, CodemanX",
    "version": (3,2),
    "blender": (2, 70, 0),
    "location": "View3D > Tools > Oscurart Tools",
    "description": "Tools for objects, render, shapes, and files.",
    "warning": "",
    "wiki_url": "http://wiki.blender.org/index.php/Extensions:2.6/Py/Scripts/3D_interaction/Oscurart_Tools",
    "tracker_url": "",
    "category": "Object"}

import bpy
import math
import sys
import os
import stat
import bmesh
import time
import random
from oscurart_tools.oscurart_files import *
from oscurart_tools.oscurart_meshes import *
from oscurart_tools.oscurart_objects import *
from oscurart_tools.oscurart_shapes import *
from oscurart_tools.oscurart_render import *
from oscurart_tools.oscurart_overrides import *

class View3DOscPanel():
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'TOOLS'

## CREA PANELES EN TOOLS
bpy.types.Scene.osc_object_tools = bpy.props.BoolProperty(default=False)
bpy.types.Scene.osc_mesh_tools = bpy.props.BoolProperty(default=False)
bpy.types.Scene.osc_shapes_tools = bpy.props.BoolProperty(default=False)
bpy.types.Scene.osc_render_tools = bpy.props.BoolProperty(default=False)
bpy.types.Scene.osc_files_tools = bpy.props.BoolProperty(default=False)
bpy.types.Scene.osc_overrides_tools = bpy.props.BoolProperty(default=False)
# PANEL DE CONTROL
class OscPanelControl(View3DOscPanel, bpy.types.Panel):
    """
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'TOOLS'
    bl_label = "Oscurart Tools"
    bl_options = {'DEFAULT_CLOSED'}
    """
    bl_category = "Oscurart Tools"
    #bl_context = "objectmode"
    bl_label = "Oscurart Tools"

    def draw(self,context):
        active_obj = context.active_object
        layout = self.layout

        col = layout.column(align=1)
        col.prop(bpy.context.scene, "osc_object_tools", text="Object", icon="OBJECT_DATAMODE")
        col.prop(bpy.context.scene, "osc_mesh_tools", text="Mesh", icon="EDITMODE_HLT")
        col.prop(bpy.context.scene, "osc_shapes_tools", text="Shapes", icon="SHAPEKEY_DATA")
        col.prop(bpy.context.scene, "osc_render_tools", text="Render", icon="SCENE")
        col.prop(bpy.context.scene, "osc_files_tools", text="Files", icon="IMASEL")
        col.prop(bpy.context.scene, "osc_overrides_tools", text="Overrides", icon="GREASEPENCIL")
# POLLS
class OscPollObject():
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'TOOLS'

    @classmethod
    def poll(cls, context):
        return context.scene.osc_object_tools


class OscPollMesh():
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'TOOLS'

    @classmethod
    def poll(cls, context):
        return context.scene.osc_mesh_tools


class OscPollShapes():
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'TOOLS'

    @classmethod
    def poll(cls, context):
        return context.scene.osc_shapes_tools

class OscPollRender():
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'TOOLS'

    @classmethod
    def poll(cls, context):
        return context.scene.osc_render_tools

class OscPollFiles():
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'TOOLS'

    @classmethod
    def poll(cls, context):
        return context.scene.osc_files_tools

class OscPollOverrides():
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'TOOLS'

    @classmethod
    def poll(cls, context):
        return context.scene.osc_overrides_tools


## PANELES
class OscPanelObject(OscPollObject, bpy.types.Panel):
    bl_idname = "Oscurart Object Tools"
    bl_label = "Object Tools"
    bl_category = "Oscurart Tools"

    def draw(self, context):
        active_obj = context.active_object
        layout = self.layout
        col = layout.column(align=1)
        row = col.row()

        colrow = col.row(align=1)
        colrow.operator("object.relink_objects_between_scenes", icon="LINKED")
        colrow = col.row(align=1)
        colrow.operator("object.copy_objects_groups_layers", icon="LINKED")        
        colrow.operator("object.set_layers_to_other_scenes", icon="LINKED")
        colrow = col.row(align=1)
        colrow.prop(bpy.context.scene, "SearchAndSelectOt", text="")
        colrow.operator("object.search_and_select_osc", icon="ZOOM_SELECTED")
        colrow = col.row(align=1)
        colrow.prop(bpy.context.scene, "RenameObjectOt", text="")
        colrow.operator("object.rename_objects_osc", icon="SHORTDISPLAY")
        col.operator("object.distribute_osc", icon="OBJECT_DATAMODE", text="Distribute")
        colrow = col.row(align=1)
        colrow.operator("object.modifiers_remove_osc", icon="MODIFIER", text="Remove Modifiers")
        colrow.operator("object.modifiers_apply_osc", icon="MODIFIER", text="Apply Modifiers")


class OscPanelMesh(OscPollMesh, bpy.types.Panel):
    bl_idname = "Oscurart Mesh Tools"
    bl_label = "Mesh Tools"
    bl_category = "Oscurart Tools"

    def draw(self, context):
        active_obj = context.active_object
        layout = self.layout
        col = layout.column(align=1)
        row = col.row()

        col.operator("mesh.object_to_mesh_osc", icon="MESH_MONKEY")
        col.operator("mesh.select_side_osc", icon="VERTEXSEL")
        colrow=col.row(align=1)
        colrow.operator("mesh.resym_save_map", icon="UV_SYNC_SELECT")
        colrow=col.row(align=1)
        colrow.operator("mesh.resym_mesh", icon="UV_SYNC_SELECT", text="Resym Mesh") 
        colrow.operator("mesh.resym_vertex_weights_osc", icon="UV_SYNC_SELECT")     
        colrow=col.row(align=1)
        colrow.operator("mesh.reconst_osc", icon="UV_SYNC_SELECT")  
        colrow=col.row(align=1)
        colrow.operator("mesh.overlap_uv_faces", icon="UV_FACESEL")               
        colrow=col.row(align=1)
        colrow.operator("view3d.modal_operator", icon="STICKY_UVS_DISABLE")               
        colrow=col.row(align=1)        
        colrow.operator("file.export_groups_osc", icon='GROUP_VCOL')
        colrow.operator("file.import_groups_osc", icon='GROUP_VCOL')
        colrow=col.row(align=1)
        colrow.operator("mesh.export_vertex_colors", icon='COLOR')
        colrow.operator("mesh.import_vertex_colors", icon='COLOR')        

class OscPanelShapes(OscPollShapes, bpy.types.Panel):
    bl_idname = "Oscurart Shapes Tools"
    bl_label = "Shapes Tools"
    bl_category = "Oscurart Tools"

    def draw(self, context):
        active_obj = context.active_object
        layout = self.layout
        col = layout.column(align=1)
        row = col.row()

        col.operator("object.shape_key_to_objects_osc", icon="OBJECT_DATAMODE")
        col.operator("mesh.create_lmr_groups_osc", icon="GROUP_VERTEX")
        col.operator("mesh.split_lr_shapes_osc", icon="SHAPEKEY_DATA")
        colrow=col.row()
        colrow.operator("mesh.create_symmetrical_layout_osc", icon="SETTINGS")
        colrow.operator("mesh.create_asymmetrical_layout_osc", icon="SETTINGS")

class OscPanelRender(OscPollRender, bpy.types.Panel):
    bl_idname = "Oscurart Render Tools"
    bl_label = "Render Tools"
    bl_category = "Oscurart Tools"

    def draw(self, context):
        active_obj = context.active_object
        layout = self.layout
        col = layout.column(align=1)
        row = col.row()

        col.operator("file.create_batch_maker_osc", icon="LINENUMBERS_ON", text="Make Render Batch")
        colrow = col.row()
        col.operator("file.create_batch_python", icon="LINENUMBERS_ON", text="Make Python Batch")
        colrow = col.row()
        colrow.operator("render.render_all_scenes_osc", icon="RENDER_STILL", text="All Scenes").frametype=False
        colrow.operator("render.render_all_scenes_osc", icon="RENDER_STILL", text="> Frame").frametype=True
        colrow = col.row()
        colrow.operator("render.render_current_scene_osc", icon="RENDER_STILL", text="Active Scene").frametype=False
        colrow.operator("render.render_current_scene_osc", icon="RENDER_STILL", text="> Frame").frametype=True


        colrow = col.row(align=1)
        colrow.operator("render.render_crop_osc", icon="RENDER_REGION")
        colrow.prop(bpy.context.scene, "rcPARTS", text="Render Crop Parts")        
        
        boxcol = layout.box().column(align=1)
        colrow = boxcol.row(align=1)
        #colrow.prop(bpy.context.scene, "use_render_scene", text="")  
        colrow.operator("render.render_selected_scenes_osc", icon="RENDER_STILL", text="Selected Scenes").frametype=False
        colrow.operator("render.render_selected_scenes_osc", icon="RENDER_STILL", text="> Fame").frametype=True

        for sc in bpy.data.scenes[:]:
            #col = layout.column(align=1)
            boxcol.prop(sc, "use_render_scene", text=sc.name)    

class OscPanelFiles(OscPollFiles, bpy.types.Panel):
    bl_idname = "Oscurart Files Tools"
    bl_label = "Files Tools"
    bl_category = "Oscurart Tools"

    def draw(self, context):
        active_obj = context.active_object
        layout = self.layout
        col = layout.column(align=1)
        colrow = col.row()
        colrow.operator("file.save_incremental_osc", icon="NEW")
        colrow.operator("image.reload_images_osc", icon="IMAGE_COL")
        col = layout.column(align=1)
        colrow = col.row(align=1)
        colrow.prop(bpy.context.scene, "oscSearchText", text="")
        colrow.prop(bpy.context.scene, "oscReplaceText", text="")
        col.operator("file.replace_file_path_osc", icon="SHORTDISPLAY")

class OscPanelOverrides(OscPollOverrides, bpy.types.Panel):
    bl_idname = "Oscurart Overrides"
    bl_label = "Overrides Tools"
    bl_category = "Oscurart Tools"

    def draw(self, context):
        layout = self.layout
        obj = context.object
        col = layout.box().column(align=1)
        colrow = col.row()
        #col.operator("render.overrides_set_list", text="Create Override List", icon="GREASEPENCIL")
        col.label(text="Active Scene: " + bpy.context.scene.name)
        col.label(text="Example: [[Group,Material]]")
        col.prop(bpy.context.scene, "overrides", text="")
        col.operator("render.check_overrides", text="Check List", icon="ZOOM_ALL")
        col.operator("render.overrides_on", text="On / Off", icon="QUIT")   
        col.label(text=str("OVERRIDES: ON" if bpy.use_overrides else "OVERRIDES: OFF"))             

        boxcol=layout.box().column(align=1)
        boxcol.label(text="Danger Zone")
        boxcolrow=boxcol.row()
        boxcolrow.operator("render.apply_overrides", text="Apply Overrides", icon="ERROR")
        boxcolrow.operator("render.restore_overrides", text="Restore Overrides", icon="ERROR")


##======================================================================================FIN DE SCRIPTS


def register():
    bpy.utils.register_module(__name__)

def unregister():
    bpy.utils.unregister_module(__name__)


if __name__ == "__main__":
    register()