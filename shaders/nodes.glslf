#var WATER_LEVEL 0.0
#var WAVES_HEIGHT 0.0
#var NUM_LAMP_LIGHTS 0
#var NUM_ANIM_VALUES 0

/*============================================================================
                                  INCLUDES
============================================================================*/
#include <std_enums.glsl>

#include <precision_statement.glslf>
#include <pack.glslf>
#include <fog.glslf>

#include <lighting.glslf>
#include <procedural.glslf>
#if CAUSTICS
#include <caustics.glslf>
#endif

#include <gamma.glslf>
#include <math.glslv>

/*============================================================================
                               GLOBAL UNIFORMS
============================================================================*/

uniform float u_time;

uniform vec3  u_horizon_color;
uniform vec3  u_zenith_color;

uniform float u_environment_energy;

#if SKY_TEXTURE
uniform samplerCube u_sky_texture;
#endif

#if NUM_LIGHTS > 0
uniform vec3 u_light_positions[NUM_LIGHTS];
uniform vec3 u_light_directions[NUM_LIGHTS];
uniform vec3 u_light_color_intensities[NUM_LIGHTS];
uniform vec4 u_light_factors1[NUM_LIGHTS];
uniform vec4 u_light_factors2[NUM_LIGHTS];
#endif

#if WATER_EFFECTS && CAUSTICS
uniform vec4 u_sun_quaternion;
#endif

uniform vec3 u_camera_eye_frag;

#if !DISABLE_FOG
uniform vec4 u_fog_color_density;
# if WATER_EFFECTS
uniform vec4 u_underwater_fog_color_density;
uniform float u_cam_water_depth;
# endif
#endif

#if WATER_EFFECTS || !DISABLE_FOG || (CAUSTICS && WATER_EFFECTS)
uniform vec3 u_sun_intensity;
#endif

#if WATER_EFFECTS && CAUSTICS
uniform vec3 u_sun_direction;
#endif

#if !DISABLE_FOG && PROCEDURAL_FOG
uniform mat4 u_cube_fog;
#endif

#if USE_NODE_VECTOR_VIEW || REFLECTIVE
uniform mat4 u_view_matrix_frag;
#endif

/*============================================================================
                               SAMPLER UNIFORMS
============================================================================*/

#if REFLECTIVE
uniform sampler2D u_reflectmap;
uniform vec4 u_refl_plane;
#elif TEXTURE_MIRROR
uniform samplerCube u_mirrormap;
#endif

#if SHADOW_SRC == SHADOW_SRC_MASK

uniform sampler2D u_shadow_mask;

#elif SHADOW_SRC != SHADOW_SRC_NONE
uniform vec4 u_pcf_blur_radii;
uniform vec4 u_csm_center_dists;
uniform sampler2D u_shadow_map0;
# if CSM_SECTION1
uniform sampler2D u_shadow_map1;
# endif
# if CSM_SECTION2
uniform sampler2D u_shadow_map2;
# endif
# if CSM_SECTION3
uniform sampler2D u_shadow_map3;
# endif

#endif

#if USE_NODE_REFRACTION
uniform sampler2D u_refractmap;
uniform sampler2D u_scene_depth;
#endif

/*============================================================================
                               MATERIAL UNIFORMS
============================================================================*/

uniform float u_emit;
uniform float u_ambient;
//uniform float u_normal_factor;
uniform vec4  u_fresnel_params;
uniform float u_specular_alpha;

#if TEXTURE_MIRROR
uniform float u_mirror_factor;
#endif

#if USE_NODE_LAMP
uniform vec3 u_lamp_light_positions[NUM_LAMP_LIGHTS];
uniform vec3 u_lamp_light_directions[NUM_LAMP_LIGHTS];
uniform vec3 u_lamp_light_color_intensities[NUM_LAMP_LIGHTS];
uniform vec4 u_lamp_light_factors[NUM_LAMP_LIGHTS];
#endif

#if USE_NODE_ANIM_VALUE
uniform float u_anim_values[NUM_ANIM_VALUES];
#endif

/*============================================================================
                                   VARYINGS
============================================================================*/

//varying vec3 v_eye_dir;
varying vec3 v_pos_world;
varying vec4 v_pos_view;

#if USE_NODE_MATERIAL || USE_NODE_MATERIAL_EXT || USE_NODE_GEOMETRY_NO || CAUSTICS
varying vec3 v_normal;
# if CALC_TBN_SPACE
varying vec4 v_tangent;
# endif
#endif

#if SHADOW_SRC != SHADOW_SRC_MASK && SHADOW_SRC != SHADOW_SRC_NONE
varying vec4 v_shadow_coord0;
# if CSM_SECTION1
varying vec4 v_shadow_coord1;
# endif
# if CSM_SECTION2
varying vec4 v_shadow_coord2;
# endif
# if CSM_SECTION3
varying vec4 v_shadow_coord3;
# endif
#endif

#if REFLECTIVE || SHADOW_SRC == SHADOW_SRC_MASK || (USE_NODE_REFRACTION && REFRACTIVE)
varying vec3 v_tex_pos_clip;
#endif

#if USE_NODE_REFRACTION && REFRACTIVE
varying float v_view_depth;
#endif

/*============================================================================
                               GLOBAL VARIABLES
============================================================================*/

float ZERO_VALUE_NODES = 0.0;
float UNITY_VALUE_NODES = 1.0;
vec3 UNITY_VECTOR = vec3(UNITY_VALUE_NODES);
vec3 ZERO_VECTOR = vec3(ZERO_VALUE_NODES);

/*============================================================================
                                  FUNCTIONS
============================================================================*/

#include <shadow.glslf>
#include <mirror.glslf>

#if USE_NODE_REFRACTION
#include <refraction.glslf>

vec3 refraction_node(in vec3 normal_in, in float refr_bump) {
    vec3 refract_color = ZERO_VECTOR;
#if REFRACTIVE
    refract_color = material_refraction(v_tex_pos_clip, normal_in.xz * refr_bump);
#endif
    return refract_color;
}
#endif

vec3 get_environment_color(float sky_factor, vec3 normal) {
#if SKY_TEXTURE
    return textureCube(u_sky_texture, normal).rgb;
#else
    return mix(u_horizon_color, u_zenith_color, sky_factor);
#endif
}

