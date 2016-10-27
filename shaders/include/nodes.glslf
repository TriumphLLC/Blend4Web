#ifndef NODES_GLSLF
#define NODES_GLSLF

// varyings
// #import v_normal
// #import v_tangent
// #import v_shade_tang
// #import v_pos_world
// #import v_pos_view
// #import v_tex_pos_clip

// uniforms
// #import u_ambient
// #import u_emit
// #import u_environment_energy
// #import u_lamp_light_color_intensities
// #import u_lamp_light_directions
// #import u_lamp_light_positions
// #import u_light_color_intensities
// #import u_light_directions
// #import u_light_factors
// #import u_light_positions
// #import u_node_rgbs
// #import u_node_values
// #import u_refractmap
// #import u_time
// #import u_nodes_texture

/*==============================================================================
                                    VARS
==============================================================================*/
#var CAUSTICS 0
#var CALC_TBN_SPACE 0
#var DOUBLE_SIDED_LIGHTING 0
#var INVERT_FRONTFACING 0

#var USE_REFRACTION 0
#var HAS_REFRACT_TEXTURE 0

#var NUM_LIGHTS 0
#var REFLECTION_TYPE REFL_NONE

/*==============================================================================
                                   IMPORTS
==============================================================================*/

#if USE_NODE_MATERIAL_BEGIN
#include <mirror.glslf>
#include <shadow.glslf>
#include <environment.glslf>
#endif

#if USE_NODE_B4W_REFRACTION && USE_REFRACTION
#include <refraction.glslf>
#endif

#include <color_util.glslf>
#include <math.glslv>


#if USE_NODE_GEOMETRY_OR || USE_NODE_TEX_COORD_GE
GLSL_IN vec3 v_orco_tex_coord;
#endif

/*==============================================================================
                                  FUNCTIONS
==============================================================================*/

#if USE_NODE_B4W_REFRACTION
vec3 refraction_node(in vec3 normal_in, in float refr_bump) {
    vec3 refract_color = vec3(_0_0);
# if USE_REFRACTION
    refract_color = material_refraction(v_tex_pos_clip, normal_in.xy * refr_bump);
# elif HAS_REFRACT_TEXTURE
    refract_color = GLSL_TEXTURE(u_refractmap, v_tex_pos_clip.xy/v_tex_pos_clip.z).rgb;
    srgb_to_lin(refract_color);
# endif
    return refract_color;
}
#endif


#if USE_NODE_HUE_SAT || USE_NODE_MIX_RGB_HUE || USE_NODE_MIX_RGB_SATURATION \
|| USE_NODE_MIX_RGB_VALUE || USE_NODE_MIX_RGB_COLOR || USE_NODE_SEPHSV
vec3 rgb_to_hsv(vec3 rgb)
{
    vec4 k = vec4(_0_0, -_1_0 / 3.0, 2.0 / 3.0, -_1_0);
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
    vec4 k = vec4(_1_0, 2.0 / 3.0, _1_0 / 3.0, 3.0);
    vec3 p = abs(fract(vec3(hsv.r, hsv.r, hsv.r) + k.xyz) * 6.0 - k.www);
    return hsv.b * mix(k.xxx, clamp(p - k.xxx, _0_0, _1_0), hsv.g);
}
#endif

#if USE_NODE_GEOMETRY_UV || USE_NODE_B4W_PARALLAX || USE_NODE_UV_MERGED
vec3 uv_to_vec(vec2 uv)
{
    return vec3(uv*2.0 - vec2(_1_0, _1_0), _0_0);
}
#endif

#if USE_NODE_TEXTURE_COLOR || USE_NODE_TEXTURE_NORMAL || USE_NODE_B4W_PARALLAX
vec2 vec_to_uv(vec3 vec)
{
    return vec2(vec.xy * _0_5 + vec2(_0_5, _0_5));
}
#endif

#node CAMERA
    #node_out optional vec3 vec_view
    #node_out optional float val_z
    #node_out optional float val_dist

# node_if USE_OUT_vec_view
    vec_view = normalize(nin_pos_view.xyz);
# node_endif

# node_if USE_OUT_val_z
    val_z = abs(nin_pos_view.z);
# node_endif

# node_if USE_OUT_val_dist
    val_dist = length(nin_pos_view.xyz);
# node_endif
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

#node EMPTY_UV
    #node_out vec3 uv

    uv = vec3(-_1_0, -_1_0, _0_0);
#endnode

#node EMPTY_VC
    #node_out vec3 vc

    vc = vec3(_0_0);
#endnode

#node GEOMETRY_UV
    #node_out vec3 uv
    #node_param GLSL_IN vec2 v_uv

    uv = uv_to_vec(v_uv);
#endnode

#node GEOMETRY_OR
    #node_out vec3 orco

    orco = 2.0 * v_orco_tex_coord - vec3(_1_0);
#endnode

#node GEOMETRY_VC
    #node_out vec3 vc
    #node_param GLSL_IN vec3 v_vc

    // NOTE: a zero varying can be negative due to interpolation errors under WebGL2
    vc = max(vec3(_0_0), v_vc);
    srgb_to_lin(vc);
#endnode

#node GEOMETRY_VC1
    #node_out float channel0_out
    #node_param GLSL_IN float v_vc

    // NOTE: a zero varying can be negative due to interpolation errors under WebGL2
    channel0_out = max(_0_0, v_vc);
    srgb_to_lin(channel0_out);
#endnode

#node GEOMETRY_VC2
    #node_out float channel0_out
    #node_out float channel1_out
    #node_param GLSL_IN vec2 v_vc

    // NOTE: a zero varying can be negative due to interpolation errors under WebGL2
    channel0_out = max(_0_0, v_vc[0]);
    channel1_out = max(_0_0, v_vc[1]);
    srgb_to_lin(channel0_out);
    srgb_to_lin(channel1_out);
#endnode

#node GEOMETRY_VC3
    #node_out float channel0_out
    #node_out float channel1_out
    #node_out float channel2_out
    #node_param GLSL_IN vec3 v_vc

    // NOTE: a zero varying can be negative due to interpolation errors under WebGL2
    channel0_out = max(_0_0, v_vc[0]);
    channel1_out = max(_0_0, v_vc[1]);
    channel2_out = max(_0_0, v_vc[2]);
    srgb_to_lin(channel0_out);
    srgb_to_lin(channel1_out);
    srgb_to_lin(channel2_out);
#endnode

#node GEOMETRY_NO
    #node_out vec3 normal_out
    normal_out = nin_geom_normal.xyz;
#endnode

#node GEOMETRY_FB
    #node_out float frontback

    // NOTE: possible compatibility issues
    // 1 front, 0 back
#node_if INVERT_FRONTFACING
    frontback = (gl_FrontFacing) ? _0_0 : _1_0;
#node_else
    frontback = (gl_FrontFacing) ? _1_0 : _0_0;
#node_endif
#endnode

#node GEOMETRY_VW
    #node_out vec3 view_out

    //to WebGL view space
    view_out = -tsr9_transform_dir(nin_view_tsr, nin_eye_dir);
#endnode

#node GEOMETRY_LO
    #node_out vec3 local_out
    local_out[0] = nin_pos_view[0];
    local_out[1] = nin_pos_view[1];
    local_out[2] = nin_pos_view[2];
#endnode


#node GEOMETRY_GL
    #node_out vec3 global_out

    global_out = vec3(nin_pos_world.r, nin_pos_world.g, nin_pos_world.b);
#endnode


#node NEW_GEOMETRY
    #node_out vec3 position
    #node_out vec3 normal
    #node_out vec3 tangent
    #node_out vec3 true_normal
    #node_out vec3 incoming
    #node_out vec3 parametric
    #node_out float backfacing
    #node_out float pointiness

    position = vec3(_0_0);
    normal = vec3(_0_0);
    tangent = vec3(_0_0);
    true_normal = vec3(_0_0);
    incoming = vec3(_0_0);
    parametric = vec3(_0_0);
    backfacing = _0_0;
    pointiness = _0_0;

#endnode

#node HUE_SAT
    #node_in float hue
    #node_in float saturation
    #node_in float value
    #node_in float factor
    #node_in vec3 color_in
    #node_out vec3 color

    vec3 hsv = rgb_to_hsv(color_in);
    hsv[0] += (hue - _0_5);
    if (hsv[0] > _1_0)
        hsv[0] -= _1_0;
    else if (hsv[0] < _0_0)
        hsv[0] += _1_0;

    hsv *= vec3(_1_0, saturation, value);
    hsv = mix(vec3(_1_0), mix(vec3(_0_0), hsv, step(vec3(_0_0), hsv)), step(hsv, vec3(_1_0)));
    color = mix(color_in, hsv_to_rgb(hsv), factor);
#endnode

#node INVERT
    #node_in float factor
    #node_in vec3 color_in
    #node_out vec3 color

    color = mix(color_in, vec3(_1_0) - color_in, factor);
#endnode

#node LAMP
    #node_var LAMP_TYPE HEMI
    #node_var LAMP_INDEX 0
    #node_var LAMP_USE_SPHERE 0
    #node_var LAMP_SPOT_SIZE 0.8
    #node_var LAMP_SPOT_BLEND 0.03
    #node_var LAMP_LIGHT_DIST 30.0
    #node_out optional vec3 color_out
    #node_out vec3 light_vec_out
    #node_out float distance_out
    #node_out optional float visibility_factor_out

# node_if USE_OUT_color_out
    color_out = u_lamp_light_color_intensities[LAMP_INDEX];
# node_endif

    // see process_lamp
    vec3 lld = u_lamp_light_directions[LAMP_INDEX];
    vec3 llp = u_lamp_light_positions[LAMP_INDEX];
# node_if LAMP_TYPE == SPOT || LAMP_TYPE == POINT

        // mimic blender behavior
        light_vec_out = -v_pos_world + llp;
        distance_out = length(light_vec_out);
        light_vec_out = normalize(light_vec_out);

#  node_if USE_OUT_visibility_factor_out
        visibility_factor_out = LAMP_LIGHT_DIST / (LAMP_LIGHT_DIST + distance_out * distance_out);

#   node_if LAMP_TYPE == SPOT
            float spot_factor = dot(light_vec_out, lld);
            spot_factor *= smoothstep(_0_0, _1_0,
                    (spot_factor - LAMP_SPOT_SIZE) / LAMP_SPOT_BLEND);
            visibility_factor_out *= spot_factor;
#   node_endif

#   node_if LAMP_USE_SPHERE
    visibility_factor_out *= max(LAMP_LIGHT_DIST -distance_out, _0_0) / LAMP_LIGHT_DIST;
#   node_endif

#  node_endif
# node_else // LAMP_TYPE == SPOT || LAMP_TYPE == POINT
#  node_if USE_OUT_light_vec_out
        light_vec_out = lld;
#  node_endif

#  node_if USE_OUT_distance_out
        distance_out = length(llp - v_pos_world);
#  node_endif

#  node_if USE_OUT_visibility_factor_out
        visibility_factor_out = _1_0;
