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
import mathutils
import math
import os
import cProfile

import blend4web

b4w_modules = ["interface", "translator"]
for m in b4w_modules:
    exec(blend4web.load_module_script.format(m))

from .interface import *
from blend4web.translator import _, p_

b4w_camera_move_style_items = [
        ("STATIC", _("Static"), _("Static camera")),
        ("TARGET", _("Target"), _("Move target")),
        ("EYE", _("Eye"), _("Move eye")),
        ("HOVER", _("Hover"), _("Hover mode"))
    ]

b4w_anim_behavior_items = [
        ("CYCLIC", _("Loop"), _("Behavior: cyclically repeat the finished animation")),
        ("FINISH_RESET", _("Finish Reset"), _("Behavior: reset the finished animation")),
        ("FINISH_STOP", _("Finish Stop"), _("Behavior: stop the finished animation"))
    ]

class B4W_StringWrap(bpy.types.PropertyGroup):
    name = bpy.props.StringProperty(name = _("name"),)

class B4W_ViewportAlignment(bpy.types.PropertyGroup):
    alignment = bpy.props.EnumProperty(
        name = _("Alignment"),
        description = _("Alignment"),
        default = "CENTER",
        items = [
            ("BOTTOM_RIGHT", _("Bottom-Right"), _("Bottom-right corner")),
            ("BOTTOM", _("Bottom"), _("Bottom edge")),
            ("BOTTOM_LEFT", _("Bottom-Left"), _("Bottom-left corner")),
            ("RIGHT", _("Right"), _("Right edge")),
            ("CENTER", _("Center"), _("Center")),
            ("LEFT", _("Left"), _("Left edge")),
            ("TOP_RIGHT", _("Top-Right"), _("Top-right corner")),
            ("TOP", _("Top"), _("Top edge")),
            ("TOP_LEFT", _("Top-Left"), _("Top-left corner"))
        ]
    )
    distance = bpy.props.FloatProperty(
        name = _("Distance"),
        description = _("Distance"),
        default = 10
    )

class B4W_DetailBendingColors(bpy.types.PropertyGroup):

    leaves_stiffness_col = bpy.props.StringProperty(
        name = _("B4W: leaves stiffness color"),
        description = _("Vertex color used for leaves stiffness"),
        default = ""
    )
    leaves_phase_col = bpy.props.StringProperty(
        name = _("B4W: leaves phase color"),
        description = _("Vertex color used for leaves phase"),
        default = ""
    )
    overall_stiffness_col = bpy.props.StringProperty(
        name = _("B4W: overall stiffness color"),
        description = _("Vertex color used for overall stiffness"),
        default = ""
    )

class B4W_FloatingSettings(bpy.types.PropertyGroup):
    part = bpy.props.EnumProperty(
        name = _("Floater part"),
        description = _("Floating object part"),
        default = "MAIN_BODY",
        items = [
            ("MAIN_BODY", _("Main Body"), _("Floating object main body")),
            ("BOB", _("Bob"), _("Floating object's bob"))
        ]
    )
    floating_factor = bpy.props.FloatProperty(
        name = _("Floating factor"),
        description = _("Factor of strength applied to the floating object"),
        default = 3.0,
        min = 0.0,
        soft_max = 100,
        step = 1,
        precision = 3
    )
    water_lin_damp = bpy.props.FloatProperty(
        name = _("Water Linear damping"),
        description = _("Linear damping applied to objects under water"),
        default = 0.8,
        min = 0.0,
        soft_max = 1,
        step = 1,
        precision = 3
    )
    water_rot_damp = bpy.props.FloatProperty(
        name = _("Water Rotation damping"),
        description = _("Rotation damping applied to objects under water"),
        default = 0.8,
        min = 0.0,
        soft_max = 1,
        step = 1,
        precision = 3
    )
    synchronize_position = bpy.props.BoolProperty(
        name = _("Synchronize position"),
        description = _("Synchronize bob position"),
        default = False,
    )

class B4W_Tags(bpy.types.PropertyGroup):
    title = bpy.props.StringProperty(
        name = _("Title"),
        description = _("Title"),
        default = ""
    )
    description = bpy.props.StringProperty(
        name = _("Description"),
        description = _("Description"),
        default = ""
    )
    desc_source = bpy.props.EnumProperty(
        name = _("Description source"),
        description = "",
        default = "TEXT",
        items = [
            ("TEXT", _("Text"), _("Get description from text field")),
            ("FILE", _("File"), _("Get description from file"))
        ]
    )

class B4W_Object_Tags(bpy.types.PropertyGroup):
    title = bpy.props.StringProperty(
        name = _("Title"),
        description = _("Title"),
        default = ""
    )
    description = bpy.props.StringProperty(
        name = _("Description"),
        description = _("Description"),
        default = "",
        maxlen = 1000
    )
    desc_source = bpy.props.EnumProperty(
        name = _("Description source"),
        description = "",
        default = "TEXT",
        items = [
            ("TEXT", _("Text"), _("Get description from text field")),
            ("FILE", _("File"), _("Get description from file"))
        ]
    )
    category = bpy.props.StringProperty(
        name = _("Class"),
        description = _("Class"),
        default = ""
    )

class B4W_VehicleSettings(bpy.types.PropertyGroup):
    part = bpy.props.EnumProperty(
        name = _("Vehicle part"),
        description = _("Vehicle part"),
        default = "CHASSIS",
        items = [
            ("HULL", _("Hull"), _("Vehicle hull")),
            ("CHASSIS", _("Chassis"), _("Vehicle chassis")),
            ("STEERING_WHEEL", _("Steering Wheel"), _("Optional vehicle steering wheel")),
            ("WHEEL_FRONT_LEFT", _("Front Left Wheel"), _("Vehicle front left wheel")),
            ("WHEEL_FRONT_RIGHT", _("Front Right Wheel"), _("Vehicle front right wheel")),
            ("WHEEL_BACK_LEFT", _("Back Left Wheel"), _("Vehicle rear left wheel")),
            ("WHEEL_BACK_RIGHT", _("Back Right Wheel"), _("Vehicle rear right wheel")),
            ("TACHOMETER", _("Tachometer"), _("Vehicle tachometer")),
            ("SPEEDOMETER", _("Speedometer"), _("Vehicle speedometer")),
            ("BOB", _("Bob"), _("Boat's bob"))
        ]
    )
    suspension_rest_length = bpy.props.FloatProperty(
        name = _("Rest length"),
        description = _("Suspension rest length, length from relaxed to strained wheel position"),
        default = 0.1,
        min = 0.0,
        soft_max = 1.0,
        step = 1,
        precision = 3
    )
    suspension_compression = bpy.props.FloatProperty(
        name = _("Suspension compression"),
        description = _("Suspension compression"),
        default = 4.4,
        min = 0.0,
        soft_max = 10.0,
        step = 10,
        precision = 1
    )
    suspension_stiffness = bpy.props.FloatProperty(
        name = _("Suspension stiffness"),
        description = _("Suspension stiffness"),
        default = 20.0,
        min = 0.0,
        soft_max = 100.0,
        step = 10,
        precision = 1
    )
    suspension_damping = bpy.props.FloatProperty(
        name = _("Suspension damping"),
        description = _("Suspension damping"),
        default = 2.3,
        min = 0.0,
        soft_max = 10.0,
        step = 10,
        precision = 1
    )
    wheel_friction = bpy.props.FloatProperty(
        name = _("Wheel friction"),
        description = _("Wheel friction"),
        default = 1000.0,
        min = 0.0,
        soft_max = 10000.0,
        step = 100,
        precision = 1
    )
    roll_influence = bpy.props.FloatProperty(
        name = _("Roll influence"),
        description = _("Roll influence"),
        default = 0.1,
        min = 0.0,
        soft_max = 10.0,
        step = 1,
        precision = 3
    )
    force_max = bpy.props.FloatProperty(
        name = _("Force max"),
        description = _("Acceleration value for the vehicle"),
        default = 1500.0,
        min = 0.0,
        soft_max = 10000.0,
        step = 1,
        precision = 3
    )
    brake_max = bpy.props.FloatProperty(
        name = _("Brake max"),
        description = _("Braking value for the vehicle"),
        default = 100.0,
        min = 0.0,
        soft_max = 10000.0,
        step = 1,
        precision = 3
    )
    steering_ratio = bpy.props.FloatProperty(
        name = _("Steering ratio"),
        description = _("Ratio between the turn of the steering wheel and the turn of the wheels"),
        default = 10.0,
        min = 0.0,
        soft_max = 100.0,
        step = 1,
        precision = 3
    )
    steering_max = bpy.props.FloatProperty(
        name = _("Steering max"),
        description = _("Maximum steering wheel angle"),
        default = 1,
        min = 0.0,
        soft_max = 10,
        step = 1,
        precision = 3
    )
    inverse_control = bpy.props.BoolProperty(
        name = _("Inverse control"),
        description = _("Inverse vehicle control"),
        default = False,
    )
    delta_tach_angle = bpy.props.FloatProperty(
        name = _("Tachometer delta angle"),
        description = _("Sets delta angle for the tachometer device"),
        default = 4.43,
        min = 0.0,
        soft_max = 6.18,
        step = 1,
        precision = 1,
        subtype = 'ANGLE'
    )
    max_speed_angle = bpy.props.FloatProperty(
        name = _("Speedometer max angle"),
        description = _("Sets max angle for the speedometer device"),
        default = 3.14,
        min = 0.0,
        soft_max = 6.18,
        step = 1,
        precision = 1,
        subtype = 'ANGLE'
    )
    speed_ratio = bpy.props.FloatProperty(
        name = _("Speedometer ratio"),
        description = _("Sets speedometer ratio"),
        default = 0.027,
        min = 0.0,
        soft_max = 10,
        step = 1,
        precision = 3,
        subtype = 'ANGLE'
    )
    max_suspension_travel_cm = bpy.props.FloatProperty(
        name = _("Max suspension travel cm"),
        description = _("Max suspension travel cm"),
        default = 30,
        min = 0.0,
        soft_max = 100,
        step = 1,
        precision = 3
    )
    floating_factor = bpy.props.FloatProperty(
        name = _("Floating factor"),
        description = _("Factor of strengh applied to the floating object"),
        default = 3.0,
        min = 0.0,
        soft_max = 100,
        step = 1,
        precision = 3
    )
    water_lin_damp = bpy.props.FloatProperty(
        name = _("Water Linear damping"),
        description = _("Linear damping applied to objects under water"),
        default = 0.8,
        min = 0.0,
        soft_max = 1,
        step = 1,
        precision = 3
    )
    water_rot_damp = bpy.props.FloatProperty(
        name = _("Water Rotation damping"),
        description = _("Rotation damping applied to objects under water"),
        default = 0.8,
        min = 0.0,
        soft_max = 1,
        step = 1,
        precision = 3
    )
    synchronize_position = bpy.props.BoolProperty(
        name = _("Synchronize position"),
        description = _("Synchronize bob position"),
        default = False,
    )

class B4W_OutlineSettings(bpy.types.PropertyGroup):
    outline_duration = bpy.props.FloatProperty(
        name = _("Outline duration"),
        description = _("Outline duration"),
        default = 1.0,
        min = 0.01,
        soft_max = 10.0,
        max = 1000.0,
        step = 1,
        precision = 2
    )
    outline_period = bpy.props.FloatProperty(
        name = _("Outline peroid"),
        description = _("Outline period"),
        default = 1.0,
        min = 0.01,
        soft_max = 10.0,
        max = 1000.0,
        step = 1,
        precision = 2
    )
    outline_relapses = bpy.props.IntProperty(
        name = _("Outline relapses"),
        description = _("Outline relapses"),
        default = 0,
        min = 0,
        soft_max = 10,
        max = 1000
    )

class B4W_CharacterSettings(bpy.types.PropertyGroup):
    walk_speed = bpy.props.FloatProperty(
        name = _("B4W: character walk speed"),
        description = _("Character walk speed"),
        default = 4,
        min = 0.0,
        max = 10.0,
        soft_min = 0,
        soft_max = 10,
        step = 0.1,
        precision = 2
    )
    run_speed = bpy.props.FloatProperty(
        name = _("B4W: character run speed"),
        description = _("Character run speed"),
        default = 8,
        min = 0.0,
        max = 20.0,
        soft_min = 0,
        soft_max = 20,
        step = 0.1,
        precision = 2
    )
    step_height = bpy.props.FloatProperty(
        name = _("B4W: character step height"),
        description = _("Character step height"),
        default = 0.25,
        min = 0.0,
        max = 1.0,
        soft_min = 0,
        soft_max = 1,
        step = 0.01,
        precision = 3
    )
    jump_strength = bpy.props.FloatProperty(
        name = _("B4W: character jump strength"),
        description = _("Character jump strength"),
        default = 5,
        min = 0.0,
        max = 100.0,
        soft_min = 0,
        soft_max = 50,
        step = 0.1,
        precision = 2
    )
    waterline = bpy.props.FloatProperty(
        name = _("B4W: character waterline"),
        description = _("Waterline for character in vertical direction"),
        default = 0.0,
        min = -5,
        max = 5,
        soft_min = -2,
        soft_max = 2,
        step = 0.01,
        precision = 3
    )

class B4W_ShadowSettings(bpy.types.PropertyGroup):

    csm_resolution = bpy.props.EnumProperty(
        name = _("csm_resolution"),
        description = _("Shadow map resolution"),
        default = "2048",
        items = [
            ("512",  "512",  "512x512"),
            ("1024", "1024", "1024x1024"),
            ("2048", "2048", "2048x2048"),
            ("4096", "4096", "4096x4096"),
            ("8192", "8192", "8192x8192")
        ]
    )

    self_shadow_polygon_offset = bpy.props.FloatProperty(
        name = _("self_shadow_polygon_offset"),
        description = _("Polygon offset value to prevent shadow acne"),
        default = 1,
        min = 0,
        soft_max = 50,
        step = 10,
        precision = 2
    )

    self_shadow_normal_offset = bpy.props.FloatProperty(
        name = _("self_shadow_normal_offset"),
        description = _("Normal offset value to prevent shadow acne"),
        default = 0.01,
        min = 0,
        soft_max = 1,
        step = 0.1,
        precision = 3
    )

    b4w_enable_csm  = bpy.props.BoolProperty(
        name = _("b4w_enable_csm"),
        description = _("Enable cascaded shadow maps"),
        default = False
    )

    csm_num = bpy.props.IntProperty(
        name = _("csm_num"),
        description = _("Number of cascaded shadow maps"),
        default = 1,
        min = 1,
        max = 4
    )

    csm_first_cascade_border = bpy.props.FloatProperty(
        name = _("csm_first_cascade_border"),
        description = _("Shadow map first cascade border"),
        default = 10,
        min = 0.01,
        soft_max = 100,
        step = 10,
        precision = 2
    )

    first_cascade_blur_radius = bpy.props.FloatProperty(
        name = _("first_cascade_blur_radius"),
        description = _("PCF blur radius for the first cascade"),
        default = 3,
        min = 0,
        soft_max = 10,
        step = 10,
        precision = 2
    )

    csm_last_cascade_border = bpy.props.FloatProperty(
        name = _("csm_last_cascade_border"),
        description = _("Shadow map last cascade border"),
        default = 100,
        min = 0.01,
        soft_max = 100,
        step = 10,
        precision = 2
    )

    last_cascade_blur_radius = bpy.props.FloatProperty(
        name = _("last_cascade_blur_radius"),
        description = _("PCF blur radius for the last cascade"),
        default = 1.5,
        min = 0,
        soft_max = 10,
        step = 10,
        precision = 2
    )

    fade_last_cascade = bpy.props.BoolProperty(
        name = _("fade_last_cascade"),
        description = _("The last cascade will be faded out"),
        default = True
    )

    blend_between_cascades = bpy.props.BoolProperty(
        name = _("blend_between_cascades"),
        description = _("Neighbouring cascades will be blended with each other"),
        default = True
    )

