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
import imp

import blend4web

b4w_modules =  ["translator"]
for m in b4w_modules:
    exec(blend4web.load_module_script.format(m))

from blend4web.translator import _, p_

bpy.types.ShaderNodeBsdfTransparent.b4w_use_alpha  = bpy.props.BoolProperty(
    name = "Use alpha",
    description = "Use alpha",
    default = False
)

class NodePanel():
    bl_space_type = 'NODE_EDITOR'
    bl_region_type = 'UI'

    @classmethod
    def poll(cls, context):
        return (context.object is not None and (context.scene.render.engine == "BLEND4WEB"
                or context.scene.render.engine == "CYCLES"))

class BSDFTransparentPanel(NodePanel, bpy.types.Panel):
    bl_idname = "NODE_PT_B4W"
    bl_label = "B4W Properties"

    def draw(self, context):
            node = context.active_node
            if node and node.bl_idname == "ShaderNodeBsdfTransparent":
                self.layout.prop(node, "b4w_use_alpha", text="Use Alpha")

def register():
    bpy.utils.register_class(BSDFTransparentPanel)

def unregister():
    bpy.utils.unregister_class(BSDFTransparentPanel)


