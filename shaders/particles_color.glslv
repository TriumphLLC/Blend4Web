#var COLOR_RAMP_LENGTH 0
#var SIZE_RAMP_LENGTH 0

attribute vec3 a_position;
attribute vec3 a_normal;
attribute float a_p_delay;
attribute float a_p_lifetime;
attribute vec4 a_p_vels;

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

uniform mat4 u_view_matrix;
uniform mat4 u_proj_matrix;
uniform float u_height;
uniform float u_p_size;
#if !WORLD_SPACE
uniform mat4 u_model_matrix;
#endif

varying float v_alpha;
varying vec3 v_color;

#if !DISABLE_FOG || SOFT_PARTICLES
varying vec4 v_pos_view;
#endif

#if SOFT_PARTICLES
varying vec3 v_tex_pos_clip;
#endif

varying float v_size;

#include <particles.glslv>

void main(void) {
    part_params pp;
    pp = calc_part_params();

    vec4 pos_view = u_view_matrix * vec4(pp.position, 1.0);
    vec4 pos_clip = u_proj_matrix * pos_view;
    gl_Position = pos_clip;
    
    v_alpha = pp.alpha;
    v_color = pp.color;

#if !DISABLE_FOG || SOFT_PARTICLES
    v_pos_view = pos_view;
#endif

    float pos_size = u_height * u_proj_matrix[1][1] * u_p_size / gl_Position.z;
    float size = pp.size * pos_size;

#if SOFT_PARTICLES
    float xc = pos_clip.x;
    float yc = pos_clip.y;
    float wc = pos_clip.w;

    v_tex_pos_clip.x = (xc + wc) / 2.0;
    v_tex_pos_clip.y = (yc + wc) / 2.0;
    v_tex_pos_clip.z = wc;
    v_size = size;
#endif

    gl_PointSize = size;
}
