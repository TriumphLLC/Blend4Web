import bpy
import imp
import mathutils
import math
import os
import cProfile
import bgl

from bpy.types import Panel

from bl_ui.properties_physics_common import point_cache_ui

def check_vertex_color(mesh, vc_name):
    for color_layer in mesh.vertex_colors:
        if color_layer.name == vc_name:
            return True
    # no found
    return False

def particle_panel_poll(cls, context):
    psys = context.particle_system
    engine = context.scene.render.engine
    settings = 0

    if psys:
        settings = psys.settings
    elif isinstance(context.space_data.pin_id, bpy.types.ParticleSettings):
        settings = context.space_data.pin_id

    if not settings:
        return False

    return settings.is_fluid is False and (engine in cls.COMPAT_ENGINES)

def particle_get_settings(context):
    if context.particle_system:
        return context.particle_system.settings
    elif isinstance(context.space_data.pin_id, bpy.types.ParticleSettings):
        return context.space_data.pin_id
    return None

def particle_panel_enabled(context, psys):
    if psys is None:
        return True
    phystype = psys.settings.physics_type
    if psys.settings.type in {'EMITTER', 'REACTOR'} and phystype in {'NO', 'KEYED'}:
        return True
    else:
        return (psys.point_cache.is_baked is False) and (not psys.is_edited) and (not context.particle_system_editable)

class ParticleButtonsPanel:
    bl_space_type = 'PROPERTIES'
    bl_region_type = 'WINDOW'
    bl_context = "particle"
    COMPAT_ENGINES = {'BLEND4WEB'}

    @classmethod
    def poll(cls, context):
        return particle_panel_poll(cls, context)


class B4W_PARTICLE_PT_context_particles(ParticleButtonsPanel, Panel):
    bl_label = ""
    bl_options = {'HIDE_HEADER'}

    @classmethod
    def poll(cls, context):
        engine = context.scene.render.engine
        return (context.particle_system or context.object or context.space_data.pin_id) and (engine in cls.COMPAT_ENGINES)

    def draw(self, context):
        layout = self.layout

        ob = context.object
        psys = context.particle_system
        pset = None

        if ob:
            row = layout.row()

            row.template_list("PARTICLE_UL_particle_systems", "particle_systems", ob, "particle_systems",
                              ob.particle_systems, "active_index", rows=1)

            col = row.column(align=True)
            col.operator("object.particle_system_add", icon='ZOOMIN', text="")
            col.operator("object.particle_system_remove", icon='ZOOMOUT', text="")
            col.menu("PARTICLE_MT_specials", icon='DOWNARROW_HLT', text="")

        if psys is None:
            pset = particle_get_settings(context)

            layout.operator("object.particle_system_add", icon='ZOOMIN', text="New")

            if pset is None:
                return

            layout.template_ID(context.space_data, "pin_id")

            if pset.is_fluid:
                layout.label(text="Settings used for fluid")
                return

            layout.prop(pset, "type", text="Type")

        elif not psys.settings:
            split = layout.split(percentage=0.32)

            col = split.column()
            col.label(text="Settings:")

            col = split.column()
            col.template_ID(psys, "settings", new="particle.new")
        else:
            pset = psys.settings

            split = layout.split(percentage=0.32)
            col = split.column()
            if pset.is_fluid is False:
                col.label(text="Settings:")
                col.label(text="Type:")

            col = split.column()
            if pset.is_fluid is False:
                row = col.row()
                row.enabled = particle_panel_enabled(context, psys)
                row.template_ID(psys, "settings", new="particle.new")

            if pset.is_fluid:
                layout.label(text=iface_("%d fluid particles for this frame") % pset.count, translate=False)
                return

            row = col.row()
            row.enabled = particle_panel_enabled(context, psys)
            row.prop(pset, "type", text="")
            row.prop(psys, "seed")

        if pset:
            if pset.type == 'HAIR':
                split = layout.split(percentage=0.65)
                if psys is not None and psys.is_edited:
                    split.operator("particle.edited_clear", text="Free Edit")
                else:
                    row = split.row()
                    row.enabled = particle_panel_enabled(context, psys)
                    row.prop(pset, "regrow_hair")
                row = split.row()
                row.enabled = particle_panel_enabled(context, psys)
                row.prop(pset, "hair_step")
                if psys is not None and psys.is_edited:
                    if psys.is_global_hair:
                        layout.operator("particle.connect_hair")
                    else:
                        layout.operator("particle.disconnect_hair")
            else:
                layout.label(text="Enable emission with Object->Animation->Apply default animation.")