class B4W_ColorCorrectionSettings(bpy.types.PropertyGroup):

    brightness = bpy.props.FloatProperty(
        name = _("brightness"),
        description = _("Final image brightness"),
        default = 0.0,
        min = -1.0,
        max = 1.0,
        step = 0.01,
        precision = 2
    )

    contrast = bpy.props.FloatProperty(
        name = _("contrast"),
        description = _("Final image contrast"),
        default = 0.0,
        min = -1.0,
        max = 1.0,
        step = 0.01,
        precision = 2
    )

    exposure = bpy.props.FloatProperty(
        name = _("exposure"),
        description = _("Final image exposure"),
        default = 1.0,
        min = 0.0,
        max = 2.0,
        step = 0.01,
        precision = 2
    )

    saturation = bpy.props.FloatProperty(
        name = _("saturation"),
        description = _("Final image saturation"),
        default = 1.0,
        min = 0.0,
        max = 2.0,
        step = 0.01,
        precision = 2
    )

class B4W_SSAOSettings(bpy.types.PropertyGroup):

    radius_increase = bpy.props.FloatProperty(
        name = _("radius_increase"),
        description = _("Radius Increase"),
        default = 3.0,
        min = 0.0,
        max = 15.0,
        step = 0.01,
        precision = 2
    )

    hemisphere = bpy.props.BoolProperty(
        name = _("hemisphere"),
        description = _("Calculation ssao with hemisphere"),
        default = False
    )

    blur_depth = bpy.props.BoolProperty(
        name = _("blur_depth"),
        description = _("Apply edge-preserving blur to ssao"),
        default = False
    )

    blur_discard_value = bpy.props.FloatProperty(
        name = _("blur_discard_value"),
        description = _("Blur depth discard value"),
        default = 1.0,
        min = 0.0,
        max = 2.0,
        step = 0.01,
        precision = 1
    )

    influence = bpy.props.FloatProperty(
        name = _("influence"),
        description = _("How much AO affects the final rendering"),
        default = 0.7,
        min = 0.0,
        max = 1.0,
        step = 0.005,
        precision = 3
    )

    dist_factor = bpy.props.FloatProperty(
        name = _("dist_factor"),
        description = _("How much AO decreases with distance"),
        default = 0.0,
        min = 0.0,
        max = 20.0,
        step = 0.01,
        precision = 2
    )

    samples = bpy.props.EnumProperty(
        name = _("samples"),
        description = _("Number of samples aka quality"),
        default = "16",
        items = [
            ("8", "8", "8", 0),
            ("16", "16", "16", 1),
            ("24", "24", "24", 2),
            ("32", "32", "32", 3),
        ]
    )


class B4W_GodRaysSettings(bpy.types.PropertyGroup):

    intensity = bpy.props.FloatProperty(
        name = _("intensity"),
        description = _("Intensity multiplier"),
        default = 0.7,
        min = 0.0,
        max = 5.0,
        step = 0.01,
        precision = 2
    )

    max_ray_length = bpy.props.FloatProperty(
        name = _("max_ray_length"),
        description = _("Maximum length of rays in screen size units"),
        default = 1.0,
        min = 0.0,
        max = 5.0,
        step = 0.01,
        precision = 2
    )

    steps_per_pass = bpy.props.FloatProperty(
        name = _("steps_per_pass"),
        description = _("Number of steps per blur pass (3 passes in all)"),
        default = 10.0,
        min = 0.0,
        max = 30.0,
        step = 1.0,
        precision = 1
    )

class B4W_GlowSettings(bpy.types.PropertyGroup):

    small_glow_mask_coeff = bpy.props.FloatProperty(
        name = _("B4W: objects small glow mask coefficient"),
        description = _("Objects small glow mask coefficient"),
        default = 2.0,
        min = 0.0,
        soft_min = 0.0,
        max = 10.0,
        soft_max = 10.0,
        precision = 3
    )

    large_glow_mask_coeff = bpy.props.FloatProperty(
        name = _("B4W: objects large glow mask coefficient"),
        description = _("Objects large glow mask coefficient"),
        default = 2.0,
        min = 0.0,
        soft_min = 0.0,
        max = 10.0,
        soft_max = 10.0,
        precision = 3
    )

    small_glow_mask_width = bpy.props.FloatProperty(
        name = _("B4W: objects small glow mask width"),
        description = _("Objects small glow mask width"),
        default = 2.0,
        min = 1.0,
        soft_min = 1.0,
        max = 20.0,
        soft_max = 20.0,
        precision = 2
    )

    large_glow_mask_width = bpy.props.FloatProperty(
        name = _("B4W: objects large glow mask width"),
        description = _("Objects large glow mask width"),
        default = 6.0,
        min = 1.0,
        soft_min = 1.0,
        max = 20.0,
        soft_max = 20.0,
        precision = 2
    )

    render_glow_over_blend = bpy.props.BoolProperty(
        name = _("B4W: render glow materials over blend"),
        description = _("Render glow materials over blend"),
        default = False
    )

class B4W_BloomSettings(bpy.types.PropertyGroup):

    key = bpy.props.FloatProperty(
        name = _("key"),
        description = _("Key multiplier"),
        default = 1.0,
        min = 0.0,
        max = 5.0,
        step = 0.01,
        precision = 2
    )

    blur = bpy.props.FloatProperty(
        name = _("blur"),
        description = _("Bloom blur strength"),
        default = 4.0,
        min = 0.0,
        max = 20.0,
        step = 0.01,
        precision = 2
    )

    edge_lum = bpy.props.FloatProperty(
        name = _("edge_lum"),
        description = _("Bloom edge relative luminance (bloom starts above this value)"),
        default = 1.0,
        min = 0.0,
        max = 3.0,
        step = 0.01,
        precision = 2
    )

class B4W_MotionBlurSettings(bpy.types.PropertyGroup):

    motion_blur_factor = bpy.props.FloatProperty(
        name = _("motion_blur_factor"),
        description = _("Motion blur factor"),
        default = 0.01,
        min = 0.001,
        soft_min = 0.001,
        max = 1.0,
        soft_max = 1.0,
        step = 0.1,
        precision = 3
    )

    motion_blur_decay_threshold = bpy.props.FloatProperty(
        name = _("motion_blur_decay_threshold"),
        description = _("Motion blur decay threshold"),
        default = 0.01,
        min = 0.0,
        soft_min = 0.0,
        max = 1.0,
        soft_max = 1.0,
        step = 0.1,
        precision = 3
    )

class B4W_SkySettings(bpy.types.PropertyGroup):

    render_sky = bpy.props.BoolProperty(
        name = _("B4W: render sky"),
        description = _("Sky will be rendered instead of default background"),
        default = False
    )

    reflexible = bpy.props.BoolProperty(
        name = _("B4W: reflexible"),
        description = _("Sky will be rendered during the reflection pass"),
        default = False
    )

    reflexible_only = bpy.props.BoolProperty(
        name = _("B4W: reflexible only"),
        description = _("Sky will not be rendered, but will have a reflection"),
        default = False
    )

    procedural_skydome = bpy.props.BoolProperty(
        name = _("B4W: procedural skydome"),
        description = _("Sky will be generated procedurally"),
        default = False
    )

    use_as_environment_lighting = bpy.props.BoolProperty(
        name = _("B4W: use_as_environment_map"),
        description = _("Procedural sky will be used as environment lighting"),
        default = False
    )

    color = bpy.props.FloatVectorProperty(
        name = _("color"),
        description = _("Sky atmosphere color"),
        default = (0.087, 0.255, 0.6),
        min = 0.0,
        soft_min = 0.0,
        max = 1.0,
        soft_max = 1.0,
        precision = 3,
        subtype = 'COLOR',
        size = 3
    )

    rayleigh_brightness = bpy.props.FloatProperty(
        name = _("rayleigh_brightness"),
        description = _("Brightness of Rayleigh scattering"),
        default = 3.3,
        min = 0.0,
        max = 5.0,
        step = 0.01,
        precision = 2
    )

    mie_brightness = bpy.props.FloatProperty(
        name = _("mie_brightness"),
        description = _("Brightness of Mie scattering"),
        default = 0.1,
        min = 0.0,
        max = 1.0,
        step = 0.01,
        precision = 2
    )

    spot_brightness = bpy.props.FloatProperty(
        name = _("spot_brightness"),
        description = _("Brightness of sun spot"),
        default = 20.0,
        min = 0.0,
        max = 1000.0,
        step = 1.0,
        precision = 1
    )

    scatter_strength = bpy.props.FloatProperty(
        name = _("scatter_strength"),
        description = _("Strength of light scattering"),
        default = 0.2,
        min = 0.0,
        max = 1.0,
        step = 0.01,
        precision = 2
    )

    rayleigh_strength = bpy.props.FloatProperty(
        name = _("rayleigh_strength"),
        description = _("Strength of Rayleigh scattering"),
        default = 0.2,
        min = 0.0,
        max = 1.0,
        step = 0.01,
        precision = 2
    )

    mie_strength = bpy.props.FloatProperty(
        name = _("mie_strength"),
        description = _("Strength of Mie scattering"),
        default = 0.006,
        min = 0.0,
        max = 0.1,
        step = 0.0001,
        precision = 4
    )

    rayleigh_collection_power = bpy.props.FloatProperty(
        name = _("rayleigh_collection_power"),
        description = _("Rayleigh collection power"),
        default = 0.35,
        min = 0.0,
        max = 2.0,
        step = 0.01,
        precision = 2
    )

    mie_collection_power = bpy.props.FloatProperty(
        name = _("mie_collection_power"),
        description = _("Mie collection power"),
        default = 0.5,
        min = 0.0,
        max = 2.0,
        step = 0.01,
        precision = 2
    )

    mie_distribution = bpy.props.FloatProperty(
        name = _("mie_distribution"),
        description = _("Mie disturbtion"),
        default = 0.4,
        min = 0.0,
        max = 2.0,
        step = 0.01,
        precision = 2
    )

class B4W_DynamicCompressorSettings(bpy.types.PropertyGroup):
    threshold = bpy.props.FloatProperty(
        name = _("threshold"),
        description = _("The value above which the compression will start taking effect"),
        default = -24,
        min = -100,
        max = 0,
        step = 10,
        precision = 1
    )
    knee = bpy.props.FloatProperty(
        name = _("knee"),
        description = _("Range above the threshold where the curve transitions to the ratio portion"),
        default = 30,
        min = 0,
        max = 40,
        step = 10,
        precision = 1
    )
    ratio = bpy.props.FloatProperty(
        name = _("ratio"),
        description = _("dB input change for a 1 dB output change"),
        default = 12,
        min = 1,
        max = 20,
        step = 10,
        precision = 1
    )
    attack = bpy.props.FloatProperty(
        name = _("attack"),
        description = _("Amount of time to reduce gain by 10 dB"),
        default = 0.003,
        min = 0,
        max = 1,
        step = 0.1,
        precision = 3
    )
    release = bpy.props.FloatProperty(
        name = _("release"),
        description = _("Amount of time to increase gain by 10 dB"),
        default = 0.250,
        min = 0,
        max = 1,
        step = 0.1,
        precision = 3
    )

class B4W_BoundingsSettings(bpy.types.PropertyGroup):
    min_x = bpy.props.FloatProperty(
        name = _("min_x"),
        description = _("Boundings minimum x"),
        default = -1.0,
        min = -1000,
        max = 1000,
        soft_min = -50,
        soft_max = 50,
        step = 1,
        precision = 3
    )
    max_x = bpy.props.FloatProperty(
        name = _("max_x"),
        description = _("Boundings maximum x"),
        default = 1.0,
        min = -1000,
        max = 1000,
        soft_min = -50,
        soft_max = 50,
        step = 1,
        precision = 3
    )
    min_y = bpy.props.FloatProperty(
        name = _("min_y"),
        description = _("Boundings minimum y"),
        default = -1.0,
        min = -1000,
        max = 1000,
        soft_min = -50,
        soft_max = 50,
        step = 1,
        precision = 3
    )
    max_y = bpy.props.FloatProperty(
        name = _("max_y"),
        description = _("Boundings maximum y"),
        default = 1.0,
        min = -1000,
        max = 1000,
        soft_min = -50,
        soft_max = 50,
        step = 1,
        precision = 3
    )
    min_z = bpy.props.FloatProperty(
        name = _("min_z"),
        description = _("Boundings minimum z"),
        default = -1.0,
        min = -1000,
        max = 1000,
        soft_min = -50,
        soft_max = 50,
        step = 1,
        precision = 3
    )
    max_z = bpy.props.FloatProperty(
        name = _("max_z"),
        description = _("Boundings maximum z"),
        default = 1.0,
        min = -1000,
        max = 1000,
        soft_min = -50,
        soft_max = 50,
        step = 1,
        precision = 3
    )

class B4W_AnchorSettings(bpy.types.PropertyGroup):
    type = bpy.props.EnumProperty(
        name = _("Anchor Type"),
        description = _("Anchor type"),
        default = "ANNOTATION",
        items = [
            ("GENERIC", _("Generic"), _("Do not assign any HTML element, controlled by API")),
            ("ELEMENT", _("Custom Element"), _("Assign existing HTML element by ID")),
            ("ANNOTATION", _("Annotation"), _("Create an HTML element with annotation from meta tags"))
        ]
    )
    detect_visibility = bpy.props.BoolProperty(
        name = _("Detect Visibility"),
        description = _("Detect visibility of anchor object (slow)"),
        default = False
    )
    element_id = bpy.props.StringProperty(
        name = _("HTML element ID"),
        description = _("ID of element for ELEMENT anchor type"),
        default = ""
    )
    max_width = bpy.props.IntProperty(
        name = _("Max Width"),
        description = _("Maximum width of annotation description element (in pixels)"),
        default = 250,
        min = 0,
        soft_max = 1000,
        max = 10000
    )