#  node_endif
# node_endif // LAMP_TYPE == SPOT || LAMP_TYPE == POINT
#endnode

#node NORMAL
    #node_in vec3 normal_in
    #node_out optional vec3 normal_out
    #node_out optional float dot_out
    #node_param vec3 normal_param

# node_if USE_OUT_normal_out
    normal_out = normal_param;
# node_endif

# node_if USE_OUT_dot_out
    // NOTE: (-) mimic blender behavior
    dot_out = -dot(normal_in, normal_param);
# node_endif
#endnode

#node B4W_VECTOR_VIEW
    #node_in vec3 vec_world
    #node_out vec3 vec_view

    // NOTE: (-) mimic blender behavior
    vec_view = -tsr9_transform_dir(nin_view_tsr, vec_world);
#endnode

#node BSDF_ANISOTROPIC
    #node_in vec3 color
    #node_in float roughness
    #node_in float anisotropy
    #node_in float rotation
    #node_in vec3 normal
    #node_in vec3 tangent
    #node_out vec3 vec
    vec = color;
    // NOTE: using unused variable to pass shader verification
    roughness;
    anisotropy;
    rotation;
    normal;
    tangent;
#endnode

#node BSDF_DIFFUSE
    #node_in vec3 color
    #node_in float roughness
    #node_in vec3 normal
    #node_out vec3 vec
    vec = color;
    // NOTE: using unused variable to pass shader verification
    roughness;
    normal;
#endnode

#node BSDF_GLASS
    #node_in vec3 color
    #node_in float roughness
    #node_in float ior
    #node_in vec3 normal
    #node_out vec3 vec
    vec = color;
    // NOTE: using unused variable to pass shader verification
    roughness;
    ior;
    normal;
#endnode

#node BSDF_GLOSSY
    #node_in vec3 color
    #node_in float roughness
    #node_in vec3 normal
    #node_out vec3 vec
    vec = color;
    // NOTE: using unused variable to pass shader verification
    roughness;
    normal;
#endnode

#node BSDF_HAIR
    #node_in vec3 color
    #node_in float offset
    #node_in float roughness_u
    #node_in float roughness_v
    #node_out vec3 vec
    vec = color;
    // NOTE: using unused variable to pass shader verification
    offset;
    roughness_u;
    roughness_v;
#endnode

#node BSDF_TRANSPARENT
    #node_in vec3 color
    #node_out vec3 vec
    vec = color;
#endnode

#node BSDF_TRANSLUCENT
    #node_in vec3 color
    #node_in vec3 normal
    #node_out vec3 vec
    vec = color;
    // NOTE: using unused variable to pass shader verification
    normal;
#endnode

#node BSDF_REFRACTION
    #node_in vec3 color
    #node_in float roughness
    #node_in float ior
    #node_in vec3 normal
    #node_out vec3 vec
    vec[0] = vec[1] = vec[2] = _0_0;
    // NOTE: using unused variable to pass shader verification
    color;
    roughness;
    ior;
    normal;
#endnode

#node BSDF_TOON
    #node_in vec3 color
    #node_in float size
    #node_in float smooth_float
    #node_in vec3 normal
    #node_out vec3 vec
    vec = color;
    // NOTE: using unused variable to pass shader verification
    size;
    smooth_float;
    normal;
#endnode

#node BSDF_VELVET
    #node_in vec3 color
    #node_in float sigma
    #node_in vec3 normal
    #node_out vec3 vec
    vec = color;
    // NOTE: using unused variable to pass shader verification
    sigma;
    normal;
#endnode

#node SUBSURFACE_SCATTERING
    #node_in vec3 color
    #node_in float scale
    #node_in vec3 radius
    #node_in float sharpness
    #node_in float text_blur
    #node_in vec3 normal
    #node_out vec3 vec_out
    vec_out[0] = vec_out[1] = vec_out[2] = _0_0;
    // NOTE: using unused variable to pass shader verification
    color;
    radius;
    sharpness;
    text_blur;
    normal;
    scale;
#endnode

#node EMISSION
    #node_in vec3 color
    #node_in float strength
    #node_out vec3 vec
    vec = color;
    // NOTE: using unused variable to pass shader verification
    strength;
#endnode

#node AMBIENT_OCCLUSION
    #node_in vec3 color
    #node_out vec3 vec_out
    vec_out[0] = vec_out[1] = vec_out[2] = _0_0;
    // NOTE: using unused variable to pass shader verification
    color;
#endnode

#node HOLDOUT
    #node_out vec3 vec_out
    vec_out[0] = vec_out[1] = vec_out[2] = _0_0;
#endnode

#node VOLUME_ABSORPTION
    #node_in vec3 color
    #node_in float density
    #node_out vec3 vec_out
    vec_out[0] = vec_out[1] = vec_out[2] = _0_0;
    // NOTE: using unused variable to pass shader verification
    color;
    density;
#endnode

#node VOLUME_SCATTER
    #node_in vec3 color
    #node_in float density
    #node_in float anisotropy
    #node_out vec3 vec_out
    vec_out[0] = vec_out[1] = vec_out[2] = _0_0;
    // NOTE: using unused variable to pass shader verification
    color;
    density;
    anisotropy;
#endnode

#node BUMP
    #node_in float strength
    #node_in float distance_float
    #node_in float height
    #node_in vec3 normal
    #node_out vec3 normal_out
    normal_out = normal;
    // NOTE: using unused variable to pass shader verification
    strength;
    distance_float;
    height;
#endnode

#node NORMAL_MAP
    #node_var SPACE NM_TANGENT
    #node_in float strength
    #node_in vec4 color
    #node_out vec3 normal_out

    vec3 bl_normal = nin_normal;

# node_if SPACE == NM_TANGENT
    normal_out = 2.0 * color.xyz - _1_0;
    normal_out = nin_tbn_matrix * normal_out;

# node_elif SPACE == NM_OBJECT || SPACE == NM_BLENDER_OBJECT
    normal_out = 2.0 * color.xyz - _1_0;
    // mimic blender behavior
    normal_out.yz *= -1.0;
    normal_out = tsr9_transform_dir(nin_model_tsr, normal_out);

# node_elif SPACE == NM_WORLD || SPACE == NM_BLENDER_WORLD
    normal_out = 2.0 * color.xyz - _1_0;
    // mimic blender behavior
    normal_out.yz *= -1.0;
# node_endif

    normal_out = normalize(mix(bl_normal, normal_out, strength));
#endnode

#node VECT_TRANSFORM
    #node_var CONVERT_TYPE VT_WORLD_TO_OBJECT
    #node_var VECTOR_TYPE VT_VECTOR
    #node_in vec3 vec_in
    #node_out vec3 vec_out

#node_if CONVERT_TYPE == VT_WORLD_TO_WORLD  || CONVERT_TYPE == VT_OBJECT_TO_OBJECT || CONVERT_TYPE == VT_CAMERA_TO_CAMERA
    vec_out = vec_in;
#node_else
# node_if VECTOR_TYPE == VT_POINT
#  node_if CONVERT_TYPE == VT_WORLD_TO_CAMERA
    vec_out = tsr9_transform(nin_view_tsr, vec_in);
#  node_elif CONVERT_TYPE == VT_WORLD_TO_OBJECT
    vec_out = tsr9_transform(nin_model_tsr_inverse, vec_in);
#  node_elif CONVERT_TYPE == VT_OBJECT_TO_WORLD
    vec_out = tsr9_transform(nin_model_tsr, vec_in);
#  node_elif CONVERT_TYPE == VT_OBJECT_TO_CAMERA
    vec_out = tsr9_transform(nin_model_tsr, vec_in);
    vec_out = tsr9_transform(nin_view_tsr, vec_out);
#  node_elif CONVERT_TYPE == VT_CAMERA_TO_WORLD
    vec_out = tsr9_transform(nin_view_tsr_inverse, vec_in);
#  node_elif CONVERT_TYPE == VT_CAMERA_TO_OBJECT
    vec_out = tsr9_transform(nin_view_tsr_inverse, vec_in);
    vec_out = tsr9_transform(nin_model_tsr_inverse, vec_out);
#  node_endif
# node_else
#  node_if CONVERT_TYPE == VT_WORLD_TO_CAMERA
    vec_out = tsr9_transform_dir(nin_view_tsr, vec_in);
#  node_elif CONVERT_TYPE == VT_WORLD_TO_OBJECT
    vec_out = tsr9_transform_dir(nin_model_tsr_inverse, vec_in);
#  node_elif CONVERT_TYPE == VT_OBJECT_TO_WORLD
    vec_out = tsr9_transform_dir(nin_model_tsr, vec_in);
#  node_elif CONVERT_TYPE == VT_OBJECT_TO_CAMERA
    vec_out = tsr9_transform_dir(nin_model_tsr, vec_in);
    vec_out = tsr9_transform_dir(nin_view_tsr, vec_out);
#  node_elif CONVERT_TYPE == VT_CAMERA_TO_WORLD
    vec_out = tsr9_transform_dir(nin_view_tsr_inverse, vec_in);
#  node_elif CONVERT_TYPE == VT_CAMERA_TO_OBJECT
    vec_out = tsr9_transform_dir(nin_view_tsr_inverse, vec_in);
    vec_out = tsr9_transform_dir(nin_model_tsr_inverse, vec_out);
#  node_endif
# node_endif

# node_if VECTOR_TYPE == VT_NORMAL
    vec_out = normalize(vec_out);
# node_endif

#node_endif
#endnode

#node BLACKBODY
    #node_in float temperature
    #node_out vec3 vec
    vec[0] = vec[1] = vec[2] = _0_0;
    // NOTE: using unused variable to pass shader verification
    temperature;
#endnode

#node WAVELENGTH
    #node_in float wavelength
    #node_out vec3 color
    color[0] = color[1] = color[2] = _0_0;
    // NOTE: using unused variable to pass shader verification
    wavelength;
#endnode

#node SEPXYZ
    #node_in vec3 xyz
    #node_out float x
    #node_out float y
    #node_out float z
    x = xyz[0];
    y = xyz[1];
    z = xyz[2];
#endnode

#node COMBXYZ
    #node_in float x
    #node_in float y
    #node_in float z
    #node_out vec3 xyz
    xyz[0] = x;
    xyz[1] = y;
    xyz[2] = z;
#endnode

#node BRIGHTCONTRAST
    #node_in vec3 color
    #node_in float brightness
    #node_in float contrast
    #node_out vec3 color_out
    float b = brightness - contrast * _0_5;
    color_out = max((_1_0 + contrast) * color + b, vec3(_0_0));
#endnode

#node LIGHT_FALLOFF
    #node_in float strength
    #node_in float smooth_float
    #node_out float quadratic
    #node_out float linear
    #node_out float constant
    quadratic = linear = constant = _0_0;
    // NOTE: using unused variable to pass shader verification
    strength;
    smooth_float;
#endnode

#node TEX_IMAGE
    #node_in vec3 vec_in
    #node_out vec3 vec
    #node_out float alpha
    vec[0] = vec[1] = vec[2] = _0_0;
    alpha = _1_0;
    // NOTE: using unused variable to pass shader verification
    vec_in;
