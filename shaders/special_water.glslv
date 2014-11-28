#var DIR_MIN_SHR_FAC 0.0
#var DIR_FREQ 0.0
#var DIR_NOISE_SCALE 0.0
#var DIR_NOISE_FREQ 0.0
#var DIR_MIN_NOISE_FAC 0.0
#var DST_NOISE_SCALE_0 0.0
#var DST_NOISE_FREQ_0 0.0
#var DST_NOISE_SCALE_1 0.0
#var DST_NOISE_FREQ_1 0.0
#var DST_MIN_FAC 0.0
#var MAX_SHORE_DIST 0.0
#var PRECISION mediump
#var SHORE_MAP_CENTER_X 0.0
#var SHORE_MAP_SIZE_X 0.0
#var SHORE_MAP_CENTER_Y 0.0
#var SHORE_MAP_SIZE_Y 0.0
#var WAVES_HOR_FAC 0.0
#var WATER_LEVEL 0.0
#var WAVES_HEIGHT 0.0
#var WAVES_LENGTH 0.0

/*============================================================================
                                  INCLUDES
============================================================================*/

#include <math.glslv>
#include <to_world.glslv>
#include <scale_texcoord.glslv>
#include <procedural.glslf>

/*============================================================================
                                  ATTRIBUTES
============================================================================*/

attribute vec3 a_position;
#if !GENERATED_MESH
attribute vec2 a_texcoord;
#endif
#if DEBUG_WIREFRAME
attribute float a_polyindex;
#endif
/*============================================================================
                                   UNIFORMS
============================================================================*/

#if STATIC_BATCH
const mat4 u_model_matrix = mat4(1.0);
#else
uniform mat4 u_model_matrix;
#endif

uniform mat4 u_view_matrix;
uniform mat4 u_proj_matrix;

uniform vec3 u_camera_eye;

#if DYNAMIC 
uniform PRECISION float u_time;
uniform vec3 u_wind;
#endif

#if SHORE_SMOOTHING || REFLECTIVE || REFRACTIVE || !DISABLE_FOG
uniform PRECISION float u_view_max_depth;
#endif

#if SHORE_PARAMS
uniform sampler2D u_shore_dist_map;
#endif

/*============================================================================
                                   VARYINGS
============================================================================*/

varying vec3 v_eye_dir;
varying vec3 v_pos_world;

#if !GENERATED_MESH
varying vec2 v_texcoord;
#endif

#if DYNAMIC
varying vec3 v_normal;
# if NUM_NORMALMAPS > 0
varying vec3 v_tangent;
varying vec3 v_binormal;
# endif
# if GENERATED_MESH
varying vec3 v_calm_pos_world;
# endif
#endif

#if SHORE_PARAMS
varying vec3 v_shore_params;
#endif

#if SHORE_SMOOTHING || REFLECTIVE || REFRACTIVE 
varying vec3 v_tex_pos_clip;
#endif

#if SHORE_SMOOTHING || REFLECTIVE || REFRACTIVE || !DISABLE_FOG
varying float v_view_depth;
#endif

#if DEBUG_WIREFRAME
varying vec3 v_barycentric;
#endif

#if SHORE_PARAMS
vec3 extract_shore_params(in vec2 pos) {

    // shore coordinates from world position
    vec2 shore_coords = 0.5 +
            vec2( (pos.x - SHORE_MAP_CENTER_X) / SHORE_MAP_SIZE_X,
                 -(pos.y + SHORE_MAP_CENTER_Y) / SHORE_MAP_SIZE_Y);

    // unpack shore parameters from texture
    vec4 shore_params = texture2D(u_shore_dist_map, shore_coords);

    const vec2 bit_shift = vec2( 1.0/255.0, 1.0);
    float shore_dist = dot(shore_params.ba, bit_shift);
    vec2 dir_to_shore = normalize(shore_params.rg * 2.0 - 1.0);

    return vec3(dir_to_shore, shore_dist);
}
#endif

#if DYNAMIC
#define M_PI 3.14159265359
#define SMALL_WAVES_FAC 0.3
void offset(inout vec3 pos, in float time, in vec3 shore_params) {

    // waves far from the shore
    float dist_waves =
                snoise(DST_NOISE_SCALE_0 * (pos.xz + DST_NOISE_FREQ_0 * time))
              * snoise(DST_NOISE_SCALE_1 * (pos.zx - DST_NOISE_FREQ_1 * time));

# if SHORE_PARAMS
    float shore_waves_length =  WAVES_LENGTH / MAX_SHORE_DIST / M_PI;
    float shore_dist = shore_params.b;
    float dist_fact = sqrt(shore_dist);

    // waves moving towards the shore
    float shore_dir_waves = max(shore_dist, DIR_MIN_SHR_FAC)
            * sin(dist_fact / shore_waves_length + DIR_FREQ * time);

    float dir_noise =
        max(snoise(DIR_NOISE_SCALE * (pos.xz + DIR_NOISE_FREQ * time)),
            DIR_MIN_NOISE_FAC);

    shore_dir_waves *= dir_noise;

    // mix two types of waves
    float waves_height = WAVES_HEIGHT * mix(shore_dir_waves, dist_waves,
                                            max(dist_fact, DST_MIN_FAC));

    // move high vertices towards the shore
    vec2 dir_to_shore = shore_params.rg;
    float wave_factor = WAVES_HOR_FAC * shore_dir_waves
                      * max(MAX_SHORE_DIST / 35.0 * (0.05 - shore_dist), 0.0);
    // horizontal offset for wave inclination
    vec2 hor_offset = wave_factor * dir_to_shore;
# else
    float waves_height = WAVES_HEIGHT * dist_waves;
# endif // SHORE_PARAMS

# if GENERATED_MESH
    // high resolution geometric noise waves
    vec2 coords21 = 2.0 * (pos.xz - 0.1 * time);
    vec2 coords22 = 1.3 * (pos.zx + 0.03  * time);
    float small_waves = 
        cellular2x2(0.5 * coords21).x + cellular2x2(0.5 * coords22).x - 1.0;

#  if SHORE_PARAMS
    pos.xz += hor_offset;
    small_waves *= shore_dist;
#  endif // SHORE_PARAMS
    waves_height += SMALL_WAVES_FAC * small_waves;
# endif // GENERATED_MESH

    pos.y += waves_height;

}
#endif // DYNAMIC