def add_b4w_props():

    b4w_do_not_export = bpy.props.BoolProperty(
        name = _("B4W: do not export"),
        description = _("Check if you do NOT wish to export this component"),
        default = False
    )

    # deprecated
    b4w_export_path = bpy.props.StringProperty(
        name = _("B4W: component export path"),
        description = _("Exported file path relative to the blend file"),
        default = ""
    )

    class_names = [
        'Action',
        'Armature',
        'Camera',
        'Curve',
        'Group',
        'Image',
        'Lamp',
        'Material',
        'Mesh',
        'Object',
        'ParticleSettings',
        'Texture',
        'Scene',
        'Speaker',
        'Sound',
        'World'
    ]

    class_names_do_not_export = [
        'Image',
        'Material',
        'Object',
        'ParticleSettings',
        'Scene',
        'Texture',
        'World'
    ]

    for class_name in class_names_do_not_export:
        cl = getattr(bpy.types, class_name)
        cl.b4w_do_not_export = b4w_do_not_export

    for class_name in class_names:
        cl = getattr(bpy.types, class_name)
        # deprecated
        cl.b4w_export_path   = b4w_export_path

    b4w_export_path_json = bpy.props.StringProperty(
        name = _("B4W: export path json"),
        description = _("Exported json file path relative to the blend file"),
        default = ""
    )
    b4w_export_path_html = bpy.props.StringProperty(
        name = _("B4W: export path html"),
        description = _("Exported html file path relative to the blend file"),
        default = ""
    )
    bpy.types.Scene.b4w_export_path_json = b4w_export_path_json
    bpy.types.Scene.b4w_export_path_html = b4w_export_path_html

    add_scene_properties()

    b4w_use_custom_color = bpy.props.BoolProperty(
        name = _("B4W: use custom color"),
        description = _("Fog will uses custom color instead of horizon color"),
        default = True
    )
    bpy.types.World.b4w_use_custom_color = b4w_use_custom_color

    b4w_fog_color = bpy.props.FloatVectorProperty(
        name = _("B4W: fog color"),
        description = _("Fog color"),
        default = (0.5, 0.5, 0.5),
        min = 0.0,
        soft_min = 0.0,
        max = 1.0,
        soft_max = 1.0,
        precision = 3,
        subtype = 'COLOR',
        size = 3
    )
    bpy.types.World.b4w_fog_color = b4w_fog_color

    bpy.types.World.b4w_sky_settings = bpy.props.PointerProperty(
        name = _("B4W: sky settings"),
        type = B4W_SkySettings
    )

    add_object_properties()

    add_text_properties()

    add_world_properties()

    # for camera panel
    b4w_move_style = bpy.props.EnumProperty(
        name = _("B4W: movement style"),
        description = _("Default camera movement style"),
        default = "TARGET",
        items = b4w_camera_move_style_items
    )
    bpy.types.Camera.b4w_move_style = b4w_move_style

    b4w_hover_zero_level = bpy.props.FloatProperty(
        name = _("B4W: zero level"),
        description = _("Zero level for the HOVER camera (Z-coordinate of the initial supporting plane)"),
        default = 0.0,
        min = -1000000.0,
        soft_min = -1000.0,
        max = 1000000.0,
        soft_max = 1000.0,
        precision = 2,
        step = 1
    )
    bpy.types.Camera.b4w_hover_zero_level \
            = b4w_hover_zero_level

    b4w_trans_velocity = bpy.props.FloatProperty(
           name = _("B4W: Translation velocity of the camera"),
           description = _("Translation velocity of the camera"),
           default = 1.0,
           min = 0.0,
           soft_min = 0.0,
           precision = 3,
       )
    bpy.types.Camera.b4w_trans_velocity = b4w_trans_velocity

    b4w_rot_velocity = bpy.props.FloatProperty(
           name = _("B4W: Rotation velocity of the camera"),
           description = _("Rotation velocity of the camera"),
           default = 1.0,
           min = 0.0,
           soft_min = 0.0,
           precision = 3,
       )
    bpy.types.Camera.b4w_rot_velocity = b4w_rot_velocity

    b4w_zoom_velocity = bpy.props.FloatProperty(
           name = _("B4W: Zoom velocity of the camera"),
           description = _("Zoom velocity of the camera"),
           default = 0.1,
           min = 0.0,
           max = 0.99,
           soft_max = 1.0,
           soft_min = 0.0,
           step = 0.1,
           precision = 3,
       )
    bpy.types.Camera.b4w_zoom_velocity = b4w_zoom_velocity

    b4w_target = bpy.props.FloatVectorProperty(
        name = _("B4W: target"),
        description = _("Camera target location for 'TARGET' camera"),
        default = (0.0, 0.0, 0.0),
        min = -1000000.0,
        soft_min = -100.0,
        max = 1000000.0,
        soft_max = 100.0,
        precision = 2,
        subtype = 'XYZ',
        size = 3
    )
    bpy.types.Camera.b4w_target = b4w_target

    b4w_show_limits_in_viewport = bpy.props.BoolProperty(
        name = _("B4W: display limits in viewport"),
        description = _("Display limits for the current camera model in viewport"),
        default = False
    )
    bpy.types.Camera.b4w_show_limits_in_viewport = b4w_show_limits_in_viewport

    b4w_use_target_distance_limits = bpy.props.BoolProperty(
        name = _("B4W: use distance limits"),
        description = _("Check if you wish to set distance limits"),
        default = False
    )
    bpy.types.Camera.b4w_use_target_distance_limits = b4w_use_target_distance_limits

    b4w_use_zooming = bpy.props.BoolProperty(
        name = _("B4W: use zooming"),
        description = _("Enable various limits to set up camera zooming behaviour."),
        default = False
    )
    bpy.types.Camera.b4w_use_zooming = b4w_use_zooming

    b4w_distance_min = bpy.props.FloatProperty(
           name = _("B4W: Minimum distance to target"),
           description = _("Minimum distance to target"),
           default = 1.0,
           min = 0.0,
           soft_min = 0.0,
           max = 1000000.0,
           soft_max = 1000.0,
           precision = 3,
           step = 1
       )
    bpy.types.Camera.b4w_distance_min = b4w_distance_min

    b4w_distance_max = bpy.props.FloatProperty(
           name = _("B4W: Maximum distance to target"),
           description = _("Maximum distance to target"),
           default = 10.0,
           min = 0.0,
           soft_min = 0.0,
           max = 1000000.0,
           soft_max = 1000.0,
           precision = 3,
           step = 1
       )
    bpy.types.Camera.b4w_distance_max = b4w_distance_max

    b4w_horizontal_translation_min = bpy.props.FloatProperty(
           name = _("B4W: Minimum value of the horizontal translation"),
           description = _("Minimum value of the horizontal translation"),
           default = -10.0,
           min = -1000000.0,
           soft_min = -1000.0,
           max = 1000000.0,
           soft_max = 1000.0,
           precision = 3,
           step = 1
       )
    bpy.types.Camera.b4w_horizontal_translation_min \
            = b4w_horizontal_translation_min

    b4w_horizontal_translation_max = bpy.props.FloatProperty(
           name = _("B4W: Maximum value of the horizontal translation"),
           description = _("Maximum value of the horizontal translation"),
           default = 10.0,
           min = -1000000.0,
           soft_min = -1000.0,
           max = 1000000.0,
           soft_max = 1000.0,
           precision = 3,
           step = 1
       )
    bpy.types.Camera.b4w_horizontal_translation_max \
            = b4w_horizontal_translation_max

    b4w_vertical_translation_min = bpy.props.FloatProperty(
           name = _("B4W: Minimum value of the vertical translation"),
           description = _("Minimum value of the vertical translation"),
           default = -10.0,
           min = -1000000.0,
           soft_min = -1000.0,
           max = 1000000.0,
           soft_max = 1000.0,
           precision = 3,
           step = 1
       )
    bpy.types.Camera.b4w_vertical_translation_min \
            = b4w_vertical_translation_min 

    b4w_vertical_translation_max = bpy.props.FloatProperty(
           name = _("B4W: Maximum value of the vertical translation"),
           description = _("Maximum value of the vertical translation"),
           default = 10.0,
           min = -1000000.0,
           soft_min = -1000.0,
           max = 1000000.0,
           soft_max = 1000.0,
           precision = 3,
           step = 1
       )
    bpy.types.Camera.b4w_vertical_translation_max \
            = b4w_vertical_translation_max 

    b4w_use_horizontal_clamping = bpy.props.BoolProperty(
        name = _("B4W: use horizontal clamping"),
        description = _("Check if you wish to set horizontal clamping values"),
        default = False
    )
    bpy.types.Camera.b4w_use_horizontal_clamping = b4w_use_horizontal_clamping

    b4w_rotation_left_limit = bpy.props.FloatProperty(
           name = _("B4W: Rotation left limit"),
           description = _("Rotation left limit angle"),
           default = -math.pi / 4,
           min = -2 * math.pi,
           soft_min = -2 * math.pi,
           max = 2 * math.pi,
           soft_max = 2 * math.pi,
           precision = 1,
           subtype = "ANGLE",
           step = 10
       )
    bpy.types.Camera.b4w_rotation_left_limit = b4w_rotation_left_limit

    b4w_rotation_right_limit = bpy.props.FloatProperty(
           name = _("B4W: Rotation right limit"),
           description = _("Rotation right limit angle"),
           default = math.pi / 4,
           min = -2 * math.pi,
           soft_min = -2 * math.pi,
           max = 2 * math.pi,
           soft_max = 2 * math.pi,
           precision = 1,
           subtype = "ANGLE",
           step = 10
       )
    bpy.types.Camera.b4w_rotation_right_limit = b4w_rotation_right_limit

    b4w_hover_angle_min = bpy.props.FloatProperty(
           name = _("B4W: Minimum rotation angle"),
           description = _("Minimum rotation angle"),
           default = 0,
           min = 0,
           soft_min = 0,
           max = math.pi / 2,
           soft_max = math.pi / 2,
           precision = 1,
           subtype = "ANGLE",
           step = 10
       )
    bpy.types.Camera.b4w_hover_angle_min = b4w_hover_angle_min

    b4w_hover_angle_max = bpy.props.FloatProperty(
           name = _("B4W: Maximum rotation angle"),
           description = _("Maximum rotation angle"),
           default = math.pi / 2,
           min = 0,
           soft_min = 0,
           max = math.pi / 2,
           soft_max = math.pi / 2,
           precision = 1,
           subtype = "ANGLE",
           step = 10
       )
    bpy.types.Camera.b4w_hover_angle_max = b4w_hover_angle_max

    bpy.types.Camera.b4w_horizontal_clamping_type = bpy.props.EnumProperty(
        name = _("B4W: horizontal rotation clamping type"),
        description = _("Horizontal rotation clamping type"),
        default = "LOCAL",
        items = [
            ("LOCAL", _("Camera Space"), _("Clamp angles in camera space")),
            ("WORLD", _("World Space"), _("Clamp angles in world space"))
        ]
    )

    b4w_use_vertical_clamping = bpy.props.BoolProperty(
        name = _("B4W: use vertical clamping"),
        description = _("Check if you wish to set vertical clamping values"),
        default = False
    )
    bpy.types.Camera.b4w_use_vertical_clamping \
            = b4w_use_vertical_clamping

    b4w_enable_hover_hor_rotation = bpy.props.BoolProperty(
        name = _("B4W: enable horizontal rotation"),
        description = _("Enable horizontal rotation"),
        default = True
    )
    bpy.types.Camera.b4w_enable_hover_hor_rotation \
            = b4w_enable_hover_hor_rotation

    b4w_use_panning = bpy.props.BoolProperty(
        name = _("B4W: enable panning mode"),
        description = _("Enable panning mode"),
        default = True
    )
    bpy.types.Camera.b4w_use_panning \
            = b4w_use_panning

    bpy.types.Camera.b4w_use_pivot_limits = bpy.props.BoolProperty(
        name = _("B4W: enable pivot limits"),
        description = _("Enable pivot limits"),
        default = False
    )

    bpy.types.Camera.b4w_pivot_z_min = bpy.props.FloatProperty(
       name = _("B4W: Minimum Z coordinate for the camera pivot point"),
       description = _("Minimum Z coordinate for the camera pivot point"),
       default = 0.0,
       min = -1000000.0,
       soft_min = -1000.0,
       max = 1000000.0,
       soft_max = 1000.0,
       precision = 3,
       step = 1
    )

    bpy.types.Camera.b4w_pivot_z_max = bpy.props.FloatProperty(
       name = _("B4W: Maximum Z coordinate for the camera pivot point"),
       description = _("Maximum Z coordinate for the camera pivot point"),
       default = 10.0,
       min = -1000000.0,
       soft_min = -1000.0,
       max = 1000000.0,
       soft_max = 1000.0,
       precision = 3,
       step = 1
    )

    b4w_rotation_down_limit = bpy.props.FloatProperty(
        name = _("B4W: Rotation down limit"),
        description = _("Rotation down limit angle"),
        default = -math.pi / 4,
        min = -2 * math.pi,
        soft_min = -2 * math.pi,
        max = 2 * math.pi,
        soft_max = 2 * math.pi,
        precision = 1,
        subtype = "ANGLE",
        step = 10
    )
    bpy.types.Camera.b4w_rotation_down_limit = b4w_rotation_down_limit

    b4w_rotation_up_limit = bpy.props.FloatProperty(
        name = _("B4W: Rotation up limit"),
        description = _("Rotation up limit angle"),
        default = math.pi / 4,
        min = -2 * math.pi,
        soft_min = -2 * math.pi,
        max = 2 * math.pi,
        soft_max = 2 * math.pi,
        precision = 1,
        subtype = "ANGLE",
        step = 10
    )
    bpy.types.Camera.b4w_rotation_up_limit = b4w_rotation_up_limit

    bpy.types.Camera.b4w_vertical_clamping_type = bpy.props.EnumProperty(
        name = _("B4W: vertical rotation clamping type"),
        description = _("Vertical rotation clamping type"),
        default = "LOCAL",
        items = [
            ("LOCAL", _("Camera Space"), _("Clamp angles in camera space")),
            ("WORLD", _("World Space"), _("Clamp angles in world space"))
        ]
    )


    b4w_dof_front = bpy.props.FloatProperty(
           name = _("B4W: DOF front distance"),
           description = _("Distance to the front DOF plane"),
           default = 1.0,
           min = 0.0,
           soft_min = 0.0,
           max = 100000.0,
           soft_max = 100.0,
           precision = 3,
       )
    bpy.types.Camera.b4w_dof_front = b4w_dof_front

    b4w_dof_rear = bpy.props.FloatProperty(
           name = _("B4W: DOF rear distance"),
           description = _("Distance to the rear DOF plane"),
           default = 1.0,
           min = 0.0,
           soft_min = 0.0,
           max = 100000.0,
           soft_max = 100.0,
           precision = 3,
       )
    bpy.types.Camera.b4w_dof_rear = b4w_dof_rear

    b4w_dof_power = bpy.props.FloatProperty(
           name = _("B4W: DOF power"),
           description = _("Strength of DOF blur"),
           default = 3.0,
           min = 0.1,
           soft_min = 0.1,
           max = 20.0,
           soft_max = 20.0,
           precision = 2,
       )
    bpy.types.Camera.b4w_dof_power = b4w_dof_power

    add_speaker_properties()

    # deprecated
    b4w_generate_shadows = bpy.props.BoolProperty(
        name = _("B4W: generate shadows"),
        description = _("Whether the lamp generates shadows"),
        default = False
    )
    bpy.types.Lamp.b4w_generate_shadows = b4w_generate_shadows

    # for hemilamp panel
    # already exists in other lamps
    b4w_use_shadow = bpy.props.BoolProperty(
            name  = _("B4W: use shadow"),
            description = _("Whether the lamp generates shadows"),
            default = True
    )
    bpy.types.HemiLamp.use_shadow = b4w_use_shadow

    # for lamp panel
    b4w_dynamic_intensity = bpy.props.BoolProperty(
        name = _("B4W: dynamic intensity"),
        description = _("Whether sun changes intensity regardless to it position"),
        default = False
    )
    bpy.types.Lamp.b4w_dynamic_intensity = b4w_dynamic_intensity

    # for mesh panel
    b4w_override_boundings = bpy.props.BoolProperty(
        name = _("B4W: override boundings"),
        description = _("Override mesh boundings with specified values"),
        default = False
    )
    bpy.types.Mesh.b4w_override_boundings = b4w_override_boundings

    b4w_boundings = bpy.props.PointerProperty(
        name = _("B4W: boundings"),
        type = B4W_BoundingsSettings
    )
    bpy.types.Mesh.b4w_boundings = b4w_boundings

    add_material_properties()

    add_texture_properties()

    add_particle_settings_properties()