#endnode

#node TEX_ENVIRONMENT
    #node_in vec3 vec_in
    #node_out vec3 vec
    vec[0] = vec[1] = vec[2] = _0_0;
    // NOTE: using unused variable to pass shader verification
    vec_in;
#endnode

#node TEX_SKY
    #node_in vec3 vec_in
    #node_out vec3 vec
    vec[0] = vec[1] = vec[2] = _0_0;
    // NOTE: using unused variable to pass shader verification
    vec_in;
#endnode

#node TEX_NOISE
    #node_in vec3 vec_in
    #node_in float scale
    #node_in float detail
    #node_in float distortion
    #node_out vec3 vec
    #node_out float factor
    vec[0] = vec[1] = vec[2] = _0_0;
    factor = _1_0;
    // NOTE: using unused variable to pass shader verification
    vec_in;
    scale;
    detail;
    distortion;
#endnode

#node TEX_WAVE
    #node_in vec3 vec_in
    #node_in float scale
    #node_in float distortion
    #node_in float detail
    #node_in float detail_scale
    #node_out vec3 vec
    #node_out float factor
    vec[0] = vec[1] = vec[2] = _0_0;
    factor = _1_0;
    // NOTE: using unused variable to pass shader verification
    vec_in;
    scale;
    distortion;
    detail;
    detail_scale;
#endnode

#node TEX_VORONOI
    #node_in vec3 vec_in
    #node_in float scale
    #node_out vec3 vec
    #node_out float factor
    vec[0] = vec[1] = vec[2] = _0_0;
    factor = _1_0;
    // NOTE: using unused variable to pass shader verification
    vec_in;
    scale;
#endnode

#node TEX_MUSGRAVE
    #node_in vec3 vec_in
    #node_in float scale
    #node_in float detail
    #node_in float dimension
    #node_in float lacunarity
    #node_in float offset
    #node_in float gain
    #node_out vec3 vec
    #node_out float factor
    vec[0] = vec[1] = vec[2] = _0_0;
    factor = _1_0;
    // NOTE: using unused variable to pass shader verification
    vec_in;
    scale;
    detail;
    dimension;
    lacunarity;
    offset;
    gain;
#endnode

#node TEX_GRADIENT
    #node_in vec3 vec_in
    #node_out vec3 vec
    #node_out float factor
    vec[0] = vec[1] = vec[2] = _0_0;
    factor = _1_0;
    // NOTE: using unused variable to pass shader verification
    vec_in;
#endnode

#node TEX_MAGIC
    #node_in vec3 vec_in
    #node_in float scale
    #node_in float distortion
    #node_out vec3 vec
    #node_out float factor
    vec[0] = vec[1] = vec[2] = _0_0;
    factor = _1_0;
    // NOTE: using unused variable to pass shader verification
    vec_in;
    scale;
    distortion;
#endnode

#node TEX_CHECKER
    #node_in vec3 vec_in
    #node_in vec3 color_1
    #node_in vec3 color_2
    #node_in float scale
    #node_out vec3 vec
    #node_out float factor
    vec[0] = vec[1] = vec[2] = _0_0;
    factor = _1_0;
    // NOTE: using unused variable to pass shader verification
    vec_in;
    color_1;
    color_2;
    scale;
#endnode

#node TEX_BRICK
    #node_in vec3 vec_in
    #node_in vec3 color_1
    #node_in vec3 color_2
    #node_in vec3 mortar
    #node_in float scale
    #node_in float mortar_size
    #node_in float bias
    #node_in float brick_width
    #node_in float row_heig
    #node_out vec3 vec
    #node_out float factor
    vec[0] = vec[1] = vec[2] = _0_0;
    factor = _1_0;
    // NOTE: using unused variable to pass shader verification
    vec_in;
    color_1;
    color_2;
    mortar;
    scale;
    mortar_size;
    bias;
    brick_width;
    row_heig;
#endnode

#node ADD_SHADER
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color
    color = clamp(color1 + color2, vec3(_0_0), vec3(_1_0));
#endnode

#node MIX_SHADER
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color
    float clamped_factor = clamp(factor, _0_0, _1_0);
    color = clamped_factor * color1 + (_1_0 - clamped_factor) * color2;
#endnode

#node UV_MERGED
    #node_out vec3 uv_geom
    #node_out vec3 uv_cycles
    #node_param GLSL_IN vec2 v_uv

#node_if USE_OUT_uv_geom
    uv_geom = uv_to_vec(v_uv);
#node_endif
#node_if USE_OUT_uv_cycles
    uv_cycles = vec3(v_uv, _0_0);
#node_endif
#endnode

#node TEX_COORD_UV
    #node_out vec3 uv
    #node_param GLSL_IN vec2 v_uv

    uv = vec3(v_uv, _0_0);
#endnode

#node TEX_COORD_NO
    #node_out vec3 normal_out

    normal_out = nin_normal;
#endnode

#node TEX_COORD_GE
    #node_out vec3 generated
    generated = v_orco_tex_coord;
#endnode

#node TEX_COORD_OB
    #node_out vec3 vec_out
    vec_out[0] = vec_out[1] = vec_out[2] = _1_0;
#endnode

#node TEX_COORD_CA
    #node_out vec3 camera_out
    camera_out[0] = nin_pos_view[0];
    camera_out[1] = nin_pos_view[1];
    camera_out[2] = _1_0;
#endnode

#node TEX_COORD_WI
    #node_out vec3 vec_out
    vec_out[0] = vec_out[1] = vec_out[2] = _1_0;
#endnode

#node TEX_COORD_RE
    #node_out vec3 vec_out
    vec_out[0] = vec_out[1] = vec_out[2] = _1_0;
#endnode

#node UVMAP
    #node_out vec3 uv
    #node_param GLSL_IN vec2 v_uv

    uv = vec3(v_uv, _0_0);
#endnode

#node PARTICLE_INFO
    #node_out float index
    #node_out float age
    #node_out float lifetime
    #node_out vec3 location
    #node_out float size
    #node_out vec3 velocity
    #node_out vec3 angular_velocity

    index = _0_0;
    age = _0_0;
    lifetime = _0_0;
    location = vec3(_0_0);
    size = _0_0;
    velocity = location;
    angular_velocity = location;
#endnode

#node HAIR_INFO
    #node_out float is_strand
    #node_out float intercept
    #node_out float thickness
    #node_out vec3 tangent_normal
    is_strand = _0_0;
    intercept = _0_0;
    thickness = _0_0;
    tangent_normal = vec3(_0_0);
#endnode

#node OBJECT_INFO
    #node_out vec3 location
    #node_out float object_index
    #node_out float material_index
    #node_out float random
    object_index = _0_0;
    material_index = _0_0;
    random = _0_0;
    location = vec3(_0_0);
#endnode

#node WIREFRAME
    #node_in float size
    #node_out float factor
    factor = size;
#endnode

#node TANGENT
    #node_out vec3 tangent
    tangent = vec3(_0_0);
#endnode

#node LAYER_WEIGHT
    #node_in float blend
    #node_in vec3 normal
    #node_out float fresnel
    #node_out float facing
    fresnel = facing = _0_0;
    // NOTE: using unused variable to pass shader verification
    normal;
    blend;
#endnode

#node LIGHT_PATH
    #node_out float is_camera_ray
    #node_out float is_shadow_ray
    #node_out float is_diffuse_ray
    #node_out float is_glossy_ray
    #node_out float is_singular_ray
    #node_out float is_reflection_ray
    #node_out float is_transmisson_ray
    #node_out float ray_length
    #node_out float ray_depth
    #node_out float transparent_depth
    is_camera_ray = is_shadow_ray = is_diffuse_ray = _0_0;
    is_glossy_ray = is_singular_ray = is_reflection_ray = _0_0;
    is_transmisson_ray = is_transmisson_ray = ray_depth = transparent_depth = _0_0;
    ray_length = _0_0;
#endnode

#node ATTRIBUTE
    #node_out vec3 color
    #node_out vec3 vec_out
    #node_out float factor
    color = vec_out = vec3(_0_0);
    factor = _0_0;
#endnode

#node SCRIPT
#endnode

#node CURVE_VEC
    #node_var READ_R 0
    #node_var READ_G 0
    #node_var READ_B 0
    #node_var NODE_TEX_ROW 0.0
    #node_in float factor
    #node_in vec3 vec_in
    #node_out vec3 vec

    vec = vec_in;
#node_if READ_R
    vec.r = (GLSL_TEXTURE(u_nodes_texture, vec2(0.5 * vec_in.r + 0.5, NODE_TEX_ROW)).r - 0.5) * 2.0;
#node_endif

#node_if READ_G
    vec.g = (GLSL_TEXTURE(u_nodes_texture, vec2(0.5 * vec_in.g + 0.5, NODE_TEX_ROW)).g - 0.5) * 2.0;
#node_endif

#node_if READ_B
    vec.b = (GLSL_TEXTURE(u_nodes_texture, vec2(0.5 * vec_in.b + 0.5, NODE_TEX_ROW)).b - 0.5) * 2.0;
#node_endif
    vec = mix(vec_in, vec, factor);
#endnode

#node CURVE_RGB
    #node_var READ_A 0
    #node_var READ_R 0
    #node_var READ_G 0
    #node_var READ_B 0
    #node_var NODE_TEX_ROW 0.0
    #node_in float factor
    #node_in vec3 vec_in
    #node_out vec3 vec

#node_if READ_A
    float r = GLSL_TEXTURE(u_nodes_texture, vec2(vec_in.r, NODE_TEX_ROW)).a;
    float g = GLSL_TEXTURE(u_nodes_texture, vec2(vec_in.g, NODE_TEX_ROW)).a;
    float b = GLSL_TEXTURE(u_nodes_texture, vec2(vec_in.b, NODE_TEX_ROW)).a;
#node_else
    float r = vec_in.r;
    float g = vec_in.g;
    float b = vec_in.b;
#node_endif

#node_if READ_R
    vec.r = GLSL_TEXTURE(u_nodes_texture, vec2(r, NODE_TEX_ROW)).r;
#node_else
    vec.r = r;
#node_endif

#node_if READ_G
    vec.g = GLSL_TEXTURE(u_nodes_texture, vec2(g, NODE_TEX_ROW)).g;
#node_else
    vec.g = g;
#node_endif

#node_if READ_B
    vec.b = GLSL_TEXTURE(u_nodes_texture, vec2(b, NODE_TEX_ROW)).b;
#node_else
    vec.b = b;
#node_endif

    vec = mix(vec_in, vec, factor);
#endnode

// ColorRamp node
#node VALTORGB
    #node_var NODE_TEX_ROW 0.0
    #node_in float factor
    #node_out vec3 color
    #node_out float alpha
    
    vec4 texval = GLSL_TEXTURE(u_nodes_texture, vec2(factor, NODE_TEX_ROW));
    color = texval.rgb;
    alpha = texval.a;
#endnode