#if USE_NODE_HUE_SAT || USE_NODE_MIX_RGB_HUE || USE_NODE_MIX_RGB_SATURATION \
|| USE_NODE_MIX_RGB_VALUE || USE_NODE_MIX_RGB_COLOR || USE_NODE_SEPHSV
vec3 rgb_to_hsv(vec3 rgb)
{
    vec4 k = vec4(ZERO_VALUE_NODES, -UNITY_VALUE_NODES / 3.0, 2.0 / 3.0, -UNITY_VALUE_NODES);
    vec4 p = mix(vec4(rgb.bg, k.wz), vec4(rgb.gb, k.xy), step(rgb.b, rgb.g));
    vec4 q = mix(vec4(p.xyw, rgb.r), vec4(rgb.r, p.yzx), step(p.x, rgb.r));

    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}
#endif

#if USE_NODE_HUE_SAT || USE_NODE_MIX_RGB_HUE || USE_NODE_MIX_RGB_SATURATION \
|| USE_NODE_MIX_RGB_VALUE || USE_NODE_MIX_RGB_COLOR || USE_NODE_COMBHSV
vec3 hsv_to_rgb(vec3 hsv)
{
    vec4 k = vec4(UNITY_VALUE_NODES, 2.0 / 3.0, UNITY_VALUE_NODES / 3.0, 3.0);
    vec3 p = abs(fract(vec3(hsv.r, hsv.r, hsv.r) + k.xyz) * 6.0 - k.www);
    return hsv.b * mix(k.xxx, clamp(p - k.xxx, ZERO_VALUE_NODES, UNITY_VALUE_NODES), hsv.g);
}
#endif

#if USE_NODE_GEOMETRY_UV || USE_NODE_PARALLAX
vec3 uv_to_vec(vec2 uv)
{
    return vec3(uv*2.0 - vec2(UNITY_VALUE_NODES, UNITY_VALUE_NODES), ZERO_VALUE_NODES);
}
#endif

#if USE_NODE_TEXTURE_COLOR || USE_NODE_TEXTURE_NORMAL || USE_NODE_TEXTURE_COLOR2 \
|| USE_NODE_TEXTURE_NORMAL2 || USE_NODE_TEXTURE_COLOR3 || USE_NODE_TEXTURE_NORMAL3 \
|| USE_NODE_TEXTURE_NORMAL4 || USE_NODE_TEXTURE_COLOR4 || USE_NODE_PARALLAX
vec2 vec_to_uv(vec3 vec)
{
    return vec2(vec.xy * 0.5 + vec2(0.5, 0.5));
}
#endif

// NOTE: make special function, because directives are not allowed into #node blocks
void material_apply_mirror(inout vec3 color, vec3 eye_dir, vec3 normal,
                           float reflect_factor) {
#if REFLECTIVE || TEXTURE_MIRROR
# if CALC_TBN_SPACE
    apply_mirror(color, eye_dir, normal, u_fresnel_params[2],
                 u_fresnel_params[3], reflect_factor);
# else
    apply_mirror(color, eye_dir, normal, u_fresnel_params[2],
                 u_fresnel_params[3], reflect_factor);
# endif
#endif
}

 lighting_result mat_lighting(vec3 E, vec3 A, vec3 D, vec3 S,
              vec3 pos_world, vec3 normal, vec3 eye_dir, vec2 specular_params,
              vec2 diffuse_params, float shadow_factor,
              float translucency_color, vec4 translucency_params)
{
#if !SHADELESS_MAT
# if NUM_LIGHTS > 0
    return lighting(E, A, D, S, pos_world, normal, eye_dir, specular_params,
        diffuse_params, shadow_factor, u_light_positions, u_light_directions, u_light_color_intensities,
        u_light_factors1, u_light_factors2, translucency_color, translucency_params);
# else
    return lighting_ambient(E, A, D);
# endif
#else
    lighting_result lresult;
    lresult.color = vec4(D, ZERO_VALUE_NODES);
    lresult.specular = ZERO_VECTOR;
    return lresult;
#endif
}

#node CAMERA
    #node_out vec3 vec_view
    #node_out float val_z
    #node_out float val_dist
    vec_view = normalize(nin_pos_view.xyz);
    val_z = abs(nin_pos_view.z);
    val_dist = length(nin_pos_view.xyz);
#endnode

#node COMBRGB
    #node_in float r
    #node_in float g
    #node_in float b
    #node_out vec3 color
    color = vec3(r,g,b);
#endnode

#node COMBHSV
    #node_in float h
    #node_in float s
    #node_in float v
    #node_out vec3 color
    color = hsv_to_rgb(vec3(h, s, v));
#endnode

#node GEOMETRY_UV
    #node_out vec3 uv
    #node_param varying vec2 v_uv
    uv = uv_to_vec(v_uv);
#endnode

#node GEOMETRY_VC
    #node_out vec3 vc
    #node_param varying vec3 v_vc
    vc = v_vc;
#endnode

#node GEOMETRY_VC1
    #node_out float channel0_out
    #node_param varying float v_vc
    channel0_out = v_vc;
#endnode

#node GEOMETRY_VC2
    #node_out float channel0_out
    #node_out float channel1_out
    #node_param varying vec2 v_vc
    channel0_out = v_vc[0];
    channel1_out = v_vc[1];
#endnode

#node GEOMETRY_VC3
    #node_out float channel0_out
    #node_out float channel1_out
    #node_out float channel2_out
    #node_param varying vec3 v_vc
    channel0_out = v_vc[0];
    channel1_out = v_vc[1];
    channel2_out = v_vc[2];
#endnode

#node GEOMETRY_NO
    #node_out vec3 normal_out
    normal_out = nin_normal;
#endnode

#node GEOMETRY_FB
    #node_out float frontback
    // NOTE: possible compatibility issues
    // 1 front, 0 back
    frontback = (gl_FrontFacing) ? UNITY_VALUE_NODES : ZERO_VALUE_NODES;
#endnode

#node GEOMETRY_VW
    #node_out vec3 view_out
    view_out = nin_eye_dir;
#endnode

#node GEOMETRY_GL
    #node_out vec3 global_out
    global_out = vec3(nin_pos_world.r, -nin_pos_world.b, nin_pos_world.g);
#endnode

