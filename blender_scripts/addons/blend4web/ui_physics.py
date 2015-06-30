import bpy
import imp
import mathutils
import math
import os
import cProfile
import bgl

from bpy.types import Panel

from bl_ui.properties_physics_common import (
        basic_force_field_settings_ui,
        basic_force_field_falloff_ui,
        )

SUPPORTED_FIELD_TYPES = {'WIND'}

# common properties for all B4W object panels
class PhysicsButtonsPanel:
    bl_space_type = 'PROPERTIES'
    bl_region_type = 'WINDOW'
    bl_context = "physics"
    COMPAT_ENGINES = ["BLEND4WEB"]

    @classmethod
    def poll(cls, context):
        obj = context.object
        rd = context.scene.render
        return (obj and obj.type == 'MESH'
            and context.scene.render.engine in cls.COMPAT_ENGINES)

class B4W_PHYSICS_PT_game_physics(PhysicsButtonsPanel, Panel):
    bl_label = "Physics"
    bl_idname = "PHYSICS_PT_b4w_physics"

    @classmethod
    def poll(cls, context):
        obj = context.active_object
        rd = context.scene.render
        return obj and obj.game and (rd.engine in cls.COMPAT_ENGINES)

    def draw(self, context):
        layout = self.layout

        obj = context.active_object
        game = obj.game
        soft = obj.game.soft_body

        layout.prop(obj, "b4w_collision", text="Object Physics")
        layout.prop(obj, "b4w_collision_id", text="Collision ID")

        layout.prop(game, "physics_type")
        layout.separator()

        physics_type = game.physics_type

        if physics_type in {'CHARACTER', 'SOFT_BODY', 'NAVMESH', 'SENSOR',
                            'OCCLUDER'}:
            layout.label(text="Unsupported physics type", icon='ERROR')

        elif physics_type in {'DYNAMIC', 'RIGID_BODY'}:
            split = layout.split()

            col = split.column()
            col.prop(game, "use_actor")
            col.prop(game, "use_ghost")

            col = split.column()
            col.prop(game, "use_sleep")

            layout.separator()

            split = layout.split()

            col = split.column()
            col.label(text="Attributes:")
            col.prop(game, "mass")

            split = layout.split()

            col = split.column()
            col.label(text="Velocity:")
            sub = col.column(align=True)
            sub.prop(game, "velocity_min", text="Minimum")
            sub.prop(game, "velocity_max", text="Maximum")

            col = split.column()
            col.label(text="Damping:")
            sub = col.column(align=True)
            sub.prop(game, "damping", text="Translation", slider=True)
            sub.prop(game, "rotation_damping", text="Rotation", slider=True)

        elif physics_type == 'STATIC':
            col = layout.column()
            col.prop(game, "use_actor")
            col.prop(game, "use_ghost")

class B4W_PHYSICS_PT_game_collision_bounds(PhysicsButtonsPanel, Panel):
    bl_label = "Collision Bounds"

    @classmethod
    def poll(cls, context):
        game = context.object.game
        rd = context.scene.render
        return (rd.engine in cls.COMPAT_ENGINES) \
                and (game.physics_type in {'STATIC', 'DYNAMIC', 'RIGID_BODY'})

    def draw(self, context):
        layout = self.layout

        game = context.active_object.game
        split = layout.split()

        col = split.column()
        col.prop(game, "collision_bounds_type", text="Bounds")

        if game.collision_bounds_type in {"CONVEX_HULL", "TRIANGLE_MESH"}:
            layout.label(text = "This collision bounds type is not supported", icon='ERROR')
            return

        row = col.row()
        row.prop(game, "collision_margin", text="Margin", slider=True)

        sub = row.row()
        sub.prop(game, "use_collision_compound", text="Compound")

        layout.separator()
        split = layout.split()
        col = split.column()
        col.prop(game, "collision_group")
        col = split.column()
        col.prop(game, "collision_mask")

        layout.prop(context.object, "b4w_correct_bounding_offset", text="Bounding Box Correction")