class B4W_PARTICLE_PT_emission(ParticleButtonsPanel, Panel):
    bl_label = "Emission"

    @classmethod
    def poll(cls, context):
        psys = context.particle_system
        settings = particle_get_settings(context)

        if settings is None:
            return False
        if settings.is_fluid:
            return False
        if not (context.scene.render.engine in cls.COMPAT_ENGINES):
            return False
        if particle_panel_poll(B4W_PARTICLE_PT_emission, context):
            return psys is None or not context.particle_system.point_cache.use_external
        return False

    def draw(self, context):
        layout = self.layout

        psys = context.particle_system
        pset = particle_get_settings(context)

        layout.enabled = particle_panel_enabled(context, psys) and (psys is None or not psys.has_multiple_caches)

        row = layout.row()
        row.prop(pset, "count")

        if pset.type == 'HAIR':
            row.prop(pset, "hair_length")
        else:
            split = layout.split()

            col = split.column(align=True)
            col.prop(pset, "frame_start")
            col.prop(pset, "frame_end")

            col = split.column(align=True)
            col.prop(pset, "lifetime")
            col.prop(pset, "lifetime_random", slider=True)

        layout.label(text="Emit From:")
        layout.prop(pset, "emit_from", expand=True)

        if pset.type == "HAIR":
            row = layout.row()
            row.prop(pset, "use_emit_random")
            
            if pset.emit_from == 'FACE' or pset.emit_from == 'VOLUME':
                row.prop(pset, "use_even_distribution")
                layout.prop(pset, "distribution", expand=True)

                row = layout.row()
                if pset.distribution == 'JIT':
                    row.prop(pset, "userjit", text="Particles/Face")
                    row.prop(pset, "jitter_factor", text="Jittering Amount", slider=True)
        else:
            if pset.emit_from == 'VOLUME':
                layout.label(text="Particle emission from 'Volume' is not supported.", icon="ERROR")

        row = layout.row()
        row.prop(pset, "use_modifier_stack")

        if pset.type == 'EMITTER':
            row = layout.row()
            row.prop(pset, "b4w_cyclic", text="Cyclic Emission")

            row = layout.row()
            row.prop(pset, "b4w_allow_nla", text="Allow NLA")

            row = layout.row()
            row.prop(pset, "b4w_randomize_emission", text="Random Delay")


class B4W_PARTICLE_PT_velocity(ParticleButtonsPanel, Panel):
    bl_label = "Velocity"

    @classmethod
    def poll(cls, context):
        if not (context.scene.render.engine in cls.COMPAT_ENGINES):
            return False
        if particle_panel_poll(B4W_PARTICLE_PT_velocity, context):
            psys = context.particle_system
            settings = particle_get_settings(context)

            return settings.physics_type != 'BOIDS' and (psys is None or not psys.point_cache.use_external)
        else:
            return False

    def draw(self, context):
        layout = self.layout

        psys = context.particle_system
        pset = particle_get_settings(context)

        layout.enabled = particle_panel_enabled(context, psys)

        split = layout.split()

        col = split.column()
        col.label(text="Emitter Geometry:")
        col.prop(pset, "normal_factor")

        if pset.type == "HAIR":
            sub = col.column(align=True)
            sub.prop(pset, "tangent_factor")
            sub.prop(pset, "tangent_phase", slider=True)

            col = split.column()
            col.label(text="Emitter Object:")
            col.prop(pset, "object_align_factor", text="")

        layout.label(text="Other:")
        split = layout.split()

        if pset.type == "HAIR":
            col = split.column()
            if pset.emit_from == 'PARTICLE':
                col.prop(pset, "particle_factor")
            else:
                col.prop(pset, "object_factor", slider=True)

        col = split.column()
        col.prop(pset, "factor_random")