void main(void) {

#if DEBUG_WIREFRAME
    if (a_polyindex == 0.0)
        v_barycentric = vec3(1.0, 0.0, 0.0);
    else if (a_polyindex == 1.0)
        v_barycentric = vec3(0.0, 1.0, 0.0);
    else if (a_polyindex == 2.0)
        v_barycentric = vec3(0.0, 0.0, 1.0);
#endif
    
    vec3 position = a_position;
#if GENERATED_MESH
    float casc_step = abs(position.y);
    vec2 step_xz = u_camera_eye.xz - mod(u_camera_eye.xz, casc_step);
    position.y = WATER_LEVEL;
    position.xz += step_xz;// + vec2(15.0, -15.0);
#else
    v_texcoord = a_texcoord;
#endif

    vertex world = to_world(position, vec3(0.0), vec3(0.0), vec3(0.0), 
            vec3(0.0), u_model_matrix);

#if DYNAMIC && GENERATED_MESH
    v_calm_pos_world = world.position;
#endif

#if SHORE_PARAMS
    v_shore_params = extract_shore_params(world.position.xz);
#endif

#if DYNAMIC
    float wind_str = length(u_wind);
    float w_time = u_time;
    w_time *= wind_str;

# if GENERATED_MESH
    float vertex_delta = casc_step;
# else
    float vertex_delta = 0.1;
# endif

    // generate two neighbour vertices
    vec3 neighbour1 = world.position + vec3(vertex_delta, 0.0, 0.0);
    vec3 neighbour2 = world.position + vec3(0.0, 0.0, vertex_delta);

# if SHORE_PARAMS
    vec3 shore_params_n1 = extract_shore_params(neighbour1.xz);
    vec3 shore_params_n2 = extract_shore_params(neighbour2.xz);
    offset(neighbour1,     w_time, shore_params_n1);
    offset(neighbour2,     w_time, shore_params_n2);
    offset(world.position, w_time, v_shore_params);
# else
    offset(neighbour1, w_time, vec3(0.0));
    offset(neighbour2, w_time, vec3(0.0));
    offset(world.position, w_time, vec3(0.0));
# endif

# if GENERATED_MESH
    // Last need to be flat and a bit lower
    if (a_position.y < 0.0) {
        world.position.y = WATER_LEVEL - 1.0;
        neighbour1.y = world.position.y;
        neighbour2.y = world.position.y;
    }
# endif
    // calculate all surface vectors based on 3 positions
    vec3 bitangent = normalize(neighbour1 - world.position);
    vec3 tangent   = normalize(neighbour2 - world.position);
    v_normal       = normalize(cross(tangent, bitangent));

# if NUM_NORMALMAPS > 0
    v_tangent = tangent;
    v_binormal     = cross(v_normal, v_tangent);
# endif

# if SHORE_PARAMS
    // NOTE: protect mesh from extreme normal values
    float up_dot_norm = dot(v_normal, vec3(0.0, 1.0, 0.0));
    float factor = clamp(0.8 - up_dot_norm, 0.0, 1.0);
    v_normal = mix(v_normal, vec3(0.0, 1.0, 0.0), factor);
# endif

#endif // DYNAMIC

    v_pos_world = world.position;
    v_eye_dir = u_camera_eye - world.position;

    vec4 pos_view = u_view_matrix * vec4(world.position, 1.0);
    vec4 pos_clip = u_proj_matrix * pos_view; 

#if SHORE_SMOOTHING || REFLECTIVE || REFRACTIVE 
    float xc = pos_clip.x;
    float yc = pos_clip.y;
    float wc = pos_clip.w;

    v_tex_pos_clip.x = (xc + wc) / 2.0;
    v_tex_pos_clip.y = (yc + wc) / 2.0;
    v_tex_pos_clip.z = wc;
#endif

#if SHORE_SMOOTHING || REFLECTIVE || REFRACTIVE || !DISABLE_FOG
    v_view_depth = -pos_view.z / u_view_max_depth;
#endif

    gl_Position = pos_clip;
}