#node MAPPING
    #node_var MAPPING_SCALE_DEF 0
    #node_var MAPPING_SCALE vec3(1.0)

    #node_var MAPPING_TRANS_DEF 0
    #node_var MAPPING_TRANS vec3(0.0)

    #node_var MAPPING_TRS_MATRIX_DEF 0
    #node_var MAPPING_TRS_MATRIX mat4(1.0)
    
    #node_var MAPPING_MIN_CLIP_DEF 0
    #node_var MAPPING_MIN_CLIP vec3(0.0)

    #node_var MAPPING_MAX_CLIP_DEF 0
    #node_var MAPPING_MAX_CLIP vec3(1.0)

    #node_var MAPPING_IS_NORMAL 0

    #node_in vec3 vec_in
    #node_out vec3 vec

    vec = vec_in;
# node_if MAPPING_SCALE_DEF
    vec = vec * MAPPING_SCALE;
# node_endif

# node_if MAPPING_TRANS_DEF
    vec = vec + MAPPING_TRANS;
# node_endif

# node_if MAPPING_TRS_MATRIX_DEF
    vec = (MAPPING_TRS_MATRIX * vec4(vec, _1_0)).xyz;
# node_endif

# node_if MAPPING_MIN_CLIP_DEF
    vec = max(vec, MAPPING_MIN_CLIP);
# node_endif

# node_if MAPPING_MAX_CLIP_DEF
    vec = min(vec, MAPPING_MAX_CLIP);
# node_endif

# node_if MAPPING_IS_NORMAL
    vec = normalize(vec);
# node_endif
#endnode

#node MATH_ADD
    #node_var MATH_USE_CLAMP 0
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val

    val = val_in1 + val_in2;
# node_if MATH_USE_CLAMP
    val = clamp(val, _0_0, _1_0);
# node_endif
#endnode

#node MATH_SUBTRACT
    #node_var MATH_USE_CLAMP 0
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val

    val = val_in1 - val_in2;
# node_if MATH_USE_CLAMP
    val = clamp(val, _0_0, _1_0);
# node_endif
#endnode

#node MATH_MULTIPLY
    #node_var MATH_USE_CLAMP 0
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val

    val = val_in1 * val_in2;
# node_if MATH_USE_CLAMP
    val = clamp(val, _0_0, _1_0);
# node_endif
#endnode

#node MATH_DIVIDE
    #node_var MATH_USE_CLAMP 0
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val

    val = (val_in2 != _0_0) ? val_in1/val_in2 : _0_0;
# node_if MATH_USE_CLAMP
    val = clamp(val, _0_0, _1_0);
# node_endif
#endnode

#node MATH_SINE
    #node_var MATH_USE_CLAMP 0
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val

    val = sin(val_in1);
# node_if MATH_USE_CLAMP
    val = clamp(val, _0_0, _1_0);
# node_endif
    // NOTE: using unused variable to pass shader verification
    val_in2;
#endnode

#node MATH_COSINE
    #node_var MATH_USE_CLAMP 0
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val

    val = cos(val_in1);
# node_if MATH_USE_CLAMP
    val = clamp(val, _0_0, _1_0);
# node_endif
    // NOTE: using unused variable to pass shader verification
    val_in2;
#endnode

#node MATH_TANGENT
    #node_var MATH_USE_CLAMP 0
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val

    val = tan(val_in1);
# node_if MATH_USE_CLAMP
    val = clamp(val, _0_0, _1_0);
# node_endif
    // NOTE: using unused variable to pass shader verification
    val_in2;
#endnode

#node MATH_ARCSINE
    #node_var MATH_USE_CLAMP 0
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val

    val = (val_in1 <= _1_0 && val_in1 >= -_1_0) ? asin(val_in1) : _0_0;
# node_if MATH_USE_CLAMP
    val = clamp(val, _0_0, _1_0);
# node_endif
    // NOTE: using unused variable to pass shader verification
    val_in2;
#endnode

#node MATH_ARCCOSINE
    #node_var MATH_USE_CLAMP 0
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val

    val = (val_in1 <= _1_0 && val_in1 >= -_1_0) ? acos(val_in1) : _0_0;
# node_if MATH_USE_CLAMP
    val = clamp(val, _0_0, _1_0);
# node_endif
    // NOTE: using unused variable to pass shader verification
    val_in2;
#endnode

#node MATH_ARCTANGENT
    #node_var MATH_USE_CLAMP 0
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val

    val = atan(val_in1);
# node_if MATH_USE_CLAMP
    val = clamp(val, _0_0, _1_0);
# node_endif
    // NOTE: using unused variable to pass shader verification
    val_in2;
#endnode

#node MATH_POWER
    #node_var MATH_USE_CLAMP 0
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val

    if (val_in1 < _0_0 && val_in2 != floor(val_in2))
        val = _0_0;
    else if (val_in2 == _0_0)
        // NOTE: x^0 -> 1, including 0^0, 
        // see 'Two Notes on Notation' by Donald E. Knuth, p. 6:
        // http://arxiv.org/abs/math/9205211
        val = _1_0;
    else if (val_in1 < _0_0)
        val = mix(_1_0, -_1_0, sign(mod(-val_in2, 2.0))) * pow(-val_in1, val_in2);
    else if (val_in1 == _0_0)
        val = _0_0;
    else
        val = pow(val_in1, val_in2);
# node_if MATH_USE_CLAMP
    val = clamp(val, _0_0, _1_0);
# node_endif
#endnode

#node MATH_LOGARITHM
    #node_var MATH_USE_CLAMP 0
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val

    val = (val_in1 > _0_0 && val_in2 > _0_0) ?
            log2(val_in1) / log2(val_in2) : _0_0;
# node_if MATH_USE_CLAMP
    val = clamp(val, _0_0, _1_0);
# node_endif
#endnode

#node MATH_MINIMUM
    #node_var MATH_USE_CLAMP 0
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val

    val = min(val_in1, val_in2);
# node_if MATH_USE_CLAMP
    val = clamp(val, _0_0, _1_0);
# node_endif
#endnode

#node MATH_MAXIMUM
    #node_var MATH_USE_CLAMP 0
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val

    val = max(val_in1, val_in2);
# node_if MATH_USE_CLAMP
    val = clamp(val, _0_0, _1_0);
# node_endif
#endnode

#node MATH_ROUND
    #node_var MATH_USE_CLAMP 0
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val

    val = floor(val_in1 + _0_5);
# node_if MATH_USE_CLAMP
    val = clamp(val, _0_0, _1_0);
# node_endif
    // NOTE: using unused variable to pass shader verification
    val_in2;
#endnode

#node MATH_LESS_THAN
    #node_var MATH_USE_CLAMP 0
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val

    val = (val_in1 < val_in2) ? _1_0 : _0_0;
# node_if MATH_USE_CLAMP
    val = clamp(val, _0_0, _1_0);
# node_endif
#endnode

#node MATH_GREATER_THAN
    #node_var MATH_USE_CLAMP 0
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val

    val = (val_in1 > val_in2) ? _1_0 : _0_0;
# node_if MATH_USE_CLAMP
    val = clamp(val, _0_0, _1_0);
# node_endif
#endnode

#node MATH_MODULO
    #node_var MATH_USE_CLAMP 0
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val

    val = abs(val_in2) > 0.000001 ? mod(val_in1, val_in2) : _0_0;
# node_if MATH_USE_CLAMP
    val = clamp(val, _0_0, _1_0);
# node_endif
#endnode

#node MATH_ABSOLUTE
    #node_var MATH_USE_CLAMP 0
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val

    val = abs(val_in1);
# node_if MATH_USE_CLAMP
    val = clamp(val, _0_0, _1_0);
# node_endif
    // NOTE: using unused variable to pass shader verification
    val_in2;
#endnode


#node MIX_RGB_MIX
    #node_var MIX_RGB_USE_CLAMP 0
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color

    float clamped_factor = clamp(factor, _0_0, _1_0);
    color = mix(color1, color2, clamped_factor);
# node_if MIX_RGB_USE_CLAMP
    color = clamp(color, _0_0, _1_0);
# node_endif
#endnode

#node MIX_RGB_ADD
    #node_var MIX_RGB_USE_CLAMP 0
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color

    float clamped_factor = clamp(factor, _0_0, _1_0);
    color = mix(color1, color1 + color2, clamped_factor);
# node_if MIX_RGB_USE_CLAMP
    color = clamp(color, _0_0, _1_0);
# node_endif
#endnode

#node MIX_RGB_MULTIPLY
    #node_var MIX_RGB_USE_CLAMP 0
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color

    float clamped_factor = clamp(factor, _0_0, _1_0);
    color = mix(color1, color1 * color2, clamped_factor);
# node_if MIX_RGB_USE_CLAMP
    color = clamp(color, _0_0, _1_0);
# node_endif
#endnode

#node MIX_RGB_SUBTRACT
    #node_var MIX_RGB_USE_CLAMP 0
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color

    float clamped_factor = clamp(factor, _0_0, _1_0);
    color = mix(color1, color1 - color2, clamped_factor);
# node_if MIX_RGB_USE_CLAMP
    color = clamp(color, _0_0, _1_0);
# node_endif
#endnode

#node MIX_RGB_SCREEN
    #node_var MIX_RGB_USE_CLAMP 0
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color

    float clamped_factor = clamp(factor, _0_0, _1_0);
    float factorm = _1_0 - clamped_factor;
    color = vec3(_1_0) - (vec3(factorm) + clamped_factor*(vec3(_1_0) - color2)) *
            (vec3(_1_0) - color1);
# node_if MIX_RGB_USE_CLAMP
    color = clamp(color, _0_0, _1_0);
# node_endif
#endnode

#node MIX_RGB_DIVIDE
    #node_var MIX_RGB_USE_CLAMP 0
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color

    float clamped_factor = clamp(factor, _0_0, _1_0);
    float factorm = _1_0 - clamped_factor;
    color2 += step(color2, vec3(_0_0));
    color = factorm*color1 + clamped_factor*color1/color2;
# node_if MIX_RGB_USE_CLAMP
    color = clamp(color, _0_0, _1_0);
# node_endif
#endnode

#node MIX_RGB_DIFFERENCE
    #node_var MIX_RGB_USE_CLAMP 0
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color

    float clamped_factor = clamp(factor, _0_0, _1_0);
    color = mix(color1, abs(color1 - color2), clamped_factor);
# node_if MIX_RGB_USE_CLAMP
    color = clamp(color, _0_0, _1_0);
# node_endif
#endnode

#node MIX_RGB_DARKEN
    #node_var MIX_RGB_USE_CLAMP 0
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color

    float clamped_factor = clamp(factor, _0_0, _1_0);
    color = min(color1.rgb, color2.rgb * clamped_factor);
# node_if MIX_RGB_USE_CLAMP
    color = clamp(color, _0_0, _1_0);
# node_endif
#endnode

#node MIX_RGB_LIGHTEN
    #node_var MIX_RGB_USE_CLAMP 0
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color

    float clamped_factor = clamp(factor, _0_0, _1_0);
    color = max(color1.rgb, color2.rgb * clamped_factor);