def remove_mesh_props():
    del bpy.types.Mesh.b4w_boundings
    del bpy.types.Mesh.b4w_override_boundings

def remove_obj_props():
    del bpy.types.Object.b4w_do_not_batch
    del bpy.types.Object.b4w_dynamic_geometry
    del bpy.types.Object.b4w_shape_keys
    del bpy.types.Object.b4w_apply_scale
    del bpy.types.Object.b4w_apply_modifiers
    del bpy.types.Object.b4w_do_not_cull
    del bpy.types.Object.b4w_disable_fogging
    del bpy.types.Object.b4w_do_not_render
    del bpy.types.Object.b4w_shadow_cast
    del bpy.types.Object.b4w_shadow_cast_only
    del bpy.types.Object.b4w_shadow_receive
    del bpy.types.Object.b4w_reflexible
    del bpy.types.Object.b4w_reflexible_only
    del bpy.types.Object.b4w_reflective
    del bpy.types.Object.b4w_reflection_type
    del bpy.types.Object.b4w_caustics
    del bpy.types.Object.b4w_use_default_animation
    del bpy.types.Object.b4w_anim_behavior
    del bpy.types.Object.b4w_animation_mixing
    del bpy.types.Object.b4w_proxy_inherit_anim
    del bpy.types.Object.b4w_wind_bending
    del bpy.types.Object.b4w_wind_bending_angle
    del bpy.types.Object.b4w_wind_bending_freq
    del bpy.types.Object.b4w_detail_bending_amp
    del bpy.types.Object.b4w_branch_bending_amp
    del bpy.types.Object.b4w_detail_bending_freq
    del bpy.types.Object.b4w_main_bend_stiffness_col
    del bpy.types.Object.b4w_selectable
    del bpy.types.Object.b4w_outlining
    del bpy.types.Object.b4w_outline_on_select
    del bpy.types.Object.b4w_billboard
    del bpy.types.Object.b4w_pres_glob_orientation
    del bpy.types.Object.b4w_billboard_geometry
    del bpy.types.Object.b4w_outline_settings
    del bpy.types.Object.b4w_collision
    del bpy.types.Object.b4w_collision_id
    del bpy.types.Object.b4w_vehicle
    del bpy.types.Object.b4w_vehicle_settings
    del bpy.types.Object.b4w_floating
    del bpy.types.Object.b4w_floating_settings
    del bpy.types.Object.b4w_character
    del bpy.types.Object.b4w_character_settings
    del bpy.types.Object.b4w_anim_clean_keys
    del bpy.types.Object.b4w_bake_only_deform
    del bpy.types.Object.b4w_loc_export_vertex_anim
    del bpy.types.Object.b4w_lod_transition
    del bpy.types.Object.b4w_detail_bend_colors
    del bpy.types.Object.b4w_correct_bounding_offset
    del bpy.types.Object.b4w_refl_plane_index
    del bpy.types.Object.b4w_enable_object_tags
    del bpy.types.Object.b4w_object_tags
    del bpy.types.Object.b4w_enable_anchor
    del bpy.types.Object.b4w_anchor

def remove_scenes_props():
    del bpy.types.Scene.b4w_use_nla
    del bpy.types.Scene.b4w_use_logic_editor
    del bpy.types.Scene.b4w_active_logic_node_tree
    del bpy.types.Scene.b4w_available_logic_trees
    del bpy.types.Scene.b4w_nla_cyclic
    del bpy.types.Scene.b4w_enable_audio
    del bpy.types.Scene.b4w_enable_dynamic_compressor
    del bpy.types.Scene.b4w_dynamic_compressor_settings
    del bpy.types.Scene.b4w_enable_physics
    del bpy.types.Scene.b4w_render_shadows
    del bpy.types.Scene.b4w_shadow_settings
    del bpy.types.Scene.b4w_render_reflections
    del bpy.types.Scene.b4w_reflection_quality
    del bpy.types.Scene.b4w_render_refractions
    del bpy.types.Scene.b4w_render_dynamic_grass
    del bpy.types.Scene.b4w_enable_god_rays
    del bpy.types.Scene.b4w_god_rays_settings
    del bpy.types.Scene.b4w_enable_glow_materials
    del bpy.types.Scene.b4w_glow_settings
    del bpy.types.Scene.b4w_enable_ssao
    del bpy.types.Scene.b4w_ssao_settings
    del bpy.types.Scene.b4w_cluster_size
    del bpy.types.Scene.b4w_anisotropic_filtering
    del bpy.types.Scene.b4w_enable_bloom
    del bpy.types.Scene.b4w_bloom_settings
    del bpy.types.Scene.b4w_enable_motion_blur
    del bpy.types.Scene.b4w_motion_blur_settings
    del bpy.types.Scene.b4w_enable_color_correction
    del bpy.types.Scene.b4w_color_correction_settings
    del bpy.types.Scene.b4w_antialiasing_quality
    del bpy.types.Scene.b4w_enable_tags
    del bpy.types.Scene.b4w_tags
    del bpy.types.Scene.b4w_enable_object_selection
    del bpy.types.Scene.b4w_enable_outlining
    del bpy.types.Scene.b4w_outline_color
    del bpy.types.Scene.b4w_outline_factor
    del bpy.types.Scene.b4w_enable_anchors_visibility
    del bpy.types.Scene.b4w_export_path_json
    del bpy.types.Scene.b4w_export_path_html

def remove_text_props():
    del bpy.types.Text.b4w_assets_load

def remove_particle_settings_props():
    del bpy.types.ParticleSettings.b4w_cyclic
    del bpy.types.ParticleSettings.b4w_allow_nla
    del bpy.types.ParticleSettings.b4w_randomize_emission
    del bpy.types.ParticleSettings.b4w_fade_in
    del bpy.types.ParticleSettings.b4w_fade_out
    del bpy.types.ParticleSettings.b4w_billboard_align
    del bpy.types.ParticleSettings.b4w_coordinate_system
    del bpy.types.ParticleSettings.b4w_dynamic_grass
    del bpy.types.ParticleSettings.b4w_dynamic_grass_scale_threshold
    del bpy.types.ParticleSettings.b4w_randomize_location
    del bpy.types.ParticleSettings.b4w_initial_rand_rotation
    del bpy.types.ParticleSettings.b4w_rand_rotation_strength
    del bpy.types.ParticleSettings.b4w_rotation_type
    del bpy.types.ParticleSettings.b4w_hair_billboard
    del bpy.types.ParticleSettings.b4w_hair_billboard_type
    del bpy.types.ParticleSettings.b4w_hair_billboard_jitter_amp
    del bpy.types.ParticleSettings.b4w_hair_billboard_jitter_freq
    del bpy.types.ParticleSettings.b4w_hair_billboard_geometry
    del bpy.types.ParticleSettings.b4w_wind_bend_inheritance
    del bpy.types.ParticleSettings.b4w_shadow_inheritance
    del bpy.types.ParticleSettings.b4w_reflection_inheritance
    del bpy.types.ParticleSettings.b4w_vcol_from_name
    del bpy.types.ParticleSettings.b4w_vcol_to_name
    del bpy.types.ParticleSettings.b4w_enable_soft_particles
    del bpy.types.ParticleSettings.b4w_particles_softness

def remove_speaker_props():
    del bpy.types.Speaker.b4w_behavior
    del bpy.types.Speaker.b4w_disable_doppler
    del bpy.types.Speaker.b4w_cyclic_play
    del bpy.types.Speaker.b4w_delay
    del bpy.types.Speaker.b4w_delay_random
    del bpy.types.Speaker.b4w_volume_random
    del bpy.types.Speaker.b4w_pitch_random
    del bpy.types.Speaker.b4w_fade_in
    del bpy.types.Speaker.b4w_fade_out
    del bpy.types.Speaker.b4w_loop
    del bpy.types.Speaker.b4w_loop_count
    del bpy.types.Speaker.b4w_loop_count_random
    del bpy.types.Speaker.b4w_playlist_id

def remove_material_props():
    del bpy.types.Material.b4w_water
    del bpy.types.Material.b4w_water_shore_smoothing
    del bpy.types.Material.b4w_water_dynamic
    del bpy.types.Material.b4w_waves_height
    del bpy.types.Material.b4w_waves_length
    del bpy.types.Material.b4w_water_absorb_factor
    del bpy.types.Material.b4w_water_dst_noise_scale0
    del bpy.types.Material.b4w_water_dst_noise_scale1
    del bpy.types.Material.b4w_water_dst_noise_freq0
    del bpy.types.Material.b4w_water_dst_noise_freq1
    del bpy.types.Material.b4w_water_dir_min_shore_fac
    del bpy.types.Material.b4w_water_dir_freq
    del bpy.types.Material.b4w_water_dir_noise_scale
    del bpy.types.Material.b4w_water_dir_noise_freq
    del bpy.types.Material.b4w_water_dir_min_noise_fac
    del bpy.types.Material.b4w_water_dst_min_fac
    del bpy.types.Material.b4w_water_waves_hor_fac
    del bpy.types.Material.b4w_generated_mesh
    del bpy.types.Material.b4w_water_num_cascads
    del bpy.types.Material.b4w_water_subdivs
    del bpy.types.Material.b4w_water_detailed_dist
    del bpy.types.Material.b4w_water_fog_color
    del bpy.types.Material.b4w_water_fog_density
    del bpy.types.Material.b4w_foam_factor
    del bpy.types.Material.b4w_shallow_water_col
    del bpy.types.Material.b4w_shore_water_col
    del bpy.types.Material.b4w_shallow_water_col_fac
    del bpy.types.Material.b4w_shore_water_col_fac
    del bpy.types.Material.b4w_water_sss_strength
    del bpy.types.Material.b4w_water_sss_width
    del bpy.types.Material.b4w_water_norm_uv_velocity
    del bpy.types.Material.b4w_water_enable_caust
    del bpy.types.Material.b4w_water_caust_scale
    del bpy.types.Material.b4w_water_caust_brightness
    del bpy.types.Material.b4w_terrain
    del bpy.types.Material.b4w_dynamic_grass_size
    del bpy.types.Material.b4w_dynamic_grass_color
    del bpy.types.Material.b4w_collision
    del bpy.types.Material.b4w_collision_id
    del bpy.types.Material.b4w_double_sided_lighting
    del bpy.types.Material.b4w_refractive
    del bpy.types.Material.b4w_refr_bump
    del bpy.types.Material.b4w_halo_sky_stars
    del bpy.types.Material.b4w_halo_stars_blend_height
    del bpy.types.Material.b4w_halo_stars_min_height
    del bpy.types.Material.b4w_collision_margin
    del bpy.types.Material.b4w_collision_group
    del bpy.types.Material.b4w_collision_mask
    del bpy.types.Material.b4w_wettable
    del bpy.types.Material.b4w_render_above_all

def remove_texture_props():
    del bpy.types.Texture.b4w_use_map_parallax
    del bpy.types.Texture.b4w_parallax_scale
    del bpy.types.Texture.b4w_parallax_steps
    del bpy.types.Texture.b4w_parallax_lod_dist
    del bpy.types.Texture.b4w_source_type
    del bpy.types.Texture.b4w_source_id
    del bpy.types.Texture.b4w_source_size
    del bpy.types.Texture.b4w_enable_canvas_mipmapping
    del bpy.types.Texture.b4w_extension
    del bpy.types.Texture.b4w_enable_tex_af
    del bpy.types.Texture.b4w_anisotropic_filtering
    del bpy.types.Texture.b4w_use_sky
    del bpy.types.Texture.b4w_water_foam
    del bpy.types.Texture.b4w_foam_uv_freq
    del bpy.types.Texture.b4w_foam_uv_magnitude
    del bpy.types.Texture.b4w_shore_dist_map
    del bpy.types.Texture.b4w_shore_boundings
    del bpy.types.Texture.b4w_max_shore_dist
    del bpy.types.Texture.b4w_disable_compression

def remove_world_props():
    del bpy.types.World.b4w_fog_color
    del bpy.types.World.b4w_use_custom_color
    del bpy.types.World.b4w_sky_settings
    del bpy.types.World.b4w_use_default_animation
    del bpy.types.World.b4w_anim_behavior

def remove_camera_props():
    del bpy.types.Camera.b4w_move_style
    del bpy.types.Camera.b4w_hover_zero_level
    del bpy.types.Camera.b4w_trans_velocity
    del bpy.types.Camera.b4w_rot_velocity
    del bpy.types.Camera.b4w_zoom_velocity
    del bpy.types.Camera.b4w_target
    del bpy.types.Camera.b4w_show_limits_in_viewport
    del bpy.types.Camera.b4w_use_target_distance_limits
    del bpy.types.Camera.b4w_use_zooming
    del bpy.types.Camera.b4w_distance_min
    del bpy.types.Camera.b4w_distance_max
    del bpy.types.Camera.b4w_horizontal_translation_min
    del bpy.types.Camera.b4w_horizontal_translation_max
    del bpy.types.Camera.b4w_vertical_translation_min
    del bpy.types.Camera.b4w_vertical_translation_max
    del bpy.types.Camera.b4w_use_horizontal_clamping
    del bpy.types.Camera.b4w_rotation_left_limit
    del bpy.types.Camera.b4w_rotation_right_limit
    del bpy.types.Camera.b4w_hover_angle_min
    del bpy.types.Camera.b4w_hover_angle_max
    del bpy.types.Camera.b4w_horizontal_clamping_type
    del bpy.types.Camera.b4w_use_vertical_clamping
    del bpy.types.Camera.b4w_enable_hover_hor_rotation
    del bpy.types.Camera.b4w_use_panning
    del bpy.types.Camera.b4w_rotation_down_limit
    del bpy.types.Camera.b4w_rotation_up_limit
    del bpy.types.Camera.b4w_vertical_clamping_type
    del bpy.types.Camera.b4w_dof_front
    del bpy.types.Camera.b4w_dof_rear
    del bpy.types.Camera.b4w_dof_power

def remove_lamp_props():
    del bpy.types.Lamp.b4w_generate_shadows
    del bpy.types.Lamp.b4w_dynamic_intensity
    del bpy.types.Lamp.b4w_override_boundings
    del bpy.types.Lamp.b4w_boundings
    del bpy.types.HemiLamp.use_shadow

def remove_b4w_props():
    remove_mesh_props()
    remove_obj_props()
    remove_scenes_props()
    remove_text_props()
    remove_particle_settings_props()
    remove_speaker_props()
    remove_material_props()
    remove_texture_props()
    remove_world_props()
    remove_camera_props()

