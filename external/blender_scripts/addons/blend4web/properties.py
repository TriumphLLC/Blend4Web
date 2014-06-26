import bpy
import mathutils
import math
import os
import cProfile
from .interface import *

class B4W_LodProperty(bpy.types.PropertyGroup):
    pass

class B4W_DetailBendingColors(bpy.types.PropertyGroup):
    
    leaves_stiffness_col = bpy.props.StringProperty(
        name = "B4W: leaves stiffness color",
        description = "Vertex color used for leaves stiffness", 
        default = ""
    )
    leaves_phase_col = bpy.props.StringProperty(
        name = "B4W: leaves phase color",
        description = "Vertex color used for leaves stiffness", 
        default = ""
    )
    overall_stiffness_col = bpy.props.StringProperty(
        name = "B4W: overall stiffness color",
        description = "Vertex color used for overall stiffness", 
        default = ""
    )

class B4W_FloatingSettings(bpy.types.PropertyGroup):
    part = bpy.props.EnumProperty(
        name = "Floater part",
        description = "Floating object part",
        default = "MAIN_BODY",
        items = [
            ("MAIN_BODY", "Main body", "Floating object main body"),
            ("BOB", "Bob", "Floating object's bob")
        ]
    )
    floating_factor = bpy.props.FloatProperty(
        name = "Floating factor",
        description = "Factor of strength applied to the floating object",
        default = 3.0,
        min = 0.0,
        soft_max = 100,
        step = 1,
        precision = 3
    )
    water_lin_damp = bpy.props.FloatProperty(
        name = "Water Linear damping",
        description = "Linear damping applied to objects under water",
        default = 0.8,
        min = 0.0,
        soft_max = 1,
        step = 1,
        precision = 3
    )
    water_rot_damp = bpy.props.FloatProperty(
        name = "Water Rotation damping",
        description = "Rotation damping applied to objects under water",
        default = 0.8,
        min = 0.0,
        soft_max = 1,
        step = 1,
        precision = 3
    )
    synchronize_position = bpy.props.BoolProperty(
        name = "Synchronize position",
        description = "Synchronize bob position",
        default = False,
    )

class B4W_VehicleSettings(bpy.types.PropertyGroup):
    part = bpy.props.EnumProperty(
        name = "Vehicle part",
        description = "Vehicle part",
        default = "CHASSIS",
        items = [
            ("HULL", "Hull", "Vehicle hull"),
            ("CHASSIS", "Chassis", "Vehicle chassis"),
            ("STEERING_WHEEL", "Steering wheel", "Optional vehicle steering wheel"),
            ("WHEEL_FRONT_LEFT", "Front left wheel", "Vehicle front left wheel"),
            ("WHEEL_FRONT_RIGHT", "Front right wheel", "Vehicle front right wheel"),
            ("WHEEL_BACK_LEFT", "Back left wheel", "Vehicle rear left wheel"),
            ("WHEEL_BACK_RIGHT", "Back right wheel", "Vehicle rear right wheel"),
            ("TACHOMETER", "Tachometer", "Vehicle tachometer"),
            ("SPEEDOMETER", "Speedometer", "Vehicle speedometer"),
            ("BOB", "Bob", "Boat's bob")
        ]
    )
    suspension_rest_length = bpy.props.FloatProperty(
        name = "Rest length",
        description = "Suspension rest length, length from relaxed to strained wheel position",
        default = 0.1,
        min = 0.0,
        soft_max = 1.0,
        step = 1,
        precision = 3
    )
    suspension_compression = bpy.props.FloatProperty(
        name = "Suspension compression",
        description = "Suspension compression",
        default = 4.4,
        min = 0.0,
        soft_max = 10.0,
        step = 10,
        precision = 1
    )
    suspension_stiffness = bpy.props.FloatProperty(
        name = "Suspension stiffness",
        description = "Suspension stiffness",
        default = 20.0,
        min = 0.0,
        soft_max = 100.0,
        step = 10,
        precision = 1
    )
    suspension_damping = bpy.props.FloatProperty(
        name = "Suspension damping",
        description = "Suspension damping",
        default = 2.3,
        min = 0.0,
        soft_max = 10.0,
        step = 10,
        precision = 1
    )
    wheel_friction = bpy.props.FloatProperty(
        name = "Wheel friction",
        description = "Wheel friction",
        default = 1000.0,
        min = 0.0,
        soft_max = 10000.0,
        step = 100,
        precision = 1
    )
    roll_influence = bpy.props.FloatProperty(
        name = "Roll influence",
        description = "Roll influence",
        default = 0.1,
        min = 0.0,
        soft_max = 10.0,
        step = 1,
        precision = 3
    )
    force_max = bpy.props.FloatProperty(
        name = "Force max",
        description = "Acceleration value for the vehicle",
        default = 1500.0,
        min = 0.0,
        soft_max = 10000.0,
        step = 1,
        precision = 3
    )
    brake_max = bpy.props.FloatProperty(
        name = "Brake max",
        description = "Braking value for the vehicle",
        default = 100.0,
        min = 0.0,
        soft_max = 10000.0,
        step = 1,
        precision = 3
    )
    steering_ratio = bpy.props.FloatProperty(
        name = "Steering ratio",
        description = "Ratio between the turn of the steering wheel and the turn of the wheels",
        default = 10.0,
        min = 0.0,
        soft_max = 100.0,
        step = 1,
        precision = 3
    )
    steering_max = bpy.props.FloatProperty(
        name = "Steering max",
        description = "Maximum steering wheel angle",
        default = 1,
        min = 0.0,
        soft_max = 10,
        step = 1,
        precision = 3
    )
    inverse_control = bpy.props.BoolProperty(
        name = "Inverse control",
        description = "Inverse vehicle control",
        default = False,
    )
    delta_tach_angle = bpy.props.FloatProperty(
        name = "Tachometer delta angle",
        description = "Sets delta angle for the tachometer device",
        default = 4.43,
        min = 0.0,
        soft_max = 6.18,
        step = 1,
        precision = 1,
        subtype = 'ANGLE'
    )
    max_speed_angle = bpy.props.FloatProperty(
        name = "Speedometer max angle",
        description = "Sets max angle for the speedometer device",
        default = 3.14,
        min = 0.0,
        soft_max = 6.18,
        step = 1,
        precision = 1,
        subtype = 'ANGLE'
    )
    speed_ratio = bpy.props.FloatProperty(
        name = "Speedometer ratio",
        description = "Sets speedometer ratio",
        default = 0.027,
        min = 0.0,
        soft_max = 10,
        step = 1,
        precision = 3,
        subtype = 'ANGLE'
    )
    max_suspension_travel_cm = bpy.props.FloatProperty(
        name = "Max suspension travel cm",
        description = "Max suspension travel cm",
        default = 30,
        min = 0.0,
        soft_max = 100,
        step = 1,
        precision = 3
    )
    floating_factor = bpy.props.FloatProperty(
        name = "Floating factor",
        description = "Factor of strengh applied to the floating object",
        default = 3.0,
        min = 0.0,
        soft_max = 100,
        step = 1,
        precision = 3
    )
    water_lin_damp = bpy.props.FloatProperty(
        name = "Water Linear damping",
        description = "Linear damping applied to objects under water",
        default = 0.8,
        min = 0.0,
        soft_max = 1,
        step = 1,
        precision = 3
    )
    water_rot_damp = bpy.props.FloatProperty(
        name = "Water Rotation damping",
        description = "Rotation damping applied to objects under water",
        default = 0.8,
        min = 0.0,
        soft_max = 1,
        step = 1,
        precision = 3
    )
    synchronize_position = bpy.props.BoolProperty(
        name = "Synchronize position",
        description = "Synchronize bob position",
        default = False,
    )

class B4W_GlowSettings(bpy.types.PropertyGroup):
    glow_duration = bpy.props.FloatProperty(
        name = "Glow duration",
        description = "Glow duration",
        default = 1.0,
        min = 0.01,
        soft_max = 10.0,
        max = 1000.0,
        step = 1,
        precision = 2
    )
    glow_period = bpy.props.FloatProperty(
        name = "Glow peroid",
        description = "Glow period",
        default = 1.0,
        min = 0.01,
        soft_max = 10.0,
        max = 1000.0,
        step = 1,
        precision = 2
    )
    glow_relapses = bpy.props.IntProperty(
        name = "Glow relapses",
        description = "Glow relapses",
        default = 0,
        min = 0,
        soft_max = 10,
        max = 1000
    )

class B4W_CharacterSettings(bpy.types.PropertyGroup):
    walk_speed = bpy.props.FloatProperty(
        name = "B4W: character walk speed",
        description = "Character walk speed",
        default = 4,
        min = 0.0,
        max = 10.0,
        soft_min = 0,
        soft_max = 10,
        step = 0.1,
        precision = 2
    )
    run_speed = bpy.props.FloatProperty(
        name = "B4W: character run speed",
        description = "Character run speed",
        default = 8,
        min = 0.0,
        max = 20.0,
        soft_min = 0,
        soft_max = 20,
        step = 0.1,
        precision = 2
    )
    step_height = bpy.props.FloatProperty(
        name = "B4W: character step height",
        description = "Character step height",
        default = 0.25,
        min = 0.0,
        max = 1.0,
        soft_min = 0,
        soft_max = 1,
        step = 0.01,
        precision = 3
    )
    jump_strength = bpy.props.FloatProperty(
        name = "B4W: character jump strength",
        description = "Character jump strength",
        default = 5,
        min = 0.0,
        max = 100.0,
        soft_min = 0,
        soft_max = 50,
        step = 0.1,
        precision = 2
    )
    waterline = bpy.props.FloatProperty(
        name = "B4W: character waterline",
        description = "Waterline for character in vertical direction",
        default = 0.0,
        min = -5,
        max = 5,
        soft_min = -2,
        soft_max = 2,
        step = 0.01,
        precision = 3
    )
    