# node_if MIX_RGB_USE_CLAMP
    color = clamp(color, _0_0, _1_0);
# node_endif
#endnode

#node MIX_RGB_OVERLAY
    #node_var MIX_RGB_USE_CLAMP 0
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color

    float clamped_factor = clamp(factor, _0_0, _1_0);
    vec3 f_vec = vec3(_1_0 - clamped_factor);
    color = mix(color1 * (f_vec + 2.0*clamped_factor*color2),
                vec3(_1_0) - (f_vec + 2.0*clamped_factor*(vec3(_1_0) - color2)) * (vec3(_1_0) - color1),
                step(_0_5, color1));
# node_if MIX_RGB_USE_CLAMP
    color = clamp(color, _0_0, _1_0);
# node_endif
#endnode

#node MIX_RGB_DODGE
    #node_var MIX_RGB_USE_CLAMP 0
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color

    float clamped_factor = clamp(factor, _0_0, _1_0);
    vec3 tmp = vec3(_1_0) - clamped_factor * color2;
    vec3 tmp1 = clamp(color1 / tmp, _0_0, _1_0);
    color = mix(mix(tmp1, vec3(_1_0), step(tmp, vec3(_0_0))), color1, step(color1, vec3(_0_0)));
# node_if MIX_RGB_USE_CLAMP
    color = clamp(color, _0_0, _1_0);
# node_endif
#endnode

#node MIX_RGB_BURN
    #node_var MIX_RGB_USE_CLAMP 0
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color

    float clamped_factor = clamp(factor, _0_0, _1_0);
    vec3 facm = vec3(_1_0 - clamped_factor);
    vec3 tmp = facm + clamped_factor*color2;
    vec3 tmp1 = clamp(vec3(_1_0) - (vec3(_1_0) - color1) / tmp, _0_0, _1_0);
    color = mix(tmp1, vec3(_0_0), step(tmp, vec3(_0_0)));
# node_if MIX_RGB_USE_CLAMP
    color = clamp(color, _0_0, _1_0);
# node_endif
#endnode

#node MIX_RGB_HUE
    #node_var MIX_RGB_USE_CLAMP 0
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color

    float clamped_factor = clamp(factor, _0_0, _1_0);
    vec3 hsv, hsv2, tmp;

    color = color1;

    hsv2 = rgb_to_hsv(color2);

    if (hsv2.y != _0_0) {
        hsv = rgb_to_hsv(color);
        hsv.x = hsv2.x;
        tmp = hsv_to_rgb(hsv);

        color = mix(color, tmp, clamped_factor);
    }
# node_if MIX_RGB_USE_CLAMP
    color = clamp(color, _0_0, _1_0);
# node_endif
#endnode

#node MIX_RGB_SATURATION
    #node_var MIX_RGB_USE_CLAMP 0
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color

    float clamped_factor = clamp(factor, _0_0, _1_0);
    float factorm = _1_0 - clamped_factor;

    color = color1;

    vec3 hsv, hsv2;
    hsv = rgb_to_hsv(color);

    if (hsv.y != _0_0) {
        hsv2 = rgb_to_hsv(color2);

        hsv.y = factorm*hsv.y + clamped_factor*hsv2.y;
        color = hsv_to_rgb(hsv);
    }
# node_if MIX_RGB_USE_CLAMP
    color = clamp(color, _0_0, _1_0);
# node_endif
#endnode

#node MIX_RGB_VALUE
    #node_var MIX_RGB_USE_CLAMP 0
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color

    float clamped_factor = clamp(factor, _0_0, _1_0);
    float factorm = _1_0 - clamped_factor;
    vec3 hsv, hsv2;

    hsv = rgb_to_hsv(color1);
    hsv2 = rgb_to_hsv(color2);

    hsv.z = factorm*hsv.z + clamped_factor*hsv2.z;
    color = hsv_to_rgb(hsv);
# node_if MIX_RGB_USE_CLAMP
    color = clamp(color, _0_0, _1_0);
# node_endif
#endnode

#node MIX_RGB_COLOR
    #node_var MIX_RGB_USE_CLAMP 0
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color

    float clamped_factor = clamp(factor, _0_0, _1_0);
    vec3 hsv, hsv2, tmp;

    color = color1;

    hsv2 = rgb_to_hsv(color2);

    if (hsv2.y != _0_0) {
        hsv = rgb_to_hsv(color);
        hsv.x = hsv2.x;
        hsv.y = hsv2.y;
        tmp = hsv_to_rgb(hsv);

        color = mix(color, tmp, clamped_factor);
    }
# node_if MIX_RGB_USE_CLAMP
    color = clamp(color, _0_0, _1_0);
# node_endif
#endnode

#node MIX_RGB_SOFT_LIGHT
    #node_var MIX_RGB_USE_CLAMP 0
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color

    float clamped_factor = clamp(factor, _0_0, _1_0);
    float factorm = _1_0 - clamped_factor;
    vec3 scr = color2 + color1 - color2 * color1;

    color = color1 * (vec3(factorm) + vec3(clamped_factor) * ((vec3(_1_0) - color1)*color2 + scr));
# node_if MIX_RGB_USE_CLAMP
    color = clamp(color, _0_0, _1_0);
# node_endif
#endnode

#node MIX_RGB_LINEAR_LIGHT
    #node_var MIX_RGB_USE_CLAMP 0
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color

    float clamped_factor = clamp(factor, _0_0, _1_0);
    color = color1 + clamped_factor * (2.0 * color2 - vec3(_1_0));
# node_if MIX_RGB_USE_CLAMP
    color = clamp(color, _0_0, _1_0);
# node_endif
#endnode

#node OUTPUT
    #node_in vec3 color_in
    #node_in float alpha_in

    nout_color = color_in;
    nout_alpha = alpha_in;
#endnode

#node MATERIAL_BEGIN
    #node_var MATERIAL_EXT 0
    #node_var USE_MATERIAL_NORMAL 0
    #node_var USE_MATERIAL_DIFFUSE 0
    #node_var SHADELESS_MAT 0
    #node_in vec3 color_in
    #node_in vec3 specular_color
    #node_in float diff_intensity
    #node_in optional vec3 normal_in
    #node_in optional float emit_intensity
    #node_out vec3 E
    #node_out vec3 A
    #node_out vec3 D
    #node_out vec3 S
    #node_out vec3 normal
    #node_out vec2 dif_params
    #node_out vec2 sp_params
    #node_out vec4 shadow_factor
    #node_param const vec2 diffuse_params  // vec2(diffuse_param, diffuse_param2)
    #node_param const vec3 specular_params // vec3(intensity, spec_param_0, spec_param_1)

    // diffuse
    D = clamp(color_in, _0_0, _1_0);
    // specular
    S = specular_params[0] * clamp(specular_color, _0_0, _1_0);

# node_if USE_MATERIAL_NORMAL
    normal = normalize(normal_in);
# node_else
    normal = nin_normal;
# node_endif

# node_if !SHADELESS_MAT
    // emission
#  node_if MATERIAL_EXT
    E = emit_intensity * D;
#  node_else
    E = nin_emit * D;
#  node_endif

#  node_if USE_MATERIAL_DIFFUSE
    D *= diff_intensity;
#  node_endif

    // ambient
    A = nin_ambient * u_environment_energy * get_environment_color(normal);
    shadow_factor = calc_shadow_factor(D);
#  node_if NUM_LIGHTS > 0
    // diffuse
    dif_params = vec2(diffuse_params[0], diffuse_params[1]);
    // specular
    sp_params = vec2(specular_params[1], specular_params[2]);
#  node_endif
    nout_shadow_factor = shadow_factor;
# node_else // !SHADELESS_MAT
    E = vec3(_0_0);
    A = vec3(_1_0);
# node_endif // !SHADELESS_MAT
#endnode

#node MATERIAL_END
    #node_var MATERIAL_EXT 0
    #node_var USE_MATERIAL_DIFFUSE 0
    #node_var USE_MATERIAL_SPECULAR 0
    #node_in vec4 color_in
    #node_in vec3 specular_in
    #node_in vec3 normal
    #node_in optional float reflect_factor
    #node_in optional float specular_alpha
    #node_in optional float alpha_in
    #node_out optional vec3 color_out
    #node_out optional float alpha_out
    #node_out optional vec3 normal_out
    #node_out optional vec3 diffuse_out
    #node_out optional vec3 spec_out
    #node_param float alpha_param
    #node_param float specular_alpha_param

// color_out
# node_if USE_OUT_color_out
#  node_if USE_MATERIAL_DIFFUSE
    color_out = color_in.rgb;
#  node_else
    color_out = vec3(_0_0);
#  node_endif
#  node_if MATERIAL_EXT && REFLECTION_TYPE != REFL_NONE

#   node_if REFLECTION_TYPE == REFL_PLANE
    apply_mirror(color_out, nin_eye_dir, normal, reflect_factor, nin_view_tsr);
#   node_else
    apply_mirror(color_out, nin_eye_dir, normal, reflect_factor, mat3(_0_0));
#   node_endif

#  node_endif
#  node_if USE_MATERIAL_SPECULAR
    color_out += specular_in;
#  node_endif
# node_endif

// normal_out
# node_if USE_OUT_normal_out
    normal_out = normal;
# node_endif

# node_if MATERIAL_EXT
// diffuse_out
#  node_if USE_OUT_diffuse_out
    diffuse_out = color_in.rgb;
#  node_endif

// spec_out
#  node_if USE_OUT_spec_out
    spec_out = specular_in;
#  node_endif
// alpha_out
#  node_if USE_OUT_alpha_out
    alpha_out = clamp(alpha_in, _0_0, _1_0);
#   node_if USE_MATERIAL_SPECULAR
    float t = max(max(specular_in.r, specular_in.g), specular_in.b)
            * specular_alpha;
    alpha_out = clamp(alpha_in * (_1_0 - t) + t, _0_0, _1_0);
#   node_endif
#  node_endif
# node_else // MATERIAL_EXT
// alpha_out
#  node_if USE_OUT_alpha_out
    alpha_out = clamp(alpha_param, _0_0, _1_0);
#   node_if USE_MATERIAL_SPECULAR
    float t = max(max(specular_in.r, specular_in.g), specular_in.b)
            * specular_alpha_param;
    alpha_out = alpha_param * (_1_0 - t) + t;
#   node_endif
#  node_endif
# node_endif // MATERIAL_EXT

# node_if USE_MATERIAL_SPECULAR
    nout_specular_color = specular_in;
# node_else
    nout_specular_color = vec3(_0_0);
# node_endif
    nout_normal = normal;
#endnode

// lighting_ambient function
#node LIGHTING_AMBIENT
    #node_in vec3 E
    #node_in vec3 A
    #node_in vec3 D
    #node_out vec4 color_out
    #node_out vec3 specular_out

    color_out = vec4(E + D * A, _0_0);
    specular_out = vec3(_0_0);
#endnode