class B4W_PARTICLE_PT_rotation(ParticleButtonsPanel, Panel):
    bl_label = "Rotation"
    bl_options = {'DEFAULT_CLOSED'}

    @classmethod
    def poll(cls, context):
        if not (context.scene.render.engine in cls.COMPAT_ENGINES):
            return False
        if particle_panel_poll(B4W_PARTICLE_PT_rotation, context):
            psys = context.particle_system
            settings = particle_get_settings(context)

            return settings.physics_type != 'BOIDS' and (psys is None or not psys.point_cache.use_external)
        else:
            return False

    def draw_header(self, context):
        psys = context.particle_system
        if psys:
            pset = psys.settings
        else:
            pset = context.space_data.pin_id

        self.layout.prop(pset, "use_rotations", text="")

    def draw(self, context):
        layout = self.layout

        psys = context.particle_system
        if psys:
            pset = psys.settings
        else:
            pset = context.space_data.pin_id

        layout.enabled = particle_panel_enabled(context, psys) and pset.use_rotations

        if pset.type == "HAIR":
            layout.label(text="Initial Orientation:")
            split = layout.split()

            col = split.column(align=True)
            col.prop(pset, "rotation_mode", text="")
            col.prop(pset, "rotation_factor_random", slider=True, text="Random")

            col = split.column(align=True)
            col.prop(pset, "phase_factor", slider=True)
            col.prop(pset, "phase_factor_random", text="Random", slider=True)

        else:
            layout.label(text="Angular Velocity:")

            split = layout.split()

            col = split.column(align=True)
            col.prop(pset, "angular_velocity_mode", text="")

            if (pset.angular_velocity_mode != "NONE"
                    and pset.angular_velocity_mode != "VELOCITY"
                    and pset.angular_velocity_mode != "RAND"):
                col.label("'" + pset.angular_velocity_mode + "' angular "
                        + "velocity mode isn't supported.", icon="ERROR");

            sub = col.column(align=True)
            sub.active = pset.angular_velocity_mode != 'NONE'
            sub.prop(pset, "angular_velocity_factor", text="")


