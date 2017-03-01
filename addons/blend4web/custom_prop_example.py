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
import math
import os

class B4W_CustomPropObject(bpy.types.PropertyGroup):
    aaa = bpy.props.FloatProperty(
        name = "aaa",
        description = "aaa",
        default = 1.0,
        min = 0.01,
        soft_max = 10.0,
        max = 1000.0,
        step = 1,
        precision = 2,
        options = set()
    )
    bbb = bpy.props.IntProperty(
        name = "bbb",
        description = "bbb",
        default = 0,
        min = 0,
        soft_max = 10,
        max = 1000,
        options = set()
    )
    ccc = bpy.props.BoolProperty(
        name = "ccc",
        description = "ccc",
        default = False,
        options = set()
    )
    ddd = bpy.props.StringProperty(
        name = "ddd",
        description = "ddd",
        default = "",
        options = set()
    )
    eee = bpy.props.FloatVectorProperty(
        name = "eee",
        description = "eee",
        default = (0.0, 0.8, 0.3),
        min = 0,
        soft_min = 0,
        max = 1,
        soft_max = 1,
        subtype = 'COLOR',
        options = set()
    )
    fff = bpy.props.EnumProperty(
        name = "fff",
        description = "fff",
        default = "16x",
        items = [
            ("4x",  "4x",  "4x", 0),
            ("8x", "8x", "8x", 1),
            ("16x", "16x", "16x", 2)
        ],
        options = set()
    )

class B4W_CustomPropScene(bpy.types.PropertyGroup):
    aaa = bpy.props.FloatProperty(
        name = "aaa",
        description = "aaa",
        default = 1.0,
        min = 0.01,
        soft_max = 10.0,
        max = 1000.0,
        step = 1,
        precision = 2,
        options = set()
    )
    bbb = bpy.props.IntProperty(
        name = "bbb",
        description = "bbb",
        default = 0,
        min = 0,
        soft_max = 10,
        max = 1000,
        options = set()
    )
    ccc = bpy.props.FloatVectorProperty(
        name = "Scene Custom Property Vector",
        default = (1.1, 2.2, 3.3),
        min = 0,
        soft_min = 0,
        max = 1,
        soft_max = 1,
        options = set()
    )

def register():
    bpy.utils.register_class(B4W_CustomPropObject)
    bpy.utils.register_class(B4W_CustomPropScene)

    bpy.types.Object.b4w_custom_prop = bpy.props.PointerProperty(
        name = "Object Custom Property Group",
        type = B4W_CustomPropObject,
        options = set()
    )

    bpy.types.Scene.b4w_custom_prop = bpy.props.CollectionProperty(
        name = "Object Custom Property Collection",
        description = "ggg",
        type = B4W_CustomPropScene,
        options = set()
    )

def unregister():
    del bpy.types.Scene.b4w_custom_prop
    del bpy.types.Object.b4w_custom_prop

    bpy.utils.unregister_class(B4W_CustomPropObject)
    bpy.utils.unregister_class(B4W_CustomPropScene)