#node HUE_SAT
    #node_in float hue
    #node_in float saturation
    #node_in float value
    #node_in float factor
    #node_in vec3 color_in
    #node_out vec3 color
{
    vec3 hsv = rgb_to_hsv(color_in);
    hsv[0] += (hue - 0.5);
    if (hsv[0] > UNITY_VALUE_NODES)
        hsv[0] -= UNITY_VALUE_NODES;
    else if (hsv[0] < ZERO_VALUE_NODES)
        hsv[0] += UNITY_VALUE_NODES;

    hsv *= vec3(UNITY_VALUE_NODES, saturation, value);
    hsv = mix(UNITY_VECTOR, mix(ZERO_VECTOR, hsv, step(ZERO_VECTOR, hsv)), step(hsv, UNITY_VECTOR));
    color = mix(color_in, hsv_to_rgb(hsv), factor);
}
#endnode

#node INVERT
    #node_in float factor
    #node_in vec3 color_in
    #node_out vec3 color
    color = mix(color_in, UNITY_VECTOR - color_in, factor);
#endnode

#node LAMP
    #node_out vec3 color_out
    #node_out vec3 light_vec_out
    #node_out float distance_out
    #node_out float visibility_factor_out
    #node_param const float lamp_index_f
{
    const int lamp_index = int(lamp_index_f);
    vec4 llf = u_lamp_light_factors[lamp_index];
    vec3 lld = u_lamp_light_directions[lamp_index];
    vec3 llp = u_lamp_light_positions[lamp_index];

    float lamp_dist = llf.z;

    color_out = u_lamp_light_color_intensities[lamp_index];

    // see process_lamp
    if (lamp_dist != -UNITY_VALUE_NODES) { // point and spot
        light_vec_out = llp - v_pos_world;
        distance_out = length(light_vec_out);
        light_vec_out = normalize(light_vec_out);
        visibility_factor_out = lamp_dist / (lamp_dist + distance_out * distance_out);

        float spot_size = llf.x;
        float spot_blend = llf.y;
        if (spot_size > -UNITY_VALUE_NODES) {
            float spot_factor = dot(light_vec_out, lld);
            spot_factor *= smoothstep(ZERO_VALUE_NODES, UNITY_VALUE_NODES,
                    (spot_factor - spot_size) / spot_blend);
            visibility_factor_out *= spot_factor;
        }
    } else { // sun and hemi
        light_vec_out = lld;
        distance_out = length(llp - v_pos_world);
        visibility_factor_out = UNITY_VALUE_NODES;
    }
}
#endnode

#node NORMAL
    #node_in vec3 normal_in
    #node_out vec3 normal_out
    #node_out float dot_out
    #node_param vec3 normal_param
    normal_out = normal_param;
    // NOTE: (-) mimic blender behavior
    dot_out = -dot(normal_in, normal_param);
#endnode

#node VECTOR_VIEW
    #node_in vec3 normal_in
    #node_out vec3 normal
    // NOTE: (-) mimic blender behavior
    normal = -(u_view_matrix_frag * vec4(normal_in, ZERO_VALUE_NODES)).xyz;
#endnode

#node MAPPING_LIGHT
    #node_in vec3 vec_in
    #node_out vec3 vec
    #node_param vec3 scale
    //vec = (vec_in + 0.5) * scale - 0.5;
    vec = vec_in * scale;
#endnode

#node MAPPING_HEAVY
    #node_in vec3 vec_in
    #node_out vec3 vec
    #node_param mat4 trs_matrix
    #node_param float use_min
    #node_param float use_max
    #node_param vec3 min_clip
    #node_param vec3 max_clip

    vec = (trs_matrix * vec4(vec_in, UNITY_VALUE_NODES)).xyz;

    // FIXME AMD/Windows issue
    //vec = (mat4(0.6, 0.0, 0.0, 0.0, 0.0, 0.6, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, -0.175, 0.0, 1.0) * vec4(vec_in, 1.0)).xyz;
    //vec = (mat4(-0.69, -0.012, 0.0, 0.0, 0.012, -0.69, 0.0, 0.0, 0.0, 0.0, 0.69, 0.0, 0.26, 1.28, 0.0, 1.0) * vec4(vec_in, 1.0)).xyz;

    if (use_min == UNITY_VALUE_NODES)
        vec = max(vec, min_clip);
    if (use_max == UNITY_VALUE_NODES)
        vec = min(vec, max_clip);
#endnode

#node MATH_ADD
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val
    val = val_in1 + val_in2;
#endnode
#node MATH_SUBTRACT
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val
    val = val_in1 - val_in2;
#endnode
#node MATH_MULTIPLY
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val
    val = val_in1 * val_in2;
#endnode
#node MATH_DIVIDE
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val
    val = (val_in2 != ZERO_VALUE_NODES) ? val_in1/val_in2 : ZERO_VALUE_NODES;
#endnode
#node MATH_SINE
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val
    val = sin(val_in1);
    // NOTE: using unused variable to pass shader verification
    val_in2;
#endnode
#node MATH_COSINE
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val
    val = cos(val_in1);
    // NOTE: using unused variable to pass shader verification
    val_in2;
#endnode
#node MATH_TANGENT
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val
    val = tan(val_in1);
    // NOTE: using unused variable to pass shader verification
    val_in2;
#endnode
#node MATH_ARCSINE
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val
    val = (val_in1 <= UNITY_VALUE_NODES && val_in1 >= -UNITY_VALUE_NODES) ? asin(val_in1) : ZERO_VALUE_NODES;
    // NOTE: using unused variable to pass shader verification
    val_in2;
#endnode
#node MATH_ARCCOSINE
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val
    val = (val_in1 <= UNITY_VALUE_NODES && val_in1 >= -UNITY_VALUE_NODES) ? acos(val_in1) : ZERO_VALUE_NODES;
    // NOTE: using unused variable to pass shader verification
    val_in2;
#endnode
#node MATH_ARCTANGENT
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val
    val = atan(val_in1);
    // NOTE: using unused variable to pass shader verification
    val_in2;
#endnode
#node MATH_POWER
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val
    // return zero value for special cases which causes undefined result;
    // according to pow specification:
    // https://www.opengl.org/sdk/docs/man/html/pow.xhtml
    if (val_in1 < ZERO_VALUE_NODES || val_in1 == ZERO_VALUE_NODES && val_in2 == ZERO_VALUE_NODES)
        val = ZERO_VALUE_NODES;
    else
        val = pow(val_in1, val_in2);