class B4W_PARTICLE_PT_physics(ParticleButtonsPanel, Panel):
    bl_label = "Physics"

    @classmethod
    def poll(cls, context):
        if not (context.scene.render.engine in cls.COMPAT_ENGINES):
            return False
        if particle_panel_poll(B4W_PARTICLE_PT_physics, context):
            psys = context.particle_system
            settings = particle_get_settings(context)

            return psys is None or not psys.point_cache.use_external
        else:
            return False

    def draw(self, context):
        layout = self.layout

        psys = context.particle_system
        pset = particle_get_settings(context)

        layout.enabled = particle_panel_enabled(context, psys)

        if pset.type == "HAIR":
            layout.prop(pset, "physics_type", expand=True)

            row = layout.row()
            col = row.column(align=True)
            col.prop(pset, "particle_size")
            col.prop(pset, "size_random", slider=True)

            if pset.physics_type in {'NEWTON', 'FLUID'}:
                split = layout.split()

                col = split.column()
                col.label(text="Forces:")
                col.prop(pset, "brownian_factor")
                col.prop(pset, "drag_factor", slider=True)
                col.prop(pset, "damping", slider=True)

                col = split.column()
                col.label(text="Integration:")
                col.prop(pset, "integrator", text="")
                col.prop(pset, "timestep")
                sub = col.row()
                sub.prop(pset, "subframes")
                supports_courant = pset.physics_type == 'FLUID'
                subsub = sub.row()
                subsub.enabled = supports_courant
                subsub.prop(pset, "use_adaptive_subframes", text="")
                if supports_courant and pset.use_adaptive_subframes:
                    col.prop(pset, "courant_target", text="Threshold")

                if pset.physics_type == 'FLUID':
                    fluid = pset.fluid

                    split = layout.split()
                    sub = split.row()
                    sub.prop(fluid, "solver", expand=True)

                    split = layout.split()

                    col = split.column()
                    col.label(text="Fluid properties:")
                    col.prop(fluid, "stiffness", text="Stiffness")
                    col.prop(fluid, "linear_viscosity", text="Viscosity")
                    col.prop(fluid, "buoyancy", text="Buoyancy", slider=True)

                    col = split.column()
                    col.label(text="Advanced:")

                    if fluid.solver == 'DDR':
                        sub = col.row()
                        sub.prop(fluid, "repulsion", slider=fluid.factor_repulsion)
                        sub.prop(fluid, "factor_repulsion", text="")

                        sub = col.row()
                        sub.prop(fluid, "stiff_viscosity", slider=fluid.factor_stiff_viscosity)
                        sub.prop(fluid, "factor_stiff_viscosity", text="")

                    sub = col.row()
                    sub.prop(fluid, "fluid_radius", slider=fluid.factor_radius)
                    sub.prop(fluid, "factor_radius", text="")

                    sub = col.row()
                    sub.prop(fluid, "rest_density", slider=fluid.use_factor_density)
                    sub.prop(fluid, "use_factor_density", text="")

                    if fluid.solver == 'CLASSICAL':
                        # With the classical solver, it is possible to calculate the
                        # spacing between particles when the fluid is at rest. This
                        # makes it easier to set stable initial conditions.
                        particle_volume = pset.mass / fluid.rest_density
                        spacing = pow(particle_volume, 1.0 / 3.0)
                        sub = col.row()
                        sub.label(text="Spacing: %g" % spacing)

                    elif fluid.solver == 'DDR':
                        split = layout.split()

                        col = split.column()
                        col.label(text="Springs:")
                        col.prop(fluid, "spring_force", text="Force")
                        col.prop(fluid, "use_viscoelastic_springs")
                        sub = col.column(align=True)
                        sub.active = fluid.use_viscoelastic_springs
                        sub.prop(fluid, "yield_ratio", slider=True)
                        sub.prop(fluid, "plasticity", slider=True)

                        col = split.column()
                        col.label(text="Advanced:")
                        sub = col.row()
                        sub.prop(fluid, "rest_length", slider=fluid.factor_rest_length)
                        sub.prop(fluid, "factor_rest_length", text="")
                        col.label(text="")
                        sub = col.column()
                        sub.active = fluid.use_viscoelastic_springs
                        sub.prop(fluid, "use_initial_rest_length")
                        sub.prop(fluid, "spring_frames", text="Frames")

            elif pset.physics_type == 'KEYED':
                split = layout.split()
                sub = split.column()

                row = layout.row()
                col = row.column()
                col.active = not psys.use_keyed_timing
                col.prop(pset, "keyed_loops", text="Loops")
                if psys:
                    row.prop(psys, "use_keyed_timing", text="Use Timing")

                layout.label(text="Keys:")
            elif pset.physics_type == 'BOIDS':
                boids = pset.boids

                row = layout.row()
                row.prop(boids, "use_flight")
                row.prop(boids, "use_land")
                row.prop(boids, "use_climb")

                split = layout.split()

                col = split.column(align=True)
                col.active = boids.use_flight
                col.prop(boids, "air_speed_max")
                col.prop(boids, "air_speed_min", slider=True)
                col.prop(boids, "air_acc_max", slider=True)
                col.prop(boids, "air_ave_max", slider=True)
                col.prop(boids, "air_personal_space")
                row = col.row(align=True)
                row.active = (boids.use_land or boids.use_climb) and boids.use_flight
                row.prop(boids, "land_smooth")

                col = split.column(align=True)
                col.active = boids.use_land or boids.use_climb
                col.prop(boids, "land_speed_max")
                col.prop(boids, "land_jump_speed")
                col.prop(boids, "land_acc_max", slider=True)
                col.prop(boids, "land_ave_max", slider=True)
                col.prop(boids, "land_personal_space")
                col.prop(boids, "land_stick_force")

                split = layout.split()

                col = split.column(align=True)
                col.label(text="Battle:")
                col.prop(boids, "health")
                col.prop(boids, "strength")
                col.prop(boids, "aggression")
                col.prop(boids, "accuracy")
                col.prop(boids, "range")

                col = split.column()
                col.label(text="Misc:")
                col.prop(boids, "bank", slider=True)
                col.prop(boids, "pitch", slider=True)
                col.prop(boids, "height", slider=True)

            if psys and pset.physics_type in {'KEYED', 'BOIDS', 'FLUID'}:
                if pset.physics_type == 'BOIDS':
                    layout.label(text="Relations:")
                elif pset.physics_type == 'FLUID':
                    layout.label(text="Fluid interaction:")

                row = layout.row()
                row.template_list("UI_UL_list", "particle_targets", psys, "targets", psys, "active_particle_target_index", rows=4)

                col = row.column()
                sub = col.row()
                subsub = sub.column(align=True)
                subsub.operator("particle.new_target", icon='ZOOMIN', text="")
                subsub.operator("particle.target_remove", icon='ZOOMOUT', text="")
                sub = col.row()
                subsub = sub.column(align=True)
                subsub.operator("particle.target_move_up", icon='MOVE_UP_VEC', text="")
                subsub.operator("particle.target_move_down", icon='MOVE_DOWN_VEC', text="")

                key = psys.active_particle_target
                if key:
                    row = layout.row()
                    if pset.physics_type == 'KEYED':
                        col = row.column()
                        #doesn't work yet
                        #col.alert = key.valid
                        col.prop(key, "object", text="")
                        col.prop(key, "system", text="System")
                        col = row.column()
                        col.active = psys.use_keyed_timing
                        col.prop(key, "time")
                        col.prop(key, "duration")
                    elif pset.physics_type == 'BOIDS':
                        sub = row.row()
                        #doesn't work yet
                        #sub.alert = key.valid
                        sub.prop(key, "object", text="")
                        sub.prop(key, "system", text="System")

                        layout.prop(key, "alliance", expand=True)
                    elif pset.physics_type == 'FLUID':
                        sub = row.row()
                        #doesn't work yet
                        #sub.alert = key.valid
                        sub.prop(key, "object", text="")
                        sub.prop(key, "system", text="System")
        else:
            row = layout.row()
            col = row.column(align=True)
            col.prop(pset, "particle_size")
            col = row.column(align=True)
            col.prop(pset, "mass")


