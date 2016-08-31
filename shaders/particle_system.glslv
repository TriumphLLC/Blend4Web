#version GLSL_VERSION

/*==============================================================================
                            VARS FOR THE COMPILER
==============================================================================*/
#var BILLBOARD_ALIGN 0
#var COLOR_RAMP_LENGTH 0
#var SIZE_RAMP_LENGTH 0

/*============================================================================*/

#define BILLBOARD_ALIGN_VIEW 1
#define BILLBOARD_ALIGN_XY 2
#define BILLBOARD_ALIGN_YZ 3
#define BILLBOARD_ALIGN_ZX 4

#define M_PI 3.14159265359

/*==============================================================================
                                SHADER INTERFACE
==============================================================================*/
GLSL_IN vec3 a_position;
GLSL_IN vec3 a_normal;
GLSL_IN vec3 a_p_data;
GLSL_IN vec4 a_p_vels;

#if TEXTURE_NORM_CO || CALC_TBN_SPACE || USE_TBN_SHADING
GLSL_IN vec4 a_tangent;
#endif

GLSL_IN vec2 a_p_bb_vertex;
//------------------------------------------------------------------------------

#if !NODES
# if !HALO_PARTICLES
GLSL_OUT float v_alpha;
# endif
GLSL_OUT vec3 v_color;
#endif

#if TEXTURE_NORM_CO || CALC_TBN_SPACE || USE_TBN_SHADING
GLSL_OUT vec4 v_tangent;
#endif

#if TEXTURE_COLOR || HALO_PARTICLES || USE_NODE_TEX_COORD_UV || USE_NODE_UV_MERGED \
        || USE_NODE_UVMAP || USE_NODE_GEOMETRY_UV || USE_NODE_GEOMETRY_OR \
        || USE_NODE_TEX_COORD_GE
GLSL_OUT vec2 v_texcoord;
#endif

GLSL_OUT vec3 v_pos_world;

#if !PARTICLES_SHADELESS || !DISABLE_FOG
GLSL_OUT vec3 v_eye_dir;
#endif

#if SOFT_PARTICLES || !DISABLE_FOG || NODES
GLSL_OUT vec4 v_pos_view;
#endif

#if SOFT_PARTICLES
GLSL_OUT vec3 v_tex_pos_clip;
#endif

#if NODES
GLSL_OUT vec3 v_normal;
#endif

#if HALO_PARTICLES
GLSL_OUT float v_vertex_random;
#endif

/*==============================================================================
                                   UNIFORMS
==============================================================================*/

#if COLOR_RAMP_LENGTH > 0
uniform vec4 u_p_color_ramp[COLOR_RAMP_LENGTH];
#endif

uniform float u_p_time;
uniform float u_p_length;
uniform int u_p_cyclic;
uniform float u_p_fade_in;
uniform float u_p_fade_out;

uniform float u_p_nfactor;
uniform float u_p_gravity;
uniform float u_p_mass;
uniform float u_p_wind_fac;

uniform float u_p_max_lifetime;

uniform float u_p_tilt;
uniform float u_p_tilt_rand;

#if REFLECTION_PASS
uniform mat4 u_view_matrix;
#else
uniform mat3 u_view_tsr;
#endif

uniform mat4 u_proj_matrix;
uniform vec3 u_wind;
uniform float u_p_size;

uniform vec3 u_camera_eye;

#if !WORLD_SPACE || NODES || HALO_PARTICLES
uniform mat3 u_model_tsr;
#endif

#if USE_COLOR_RAMP
uniform sampler2D u_color_ramp_tex;
#endif

/*==============================================================================
                                  INCLUDES
==============================================================================*/

#include <math.glslv>
#include <to_world.glslv>
#include <particles.glslv>

#if NODES
#include <std_enums.glsl>
#include <particles_nodes.glslv>
#endif

// 1->2
float vec_vec_angle(vec2 v1, vec2 v2) {
    return (atan(v2.y, v2.x) - atan(v1.y, v1.x));
}

/*==============================================================================
                                    MAIN
==============================================================================*/

void main(void) {


#if REFLECTION_PASS
    mat4 view_matrix = u_view_matrix;
#else
    mat4 view_matrix = tsr_to_mat4(u_view_tsr);
#endif

    part_params pp;
    pp = calc_part_params();

    float rotation_angle;
    mat4 bb_matrix;

    if (BILLBOARD_ALIGN == BILLBOARD_ALIGN_VIEW) {
        rotation_angle = pp.angle;
        // NOTE: there is no simple way to extract camera eye from view matrix
        bb_matrix = billboard_spherical(pp.position, view_matrix);
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

    float bb_random_val = a_p_data[2];
    float random_tilt = u_p_tilt * u_p_tilt_rand * (2.0 * bb_random_val - 1.0);
    float init_rot_angle = (random_tilt + u_p_tilt) * M_PI;

    vec4 pos_world = bb_matrix * rotation_z(init_rot_angle + rotation_angle) * pos_local;

    vec4 pos_view = view_matrix * pos_world;

    vec4 pos_clip = u_proj_matrix * pos_view;

#if HALO_PARTICLES
    v_vertex_random = bb_random_val;
#endif

#if NODES

# if CALC_TBN_SPACE || !NODES && TEXTURE_NORM_CO == TEXTURE_COORDS_UV_ORCO \
        || USE_TBN_SHADING
    vec3 tangent = vec3(a_tangent);
    vec3 binormal = a_tangent[3] * cross(a_normal, tangent);
# else
    vec3 tangent = vec3(0.0);
    vec3 binormal = vec3(0.0);
# endif

    vertex world = to_world(vec3(0.0), vec3(0.0), tangent, vec3(0.0), binormal,
            vec3(0.0), bb_matrix * rotation_z(rotation_angle));


# if TEXTURE_NORM_CO || CALC_TBN_SPACE || USE_TBN_SHADING
    // calculate handedness as described in Math for 3D GP and CG, page 185
    float m = (dot(cross(a_normal, world.tangent),
        world.binormal) < 0.0) ? -1.0 : 1.0;

    v_tangent = vec4(world.tangent, m);
# endif

# if !NODES || USE_NODE_MATERIAL_BEGIN || USE_NODE_GEOMETRY_NO \
        || CAUSTICS || CALC_TBN_SPACE || WIND_BEND && MAIN_BEND_COL && DETAIL_BEND
    v_normal = a_normal;
# endif

    nodes_main(pp.position, pp.velocity, pp.ang_velocity, pp.age, pp.size,
            a_p_bb_vertex, a_p_data[0]);

#else //NODES

# if TEXTURE_COLOR
    v_texcoord = a_p_bb_vertex + 0.5;
# endif

# if HALO_PARTICLES
    v_texcoord = a_p_bb_vertex * 2.0;
# else
    v_alpha = pp.alpha;
# endif
    v_color = pp.color;
#endif //NODES

#if SOFT_PARTICLES
    float xc = pos_clip.x;
    float yc = pos_clip.y;
    float wc = pos_clip.w;

    v_tex_pos_clip.x = (xc + wc) / 2.0;
    v_tex_pos_clip.y = (yc + wc) / 2.0;
    v_tex_pos_clip.z = wc;
#endif

#if SOFT_PARTICLES || !DISABLE_FOG || NODES
    v_pos_view = pos_view;
#endif

    gl_Position = pos_clip;
    v_pos_world = pos_world.xyz;

#if !PARTICLES_SHADELESS || !DISABLE_FOG
    v_eye_dir = u_camera_eye - pos_world.xyz;
#endif
}