#node LIGHTING_LAMP
    #node_var LAMP_TYPE HEMI
    #node_var LAMP_IND 0
    #node_var LAMP_SPOT_SIZE 0.8
    #node_var LAMP_SPOT_BLEND 0.03
    #node_var LAMP_LIGHT_DIST 30.0
    #node_var LAMP_SHADOW_MAP_IND -1
    #node_var LAMP_USE_SPHERE 0

    #node_in vec4 shadow_factor

    #node_out vec3 ldir
    #node_out vec2 lfac
    #node_out vec3 lcolorint
    #node_out float norm_fac

    // unpack light_factors
    lfac = vec2(u_light_positions[LAMP_IND].w, u_light_color_intensities[LAMP_IND].w);
# node_if LAMP_TYPE == HEMI
    norm_fac = _0_5;
# node_else
    norm_fac = _0_0;
# node_endif

    // 0.0 - full shadow, 1.0 - no shadow
    lcolorint = u_light_color_intensities[LAMP_IND].xyz;
# node_if LAMP_SHADOW_MAP_IND != -1
    lcolorint *= shadow_factor[LAMP_SHADOW_MAP_IND];
# node_endif

# node_if LAMP_TYPE == SPOT || LAMP_TYPE == POINT
    vec3 lpos = u_light_positions[LAMP_IND].xyz;
    ldir = lpos - nin_pos_world;

    // calc attenuation, falloff_type = "INVERSE_SQUARE"
    float dist = length(ldir);
    lcolorint *= LAMP_LIGHT_DIST / (LAMP_LIGHT_DIST + dist * dist);

    ldir = normalize(ldir);

#  node_if LAMP_TYPE == SPOT
    // spot shape like in Blender,
    // source/blender/gpu/shaders/gpu_shader_material.glsl
    vec3 ldirect = u_light_directions[LAMP_IND];
    float spot_factor = dot(ldir, ldirect);
    spot_factor *= smoothstep(_0_0, _1_0,
                              (spot_factor - LAMP_SPOT_SIZE) / LAMP_SPOT_BLEND);
    lcolorint *= spot_factor;
#  node_endif

#  node_if LAMP_USE_SPHERE
    lcolorint *= max(LAMP_LIGHT_DIST -dist, _0_0) / LAMP_LIGHT_DIST;
#  node_endif

# node_else // LAMP_TYPE == SPOT || LAMP_TYPE == POINT
    ldir = u_light_directions[LAMP_IND];
# node_endif // LAMP_TYPE == SPOT || LAMP_TYPE == POINT
#endnode

#node DIFFUSE_FRESNEL
    #node_var MAT_USE_TBN_SHADING 0
    #node_in vec3 ldir
    #node_in vec2 lfac
    #node_in vec3 normal
    #node_in float norm_fac
    #node_in vec2 dif_params
    #node_out float lfactor

    vec3 norm = normal;
# node_if MAT_USE_TBN_SHADING
    vec3 crss = cross(ldir, v_shade_tang.xyz);
    norm = cross(crss, v_shade_tang.xyz);
    norm = -normalize(norm);
# node_endif

    lfactor = _0_0;
    if (lfac.r != _0_0) {
        float dot_nl = (_1_0 - norm_fac) * dot(norm, ldir) + norm_fac;

        if (dif_params[0] == _0_0) {
            lfactor = _1_0;
        } else {
            float t = _1_0 + abs(dot_nl);
            t = dif_params[1] + (_1_0 - dif_params[1]) * pow(t, dif_params[0]);
            lfactor = clamp(t, _0_0, _1_0);
        }
        lfactor = max(lfactor, _0_0);
    }
#endnode

#node DIFFUSE_LAMBERT
    #node_var MAT_USE_TBN_SHADING 0
    #node_in vec3 ldir
    #node_in vec2 lfac
    #node_in vec3 normal
    #node_in float norm_fac
    #node_out float lfactor

    vec3 norm = normal;
# node_if MAT_USE_TBN_SHADING
    vec3 crss = cross(ldir, v_shade_tang.xyz);
    norm = cross(crss, v_shade_tang.xyz);
    norm = -normalize(norm);
# node_endif

    lfactor = _0_0;
    if (lfac.r != _0_0) {
        float dot_nl = (_1_0 - norm_fac) * dot(norm, ldir) + norm_fac;

        lfactor = max(dot_nl, _0_0);
    }
#endnode

#node DIFFUSE_OREN_NAYAR
    #node_var MAT_USE_TBN_SHADING 0
    #node_in vec3 ldir
    #node_in vec2 lfac
    #node_in vec3 normal
    #node_in float norm_fac
    #node_in vec2 dif_params
    #node_out float lfactor

    vec3 norm = normal;
# node_if MAT_USE_TBN_SHADING
    vec3 crss = cross(ldir, v_shade_tang.xyz);
    norm = cross(crss, v_shade_tang.xyz);
    norm = -normalize(norm);
# node_endif

    lfactor = _0_0;
    if (lfac.r != _0_0) {
        float dot_nl = (_1_0 - norm_fac) * dot(norm, ldir) + norm_fac;

        if (dif_params[0] > _0_0) {
            float nv = max(dot(norm, nin_eye_dir), _0_0);
            float sigma_sq = dif_params[0] * dif_params[0];
            float A = _1_0 - _0_5 * (sigma_sq / (sigma_sq + 0.33));

            vec3 l_diff = ldir - dot_nl*norm;
            vec3 e_diff = nin_eye_dir - nv*norm;
            // handle normalize() and acos() values which may result to
            // "undefined behavior"
            // (noticeable for "mediump" precision, nin_eye_dir.g some mobile devies)
            if (length(l_diff) == _0_0 || length(e_diff) == _0_0 ||
                    abs(dot_nl) > _1_0 || abs(nv) > _1_0)
                // HACK: undefined result of normalize() for this vectors
                // remove t-multiplier for zero-length vectors
                lfactor = dot_nl * A;
            else {
                float Lit_A = acos(dot_nl);
                float View_A = acos(nv);
                vec3 Lit_B = normalize(l_diff);
                vec3 View_B = normalize(e_diff);

                float a, b;
                a = max(Lit_A, View_A);
                b = min(Lit_A, View_A);
                b *= 0.95;

                float t = max(dot(Lit_B, View_B), _0_0);
                float B = 0.45 * (sigma_sq / (sigma_sq +  0.09));
                lfactor = dot_nl * (A + (B * t * sin(a) * tan(b)));
            }
        } else
            lfactor = dot_nl;
        lfactor = max(lfactor, _0_0);
    }
#endnode

#node DIFFUSE_MINNAERT
    #node_var MAT_USE_TBN_SHADING 0
    #node_in vec3 ldir
    #node_in vec2 lfac
    #node_in vec3 normal
    #node_in float norm_fac
    #node_in vec2 dif_params
    #node_out float lfactor

    vec3 norm = normal;
# node_if MAT_USE_TBN_SHADING
    vec3 crss = cross(ldir, v_shade_tang.xyz);
    norm = cross(crss, v_shade_tang.xyz);
    norm = -normalize(norm);
# node_endif

    lfactor = _0_0;
    if (lfac.r != _0_0) {
        float dot_nl = (_1_0 - norm_fac) * dot(norm, ldir) + norm_fac;
        float nv = max(dot(norm, nin_eye_dir), _0_0);

        if (dif_params[0] <= _1_0)
            lfactor = dot_nl * pow(max(nv * dot_nl, 0.1), dif_params[0] - _1_0);
        else
            lfactor = dot_nl * pow(1.0001 - nv, dif_params[0] - _1_0);
        lfactor = max(lfactor, _0_0);
    }
#endnode

#node DIFFUSE_TOON
    #node_var MAT_USE_TBN_SHADING 0
    #node_in vec3 ldir
    #node_in vec2 lfac
    #node_in vec3 normal
    #node_in float norm_fac
    #node_in vec2 dif_params
    #node_out float lfactor

    vec3 norm = normal;
# node_if MAT_USE_TBN_SHADING
    vec3 crss = cross(ldir, v_shade_tang.xyz);
    norm = cross(crss, v_shade_tang.xyz);
    norm = -normalize(norm);
# node_endif

    lfactor = _0_0;
    if (lfac.r != _0_0) {
        float dot_nl = (_1_0 - norm_fac) * dot(norm, ldir) + norm_fac;
        float ang = acos(dot_nl);

        if (ang < dif_params[0])
            lfactor = _1_0;
        else if (ang > (dif_params[0] + dif_params[1]) || dif_params[1] == _0_0)
                lfactor = _0_0;
            else
                lfactor = _1_0 - ((ang - dif_params[0])/dif_params[1]);
        lfactor = max(lfactor, _0_0);
    }
#endnode

#node SPECULAR_PHONG
    #node_var MAT_USE_TBN_SHADING 0
    #node_in vec3 ldir
    #node_in vec2 lfac
    #node_in vec3 normal
    #node_in float norm_fac
    #node_in vec2 sp_params
    #node_out float sfactor

    sfactor = _0_0;
    if (lfac.g == _1_0) {
        vec3 halfway = normalize(ldir + nin_eye_dir);
# node_if MAT_USE_TBN_SHADING
    if (norm_fac == _0_0) {
        sfactor = dot(v_shade_tang.xyz, halfway);
        sfactor = sqrt(_1_0 - sfactor * sfactor);
    }
# node_else
        sfactor = (_1_0 - norm_fac) * max(dot(normal, halfway),
                         _0_0) + norm_fac;
# node_endif
        sfactor = pow(sfactor, sp_params[0]);
    }
#endnode

#node SPECULAR_COOKTORR
    #node_var MAT_USE_TBN_SHADING 0
    #node_in vec3 ldir
    #node_in vec2 lfac
    #node_in vec3 normal
    #node_in float norm_fac
    #node_in vec2 sp_params
    #node_out float sfactor

    sfactor = _0_0;

    if (lfac.g != _0_0) {
        vec3 halfway = normalize(ldir + nin_eye_dir);

# node_if MAT_USE_TBN_SHADING
        if (norm_fac == _0_0) {
            sfactor = dot(v_shade_tang.xyz, halfway);
            sfactor = sqrt(_1_0 - sfactor * sfactor);
        }
# node_else
        sfactor = max(dot(normal, halfway), _0_0);
        sfactor = (_1_0 - norm_fac) * sfactor + norm_fac;
# node_endif

# node_if MAT_USE_TBN_SHADING
        float nv = max(dot(v_shade_tang.xyz, nin_eye_dir), _0_0);
        nv = sqrt(_1_0 - nv * nv);
# node_else
        float nv = max(dot(normal, nin_eye_dir), _0_0);
# node_endif

        sfactor = pow(sfactor, sp_params[0]);

        sfactor = sfactor / (0.1 + nv);
    }
#endnode