class B4W_PARTICLE_PT_render(ParticleButtonsPanel, Panel):
    bl_label = "Render"

    @classmethod
    def poll(cls, context):
        settings = particle_get_settings(context)
        engine = context.scene.render.engine
        if settings is None:
            return False

        return engine in cls.COMPAT_ENGINES

    def draw(self, context):
        layout = self.layout

        psys = context.particle_system
        pset = particle_get_settings(context)

        if pset.type == "EMITTER":
            if psys:
                row = layout.row()
                if pset.render_type in {'OBJECT', 'GROUP'}:
                    row.enabled = False
                row.prop(pset, "material_slot", text="")

        layout.prop(pset, "use_render_emitter")
        layout.prop(pset, "render_type", expand=True)

        if pset.type == "HAIR":
            if pset.render_type == 'OBJECT':
                row = layout.row()
                row.prop(pset, "dupli_object")
                row = layout.row()
                row.prop(pset, "use_rotation_dupli")
            elif pset.render_type == 'GROUP':
                row = layout.row()
                row.prop(pset, "dupli_group")
                split = layout.split()

                col = split.column()
                col.prop(pset, "use_whole_group")
                sub = col.column()
                sub.active = (pset.use_whole_group is False)
                sub.prop(pset, "use_group_count")

                col = split.column()
                sub = col.column()
                sub.active = (pset.use_whole_group is False)
                sub.prop(pset, "use_rotation_dupli")

                if pset.use_group_count and not pset.use_whole_group:
                    row = layout.row()
                    row.template_list("UI_UL_list", "particle_dupli_weights", pset, "dupli_weights",
                                      pset, "active_dupliweight_index")

                    col = row.column()
                    sub = col.row()
                    subsub = sub.column(align=True)
                    subsub.operator("particle.dupliob_copy", icon='ZOOMIN', text="")
                    subsub.operator("particle.dupliob_remove", icon='ZOOMOUT', text="")
                    subsub.operator("particle.dupliob_move_up", icon='MOVE_UP_VEC', text="")
                    subsub.operator("particle.dupliob_move_down", icon='MOVE_DOWN_VEC', text="")

                    weight = pset.active_dupliweight
                    if weight:
                        row = layout.row()
                        row.prop(weight, "count")

            if pset.render_type != "OBJECT" and pset.render_type != "GROUP":
                layout.label("The 'Hair' Particle System requires 'Object'" + 
                        " or 'Group' render type.", icon="ERROR")

            row = layout.row()
            row.prop(pset, "b4w_randomize_location", text="Randomize Location And Size")

            row = layout.row()
            row.prop(pset, "b4w_initial_rand_rotation", text="Randomize Initial Rotation")

            if getattr(pset, "b4w_initial_rand_rotation"):
                row = layout.row()
                row.prop(pset, "b4w_rotation_type", text="Rotation Type")
                row = layout.row()
                row.prop(pset, "b4w_rand_rotation_strength", text="Rotation Strength")

            row = layout.row()
            row.prop(pset, "b4w_hair_billboard", text="Billboard")

            if getattr(pset, "b4w_hair_billboard"):
                row = layout.row()
                row.prop(pset, "b4w_hair_billboard_type", text="Billboard Type")

                if getattr(pset, "b4w_hair_billboard_type") == "JITTERED":
                    row = layout.row(align=True)
                    row.prop(pset, "b4w_hair_billboard_jitter_amp", text="Jitter Amplitude")
                    row.prop(pset, "b4w_hair_billboard_jitter_freq", text="Jitter Frequency")

                row = layout.row()
                row.label("Billboard Geometry:")
                row.prop(pset, "b4w_hair_billboard_geometry", expand=True)
        else:
            if pset.render_type != "HALO" and pset.render_type != "BILLBOARD":
                layout.label("The 'Emitter' Particle System requires 'Halo'" + 
                        " or 'Billboard' render type.", icon="ERROR")

            row = layout.row()
            row.prop(pset, "b4w_billboard_align", text="Billboard Align")

            row = layout.row()
            row.label("Dissolve Intervals:")

            row = layout.row(align=True)
            row.prop(pset, "b4w_fade_in", text="Fade-In")
            row.prop(pset, "b4w_fade_out", text="Fade-Out")

            row = layout.row()
            row.prop(pset, "b4w_coordinate_system", text="Coordinate System")

            split = layout.split()
            col = split.column()
            col.prop(pset, "b4w_enable_soft_particles", text="Soft Particles")
            col = split.column()
            col.active = pset.b4w_enable_soft_particles
            col.prop(pset, "b4w_particles_softness", text="Particle Softness")