def add_scene_properties():

    scene_type = bpy.types.Scene

    scene_type.b4w_use_nla = bpy.props.BoolProperty(
        name = _("B4W: use NLA"),
        description = _("Use NLA to control animation and sounds on the scene"),
        default = False
    )
    scene_type.b4w_use_logic_editor = bpy.props.BoolProperty(
        name = _("B4W: use logic editor"),
        description = _("Use Logic Editor to control animation and sounds on the scene"),
        default = False
    )
    scene_type.b4w_nla_cyclic = bpy.props.BoolProperty(
        name = _("B4W: cyclic NLA"),
        description = _("Repeat NLA animation"),
        default = False
    )
    scene_type.b4w_active_logic_node_tree = bpy.props.StringProperty(
        name = _("B4W: NLA active NodeTree"),
        description = _("NLA active NodeTree"),
    )
    scene_type.b4w_available_logic_trees = bpy.props.CollectionProperty(
        name = _("B4W: NLA available NodeTrees"),
        description = _("NLA available NodeTrees"),
        type = B4W_StringWrap
    )
    scene_type.b4w_enable_audio = bpy.props.BoolProperty(
        name = _("B4W: enable audio"),
        description = _("Enable audio on this scene"),
        default = True
    )
    scene_type.b4w_enable_dynamic_compressor = bpy.props.BoolProperty(
        name = _("B4W: enable dynamic compressor"),
        description = _("Enable dynamic compression effect on this scene"),
        default = False
    )
    scene_type.b4w_dynamic_compressor_settings = bpy.props.PointerProperty(
        name = _("B4W: Dynamic compressor settings"),
        type = B4W_DynamicCompressorSettings
    )

    b4w_enable_physics = bpy.props.BoolProperty(
        name = _("B4W: enable physics"),
        description = _("Enable physics simulation on this scene"),
        default = True
    )
    scene_type.b4w_enable_physics = b4w_enable_physics

    b4w_render_shadows = bpy.props.EnumProperty(
        name = _("B4W: render shadows"),
        description = _("Render shadows for the scene objects with the " +
                "'B4W shadow cast' and 'B4W shadow receive' properties"),
        items = [
            ("OFF", _("OFF"), "OFF", 0),
            ("ON",  _("ON"),  "ON", 1),
            ("AUTO",  _("AUTO"),  "AUTO", 2),
        ],
        default = "AUTO"
    )
    scene_type.b4w_render_shadows = b4w_render_shadows

    scene_type.b4w_shadow_settings = bpy.props.PointerProperty(
        name = _("B4W: shadow settings"),
        type = B4W_ShadowSettings
    )

    b4w_render_reflections = bpy.props.EnumProperty(
        name = _("B4W: render reflections"),
        description = _("Render reflections for the scene objects with the " +
                "'B4W reflection cast' and 'B4W reflection receive' properties"),
        items = [
            ("OFF", "OFF", "OFF", 0),
            ("ON",  "ON",  "ON", 1),
        ],
        default = "ON"
    )
    scene_type.b4w_render_reflections = b4w_render_reflections

    b4w_reflection_quality = bpy.props.EnumProperty(
        name = _("B4W: reflection resolution quality"),
        description = _("Reflection resolution quality"),
        items = [
            ("LOW",      _("LOW"),      _("LOW"), 1),
            ("MEDIUM",   _("MEDIUM"),   _("MEDIUM"), 2),
            ("HIGH",     _("HIGH"),     _("HIGH"), 3)
        ],
        default = "MEDIUM"
    )
    scene_type.b4w_reflection_quality = b4w_reflection_quality

    b4w_render_refractions = bpy.props.EnumProperty(
        name = _("B4W: render refractions"),
        description = _("Render refractions for the scene objects"),
        items = [
            ("OFF", "OFF", "OFF", 0),
            ("ON",  "ON",  "ON", 1),
            ("AUTO",  "AUTO",  "AUTO", 2),
        ],
        default = "AUTO"
    )
    scene_type.b4w_render_refractions = b4w_render_refractions

    b4w_render_dynamic_grass = bpy.props.EnumProperty(
        name = _("B4W: render dynamic grass"),
        description = _("Render dynamic grass for the scene objects"),
        items = [
            ("OFF", "OFF", "OFF", 0),
            ("ON",  "ON",  "ON", 1),
            ("AUTO",  "AUTO",  "AUTO", 2),
        ],
        default = "AUTO"
    )
    scene_type.b4w_render_dynamic_grass = b4w_render_dynamic_grass

    b4w_enable_god_rays = bpy.props.BoolProperty(
        name = _("B4W: enable god rays"),
        description = _("Enable god rays for the scene lights"),
        default = False
    )
    scene_type.b4w_enable_god_rays = b4w_enable_god_rays

    scene_type.b4w_god_rays_settings = bpy.props.PointerProperty(
        name = _("B4W: god rays settings"),
        type = B4W_GodRaysSettings
    )

    b4w_enable_glow_materials = bpy.props.EnumProperty(
        name = _("B4W: enable glow materials"),
        description = _("Enable glow materials"),
        items = [
            ("OFF", "OFF", "OFF", 0),
            ("ON",  "ON",  "ON", 1),
            ("AUTO",  "AUTO",  "AUTO", 2),
        ],
        default = "AUTO"
    )
    scene_type.b4w_enable_glow_materials = b4w_enable_glow_materials

    scene_type.b4w_glow_settings = bpy.props.PointerProperty(
        name = _("B4W: glow settings"),
        type = B4W_GlowSettings
    )

    b4w_enable_ssao = bpy.props.BoolProperty(
        name = _("B4W: enable SSAO"),
        description = _("Enable screen space ambient occlusion"),
        default = False
    )
    scene_type.b4w_enable_ssao = b4w_enable_ssao

    scene_type.b4w_ssao_settings = bpy.props.PointerProperty(
        name = _("B4W: SSAO settings"),
        type = B4W_SSAOSettings
    )

    b4w_enable_cluster_batching = bpy.props.BoolProperty(
        name = _("B4W: enable cluster batching"),
        description = _("Use clustering algorithm for batching"),
        default = False
    )
    scene_type.b4w_enable_cluster_batching = b4w_enable_cluster_batching

    b4w_cluster_size = bpy.props.FloatProperty(
        name = _("B4W: cluster size"),
        description = _("Cluster size in meters. Specifies the maximum edge length of a cluster's bounding box."),
        default = 30.0,
        min = 0.0,
        soft_max = 1000.0,
        precision = 1
    )
    scene_type.b4w_cluster_size = b4w_cluster_size

    # see also b4w_anisotropic_filtering for texture
    b4w_anisotropic_filtering = bpy.props.EnumProperty(
        name = _("B4W: anisotropic filtering"),
        description = _("Anisotropic filtering for all textures. May be overriden by individual textures"),
        items = [
            ("OFF", "OFF", "OFF", 0),
            ("2x",  "2x",  "2x", 1),
            ("4x",  "4x",  "4x", 2),
            ("8x",  "8x",  "8x", 3),
            ("16x", "16x", "16x", 4)
        ]
    )

    scene_type.b4w_anisotropic_filtering = b4w_anisotropic_filtering

    b4w_enable_bloom = bpy.props.BoolProperty(
        name = _("B4W: enable bloom"),
        description = _("Enable bloom"),
        default = False
    )
    scene_type.b4w_enable_bloom = b4w_enable_bloom

    scene_type.b4w_bloom_settings = bpy.props.PointerProperty(
        name = _("B4W: bloom settings"),
        type = B4W_BloomSettings
    )

    b4w_enable_motion_blur = bpy.props.BoolProperty(
        name = _("B4W: enable motion blur"),
        description = _("Enable motion blur"),
        default = False
    )
    scene_type.b4w_enable_motion_blur = b4w_enable_motion_blur

    scene_type.b4w_motion_blur_settings = bpy.props.PointerProperty(
        name = _("B4W: motion blur settings"),
        type = B4W_MotionBlurSettings
    )

    b4w_enable_color_correction = bpy.props.BoolProperty(
        name = _("B4W: enable color correction"),
        description = _("Enable color correction"),
        default = False
    )
    scene_type.b4w_enable_color_correction = b4w_enable_color_correction

    scene_type.b4w_color_correction_settings = bpy.props.PointerProperty(
        name = _("B4W: color correction settings"),
        type = B4W_ColorCorrectionSettings
    )

    b4w_antialiasing_quality = bpy.props.EnumProperty(
        name = _("B4W: antialiasing quality"),
        description = _("antialiasing quality"),
        items = [
            ("NONE",     _("NONE"),     _("NONE"), 1),
            ("LOW",      _("LOW"),      _("LOW"), 2),
            ("MEDIUM",   _("MEDIUM"),   _("MEDIUM"), 3),
            ("HIGH",     _("HIGH"),     _("HIGH"), 4)
        ],
        default = "MEDIUM"
    )
    scene_type.b4w_antialiasing_quality = b4w_antialiasing_quality

    b4w_enable_tags = bpy.props.BoolProperty(
        name = _("B4W: enable tags"),
        description = _("Enable tags"),
        default = False
    )
    scene_type.b4w_enable_tags = b4w_enable_tags

    b4w_tags = bpy.props.PointerProperty(
        name = _("B4W: tags"),
        type = B4W_Tags
    )
    scene_type.b4w_tags = b4w_tags

    b4w_enable_object_selection = bpy.props.EnumProperty(
        name = _("B4W: enable object selection"),
        description = _("Enable object selection"),
        items = [
            ("OFF", "OFF", "OFF", 0),
            ("ON",  "ON",  "ON", 1),
            ("AUTO",  "AUTO",  "AUTO", 2),
        ],
        default = "AUTO"
    )
    scene_type.b4w_enable_object_selection = b4w_enable_object_selection

    b4w_enable_outlining = bpy.props.EnumProperty(
        name = _("B4W: enable outlining"),
        description = _("Enable outlining"),
        items = [
            ("OFF", "OFF", "OFF", 0),
            ("ON",  "ON",  "ON", 1),
            ("AUTO",  "AUTO",  "AUTO", 2),
        ],
        default = "AUTO"
    )
    scene_type.b4w_enable_outlining = b4w_enable_outlining

    b4w_outline_color = bpy.props.FloatVectorProperty(
        name = _("B4W: outline color of the selection"),
        description = _("Default outline color of the selection"),
        default = (1.0, 1.0, 1.0),
        min = 0.0,
        soft_min = 0.0,
        max = 1.0,
        soft_max = 1.0,
        precision = 3,
        subtype = 'COLOR',
        size = 3
    )
    scene_type.b4w_outline_color = b4w_outline_color

    b4w_outline_factor = bpy.props.FloatProperty(
        name = _("B4W: outline factor"),
        description = _("Outline strength factor"),
        default = 1.0,
        min = 0.1,
        max = 1.0,
        step = 1,
        precision = 2
    )
    scene_type.b4w_outline_factor = b4w_outline_factor

    b4w_enable_anchors_visibility = bpy.props.EnumProperty(
        name = _("B4W: enable anchors visibility"),
        description = _("Enable anchors visibility detection"),
        items = [
            ("OFF", "OFF", "OFF", 0),
            ("ON",  "ON",  "ON", 1),
            ("AUTO",  "AUTO",  "AUTO", 2),
        ],
        default = "AUTO"
    )
    scene_type.b4w_enable_anchors_visibility = b4w_enable_anchors_visibility

def add_world_properties():

    world_type = bpy.types.World

    world_type.b4w_use_default_animation = bpy.props.BoolProperty(
        name = _("B4W: use default animation"),
        description = _("The world will be animated if possible"),
        default = False
    )

    world_type.b4w_anim_behavior = bpy.props.EnumProperty(
        name = _("B4W: animation behavior"),
        description = _("The behavior of finished animation: stop, repeat or reset"),
        default = "CYCLIC",
        items = b4w_anim_behavior_items
    )

def add_text_properties():

    text_type = bpy.types.Text

    b4w_assets_load = bpy.props.BoolProperty(
        name=_("B4W: assets load"),
        description = "",
        default = False
    )
    text_type.b4w_assets_load = b4w_assets_load

