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


import bpy
import mathutils
import blend4web

b4w_modules =  ["translator"]
for m in b4w_modules:
    exec(blend4web.load_module_script.format(m))

from blend4web.translator import _, p_

class B4W_Camera_Target_Copier(bpy.types.Operator):
    '''Use cursor location as camera target'''
    bl_idname = "b4w.camera_target_copy"
    bl_label = p_("B4W Camera Target Copy", "Operator")
    bl_options = {"INTERNAL"}
   
    def execute(self, context):
        run()
        return {"FINISHED"}

def run():

    # get 3D cursor location and copy it to camera b4w_target
    cursor_location = mathutils.Vector((0, 0, 0))

    for area in bpy.context.screen.areas:
        if area.type == 'VIEW_3D':
            for space in area.spaces:
                if space.type == 'VIEW_3D':
                    cursor_location = space.cursor_location

    cam = bpy.context.scene.camera
    if cam:
        cam.data.b4w_target = cursor_location
        look_at_location(cam, cursor_location)

def look_at_location(camobj, cursor_location):
    camera_location = camobj.matrix_world.to_translation()
    dir = cursor_location - camera_location
    target_quaternion = dir.to_track_quat('-Z', 'Y')
    old_mode = camobj.rotation_mode
    camobj.rotation_mode = "QUATERNION"
    camobj.rotation_quaternion = target_quaternion
    camobj.rotation_mode = old_mode