class B4W_PARTICLE_PT_field_weights(ParticleButtonsPanel, Panel):
    bl_label = "Field Weights"
    bl_options = {'DEFAULT_CLOSED'}

    @classmethod
    def poll(cls, context):
        pset = particle_get_settings(context)
        return particle_panel_poll(cls, context) and pset.type == "EMITTER"

    def draw(self, context):
        pset = particle_get_settings(context)

        split = self.layout.split()
        split.prop(pset.effector_weights, "gravity", slider=True)
        split.prop(pset.effector_weights, "wind", slider=True)


class B4W_PARTICLE_PT_vertexgroups(ParticleButtonsPanel, Panel):
    bl_label = "Vertex Groups"
    bl_options = {'DEFAULT_CLOSED'}

    @classmethod
    def poll(cls, context):
        if not (context.scene.render.engine in cls.COMPAT_ENGINES):
            return False
        if context.particle_system is None:
            return False

        pset = particle_get_settings(context)
        return particle_panel_poll(cls, context) and pset.type == "HAIR"

    def draw(self, context):
        layout = self.layout

        ob = context.object
        psys = context.particle_system

        col = layout.column()
        row = col.row(align=True)
        row.prop_search(psys, "vertex_group_density", ob, "vertex_groups", text="Density")
        row.prop(psys, "invert_vertex_group_density", text="", toggle=True, icon='ARROW_LEFTRIGHT')

        row = col.row(align=True)
        row.prop_search(psys, "vertex_group_length", ob, "vertex_groups", text="Length")
        row.prop(psys, "invert_vertex_group_length", text="", toggle=True, icon='ARROW_LEFTRIGHT')


class B4W_PARTICLE_PT_cache(ParticleButtonsPanel, Panel):
    bl_label = "Cache"
    bl_options = {'DEFAULT_CLOSED'}

    @classmethod
    def poll(cls, context):
        psys = context.particle_system
        engine = context.scene.render.engine
        if psys is None:
            return False
        if psys.settings is None:
            return False
        if psys.settings.is_fluid:
            return False
        phystype = psys.settings.physics_type
        if phystype == 'NO' or phystype == 'KEYED':
            return False
        return (psys.settings.type in {'EMITTER', 'REACTOR'} or (psys.settings.type == 'HAIR' and (psys.use_hair_dynamics or psys.point_cache.is_baked))) and engine in cls.COMPAT_ENGINES

    def draw(self, context):
        psys = context.particle_system

        point_cache_ui(self, context, psys.point_cache, True, 'HAIR' if (psys.settings.type == 'HAIR') else 'PSYS')