class B4W_PhysicsFloaterPanel(PhysicsButtonsPanel, Panel):
    bl_label = "Floater"
    bl_idname = "PHYSICS_PT_b4w_floater"
    bl_options = {'DEFAULT_CLOSED'}

    def draw_header(self, context):
        self.layout.prop(context.object, "b4w_floating", text="")

    def draw(self, context):
        layout = self.layout
        obj = context.object

        layout.active = obj.b4w_floating

        row = layout.row()
        row.prop(obj.b4w_floating_settings, "name", text="Floater Name")
        row = layout.row()
        row.prop(obj.b4w_floating_settings, "part", text="Part")

        if (obj.b4w_floating_settings.part == "MAIN_BODY"):
            row = layout.row()
            row.prop(obj.b4w_floating_settings, "floating_factor",
                    text="Floating Factor")
            row = layout.row()
            row.prop(obj.b4w_floating_settings, "water_lin_damp",
                    text="Water Linear Damping")
            row = layout.row()
            row.prop(obj.b4w_floating_settings, "water_rot_damp",
                    text="Water Rotation Damping")

        if (obj.b4w_floating_settings.part == "BOB"):
            row = layout.row()
            row.prop(obj.b4w_floating_settings, "synchronize_position",
                    TEXT="SYNCHRONIZE BOB POSITION")

class B4W_PhysicsVehiclePanel(PhysicsButtonsPanel, Panel):
    bl_label = "Vehicle"
    bl_idname = "PHYSICS_PT_b4w_vehicle"
    bl_options = {'DEFAULT_CLOSED'}

    def draw_header(self, context):
        self.layout.prop(context.object, "b4w_vehicle", text="")

    def draw(self, context):
        layout = self.layout
        obj = context.object

        layout.active = obj.b4w_vehicle

        row = layout.row()
        row.prop(obj.b4w_vehicle_settings, "name", text="Vehicle Name")
        row = layout.row()
        row.prop(obj.b4w_vehicle_settings, "part", text="Part")

        if (obj.b4w_vehicle_settings.part == "WHEEL_FRONT_LEFT" or
                obj.b4w_vehicle_settings.part == "WHEEL_FRONT_RIGHT" or
                obj.b4w_vehicle_settings.part == "WHEEL_BACK_LEFT" or
                obj.b4w_vehicle_settings.part == "WHEEL_BACK_RIGHT"):
            row = layout.row()
            row.prop(obj.b4w_vehicle_settings, "suspension_rest_length",
                    text="Suspension Rest Length")

        if (obj.b4w_vehicle_settings.part == "CHASSIS" or
                obj.b4w_vehicle_settings.part == "HULL"):
            row = layout.row()
            row.prop(obj.b4w_vehicle_settings, "force_max",
                    text="Force Max")
            row.prop(obj.b4w_vehicle_settings, "brake_max",
                    text="Brake Max")

        if (obj.b4w_vehicle_settings.part == "CHASSIS"):
            row = layout.row()
            row.prop(obj.b4w_vehicle_settings, "suspension_compression",
                    text="Suspension Compression")
            row = layout.row()
            row.prop(obj.b4w_vehicle_settings, "suspension_stiffness",
                    text="Suspension Stiffness")
            row = layout.row()
            row.prop(obj.b4w_vehicle_settings, "suspension_damping",
                    text="Suspension Damping")
            row = layout.row()
            row.prop(obj.b4w_vehicle_settings, "wheel_friction",
                    text="Wheel Friction")
            row = layout.row()
            row.prop(obj.b4w_vehicle_settings, "roll_influence",
                    text="Roll Influence")
            row = layout.row()
            row.prop(obj.b4w_vehicle_settings, "max_suspension_travel_cm",
                    text="Max Suspension Travel Cm")

        if (obj.b4w_vehicle_settings.part == "HULL"):
            row = layout.row()
            row.prop(obj.b4w_vehicle_settings, "floating_factor",
                    text="Floating Factor")
            row = layout.row()
            row.prop(obj.b4w_vehicle_settings, "water_lin_damp",
                    text="Water Linear Damping")
            row = layout.row()
            row.prop(obj.b4w_vehicle_settings, "water_rot_damp",
                    text="Water Rotation Damping")

        if (obj.b4w_vehicle_settings.part == "BOB"):
            row = layout.row()
            row.prop(obj.b4w_vehicle_settings, "synchronize_position",
                    text="Synchronize Bob Position")

        if (obj.b4w_vehicle_settings.part == "STEERING_WHEEL"):
            row = layout.row()
            row.prop(obj.b4w_vehicle_settings, "steering_ratio",
                    text="Steering Ratio")
            row.prop(obj.b4w_vehicle_settings, "steering_max",
                    text="Steering Max")
            row = layout.row()
            row.prop(obj.b4w_vehicle_settings, "inverse_control",
                    text="Inverse Control")

        if (obj.b4w_vehicle_settings.part == "TACHOMETER"):
            row = layout.row()
            row.prop(obj.b4w_vehicle_settings, "delta_tach_angle",
                    text="Delta Tach Angle")

        if (obj.b4w_vehicle_settings.part == "SPEEDOMETER"):
            row = layout.row()
            row.prop(obj.b4w_vehicle_settings, "max_speed_angle",
                    text="Max Speed Angle")
            row.prop(obj.b4w_vehicle_settings, "speed_ratio",
                    text="Speed Ratio")