def add_object_properties():
    """Add properties for the object panel"""

    obj_type = bpy.types.Object

    b4w_do_not_batch = bpy.props.BoolProperty(
        name = _("B4W: do not batch"),
        description = _("Enable dynamics for this object"),
        default = False
    )
    obj_type.b4w_do_not_batch = b4w_do_not_batch

    obj_type.b4w_dynamic_geometry = bpy.props.BoolProperty(
        name = _("B4W: dynamic geometry"),
        description = _("Allow to use geometry update API for given object"),
        default = False
    )

    def shape_keys_update(self, context):
        if self.b4w_shape_keys:
            self.b4w_loc_export_vertex_anim = False
            self.b4w_apply_modifiers = False
            self.b4w_apply_scale = False

    obj_type.b4w_shape_keys = bpy.props.BoolProperty(
        name = _("B4W: export shape keys"),
        description = _("Export shape keys"),
        default = False,
        update = shape_keys_update
    )

    def apply_scale_update(self, context):
        if self.b4w_apply_scale:
            self.b4w_loc_export_vertex_anim = False
            self.b4w_apply_modifiers = False
            self.b4w_shape_keys = False

    obj_type.b4w_apply_scale = bpy.props.BoolProperty(
        name = _("B4W: apply scale"),
        description = _("Apply scale and modifiers before export"),
        default = False,
        update = apply_scale_update
    )

    def apply_modifiers_update(self, context):
        if self.b4w_apply_modifiers:
            self.b4w_loc_export_vertex_anim = False
            self.b4w_shape_keys = False
            self.b4w_apply_scale = False

    obj_type.b4w_apply_modifiers = bpy.props.BoolProperty(
        name = _("B4W: apply modifiers"),
        description = _("Apply object modifiers before export"),
        default = False,
        update = apply_modifiers_update
    )

    b4w_do_not_cull = bpy.props.BoolProperty(
        name = _("B4W: do not cull"),
        description = _("Do not use frustum culling for this object"),
        default = False
    )
    obj_type.b4w_do_not_cull = b4w_do_not_cull

    obj_type.b4w_disable_fogging = bpy.props.BoolProperty(
        name = _("B4W: disable fogging"),
        description = _("Prevent object to be fogged in"),
        default = False
    )

    obj_type.b4w_do_not_render = bpy.props.BoolProperty(
        name = _("B4W: do not render"),
        description = _("Object will not be rendered"),
        default = False
    )

    b4w_shadow_cast = bpy.props.BoolProperty(
        name = _("B4W: shadow cast"),
        description = _("The object will be rendered during the shadow pass"),
        default = False
    )
    obj_type.b4w_shadow_cast = b4w_shadow_cast

    obj_type.b4w_shadow_cast_only = bpy.props.BoolProperty(
        name = _("B4W: shadow cast only"),
        description = _("The object will not be rendered, but will cast a shadow"),
        default = False
    )

    b4w_shadow_receive = bpy.props.BoolProperty(
        name = _("B4W: shadow receive"),
        description = _("The object will receive shadows"),
        default = False
    )
    obj_type.b4w_shadow_receive = b4w_shadow_receive

    b4w_reflexible = bpy.props.BoolProperty(
        name = _("B4W: reflexible"),
        description = _("The object will be rendered during the reflection pass"),
        default = False
    )
    obj_type.b4w_reflexible = b4w_reflexible

    b4w_reflexible_only = bpy.props.BoolProperty(
        name = _("B4W: reflexible only"),
        description = _("The object will not be rendered, but will have a reflection"),
        default = False
    )
    obj_type.b4w_reflexible_only = b4w_reflexible_only

    b4w_reflective = bpy.props.BoolProperty(
        name = _("B4W: reflective"),
        description = _("The object will receive reflections"),
        default = False,
        update = lambda self,context: add_remove_refl_plane(self)
    )
    obj_type.b4w_reflective = b4w_reflective

    obj_type.b4w_reflection_type = bpy.props.EnumProperty(
        name = _("B4W: reflection type"),
        description = _("Type of generated reflections"),
        default = "PLANE",
        items = [
            ("CUBE", _("Cube"), _("Object will reflect other objects in all directions")),
            ("PLANE", _("Plane"), _("Object will reflect other objects in the dericteion specified by reflection plane"))
        ],
        update = lambda self,context: add_remove_refl_plane(self)
    )

    b4w_caustics = bpy.props.BoolProperty(
        name = _("B4W: caustics"),
        description = _("The object will receive caustics from water"),
        default = False
    )
    obj_type.b4w_caustics = b4w_caustics

    obj_type.b4w_use_default_animation = bpy.props.BoolProperty(
        name = _("B4W: use default animation"),
        description = _("The object will be animated if possible"),
        default = False
    )
    obj_type.b4w_anim_behavior = bpy.props.EnumProperty(
        name = _("B4W: animation behavior"),
        description = _("The behavior of finished animation: stop, repeat or reset"),
        default = "CYCLIC",
        items = b4w_anim_behavior_items
    )
    obj_type.b4w_animation_mixing = bpy.props.BoolProperty(
        name = _("B4W: animation mixing"),
        description = _("Allow skeletal animations to be mixed with each other"),
        default = False
    )

    obj_type.b4w_proxy_inherit_anim = bpy.props.BoolProperty(
        name = _("B4W: inherit animation"),
        description = _("Inherit animation from proxy object to proxy source"),
        default = True
    )

    b4w_wind_bending = bpy.props.BoolProperty(
        name = _("B4W: wind bending"),
        description = _("Object will be bent by wind"),
        default = False
    )
    obj_type.b4w_wind_bending = b4w_wind_bending

    b4w_wind_bending_angle = bpy.props.FloatProperty(
        name = _("B4W: wind bending max angle"),
        description = _("Maximum angle amplitude of wind bending"),
        default = 10.0,
        min = 0.0,
        soft_max = 90,
        precision = 1
    )
    obj_type.b4w_wind_bending_angle = b4w_wind_bending_angle

    b4w_wind_bending_freq = bpy.props.FloatProperty(
        name = _("B4W: wind bending frequency"),
        description = _("Wind bending frequency in Hz"),
        default = 0.25,
        min = 0.0,
        soft_max = 5.0,
        precision = 2
    )
    obj_type.b4w_wind_bending_freq = b4w_wind_bending_freq
    b4w_detail_bending_amp = bpy.props.FloatProperty(
        name = _("B4W: detail bending amplitude"),
        description = _("Detail bending amplitude"),
        default = 0.1,
        min = 0.0,
        soft_max = 1.0,
        precision = 4
    )
    obj_type.b4w_detail_bending_amp = b4w_detail_bending_amp

    b4w_branch_bending_amp = bpy.props.FloatProperty(
        name = _("B4W: branch bending amplitude"),
        description = _("Branch bending amplitude"),
        default = 0.3,
        min = 0.0,
        soft_max = 1.0,
        precision = 4
    )
    obj_type.b4w_branch_bending_amp = b4w_branch_bending_amp

    b4w_detail_bending_freq = bpy.props.FloatProperty(
        name = _("B4W: detail bending frequency"),
        description = _("Wind bending detail frequency coefficient"),
        default = 1.0,
        min = 0.0,
        soft_max = 5.0,
        precision = 3
    )
    obj_type.b4w_detail_bending_freq = b4w_detail_bending_freq

    b4w_main_bend_stiffness_col = bpy.props.StringProperty(
        name = _("B4W: Main stiffness vertex color"),
        description = _("Vertex color for main bending stiffness (A channel)"),
        default = ""
    )
    obj_type.b4w_main_bend_stiffness_col = b4w_main_bend_stiffness_col

    b4w_selectable = bpy.props.BoolProperty(
        name = _("B4W: selectable"),
        description = _("Object can be selected"),
        default = False
    )
    obj_type.b4w_selectable = b4w_selectable

    b4w_outlining = bpy.props.BoolProperty(
        name = _("B4W: outlining"),
        description = _("Object can be outlined"),
        default = False
    )
    obj_type.b4w_outlining = b4w_outlining

    b4w_outline_on_select = bpy.props.BoolProperty(
        name = _("B4W: outline on select"),
        description = _("Automatic outlining on select"),
        default = False
    )
    obj_type.b4w_outline_on_select = b4w_outline_on_select

    b4w_billboard = bpy.props.BoolProperty(
        name = _("B4W: billboard"),
        description = _("Object billboarding"),
        default = False
    )
    obj_type.b4w_billboard = b4w_billboard

    b4w_pres_glob_orientation = bpy.props.BoolProperty(
        name = _("B4W: preserve global orientation and scale"),
        description = _("Preserve global orientation and scale for billboard object"),
        default = False
    )
    obj_type.b4w_pres_glob_orientation = b4w_pres_glob_orientation

    b4w_billboard_geometry = bpy.props.EnumProperty(
        name = _("B4W: billboard geometry"),
        description = _("Object billboarding geometry"),
        default = "SPHERICAL",
        items = [
            ("SPHERICAL", _("Spherical"), _("Spherical billboarding")),
            ("CYLINDRICAL", _("Cylindrical"), _("Cylindrical billboarding")),
        ]
    )
    obj_type.b4w_billboard_geometry = b4w_billboard_geometry

    obj_type.b4w_outline_settings = bpy.props.PointerProperty(
        name = _("B4W: outline settings"),
        type = B4W_OutlineSettings
    )

    obj_type.b4w_collision = bpy.props.BoolProperty(
        name = _("B4W: detect collisions"),
        description = _("Object will be tested for collisions"),
        default = False
    )
    obj_type.b4w_collision_id = bpy.props.StringProperty(
        name = _("B4W: collision ID"),
        description = _("Collision ID for internal application purposes"),
        default = ""
    )

    obj_type.b4w_vehicle = bpy.props.BoolProperty(
        name = _("B4W: enable vehicle"),
        description = _("Object will be part of the vehicle"),
        default = False
    )

    obj_type.b4w_vehicle_settings = bpy.props.PointerProperty(
        name = _("B4W: vehicle settings"),
        type = B4W_VehicleSettings
    )

    obj_type.b4w_floating = bpy.props.BoolProperty(
        name = _("B4W: enable floating"),
        description = _("Object will react to water surface"),
        default = False
    )

    obj_type.b4w_floating_settings = bpy.props.PointerProperty(
        name = _("B4W: floating settings"),
        type = B4W_FloatingSettings
    )

    obj_type.b4w_character = bpy.props.BoolProperty(
        name = _("B4W: enable character"),
        description = _("Object will be controlled by the player"),
        default = False
    )

    obj_type.b4w_character_settings = bpy.props.PointerProperty(
        name = _("B4W: character settings"),
        type = B4W_CharacterSettings
    )

    # not exported
    obj_type.b4w_enable_viewport_alignment = bpy.props.BoolProperty(
        name = _("B4W: enable viewport alignment"),
        description = _("Enable viewport alignment"),
        default = False
    )
    obj_type.b4w_viewport_alignment = bpy.props.PointerProperty(
            type=B4W_ViewportAlignment,
            name=_("B4W: Viewport Alignment"))

    # not exported
    obj_type.b4w_anim_clean_keys = bpy.props.BoolProperty(
        name = _("B4W: animation clean keys"),
        description = _("Perform clean keyframes optimization after animation baking"),
        default = True
    )

    # not exported
    obj_type.b4w_bake_only_deform = bpy.props.BoolProperty(
        name = _("B4W: bake only deform bones"),
        description = _("Bake only deform bones or bones with deform children"),
        default = True
    )

    # not exported
    def loc_export_vertex_anim_update(self, context):
        if self.b4w_loc_export_vertex_anim:
            self.b4w_shape_keys = False
            self.b4w_apply_modifiers = False
            self.b4w_apply_scale = False

    obj_type.b4w_loc_export_vertex_anim = bpy.props.BoolProperty(
        name = _("B4W: export vertex animation"),
        description = _("Export baked vertex animation"),
        default = False,
        update = loc_export_vertex_anim_update
    )

    obj_type.b4w_lod_transition = bpy.props.FloatProperty(
        name = _("B4W: LOD transition ratio"),
        description = _("LOD transition ratio"),
        default = 0.01,
        min = 0.00,
        max = 100,
        soft_min = 0,
        soft_max = 1,
        step = 1,
        precision = 3
    )

    obj_type.b4w_detail_bend_colors = bpy.props.PointerProperty(
            type=B4W_DetailBendingColors,
            name=_("B4W: Detail Bend"))

    obj_type.b4w_correct_bounding_offset = bpy.props.EnumProperty(
        name = _("B4W: correct the bounding box"),
        description = _("Correct the bounding box"),
        default = "AUTO",
        items = [
            ("AUTO", "AUTO", _("Auto selection bounding offset")),
            ("OFF",  "OFF",  _("Disable bounding offset correction")),
            ("ON",   "ON",   _("Enable bounding offset correction"))
        ]
    )

    # deprecated
    obj_type.b4w_refl_plane_index = bpy.props.IntProperty(
            name=_("B4W: Reflection Plane index"),
            description=_("Reflection plane index used in the interface"),
            default=0, min=0, max=100, soft_min=0, soft_max=5
    )

    obj_type.b4w_enable_object_tags = bpy.props.BoolProperty(
        name = _("B4W: enable object tags"),
        description = _("Enable object tags"),
        default = False
    )

    obj_type.b4w_object_tags = bpy.props.PointerProperty(
        name = _("B4W: object_tags"),
        type = B4W_Object_Tags
    )

    obj_type.b4w_enable_anchor = bpy.props.BoolProperty(
        name = _("B4W: enable anchor"),
        description = _("Make an object anchor one"),
        default = False
    )
    obj_type.b4w_anchor = bpy.props.PointerProperty(
        name = _("B4W: anchor settings"),
        type = B4W_AnchorSettings
    )
    obj_type.b4w_line_renderer = bpy.props.BoolProperty(
        name = _("B4W: line renderer"),
        description = _("Use object for line rendering"),
        default = False
    )

def add_speaker_properties():
    """Add properties for the speaker panel"""

    spk_type = bpy.types.Speaker

    spk_type.b4w_behavior = bpy.props.EnumProperty(
        name = _("B4W: speaker behavior"),
        description = _("Speaker behavior"),
        default = "POSITIONAL",
        items = [
            ("POSITIONAL", _("Positional Sound"), _("Positional sound source")),
            ("BACKGROUND_SOUND", _("Background Sound"), _("Background sound source")),
            ("BACKGROUND_MUSIC", _("Background Music"), _("Background music source"))
        ]
    )
    spk_type.b4w_disable_doppler = bpy.props.BoolProperty(
        name = _("B4W: disable doppler"),
        description = _("Disable the Doppler effect"),
        default = False
    )

    spk_type.b4w_cyclic_play = bpy.props.BoolProperty(
        name = _("B4W: cyclic play"),
        description = _("Repeat speaker's playback"),
        default = False
    )
    spk_type.b4w_delay = bpy.props.FloatProperty(
        name = _("B4W: delay"),
        description = _("Delay after playback start"),
        default = 0.0,
        min = 0.0,
        soft_max = 120,
        precision = 3
    )
    spk_type.b4w_delay_random = bpy.props.FloatProperty(
        name = _("B4W: random delay"),
        description = _("Randomized delay increment"),
        default = 0.0,
        min = 0.0,
        soft_max = 120,
        precision = 3
    )

    spk_type.b4w_volume_random = bpy.props.FloatProperty(
        name = _("B4W: random volume"),
        description = _("Randomized volume decrement"),
        default = 0.0,
        min = 0.0,
        max = 1.0,
        step = 0.1,
        precision = 3
    )

    spk_type.b4w_pitch_random = bpy.props.FloatProperty(
        name = _("B4W: random volume"),
        description = _("Randomized pitch increment"),
        default = 0.0,
        min = 0.0,
        soft_max = 120,
        step = 0.1,
        precision = 3
    )

    spk_type.b4w_fade_in = bpy.props.FloatProperty(
        name = _("B4W: fade-in interval"),
        description = _("Fade-in interval"),
        default = 0.0,
        min = 0.0,
        soft_max = 120,
        step = 0.1,
        precision = 3
    )
    spk_type.b4w_fade_out = bpy.props.FloatProperty(
        name = _("B4W: fade-out interval"),
        description = _("Fade-out interval"),
        default = 0.0,
        min = 0.0,
        soft_max = 120,
        step = 0.1,
        precision = 3
    )

    spk_type.b4w_loop = bpy.props.BoolProperty(
        name = _("B4W: loop"),
        description = _("Make loop (repeated playback inside current play cycle)"),
        default = False
    )
    spk_type.b4w_loop_count = bpy.props.IntProperty(
        name = _("B4W: loop count"),
        description = _("Max count of loop repeats, 0 for infinite looping"),
        default = 0,
        min = 0,
        max = 1000
    )
    spk_type.b4w_loop_count_random = bpy.props.IntProperty(
        name = _("B4W: random loop count"),
        description = _("Randomized loop count increment"),
        default = 0,
        min = 0,
        max = 1000
    )

    spk_type.b4w_playlist_id = bpy.props.StringProperty(
        name = _("B4W: playlist ID"),
        description = _("Playlist ID"),
        default = ""
    )