#node SPECULAR_WARDISO
    #node_var MAT_USE_TBN_SHADING 0
    #node_in vec3 ldir
    #node_in vec2 lfac
    #node_in vec3 normal
    #node_in float norm_fac
    #node_in vec2 sp_params
    #node_out float sfactor

    sfactor = _0_0;
    if (lfac.g == _1_0) {
        vec3 halfway = normalize(ldir + nin_eye_dir);
# node_if MAT_USE_TBN_SHADING
        float nh = _0_0;
        float nv = _0_0;
        float nl = _0_0;
        if (norm_fac == _0_0) {
            nh = dot(v_shade_tang.xyz, halfway);
            nv = dot(v_shade_tang.xyz, nin_eye_dir);
            nl = dot(v_shade_tang.xyz, ldir);
            nh = sqrt(_1_0 - nh * nh);
            nv = sqrt(_1_0 - nv * nv);
            nl = sqrt(_1_0 - nl * nl);
        }
# node_else
        float nh = max(dot(normal, halfway), 0.01);
        // NOTE: 0.01 for mobile devices
        float nv = max(dot(normal, nin_eye_dir), 0.01);
        float nl = max(dot(normal, ldir), 0.01);
# node_endif
        float angle = tan(acos(nh));
        float alpha = max(sp_params[0], 0.01);

        sfactor = nl * (_1_0/(4.0*M_PI*alpha*alpha))
                  * (exp(-(angle * angle) / (alpha * alpha)) /(sqrt(nv * nl)));
    }
#endnode

#node SPECULAR_TOON
    #node_var MAT_USE_TBN_SHADING 0
    #node_in vec3 ldir
    #node_in vec2 lfac
    #node_in vec3 normal
    #node_in float norm_fac
    #node_in vec2 sp_params
    #node_out float sfactor

    sfactor = _0_0;
    if (lfac.g == _1_0) {
        vec3 h = normalize(ldir + nin_eye_dir);
# node_if MAT_USE_TBN_SHADING
        float cosinus = dot(h, v_shade_tang.xyz);
        float angle = sp_params[0] + sp_params[1];
        if (norm_fac == _0_0)
            angle = acos(sqrt(_1_0 - cosinus * cosinus));
# node_else
        float angle = acos(dot(h, normal));
# node_endif

        if (angle < sp_params[0])
            sfactor = _1_0;
        else if (angle >= sp_params[0] + sp_params[1] || sp_params[1] == _0_0)
            sfactor = _0_0;
        else
            sfactor = _1_0 - (angle - sp_params[0]) / sp_params[1];
    }
#endnode

#node SPECULAR_BLINN
    #node_var MAT_USE_TBN_SHADING 0
    #node_in vec3 ldir
    #node_in vec2 lfac
    #node_in vec3 normal
    #node_in float norm_fac
    #node_in vec2 sp_params
    #node_out float sfactor

    sfactor = _0_0;
    if (lfac.g == _1_0) {
        if (sp_params[0] < 1.0 || sp_params[1] == _0_0)
            sfactor = _0_0;
        else {
            if (sp_params[1] < 100.0)
                sp_params[1]= sqrt(1.0 / sp_params[1]);
            else
                sp_params[1]= 10.0 / sp_params[1];

            vec3 halfway = normalize(nin_eye_dir + ldir);
# node_if MAT_USE_TBN_SHADING
            float nh = 0.0;
            if (norm_fac == _0_0) {
                float dot_ht = dot(v_shade_tang.xyz, halfway);
                nh = sqrt(_1_0 - dot_ht * dot_ht);
            }
# node_else
            float nh = (_1_0 - norm_fac) * max(dot(normal, halfway),
                         _0_0) + norm_fac;
# node_endif
            if (nh < _0_0)
                sfactor = _0_0;
            else {
                float nv = max(dot(normal, nin_eye_dir), 0.01);
                float nl = dot(normal, ldir);
                if (nl <= 0.01)
                    sfactor = _0_0;
                else {
                    float vh = max(dot(nin_eye_dir, halfway), 0.01);

                    float a = _1_0;
                    float b = (2.0 * nh * nv) / vh;
                    float c = (2.0 * nh * nl) / vh;

                    float g = min(min(a, b), c);

                    float p = sqrt(pow(sp_params[0], 2.0) + pow(vh, 2.0) - _1_0);
                    float f = pow(p - vh, 2.0) / pow(p + vh, 2.0) * (_1_0 
                            + pow(vh * (p + vh) - _1_0, 2.0)/pow(vh * (p - vh) 
                            + _1_0, 2.0));
                    float ang = acos(nh);
                    sfactor = max(f * g * exp(-pow(ang, 2.0) / (2.0 * pow(sp_params[1], 2.0))), 
                            _0_0);
                }
            }
        }
    }
#endnode

#node LIGHTING_APPLY
    #node_in vec4 color_in
    #node_in vec3 specular_in
    #node_in float lfactor
    #node_in float sfactor
    #node_in vec3 ldir
    #node_in vec3 normal
    #node_in vec4 translucency_params
    #node_in vec3 D
    #node_in vec3 S
    #node_in vec3 lcolorint
    #node_in float translucency_color
    
    #node_out vec4 color_out
    #node_out vec3 specular_out
#node_if USE_NODE_B4W_TRANSLUCENCY
    // backside lighting
    if (dot(ldir, normal) * dot(nin_eye_dir, normal) < _0_0) {
        float backside_factor = translucency_params.x;
        float spot_hardness = translucency_params.y;
        float spot_intensity = translucency_params.z;
        float spot_diff_factor = translucency_params.w;

        // NOTE: abs(): used for permanent translucency
        // when staring at the light source, independently from face normal
        float ln = clamp(abs(dot(ldir, normal)), _0_0, _1_0);
        float el = clamp(dot(nin_eye_dir, -ldir), _0_0, _1_0);
        float transmit_coeff = pow(el, spot_hardness);

        // translucency light diffusion
        color_out = color_in + translucency_color * vec4(lcolorint * ln
                * pow(D, vec3(backside_factor)), _1_0);

        // translucency light transmission
        color_out += spot_intensity * mix(vec4(D, _1_0), vec4(_1_0),
                spot_diff_factor) * translucency_color
                * vec4(lcolorint * ln * vec3(transmit_coeff), _1_0);
        specular_out = specular_in;
    } else {
        // frontside lighting
        specular_out = specular_in + lcolorint * S * sfactor;
        color_out = color_in + vec4(lcolorint * D * lfactor, sfactor);
    }
#node_else
    specular_out = specular_in + lcolorint * S * sfactor;
    color_out = color_in + vec4(lcolorint * D * lfactor, sfactor);
#node_endif
#endnode

#node RGB
    #node_var RGB_IND 0
    #node_out vec3 color_out

    color_out = u_node_rgbs[RGB_IND];
#endnode

#node RGBTOBW
    #node_in vec3 color_in
    #node_out float value

    value = dot(color_in, vec3(0.35, 0.45, 0.2));
#endnode

#node SEPRGB
    #node_in vec3 color
    #node_out optional float r_out
    #node_out optional float g_out
    #node_out optional float b_out

# node_if USE_OUT_r_out
    r_out = color.r;
# node_endif

# node_if USE_OUT_g_out
    g_out = color.g;
# node_endif

# node_if USE_OUT_b_out
    b_out = color.b;
# node_endif
#endnode

#node SEPHSV
    #node_in vec3 color
    #node_out optional float h_out
    #node_out optional float s_out
    #node_out optional float v_out

    vec3 out_col = rgb_to_hsv(color);

# node_if USE_OUT_h_out
    h_out = out_col.r;
# node_endif

# node_if USE_OUT_s_out
    s_out = out_col.g;
# node_endif

# node_if USE_OUT_v_out
    v_out = out_col.b;
# node_endif
#endnode

#node SQUEEZE
    #node_in float value_in
    #node_in float width
    #node_in float center
    #node_out float value

    value = _1_0 / (_1_0 + pow(2.71828183, -(value_in-center)*width));
#endnode

#node GAMMA
    #node_in vec3 color_in
    #node_in float gamma
    #node_out vec3 color_out

    color_out = color_in;
    if (color_out.x > _0_0)
        color_out.x = pow(color_in.x, gamma);
    if (color_out.y > _0_0)
        color_out.y = pow(color_in.y, gamma);
    if (color_out.z > _0_0)
        color_out.z = pow(color_in.z, gamma);
#endnode

#node B4W_SRGB_TO_LINEAR
    #node_in vec3 color_in
    #node_out vec3 color_out

    color_out = max(vec3(_0_0), color_in);
    color_out = pow(color_out, vec3(2.2));
#endnode

#node B4W_LINEAR_TO_SRGB
    #node_in vec3 color_in
    #node_out vec3 color_out

    color_out = max(vec3(_0_0), color_in);
    color_out = pow(color_out, vec3(_1_0/2.2));
#endnode

#node TEXTURE_EMPTY
    #node_out vec3 color
    #node_out vec3 normal
    #node_out float value

#node_if USE_OUT_color
    color[2] = color[1] = color[0] = _0_0;
#node_endif

#node_if USE_OUT_normal
    normal[2] = normal[1] = normal[0] = _0_0;
#node_endif

#node_if USE_OUT_value
    value = _0_0;
#node_endif
#endnode

#node TEXTURE_ENVIRONMENT
    #node_in vec3 coords
    #node_out optional vec3 color
    #node_out optional float value
    #node_param uniform samplerCube texture

    vec3 yup_coords = vec3(coords.x, coords.y, coords.z);
    vec4 texval = GLSL_TEXTURE_CUBE(texture, yup_coords);

# node_if USE_OUT_color
    color = texval.xyz;
    srgb_to_lin(color);
# node_endif

# node_if USE_OUT_value
    value = texval.w;
# node_endif
#endnode

#node TEXTURE_COLOR
    #node_var NON_COLOR 0
    #node_var USE_uv2 0
    #node_var USE_uv3 0
    #node_var USE_uv4 0
    #node_in optional vec3 uv
    #node_in optional vec3 uv2
    #node_in optional vec3 uv3
    #node_in optional vec3 uv4
    #node_out optional vec3 color
    #node_out optional float value
    #node_out optional vec3 color2
    #node_out optional float value2
    #node_out optional vec3 color3
    #node_out optional float value3
    #node_out optional vec3 color4
    #node_out optional float value4
    #node_param uniform sampler2D texture

    vec4 texval = GLSL_TEXTURE(texture, vec_to_uv(uv));
# node_if USE_OUT_color
    color = texval.xyz;
#  node_if !NON_COLOR
    srgb_to_lin(color);
#  node_endif
# node_endif
# node_if USE_OUT_value
    value = texval.w;
# node_endif

# node_if USE_uv2
    texval = GLSL_TEXTURE(texture, vec_to_uv(uv2));
#  node_if USE_OUT_color2
    color2 = texval.xyz;
#  node_if !NON_COLOR
     srgb_to_lin(color2);
#  node_endif
#  node_endif
#  node_if USE_OUT_value2
    value2 = texval.w;
#  node_endif
# node_endif

# node_if USE_uv3
    texval = GLSL_TEXTURE(texture, vec_to_uv(uv3));
# node_if USE_OUT_color3
    color3 = texval.xyz;
#  node_if !NON_COLOR
     srgb_to_lin(color3);
#  node_endif
#  node_endif
#  node_if USE_OUT_value3
    value3 = texval.w;
#  node_endif
# node_endif

# node_if USE_uv4
    texval = GLSL_TEXTURE(texture, vec_to_uv(uv4));