class B4W_ShadowSettings(bpy.types.PropertyGroup):

    csm_num = bpy.props.IntProperty(
        name = "csm_num",
        description = "Number of cascaded shadow maps",
        default = 1,
        min = 1,
        max = 4
    )
    
    csm_near = bpy.props.FloatProperty(
        name = "csm_near",
        description = "Shadows near border. Input data for calculating cascaded shadow maps borders",
        default = 0.1,
        min = 0.01,
        max = 10.0,
        step = 0.01,
        precision = 2
    )

    csm_far = bpy.props.FloatProperty(
        name = "csm_far",
        description = "Shadows far border. Input data for calculating cascaded shadow maps borders",
        default = 100.0,
        min = 1.0,
        max = 1000.0,
        step = 1.0,
        precision = 1
    )

    csm_lambda = bpy.props.FloatProperty(
        name = "csm_lambda",
        description = "Correction factor for calculating cascaded shadow maps borders",
        default = 0.875,
        min = 0.0,
        max = 1.0,
        step = 0.001,
        precision = 3
    )

    visibility_falloff = bpy.props.FloatProperty(
        name = "visibility_falloff",
        description = "Shadow visibility falloff for receivers. Smaller values reduce self-shadowing artefacts",
        default = 3500.0,
        min = 0.0,
        max = 50000.0,
        step = 1,
        precision = 1
    )

    blur_depth_size_mult = bpy.props.FloatProperty(
        name = "blur_depth_size_mult",
        description = "Shadow blur kernel size multiplier. Affects shadow softness",
        default = 1.0,
        min = 0.0,
        max = 10.0,
        step = 0.1,
        precision = 1
    )

    blur_depth_edge_size = bpy.props.FloatProperty(
        name = "blur_depth_edge_size",
        description = "Difference between samples (in texels) for edge detection. Reduces haloing by not blurring the edges",
        default = 2.0,
        min = 0.0,
        max = 10.0,
        step = 0.01,
        precision = 2
    )

    blur_depth_diff_threshold = bpy.props.FloatProperty(
        name = "blur_depth_diff_threshold",
        description = "Depth difference maximum (normalized) for edge detection, multiplied by 1000. Reduces haloing by not blurring the edges",
        default = 0.1,
        min = 0.0,
        max = 1.0,
        step = 0.001,
        precision = 3
    )

class B4W_ColorCorrectionSettings(bpy.types.PropertyGroup):

    brightness = bpy.props.FloatProperty(
        name = "brightness",
        description = "Final image brightness",
        default = 0.0,
        min = -1.0,
        max = 1.0,
        step = 0.01,
        precision = 2
    )

    contrast = bpy.props.FloatProperty(
        name = "contrast",
        description = "Final image contrast",
        default = 0.0,
        min = -1.0,
        max = 1.0,
        step = 0.01,
        precision = 2
    )

    exposure = bpy.props.FloatProperty(
        name = "exposure",
        description = "Final image exposure",
        default = 1.0,
        min = 0.0,
        max = 2.0,
        step = 0.01,
        precision = 2
    )

    saturation = bpy.props.FloatProperty(
        name = "saturation",
        description = "Final image saturation",
        default = 1.0,
        min = 0.0,
        max = 2.0,
        step = 0.01,
        precision = 2
    )

class B4W_SSAOSettings(bpy.types.PropertyGroup):

    radius_increase = bpy.props.FloatProperty(
        name = "radius_increase",
        description = "Radius Increase",
        default = 1.7,
        min = 0.0,
        max = 15.0,
        step = 0.01,
        precision = 2
    )

    dithering_amount = bpy.props.FloatProperty(
        name = "dithering_amount",
        description = "Dithering amount multiplied by 1000",
        default = 0.1,
        min = 0.0,
        max = 4.0,
        step = 0.001,
        precision = 3
    )

    gauss_center = bpy.props.FloatProperty(
        name = "gauss_center",
        description = "Gauss bell center",
        default = 0.2,
        min = 0.0,
        max = 2.0,
        step = 0.005,
        precision = 3
    )

    gauss_width = bpy.props.FloatProperty(
        name = "gauss_width",
        description = "Gauss bell width",
        default = 2.0,
        min = 0.0,
        max = 16.0,
        step = 0.02,
        precision = 2
    )

    gauss_width_left = bpy.props.FloatProperty(
        name = "gauss_width_left",
        description = "Self-shadowing reduction",
        default = 0.1,
        min = 0.0,
        max = 2.0,
        step = 0.005,
        precision = 3
    )

    influence = bpy.props.FloatProperty(
        name = "influence",
        description = "How much AO affects the final rendering",
        default = 0.7,
        min = 0.0,
        max = 1.0,
        step = 0.005,
        precision = 3
    )

    dist_factor = bpy.props.FloatProperty(
        name = "dist_factor",
        description = "How much AO decreases with distance",
        default = 0.0,
        min = 0.0,
        max = 20.0,
        step = 0.01,
        precision = 2
    )

    samples = bpy.props.EnumProperty(
        name = "samples",
        description = "Number of samples aka quality",
        items = [
            ("16", "16", "0", 0),
            ("32", "32", "1", 1),
        ]
    )


class B4W_GodRaysSettings(bpy.types.PropertyGroup):

    intensity = bpy.props.FloatProperty(
        name = "intensity",
        description = "Intensity multiplier",
        default = 0.7,
        min = 0.0,
        max = 5.0,
        step = 0.01,
        precision = 2
    )

    max_ray_length = bpy.props.FloatProperty(
        name = "max_ray_length",
        description = "Maximum length of rays in screen size units",
        default = 1.0,
        min = 0.0,
        max = 5.0,
        step = 0.01,
        precision = 2
    )

    steps_per_pass = bpy.props.FloatProperty(
        name = "steps_per_pass",
        description = "Number of steps per blur pass (3 passes in all)",
        default = 10.0,
        min = 0.0,
        max = 30.0,
        step = 1.0,
        precision = 1
    )

class B4W_BloomSettings(bpy.types.PropertyGroup):

    key = bpy.props.FloatProperty(
        name = "key",
        description = "Key multiplier",
        default = 1.0,
        min = 0.0,
        max = 5.0,
        step = 0.01,
        precision = 2
    )

    blur = bpy.props.FloatProperty(
        name = "blur",
        description = "Bloom blur strength",
        default = 4.0,
        min = 0.0,
        max = 20.0,
        step = 0.01,
        precision = 2
    )

    edge_lum = bpy.props.FloatProperty(
        name = "edge_lum",
        description = "Bloom edge relative luminance (bloom starts above this value)",
        default = 1.0,
        min = 0.0,
        max = 3.0,
        step = 0.01,
        precision = 2
    )

class B4W_MotionBlurSettings(bpy.types.PropertyGroup):

    motion_blur_factor = bpy.props.FloatProperty(
        name = "motion_blur_factor",
        description = "Motion blur factor",
        default = 0.01,
        min = 0.001,
        soft_min = 0.001,
        max = 1.0, 
        soft_max = 1.0,
        step = 0.1,
        precision = 3
    )

    motion_blur_decay_threshold = bpy.props.FloatProperty(
        name = "motion_blur_decay_threshold",
        description = "Motion blur decay threshold",
        default = 0.01,
        min = 0.0,
        soft_min = 0.0,
        max = 1.0, 
        soft_max = 1.0,
        step = 0.1,
        precision = 3
    )

class B4W_SkySettings(bpy.types.PropertyGroup):

    color = bpy.props.FloatVectorProperty(
        name = "color",
        description = "Sky atmosphere color",
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
        name = "rayleigh_brightness",
        description = "Brightness of Rayleigh scattering",
        default = 3.3,
        min = 0.0,
        max = 5.0,
        step = 0.01,
        precision = 2
    )

    mie_brightness = bpy.props.FloatProperty(
        name = "mie_brightness",
        description = "Brightness of Mie scattering",
        default = 0.1,
        min = 0.0,
        max = 1.0,
        step = 0.01,
        precision = 2
    )

    spot_brightness = bpy.props.FloatProperty(
        name = "spot_brightness",
        description = "Brightness of sun spot",
        default = 20.0,
        min = 0.0,
        max = 1000.0,
        step = 1.0,
        precision = 1
    )

    scatter_strength = bpy.props.FloatProperty(
        name = "scatter_strength",
        description = "Strength of light scattering",
        default = 0.2,
        min = 0.0,
        max = 1.0,
        step = 0.01,
        precision = 2
    )

    rayleigh_strength = bpy.props.FloatProperty(
        name = "rayleigh_strength",
        description = "Strength of Rayleigh scattering",
        default = 0.2,
        min = 0.0,
        max = 1.0,
        step = 0.01,
        precision = 2
    )

    mie_strength = bpy.props.FloatProperty(
        name = "mie_strength",
        description = "Strength of Mie scattering",
        default = 0.006,
        min = 0.0,
        max = 0.1,
        step = 0.0001,
        precision = 4
    )

    rayleigh_collection_power = bpy.props.FloatProperty(
        name = "rayleigh_collection_power",
        description = "Rayleigh collection power",
        default = 0.35,
        min = 0.0,
        max = 2.0,
        step = 0.01,
        precision = 2
    )

    mie_collection_power = bpy.props.FloatProperty(
        name = "mie_collection_power",
        description = "Mie collection power",
        default = 0.5,
        min = 0.0,
        max = 2.0,
        step = 0.01,
        precision = 2
    )

    mie_distribution = bpy.props.FloatProperty(
        name = "mie_distribution",
        description = "Mie disturbtion",
        default = 0.4,
        min = 0.0,
        max = 2.0,
        step = 0.01,
        precision = 2
    )