def add_material_properties():
    """Add properties for the material panel"""

    mat_type = bpy.types.Material

    mat_type.b4w_water = bpy.props.BoolProperty(
        name = _("B4W: water"),
        description = _("Special water material"),
        default = False
    )
    mat_type.b4w_water_shore_smoothing = bpy.props.BoolProperty(
        name = _("B4W: shore smoothing"),
        description = _("Perform the smoothing between the water and the shore objects"),
        default = True
    )
    mat_type.b4w_water_dynamic = bpy.props.BoolProperty(
        name = _("B4W: water dynamic"),
        description = _("Dynamic water surface"),
        default = False
    )
    mat_type.b4w_waves_height = bpy.props.FloatProperty(
        name = _("B4W: waves height"),
        description = _("Waves height"),
        default = 1.0,
        min = 0.0,
        soft_min = 0.0,
        max = 10.0,
        soft_max = 5.0,
        step = 0.1,
        precision = 3
    )
    mat_type.b4w_waves_length = bpy.props.FloatProperty(
        name = _("B4W: waves length"),
        description = _("Waves length"),
        default = 10.0,
        min = 0.01,
        soft_min = 0.01,
        max = 200.0,
        soft_max = 100.0,
        step = 0.1,
        precision = 3
    )
    mat_type.b4w_water_dst_noise_scale0 = bpy.props.FloatProperty(
        name = _("B4W: distant noise scale"),
        description = _("Distant waves noise scale (first component)"),
        default = 0.05,
        min = 0.0,
        soft_min = 0.0,
        max = 1.0,
        soft_max = 1.0,
        step = 0.1,
        precision = 3
    )
    mat_type.b4w_water_dst_noise_scale1 = bpy.props.FloatProperty(
        name = _("B4W: distant noise scale factor"),
        description = _("Distant waves noise scale (second component)"),
        default = 0.03,
        min = 0.0,
        soft_min = 0.0,
        max = 1.0,
        soft_max = 1.0,
        step = 0.1,
        precision = 3
    )
    mat_type.b4w_water_dst_noise_freq0 = bpy.props.FloatProperty(
        name = _("B4W: distant noise frequency"),
        description = _("Distant waves noise frequency (first component)"),
        default = 1.3,
        min = 0.0,
        soft_min = 0.0,
        max = 10.0,
        soft_max = 10.0,
        step = 0.1,
        precision = 3
    )
    mat_type.b4w_water_dst_noise_freq1 = bpy.props.FloatProperty(
        name = _("B4W: distant noise frequency"),
        description = _("Distant waves noise frequency (second component)"),
        default = 1.0,
        min = 0.0,
        soft_min = 0.0,
        max = 10.0,
        soft_max = 10.0,
        step = 0.1,
        precision = 3
    )
    mat_type.b4w_water_dir_min_shore_fac = bpy.props.FloatProperty(
        name = _("B4W: directional min shore factor"),
        description = _("Minimum shore factor for directional waves"),
        default = 0.4,
        min = 0.0,
        soft_min = 0.0,
        max = 1.0,
        soft_max = 1.0,
        step = 0.1,
        precision = 3
    )
    mat_type.b4w_water_dir_freq = bpy.props.FloatProperty(
        name = _("B4W: directional waves frequency"),
        description = _("Directional waves frequency"),
        default = 0.5,
        min = 0.0,
        soft_min = 0.0,
        max = 10.0,
        soft_max = 10.0,
        step = 0.1,
        precision = 3
    )
    mat_type.b4w_water_dir_noise_scale = bpy.props.FloatProperty(
        name = _("B4W: directional noise scale"),
        description = _("Directional waves noise scale"),
        default = 0.05,
        min = 0.0,
        soft_min = 0.0,
        max = 1.0,
        soft_max = 5.0,
        step = 0.1,
        precision = 3
    )
    mat_type.b4w_water_dir_noise_freq = bpy.props.FloatProperty(
        name = _("B4W: directional noise frequency"),
        description = _("Directional waves noise frequency"),
        default = 0.07,
        min = 0.0,
        soft_min = 0.0,
        max = 1.0,
        soft_max = 1.0,
        step = 0.1,
        precision = 3
    )
    mat_type.b4w_water_dir_min_noise_fac = bpy.props.FloatProperty(
        name = _("B4W: directional minimum noise factor"),
        description = _("Directional waves minimum noise factor"),
        default = 0.5,
        min = 0.0,
        soft_min = 0.0,
        max = 1.0,
        soft_max = 1.0,
        step = 0.1,
        precision = 3
    )
    mat_type.b4w_water_dst_min_fac = bpy.props.FloatProperty(
        name = _("B4W: distant waves min factor"),
        description = _("Distant waves min factor"),
        default = 0.2,
        min = 0.0,
        soft_min = 0.0,
        max = 1.0,
        soft_max = 1.0,
        step = 0.1,
        precision = 3
    )
    mat_type.b4w_water_waves_hor_fac = bpy.props.FloatProperty(
        name = _("B4W: waves horizontal factor"),
        description = _("Strength of horizontal waves inclination"),
        default = 5.0,
        min = 0.0,
        soft_min = 0.0,
        max = 10.0,
        soft_max = 10.0,
        step = 0.1,
        precision = 3
    )
    mat_type.b4w_water_absorb_factor = bpy.props.FloatProperty(
        name = _("B4W: water absorb factor"),
        description = _("Water absorb factor"),
        default = 6.0,
        min = 0.0,
        soft_min = 0.0,
        max = 100.0,
        soft_max = 100.0,
        step = 0.1,
        precision = 3
    )
    mat_type.b4w_generated_mesh = bpy.props.BoolProperty(
        name = _("B4W: water generated mesh"),
        description = _("Generate a multigrid mesh for the water"),
        default = False
    )
    mat_type.b4w_water_num_cascads = bpy.props.IntProperty(
        name = _("B4W: water num cascades"),
        description = _("Number of cascades in the water mesh"),
        default = 5,
        min = 1,
        soft_min = 1,
        max = 20,
        soft_max = 20,
    )
    mat_type.b4w_water_subdivs = bpy.props.IntProperty(
        name = _("B4W: water subdivs"),
        description = _("Number of subdivisions in the water mesh cascade (must be POT)"),
        default = 64,
        min = 2,
        soft_min = 1,
        max = 512,
        soft_max = 512,
    )
    mat_type.b4w_water_detailed_dist = bpy.props.IntProperty(
        name = _("B4W: water detailed distance"),
        description = _("Distance of the biggest cascade in the water mesh"),
        default = 1000,
        min = 1,
        soft_min = 1,
        max = 10000,
        soft_max = 5000,
    )
    mat_type.b4w_water_fog_color = bpy.props.FloatVectorProperty(
        name = _("B4W: water fog color"),
        description = _("Color of fog applied to the underwater objects"),
        default = (0.4, 0.6, 0.7),
        min = 0.0,
        soft_min = 0.0,
        max = 1.0,
        soft_max = 1.0,
        precision = 3,
        subtype = 'COLOR',
        size = 3
    )
    mat_type.b4w_water_fog_density = bpy.props.FloatProperty(
        name = _("B4W: water fog density"),
        description = _("Density of fog applied to the underwater objects"),
        default = 0.06,
        min = 0.0,
        soft_min = 0.0,
        max = 1.0,
        soft_max = 1.0,
        step = 0.1,
        precision = 4
    )
    mat_type.b4w_foam_factor = bpy.props.FloatProperty(
        name = _("B4W: foam factor"),
        description = _("Water foam intensity factor"),
        default = 0.5,
        min = 0.0,
        soft_min = 0.0,
        max = 1.0,
        soft_max = 1.0,
        step = 0.01,
        precision = 3
    )
    mat_type.b4w_shallow_water_col = bpy.props.FloatVectorProperty(
        name = _("B4W: shallow water color"),
        description = _("Color of the shallow water"),
        default = (0.0, 0.8, 0.3),
        min = 0,
        soft_min = 0,
        max = 1,
        soft_max = 1,
        subtype = 'COLOR',
    )
    mat_type.b4w_shore_water_col = bpy.props.FloatVectorProperty(
        name = _("B4W: shore water color"),
        description = _("Color of the shallow water"),
        default = (0.0, 0.9, 0.2),
        min = 0,
        soft_min = 0,
        max = 1,
        soft_max = 1,
        subtype = 'COLOR',
    )
    mat_type.b4w_shallow_water_col_fac = bpy.props.FloatProperty(
        name = _("B4W: shallow water col factor"),
        description = _("Shallow water color factor"),
        default = 1.0,
        min = 0.0,
        max = 2.0,
        step = 0.01,
        precision = 2,
    )
    mat_type.b4w_shore_water_col_fac = bpy.props.FloatProperty(
        name = _("B4W: shore water col factor"),
        description = _("Shore water color factor"),
        default = 0.5,
        min = 0.0,
        max = 2.0,
        step = 0.01,
        precision = 2,
    )
    mat_type.b4w_water_sss_strength = bpy.props.FloatProperty(
        name = _("B4W: water sss strength"),
        description = _("Strength of subsurface scattering"),
        default = 1.0,
        min = 0.0,
        max = 10.0,
        step = 0.1,
        precision = 2,
    )
    mat_type.b4w_water_sss_width = bpy.props.FloatProperty(
        name = _("B4W: water sss strength"),
        description = _("Width of subsurface scattering"),
        default = 0.45,
        min = 0.0,
        max = 1.0,
        step = 0.01,
        precision = 2,
    )
    mat_type.b4w_water_norm_uv_velocity = bpy.props.FloatProperty(
        name = _("B4W: water norm uv velocity"),
        description = _("Water normalmap UV velocity"),
        default = 0.05,
        min = 0.0,
        max = 1.0,
        step = 0.005,
        precision = 3,
    )
    mat_type.b4w_water_enable_caust = bpy.props.BoolProperty(
        name = _("B4W: water caustics"),
        description = _("Enable caustics on underwater objects"),
        default = False,
    )
    mat_type.b4w_water_caust_scale = bpy.props.FloatProperty(
        name = _("B4W: water caustics scale"),
        description = _("Scale of the caustics effect"),
        default = 0.25,
        min = 0.0,
        max = 10.0,
    )
    mat_type.b4w_water_caust_brightness = bpy.props.FloatProperty(
        name = _("B4W: water caustics brightness"),
        description = _("Brightness of the caustics effect"),
        default = 0.5,
        min = 0.0,
        max = 3.0,
    )

    mat_type.b4w_terrain = bpy.props.BoolProperty(
        name = _("B4W: Terrain dynamic grass"),
        description = _("Special material for terrain dynamic grass"),
        default = False
    )
    mat_type.b4w_dynamic_grass_size = bpy.props.StringProperty(
        name = _("B4W: Dynamic grass size"),
        description = _("Optional vertex color used for grass sizing (R)"),
        default = ""
    )
    mat_type.b4w_dynamic_grass_color = bpy.props.StringProperty(
        name = _("B4W: Dynamic grass color"),
        description = _("Optional vertex color used for grass tinting"),
        default = ""
    )

    mat_type.b4w_collision = bpy.props.BoolProperty(
        name = _("B4W: collision"),
        description = _("Special collision material"),
        default = False
    )
    mat_type.b4w_do_not_render = bpy.props.BoolProperty(
        name = _("B4W: do not render"),
        description = _("Do not render material"),
        default = False
    )
    mat_type.b4w_use_ghost = bpy.props.BoolProperty(
        name = _("B4W: Ghost"),
        description = _("Material does not react to collisions like a ghost"),
        default = False
    )
    mat_type.b4w_collision_id = bpy.props.StringProperty(
        name = _("B4W: collision ID"),
        description = _("Collision ID for internal application purposes"),
        default = ""
    )

    mat_type.b4w_double_sided_lighting = bpy.props.BoolProperty(
        name = _("B4W: double-sided lighting"),
        description = _("Enable double-sided lighting for the material by flipping the normals"),
        default = False
    )

    mat_type.b4w_refractive = bpy.props.BoolProperty(
        name = _("B4W: refraction"),
        description = _("Enable refraction for the material by using normal"),
        default = False
    )
    mat_type.b4w_refr_bump = bpy.props.FloatProperty(
        name = _("B4W: refraction bump"),
        description = _("Perturbation power of refraction"),
        default = 0.001,
        min = 0.0,
        max = 0.1
    )

    mat_type.b4w_halo_sky_stars = bpy.props.BoolProperty(
        name = _("B4W: halo sky stars"),
        description = _("Make halo material stars object"),
        default = False
    )

    mat_type.b4w_halo_stars_blend_height = bpy.props.FloatProperty(
        name = _("B4W: halo stars blending height"),
        description = _("Stars blending height"),
        default = 10.0
    )

    mat_type.b4w_halo_stars_min_height = bpy.props.FloatProperty(
        name = _("B4W: halo stars minimum height"),
        description = _("Stars minimum height starting from the origin"),
        default = 0.0
    )

    mat_type.b4w_collision_margin = bpy.props.FloatProperty(
        name = _("B4W: margin"),
        description = _("Extra margin around material for collision detection, " +
                "extra amount required for stability"),
        default = 0.040
    )

    mat_type.b4w_collision_group = bpy.props.BoolVectorProperty(
        name = _("B4W: collision group"),
        subtype = "LAYER",
        description = _("Material collision group"),
        default = (False, False, False, False, False, False, False, True, False, False, False, False, False, False, False, False),
        size = 16
    )

    mat_type.b4w_collision_mask = bpy.props.BoolVectorProperty(
        name = _("B4W: collision mask"),
        subtype = "LAYER",
        description = _("Material collision mask"),
        default = (True, True, True, True, True, True, True, False, True, True, True, True, True, True, True, True),
        size = 16
    )

    mat_type.b4w_wettable = bpy.props.BoolProperty(
        name = _("B4W: wettable"),
        description = _("Material will get wet near water"),
        default = False,
    )

    mat_type.b4w_render_above_all = bpy.props.BoolProperty(
        name = _("B4W: render above all"),
        description = _("Material will be render above all others"),
        default = False,
    )


