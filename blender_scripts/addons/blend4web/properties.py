import bpy
import mathutils
import math
import os
import cProfile
from .interface import *
from . import nla_script

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

class B4W_Tags(bpy.types.PropertyGroup):
    title = bpy.props.StringProperty(
        name = "Title",
        description = "Title",
        default = ""
    )
    description = bpy.props.StringProperty(
        name = "Description",
        description = "Description",
        default = ""
    )
    desc_source = bpy.props.EnumProperty(
        name = "Description source",
        description = "",
        default = "TEXT",
        items = [
            ("TEXT", "Text", "Get description from text field"),
            ("FILE", "File", "Get description from file")
        ]
    )

class B4W_Object_Tags(bpy.types.PropertyGroup):
    title = bpy.props.StringProperty(
        name = "Title",
        description = "Title",
        default = ""
    )
    description = bpy.props.StringProperty(
        name = "Description",
        description = "Description",
        default = "",
        maxlen = 1000
    )
    desc_source = bpy.props.EnumProperty(
        name = "Description source",
        description = "",
        default = "TEXT",
        items = [
            ("TEXT", "Text", "Get description from text field"),
            ("FILE", "File", "Get description from file")
        ]
    )
    category = bpy.props.StringProperty(
        name = "Class",
        description = "Class",
        default = ""
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

class B4W_OutlineSettings(bpy.types.PropertyGroup):
    outline_duration = bpy.props.FloatProperty(
        name = "Outline duration",
        description = "Outline duration",
        default = 1.0,
        min = 0.01,
        soft_max = 10.0,
        max = 1000.0,
        step = 1,
        precision = 2
    )
    outline_period = bpy.props.FloatProperty(
        name = "Outline peroid",
        description = "Outline period",
        default = 1.0,
        min = 0.01,
        soft_max = 10.0,
        max = 1000.0,
        step = 1,
        precision = 2
    )
    outline_relapses = bpy.props.IntProperty(
        name = "Outline relapses",
        description = "Outline relapses",
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

    csm_resolution = bpy.props.EnumProperty(
        name = "csm_resolution",
        description = "Shadow map resolution",
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
        name = "self_shadow_polygon_offset",
        description = "Polygon offset value to prevent shadow acne",
        default = 1,
        min = 0,
        soft_max = 50,
        step = 10,
        precision = 2
    )

    self_shadow_normal_offset = bpy.props.FloatProperty(
        name = "self_shadow_normal_offset",
        description = "Normal offset value to prevent shadow acne",
        default = 0.01,
        min = 0,
        soft_max = 1,
        step = 0.1,
        precision = 3
    )

    b4w_enable_csm  = bpy.props.BoolProperty(
        name = "b4w_enable_csm",
        description = "Enable cascaded shadow maps",
        default = False
    )

    csm_num = bpy.props.IntProperty(
        name = "csm_num",
        description = "Number of cascaded shadow maps",
        default = 1,
        min = 1,
        max = 4
    )

    csm_first_cascade_border = bpy.props.FloatProperty(
        name = "csm_first_cascade_border",
        description = "Shadow map first cascade border",
        default = 10,
        min = 0.01,
        soft_max = 100,
        step = 10,
        precision = 2
    )

    first_cascade_blur_radius = bpy.props.FloatProperty(
        name = "first_cascade_blur_radius",
        description = "PCF blur radius for the first cascade",
        default = 3,
        min = 0,
        soft_max = 10,
        step = 10,
        precision = 2
    )

    csm_last_cascade_border = bpy.props.FloatProperty(
        name = "csm_last_cascade_border",
        description = "Shadow map last cascade border",
        default = 100,
        min = 0.01,
        soft_max = 100,
        step = 10,
        precision = 2
    )

    last_cascade_blur_radius = bpy.props.FloatProperty(
        name = "last_cascade_blur_radius",
        description = "PCF blur radius for the last cascade",
        default = 1.5,
        min = 0,
        soft_max = 10,
        step = 10,
        precision = 2
    )

    fade_last_cascade = bpy.props.BoolProperty(
        name = "fade_last_cascade",
        description = "The last cascade will be faded out",
        default = True
    )

    blend_between_cascades = bpy.props.BoolProperty(
        name = "blend_between_cascades",
        description = "Neighbouring cascades will be blended with each other",
        default = True
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
        default = 3.0,
        min = 0.0,
        max = 15.0,
        step = 0.01,
        precision = 2
    )

    hemisphere = bpy.props.BoolProperty(
        name = "hemisphere",
        description = "Calculation ssao with hemisphere",
        default = False
    )

    blur_depth = bpy.props.BoolProperty(
        name = "blur_depth",
        description = "Apply edge-preserving blur to ssao",
        default = False
    )

    blur_discard_value = bpy.props.FloatProperty(
        name = "blur_discard_value",
        description = "Blur depth discard value",
        default = 1.0,
        min = 0.0,
        max = 2.0,
        step = 0.01,
        precision = 1
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
        default = "16",
        items = [
            ("8", "8", "0", 0),
            ("16", "16", "1", 1),
            ("24", "24", "2", 2),
            ("32", "32", "3", 3),
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

    render_sky = bpy.props.BoolProperty(
        name = "B4W: render sky",
        description = "Sky will be rendered instead of default background",
        default = False
    )

    reflexible = bpy.props.BoolProperty(
        name = "B4W: reflexible",
        description = "Sky will be rendered during the reflection pass",
        default = False
    )

    reflexible_only = bpy.props.BoolProperty(
        name = "B4W: reflexible only",
        description = "Sky will not be rendered, but will have a reflection",
        default = False
    )

    procedural_skydome = bpy.props.BoolProperty(
        name = "B4W: procedural skydome",
        description = "Sky will be generated procedurally",
        default = False
    )

    use_as_environment_lighting = bpy.props.BoolProperty(
        name = "B4W: use_as_environment_map",
        description = "Procedural sky will be used as environment lighting",
        default = False
    )

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

class B4W_AnchorSettings(bpy.types.PropertyGroup):
    type = bpy.props.EnumProperty(
        name = "Anchor Type",
        description = "Anchor type",
        default = "ANNOTATION",
        items = [
            ("GENERIC", "Generic", "Do not assign any HTML element, controlled by API"),
            ("ELEMENT", "Custom Element", "Assign existing HTML element by ID"),
            ("ANNOTATION", "Annotation", "Create an HTML element with annotation from meta tags")
        ]
    )
    detect_visibility = bpy.props.BoolProperty(
        name = "Detect Visibility",
        description = "Detect visibility of anchor object (slow)",
        default = False
    )
    element_id = bpy.props.StringProperty(
        name = "HTML element ID",
        description = "ID of element for ELEMENT anchor type",
        default = ""
    )
    max_width = bpy.props.IntProperty(
        name = "Max Width",
        description = "Maximum width of annotation description element (in pixels)",
        default = 250,
        min = 0,
        soft_max = 1000,
        max = 10000
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

    class_names_for_export = [
        'Action',
        'Image',
        'Material',
        'Object',
        'ParticleSettings',
        'Scene',
        'Texture',
        'World'
    ]

    for class_name in class_names_for_export:
        cl = getattr(bpy.types, class_name)
        cl.b4w_do_not_export = b4w_do_not_export

    for class_name in class_names:
        cl = getattr(bpy.types, class_name)
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
    b4w_outline_color = bpy.props.FloatVectorProperty(
        name = "B4W: outline color of the selection",
        description = "Default outline color of the selection",
        default = (1.0, 1.0, 1.0),
        min = 0.0,
        soft_min = 0.0,
        max = 1.0,
        soft_max = 1.0,
        precision = 3,
        subtype = 'COLOR',
        size = 3
    )
    bpy.types.World.b4w_outline_color = b4w_outline_color

    b4w_outline_factor = bpy.props.FloatProperty(
        name = "B4W: outline factor",
        description = "Outline strength factor",
        default = 1.0,
        min = 0.1,
        max = 1.0,
        step = 1,
        precision = 2
    )
    bpy.types.World.b4w_outline_factor = b4w_outline_factor

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

    add_text_properties()

    # for camera panel
    b4w_move_style = bpy.props.EnumProperty(
        name = "B4W: movement style",
        description = "Default camera movement style",
        default = "TARGET",
        items = [
            ("STATIC", "Static", "Static camera"),
            ("TARGET", "Target", "Move target"),
            ("EYE", "Eye", "Move eye"),
            ("HOVER", "Hover", "Hover mode")
        ]
    )
    bpy.types.Camera.b4w_move_style = b4w_move_style

    b4w_trans_velocity = bpy.props.FloatProperty(
           name = "B4W: Translation velocity of the camera",
           description = "Translation velocity of the camera",
           default = 1.0,
           min = 0.0,
           soft_min = 0.0,
           precision = 3,
       )
    bpy.types.Camera.b4w_trans_velocity = b4w_trans_velocity

    b4w_rot_velocity = bpy.props.FloatProperty(
           name = "B4W: Rotation velocity of the camera",
           description = "Rotation velocity of the camera",
           default = 1.0,
           min = 0.0,
           soft_min = 0.0,
           precision = 3,
       )
    bpy.types.Camera.b4w_rot_velocity = b4w_rot_velocity

    b4w_zoom_velocity = bpy.props.FloatProperty(
           name = "B4W: Zoom velocity of the camera",
           description = "Zoom velocity of the camera",
           default = 0.1,
           min = 0.0,
           max = 1.0,
           soft_max = 1.0,
           soft_min = 0.0,
           step = 0.1,
           precision = 3,
       )
    bpy.types.Camera.b4w_zoom_velocity = b4w_zoom_velocity

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
           min = 0.0,
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
           min = 0.0,
           soft_min = 0.0,
           max = 1000000.0,
           soft_max = 1000.0,
           precision = 3,
       )
    bpy.types.Camera.b4w_distance_max = b4w_distance_max

    b4w_horizontal_translation_min = bpy.props.FloatProperty(
           name = "B4W: Minimum value of the horizontal translation",
           description = "Minimum value of the horizontal translation",
           default = -100.0,
           min = -1000000.0,
           soft_min = -1000.0,
           max = 1000000.0,
           soft_max = 1000.0,
           precision = 3,
       )
    bpy.types.Camera.b4w_horizontal_translation_min \
            = b4w_horizontal_translation_min

    b4w_horizontal_translation_max = bpy.props.FloatProperty(
           name = "B4W: Maximum value of the horizontal translation",
           description = "Maximum value of the horizontal translation",
           default = 100.0,
           min = -1000000.0,
           soft_min = -1000.0,
           max = 1000000.0,
           soft_max = 1000.0,
           precision = 3,
       )
    bpy.types.Camera.b4w_horizontal_translation_max \
            = b4w_horizontal_translation_max

    b4w_vertical_translation_min = bpy.props.FloatProperty(
           name = "B4W: Minimum value of the vertical translation",
           description = "Minimum value of the vertical translation",
           default = -100.0,
           min = -1000000.0,
           soft_min = -1000.0,
           max = 1000000.0,
           soft_max = 1000.0,
           precision = 3,
       )
    bpy.types.Camera.b4w_vertical_translation_min \
            = b4w_vertical_translation_min 

    b4w_vertical_translation_max = bpy.props.FloatProperty(
           name = "B4W: Maximum value of the vertical translation",
           description = "Maximum value of the vertical translation",
           default = 100.0,
           min = -1000000.0,
           soft_min = -1000.0,
           max = 1000000.0,
           soft_max = 1000.0,
           precision = 3,
       )
    bpy.types.Camera.b4w_vertical_translation_max \
            = b4w_vertical_translation_max 

    b4w_use_horizontal_clamping = bpy.props.BoolProperty(
        name = "B4W: use horizontal clamping",
        description = "Check if you wish to set horizontal clamping values",
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

    b4w_hover_angle_min = bpy.props.FloatProperty(
           name = "B4W: Minimum rotation angle",
           description = "Minimum rotation angle",
           default = 0,
           min = 0,
           soft_min = 0,
           max = math.pi / 2,
           soft_max = math.pi / 2,
           precision = 1,
           subtype = "ANGLE",
       )
    bpy.types.Camera.b4w_hover_angle_min = b4w_hover_angle_min

    b4w_hover_angle_max = bpy.props.FloatProperty(
           name = "B4W: Maximum rotation angle",
           description = "Maximum rotation angle",
           default = math.pi / 2,
           min = 0,
           soft_min = 0,
           max = math.pi / 2,
           soft_max = math.pi / 2,
           precision = 1,
           subtype = "ANGLE",
       )
    bpy.types.Camera.b4w_hover_angle_max = b4w_hover_angle_max

    bpy.types.Camera.b4w_horizontal_clamping_type = bpy.props.EnumProperty(
        name = "B4W: horizontal rotation clamping type",
        description = "Horizontal rotation clamping type",
        default = "LOCAL",
        items = [
            ("LOCAL", "Camera Space", "Clamp angles in camera space"),
            ("WORLD", "World Space", "Clamp angles in world space")
        ]
    )

    b4w_use_vertical_clamping = bpy.props.BoolProperty(
        name = "B4W: use vertical clamping",
        description = "Check if you wish to set vertical clamping values",
        default = False
    )
    bpy.types.Camera.b4w_use_vertical_clamping \
            = b4w_use_vertical_clamping

    b4w_enable_hover_hor_rotation = bpy.props.BoolProperty(
        name = "B4W: enable horizontal rotation",
        description = "Enable horizontal rotation",
        default = True
    )
    bpy.types.Camera.b4w_enable_hover_hor_rotation \
            = b4w_enable_hover_hor_rotation

    b4w_use_panning = bpy.props.BoolProperty(
        name = "B4W: enable panning mode",
        description = "Enable panning mode",
        default = True
    )
    bpy.types.Camera.b4w_use_panning \
            = b4w_use_panning

    b4w_rotation_down_limit = bpy.props.FloatProperty(
        name = "B4W: Rotation down limit",
        description = "Rotation down limit angle",
        default = -math.pi / 2,
        min = -2 * math.pi,
        soft_min = -2 * math.pi,
        max = 2 * math.pi,
        soft_max = 2 * math.pi,
        precision = 1,
        subtype = "ANGLE"
    )
    bpy.types.Camera.b4w_rotation_down_limit = b4w_rotation_down_limit

    b4w_rotation_up_limit = bpy.props.FloatProperty(
        name = "B4W: Rotation up limit",
        description = "Rotation up limit angle",
        default = math.pi / 2,
        min = -2 * math.pi,
        soft_min = -2 * math.pi,
        max = 2 * math.pi,
        soft_max = 2 * math.pi,
        precision = 1,
        subtype = "ANGLE"
    )
    bpy.types.Camera.b4w_rotation_up_limit = b4w_rotation_up_limit

    bpy.types.Camera.b4w_vertical_clamping_type = bpy.props.EnumProperty(
        name = "B4W: vertical rotation clamping type",
        description = "Vertical rotation clamping type",
        default = "LOCAL",
        items = [
            ("LOCAL", "Camera Space", "Clamp angles in camera space"),
            ("WORLD", "World Space", "Clamp angles in world space")
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

    b4w_enable_tags = bpy.props.BoolProperty(
        name = "B4W: enable tags",
        description = "Enable tags",
        default = False
    )
    scene_type.b4w_enable_tags = b4w_enable_tags

    b4w_tags = bpy.props.PointerProperty(
        name = "B4W: tags",
        type = B4W_Tags
    )
    scene_type.b4w_tags = b4w_tags

    b4w_enable_object_selection = bpy.props.EnumProperty(
        name = "B4W: enable object selection",
        description = "Enable object selection",
        items = [
            ("OFF", "OFF", "0", 0),
            ("ON",  "ON",  "1", 1),
            ("AUTO",  "AUTO",  "2", 2),
        ],
        default = "AUTO"
    )
    scene_type.b4w_enable_object_selection = b4w_enable_object_selection

    b4w_enable_outlining = bpy.props.EnumProperty(
        name = "B4W: enable outlining",
        description = "Enable outlining",
        items = [
            ("OFF", "OFF", "0", 0),
            ("ON",  "ON",  "1", 1),
            ("AUTO",  "AUTO",  "2", 2),
        ],
        default = "AUTO"
    )
    scene_type.b4w_enable_outlining = b4w_enable_outlining

    scene_type.b4w_nla_script= bpy.props.CollectionProperty(
            type=nla_script.B4W_ScriptSlot,
            name="B4W: NLA Script")

def add_text_properties():

    text_type = bpy.types.Text

    b4w_assets_load = bpy.props.BoolProperty(
        name="B4W: assets load",
        description = "",
        default = False
    )
    text_type.b4w_assets_load = b4w_assets_load

def add_object_properties():
    """Add properties for the object panel"""

    obj_type = bpy.types.Object

    b4w_do_not_batch = bpy.props.BoolProperty(
        name = "B4W: do not batch",
        description = "Enable dynamics for this object",
        default = False
    )
    obj_type.b4w_do_not_batch = b4w_do_not_batch

    obj_type.b4w_dynamic_geometry = bpy.props.BoolProperty(
        name = "B4W: dynamic geometry",
        description = "Allow to use geometry update API for given object",
        default = False
    )

    def export_edited_normals_update(self, context):
        if self.b4w_export_edited_normals:
            self.b4w_shape_keys = False
            self.b4w_loc_export_vertex_anim = False
            self.b4w_apply_modifiers = False
            self.b4w_apply_scale = False

    obj_type.b4w_export_edited_normals = bpy.props.BoolProperty(
        name = "B4W: export edited normals",
        description = "Export baked vertex normals",
        default = False,
        update = export_edited_normals_update
    )

    def shape_keys_update(self, context):
        if self.b4w_shape_keys:
            self.b4w_export_edited_normals = False
            self.b4w_loc_export_vertex_anim = False
            self.b4w_apply_modifiers = False
            self.b4w_apply_scale = False

    obj_type.b4w_shape_keys = bpy.props.BoolProperty(
        name = "B4W: export shape keys",
        description = "Export shape keys",
        default = False,
        update = shape_keys_update
    )

    def apply_scale_update(self, context):
        if self.b4w_apply_scale:
            self.b4w_export_edited_normals = False
            self.b4w_loc_export_vertex_anim = False
            self.b4w_apply_modifiers = False
            self.b4w_shape_keys = False

    obj_type.b4w_apply_scale = bpy.props.BoolProperty(
        name = "B4W: apply scale",
        description = "Apply scale and modifiers before export",
        default = False,
        update = apply_scale_update
    )

    def apply_modifiers_update(self, context):
        if self.b4w_apply_modifiers:
            self.b4w_export_edited_normals = False
            self.b4w_loc_export_vertex_anim = False
            self.b4w_shape_keys = False
            self.b4w_apply_scale = False

    obj_type.b4w_apply_modifiers = bpy.props.BoolProperty(
        name = "B4W: apply modifiers",
        description = "Apply object modifiers before export",
        default = False,
        update = apply_modifiers_update
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
    obj_type.b4w_anim_behavior = bpy.props.EnumProperty(
        name = "B4W: animation behavior",
        description = "The behavior of finished animation: stop, repeat or reset",
        default = "FINISH_STOP",
        items = [
            ("CYCLIC", "Loop", "Behavior: cyclically repeat the finished animation"),
            ("FINISH_RESET", "Finish Reset", "Behavior: reset the finished animation"),
            ("FINISH_STOP", "Finish Stop", "Behavior: stop the finished animation")
        ]
    )
    obj_type.b4w_animation_mixing = bpy.props.BoolProperty(
        name = "B4W: animation mixing",
        description = "Allow skeletal animations to be mixed with each other",
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
        description = "Object can be selected",
        default = False
    )
    obj_type.b4w_selectable = b4w_selectable

    b4w_outlining = bpy.props.BoolProperty(
        name = "B4W: outlining",
        description = "Object can be outlined",
        default = False
    )
    obj_type.b4w_outlining = b4w_outlining

    b4w_outline_on_select = bpy.props.BoolProperty(
        name = "B4W: outline on select",
        description = "Automatic outlining on select",
        default = False
    )
    obj_type.b4w_outline_on_select = b4w_outline_on_select

    b4w_billboard = bpy.props.BoolProperty(
        name = "B4W: billboard",
        description = "Object billboarding",
        default = False
    )
    obj_type.b4w_billboard = b4w_billboard

    b4w_pres_glob_orientation = bpy.props.BoolProperty(
        name = "B4W: preserve global orientation and scale",
        description = "Preserve global orientation and scale for billboard object",
        default = False
    )
    obj_type.b4w_pres_glob_orientation = b4w_pres_glob_orientation

    b4w_billboard_geometry = bpy.props.EnumProperty(
        name = "B4W: billboard geometry",
        description = "Object billboarding geometry",
        default = "SPHERICAL",
        items = [
            ("SPHERICAL", "Spherical", "Spherical billboarding"),
            ("CYLINDRICAL", "Cylindrical", "Cylindrical billboarding"),
        ]
    )
    obj_type.b4w_billboard_geometry = b4w_billboard_geometry

    obj_type.b4w_outline_settings = bpy.props.PointerProperty(
        name = "B4W: outline settings",
        type = B4W_OutlineSettings
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
    def loc_export_vertex_anim_update(self, context):
        if self.b4w_loc_export_vertex_anim:
            self.b4w_shape_keys = False
            self.b4w_export_edited_normals = False
            self.b4w_apply_modifiers = False
            self.b4w_apply_scale = False

    obj_type.b4w_loc_export_vertex_anim = bpy.props.BoolProperty(
        name = "B4W: export vertex animation",
        description = "Export baked vertex animation",
        default = False,
        update = loc_export_vertex_anim_update
    )

    obj_type.b4w_lod_transition = bpy.props.FloatProperty(
        name = "B4W: LOD transition ratio",
        description = "LOD transition ratio",
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

    # deprecated
    obj_type.b4w_refl_plane_index = bpy.props.IntProperty(
            name="B4W: Reflection Plane index",
            description="Reflection plane index used in the interface",
            default=0, min=0, max=100, soft_min=0, soft_max=5
    )

    obj_type.b4w_enable_object_tags = bpy.props.BoolProperty(
        name = "B4W: enable object tags",
        description = "Enable object tags",
        default = False
    )

    obj_type.b4w_object_tags = bpy.props.PointerProperty(
        name = "B4W: object_tags",
        type = B4W_Object_Tags
    )

    obj_type.b4w_enable_anchor = bpy.props.BoolProperty(
        name = "B4W: enable anchor",
        description = "Make an object anchor one",
        default = False
    )
    obj_type.b4w_anchor = bpy.props.PointerProperty(
        name = "B4W: anchor settings",
        type = B4W_AnchorSettings
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
        description = "Repeat speaker's playback",
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
        description = "Make loop (repeated playback inside current play cycle)",
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
        default = 1.0,
        min = 0.0,
        max = 10.0,
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
    mat_type.b4w_water_norm_uv_velocity = bpy.props.FloatProperty(
        name = "B4W: water norm uv velocity",
        description = "Water normal uv velocity",
        default = 0.05,
        min = 0.0,
        max = 1.0,
        step = 0.005,
        precision = 3,
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

    mat_type.b4w_collision = bpy.props.BoolProperty(
        name = "B4W: collision",
        description = "Special collision material",
        default = False
    )
    mat_type.b4w_do_not_render = bpy.props.BoolProperty(
        name = "B4W: do not render",
        description = "Do not render material",
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

    mat_type.b4w_refractive = bpy.props.BoolProperty(
        name = "B4W: refraction",
        description = "Enable refraction for the material by using normal",
        default = False
    )
    mat_type.b4w_refr_bump = bpy.props.FloatProperty(
        name = "B4W: refraction bump",
        description = "Perturbation power of refraction",
        default = 0.001,
        min = 0.0,
        max = 0.2
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

    mat_type.b4w_render_above_all = bpy.props.BoolProperty(
        name = "B4W: render above all",
        description = "Material will be render above all others",
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

    b4w_parallax_lod_dist = bpy.props.IntProperty(
        name = "B4W: parallax lod distance",
        description = "Level of detail distance for parallax mapping",
        default = 5,
        soft_max = 30,
        min = 1,
        max = 30
    )
    bpy.types.Texture.b4w_parallax_lod_dist = b4w_parallax_lod_dist;

    b4w_source_type = bpy.props.EnumProperty(
        name = "B4W: source type",
        description = "Source type",
        default = "NONE",
        items = [
            ("NONE", "None", "None"),
            ("SCENE", "Scene", "Scene"),
            ("CANVAS", "Canvas", "Canvas")
        ]
    )
    bpy.types.Texture.b4w_source_type = b4w_source_type;

    b4w_source_id = bpy.props.StringProperty(
        name = "B4W: scene",
        description = "Source ID",
        default = ""
    )
    bpy.types.Texture.b4w_source_id = b4w_source_id

    b4w_source_size = bpy.props.EnumProperty(
        name = "B4W: source size",
        description = "Source size",
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
        name = "B4W: Enable mipmapping",
        description = "Use mipmapping for canvas texture",
        default = True
    )
    bpy.types.Texture.b4w_enable_canvas_mipmapping = b4w_enable_canvas_mipmapping

    b4w_extension = bpy.props.EnumProperty(
        name = "B4W: extension",
        description = "How the image is extrapolated past its original bounds",
        default = "REPEAT",
        items = [
            ("CLIP",     "Clip",      "Clip"),
            ("REPEAT",   "Repeat",    "Repeat")
        ]
    )
    bpy.types.Texture.b4w_extension = b4w_extension

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

    b4w_use_sky = bpy.props.EnumProperty(
        name = "B4W: environment lighting",
        description = "Use texture as skydome or environment lighting",
        items = [
            ("OFF",                  "OFF",                 "0", 0),
            ("SKYDOME",              "SKYDOME",             "1", 1),
            ("ENVIRONMENT_LIGHTING", "ENVIRONMENT_LIGHTING","2", 2),
            ("BOTH",                 "BOTH",                "3", 3)
        ]
    )
    bpy.types.Texture.b4w_use_sky = b4w_use_sky

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
    """Add properties for particles panel"""

    pset_type = bpy.types.ParticleSettings

    # "EMITTER"

    pset_type.b4w_cyclic = bpy.props.BoolProperty(
        name = "B4W: cyclic emission",
        description = "Loop particles emission",
        default = False
    )

    pset_type.b4w_allow_nla = bpy.props.BoolProperty(
        name = "B4W: allow NLA",
        description = "Allow particles emission to be controlled by the NLA",
        default = True
    )

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

    pset_type.b4w_coordinate_system = bpy.props.EnumProperty(
        name = "B4W: coordinate system",
        description = "Particles coordinate system",
        items = [
            ("WORLD", "World", "World coordinate system"),
            ("LOCAL", "Local", "Emitter's coordinate system"),
        ],
        default = "LOCAL"
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
    bpy.utils.register_class(B4W_VehicleSettings)
    bpy.utils.register_class(B4W_OutlineSettings)
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
    bpy.utils.register_class(B4W_Tags)
    bpy.utils.register_class(B4W_Object_Tags)
    bpy.utils.register_class(B4W_AnchorSettings)
    add_b4w_props()

def unregister():
    bpy.utils.unregister_class(B4W_VehicleSettings)
    bpy.utils.unregister_class(B4W_OutlineSettings)
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
    bpy.utils.unregister_class(B4W_Tags)
    bpy.utils.unregister_class(B4W_Object_Tags)
    bpy.utils.unregister_class(B4W_AnchorSettings)