class B4W_DynamicCompressorSettings(bpy.types.PropertyGroup):
    threshold = bpy.props.FloatProperty(
        name = "threshold",
        description = "The value above which the compression will start taking effect",
        default = -24,
        min = -100,
        max = 0,
        step = 10,
        precision = 1
    )
    knee = bpy.props.FloatProperty(
        name = "knee",
        description = "Range above the threshold where the curve transitions to the ratio portion",
        default = 30,
        min = 0,
        max = 40,
        step = 10,
        precision = 1
    )
    ratio = bpy.props.FloatProperty(
        name = "ratio",
        description = "dB input change for a 1 dB output change",
        default = 12,
        min = 1,
        max = 20,
        step = 10,
        precision = 1
    )
    attack = bpy.props.FloatProperty(
        name = "attack",
        description = "Amount of time to reduce gain by 10 dB",
        default = 0.003,
        min = 0,
        max = 1,
        step = 0.1,
        precision = 3
    )
    release = bpy.props.FloatProperty(
        name = "release",
        description = "Amount of time to increase gain by 10 dB",
        default = 0.250,
        min = 0,
        max = 1,
        step = 0.1,
        precision = 3
    )

class B4W_BoundingsSettings(bpy.types.PropertyGroup):
    min_x = bpy.props.FloatProperty(
        name = "min_x",
        description = "Boundings minimum x",
        default = -1.0,
        min = -1000,
        max = 1000,
        soft_min = -50,
        soft_max = 50,
        step = 1,
        precision = 3
    )
    max_x = bpy.props.FloatProperty(
        name = "max_x",
        description = "Boundings maximum x",
        default = 1.0,
        min = -1000,
        max = 1000,
        soft_min = -50,
        soft_max = 50,
        step = 1,
        precision = 3
    )
    min_y = bpy.props.FloatProperty(
        name = "min_y",
        description = "Boundings minimum y",
        default = -1.0,
        min = -1000,
        max = 1000,
        soft_min = -50,
        soft_max = 50,
        step = 1,
        precision = 3
    )
    max_y = bpy.props.FloatProperty(
        name = "max_y",
        description = "Boundings maximum y",
        default = 1.0,
        min = -1000,
        max = 1000,
        soft_min = -50,
        soft_max = 50,
        step = 1,
        precision = 3
    )
    min_z = bpy.props.FloatProperty(
        name = "min_z",
        description = "Boundings minimum z",
        default = -1.0,
        min = -1000,
        max = 1000,
        soft_min = -50,
        soft_max = 50,
        step = 1,
        precision = 3
    )
    max_z = bpy.props.FloatProperty(
        name = "max_z",
        description = "Boundings maximum z",
        default = 1.0,
        min = -1000,
        max = 1000,
        soft_min = -50,
        soft_max = 50,
        step = 1,
        precision = 3
    )