# node_if USE_OUT_color4
    color4 = texval.xyz;
#  node_if !NON_COLOR
     srgb_to_lin(color4);
#  node_endif
#  node_endif
#  node_if USE_OUT_value4
    value4 = texval.w;
#  node_endif
# node_endif
#endnode

#node TEXTURE_NORMAL
    #node_var USE_uv2 0
    #node_var USE_uv3 0
    #node_var USE_uv4 0
    #node_in optional vec3 uv
    #node_in optional vec3 uv2
    #node_in optional vec3 uv3
    #node_in optional vec3 uv4
    #node_out optional vec3 normal
    #node_out optional float value
    #node_out optional vec3 normal2
    #node_out optional float value2
    #node_out optional vec3 normal3
    #node_out optional float value3
    #node_out optional vec3 normal4
    #node_out optional float value4
    #node_param uniform sampler2D texture

    vec4 texval = GLSL_TEXTURE(texture, vec_to_uv(uv));
# node_if USE_OUT_normal
    normal = normalize(nin_tbn_matrix * (texval.xyz - _0_5));
# node_endif
# node_if USE_OUT_value
    value = texval.w;
# node_endif

# node_if USE_uv2
    texval = GLSL_TEXTURE(texture, vec_to_uv(uv2));
#  node_if USE_OUT_normal2
    normal2 = normalize(nin_tbn_matrix * (texval.xyz - _0_5));
#  node_endif
#  node_if USE_OUT_value2
    value2 = texval.w;
#  node_endif
# node_endif

# node_if USE_uv3
    texval = GLSL_TEXTURE(texture, vec_to_uv(uv3));
#  node_if USE_OUT_normal3
    normal3 = normalize(nin_tbn_matrix * (texval.xyz - _0_5));
#  node_endif
#  node_if USE_OUT_value3
    value3 = texval.w;
#  node_endif
# node_endif

# node_if USE_uv4
    texval = GLSL_TEXTURE(texture, vec_to_uv(uv4));
#  node_if USE_OUT_normal4
    normal4 = normalize(nin_tbn_matrix * (texval.xyz - _0_5));
#  node_endif
#  node_if USE_OUT_value4
    value4 = texval.w;
#  node_endif
# node_endif
#endnode

#node VALUE
    #node_var VALUE_IND 0
    #node_out float value_out

    value_out = u_node_values[VALUE_IND];
#endnode

#node VECT_MATH_ADD
    #node_in vec3 vec_in1
    #node_in vec3 vec_in2
    #node_out vec3 vec
    #node_out optional float val

    vec = vec_in1 + vec_in2;
# node_if USE_OUT_val
    val = (abs(vec[0]) + abs(vec[1]) + abs(vec[2]))/3.0;
# node_endif
#endnode
#node VECT_MATH_SUBTRACT
    #node_in vec3 vec_in1
    #node_in vec3 vec_in2
    #node_out vec3 vec
    #node_out optional float val

    vec = vec_in1 - vec_in2;
# node_if USE_OUT_val
    val = (abs(vec[0]) + abs(vec[1]) + abs(vec[2]))/3.0;
# node_endif
#endnode
#node VECT_MATH_AVERAGE
    #node_in vec3 vec_in1
    #node_in vec3 vec_in2
    #node_out vec3 vec
    #node_out optional float val

    vec = vec_in1 + vec_in2;
# node_if USE_OUT_val
    val = length(vec);
# node_endif
# node_if USE_OUT_vec
    vec = normalize(vec);
# node_endif
#endnode
#node VECT_MATH_DOT_PRODUCT
    #node_in vec3 vec_in1
    #node_in vec3 vec_in2
    #node_out vec3 vec
    #node_out optional float val

    vec = vec3(_0_0);
# node_if USE_OUT_val
    val = dot(vec_in1, vec_in2);
# node_endif
#endnode
#node VECT_MATH_CROSS_PRODUCT
    #node_in vec3 vec_in1
    #node_in vec3 vec_in2
    #node_out vec3 vec
    #node_out optional float val

    vec = cross(vec_in1, vec_in2);
# node_if USE_OUT_val
    val = length(vec);
# node_endif
#endnode
#node VECT_MATH_NORMALIZE
    #node_in vec3 vec_in1
    #node_in vec3 vec_in2
    #node_out vec3 vec
    #node_out optional float val

    vec = normalize(vec_in1);
# node_if USE_OUT_val
    val = length(vec_in1);
# node_endif
    // NOTE: using unused variable to pass shader verification
    vec_in2;
#endnode

#node B4W_REFLECT
    #node_in vec3 vec_in1
    #node_in vec3 vec_in2
    #node_out vec3 vec_out

    vec_out = reflect(tsr9_transform_dir(nin_view_tsr_inverse, vec_in1), vec_in2);
#endnode

#node B4W_REFLECT_WORLD
    #node_in vec3 vec_in2
    #node_out vec3 vec_out

    // + flipped to mimic the Blender's behaviour
    vec3 zup_eye_dir = -nin_eye_dir.xyz;

    vec_out = reflect(zup_eye_dir, vec_in2);
#endnode

#node B4W_PARALLAX
    #node_in vec3 uv_in
    #node_in float parallax_scale
    #node_in const float steps
    #node_in const float lod_dist
    #node_out vec3 uv_out
    #node_param uniform sampler2D texture // heigth is written in alpha channel

    float view_dist = length(nin_pos_view);

    if (view_dist < lod_dist) {

        vec2 texcoord = vec_to_uv(uv_in);

        float multiplier = clamp(_0_5 * (lod_dist - view_dist),
                                 _0_0, _1_0);
        float scale = parallax_scale * multiplier;

        // transform eye to tangent space
        vec3 eye = normalize(nin_eye_dir * nin_tbn_matrix);

        // distance between checked layers
        float pstep = _1_0 / steps;

        // adjustment for one layer height of the layer
        vec2 dtex = eye.xy * scale / (steps * eye.z);

        float height = _1_0;

        float h = GLSL_TEXTURE(texture, texcoord).a; // get height

        for (float i = 1.0; i <= steps; i++)
        {
            if (h < height) {
                height   -= pstep;
                texcoord -= dtex;
                h         = GLSL_TEXTURE(texture, texcoord).a;
            }
        }

        // find point via linear interpolation
        vec2 prev = texcoord + dtex;
        float h_prev = GLSL_TEXTURE(texture, prev).a - (height + pstep);
        float h_current = h - height;
        float weight = h_current / (h_current - h_prev);

        // interpolate to get tex coords
        texcoord = weight * prev + (_1_0 - weight) * texcoord;
        uv_out = uv_to_vec(texcoord);
    } else
        uv_out = uv_in;
#endnode

#node B4W_CLAMP
    #node_in vec3 vector_in
    #node_out vec3 vector_out

    vector_out = clamp(vector_in, _0_0, _1_0);
#endnode

#node B4W_REFRACTION
    #node_in vec3 normal_in
    #node_in float refr_bump
    #node_out vec3 color_out

    color_out = refraction_node(normal_in, refr_bump);
#endnode

#node B4W_TRANSLUCENCY
    #node_in float color
    #node_in float backside_factor
    #node_in float spot_hardness
    #node_in float spot_intensity
    #node_in float spot_diff_factor
    #node_out optional float translucency_color
    #node_out optional vec4 translucency_params

# node_if USE_OUT_translucency_color
    translucency_color = color;
# node_endif
# node_if USE_OUT_translucency_params
    translucency_params = vec4(backside_factor, spot_hardness, spot_intensity, spot_diff_factor);
# node_endif
#endnode

#node B4W_TIME
    #node_out float time

    time = u_time;
#endnode

#node B4W_SMOOTHSTEP
    #node_in float value
    #node_in float edge0
    #node_in float edge1
    #node_out float val

    val = smoothstep(edge0, edge1, value);
#endnode

#node B4W_GLOW_OUTPUT
    #node_in vec3 color_in
    #node_in float factor_in

    nout_color = color_in;
    nout_alpha = factor_in;
#endnode

#node B4W_VECTOSCAL
    #node_in vec3 vector
    #node_out float scalar

    scalar = (vector.r + vector.g + vector.b) / 3.0;
#endnode

#node B4W_SCALTOVEC
    #node_in float scalar
    #node_out vec3 vector

    vector[0] = scalar;
    vector[1] = scalar;
    vector[2] = scalar;
#endnode

#nodes_global

void nodes_main(in vec3 nin_eye_dir,
        in mat3 nin_view_tsr,
        in mat3 nin_view_tsr_inverse,
        in mat3 nin_model_tsr,
        in mat3 nin_model_tsr_inverse,
        out vec3 nout_color,
        out vec3 nout_specular_color,
        out vec3 nout_normal,
        out vec4 nout_shadow_factor,
        out float nout_alpha) {

    // NOTE: set up out variables to prevent IE 11 linking crash
    nout_color = vec3(_0_0);
    nout_specular_color = vec3(_0_0);
    nout_normal = vec3(_0_0);
    nout_shadow_factor = vec4(_0_0);
    nout_alpha = _0_0;

#if USE_NODE_MATERIAL_BEGIN  || USE_NODE_GEOMETRY_NO \
        || CAUSTICS || CALC_TBN_SPACE || USE_NODE_TEX_COORD_NO || USE_NODE_NORMAL_MAP

    vec3 normal = normalize(v_normal);
    vec3 sided_normal = normal;
# if DOUBLE_SIDED_LIGHTING || USE_NODE_GEOMETRY_NO
    // NOTE: workaround for some bug with gl_FrontFacing on Intel graphics
    // or open-source drivers
#if INVERT_FRONTFACING
    if (!gl_FrontFacing)
#else
    if (gl_FrontFacing)
#endif
        sided_normal = sided_normal;
    else
        sided_normal = -sided_normal;
# endif

# if DOUBLE_SIDED_LIGHTING
    vec3 nin_normal = sided_normal;
# else
    vec3 nin_normal = normal;
# endif

# if USE_NODE_GEOMETRY_NO
    vec3 nin_geom_normal = sided_normal;
# endif
#endif

#if CALC_TBN_SPACE
    // vec3 binormal = cross(sided_normal, v_tangent.xyz) * v_tangent.w;
    // mat3 tbn_matrix = mat3(v_tangent.xyz, binormal, sided_normal);
    // mat3 nin_tbn_matrix = tbn_matrix;

    vec3 binormal = cross(sided_normal, v_tangent.xyz) * v_tangent.w;
    binormal = normalize(binormal);
    vec3 tangent = cross(binormal, sided_normal) * v_tangent.w;
    mat3 nin_tbn_matrix = mat3(tangent, binormal, sided_normal);
#endif

    // NOTE: array uniforms used in nodes can't be renamed:
    // u_light_positions, u_light_directions, u_light_color_intensities,
    // u_light_factors;

    vec3 nin_pos_world = v_pos_world;
    vec4 nin_pos_view = v_pos_view;
    float nin_emit = u_emit;
    float nin_ambient = u_ambient;

    #nodes_main
}

#endif