#endnode
#node MATH_LOGARITHM
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val
    val = (val_in1 > ZERO_VALUE_NODES && val_in2 > ZERO_VALUE_NODES) ?
            log2(val_in1) / log2(val_in2) : ZERO_VALUE_NODES;
#endnode
#node MATH_MINIMUM
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val
    val = min(val_in1, val_in2);
#endnode
#node MATH_MAXIMUM
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val
    val = max(val_in1, val_in2);
#endnode
#node MATH_ROUND
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val
    val = floor(val_in1 + 0.5);
    // NOTE: using unused variable to pass shader verification
    val_in2;
#endnode
#node MATH_LESS_THAN
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val
    val = (val_in1 < val_in2) ? UNITY_VALUE_NODES : ZERO_VALUE_NODES;
#endnode
#node MATH_GREATER_THAN
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val
    val = (val_in1 > val_in2) ? UNITY_VALUE_NODES : ZERO_VALUE_NODES;
#endnode
#node MATH_MODULO
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val
    val = abs(val_in2) > 0.000001 ? mod(val_in1, val_in2) : ZERO_VALUE_NODES;
#endnode
#node MATH_ABSOLUTE
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val
    val = abs(val_in1);
    // NOTE: using unused variable to pass shader verification
    val_in2;
#endnode