def add_b4w_props():

    b4w_do_not_export = bpy.props.BoolProperty(
        name = "B4W: do not export",
        description = "Check if you do NOT wish to export this component", 
        default = False
    )

    # deprecated
    b4w_export_path = bpy.props.StringProperty(
        name = "B4W: component export path",
        description = "Exported file path relative to the blend file",
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

    for class_name in class_names:
        cl = getattr(bpy.types, class_name)
        cl.b4w_do_not_export = b4w_do_not_export
        # deprecated
        cl.b4w_export_path   = b4w_export_path

    b4w_export_path_json = bpy.props.StringProperty(
        name = "B4W: export path json",
        description = "Exported json file path relative to the blend file", 
        default = ""
    )
    b4w_export_path_html = bpy.props.StringProperty(
        name = "B4W: export path html",
        description = "Exported html file path relative to the blend file", 
        default = ""
    )
    bpy.types.Scene.b4w_export_path_json = b4w_export_path_json
    bpy.types.Scene.b4w_export_path_html = b4w_export_path_html

    add_scene_properties()

    # for world panel
    b4w_glow_color = bpy.props.FloatVectorProperty(
        name = "B4W: glow color of the selection",
        description = "Default glow color of the selection",
        default = (1.0, 1.0, 1.0),
        min = 0.0,
        soft_min = 0.0,
        max = 1.0,
        soft_max = 1.0,
        precision = 3,
        subtype = 'COLOR',
        size = 3
    )
    bpy.types.World.b4w_glow_color = b4w_glow_color

    b4w_glow_factor = bpy.props.FloatProperty(
        name = "B4W: glow factor",
        description = "Glow strength factor",
        default = 1.0,
        min = 0.1,
        max = 1.0,
        step = 1,
        precision = 2
    )
    bpy.types.World.b4w_glow_factor = b4w_glow_factor

    b4w_fog_color = bpy.props.FloatVectorProperty(
        name = "B4W: fog color",
        description = "Fog color",
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

    b4w_fog_density = bpy.props.FloatProperty(
        name = "B4W: fog density",
        description = "Fog density",
        default = 0.0,
        min = 0.0,
        soft_min = 0.0,
        max = 1.0,
        soft_max = 0.1,
        step = 0.1,
        precision = 4
    )
    bpy.types.World.b4w_fog_density = b4w_fog_density

    bpy.types.World.b4w_god_rays_settings = bpy.props.PointerProperty(
        name = "B4W: god rays settings",
        type = B4W_GodRaysSettings
    )

    bpy.types.World.b4w_shadow_settings = bpy.props.PointerProperty(
        name = "B4W: shadow settings",
        type = B4W_ShadowSettings
    )

    bpy.types.World.b4w_color_correction_settings = bpy.props.PointerProperty(
        name = "B4W: color correction settings",
        type = B4W_ColorCorrectionSettings 
    )

    bpy.types.World.b4w_ssao_settings = bpy.props.PointerProperty(
        name = "B4W: SSAO settings",
        type = B4W_SSAOSettings
    )

    bpy.types.World.b4w_sky_settings = bpy.props.PointerProperty(
        name = "B4W: sky settings",
        type = B4W_SkySettings
    )

    bpy.types.World.b4w_bloom_settings = bpy.props.PointerProperty(
        name = "B4W: bloom settings",
        type = B4W_BloomSettings
    )

    bpy.types.World.b4w_motion_blur_settings = bpy.props.PointerProperty(
        name = "B4W: motion blur settings",
        type = B4W_MotionBlurSettings
    )

    add_object_properties()

    # for camera panel
    b4w_move_style = bpy.props.EnumProperty(
        name = "B4W: movement style",
        description = "Default camera movement style",
        default = "TARGET",
        items = [
            ("STATIC", "Static", "Static camera"),
            ("TARGET", "Target", "Move target"),
            ("EYE", "Eye", "Move eye")
        ]
    )
    bpy.types.Camera.b4w_move_style = b4w_move_style

    b4w_target = bpy.props.FloatVectorProperty(
        name = "B4W: target",
        description = "Camera target location for \"TARGET\" camera",
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

    b4w_use_distance_limits = bpy.props.BoolProperty(
        name = "B4W: use distance limits",
        description = "Check if you wish to set distance limits", 
        default = False
    )
    bpy.types.Camera.b4w_use_distance_limits = b4w_use_distance_limits

    b4w_distance_min = bpy.props.FloatProperty(
           name = "B4W: Minimum distance to target",
           description = "Minimum distance to target",
           default = 1.0,
           min = -1000000.0,
           soft_min = 0.0,
           max = 1000000.0,
           soft_max = 1000.0,
           precision = 3,
       )
    bpy.types.Camera.b4w_distance_min = b4w_distance_min

    b4w_distance_max = bpy.props.FloatProperty(
           name = "B4W: Maximum distance to target",
           description = "Maximum distance to target",
           default = 100.0,
           min = -1000000.0,
           soft_min = 0.0,
           max = 1000000.0,
           soft_max = 1000.0,
           precision = 3,
       )
    bpy.types.Camera.b4w_distance_max = b4w_distance_max

    b4w_use_horizontal_clamping = bpy.props.BoolProperty(
        name = "B4W: use horizontal rotation clamping",
        description = "Check if you wish to set horizontal clamping angles", 
        default = False
    )
    bpy.types.Camera.b4w_use_horizontal_clamping = b4w_use_horizontal_clamping

    b4w_rotation_left_limit = bpy.props.FloatProperty(
           name = "B4W: Rotation left limit",
           description = "Rotation left limit angle",
           default = -math.pi,
           min = -2 * math.pi,
           soft_min = -2 * math.pi,
           max = 2 * math.pi,
           soft_max = 2 * math.pi,
           precision = 1,
           subtype = "ANGLE",   
       )
    bpy.types.Camera.b4w_rotation_left_limit = b4w_rotation_left_limit

    b4w_rotation_right_limit = bpy.props.FloatProperty(
           name = "B4W: Rotation right limit",
           description = "Rotation right limit angle",
           default = math.pi,
           min = -2 * math.pi,
           soft_min = -2 * math.pi,
           max = 2 * math.pi,
           soft_max = 2 * math.pi,
           precision = 1,
           subtype = "ANGLE",
       )
    bpy.types.Camera.b4w_rotation_right_limit = b4w_rotation_right_limit

    bpy.types.Camera.b4w_horizontal_clamping_type = bpy.props.EnumProperty(
        name = "B4W: horizontal clamping type",
        description = "Horizontal clamping type",
        default = "LOCAL",
        items = [
            ("LOCAL", "Camera space", "Clamp angles in camera space"),
            ("WORLD", "World space", "Clamp angles in world space")
        ]
    )

    b4w_use_vertical_clamping = bpy.props.BoolProperty(
        name = "B4W: use vertical rotation clamping",
        description = "Check if you wish to set vertical clamping angles", 
        default = False
    )
    bpy.types.Camera.b4w_use_vertical_clamping = b4w_use_vertical_clamping


    def get_rotation_down_limit(self):
        value = self.b4w_rotation_down_limit_storage
        if getattr(self, "b4w_use_horizontal_clamping"):
            value = min(max(value, -math.pi / 2), math.pi / 2)
        return value

    def set_rotation_down_limit(self, value):
        if getattr(self, "b4w_use_horizontal_clamping"):
            value = min(max(value, -math.pi / 2), math.pi / 2)
        self.b4w_rotation_down_limit_storage = value

    b4w_rotation_down_limit = bpy.props.FloatProperty(
           name = "B4W: Rotation down limit",
           description = "Rotation down limit angle",
           default = -math.pi / 2,
           min = -2 * math.pi,
           soft_min = -2 * math.pi,
           max = 2 * math.pi,
           soft_max = 2 * math.pi,
           precision = 1,
           subtype = "ANGLE",
           set = set_rotation_down_limit,
           get = get_rotation_down_limit
       )
    bpy.types.Camera.b4w_rotation_down_limit = b4w_rotation_down_limit

    # NOTE: fiction property for storing dynamically changing property
    bpy.types.Camera.b4w_rotation_down_limit_storage = bpy.props.FloatProperty(
            default = -math.pi / 2)


    def get_rotation_up_limit(self):
        value = self.b4w_rotation_up_limit_storage
        if getattr(self, "b4w_use_horizontal_clamping"):
            value = min(max(value, -math.pi / 2), math.pi / 2)
        return value

    def set_rotation_up_limit(self, value):
        if getattr(self, "b4w_use_horizontal_clamping"):
            value = min(max(value, -math.pi / 2), math.pi / 2)
        self.b4w_rotation_up_limit_storage = value

    b4w_rotation_up_limit = bpy.props.FloatProperty(
           name = "B4W: Rotation up limit",
           description = "Rotation up limit angle",
           default = math.pi / 2,
           min = -2 * math.pi,
           soft_min = -2 * math.pi,
           max = 2 * math.pi,
           soft_max = 2 * math.pi,
           precision = 1,
           subtype = "ANGLE",
           set = set_rotation_up_limit,
           get = get_rotation_up_limit
       )
    bpy.types.Camera.b4w_rotation_up_limit = b4w_rotation_up_limit

    # NOTE: fiction property for storing dynamically changing property
    bpy.types.Camera.b4w_rotation_up_limit_storage = bpy.props.FloatProperty(
            default = math.pi / 2)

    bpy.types.Camera.b4w_vertical_clamping_type = bpy.props.EnumProperty(
        name = "B4W: vertical clamping type",
        description = "Vertical clamping type",
        default = "LOCAL",
        items = [
            ("LOCAL", "Camera space", "Clamp angles in camera space"),
            ("WORLD", "World space", "Clamp angles in world space")
        ]
    )


    b4w_dof_front = bpy.props.FloatProperty(
           name = "B4W: DOF front distance",
           description = "Distance to the front DOF plane",
           default = 1.0,
           min = 0.0,
           soft_min = 0.0,
           max = 100000.0,
           soft_max = 100.0,
           precision = 3,
       )
    bpy.types.Camera.b4w_dof_front = b4w_dof_front
    
    b4w_dof_rear = bpy.props.FloatProperty(
           name = "B4W: DOF rear distance",
           description = "Distance to the rear DOF plane",
           default = 1.0,
           min = 0.0,
           soft_min = 0.0,
           max = 100000.0,
           soft_max = 100.0,
           precision = 3,
       )
    bpy.types.Camera.b4w_dof_rear = b4w_dof_rear

    b4w_dof_power = bpy.props.FloatProperty(
           name = "B4W: DOF power",
           description = "Strength of DOF blur",
           default = 3.0,
           min = 0.1,
           soft_min = 0.1,
           max = 20.0,
           soft_max = 20.0,
           precision = 2,
       )
    bpy.types.Camera.b4w_dof_power = b4w_dof_power

    add_speaker_properties()

    # for lamp panel
    b4w_generate_shadows = bpy.props.BoolProperty(
        name = "B4W: generate shadows",
        description = "Whether the lamp generates shadows",
        default = False
    )
    bpy.types.Lamp.b4w_generate_shadows = b4w_generate_shadows

    b4w_dynamic_intensity = bpy.props.BoolProperty(
        name = "B4W: dynamic intensity",
        description = "Whether sun changes intensity regardless to it position",
        default = False
    )
    bpy.types.Lamp.b4w_dynamic_intensity = b4w_dynamic_intensity

    # for mesh panel
    b4w_override_boundings = bpy.props.BoolProperty(
        name = "B4W: override boundings",
        description = "Override mesh boundings with specified values",
        default = False
    )
    bpy.types.Mesh.b4w_override_boundings = b4w_override_boundings

    b4w_boundings = bpy.props.PointerProperty(
        name = "B4W: boundings",
        type = B4W_BoundingsSettings
    )
    bpy.types.Mesh.b4w_boundings = b4w_boundings

    add_material_properties()

    add_texture_properties()

    add_particle_settings_properties()

def add_scene_properties():

    scene_type = bpy.types.Scene

    scene_type.b4w_use_nla = bpy.props.BoolProperty(
        name = "B4W: use NLA",
        description = "Use NLA to control animation and sounds on the scene",
        default = False
    )
    scene_type.b4w_nla_cyclic = bpy.props.BoolProperty(
        name = "B4W: cyclic NLA",
        description = "Repeat NLA animation",
        default = False
    )
    scene_type.b4w_enable_audio = bpy.props.BoolProperty(
        name = "B4W: enable audio",
        description = "Enable audio on this scene",
        default = True
    )
    scene_type.b4w_enable_dynamic_compressor = bpy.props.BoolProperty(
        name = "B4W: enable dynamic compressor",
        description = "Enable dynamic compression effect on this scene",
        default = False
    )
    scene_type.b4w_dynamic_compressor_settings = bpy.props.PointerProperty(
        name = "B4W: Dynamic compressor settings",
        type = B4W_DynamicCompressorSettings
    )

    scene_type.b4w_enable_convolution_engine = bpy.props.BoolProperty(
        name = "B4W: enable convolution engine",
        description = "Enable the convolution engine to allow linear (spacial) effects on this scene",
        default = False
    )

    b4w_enable_physics = bpy.props.BoolProperty(
        name = "B4W: enable physics",
        description = "Enable physics simulation on this scene",
        default = True
    )
    scene_type.b4w_enable_physics = b4w_enable_physics

    b4w_load_empty = bpy.props.BoolProperty(
        name = "B4W: load empty",
        description = "Don't add objects to the scene by default",
        default = False
    )
    scene_type.b4w_load_empty = b4w_load_empty

    b4w_render_shadows = bpy.props.BoolProperty(
        name = "B4W: render shadows",
        description = "Render shadows for the scene objects with the " +
                "\"B4W shadow cast\" and \"B4W shadow receive\" properties",
        default = True
    )
    scene_type.b4w_render_shadows = b4w_render_shadows

    b4w_render_reflections = bpy.props.BoolProperty(
        name = "B4W: render reflections",
        description = "Render reflections for the scene objects with the " +
                "\"B4W reflection cast\" and \"B4W reflection receive\" properties",
        default = False
    )
    scene_type.b4w_render_reflections = b4w_render_reflections

    b4w_render_refractions = bpy.props.BoolProperty(
        name = "B4W: render refractions",
        description = "Render refractions for the scene objects",
        default = False
    )
    scene_type.b4w_render_refractions = b4w_render_refractions

    b4w_enable_god_rays = bpy.props.BoolProperty(
        name = "B4W: enable god rays",
        description = "Enable god rays for the scene lights",
        default = False
    )
    scene_type.b4w_enable_god_rays = b4w_enable_god_rays
    
    b4w_enable_ssao = bpy.props.BoolProperty(
        name = "B4W: enable SSAO",
        description = "Enable screen space ambient occlusion",
        default = False
    )
    scene_type.b4w_enable_ssao = b4w_enable_ssao

    b4w_batch_grid_size = bpy.props.FloatProperty(
        name = "B4W: batch grid size",
        description = "Batch grid size in meters, pass zero value to " +
                "prevent grid use",
        default = 0.0,
        min = 0.0,
        soft_max = 1000.0,
        precision = 2
    )
    scene_type.b4w_batch_grid_size = b4w_batch_grid_size

    # see also b4w_anisotropic_filtering for texture
    b4w_anisotropic_filtering = bpy.props.EnumProperty(
        name = "B4W: anisotropic filtering",
        description = "Anisotropic filtering for all textures. May be overriden by individual textures",
        items = [
            ("OFF", "OFF", "0", 0),
            ("2x",  "2x",  "1", 1),
            ("4x",  "4x",  "2", 2),
            ("8x",  "8x",  "3", 3),
            ("16x", "16x", "4", 4)
        ]
    )
    scene_type.b4w_anisotropic_filtering = b4w_anisotropic_filtering

    b4w_enable_bloom = bpy.props.BoolProperty(
        name = "B4W: enable bloom",
        description = "Enable bloom",
        default = False
    )
    scene_type.b4w_enable_bloom = b4w_enable_bloom

    b4w_enable_motion_blur = bpy.props.BoolProperty(
        name = "B4W: enable motion blur",
        description = "Enable motion blur",
        default = False
    )
    scene_type.b4w_enable_motion_blur = b4w_enable_motion_blur

    b4w_enable_color_correction = bpy.props.BoolProperty(
        name = "B4W: enable color correction",
        description = "Enable color correction",
        default = False
    )
    scene_type.b4w_enable_color_correction = b4w_enable_color_correction

    b4w_enable_antialiasing = bpy.props.BoolProperty(
        name = "B4W: enable antialiasing",
        description = "Enable antialiasing",
        default = True
    )
    scene_type.b4w_enable_antialiasing = b4w_enable_antialiasing

    
def add_object_properties():
    """Add properties for the object panel"""

    obj_type = bpy.types.Object

    b4w_do_not_batch = bpy.props.BoolProperty(
        name = "B4W: do not batch",
        description = "Do not join this object with others having the same material",
        default = False
    )
    obj_type.b4w_do_not_batch = b4w_do_not_batch

    obj_type.b4w_dynamic_geometry = bpy.props.BoolProperty(
        name = "B4W: dynamic geometry",
        description = "Allow to use geometry update API for given object",
        default = False
    )

    obj_type.b4w_export_edited_normals = bpy.props.BoolProperty(
        name = "B4W: export edited normals",
        description = "Export baked vertex normals",
        default = False
    )

    obj_type.b4w_apply_modifiers = bpy.props.BoolProperty(
        name = "B4W: apply modifiers",
        description = "Apply object modifiers before export",
        default = False
    )

    b4w_do_not_cull = bpy.props.BoolProperty(
        name = "B4W: do not cull",
        description = "Do not use frustum culling for this object",
        default = False
    )
    obj_type.b4w_do_not_cull = b4w_do_not_cull

    obj_type.b4w_disable_fogging = bpy.props.BoolProperty(
        name = "B4W: disable fogging",
        description = "Prevent object to be fogged in",
        default = False
    )

    obj_type.b4w_do_not_render = bpy.props.BoolProperty(
        name = "B4W: do not render",
        description = "Object will not be rendered",
        default = False
    )

    b4w_shadow_cast = bpy.props.BoolProperty(
        name = "B4W: shadow cast",
        description = "The object will be rendered during the shadow pass",
        default = False
    )
    obj_type.b4w_shadow_cast = b4w_shadow_cast

    obj_type.b4w_shadow_cast_only = bpy.props.BoolProperty(
        name = "B4W: shadow cast only",
        description = "The object will not be rendered, but will cast a shadow",
        default = False
    )

    b4w_shadow_receive = bpy.props.BoolProperty(
        name = "B4W: shadow receive",
        description = "The object will receive shadows",
        default = False
    )
    obj_type.b4w_shadow_receive = b4w_shadow_receive

    b4w_reflexible = bpy.props.BoolProperty(
        name = "B4W: reflexible",
        description = "The object will be rendered during the reflection pass",
        default = False
    )
    obj_type.b4w_reflexible = b4w_reflexible

    b4w_reflexible_only = bpy.props.BoolProperty(
        name = "B4W: reflexible only",
        description = "The object will not be rendered, but will have a reflection",
        default = False
    )
    obj_type.b4w_reflexible_only = b4w_reflexible_only

    b4w_reflective = bpy.props.BoolProperty(
        name = "B4W: reflective",
        description = "The object will receive reflections",
        default = False,
        update = lambda self,context: add_remove_refl_plane(self)
    )
    obj_type.b4w_reflective = b4w_reflective

    b4w_caustics = bpy.props.BoolProperty(
        name = "B4W: caustics",
        description = "The object will receive caustics from water",
        default = False
    )
    obj_type.b4w_caustics = b4w_caustics

    obj_type.b4w_use_default_animation = bpy.props.BoolProperty(
        name = "B4W: use default animation",
        description = "The object will be animated if possible",
        default = False
    )
    obj_type.b4w_cyclic_animation = bpy.props.BoolProperty(
        name = "B4W: cyclic animation",
        description = "The object animation will be cyclically repeated",
        default = False
    )

    b4w_group_relative = bpy.props.BoolProperty(
        name = "B4W: group relative",
        description = "Use relative coords for group objects",
        default = False
    )
    obj_type.b4w_group_relative = b4w_group_relative

    obj_type.b4w_proxy_inherit_anim = bpy.props.BoolProperty(
        name = "B4W: inherit animation",
        description = "Inherit animation from proxy object to proxy source",
        default = True
    )

    b4w_wind_bending = bpy.props.BoolProperty(
        name = "B4W: wind bending",
        description = "Object will be bent by wind",
        default = False
    )
    obj_type.b4w_wind_bending = b4w_wind_bending

    b4w_wind_bending_angle = bpy.props.FloatProperty(
        name = "B4W: wind bending max angle",
        description = "Maximum angle amplitude of wind bending",
        default = 10.0,
        min = 0.0,
        soft_max = 90,
        precision = 1
    )
    obj_type.b4w_wind_bending_angle = b4w_wind_bending_angle

    b4w_wind_bending_freq = bpy.props.FloatProperty(
        name = "B4W: wind bending frequency",
        description = "Wind bending frequency in Hz",
        default = 0.25,
        min = 0.0,
        soft_max = 5.0,
        precision = 2
    )
    obj_type.b4w_wind_bending_freq = b4w_wind_bending_freq
    b4w_detail_bending_amp = bpy.props.FloatProperty(
        name = "B4W: detail bending amplitude",
        description = "Detail bending amplitude",
        default = 0.1,
        min = 0.0,
        soft_max = 1.0,
        precision = 4
    )
    obj_type.b4w_detail_bending_amp = b4w_detail_bending_amp

    b4w_branch_bending_amp = bpy.props.FloatProperty(
        name = "B4W: branch bending amplitude",
        description = "Branch bending amplitude",
        default = 0.3,
        min = 0.0,
        soft_max = 1.0,
        precision = 4
    )
    obj_type.b4w_branch_bending_amp = b4w_branch_bending_amp

    b4w_detail_bending_freq = bpy.props.FloatProperty(
        name = "B4W: detail bending frequency",
        description = "Wind bending detail frequency coefficient",
        default = 1.0,
        min = 0.0,
        soft_max = 5.0,
        precision = 3
    )
    obj_type.b4w_detail_bending_freq = b4w_detail_bending_freq

    b4w_main_bend_stiffness_col = bpy.props.StringProperty(
        name = "B4W: Main stiffness vertex color",
        description = "Vertex color for main bending stiffness (A channel)", 
        default = ""
    )
    obj_type.b4w_main_bend_stiffness_col = b4w_main_bend_stiffness_col

    b4w_selectable = bpy.props.BoolProperty(
        name = "B4W: selectable",
        description = "Object can be selected (color picking) and glowed",
        default = False
    )
    obj_type.b4w_selectable = b4w_selectable

    obj_type.b4w_glow_settings = bpy.props.PointerProperty(
        name = "B4W: glow settings",
        type = B4W_GlowSettings
    ) 

    obj_type.b4w_collision = bpy.props.BoolProperty(
        name = "B4W: detect collisions",
        description = "Object will be tested for collisions",
        default = False
    )
    obj_type.b4w_collision_id = bpy.props.StringProperty(
        name = "B4W: collision ID",
        description = "Collision ID for internal application purposes", 
        default = ""
    )

    obj_type.b4w_vehicle = bpy.props.BoolProperty(
        name = "B4W: enable vehicle",
        description = "Object will be part of the vehicle",
        default = False
    )

    obj_type.b4w_vehicle_settings = bpy.props.PointerProperty(
        name = "B4W: vehicle settings",
        type = B4W_VehicleSettings
    ) 

    obj_type.b4w_floating = bpy.props.BoolProperty(
        name = "B4W: enable floating",
        description = "Object will react to water surface",
        default = False
    )

    obj_type.b4w_floating_settings = bpy.props.PointerProperty(
        name = "B4W: floating settings",
        type = B4W_FloatingSettings
    )

    obj_type.b4w_character = bpy.props.BoolProperty(
        name = "B4W: enable character",
        description = "Object will be controlled by the player",
        default = False
    )

    obj_type.b4w_character_settings = bpy.props.PointerProperty(
        name = "B4W: character settings",
        type = B4W_CharacterSettings
    ) 

    # not exported
    obj_type.b4w_anim_clean_keys = bpy.props.BoolProperty(
        name = "B4W: animation clean keys",
        description = "Perform clean keyframes optimization after animation baking",
        default = True
    )

    # not exported
    obj_type.b4w_loc_export_vertex_anim = bpy.props.BoolProperty(
        name = "B4W: export vertex animation",
        description = "Export baked vertex animation",
        default = False
    )

    b4w_lod_distance = bpy.props.FloatProperty(
        name = "B4W: LOD distance",
        description = "LOD maximum distance",
        default = 10000,
        min = 0.0,
        max = 100000,
        soft_min = 0,
        soft_max = 10000,
        step = 10,
        precision = 2
    )
    obj_type.b4w_lod_distance = b4w_lod_distance

    obj_type.b4w_lods = bpy.props.CollectionProperty(
            type=B4W_LodProperty, 
            name="B4W: LODS")

    obj_type.b4w_lod_index = bpy.props.IntProperty(
            name="B4W: LOD index",
            description="LOD index used in the interface",
            default=0, min=0, max=100, soft_min=0, soft_max=5
    )

    obj_type.b4w_refl_plane_index = bpy.props.IntProperty(
            name="B4W: Reflection Plane index",
            description="Reflection plane index used in the interface",
            default=0, min=0, max=100, soft_min=0, soft_max=5
    )

    obj_type.b4w_detail_bend_colors = bpy.props.PointerProperty(
            type=B4W_DetailBendingColors, 
            name="B4W: Detail Bend")

    obj_type.b4w_correct_bounding_offset = bpy.props.EnumProperty(
        name = "B4W: correct the bounding box",
        description = "Correct the bounding box",
        default = "AUTO",
        items = [
            ("AUTO", "AUTO", "Auto selection bounding offset"),
            ("OFF",  "OFF",  "Disable bounding offset correction"),
            ("ON",   "ON",   "Enable bounding offset correction")
        ]
    )

def add_speaker_properties():
    """Add properties for the speaker panel"""

    spk_type = bpy.types.Speaker

    spk_type.b4w_behavior = bpy.props.EnumProperty(
        name = "B4W: speaker behavior",
        description = "Speaker behavior",
        default = "POSITIONAL",
        items = [
            ("POSITIONAL", "Positional sound", "Positional speaker"),
            ("BACKGROUND_SOUND", "Background sound", "Background sound"),
            ("BACKGROUND_MUSIC", "Background music", "Background music")
        ]
    )
    spk_type.b4w_disable_doppler = bpy.props.BoolProperty(
        name = "B4W: disable doppler",
        description = "Disable the Doppler effect",
        default = False
    )

    spk_type.b4w_cyclic_play = bpy.props.BoolProperty(
        name = "B4W: cyclic play",
        description = "Loop speaker play",
        default = False
    )
    spk_type.b4w_delay = bpy.props.FloatProperty(
        name = "B4W: delay",
        description = "Delay after playback start",
        default = 0.0,
        min = 0.0,
        soft_max = 120,
        precision = 3
    )
    spk_type.b4w_delay_random = bpy.props.FloatProperty(
        name = "B4W: random delay",
        description = "Randomized delay increment",
        default = 0.0,
        min = 0.0,
        soft_max = 120,
        precision = 3
    )

    spk_type.b4w_volume_random = bpy.props.FloatProperty(
        name = "B4W: random volume",
        description = "Randomized volume decrement",
        default = 0.0,
        min = 0.0,
        max = 1.0,
        step = 0.1,
        precision = 3
    )

    spk_type.b4w_pitch_random = bpy.props.FloatProperty(
        name = "B4W: random volume",
        description = "Randomized pitch increment",
        default = 0.0,
        min = 0.0,
        soft_max = 120,
        step = 0.1,
        precision = 3
    )

    spk_type.b4w_fade_in = bpy.props.FloatProperty(
        name = "B4W: fade-in interval",
        description = "Fade-in interval",
        default = 0.0,
        min = 0.0,
        soft_max = 120,
        step = 0.1,
        precision = 3
    )
    spk_type.b4w_fade_out = bpy.props.FloatProperty(
        name = "B4W: fade-out interval",
        description = "Fade-out interval",
        default = 0.0,
        min = 0.0,
        soft_max = 120,
        step = 0.1,
        precision = 3
    )

    spk_type.b4w_loop = bpy.props.BoolProperty(
        name = "B4W: loop",
        description = "Make loop",
        default = False
    )
    spk_type.b4w_loop_count = bpy.props.IntProperty(
        name = "B4W: loop count",
        description = "Max count of loop repeats, 0 for infinite looping",
        default = 0,
        min = 0,
        max = 1000
    )
    spk_type.b4w_loop_count_random = bpy.props.IntProperty(
        name = "B4W: random loop count",
        description = "Randomized loop count increment",
        default = 0,
        min = 0,
        max = 1000
    )

    spk_type.b4w_playlist_id = bpy.props.StringProperty(
        name = "B4W: playlist ID",
        description = "Playlist ID", 
        default = ""
    )

def add_material_properties():
    """Add properties for the material panel"""

    mat_type = bpy.types.Material

    mat_type.b4w_water = bpy.props.BoolProperty(
        name = "B4W: water",
        description = "Special water material",
        default = False
    )
    mat_type.b4w_water_shore_smoothing = bpy.props.BoolProperty(
        name = "B4W: shore smoothing",
        description = "Perform the smoothing between the water and the shore objects",
        default = False
    )
    mat_type.b4w_water_dynamic = bpy.props.BoolProperty(
        name = "B4W: water dynamic",
        description = "Dynamic water surface",
        default = False 
    )
    mat_type.b4w_waves_height = bpy.props.FloatProperty(
        name = "B4W: waves height",
        description = "Waves height",
        default = 0.0,
        min = 0.0,
        soft_min = 0.0,
        max = 10.0,
        soft_max = 5.0,
        step = 0.1,
        precision = 3
    )
    mat_type.b4w_waves_length = bpy.props.FloatProperty(
        name = "B4W: waves length",
        description = "Waves length",
        default = 10.0,
        min = 0.01,
        soft_min = 0.01,
        max = 200.0,
        soft_max = 100.0,
        step = 0.1,
        precision = 3
    )
    mat_type.b4w_water_absorb_factor = bpy.props.FloatProperty(
        name = "B4W: water absorbtion factor",
        description = "Water absorbtion factor",
        default = 6.0,
        min = 0.0,
        soft_min = 0.0,
        max = 100.0,
        soft_max = 1.0,
        step = 0.1,
        precision = 3
    )
    mat_type.b4w_water_dst_noise_scale0 = bpy.props.FloatProperty(
        name = "B4W: distant noise scale",
        description = "Distant waves noise scale (first component)",
        default = 0.05,
        min = 0.0,
        soft_min = 0.0,
        max = 1.0,
        soft_max = 1.0,
        step = 0.1,
        precision = 3
    )
    mat_type.b4w_water_dst_noise_scale1 = bpy.props.FloatProperty(
        name = "B4W: distant noise scale factor",
        description = "Distant waves noise scale (second component)",
        default = 0.03,
        min = 0.0,
        soft_min = 0.0,
        max = 1.0,
        soft_max = 1.0,
        step = 0.1,
        precision = 3
    )
    mat_type.b4w_water_dst_noise_freq0 = bpy.props.FloatProperty(
        name = "B4W: distant noise frequency",
        description = "Distant waves noise frequency (first component)",
        default = 1.3,
        min = 0.0,
        soft_min = 0.0,
        max = 10.0,
        soft_max = 10.0,
        step = 0.1,
        precision = 3
    )
    mat_type.b4w_water_dst_noise_freq1 = bpy.props.FloatProperty(
        name = "B4W: distant noise frequency",
        description = "Distant waves noise frequency (second component)",
        default = 1.0,
        min = 0.0,
        soft_min = 0.0,
        max = 10.0,
        soft_max = 10.0,
        step = 0.1,
        precision = 3
    )
    mat_type.b4w_water_dir_min_shore_fac = bpy.props.FloatProperty(
        name = "B4W: directional min shore factor",
        description = "Minimum shore factor for directional waves",
        default = 0.4,
        min = 0.0,
        soft_min = 0.0,
        max = 1.0,
        soft_max = 1.0,
        step = 0.1,
        precision = 3
    )
    mat_type.b4w_water_dir_freq = bpy.props.FloatProperty(
        name = "B4W: directional waves frequency",
        description = "Directional waves frequency",
        default = 0.5,
        min = 0.0,
        soft_min = 0.0,
        max = 10.0,
        soft_max = 10.0,
        step = 0.1,
        precision = 3
    )
    mat_type.b4w_water_dir_noise_scale = bpy.props.FloatProperty(
        name = "B4W: directional noise scale",
        description = "Directional waves noise scale",
        default = 0.05,
        min = 0.0,
        soft_min = 0.0,
        max = 1.0,
        soft_max = 5.0,
        step = 0.1,
        precision = 3
    )
    mat_type.b4w_water_dir_noise_freq = bpy.props.FloatProperty(
        name = "B4W: directional noise frequency",
        description = "Directional waves noise frequency",
        default = 0.07,
        min = 0.0,
        soft_min = 0.0,
        max = 1.0,
        soft_max = 1.0,
        step = 0.1,
        precision = 3
    )
    mat_type.b4w_water_dir_min_noise_fac = bpy.props.FloatProperty(
        name = "B4W: directional minimum noise factor",
        description = "Directional waves minimum noise factor",
        default = 0.5,
        min = 0.0,
        soft_min = 0.0,
        max = 1.0,
        soft_max = 1.0,
        step = 0.1,
        precision = 3
    )
    mat_type.b4w_water_dst_min_fac = bpy.props.FloatProperty(
        name = "B4W: distant waves min factor",
        description = "Distant waves min factor",
        default = 0.2,
        min = 0.0,
        soft_min = 0.0,
        max = 1.0,
        soft_max = 1.0,
        step = 0.1,
        precision = 3
    )
    mat_type.b4w_water_waves_hor_fac = bpy.props.FloatProperty(
        name = "B4W: waves horizontal factor",
        description = "Waves horizontal factor",
        default = 5.0,
        min = 0.0,
        soft_min = 0.0,
        max = 10.0,
        soft_max = 10.0,
        step = 0.1,
        precision = 3
    )
    mat_type.b4w_water_absorb_factor = bpy.props.FloatProperty(
        name = "B4W: water absorb factor",
        description = "Water absorb factor",
        default = 6.0,
        min = 0.0,
        soft_min = 0.0,
        max = 100.0,
        soft_max = 100.0,
        step = 0.1,
        precision = 3
    )
    mat_type.b4w_generated_mesh = bpy.props.BoolProperty(
        name = "B4W: water generated mesh",
        description = "Generate a multigrid mesh for the water",
        default = False
    )
    mat_type.b4w_water_num_cascads = bpy.props.IntProperty(
        name = "B4W: water num cascades",
        description = "Number of cascades in the water mesh",
        default = 5,
        min = 1,
        soft_min = 1,
        max = 20,
        soft_max = 20,
    )
    mat_type.b4w_water_subdivs = bpy.props.IntProperty(
        name = "B4W: water subdivs",
        description = "Number of subdivisions in the water mesh cascade (must be POT)",
        default = 64,
        min = 2,
        soft_min = 1,
        max = 512,
        soft_max = 512,
    )
    mat_type.b4w_water_detailed_dist = bpy.props.IntProperty(
        name = "B4W: water detailed distance",
        description = "Distance of the biggest cascade in the water mesh",
        default = 1000,
        min = 1,
        soft_min = 1,
        max = 10000,
        soft_max = 5000,
    )
    mat_type.b4w_water_fog_color = bpy.props.FloatVectorProperty(
        name = "B4W: water fog color",
        description = "Color of fog applied to the underwater objects",
        default = (0.5, 0.5, 0.5),
        min = 0.0,
        soft_min = 0.0,
        max = 1.0,
        soft_max = 1.0,
        precision = 3,
        subtype = 'COLOR',
        size = 3
    )
    mat_type.b4w_water_fog_density = bpy.props.FloatProperty(
        name = "B4W: water fog density",
        description = "Density of fog applied to the underwater objects",
        default = 0.06,
        min = 0.0,
        soft_min = 0.0,
        max = 1.0,
        soft_max = 1.0,
        step = 0.1,
        precision = 4
    )
    mat_type.b4w_foam_factor = bpy.props.FloatProperty(
        name = "B4W: foam factor",
        description = "Water foam intensity factor",
        default = 0.5,
        min = 0.0,
        soft_min = 0.0,
        max = 1.0,
        soft_max = 1.0,
        step = 0.01,
        precision = 3
    )
    mat_type.b4w_shallow_water_col = bpy.props.FloatVectorProperty(
        name = "B4W: shallow water color",
        description = "Color of the shallow water",
        default = (0.0, 0.8, 0.3),
        min = 0,
        soft_min = 0,
        max = 1,
        soft_max = 1,
        subtype = 'COLOR',
    )
    mat_type.b4w_shore_water_col = bpy.props.FloatVectorProperty(
        name = "B4W: shore water color",
        description = "Color of the shallow water",
        default = (0.0, 0.9, 0.2),
        min = 0,
        soft_min = 0,
        max = 1,
        soft_max = 1,
        subtype = 'COLOR',
    )
    mat_type.b4w_shallow_water_col_fac = bpy.props.FloatProperty(
        name = "B4W: shallow water col factor",
        description = "Shallow water color factor",
        default = 1.0,
        min = 0.0,
        max = 2.0,
        step = 0.01,
        precision = 2,
    )
    mat_type.b4w_shore_water_col_fac = bpy.props.FloatProperty(
        name = "B4W: shore water col factor",
        description = "Shore water color factor",
        default = 0.5,
        min = 0.0,
        max = 2.0,
        step = 0.01,
        precision = 2,
    )
    mat_type.b4w_water_sss_strength = bpy.props.FloatProperty(
        name = "B4W: water sss strength",
        description = "Strength of subsurface scattering",
        default = 5.9,
        min = 0.0,
        max = 100.0,
        step = 0.1,
        precision = 2,
    )
    mat_type.b4w_water_sss_width = bpy.props.FloatProperty(
        name = "B4W: water sss strength",
        description = "Width of subsurface scattering",
        default = 0.45,
        min = 0.0,
        max = 1.0,
        step = 0.01,
        precision = 2,
    )

    mat_type.b4w_terrain = bpy.props.BoolProperty(
        name = "B4W: Terrain dynamic grass",
        description = "Special material for terrain dynamic grass",
        default = False
    )
    mat_type.b4w_dynamic_grass_size = bpy.props.StringProperty(
        name = "B4W: Dynamic grass size",
        description = "Optional vertex color used for grass sizing (R)", 
        default = ""
    )
    mat_type.b4w_dynamic_grass_color = bpy.props.StringProperty(
        name = "B4W: Dynamic grass color",
        description = "Optional vertex color used for grass tinting", 
        default = ""
    )

    mat_type.b4w_skydome = bpy.props.BoolProperty(
        name = "B4W: skydome",
        description = "Special skydome material",
        default = False
    )
    mat_type.b4w_procedural_skydome = bpy.props.BoolProperty(
        name = "B4W: procedural skydome",
        description = "Sky will be generated procedurally",
        default = False
    )

    mat_type.b4w_collision = bpy.props.BoolProperty(
        name = "B4W: collision",
        description = "Special collision material",
        default = False
    )
    mat_type.b4w_use_ghost = bpy.props.BoolProperty(
        name = "B4W: Ghost",
        description = "Material does not react to collisions like a ghost",
        default = False
    )
    mat_type.b4w_collision_id = bpy.props.StringProperty(
        name = "B4W: collision ID",
        description = "Collision ID for internal application purposes", 
        default = ""
    )

    mat_type.b4w_double_sided_lighting = bpy.props.BoolProperty(
        name = "B4W: double-sided lighting",
        description = "Enable double-sided lighting for the material by flipping the normals",
        default = False
    )

    mat_type.b4w_halo_sky_stars = bpy.props.BoolProperty(
        name = "B4W: halo sky stars",
        description = "Make halo material stars object",
        default = False
    )

    mat_type.b4w_halo_stars_blend_height = bpy.props.FloatProperty(
        name = "B4W: halo stars blending height",
        description = "Stars blending height",
        default = 10.0
    )

    mat_type.b4w_halo_stars_min_height = bpy.props.FloatProperty(
        name = "B4W: halo stars minimum height",
        description = "Stars minimum height starting from the origin",
        default = 0.0
    )

    mat_type.b4w_collision_group = bpy.props.BoolVectorProperty(
        name = "B4W: collision group",
        subtype = "LAYER",
        description = "Material collision group",
        default = (False, False, False, False, False, False, False, True),
        size = 8
    )

    mat_type.b4w_collision_mask = bpy.props.BoolVectorProperty(
        name = "B4W: collision mask",
        subtype = "LAYER",
        description = "Material collision mask",
        default = (True, True, True, True, True, True, True, False),
        size = 8
    )

    mat_type.b4w_wettable = bpy.props.BoolProperty(
        name = "B4W: wettable",
        description = "Material will get wet near water",
        default = False,
    )

def add_texture_properties():
    """Add properties for texture panel"""

    b4w_use_map_parallax = bpy.props.BoolProperty(
        name = "B4W: use map parallax",
        description = "The texture's alpha channel will be used as the heightmap for warping",
        default = False
    )
    bpy.types.Texture.b4w_use_map_parallax = b4w_use_map_parallax

    b4w_parallax_scale = bpy.props.FloatProperty(
        name = "B4W: parallax scale",
        description = "Scale parameter for texture warping. Height (e.g. 3 cm) is devided by the texture covering size (e.g. 1.5 m)",
        default = 0.02,
        min = 0.0,
        soft_max = 0.1,
        precision = 3
    )
    bpy.types.Texture.b4w_parallax_scale = b4w_parallax_scale;

    b4w_parallax_steps = bpy.props.IntProperty(
        name = "B4W: parallax steps",
        description = "Number of steps taken to build a parallax surface (the more the better)",
        default = 5,
        soft_max = 30,
        min = 1,
        max = 30
    )
    bpy.types.Texture.b4w_parallax_steps = b4w_parallax_steps;

    # see also b4w_anisotropic_filtering for scene
    b4w_anisotropic_filtering = bpy.props.EnumProperty(
        name = "B4W: anisotropic filtering",
        description = "Anisotropic filtering for the texture",
        items = [
            ("DEFAULT", "DEFAULT", "0", 0),
            ("OFF",     "OFF",     "1", 1),
            ("2x",      "2x",      "2", 2),
            ("4x",      "4x",      "3", 3),
            ("8x",      "8x",      "4", 4),
            ("16x",     "16x",     "5", 5)
        ]
    )
    bpy.types.Texture.b4w_anisotropic_filtering = b4w_anisotropic_filtering

    # NOTE: it is saved to texture, so there may be issues when textures are shared between materials
    b4w_uv_velocity_trans = bpy.props.FloatVectorProperty(
        name = "B4W: UV translation velocity",
        description = "UV translation velocity for the animated texture",
        default = (0.0, 0.0),
        min = -99.0,
        max = 99.0,
        precision = 3,
        size = 2
    )
    bpy.types.Texture.b4w_uv_velocity_trans = b4w_uv_velocity_trans

    b4w_water_foam = bpy.props.BoolProperty(
        name = "B4W: Water foam",
        description = "Use texture as foam on the water surface",
        default = False
    )
    bpy.types.Texture.b4w_water_foam = b4w_water_foam

    b4w_foam_uv_freq = bpy.props.FloatVectorProperty(
        name = "B4W: Foam UV frequency",
        description = "Foam UV translation frequency",
        default = (1.0, 1.0),
        min = -99.0,
        max = 99.0,
        precision = 3,
        size = 2
    )
    bpy.types.Texture.b4w_foam_uv_freq = b4w_foam_uv_freq

    b4w_foam_uv_magnitude = bpy.props.FloatVectorProperty(
        name = "B4W: Foam UV magnitude",
        description = "Foam UV translation frequency",
        default = (1.0, 1.0),
        min = -99.0,
        max = 99.0,
        precision = 3,
        size = 2
    )
    bpy.types.Texture.b4w_foam_uv_magnitude = b4w_foam_uv_magnitude

    b4w_shore_dist_map = bpy.props.BoolProperty(
        name = "B4W: Shore distance map",
        description = "Use the texture as a shore distance map on the water surface",
        default = False
    )
    bpy.types.Texture.b4w_shore_dist_map = b4w_shore_dist_map

    b4w_render_scene = bpy.props.StringProperty(
        name = "B4W: scene",
        description = "Name of the scene, which will be rendered on the texture", 
        default = ""
    )
    bpy.types.Texture.b4w_render_scene = b4w_render_scene

    b4w_shore_boundings = bpy.props.FloatVectorProperty(
        name = "B4W: shore boundings",
        description = "Boundings of the water-to-shore distance map",
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
        name = "B4W: maximum shore distance",
        description = "Maximum distance to shore in meters (taken as 1.0)",
        default = 100.0,
        min = 0.0,
        max = 100000.0,
        step = 5.0,
        precision = 1,
    )
    bpy.types.Texture.b4w_max_shore_dist = b4w_max_shore_dist

    b4w_disable_compression = bpy.props.BoolProperty(
        name = "B4W: disable compression",
        description = "Do not use DDS file for this texture",
        default = False
    )
    bpy.types.Texture.b4w_disable_compression = b4w_disable_compression

def add_particle_settings_properties():

    pset_type = bpy.types.ParticleSettings

    """Add properties for particles panel"""
    b4w_cyclic = bpy.props.BoolProperty(
        name = "B4W: cyclic emission",
        description = "Loop particles emission",
        default = False
    )
    pset_type.b4w_cyclic = b4w_cyclic

    b4w_randomize_emission = bpy.props.BoolProperty(
        name = "B4W: randomize emission",
        description = "Randomize the delay for particles emission",
        default = False
    )
    pset_type.b4w_randomize_emission = b4w_randomize_emission

    b4w_fade_in = bpy.props.FloatProperty(
        name = "B4W: fade-in interval",
        description = "Fade-in interval for particles",
        default = 0.0,
        min = 0.0,
        soft_max = 120,
        precision = 3
    )
    pset_type.b4w_fade_in = b4w_fade_in

    b4w_fade_out = bpy.props.FloatProperty(
        name = "B4W: fade-out interval",
        description = "Fade-out interval for particles",
        default = 0.0,
        min = 0.0,
        soft_max = 120,
        precision = 3
    )
    pset_type.b4w_fade_out = b4w_fade_out

    pset_type.b4w_billboard_align = bpy.props.EnumProperty(
        name = "B4W: billboard align",
        description = "Billboard alignment in the world space",
        default = "VIEW",
        items = [
            ("VIEW", "View", "Align to view (active camera)"),
            ("XY", "XY plane", "Align in XY plane"),
            ("YZ", "YZ plane", "Align in YZ plane"),
            ("ZX", "ZX plane", "Align in ZX plane")
        ]
    )

    # "HAIR"
    pset_type.b4w_dynamic_grass = bpy.props.BoolProperty(
        name = "B4W: dynamic grass",
        description = "Render on the terrain materials as dynamic grass",
        default = False
    )
    pset_type.b4w_dynamic_grass_scale_threshold = bpy.props.FloatProperty(
        name = "B4W: dynamic grass scale threshold",
        description = "Scale threshold for dynamic grass",
        default = 0.01,
        min = 0.0,
        max = 1.0,
        step = 5.0,
        precision = 3
    )
    pset_type.b4w_randomize_location = bpy.props.BoolProperty(
        name = "B4W: randomize location and size",
        description = "Randomize location and size (±25%) of hair particle objects",
        default = True
    )
    pset_type.b4w_initial_rand_rotation = bpy.props.BoolProperty(
        name = "B4W: initial random rotation",
        description = "Initial random rotation of hair particle objects",
        default = True
    )
    pset_type.b4w_rand_rotation_strength = bpy.props.FloatProperty(
        name = "B4W: random rotation strength",
        description = "Strength of initial random rotation",
        default = 1.0,
        min = 0.0,
        max = 1.0,
        precision = 3
    )
    pset_type.b4w_rotation_type = bpy.props.EnumProperty(
        name = "B4W: rotation type",
        description = "Rotation type of hair particle objects",
        default = "Z",
        items = [
            ("Z", "Z axis", "Rotation around Z axis"),
            ("XYZ", "Random axis", "Rotation around random axis"),
        ]
    )

    pset_type.b4w_hair_billboard = bpy.props.BoolProperty(
        name = "B4W: hair billboard",
        description = "Make billboards from hair particle objects",
        default = False
    )
    pset_type.b4w_hair_billboard_type = bpy.props.EnumProperty(
        name = "B4W: hair billboard type",
        description = "Hair billboard type",
        default = "BASIC",
        items = [
            ("BASIC", "Basic", "Basic one-sided billboarding"),
            ("RANDOM", "Random", "Random two-sided billboarding"),
            ("JITTERED", "Jittered", "One-sided billboarding with jittering"),
        ]
    )
    pset_type.b4w_hair_billboard_jitter_amp = bpy.props.FloatProperty(
        name = "B4W: hair billboard jitter amp",
        description = "Coefficient of the jittering amplitude for the billboard",
        default = 0.0,
        min = 0.0,
        max = 1.0,
        step = 0.001,
        precision = 3
    )
    pset_type.b4w_hair_billboard_jitter_freq = bpy.props.FloatProperty(
        name = "B4W: hair billboard jitter freq",
        description = "Jittering frequency for the billboard, Hz",
        default = 0.0,
        min = 0.0,
        max = 100.0,
        step = 0.001,
        precision = 3
    )
    pset_type.b4w_hair_billboard_geometry = bpy.props.EnumProperty(
        name = "B4W: hair billboard geometry type",
        description = "Hair billboard geometry type",
        default = "SPHERICAL",
        items = [
            ("SPHERICAL", "Spherical", "Spherical billboarding"),
            ("CYLINDRICAL", "Cylindrical", "Cylindrical billboarding"),
        ]
    )

    pset_type.b4w_wind_bend_inheritance = bpy.props.EnumProperty(
        name = "B4W: wind bend inheritance",
        description = "Wind bending inheritance",
        items = [
            ("PARENT", "Parent", "inherit from parent"),
            ("INSTANCE", "Instance", "inherit from instance"),
        ],
        default = "PARENT"
    )

    pset_type.b4w_shadow_inheritance = bpy.props.EnumProperty(
        name = "B4W: shadow inheritance",
        description = "Shadow inheritance",
        items = [
            ("PARENT", "Parent", "inherit from parent"),
            ("INSTANCE", "Instance", "inherit from instance"),
        ],
        default = "PARENT"
    )

    pset_type.b4w_reflection_inheritance = bpy.props.EnumProperty(
        name = "B4W: reflection inheritance",
        description = "Reflection inheritance",
        items = [
            ("PARENT", "Parent", "inherit from parent"),
            ("INSTANCE", "Instance", "inherit from instance"),
        ],
        default = "PARENT"
    )

    pset_type.b4w_vcol_from_name = bpy.props.StringProperty(
        name = "B4W: vcol from name",
        description = "Vertex color from emitter",
        default = ""
    )

    pset_type.b4w_vcol_to_name = bpy.props.StringProperty(
        name = "B4W: vcol to name",
        description = "Vertex color on instance",
        default = ""
    )

def register(): 
    bpy.utils.register_class(B4W_LodProperty)
    bpy.utils.register_class(B4W_VehicleSettings)
    bpy.utils.register_class(B4W_GlowSettings)
    bpy.utils.register_class(B4W_FloatingSettings)
    bpy.utils.register_class(B4W_CharacterSettings)
    bpy.utils.register_class(B4W_SSAOSettings)
    bpy.utils.register_class(B4W_GodRaysSettings)
    bpy.utils.register_class(B4W_ColorCorrectionSettings)
    bpy.utils.register_class(B4W_ShadowSettings)
    bpy.utils.register_class(B4W_DetailBendingColors)
    bpy.utils.register_class(B4W_SkySettings)
    bpy.utils.register_class(B4W_BloomSettings)
    bpy.utils.register_class(B4W_DynamicCompressorSettings)
    bpy.utils.register_class(B4W_MotionBlurSettings)
    bpy.utils.register_class(B4W_BoundingsSettings)
    add_b4w_props()

def unregister(): 
    bpy.utils.unregister_class(B4W_LodProperty)
    bpy.utils.unregister_class(B4W_VehicleSettings)
    bpy.utils.unregister_class(B4W_GlowSettings)
    bpy.utils.unregister_class(B4W_FloatingSettings)
    bpy.utils.unregister_class(B4W_CharacterSettings)
    bpy.utils.unregister_class(B4W_SSAOSettings)
    bpy.utils.unregister_class(B4W_GodRaysSettings)
    bpy.utils.unregister_class(B4W_ColorCorrectionSettings)
    bpy.utils.unregister_class(B4W_ShadowSettings)
    bpy.utils.unregister_class(B4W_DetailBendingColors)
    bpy.utils.unregister_class(B4W_SkySettings)
    bpy.utils.unregister_class(B4W_BloomSettings)
    bpy.utils.unregister_class(B4W_DynamicCompressorSettings)
    bpy.utils.unregister_class(B4W_MotionBlurSettings)
    bpy.utils.unregister_class(B4W_BoundingsSettings)

