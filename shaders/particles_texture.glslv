#var BILLBOARD_ALIGN 0
#var COLOR_RAMP_LENGTH 0
#var SIZE_RAMP_LENGTH 0

#include <math.glslv>
#include <to_world.glslv>

#define BILLBOARD_ALIGN_VIEW 1
#define BILLBOARD_ALIGN_XY 2
#define BILLBOARD_ALIGN_YZ 3
#define BILLBOARD_ALIGN_ZX 4

attribute vec3 a_position;
attribute vec3 a_normal;
attribute float a_p_delay;
attribute float a_p_lifetime;
attribute vec4 a_p_vels;
attribute vec2 a_p_bb_vertex;

#if COLOR_RAMP_LENGTH > 0
uniform vec4 u_p_color_ramp[COLOR_RAMP_LENGTH];
#endif
#if SIZE_RAMP_LENGTH > 0
uniform vec2 u_p_size_ramp[SIZE_RAMP_LENGTH];
#endif

uniform float u_p_time;
uniform float u_p_length;
uniform int u_p_cyclic;
uniform float u_p_fade_in;
uniform float u_p_fade_out;

uniform float u_p_nfactor;
uniform float u_p_gravity;
uniform float u_p_mass;
uniform vec3 u_p_wind;

uniform float u_p_max_lifetime;

uniform mat4 u_proj_matrix;
uniform mat4 u_view_matrix;
uniform vec3 u_camera_eye;
uniform float u_p_size;
#if !WORLD_SPACE
uniform mat4 u_model_matrix;
#endif

varying float v_alpha;
varying vec3 v_color;
varying vec2 v_texcoord;
varying vec3 v_eye_dir;
varying vec3 v_pos_world;
#if !DISABLE_FOG || SOFT_PARTICLES
varying vec4 v_pos_view;
#endif

#if SOFT_PARTICLES
varying vec3 v_tex_pos_clip;
#endif

#include <particles.glslv>

// 1->2
float vec_vec_angle(vec2 v1, vec2 v2) {
    return (atan(v2.y, v2.x) - atan(v1.y, v1.x));
}

void main(void) {

    part_params pp;
    pp = calc_part_params();

    float rotation_angle;
    mat4 bb_matrix;
    
    if (BILLBOARD_ALIGN == BILLBOARD_ALIGN_VIEW) {
        rotation_angle = pp.angle;
        // NOTE: there is no simple way to extract camera eye from view matrix
        bb_matrix = billboard_spherical(pp.position, u_view_matrix);
    } else if (BILLBOARD_ALIGN == BILLBOARD_ALIGN_XY) {
        rotation_angle = pp.angle;
        bb_matrix = identity();
        bb_matrix[3] = vec4(pp.position, 1.0);
    } else if (BILLBOARD_ALIGN == BILLBOARD_ALIGN_YZ) {
        rotation_angle = pp.angle;
        bb_matrix = rotation_y(radians(90.0));
        bb_matrix[3] = vec4(pp.position, 1.0);
    } else if (BILLBOARD_ALIGN == BILLBOARD_ALIGN_ZX) {
        // NOTE: scattering only in horizontal space 
        rotation_angle = vec_vec_angle(vec2(EPSILON, 1.0), vec2(a_normal.x,
                a_normal.z)) + pp.angle;
        bb_matrix = rotation_x(radians(-90.0));
        bb_matrix[3] = vec4(pp.position, 1.0);
    }

    vec4 pos_local = vec4(a_p_bb_vertex * 2.0 * pp.size * u_p_size, 0.0, 1.0);
    vec4 pos_world = bb_matrix * rotation_z(rotation_angle) * pos_local;

    vec4 pos_view = u_view_matrix * pos_world;

    vec4 pos_clip = u_proj_matrix * pos_view;

#if SOFT_PARTICLES
    float xc = pos_clip.x;
    float yc = pos_clip.y;
    float wc = pos_clip.w;

    v_tex_pos_clip.x = (xc + wc) / 2.0;
    v_tex_pos_clip.y = (yc + wc) / 2.0;
    v_tex_pos_clip.z = wc;
#endif

    gl_Position = pos_clip;

    v_alpha = pp.alpha;
    v_color = pp.color;
    v_texcoord = a_p_bb_vertex + 0.5;
    v_pos_world = pos_world.xyz;
    v_eye_dir = u_camera_eye - pos_world.xyz;
#if !DISABLE_FOG || SOFT_PARTICLES
    v_pos_view = pos_view;
#endif
}