#node MIX_RGB_MIX
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color
{
    float clamped_factor = clamp(factor, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
    color = mix(color1, color2, clamped_factor);
}
#endnode
#node MIX_RGB_ADD
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color
{
    float clamped_factor = clamp(factor, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
    color = mix(color1, color1 + color2, clamped_factor);
}
#endnode
#node MIX_RGB_MULTIPLY
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color
{
    float clamped_factor = clamp(factor, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
    color = mix(color1, color1 * color2, clamped_factor);
}
#endnode
#node MIX_RGB_SUBTRACT
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color
{
    float clamped_factor = clamp(factor, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
    color = mix(color1, color1 - color2, clamped_factor);
}
#endnode
#node MIX_RGB_SCREEN
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color
{
    float clamped_factor = clamp(factor, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
    float factorm = UNITY_VALUE_NODES - clamped_factor;
    color = UNITY_VECTOR - (vec3(factorm) + clamped_factor*(UNITY_VECTOR - color2)) *
            (UNITY_VECTOR - color1);
}
#endnode
#node MIX_RGB_DIVIDE
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color
{
    float clamped_factor = clamp(factor, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
    float factorm = UNITY_VALUE_NODES - clamped_factor;
    color2 += step(color2, ZERO_VECTOR);
    color = factorm*color1 + clamped_factor*color1/color2;
}
#endnode
#node MIX_RGB_DIFFERENCE
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color
{
    float clamped_factor = clamp(factor, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
    color = mix(color1, abs(color1 - color2), clamped_factor);
}
#endnode
#node MIX_RGB_DARKEN
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color
{
    float clamped_factor = clamp(factor, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
    color = min(color1.rgb, color2.rgb * clamped_factor);
}
#endnode
#node MIX_RGB_LIGHTEN
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color
{
    float clamped_factor = clamp(factor, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
    color = max(color1.rgb, color2.rgb * clamped_factor);
}
#endnode
#node MIX_RGB_OVERLAY
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color
{
    float clamped_factor = clamp(factor, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
    float factorm = UNITY_VALUE_NODES - clamped_factor;
    vec3 f_vec = vec3(factorm);
    color = mix(color1 * (f_vec + 2.0*clamped_factor*color2),
                UNITY_VECTOR - (f_vec + 2.0*clamped_factor*(UNITY_VECTOR - color2)) * (UNITY_VECTOR - color1),
                step(0.5, color1));
}
#endnode
#node MIX_RGB_DODGE
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color
{
    float clamped_factor = clamp(factor, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
    vec3 tmp = UNITY_VECTOR - clamped_factor * color2;
    vec3 tmp1 = color1 / (tmp + step(tmp, ZERO_VECTOR));
    color = (UNITY_VECTOR - step(color1, ZERO_VECTOR)) * mix(
                  mix(UNITY_VECTOR, tmp1, step(tmp1, UNITY_VECTOR)),
                  UNITY_VECTOR,
                  step(tmp, ZERO_VECTOR));
}
#endnode
#node MIX_RGB_BURN
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color
{
    float clamped_factor = clamp(factor, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
    vec3 tmp = UNITY_VECTOR - clamped_factor * (UNITY_VECTOR - color2);
    vec3 tmp1 = UNITY_VECTOR - (UNITY_VECTOR - color1)/(tmp + step(tmp, ZERO_VECTOR));
    color = mix(mix(ZERO_VECTOR, mix(UNITY_VECTOR, tmp1, step(tmp1, UNITY_VECTOR)), step(ZERO_VALUE_NODES, tmp1)),
                ZERO_VECTOR,
                step(tmp, ZERO_VECTOR));
}
#endnode
#node MIX_RGB_HUE
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color
{
    float clamped_factor = clamp(factor, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
    vec3 hsv, hsv2, tmp;

    color = color1;

    hsv2 = rgb_to_hsv(color2);

    if (hsv2.y != ZERO_VALUE_NODES) {
        hsv = rgb_to_hsv(color);
        hsv.x = hsv2.x;
        tmp = hsv_to_rgb(hsv);

        color = mix(color, tmp, clamped_factor);
    }
}
#endnode
#node MIX_RGB_SATURATION
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color
{
    float clamped_factor = clamp(factor, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
    float factorm = UNITY_VALUE_NODES - clamped_factor;

    color = color1;

    vec3 hsv, hsv2;
    hsv = rgb_to_hsv(color);

    if (hsv.y != ZERO_VALUE_NODES) {
        hsv2 = rgb_to_hsv(color2);

        hsv.y = factorm*hsv.y + clamped_factor*hsv2.y;
        color = hsv_to_rgb(hsv);
    }
}
#endnode
#node MIX_RGB_VALUE
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color
{
    float clamped_factor = clamp(factor, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
    float factorm = UNITY_VALUE_NODES - clamped_factor;
    vec3 hsv, hsv2;

    hsv = rgb_to_hsv(color1);
    hsv2 = rgb_to_hsv(color2);

    hsv.z = factorm*hsv.z + clamped_factor*hsv2.z;
    color = hsv_to_rgb(hsv);
}
#endnode
#node MIX_RGB_COLOR
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color
{
    float clamped_factor = clamp(factor, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
    vec3 hsv, hsv2, tmp;

    color = color1;

    hsv2 = rgb_to_hsv(color2);

    if (hsv2.y != ZERO_VALUE_NODES) {
        hsv = rgb_to_hsv(color);
        hsv.x = hsv2.x;
        hsv.y = hsv2.y;
        tmp = hsv_to_rgb(hsv);

        color = mix(color, tmp, clamped_factor);
    }
}
#endnode
#node MIX_RGB_SOFT_LIGHT
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color
{
    float clamped_factor = clamp(factor, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
    float factorm = UNITY_VALUE_NODES - clamped_factor;
    vec3 scr = color2 + color1 - color2 * color1;

    color = color1 * (vec3(factorm) + vec3(clamped_factor) * ((UNITY_VECTOR - color1)*color2 + scr));
}

#endnode
#node MIX_RGB_LINEAR_LIGHT
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color
{
    float clamped_factor = clamp(factor, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
    color = clamp(color1 + clamped_factor * (2.0 * color2 - UNITY_VECTOR), ZERO_VALUE_NODES, UNITY_VALUE_NODES);
}
#endnode

#node OUTPUT
    #node_in vec3 color_in
    #node_in float alpha_in

    nout_color = color_in;
    nout_alpha = alpha_in;
#endnode

#node MATERIAL
    #node_in vec3 color_in
    #node_in float alpha_in
    #node_in vec3 specular_color
    #node_in vec3 normal_in
    #node_out vec3 color_out
    #node_out float alpha_out
    #node_out vec3 normal_out
    #node_param const vec3 diffuse_params // vec3(use_diffuse, diffuse_param, diffuse_param2)
    #node_param const vec4 specular_params// vec3(use_spec, intensity, spec_param_0, spec_param_1)
    #node_param const float use_normal_in
{
    // NOTE: fixes some cross-platform issues
    color_in = clamp(color_in, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
    alpha_in = clamp(alpha_in, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
    specular_color = clamp(specular_color, ZERO_VALUE_NODES, UNITY_VALUE_NODES);

    // diffuse
    vec3 D = color_in;
    float use_diffuse = diffuse_params[0];
    vec2 diffuse_param = vec2(diffuse_params[1], diffuse_params[2]);
    // emission
    vec3 E = nin_emit * color_in;
    // specular
    vec3 S = specular_params[1] * specular_color;
    float use_spec = specular_params[0];
    vec2 sp_params = vec2(specular_params[2], specular_params[3]);

    float shadow_factor = calc_shadow_factor(D);

    vec3 normal;
    if (use_normal_in == UNITY_VALUE_NODES)
        normal = normalize(normal_in);
    else
        normal = nin_normal;

    // ambient
    float sky_factor = 0.5 * normal.y + 0.5; // dot of vertical vector and normalz
    vec3 A = nin_ambient * u_environment_energy * get_environment_color(sky_factor, normal);

    lighting_result lresult = mat_lighting(E, A, D, S, nin_pos_world,
        normal, nin_eye_dir, sp_params, diffuse_param, shadow_factor,
        ZERO_VALUE_NODES, vec4(ZERO_VALUE_NODES));

    color_out = (use_diffuse == UNITY_VALUE_NODES) ? lresult.color.rgb : ZERO_VECTOR;
    alpha_out = alpha_in;
    normal_out = normal;

    if (use_spec == UNITY_VALUE_NODES) {
        alpha_out += lresult.color.a * S.r * nin_spec_alpha;
        alpha_out = clamp(alpha_out, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
        color_out += lresult.specular;
        nout_specular_color = lresult.specular;
    } else {
        nout_specular_color = ZERO_VECTOR;
    }

    nout_normal = normal;
    nout_shadow_factor = shadow_factor;
}
#endnode

#node MATERIAL_EXT
    #node_in vec3 color_in
    #node_in float alpha_in
    #node_in vec3 specular_color
    #node_in vec3 normal_in
    #node_in float emit_intensity
    #node_in float translucency_color
    #node_in vec4 translucency_params
    #node_in float reflect_factor
    #node_in float specular_alpha
    #node_out vec3 color_out
    #node_out float alpha_out
    #node_out vec3 normal_out
    #node_out vec3 diffuse_out
    #node_out vec3 spec_out
    #node_param const vec3 diffuse_params // vec3(use_diffuse, diffuse_param, diffuse_param2)
    #node_param const vec4 specular_params// vec3(use_spec, intensity, spec_param_0, spec_param_1)
    #node_param const float use_normal_in
{
    // NOTE: fixes some cross-platform issues
    color_in = clamp(color_in, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
    alpha_in = clamp(alpha_in, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
    specular_color = clamp(specular_color, ZERO_VALUE_NODES, UNITY_VALUE_NODES);

    // diffuse
    vec3 D = color_in;
    float use_diffuse = diffuse_params[0];
    vec2 diffuse_param = vec2(diffuse_params[1], diffuse_params[2]);
    // emission
    vec3 E = emit_intensity * color_in;
    // specular
    vec3 S = specular_params[1] * specular_color;
    float use_spec = specular_params[0];
    vec2 sp_params = vec2(specular_params[2], specular_params[3]);

    float shadow_factor = calc_shadow_factor(D);

    vec3 normal;
    if (use_normal_in == UNITY_VALUE_NODES)
        normal = normalize(normal_in);
    else
        normal = nin_normal;

    // ambient
    float sky_factor = 0.5 * normal.y + 0.5; // dot of vertical vector and normalz
    vec3 A = nin_ambient * u_environment_energy * get_environment_color(sky_factor, normal);

    lighting_result lresult = mat_lighting(E, A, D, S, nin_pos_world,
        normal, nin_eye_dir, sp_params, diffuse_param, shadow_factor,
        translucency_color, translucency_params);

    color_out = (use_diffuse == UNITY_VALUE_NODES) ? lresult.color.rgb : ZERO_VECTOR;
    alpha_out = alpha_in;
    normal_out = normal;
    diffuse_out = lresult.color.rgb;
    spec_out = lresult.specular;

    material_apply_mirror(color_out, nin_eye_dir, normal_out, reflect_factor);

    if (use_spec == UNITY_VALUE_NODES) {
        color_out += lresult.specular;
        alpha_out += lresult.color.a * S.r * specular_alpha;
        alpha_out = clamp(alpha_out, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
        nout_specular_color = lresult.specular;
    } else {
        nout_specular_color = ZERO_VECTOR;
    }
    nout_normal = normal;
    nout_shadow_factor = shadow_factor;
}
#endnode

#node RGB
    #node_out vec3 color_out
    #node_param vec3 color
    color_out = color;
#endnode

#node RGBTOBW
    #node_in vec3 color_in
    #node_out float value
    value = color_in.r * 0.35 + color_in.g * 0.45 + color_in.b * 0.2;
#endnode

#node SEPRGB
    #node_in vec3 color
    #node_out float r_out
    #node_out float g_out
    #node_out float b_out
    // NODE: r = color.r  is not working
    r_out = color.r;
    g_out = color.g;
    b_out = color.b;
#endnode

#node SEPHSV
    #node_in vec3 color
    #node_out float h_out
    #node_out float s_out
    #node_out float v_out
{
    vec3 out_col = rgb_to_hsv(color);
    h_out = out_col.r;
    s_out = out_col.g;
    v_out = out_col.b;
}
#endnode

#node SQUEEZE
    #node_in float value_in
    #node_in float width
    #node_in float center
    #node_out float value
    value = UNITY_VALUE_NODES / (UNITY_VALUE_NODES + pow(2.71828183, -((value_in-center)*width)));
#endnode

#node SRGB_TO_LINEAR
    #node_in vec3 color_in
    #node_out vec3 color_out
    color_out = max(ZERO_VECTOR, color_in);
    color_out = pow(color_out, vec3(2.2));
#endnode
#node LINEAR_TO_SRGB
    #node_in vec3 color_in
    #node_out vec3 color_out
    color_out = max(ZERO_VECTOR, color_in);
    color_out = pow(color_out, vec3(UNITY_VALUE_NODES/2.2));
#endnode

#node TEXTURE_COLOR
    #node_in vec3 uv
    #node_out vec3 color
    #node_out float value
    #node_param uniform sampler2D texture
{
    vec4 texval = texture2D(texture, vec_to_uv(uv));
    color = texval.xyz;
    srgb_to_lin(color);
    value = texval.w;
}
#endnode

#node TEXTURE_NORMAL
    #node_in vec3 uv
    #node_out vec3 normal
    #node_out float value
    #node_param uniform sampler2D texture
{
    vec4 texval = texture2D(texture, vec_to_uv(uv));
    nout_normalmap = texval.xyz - 0.5;
    //n = mix(vec3(0.0, 0.0, 1.0), n, u_normal_factor);
    normal = normalize(nin_tbn_matrix * nout_normalmap);
    //normal = vec3(1.0, 1.0, 1.0);
    value = texval.w;
}
#endnode

#node TEXTURE_ENVIRONMENT
    #node_in vec3 coords
    #node_out vec3 color
    #node_out float value
    #node_param uniform samplerCube texture
{
    vec4 texval = textureCube(texture, coords);
    color = texval.xyz;
    srgb_to_lin(color);
    value = texval.w;
}
#endnode

#node TEXTURE_COLOR2
    #node_in vec3 uv
    #node_in vec3 uv2
    #node_out vec3 color
    #node_out float value
    #node_out vec3 color2
    #node_out float value2
    #node_param uniform sampler2D texture
{
    vec4 texval = texture2D(texture, vec_to_uv(uv));
    color = texval.xyz;

    srgb_to_lin(color);
    value = texval.w;

    texval = texture2D(texture, vec_to_uv(uv2));
    color2 = texval.xyz;
    srgb_to_lin(color2);
    value2 = texval.w;

    //
    //color2 = vec3(1.0, 0.0, 0.0);
}
#endnode

#node TEXTURE_NORMAL2
    #node_in vec3 uv
    #node_in vec3 uv2
    #node_out vec3 normal
    #node_out float value
    #node_out vec3 normal2
    #node_out float value2
    #node_param uniform sampler2D texture
{
    vec4 texval = texture2D(texture, vec_to_uv(uv));
    nout_normalmap = texval.xyz - 0.5;
    //n = mix(vec3(0.0, 0.0, 1.0), n, u_normal_factor);
    normal = normalize(nin_tbn_matrix * nout_normalmap);
    //normal = vec3(1.0, 1.0, 1.0);
    value = texval.w;

    texval = texture2D(texture, vec_to_uv(uv2));
    nout_normalmap = texval.xyz - 0.5;
    //n = mix(vec3(0.0, 0.0, 1.0), n, u_normal_factor);
    normal2 = normalize(nin_tbn_matrix * nout_normalmap);
    //normal = vec3(1.0, 1.0, 1.0);
    value2 = texval.w;
}
#endnode

#node TEXTURE_COLOR3
    #node_in vec3 uv
    #node_in vec3 uv2
    #node_in vec3 uv3
    #node_out vec3 color
    #node_out float value
    #node_out vec3 color2
    #node_out float value2
    #node_out vec3 color3
    #node_out float value3
    #node_param uniform sampler2D texture
{
    vec4 texval = texture2D(texture, vec_to_uv(uv));
    color = texval.xyz;
    srgb_to_lin(color);
    value = texval.w;

    texval = texture2D(texture, vec_to_uv(uv2));
    color2 = texval.xyz;
    srgb_to_lin(color2);
    value2 = texval.w;

    texval = texture2D(texture, vec_to_uv(uv3));
    color3 = texval.xyz;
    srgb_to_lin(color3);
    value3 = texval.w;
}
#endnode

#node TEXTURE_COLOR4
    #node_in vec3 uv
    #node_in vec3 uv2
    #node_in vec3 uv3
    #node_in vec3 uv4
    #node_out vec3 color
    #node_out float value
    #node_out vec3 color2
    #node_out float value2
    #node_out vec3 color3
    #node_out float value3
    #node_out vec3 color4
    #node_out float value4
    #node_param uniform sampler2D texture
{
    vec4 texval = texture2D(texture, vec_to_uv(uv));
    color = texval.xyz;
    srgb_to_lin(color);
    value = texval.w;

    texval = texture2D(texture, vec_to_uv(uv2));
    color2 = texval.xyz;
    srgb_to_lin(color2);
    value2 = texval.w;

    texval = texture2D(texture, vec_to_uv(uv3));
    color3 = texval.xyz;
    srgb_to_lin(color3);
    value3 = texval.w;

    texval = texture2D(texture, vec_to_uv(uv4));
    color4 = texval.xyz;
    srgb_to_lin(color4);
    value4 = texval.w;
}
#endnode

#node TEXTURE_NORMAL3
    #node_in vec3 uv
    #node_in vec3 uv2
    #node_in vec3 uv3
    #node_out vec3 normal
    #node_out float value
    #node_out vec3 normal2
    #node_out float value2
    #node_out vec3 normal3
    #node_out float value3
    #node_param uniform sampler2D texture
{
    vec4 texval = texture2D(texture, vec_to_uv(uv));
    nout_normalmap = texval.xyz - 0.5;
    //n = mix(vec3(0.0, 0.0, 1.0), n, u_normal_factor);
    normal = normalize(nin_tbn_matrix * nout_normalmap);
    //normal = vec3(1.0, 1.0, 1.0);
    value = texval.w;

    texval = texture2D(texture, vec_to_uv(uv2));
    nout_normalmap = texval.xyz - 0.5;
    //n = mix(vec3(0.0, 0.0, 1.0), n, u_normal_factor);
    normal2 = normalize(nin_tbn_matrix * nout_normalmap);
    //normal = vec3(1.0, 1.0, 1.0);
    value2 = texval.w;

    texval = texture2D(texture, vec_to_uv(uv3));
    nout_normalmap = texval.xyz - 0.5;
    //n = mix(vec3(0.0, 0.0, 1.0), n, u_normal_factor);
    normal3 = normalize(nin_tbn_matrix * nout_normalmap);
    //normal = vec3(1.0, 1.0, 1.0);
    value3 = texval.w;
}
#endnode

#node TEXTURE_NORMAL4
    #node_in vec3 uv
    #node_in vec3 uv2
    #node_in vec3 uv3
    #node_in vec3 uv4
    #node_out vec3 normal
    #node_out float value
    #node_out vec3 normal2
    #node_out float value2
    #node_out vec3 normal3
    #node_out float value3
    #node_out vec3 normal4
    #node_out float value4
    #node_param uniform sampler2D texture
{
    vec4 texval = texture2D(texture, vec_to_uv(uv));
    nout_normalmap = texval.xyz - 0.5;
    //n = mix(vec3(0.0, 0.0, 1.0), n, u_normal_factor);
    normal = normalize(nin_tbn_matrix * nout_normalmap);
    //normal = vec3(1.0, 1.0, 1.0);
    value = texval.w;

    texval = texture2D(texture, vec_to_uv(uv2));
    nout_normalmap = texval.xyz - 0.5;
    //n = mix(vec3(0.0, 0.0, 1.0), n, u_normal_factor);
    normal2 = normalize(nin_tbn_matrix * nout_normalmap);
    //normal = vec3(1.0, 1.0, 1.0);
    value2 = texval.w;

    texval = texture2D(texture, vec_to_uv(uv3));
    nout_normalmap = texval.xyz - 0.5;
    //n = mix(vec3(0.0, 0.0, 1.0), n, u_normal_factor);
    normal3 = normalize(nin_tbn_matrix * nout_normalmap);
    //normal = vec3(1.0, 1.0, 1.0);
    value3 = texval.w;

    texval = texture2D(texture, vec_to_uv(uv4));
    nout_normalmap = texval.xyz - 0.5;
    //n = mix(vec3(0.0, 0.0, 1.0), n, u_normal_factor);
    normal4 = normalize(nin_tbn_matrix * nout_normalmap);
    //normal = vec3(1.0, 1.0, 1.0);
    value4 = texval.w;
}
#endnode

#node VALUE
    #node_out float value_out
    #node_param const float value
    value_out = value;
#endnode
#node ANIM_VALUE
    #node_out float value_out
    #node_param const int ind
    value_out = u_anim_values[ind];
#endnode

#node VECT_MATH_ADD
    #node_in vec3 vec_in1
    #node_in vec3 vec_in2
    #node_out vec3 vec
    #node_out float val
    vec = vec_in1 + vec_in2;
    // questionable
    val = (abs(vec[0]) + abs(vec[1]) + abs(vec[2]))/3.0;
#endnode
#node VECT_MATH_SUBTRACT
    #node_in vec3 vec_in1
    #node_in vec3 vec_in2
    #node_out vec3 vec
    #node_out float val
    vec = vec_in1 - vec_in2;
    // questionable
    val = (abs(vec[0]) + abs(vec[1]) + abs(vec[2]))/3.0;
#endnode
#node VECT_MATH_AVERAGE
    #node_in vec3 vec_in1
    #node_in vec3 vec_in2
    #node_out vec3 vec
    #node_out float val
    vec = vec_in1 + vec_in2;
    val = length(vec);
    vec = normalize(vec);
#endnode
#node VECT_MATH_DOT_PRODUCT
    #node_in vec3 vec_in1
    #node_in vec3 vec_in2
    #node_out vec3 vec
    #node_out float val
    vec = ZERO_VECTOR;
    val = dot(vec_in1, vec_in2);
#endnode
#node VECT_MATH_CROSS_PRODUCT
    #node_in vec3 vec_in1
    #node_in vec3 vec_in2
    #node_out vec3 vec
    #node_out float val
    vec = cross(vec_in1, vec_in2);
    val = length(vec);
#endnode
#node VECT_MATH_NORMALIZE
    #node_in vec3 vec_in1
    #node_in vec3 vec_in2
    #node_out vec3 vec
    #node_out float val
    vec = normalize(vec_in1);
    val = length(vec_in1);
    // NOTE: using unused variable to pass shader verification
    vec_in2;
#endnode

#node REFLECT
    #node_in vec3 vec_in1
    #node_in vec3 vec_in2
    #node_out vec3 vec_out
    vec_out = reflect(-vec_in1, vec_in2);
#endnode

#node PARALLAX
    #node_in vec3 uv_in
    #node_in float parallax_scale
    #node_in const float steps
    #node_in const float lod_dist
    #node_out vec3 uv_out
    #node_param uniform sampler2D texture // heigth is written in alpha channel
{
    float view_dist = length(nin_pos_view);

    if (view_dist < lod_dist) {

        vec2 texcoord = vec_to_uv(uv_in);

        float multiplier = clamp(0.5 * (lod_dist - view_dist),
                                 ZERO_VALUE_NODES, UNITY_VALUE_NODES);
        float scale = parallax_scale * multiplier;

        // transform eye to tangent space
        vec3 eye = normalize(nin_eye_dir * nin_tbn_matrix);

        // distance between checked layers
        float pstep = UNITY_VALUE_NODES / steps;

        // adjustment for one layer height of the layer
        vec2 dtex = eye.xy * scale / (steps * eye.z);

        float height = UNITY_VALUE_NODES;

        float h = texture2D(texture, texcoord).a; // get height

        for (float i = 1.0; i <= steps; i++)
        {
            if (h < height) {
                height   -= pstep;
                texcoord -= dtex;
                h         = texture2D(texture, texcoord).a;
            }
        }

        // find point via linear interpolation
        vec2 prev = texcoord + dtex;
        float h_prev = texture2D(texture, prev).a - (height + pstep);
        float h_current = h - height;
        float weight = h_current / (h_current - h_prev);

        // interpolate to get tex coords
        texcoord = weight * prev + (UNITY_VALUE_NODES - weight) * texcoord;
        uv_out = uv_to_vec(texcoord);
    } else
        uv_out = uv_in;
}
#endnode

#node CLAMP
    #node_in vec3 vector_in
    #node_out vec3 vector_out
    vector_out = clamp(vector_in, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
#endnode

#node REFRACTION
    #node_in vec3 normal_in
    #node_in float refr_bump
    #node_out vec3 color_out
    color_out = refraction_node(normal_in, refr_bump);
#endnode

#node TRANSLUCENCY
    #node_in float color
    #node_in float backside_factor
    #node_in float spot_hardness
    #node_in float spot_intensity
    #node_in float spot_diff_factor

    #node_out float translucency_color
    #node_out vec4 translucency_params

    translucency_color = color;
    translucency_params = vec4(backside_factor, spot_hardness, spot_intensity, spot_diff_factor);

#endnode

#node TIME
    #node_out float time
    time = u_time;
#endnode

#node SMOOTHSTEP
    #node_in float value
    #node_in float edge0
    #node_in float edge1
    #node_out float val
    val = smoothstep(edge0, edge1, value);
#endnode

#nodes_global

/*============================================================================
                                    MAIN
============================================================================*/

void main(void) {

#if WATER_EFFECTS || !DISABLE_FOG || (CAUSTICS && WATER_EFFECTS)
    vec3 sun_color_intens = u_sun_intensity;
#endif

#if WATER_EFFECTS
    float plane_dist = v_pos_world.y - WATER_LEVEL;
#endif

#if USE_NODE_MATERIAL || USE_NODE_MATERIAL_EXT || USE_NODE_GEOMETRY_NO || CAUSTICS
    vec3 sided_normal = v_normal;
# if DOUBLE_SIDED_LIGHTING
    // NOTE: workaround for some bug with gl_FrontFacing on Intel graphics
    // or open-source drivers
    if (gl_FrontFacing)
        sided_normal = sided_normal;
    else
        sided_normal = -sided_normal;
# endif
# if CALC_TBN_SPACE
    vec3 binormal = cross(sided_normal, v_tangent.xyz) * v_tangent.w;
    mat3 tbn_matrix = mat3(v_tangent.xyz, binormal, sided_normal);
    mat3 nin_tbn_matrix = tbn_matrix;
# endif
    vec3 nin_normal = normalize(sided_normal);
#endif

    // NOTE: array uniforms used in nodes can't be renamed:
    // u_light_positions, u_light_directions, u_light_color_intensities,
    // u_light_factors1, u_light_factors2;

    vec3 eye_dir = u_camera_eye_frag - v_pos_world;
    vec3 nin_eye_dir = normalize(eye_dir);
    vec3 nin_pos_world = v_pos_world;
    vec4 nin_pos_view = v_pos_view;
    float nin_emit = u_emit;
    float nin_spec_alpha = u_specular_alpha;
    float nin_ambient = u_ambient;

    vec3 nout_color;
    vec3 nout_specular_color;
    vec3 nout_normal;
    vec3 nout_normalmap;
    float nout_shadow_factor;
    float nout_alpha;

    #nodes_main

    vec3 color = nout_color;
    float alpha = nout_alpha;

#if WATER_EFFECTS
# if WETTABLE
    //darken slightly to simulate wet surface
    color = max(color - sqrt(0.01 * -min(plane_dist, ZERO_VALUE_NODES)), 0.5 * color);
# endif
# if CAUSTICS
        apply_caustics(color, plane_dist, u_time, nout_shadow_factor, nout_normal,
                       u_sun_direction, sun_color_intens, u_sun_quaternion,
                       v_pos_world, length(v_pos_view));
# endif  // CAUSTICS
#endif  // WATER_EFFECTS

#if !DISABLE_FOG && (!PROCEDURAL_FOG || WATER_EFFECTS)
    float energy_coeff = clamp(length(u_sun_intensity) + u_environment_energy, 0.0, 1.0);
#endif

#if !DISABLE_FOG
# if PROCEDURAL_FOG
    vec3 cube_fog  = procedural_fog_color(u_cube_fog, nin_eye_dir);
    vec4 fog_color = vec4(cube_fog, u_fog_color_density.a);
    srgb_to_lin(fog_color.rgb);
# else
    vec4 fog_color = u_fog_color_density;
    fog_color.rgb *= energy_coeff;
# endif  // PROCEDURAL_FOG
# if WATER_EFFECTS
    fog_underwater(color, length(v_pos_view), nin_eye_dir, u_cam_water_depth,
        u_underwater_fog_color_density, fog_color, plane_dist,
        energy_coeff);
# else
    fog(color, length(v_pos_view), fog_color);
# endif  // WATER_EFFECTS
#endif  // !DISABLE_FOG

#if ALPHA && ALPHA_CLIP
    if (alpha < 0.5)
        discard;
    alpha = UNITY_VALUE_NODES; // prevent blending with html content
#endif

#if SSAO_ONLY && SHADOW_SRC == SHADOW_SRC_MASK
    vec2 visibility = texture2DProj(u_shadow_mask, v_tex_pos_clip).rg;
    float ssao = visibility.g;
    color = vec3(ssao);
#endif

    lin_to_srgb(color);

#if ALPHA && !ALPHA_CLIP
    premultiply_alpha(color, alpha);
#endif

    gl_FragColor = vec4(color, alpha);
}