def add_texture_properties():
    """Add properties for texture panel"""

    b4w_use_map_parallax = bpy.props.BoolProperty(
        name = _("B4W: use map parallax"),
        description = _("The texture's alpha channel will be used as the heightmap for warping"),
        default = False
    )
    bpy.types.Texture.b4w_use_map_parallax = b4w_use_map_parallax

    b4w_parallax_scale = bpy.props.FloatProperty(
        name = _("B4W: parallax scale"),
        description = _("Scale parameter for texture warping. Height (e.g. 3 cm) is devided by the texture covering size (e.g. 1.5 m)"),
        default = 0.02,
        min = 0.0,
        soft_max = 0.1,
        precision = 3
    )
    bpy.types.Texture.b4w_parallax_scale = b4w_parallax_scale;

    b4w_parallax_steps = bpy.props.IntProperty(
        name = _("B4W: parallax steps"),
        description = _("Number of steps taken to build a parallax surface (the more the better)"),
        default = 5,
        soft_max = 30,
        min = 1,
        max = 30
    )
    bpy.types.Texture.b4w_parallax_steps = b4w_parallax_steps;

    b4w_parallax_lod_dist = bpy.props.IntProperty(
        name = _("B4W: parallax lod distance"),
        description = _("Level of detail distance for parallax mapping"),
        default = 5,
        soft_max = 30,
        min = 1,
        max = 30
    )
    bpy.types.Texture.b4w_parallax_lod_dist = b4w_parallax_lod_dist;

    b4w_source_type = bpy.props.EnumProperty(
        name = _("B4W: source type"),
        description = _("Source type"),
        default = "NONE",
        items = [
            ("NONE", _("None"), _("None")),
            ("SCENE", _("Scene"), _("Scene")),
            ("CANVAS", _("Canvas"), _("Canvas"))
        ]
    )
    bpy.types.Texture.b4w_source_type = b4w_source_type;

    b4w_source_id = bpy.props.StringProperty(
        name = _("B4W: scene"),
        description = _("Source ID"),
        default = ""
    )
    bpy.types.Texture.b4w_source_id = b4w_source_id

    b4w_source_size = bpy.props.EnumProperty(
        name = _("B4W: source size"),
        description = _("Source size"),
        items = [
            ("128",      "128",        "128", 128),
            ("256",      "256",        "256", 256),
            ("512",      "512",        "512", 512),
            ("1024",      "1024",      "1024", 1024),
            ("2048",      "2048",      "2048", 2048),
            ("4096",      "4096",      "4096", 4096),
            ("8192",      "8192",      "8192", 8192)
        ]
    )
    bpy.types.Texture.b4w_source_size = b4w_source_size

    b4w_enable_canvas_mipmapping = bpy.props.BoolProperty(
        name = _("B4W: Enable mipmapping"),
        description = _("Use mipmapping for canvas texture"),
        default = True
    )
    bpy.types.Texture.b4w_enable_canvas_mipmapping = b4w_enable_canvas_mipmapping

    b4w_extension = bpy.props.EnumProperty(
        name = _("B4W: extension"),
        description = _("How the image is extrapolated past its original bounds"),
        default = "REPEAT",
        items = [
            ("CLIP",     _("Clip"),      _("Clip")),
            ("REPEAT",   _("Repeat"),    _("Repeat"))
        ]
    )
    bpy.types.Texture.b4w_extension = b4w_extension

    b4w_enable_tex_af = bpy.props.BoolProperty(
        name = _("B4W: enable texture anisotropic filtering"),
        description = _("Enable anisotropic filtering"),
        default = True
    )
    bpy.types.Texture.b4w_enable_tex_af = b4w_enable_tex_af

    # see also b4w_anisotropic_filtering for scene
    b4w_anisotropic_filtering = bpy.props.EnumProperty(
        name = _("B4W: anisotropic filtering"),
        description = _("Anisotropic filtering for the texture"),
        items = [
            ("DEFAULT", _("DEFAULT"), "0", 0),
            ("2x",      "2x",      "2", 2),
            ("4x",      "4x",      "3", 3),
            ("8x",      "8x",      "4", 4),
            ("16x",     "16x",     "5", 5)
        ]
    )
    bpy.types.Texture.b4w_anisotropic_filtering = b4w_anisotropic_filtering

    b4w_use_sky = bpy.props.EnumProperty(
        name = _("B4W: environment lighting"),
        description = _("Use texture as skydome or environment lighting"),
        default = "SKYDOME",
        items = [
            ("OFF",                  _("OFF"),                 "OFF", 0),
            ("SKYDOME",              _("SKYDOME"),             "SKYDOME", 1),
            ("ENVIRONMENT_LIGHTING", _("ENVIRONMENT_LIGHTING"),"ENVIRONMENT_LIGHTING", 2),
            ("BOTH",                 _("BOTH"),                "BOTH", 3)
        ]
    )
    bpy.types.Texture.b4w_use_sky = b4w_use_sky

    b4w_water_foam = bpy.props.BoolProperty(
        name = _("B4W: Water foam"),
        description = _("Use texture as foam on the water surface"),
        default = False
    )
    bpy.types.Texture.b4w_water_foam = b4w_water_foam

    b4w_foam_uv_freq = bpy.props.FloatVectorProperty(
        name = _("B4W: Foam UV frequency"),
        description = _("Foam UV translation frequency"),
        default = (1.0, 1.0),
        min = -99.0,
        max = 99.0,
        precision = 3,
        size = 2
    )
    bpy.types.Texture.b4w_foam_uv_freq = b4w_foam_uv_freq

    b4w_foam_uv_magnitude = bpy.props.FloatVectorProperty(
        name = _("B4W: Foam UV magnitude"),
        description = _("Foam UV translation frequency"),
        default = (1.0, 1.0),
        min = -99.0,
        max = 99.0,
        precision = 3,
        size = 2
    )
    bpy.types.Texture.b4w_foam_uv_magnitude = b4w_foam_uv_magnitude

    b4w_shore_dist_map = bpy.props.BoolProperty(
        name = _("B4W: Shore distance map"),
        description = _("Use the texture as a shore distance map on the water surface"),
        default = False
    )
    bpy.types.Texture.b4w_shore_dist_map = b4w_shore_dist_map

    b4w_shore_boundings = bpy.props.FloatVectorProperty(
        name = _("B4W: shore boundings"),
        description = _("Boundings of the water-to-shore distance map"),
        default = (0.0, 0.0, 0.0, 0.0),
        min = -100000.0,
        soft_min = -100000.0,
        max = 100000.0,
        soft_max = 100000.0,
        precision = 2,
        size = 4
    )
    bpy.types.Texture.b4w_shore_boundings = b4w_shore_boundings

    b4w_max_shore_dist = bpy.props.FloatProperty(
        name = _("B4W: maximum shore distance"),
        description = _("Maximum distance to shore in meters (taken as 1.0)"),
        default = 100.0,
        min = 0.0,
        max = 100000.0,
        step = 5.0,
        precision = 1,
    )
    bpy.types.Texture.b4w_max_shore_dist = b4w_max_shore_dist

    b4w_disable_compression = bpy.props.BoolProperty(
        name = _("B4W: disable compression"),
        description = _("Do not use DDS file for this texture"),
        default = False
    )
    bpy.types.Texture.b4w_disable_compression = b4w_disable_compression

    b4w_nla_video = bpy.props.BoolProperty(
        name = "B4W: Allow NLA",
        description = "Control this video texture through the NLA if the NLA is enabled",
        default = True
    )
    bpy.types.Texture.b4w_nla_video = b4w_nla_video

def add_particle_settings_properties():
    """Add properties for particles panel"""

    pset_type = bpy.types.ParticleSettings

    # "EMITTER"

    pset_type.b4w_cyclic = bpy.props.BoolProperty(
        name = _("B4W: cyclic emission"),
        description = _("Loop particles emission"),
        default = False
    )

    pset_type.b4w_allow_nla = bpy.props.BoolProperty(
        name = _("B4W: allow NLA"),
        description = _("Allow particles emission to be controlled by the NLA"),
        default = True
    )

    b4w_randomize_emission = bpy.props.BoolProperty(
        name = _("B4W: randomize emission"),
        description = _("Randomize the delay for particles emission"),
        default = False
    )
    pset_type.b4w_randomize_emission = b4w_randomize_emission

    b4w_fade_in = bpy.props.FloatProperty(
        name = _("B4W: fade-in interval"),
        description = _("Fade-in interval for particles"),
        default = 0.0,
        min = 0.0,
        soft_max = 120,
        precision = 3
    )
    pset_type.b4w_fade_in = b4w_fade_in

    b4w_fade_out = bpy.props.FloatProperty(
        name = _("B4W: fade-out interval"),
        description = _("Fade-out interval for particles"),
        default = 0.0,
        min = 0.0,
        soft_max = 120,
        precision = 3
    )
    pset_type.b4w_fade_out = b4w_fade_out

    pset_type.b4w_billboard_align = bpy.props.EnumProperty(
        name = _("B4W: billboard align"),
        description = _("Billboard alignment in the world space"),
        default = "VIEW",
        items = [
            ("VIEW", _("View"), _("Align to view (active camera)")),
            ("XY", _("XY plane"), _("Align in XY plane")),
            ("YZ", _("YZ plane"), _("Align in YZ plane")),
            ("ZX", _("ZX plane"), _("Align in ZX plane"))
        ]
    )

    pset_type.b4w_coordinate_system = bpy.props.EnumProperty(
        name = _("B4W: coordinate system"),
        description = _("Particles coordinate system"),
        items = [
            ("WORLD", _("World"), _("World coordinate system")),
            ("LOCAL", _("Local"), _("Emitter's coordinate system")),
        ],
        default = "LOCAL"
    )

    # "HAIR"

    pset_type.b4w_dynamic_grass = bpy.props.BoolProperty(
        name = _("B4W: dynamic grass"),
        description = _("Render on the terrain materials as dynamic grass"),
        default = False
    )
    pset_type.b4w_dynamic_grass_scale_threshold = bpy.props.FloatProperty(
        name = _("B4W: dynamic grass scale threshold"),
        description = _("Scale threshold for dynamic grass"),
        default = 0.01,
        min = 0.0,
        max = 1.0,
        step = 5.0,
        precision = 3
    )
    pset_type.b4w_randomize_location = bpy.props.BoolProperty(
        name = _("B4W: randomize location and size"),
        description = _("Randomize location and size (±25%) of hair particle objects"),
        default = False
    )
    pset_type.b4w_initial_rand_rotation = bpy.props.BoolProperty(
        name = _("B4W: initial random rotation"),
        description = _("Initial random rotation of hair particle objects"),
        default = False
    )
    pset_type.b4w_rand_rotation_strength = bpy.props.FloatProperty(
        name = _("B4W: random rotation strength"),
        description = _("Strength of initial random rotation"),
        default = 1.0,
        min = 0.0,
        max = 1.0,
        precision = 3
    )
    pset_type.b4w_rotation_type = bpy.props.EnumProperty(
        name = _("B4W: rotation type"),
        description = _("Rotation type of hair particle objects"),
        default = "Z",
        items = [
            ("Z", _("Z axis"), _("Rotation around Z axis")),
            ("XYZ", _("Random axis"), _("Rotation around random axis")),
        ]
    )

    pset_type.b4w_hair_billboard = bpy.props.BoolProperty(
        name = _("B4W: hair billboard"),
        description = _("Make billboards from hair particle objects"),
        default = False
    )
    pset_type.b4w_hair_billboard_type = bpy.props.EnumProperty(
        name = _("B4W: hair billboard type"),
        description = _("Hair billboard type"),
        default = "BASIC",
        items = [
            ("BASIC", _("Basic"), _("Basic one-sided billboarding")),
            ("RANDOM", _("Random"), _("Random two-sided billboarding")),
            ("JITTERED", _("Jittered"), _("One-sided billboarding with jittering")),
        ]
    )
    pset_type.b4w_hair_billboard_jitter_amp = bpy.props.FloatProperty(
        name = _("B4W: hair billboard jitter amp"),
        description = _("Coefficient of the jittering amplitude for the billboard"),
        default = 0.0,
        min = 0.0,
        max = 1.0,
        step = 0.001,
        precision = 3
    )
    pset_type.b4w_hair_billboard_jitter_freq = bpy.props.FloatProperty(
        name = _("B4W: hair billboard jitter freq"),
        description = _("Jittering frequency for the billboard, Hz"),
        default = 0.0,
        min = 0.0,
        max = 100.0,
        step = 0.001,
        precision = 3
    )
    pset_type.b4w_hair_billboard_geometry = bpy.props.EnumProperty(
        name = _("B4W: hair billboard geometry type"),
        description = _("Hair billboard geometry type"),
        default = "SPHERICAL",
        items = [
            ("SPHERICAL", _("Spherical"), _("Spherical billboarding")),
            ("CYLINDRICAL", _("Cylindrical"), _("Cylindrical billboarding")),
        ]
    )

    pset_type.b4w_wind_bend_inheritance = bpy.props.EnumProperty(
        name = _("B4W: wind bend inheritance"),
        description = _("Wind bending inheritance"),
        items = [
            ("PARENT", _("Parent"), _("inherit from parent")),
            ("INSTANCE", _("Instance"), _("inherit from instance")),
        ],
        default = "PARENT"
    )

    pset_type.b4w_shadow_inheritance = bpy.props.EnumProperty(
        name = _("B4W: shadow inheritance"),
        description = _("Shadow inheritance"),
        items = [
            ("PARENT", _("Parent"), _("inherit from parent")),
            ("INSTANCE", _("Instance"), _("inherit from instance")),
        ],
        default = "PARENT"
    )

    pset_type.b4w_reflection_inheritance = bpy.props.EnumProperty(
        name = _("B4W: reflection inheritance"),
        description = _("Reflection inheritance"),
        items = [
            ("PARENT", _("Parent"), _("inherit from parent")),
            ("INSTANCE", _("Instance"), _("inherit from instance")),
        ],
        default = "PARENT"
    )

    pset_type.b4w_vcol_from_name = bpy.props.StringProperty(
        name = _("B4W: vcol from name"),
        description = _("Vertex color from emitter"),
        default = ""
    )

    pset_type.b4w_vcol_to_name = bpy.props.StringProperty(
        name = _("B4W: vcol to name"),
        description = _("Vertex color on instance"),
        default = ""
    )

    pset_type.b4w_enable_soft_particles = bpy.props.BoolProperty(
        name = _("B4W: enable soft particles"),
        description = _("Enable softness in areas where particles touch other objects"),
        default = False
    )

    pset_type.b4w_particles_softness = bpy.props.FloatProperty(
        name = _("B4W: particle softness"),
        description = _("How soft should the particles be"),
        default = 0.25,
        min = 0.0,
        max = 10.0
    )

def replace_prop(prop, src, dest):
    if hasattr(src[prop], 'items'):
        for sub_prop in src[prop].items():
            name = sub_prop[0]
            val = sub_prop[1]
            dest[prop][name] = val
    else:
        dest[prop] = src[prop]

    del src[prop]

@bpy.app.handlers.persistent
def replace_deprecated_props(arg):
    world_to_scene_props = [
        "b4w_god_rays_settings",
        "b4w_shadow_settings",
        "b4w_color_correction_settings",
        "b4w_ssao_settings",
        "b4w_bloom_settings",
        "b4w_motion_blur_settings",
        "b4w_outline_color",
        "b4w_outline_factor"
    ]
    glow_settings_props = [
        "b4w_small_glow_mask_coeff",
        "b4w_large_glow_mask_coeff",
        "b4w_small_glow_mask_width",
        "b4w_large_glow_mask_width",
        "b4w_render_glow_over_blend"
    ]
    for scene in bpy.data.scenes:

        world = scene.world

        if not world:
            continue

        if ("b4w_glow_color" in world.keys()) and hasattr(scene, "b4w_outline_color"):
            scene["b4w_outline_color"] = world["b4w_glow_color"]
            del world["b4w_glow_color"]

        if ("b4w_glow_factor" in world.keys()) and hasattr(scene, "b4w_outline_factor"):
            scene["b4w_outline_factor"] = world["b4w_glow_factor"]
            del world["b4w_glow_factor"]

        for prop in world_to_scene_props:
            if prop in world.keys() and hasattr(scene, prop):
                replace_prop(prop, world, scene)

        if hasattr(scene, "b4w_glow_settings"):
            glow_set = scene.b4w_glow_settings
            for prop in glow_settings_props:
                if prop in world.keys():
                    new_name = prop[4:] # drop b4w_ prefix
                    glow_set[new_name] = world[prop]

                    del world[prop]

    for mat in bpy.data.materials:
        if ("b4w_collision_group" in mat and
                len(mat["b4w_collision_group"]) == 8 and
                hasattr(mat, "b4w_collision_group")):

            print(mat.name + ": Replacing b4w_collision_group property (8->16)")

            group_saved = list(mat["b4w_collision_group"])

            for i in range(len(mat.b4w_collision_group)):
                if i < 8:
                    mat.b4w_collision_group[i] = bool(group_saved[i])
                else:
                    mat.b4w_collision_group[i] = False


        if ("b4w_collision_mask" in mat and
                len(mat["b4w_collision_mask"]) == 8 and
                hasattr(mat, "b4w_collision_mask")):

            print(mat.name + ": Replacing b4w_collision_mask property (8->16)")

            mask_saved = list(mat["b4w_collision_mask"])

            for i in range(len(mat.b4w_collision_mask)):
                if i < 8:
                    mat.b4w_collision_mask[i] = bool(mask_saved[i])
                else:
                    mat.b4w_collision_mask[i] = False

    for lmp in bpy.data.lamps:
        if "b4w_generate_shadows" in lmp.keys() and hasattr(lmp, "use_shadow"):
            setattr(lmp, "use_shadow", lmp["b4w_generate_shadows"])
            del lmp["b4w_generate_shadows"]

def register():
    add_b4w_props()
    bpy.app.handlers.load_post.append(replace_deprecated_props)

def unregister():
    remove_b4w_props()