class B4W_PhysicsCharacterPanel(PhysicsButtonsPanel, Panel):
    bl_label = "Character"
    bl_idname = "PHYSICS_PT_b4w_character"
    bl_options = {'DEFAULT_CLOSED'}

    def draw_header(self, context):
        self.layout.prop(context.object, "b4w_character", text="")

    def draw(self, context):
        layout = self.layout
        obj = context.object

        layout.active = obj.b4w_character

        layout.label("Character settings:")

        row = layout.row()
        row.prop(obj.b4w_character_settings, "walk_speed", text="Walk Speed")
        row = layout.row()
        row.prop(obj.b4w_character_settings, "run_speed", text="Run Speed")
        row = layout.row()
        row.prop(obj.b4w_character_settings, "step_height", text="Step Height")
        row = layout.row()
        row.prop(obj.b4w_character_settings, "jump_strength", text="Jump Strength")
        row = layout.row()
        row.prop(obj.b4w_character_settings, "waterline", text="Waterline")

class B4W_PHYSICS_PT_field(PhysicsButtonsPanel, Panel):
    bl_label = "Force Fields"

    @classmethod
    def poll(cls, context):
        obj = context.object
        rd = context.scene.render
        engine = context.scene.render.engine
        return ((not rd.use_game_engine) and (obj.field) and obj.type == "EMPTY"
                and (engine in cls.COMPAT_ENGINES))

    def draw(self, context):
        layout = self.layout

        obj = context.object
        field = obj.field
        split = layout.split(percentage=0.2)
        split.label(text="Type:")

        split.prop(field, "type", text="")

        if not (obj.field.type in SUPPORTED_FIELD_TYPES):
            layout.label(text = "This field type is not supported", icon='ERROR')
            return

        #if field.type not in {'NONE', 'GUIDE', 'TEXTURE'}:
        #    split = layout.split(percentage=0.2)
        #    split.label(text="Shape:")
        #    split.prop(field, "shape", text="")
        #elif field.type == 'TEXTURE':
        #    split = layout.split(percentage=0.2)
        #    split.label(text="Texture:")
        #    split.row().template_ID(field, "texture", new="texture.new")

        split = layout.split()

        if field.type == 'NONE':
            return  # nothing to draw
        elif field.type == 'GUIDE':
            col = split.column()
            col.prop(field, "guide_minimum")
            col.prop(field, "guide_free")
            col.prop(field, "falloff_power")
            col.prop(field, "use_guide_path_add")
            col.prop(field, "use_guide_path_weight")

            col = split.column()
            col.label(text="Clumping:")
            col.prop(field, "guide_clump_amount")
            col.prop(field, "guide_clump_shape")

            row = layout.row()
            row.prop(field, "use_max_distance")
            sub = row.row()
            sub.active = field.use_max_distance
            sub.prop(field, "distance_max")

            layout.separator()

            layout.prop(field, "guide_kink_type")
            if field.guide_kink_type != 'NONE':
                layout.prop(field, "guide_kink_axis")

                split = layout.split()

                col = split.column()
                col.prop(field, "guide_kink_frequency")
                col.prop(field, "guide_kink_shape")

                col = split.column()
                col.prop(field, "guide_kink_amplitude")

        elif field.type == 'TEXTURE':
            col = split.column()
            col.prop(field, "strength")
            col.prop(field, "texture_mode", text="")
            col.prop(field, "texture_nabla")

            col = split.column()
            col.prop(field, "use_object_coords")
            col.prop(field, "use_2d_force")
        elif field.type == 'SMOKE_FLOW':
            col = split.column()
            col.prop(field, "strength")
            col.prop(field, "flow")
            col = split.column()
            col.label(text="Domain Object:")
            col.prop(field, "source_object", "")
            col.prop(field, "use_smoke_density")
        else:
            layout = self.layout

            split = layout.split()

            if not field or field.type == 'NONE':
                return

            col = split.column()

            if field.type == 'DRAG':
                col.prop(field, "linear_drag", text="Linear")
            else:
                col.prop(field, "strength")

            #if field.type == 'TURBULENCE':
            #    col.prop(field, "size")
            #    col.prop(field, "flow")
            #elif field.type == 'HARMONIC':
            #    col.prop(field, "harmonic_damping", text="Damping")
            #    col.prop(field, "rest_length")
            #elif field.type == 'VORTEX' and field.shape != 'POINT':
            #    col.prop(field, "inflow")
            #elif field.type == 'DRAG':
            #    col.prop(field, "quadratic_drag", text="Quadratic")
            #else:
            #    col.prop(field, "flow")

            #col = split.column()
            #sub = col.column(align=True)
            #sub.prop(field, "noise")
            #sub.prop(field, "seed")
            #if field.type == 'TURBULENCE':
            #    col.prop(field, "use_global_coords", text="Global")
            #elif field.type == 'HARMONIC':
            #    col.prop(field, "use_multiple_springs")

            #split = layout.split()

            #col = split.column()
            #col.label(text="Effect point:")
            #col.prop(field, "apply_to_location")
            #col.prop(field, "apply_to_rotation")

            #col = split.column()
            #col.label(text="Collision:")
            #col.prop(field, "use_absorption")

        #if field.type not in {'NONE', 'GUIDE'}:

        #    layout.label(text="Falloff:")
        #    layout.prop(field, "falloff_type", expand=True)

        #    basic_force_field_falloff_ui(self, context, field)

        #    if field.falloff_type == 'CONE':
        #        layout.separator()

        #        split = layout.split(percentage=0.35)

        #        col = split.column()
        #        col.label(text="Angular:")
        #        col.prop(field, "use_radial_min", text="Use Minimum")
        #        col.prop(field, "use_radial_max", text="Use Maximum")

        #        col = split.column()
        #        col.prop(field, "radial_falloff", text="Power")

        #        sub = col.column()
        #        sub.active = field.use_radial_min
        #        sub.prop(field, "radial_min", text="Angle")

        #        sub = col.column()
        #        sub.active = field.use_radial_max
        #        sub.prop(field, "radial_max", text="Angle")

        #    elif field.falloff_type == 'TUBE':
        #        layout.separator()

        #        split = layout.split(percentage=0.35)

        #        col = split.column()
        #        col.label(text="Radial:")
        #        col.prop(field, "use_radial_min", text="Use Minimum")
        #        col.prop(field, "use_radial_max", text="Use Maximum")

        #        col = split.column()
        #        col.prop(field, "radial_falloff", text="Power")

        #        sub = col.column()
        #        sub.active = field.use_radial_min
        #        sub.prop(field, "radial_min", text="Distance")

        #        sub = col.column()
        #        sub.active = field.use_radial_max
        #        sub.prop(field, "radial_max", text="Distance")

def register():
    bpy.utils.register_class(B4W_PHYSICS_PT_game_physics)
    bpy.utils.register_class(B4W_PHYSICS_PT_game_collision_bounds)
    bpy.utils.register_class(B4W_PHYSICS_PT_field)
    bpy.utils.register_class(B4W_PhysicsFloaterPanel)
    bpy.utils.register_class(B4W_PhysicsVehiclePanel)
    bpy.utils.register_class(B4W_PhysicsCharacterPanel)

def unregister():
    bpy.utils.unregister_class(B4W_PHYSICS_PT_game_physics)
    bpy.utils.unregister_class(B4W_PHYSICS_PT_game_collision_bounds)
    bpy.utils.unregister_class(B4W_PHYSICS_PT_field)
    bpy.utils.unregister_class(B4W_PhysicsFloaterPanel)
    bpy.utils.unregister_class(B4W_PhysicsVehiclePanel)
    bpy.utils.unregister_class(B4W_PhysicsCharacterPanel)