class B4W_PARTICLE_PT_draw(ParticleButtonsPanel, Panel):
    bl_label = "Display"
    bl_options = {'DEFAULT_CLOSED'}

    @classmethod
    def poll(cls, context):
        settings = particle_get_settings(context)
        engine = context.scene.render.engine
        if settings is None:
            return False
        return engine in cls.COMPAT_ENGINES

    def draw(self, context):
        layout = self.layout

        psys = context.particle_system
        pset = particle_get_settings(context)

        row = layout.row()
        row.prop(pset, "draw_method", expand=True)
        row.prop(pset, "show_guide_hairs")

        if pset.draw_method == 'NONE' or (pset.render_type == 'NONE' and pset.draw_method == 'RENDER'):
            return

        path = (pset.render_type == 'PATH' and pset.draw_method == 'RENDER') or pset.draw_method == 'PATH'

        row = layout.row()
        row.prop(pset, "draw_percentage", slider=True)
        if pset.draw_method != 'RENDER' or pset.render_type == 'HALO':
            row.prop(pset, "draw_size")
        else:
            row.label(text="")

        if pset.draw_percentage != 100 and psys is not None:
            if pset.type == 'HAIR':
                if psys.use_hair_dynamics and psys.point_cache.is_baked is False:
                    layout.row().label(text="Display percentage makes dynamics inaccurate without baking!")
            else:
                phystype = pset.physics_type
                if phystype != 'NO' and phystype != 'KEYED' and psys.point_cache.is_baked is False:
                    layout.row().label(text="Display percentage makes dynamics inaccurate without baking!")

        row = layout.row()
        col = row.column()
        col.prop(pset, "show_size")
        col.prop(pset, "show_velocity")
        col.prop(pset, "show_number")
        if pset.physics_type == 'BOIDS':
            col.prop(pset, "show_health")

        col = row.column(align=True)
        col.label(text="Color:")
        col.prop(pset, "draw_color", text="")
        sub = col.row(align=True)
        sub.active = (pset.draw_color in {'VELOCITY', 'ACCELERATION'})
        sub.prop(pset, "color_maximum", text="Max")

        if path:
            col.prop(pset, "draw_step")


class B4W_ParticleExportOptions(ParticleButtonsPanel, Panel):
    bl_label = "Export Options"
    bl_idname = "PARTICLE_PT_b4w_export_options"

    @classmethod
    def poll(cls, context):
        if not (context.scene.render.engine in cls.COMPAT_ENGINES):
            return False
        return context.particle_system

    def draw(self, context):
        layout = self.layout
        pset = context.particle_system.settings

        row = layout.row()
        row.prop(pset, "b4w_do_not_export", text="Do Not Export")


class B4W_ParticleDynamicGrassOptions(ParticleButtonsPanel, Panel):
    bl_label = "Dynamic Grass"
    bl_idname = "PARTICLE_PT_b4w_dynamic_grass"

    @classmethod
    def poll(cls, context):
        if not (context.scene.render.engine in cls.COMPAT_ENGINES):
            return False
        psys = context.particle_system
        return psys and psys.settings.type == "HAIR"

    def draw_header(self, context):
        psys = context.particle_system
        if psys:
            pset = psys.settings
        else:
            pset = context.space_data.pin_id

        self.layout.prop(pset, "b4w_dynamic_grass", text="")

    def draw(self, context):
        layout = self.layout
        pset = context.particle_system.settings

        row = layout.row()
        row.prop(pset, "b4w_dynamic_grass_scale_threshold",
                text="Scale Threshold")
        row.active = getattr(pset, "b4w_dynamic_grass")


class B4W_ParticleInheritanceOptions(ParticleButtonsPanel, Panel):
    bl_label = "Properties Inheritance"
    bl_idname = "PARTICLE_PT_b4w_inheritance"

    @classmethod
    def poll(cls, context):
        psys = context.particle_system
        engine = context.scene.render.engine
        return psys and psys.settings.type == "HAIR" and (engine in cls.COMPAT_ENGINES)

    def draw(self, context):
        layout = self.layout
        pset = context.particle_system.settings

        col = layout.column()
        col.label("Inherit Properties From:")

        row = col.row()
        row.label("Wind Bending:")
        row.prop(pset, "b4w_wind_bend_inheritance", text="B4W_Wind_Bend_Inheritance", expand=True)

        row = col.row()
        row.label("Shadows:")
        row.prop(pset, "b4w_shadow_inheritance", text="B4W_Shadow_Inheritance", expand=True)

        row = col.row()
        row.label("Reflection:")
        row.prop(pset, "b4w_reflection_inheritance", text="B4W_Reflection_Inheritance", expand=True)

        row = col.row()
        row.label("Vertex Color:")
        row = col.row()


        icon_from = "NONE"
        icon_to = "NONE"

        from_name = pset.b4w_vcol_from_name
        to_name = pset.b4w_vcol_to_name
        if from_name != "":
            icon_from = "ERROR"
            mesh_from = bpy.context.active_object.data

            if mesh_from and check_vertex_color(mesh_from, from_name):
                icon_from = "GROUP_VCOL"

        if to_name != "":
            icon_to = "ERROR"    
            if pset.render_type == "OBJECT" and pset.dupli_object \
                    and pset.dupli_object.type == "MESH":
                mesh_to = pset.dupli_object.data
                if check_vertex_color(mesh_to, to_name):
                    icon_to = "GROUP_VCOL"

            if pset.render_type == "GROUP" and pset.dupli_group:
                for obj in pset.dupli_group.objects:
                    if obj.type == "MESH" and check_vertex_color(obj.data, to_name):
                        icon_to = "GROUP_VCOL"
                    else:
                        icon_to = "ERROR"
                        break

        row.prop(pset, "b4w_vcol_from_name", text="From", expand=True, icon=icon_from)
        row.prop(pset, "b4w_vcol_to_name", text="To", expand=True, icon=icon_to)


def register():
    bpy.utils.register_class(B4W_PARTICLE_PT_context_particles)
    bpy.utils.register_class(B4W_PARTICLE_PT_emission)
    bpy.utils.register_class(B4W_PARTICLE_PT_cache)
    bpy.utils.register_class(B4W_PARTICLE_PT_velocity)
    bpy.utils.register_class(B4W_PARTICLE_PT_rotation)
    bpy.utils.register_class(B4W_PARTICLE_PT_physics)
    bpy.utils.register_class(B4W_PARTICLE_PT_render)
    bpy.utils.register_class(B4W_PARTICLE_PT_draw)
    bpy.utils.register_class(B4W_PARTICLE_PT_field_weights)
    bpy.utils.register_class(B4W_PARTICLE_PT_vertexgroups)
    bpy.utils.register_class(B4W_ParticleExportOptions)
    bpy.utils.register_class(B4W_ParticleDynamicGrassOptions)
    bpy.utils.register_class(B4W_ParticleInheritanceOptions)
    

def unregister():
    bpy.utils.unregister_class(B4W_PARTICLE_PT_context_particles)
    bpy.utils.unregister_class(B4W_PARTICLE_PT_emission)
    bpy.utils.unregister_class(B4W_PARTICLE_PT_cache)
    bpy.utils.unregister_class(B4W_PARTICLE_PT_velocity)
    bpy.utils.unregister_class(B4W_PARTICLE_PT_rotation)
    bpy.utils.unregister_class(B4W_PARTICLE_PT_physics)
    bpy.utils.unregister_class(B4W_PARTICLE_PT_render)
    bpy.utils.unregister_class(B4W_PARTICLE_PT_draw)
    bpy.utils.unregister_class(B4W_PARTICLE_PT_field_weights)
    bpy.utils.unregister_class(B4W_PARTICLE_PT_vertexgroups)
    bpy.utils.unregister_class(B4W_ParticleExportOptions)
    bpy.utils.unregister_class(B4W_ParticleDynamicGrassOptions)
    bpy.utils.unregister_class(B4W_ParticleInheritanceOptions)
