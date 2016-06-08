// node dirs
#var MAPPING_TRS_MATRIX mat4(0.0)
#var MAPPING_SCALE vec3(0.0)
#var MAPPING_TRANSLATION vec3(0.0)
#var MAPPING_MIN_CLIP vec3(0.0)
#var MAPPING_MAX_CLIP vec3(0.0)
#var MAPPING_IS_NORMAL 0.0
#var RGB_IND 0
#var VALUE_IND 0
#var LAMP_INDEX 0
// lamp dirs
#var NUM_LIGHTS 0
#var LAMP_IND 0
#var LAMP_SPOT_SIZE 0
#var LAMP_SPOT_BLEND 0
#var LAMP_LIGHT_DIST 0
#var LAMP_LIGHT_FACT_IND 0
#var LAMP_FAC_CHANNELS rgb
#var LAMP_SHADOW_MAP_IND 0
#var NODE_TEX_ROW 0.0

#define M_PI 3.14159265359

/*============================================================================
                                   IMPORTS
============================================================================*/

// varyings
#import v_normal
#import v_tangent
#import v_pos_world
#import v_pos_view
#import v_texcoord

// uniforms
#import u_ambient
#import u_emit
#import u_environment_energy
#import u_lamp_light_color_intensities
#import u_lamp_light_directions
#import u_lamp_light_factors
#import u_lamp_light_positions
#import u_light_color_intensities
#import u_light_directions
#import u_light_factors
#import u_light_positions
#import u_node_rgbs
#import u_node_values
#import u_time
#import u_nodes_texture

// functions
#import get_environment_color
#import srgb_to_lin


/*============================================================================
                               GLOBAL VARIABLES
============================================================================*/

float ZERO_VALUE_NODES = 0.0;
float UNITY_VALUE_NODES = 1.0;
float HALF_VALUE_NODES = 0.5;

/*============================================================================
                                   EXPORTS
============================================================================*/

#export hsv_to_rgb
#export rgb_to_hsv
#export uv_to_vec
#export vec_to_uv

#export nodes_main

/*============================================================================
                                  FUNCTIONS
============================================================================*/

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

#if USE_NODE_GEOMETRY_UV || USE_NODE_B4W_PARALLAX || USE_NODE_UV_MERGED
vec3 uv_to_vec(vec2 uv)
{
    return vec3(uv*2.0 - vec2(UNITY_VALUE_NODES, UNITY_VALUE_NODES), ZERO_VALUE_NODES);
}
#endif

#if USE_NODE_TEXTURE_COLOR || USE_NODE_TEXTURE_NORMAL || USE_NODE_B4W_PARALLAX
vec2 vec_to_uv(vec3 vec)
{
    return vec2(vec.xy * HALF_VALUE_NODES + vec2(HALF_VALUE_NODES, HALF_VALUE_NODES));
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

    uv = vec3(-UNITY_VALUE_NODES, -UNITY_VALUE_NODES, ZERO_VALUE_NODES);
#endnode

#node EMPTY_VC
    #node_out vec3 vc

    vc = vec3(ZERO_VALUE_NODES);
#endnode

#node GEOMETRY_UV
    #node_out vec3 uv

    uv = uv_to_vec(v_texcoord);
#endnode

#node GEOMETRY_OR
    #node_out vec3 orco

    orco = 2.0 * vec3(v_texcoord, ZERO_VALUE_NODES) - vec3(UNITY_VALUE_NODES);
#endnode

#node GEOMETRY_VC
    #node_out vec3 vc

    vc = vec3(UNITY_VALUE_NODES);
#endnode

#node GEOMETRY_VC1
    #node_out float channel0_out

    channel0_out = UNITY_VALUE_NODES;
#endnode

#node GEOMETRY_VC2
    #node_out float channel0_out
    #node_out float channel1_out

    channel0_out = UNITY_VALUE_NODES;
    channel1_out = UNITY_VALUE_NODES;
#endnode

#node GEOMETRY_VC3
    #node_out float channel0_out
    #node_out float channel1_out
    #node_out float channel2_out

    channel0_out = UNITY_VALUE_NODES;
    channel1_out = UNITY_VALUE_NODES;
    channel2_out = UNITY_VALUE_NODES;
#endnode

#node GEOMETRY_NO
    #node_out vec3 normal_out

    normal_out = nin_geom_normal;
#endnode

#node GEOMETRY_FB
    #node_out float frontback

    // NOTE: possible compatibility issues
    // 1 front, 0 back
#node_if INVERT_FRONTFACING
    frontback = (gl_FrontFacing) ? ZERO_VALUE_NODES : UNITY_VALUE_NODES;
#node_else
    frontback = (gl_FrontFacing) ? UNITY_VALUE_NODES : ZERO_VALUE_NODES;
#node_endif
#endnode

#node GEOMETRY_VW
    #node_out vec3 view_out
    // view_out[0] = nin_pos_view[0];
    // view_out[1] = nin_pos_view[1];
    // view_out[2] = nin_pos_view[2];
    // view_out = normalize(view_out);
    view_out = nin_eye_dir;
#endnode

#node GEOMETRY_LO
    #node_out vec3 local_out
    local_out[0] = nin_pos_view[0];
    local_out[1] = nin_pos_view[1];
    local_out[2] = nin_pos_view[2];
#endnode


#node GEOMETRY_GL
    #node_out vec3 global_out

    global_out = vec3(nin_pos_world.r, -nin_pos_world.b, nin_pos_world.g);
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

    position = vec3(ZERO_VALUE_NODES);
    normal = vec3(ZERO_VALUE_NODES);
    tangent = vec3(ZERO_VALUE_NODES);
    true_normal = vec3(ZERO_VALUE_NODES);
    incoming = vec3(ZERO_VALUE_NODES);
    parametric = vec3(ZERO_VALUE_NODES);
    backfacing = ZERO_VALUE_NODES;
    pointiness = ZERO_VALUE_NODES;

#endnode

#node HUE_SAT
    #node_in float hue
    #node_in float saturation
    #node_in float value
    #node_in float factor
    #node_in vec3 color_in
    #node_out vec3 color

    vec3 hsv = rgb_to_hsv(color_in);
    hsv[0] += (hue - HALF_VALUE_NODES);
    if (hsv[0] > UNITY_VALUE_NODES)
        hsv[0] -= UNITY_VALUE_NODES;
    else if (hsv[0] < ZERO_VALUE_NODES)
        hsv[0] += UNITY_VALUE_NODES;

    hsv *= vec3(UNITY_VALUE_NODES, saturation, value);
    hsv = mix(vec3(UNITY_VALUE_NODES), mix(vec3(ZERO_VALUE_NODES), hsv, step(vec3(ZERO_VALUE_NODES), hsv)), step(hsv, vec3(UNITY_VALUE_NODES)));
    color = mix(color_in, hsv_to_rgb(hsv), factor);
#endnode

#node INVERT
    #node_in float factor
    #node_in vec3 color_in
    #node_out vec3 color

    color = mix(color_in, vec3(UNITY_VALUE_NODES) - color_in, factor);
#endnode

#node LAMP
    #node_out optional vec3 color_out
    #node_out vec3 light_vec_out
    #node_out float distance_out
    #node_out optional float visibility_factor_out

# node_if USE_OUT_color_out
    color_out = u_lamp_light_color_intensities[LAMP_INDEX];
# node_endif

    // see process_lamp
    vec4 llf = u_lamp_light_factors[LAMP_INDEX];
    vec3 lld = u_lamp_light_directions[LAMP_INDEX];
    vec3 llp = u_lamp_light_positions[LAMP_INDEX];
    float lamp_dist = llf.z;
    if (lamp_dist != -UNITY_VALUE_NODES) { // point and spot

        light_vec_out = llp - v_pos_world;
        distance_out = length(light_vec_out);
        light_vec_out = normalize(light_vec_out);

# node_if USE_OUT_visibility_factor_out
        visibility_factor_out = lamp_dist / (lamp_dist + distance_out * distance_out);

        float spot_size = llf.x;
        float spot_blend = llf.y;
        if (spot_size > -UNITY_VALUE_NODES) {
            float spot_factor = dot(light_vec_out, lld);
            spot_factor *= smoothstep(ZERO_VALUE_NODES, UNITY_VALUE_NODES,
                    (spot_factor - spot_size) / spot_blend);
            visibility_factor_out *= spot_factor;

        }
# node_endif
    } else { // sun and hemi
# node_if USE_OUT_light_vec_out
        light_vec_out = lld;
# node_endif

# node_if USE_OUT_distance_out
        distance_out = length(llp - v_pos_world);
# node_endif

# node_if USE_OUT_visibility_factor_out
        visibility_factor_out = UNITY_VALUE_NODES;
# node_endif
    }
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
    #node_in vec3 normal_in
    #node_out vec3 normal

    // NOTE: (-) mimic blender behavior
    normal = -(nin_view_matrix * vec4(normal_in, ZERO_VALUE_NODES)).xyz;
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
    vec[0] = vec[1] = vec[2] = ZERO_VALUE_NODES;
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
    vec_out[0] = vec_out[1] = vec_out[2] = ZERO_VALUE_NODES;
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
    vec_out[0] = vec_out[1] = vec_out[2] = ZERO_VALUE_NODES;
    // NOTE: using unused variable to pass shader verification
    color;
#endnode

#node HOLDOUT
    #node_out vec3 vec_out
    vec_out[0] = vec_out[1] = vec_out[2] = ZERO_VALUE_NODES;
#endnode

#node VOLUME_ABSORPTION
    #node_in vec3 color
    #node_in float density
    #node_out vec3 vec_out
    vec_out[0] = vec_out[1] = vec_out[2] = ZERO_VALUE_NODES;
    // NOTE: using unused variable to pass shader verification
    color;
    density;
#endnode

#node VOLUME_SCATTER
    #node_in vec3 color
    #node_in float density
    #node_in float anisotropy
    #node_out vec3 vec_out
    vec_out[0] = vec_out[1] = vec_out[2] = ZERO_VALUE_NODES;
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
    #node_in float strength
    #node_in vec3 color
    #node_out vec3 normal_out
    normal_out = color;
    // NOTE: using unused variable to pass shader verification
    strength;
#endnode

#node VECT_TRANSFORM
    #node_in vec3 vec_in
    #node_out vec3 vec_out
#node_if CONVERT_TYPE == WORLD_TO_WORLD  || CONVERT_TYPE == OBJECT_TO_OBJECT || CONVERT_TYPE == CAMERA_TO_CAMERA
    vec_out = vec_in;
#node_else
# node_if VECTOR_TYPE == VT_POINT
    vec4 vec_from = vec4(vec_in, UNITY_VALUE_NODES);
# node_else
    vec4 vec_from = vec4(vec_in, ZERO_VALUE_NODES);
# node_endif

# node_if CONVERT_TYPE == VT_WORLD_TO_CAMERA
    vec_out = (nin_zup_view_matrix * vec_from).xyz;
# node_elif CONVERT_TYPE == VT_WORLD_TO_OBJECT
    vec_out = (nin_zup_model_matrix_inverse * vec_from).xyz;
# node_elif CONVERT_TYPE == VT_OBJECT_TO_WORLD
    vec_out = (nin_zup_model_matrix * vec_from).xyz;
# node_elif CONVERT_TYPE == VT_OBJECT_TO_CAMERA
    vec_out = (nin_zup_view_matrix * nin_zup_model_matrix * vec_from).xyz;
# node_elif CONVERT_TYPE == VT_CAMERA_TO_WORLD
    vec_out = (nin_zup_view_matrix_inverse * vec_from).xyz;
# node_elif CONVERT_TYPE == VT_CAMERA_TO_OBJECT
    vec_out = (nin_zup_model_matrix_inverse * nin_zup_view_matrix_inverse * vec_from).xyz;
# node_endif

# node_if VECTOR_TYPE == VT_NORMAL
    vec_out = normalize(vec_out);
# node_endif

#node_endif
#endnode

#node BLACKBODY
    #node_in float temperature
    #node_out vec3 vec
    vec[0] = vec[1] = vec[2] = ZERO_VALUE_NODES;
    // NOTE: using unused variable to pass shader verification
    temperature;
#endnode

#node WAVELENGTH
    #node_in float wavelength
    #node_out vec3 color
    color[0] = color[1] = color[2] = ZERO_VALUE_NODES;
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
    float b = brightness - contrast * HALF_VALUE_NODES;
    color_out = max((UNITY_VALUE_NODES + contrast) * color + b, vec3(ZERO_VALUE_NODES));
#endnode

#node LIGHT_FALLOFF
    #node_in float strength
    #node_in float smooth_float
    #node_out float quadratic
    #node_out float linear
    #node_out float constant
    quadratic = linear = constant = ZERO_VALUE_NODES;
    // NOTE: using unused variable to pass shader verification
    strength;
    smooth_float;
#endnode

#node TEX_IMAGE
    #node_in vec3 vec_in
    #node_out vec3 vec
    #node_out float alpha
    vec[0] = vec[1] = vec[2] = ZERO_VALUE_NODES;
    alpha = UNITY_VALUE_NODES;
    // NOTE: using unused variable to pass shader verification
    vec_in;
#endnode

#node TEX_ENVIRONMENT
    #node_in vec3 vec_in
    #node_out vec3 vec
    vec[0] = vec[1] = vec[2] = ZERO_VALUE_NODES;
    // NOTE: using unused variable to pass shader verification
    vec_in;
#endnode

#node TEX_SKY
    #node_in vec3 vec_in
    #node_out vec3 vec
    vec[0] = vec[1] = vec[2] = ZERO_VALUE_NODES;
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
    vec[0] = vec[1] = vec[2] = ZERO_VALUE_NODES;
    factor = UNITY_VALUE_NODES;
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
    vec[0] = vec[1] = vec[2] = ZERO_VALUE_NODES;
    factor = UNITY_VALUE_NODES;
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
    vec[0] = vec[1] = vec[2] = ZERO_VALUE_NODES;
    factor = UNITY_VALUE_NODES;
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
    vec[0] = vec[1] = vec[2] = ZERO_VALUE_NODES;
    factor = UNITY_VALUE_NODES;
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
    vec[0] = vec[1] = vec[2] = ZERO_VALUE_NODES;
    factor = UNITY_VALUE_NODES;
    // NOTE: using unused variable to pass shader verification
    vec_in;
#endnode

#node TEX_MAGIC
    #node_in vec3 vec_in
    #node_in float scale
    #node_in float distortion
    #node_out vec3 vec
    #node_out float factor
    vec[0] = vec[1] = vec[2] = ZERO_VALUE_NODES;
    factor = UNITY_VALUE_NODES;
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
    vec[0] = vec[1] = vec[2] = ZERO_VALUE_NODES;
    factor = UNITY_VALUE_NODES;
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
    vec[0] = vec[1] = vec[2] = ZERO_VALUE_NODES;
    factor = UNITY_VALUE_NODES;
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
    color = clamp(color1 + color2, vec3(ZERO_VALUE_NODES), vec3(UNITY_VALUE_NODES));
#endnode

#node MIX_SHADER
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color
    float clamped_factor = clamp(factor, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
    color = clamped_factor * color1 + (UNITY_VALUE_NODES - clamped_factor) * color2;
#endnode

#node UV_MERGED
    #node_out vec3 uv_geom
    #node_out vec3 uv_cycles

#node_if USE_OUT_uv_geom
    uv_geom = uv_to_vec(v_texcoord);
#node_endif
#node_if USE_OUT_uv_cycles
    uv_cycles = vec3(v_texcoord, ZERO_VALUE_NODES);
#node_endif
#endnode

#node TEX_COORD_UV
    #node_out vec3 uv

    uv = vec3(v_texcoord, ZERO_VALUE_NODES);
#endnode

#node TEX_COORD_NO
    #node_out vec3 normal_out

    normal_out = nin_normal;
#endnode

#node TEX_COORD_GE
    #node_out vec3 generated
    generated = vec3(v_texcoord, ZERO_VALUE_NODES);
#endnode

#node TEX_COORD_OB
    #node_out vec3 vec_out
    vec_out[0] = vec_out[1] = vec_out[2] = UNITY_VALUE_NODES;
#endnode

#node TEX_COORD_CA
    #node_out vec3 camera_out
    camera_out[0] = nin_pos_view[0];
    camera_out[1] = nin_pos_view[1];
    camera_out[2] = UNITY_VALUE_NODES;
#endnode

#node TEX_COORD_WI
    #node_out vec3 vec_out
    vec_out[0] = vec_out[1] = vec_out[2] = UNITY_VALUE_NODES;
#endnode

#node TEX_COORD_RE
    #node_out vec3 vec_out
    vec_out[0] = vec_out[1] = vec_out[2] = UNITY_VALUE_NODES;
#endnode

#node UVMAP
    #node_out vec3 uv

    uv = vec3(v_texcoord, ZERO_VALUE_NODES);
#endnode

#node PARTICLE_INFO
    #node_out float index
    #node_out float age
    #node_out float lifetime
    #node_out vec3 location
    #node_out float size
    #node_out vec3 velocity
    #node_out vec3 angular_velocity

    // v_p_params -> indices, time, lifetimes, sizes
    #node_param optional varying vec4 v_p_params
    #node_param optional varying vec3 v_p_location
    #node_param optional varying vec3 v_p_vel
    #node_param optional varying vec3 v_p_a_vel

#node_if PARTICLE_BATCH

# node_if USE_OUT_index
    index = v_p_params[0];
# node_endif

# node_if USE_OUT_age
    age = v_p_params[1];
# node_endif

# node_if USE_OUT_lifetime
    lifetime = v_p_params[2];
# node_endif

# node_if USE_OUT_location
    location = vec3(v_p_location.r, -v_p_location.b, v_p_location.g);
# node_endif

# node_if USE_OUT_size
    size = v_p_params[3];
# node_endif

# node_if USE_OUT_velocity
    velocity = vec3(v_p_vel.r, -v_p_vel.b, v_p_vel.g);
# node_endif

# node_if USE_OUT_angular_velocity
    angular_velocity = vec3(v_p_a_vel.r, -v_p_a_vel.b, v_p_a_vel.g);
# node_endif

#node_else
    index = ZERO_VALUE_NODES;
    age = ZERO_VALUE_NODES;
    lifetime = ZERO_VALUE_NODES;
    location = vec3(ZERO_VALUE_NODES);
    size = ZERO_VALUE_NODES;
    velocity = location;
    angular_velocity = location;
#node_endif
#endnode

#node HAIR_INFO
    #node_out float is_strand
    #node_out float intercept
    #node_out float thickness
    #node_out vec3 tangent_normal
    is_strand = ZERO_VALUE_NODES;
    intercept = ZERO_VALUE_NODES;
    thickness = ZERO_VALUE_NODES;
    tangent_normal = vec3(ZERO_VALUE_NODES);
#endnode

#node OBJECT_INFO
    #node_out vec3 location
    #node_out float object_index
    #node_out float material_index
    #node_out float random
    object_index = ZERO_VALUE_NODES;
    material_index = ZERO_VALUE_NODES;
    random = ZERO_VALUE_NODES;
    location = vec3(ZERO_VALUE_NODES);
#endnode

#node WIREFRAME
    #node_in float size
    #node_out float factor
    factor = size;
#endnode

#node TANGENT
    #node_out vec3 tangent
    tangent = vec3(ZERO_VALUE_NODES);
#endnode

#node LAYER_WEIGHT
    #node_in float blend
    #node_in vec3 normal
    #node_out float fresnel
    #node_out float facing
    fresnel = facing = ZERO_VALUE_NODES;
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
    is_camera_ray = is_shadow_ray = is_diffuse_ray = ZERO_VALUE_NODES;
    is_glossy_ray = is_singular_ray = is_reflection_ray = ZERO_VALUE_NODES;
    is_transmisson_ray = is_transmisson_ray = ray_depth = transparent_depth = ZERO_VALUE_NODES;
    ray_length = ZERO_VALUE_NODES;
#endnode

#node ATTRIBUTE
    #node_out vec3 color
    #node_out vec3 vec_out
    #node_out float factor
    color = vec_out = vec3(ZERO_VALUE_NODES);
    factor = ZERO_VALUE_NODES;
#endnode

#node SCRIPT
#endnode

#node CURVE_VEC
    #node_in float factor
    #node_in vec3 vec_in
    #node_out vec3 vec

    vec = vec_in;
#node_if READ_R
    vec.r = (texture2D(u_nodes_texture, vec2(0.5 * vec_in.r + 0.5, NODE_TEX_ROW)).r - 0.5) * 2.0;
#node_endif

#node_if READ_G
    vec.g = (texture2D(u_nodes_texture, vec2(0.5 * vec_in.g + 0.5, NODE_TEX_ROW)).g - 0.5) * 2.0;
#node_endif

#node_if READ_B
    vec.b = (texture2D(u_nodes_texture, vec2(0.5 * vec_in.b + 0.5, NODE_TEX_ROW)).b - 0.5) * 2.0;
#node_endif

    vec = mix(vec_in, vec, factor);
#endnode

#node CURVE_RGB
    #node_in float factor
    #node_in vec3 vec_in
    #node_out vec3 vec

#node_if READ_A
    float r = texture2D(u_nodes_texture, vec2(vec_in.r, NODE_TEX_ROW)).a;
    float g = texture2D(u_nodes_texture, vec2(vec_in.g, NODE_TEX_ROW)).a;
    float b = texture2D(u_nodes_texture, vec2(vec_in.b, NODE_TEX_ROW)).a;
#node_else
    float r = vec_in.r;
    float g = vec_in.g;
    float b = vec_in.b;
#node_endif

#node_if READ_R
    vec.r = texture2D(u_nodes_texture, vec2(r, NODE_TEX_ROW)).r;
#node_else
    vec.r = r;
#node_endif

#node_if READ_G
    vec.g = texture2D(u_nodes_texture, vec2(g, NODE_TEX_ROW)).g;
#node_else
    vec.g = g;
#node_endif

#node_if READ_B
    vec.b = texture2D(u_nodes_texture, vec2(b, NODE_TEX_ROW)).b;
#node_else
    vec.b = b;
#node_endif

    vec = mix(vec_in, vec, factor);
#endnode

// ColorRamp node
#node VALTORGB
    #node_in float factor
    #node_out vec3 color
    #node_out float alpha
    vec4 texval = texture2D(u_nodes_texture, vec2(factor, NODE_TEX_ROW));
    color = texval.rgb;
    alpha = texval.a;
#endnode

#node MAPPING
    #node_in vec3 vec_in
    #node_out vec3 vec

    vec = vec_in;
# node_ifdef MAPPING_TRS_MATRIX
    vec = (MAPPING_TRS_MATRIX * vec4(vec, UNITY_VALUE_NODES)).xyz;
# node_endif

# node_ifdef MAPPING_SCALE
    vec = vec * MAPPING_SCALE;
# node_endif

# node_ifdef MAPPING_TRANSLATION
    vec = vec + MAPPING_TRANSLATION;
# node_endif

# node_ifdef MAPPING_MIN_CLIP
    vec = max(vec, MAPPING_MIN_CLIP);
# node_endif

# node_ifdef MAPPING_MAX_CLIP
    vec = min(vec, MAPPING_MAX_CLIP);
# node_endif

# node_if MAPPING_IS_NORMAL
    vec = normalize(vec);
# node_endif
#endnode

#node MATH_ADD
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val

    val = val_in1 + val_in2;
# node_if MATH_USE_CLAMP
    val = clamp(val, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
# node_endif
#endnode
#node MATH_SUBTRACT
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val

    val = val_in1 - val_in2;
# node_if MATH_USE_CLAMP
    val = clamp(val, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
# node_endif
#endnode
#node MATH_MULTIPLY
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val

    val = val_in1 * val_in2;
# node_if MATH_USE_CLAMP
    val = clamp(val, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
# node_endif
#endnode
#node MATH_DIVIDE
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val

    val = (val_in2 != ZERO_VALUE_NODES) ? val_in1/val_in2 : ZERO_VALUE_NODES;
# node_if MATH_USE_CLAMP
    val = clamp(val, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
# node_endif
#endnode
#node MATH_SINE
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val

    val = sin(val_in1);
# node_if MATH_USE_CLAMP
    val = clamp(val, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
# node_endif
    // NOTE: using unused variable to pass shader verification
    val_in2;
#endnode
#node MATH_COSINE
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val

    val = cos(val_in1);
# node_if MATH_USE_CLAMP
    val = clamp(val, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
# node_endif
    // NOTE: using unused variable to pass shader verification
    val_in2;
#endnode
#node MATH_TANGENT
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val

    val = tan(val_in1);
# node_if MATH_USE_CLAMP
    val = clamp(val, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
# node_endif
    // NOTE: using unused variable to pass shader verification
    val_in2;
#endnode
#node MATH_ARCSINE
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val

    val = (val_in1 <= UNITY_VALUE_NODES && val_in1 >= -UNITY_VALUE_NODES) ? asin(val_in1) : ZERO_VALUE_NODES;
# node_if MATH_USE_CLAMP
    val = clamp(val, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
# node_endif
    // NOTE: using unused variable to pass shader verification
    val_in2;
#endnode
#node MATH_ARCCOSINE
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val

    val = (val_in1 <= UNITY_VALUE_NODES && val_in1 >= -UNITY_VALUE_NODES) ? acos(val_in1) : ZERO_VALUE_NODES;
# node_if MATH_USE_CLAMP
    val = clamp(val, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
# node_endif
    // NOTE: using unused variable to pass shader verification
    val_in2;
#endnode
#node MATH_ARCTANGENT
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val

    val = atan(val_in1);
# node_if MATH_USE_CLAMP
    val = clamp(val, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
# node_endif
    // NOTE: using unused variable to pass shader verification
    val_in2;
#endnode
#node MATH_POWER
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val

    if (val_in1 < ZERO_VALUE_NODES && val_in2 != floor(val_in2))
        val = ZERO_VALUE_NODES;
    else if (val_in2 == ZERO_VALUE_NODES)
        // NOTE: x^0 -> 1, including 0^0, 
        // see 'Two Notes on Notation' by Donald E. Knuth, p. 6:
        // http://arxiv.org/abs/math/9205211
        val = UNITY_VALUE_NODES;
    else if (val_in1 < ZERO_VALUE_NODES)
        val = mix(UNITY_VALUE_NODES, -UNITY_VALUE_NODES, sign(mod(-val_in2, 2.0))) * pow(-val_in1, val_in2);
    else if (val_in1 == ZERO_VALUE_NODES)
        val = ZERO_VALUE_NODES;
    else
        val = pow(val_in1, val_in2);
# node_if MATH_USE_CLAMP
    val = clamp(val, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
# node_endif
#endnode
#node MATH_LOGARITHM
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val

    val = (val_in1 > ZERO_VALUE_NODES && val_in2 > ZERO_VALUE_NODES) ?
            log2(val_in1) / log2(val_in2) : ZERO_VALUE_NODES;
# node_if MATH_USE_CLAMP
    val = clamp(val, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
# node_endif
#endnode
#node MATH_MINIMUM
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val

    val = min(val_in1, val_in2);
# node_if MATH_USE_CLAMP
    val = clamp(val, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
# node_endif
#endnode
#node MATH_MAXIMUM
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val

    val = max(val_in1, val_in2);
# node_if MATH_USE_CLAMP
    val = clamp(val, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
# node_endif
#endnode
#node MATH_ROUND
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val

    val = floor(val_in1 + HALF_VALUE_NODES);
# node_if MATH_USE_CLAMP
    val = clamp(val, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
# node_endif
    // NOTE: using unused variable to pass shader verification
    val_in2;
#endnode
#node MATH_LESS_THAN
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val

    val = (val_in1 < val_in2) ? UNITY_VALUE_NODES : ZERO_VALUE_NODES;
# node_if MATH_USE_CLAMP
    val = clamp(val, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
# node_endif
#endnode
#node MATH_GREATER_THAN
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val

    val = (val_in1 > val_in2) ? UNITY_VALUE_NODES : ZERO_VALUE_NODES;
# node_if MATH_USE_CLAMP
    val = clamp(val, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
# node_endif
#endnode
#node MATH_MODULO
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val

    val = abs(val_in2) > 0.000001 ? mod(val_in1, val_in2) : ZERO_VALUE_NODES;
# node_if MATH_USE_CLAMP
    val = clamp(val, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
# node_endif
#endnode
#node MATH_ABSOLUTE
    #node_in float val_in1
    #node_in float val_in2
    #node_out float val

    val = abs(val_in1);
# node_if MATH_USE_CLAMP
    val = clamp(val, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
# node_endif
    // NOTE: using unused variable to pass shader verification
    val_in2;
#endnode


#node MIX_RGB_MIX
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color

    float clamped_factor = clamp(factor, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
    color = mix(color1, color2, clamped_factor);
# node_if MIX_RGB_USE_CLAMP
    color = clamp(color, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
# node_endif
#endnode
#node MIX_RGB_ADD
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color

    float clamped_factor = clamp(factor, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
    color = mix(color1, color1 + color2, clamped_factor);
# node_if MIX_RGB_USE_CLAMP
    color = clamp(color, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
# node_endif
#endnode
#node MIX_RGB_MULTIPLY
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color

    float clamped_factor = clamp(factor, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
    color = mix(color1, color1 * color2, clamped_factor);
# node_if MIX_RGB_USE_CLAMP
    color = clamp(color, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
# node_endif
#endnode
#node MIX_RGB_SUBTRACT
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color

    float clamped_factor = clamp(factor, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
    color = mix(color1, color1 - color2, clamped_factor);
# node_if MIX_RGB_USE_CLAMP
    color = clamp(color, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
# node_endif
#endnode
#node MIX_RGB_SCREEN
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color

    float clamped_factor = clamp(factor, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
    float factorm = UNITY_VALUE_NODES - clamped_factor;
    color = vec3(UNITY_VALUE_NODES) - (vec3(factorm) + clamped_factor*(vec3(UNITY_VALUE_NODES) - color2)) *
            (vec3(UNITY_VALUE_NODES) - color1);
# node_if MIX_RGB_USE_CLAMP
    color = clamp(color, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
# node_endif
#endnode
#node MIX_RGB_DIVIDE
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color

    float clamped_factor = clamp(factor, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
    float factorm = UNITY_VALUE_NODES - clamped_factor;
    color2 += step(color2, vec3(ZERO_VALUE_NODES));
    color = factorm*color1 + clamped_factor*color1/color2;
# node_if MIX_RGB_USE_CLAMP
    color = clamp(color, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
# node_endif
#endnode
#node MIX_RGB_DIFFERENCE
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color

    float clamped_factor = clamp(factor, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
    color = mix(color1, abs(color1 - color2), clamped_factor);
# node_if MIX_RGB_USE_CLAMP
    color = clamp(color, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
# node_endif
#endnode
#node MIX_RGB_DARKEN
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color

    float clamped_factor = clamp(factor, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
    color = min(color1.rgb, color2.rgb * clamped_factor);
# node_if MIX_RGB_USE_CLAMP
    color = clamp(color, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
# node_endif
#endnode
#node MIX_RGB_LIGHTEN
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color

    float clamped_factor = clamp(factor, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
    color = max(color1.rgb, color2.rgb * clamped_factor);
# node_if MIX_RGB_USE_CLAMP
    color = clamp(color, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
# node_endif
#endnode
#node MIX_RGB_OVERLAY
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color

    float clamped_factor = clamp(factor, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
    vec3 f_vec = vec3(UNITY_VALUE_NODES - clamped_factor);
    color = mix(color1 * (f_vec + 2.0*clamped_factor*color2),
                vec3(UNITY_VALUE_NODES) - (f_vec + 2.0*clamped_factor*(vec3(UNITY_VALUE_NODES) - color2)) * (vec3(UNITY_VALUE_NODES) - color1),
                step(HALF_VALUE_NODES, color1));
# node_if MIX_RGB_USE_CLAMP
    color = clamp(color, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
# node_endif
#endnode
#node MIX_RGB_DODGE
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color

    float clamped_factor = clamp(factor, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
    vec3 tmp = vec3(UNITY_VALUE_NODES) - clamped_factor * color2;
    vec3 tmp1 = clamp(color1 / tmp, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
    color = mix(mix(tmp1, vec3(UNITY_VALUE_NODES), step(tmp, vec3(ZERO_VALUE_NODES))), color1, step(color1, vec3(ZERO_VALUE_NODES)));
# node_if MIX_RGB_USE_CLAMP
    color = clamp(color, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
# node_endif
#endnode
#node MIX_RGB_BURN
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color

    float clamped_factor = clamp(factor, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
    vec3 facm = vec3(UNITY_VALUE_NODES - clamped_factor);
    vec3 tmp = facm + clamped_factor*color2;
    vec3 tmp1 = clamp(vec3(UNITY_VALUE_NODES) - (vec3(UNITY_VALUE_NODES) - color1) / tmp, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
    color = mix(tmp1, vec3(ZERO_VALUE_NODES), step(tmp, vec3(ZERO_VALUE_NODES)));
# node_if MIX_RGB_USE_CLAMP
    color = clamp(color, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
# node_endif
#endnode
#node MIX_RGB_HUE
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color

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
# node_if MIX_RGB_USE_CLAMP
    color = clamp(color, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
# node_endif
#endnode
#node MIX_RGB_SATURATION
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color

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
# node_if MIX_RGB_USE_CLAMP
    color = clamp(color, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
# node_endif
#endnode
#node MIX_RGB_VALUE
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color

    float clamped_factor = clamp(factor, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
    float factorm = UNITY_VALUE_NODES - clamped_factor;
    vec3 hsv, hsv2;

    hsv = rgb_to_hsv(color1);
    hsv2 = rgb_to_hsv(color2);

    hsv.z = factorm*hsv.z + clamped_factor*hsv2.z;
    color = hsv_to_rgb(hsv);
# node_if MIX_RGB_USE_CLAMP
    color = clamp(color, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
# node_endif
#endnode
#node MIX_RGB_COLOR
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color

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
# node_if MIX_RGB_USE_CLAMP
    color = clamp(color, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
# node_endif
#endnode
#node MIX_RGB_SOFT_LIGHT
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color

    float clamped_factor = clamp(factor, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
    float factorm = UNITY_VALUE_NODES - clamped_factor;
    vec3 scr = color2 + color1 - color2 * color1;

    color = color1 * (vec3(factorm) + vec3(clamped_factor) * ((vec3(UNITY_VALUE_NODES) - color1)*color2 + scr));
# node_if MIX_RGB_USE_CLAMP
    color = clamp(color, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
# node_endif
#endnode
#node MIX_RGB_LINEAR_LIGHT
    #node_in float factor
    #node_in vec3 color1
    #node_in vec3 color2
    #node_out vec3 color

    float clamped_factor = clamp(factor, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
    color = color1 + clamped_factor * (2.0 * color2 - vec3(UNITY_VALUE_NODES));
# node_if MIX_RGB_USE_CLAMP
    color = clamp(color, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
# node_endif
#endnode

#node OUTPUT
    #node_in vec3 color_in
    #node_in float alpha_in

    nout_color = color_in;
    nout_alpha = alpha_in;
#endnode

#node MATERIAL_BEGIN
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
    #node_param optional const vec2 diffuse_params  // vec2(diffuse_param, diffuse_param2)
    #node_param const vec3 specular_params // vec3(intensity, spec_param_0, spec_param_1)

    // diffuse
    D = clamp(color_in, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
    // specular
    S = specular_params[0] * clamp(specular_color, ZERO_VALUE_NODES, UNITY_VALUE_NODES);

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
    shadow_factor = vec4(1.0);
#  node_if NUM_LIGHTS > 0
    // diffuse
    dif_params = vec2(diffuse_params[0], diffuse_params[1]);
    // specular
    sp_params = vec2(specular_params[1], specular_params[2]);
#  node_endif
    nout_shadow_factor = shadow_factor;
# node_else // !SHADELESS_MAT
    E = vec3(ZERO_VALUE_NODES);
    A = vec3(UNITY_VALUE_NODES);
# node_endif // !SHADELESS_MAT
#endnode

#node MATERIAL_END
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

reflect_factor;
// color_out
# node_if USE_OUT_color_out
#  node_if USE_MATERIAL_DIFFUSE
    color_out = color_in.rgb;
#  node_else
    color_out = vec3(ZERO_VALUE_NODES);
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
    alpha_out = clamp(alpha_in, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
#   node_if USE_MATERIAL_SPECULAR
    float t = max(max(specular_in.r, specular_in.g), specular_in.b)
            * specular_alpha;
    alpha_out = clamp(alpha_in * (UNITY_VALUE_NODES - t) + t, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
#   node_endif
#  node_endif
# node_else // MATERIAL_EXT
// alpha_out
#  node_if USE_OUT_alpha_out
    alpha_out = clamp(alpha_param, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
#   node_if USE_MATERIAL_SPECULAR
    float t = max(max(specular_in.r, specular_in.g), specular_in.b)
            * specular_alpha_param;
    alpha_out = alpha_param * (UNITY_VALUE_NODES - t) + t;
#   node_endif
#  node_endif
# node_endif // MATERIAL_EXT

# node_if USE_MATERIAL_SPECULAR
    nout_specular_color = specular_in;
# node_else
    nout_specular_color = vec3(ZERO_VALUE_NODES);
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

    color_out = vec4(E + D * A, ZERO_VALUE_NODES);
    specular_out = vec3(ZERO_VALUE_NODES);
#endnode

#node LIGHTING_LAMP
    #node_in vec4 shadow_factor

    #node_out vec3 ldir
    #node_out vec2 lfac
    #node_out vec3 lcolorint
    #node_out float norm_fac

    lfac = u_light_factors[LAMP_LIGHT_FACT_IND].LAMP_FAC_CHANNELS;
# node_if LAMP_TYPE == HEMI
    norm_fac = HALF_VALUE_NODES;
# node_else
    norm_fac = ZERO_VALUE_NODES;
# node_endif

    // 0.0 - full shadow, 1.0 - no shadow
    lcolorint = u_light_color_intensities[LAMP_IND];
# node_if LAMP_SHADOW_MAP_IND != -1
    lcolorint *= shadow_factor[LAMP_SHADOW_MAP_IND];
# node_endif

# node_if LAMP_TYPE == SPOT || LAMP_TYPE == POINT
    vec3 lpos = u_light_positions[LAMP_IND];
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
    spot_factor *= smoothstep(ZERO_VALUE_NODES, UNITY_VALUE_NODES,
                              (spot_factor - LAMP_SPOT_SIZE) / LAMP_SPOT_BLEND);
    lcolorint *= spot_factor;
#  node_endif
# node_else // LAMP_TYPE == SPOT || LAMP_TYPE == POINT
    ldir = u_light_directions[LAMP_IND];
# node_endif // LAMP_TYPE == SPOT || LAMP_TYPE == POINT
#endnode

#node DIFFUSE_FRESNEL
    #node_in vec3 ldir
    #node_in vec2 lfac
    #node_in vec3 normal
    #node_in float norm_fac
    #node_in vec2 dif_params
    #node_out float lfactor

    lfactor = ZERO_VALUE_NODES;
    if (lfac.r != ZERO_VALUE_NODES) {
        float dot_nl = (UNITY_VALUE_NODES - norm_fac) * dot(normal, ldir) + norm_fac;

        if (dif_params[0] == ZERO_VALUE_NODES) {
            lfactor = UNITY_VALUE_NODES;
        } else {
            float t = UNITY_VALUE_NODES + abs(dot_nl);
            t = dif_params[1] + (UNITY_VALUE_NODES - dif_params[1]) * pow(t, dif_params[0]);
            lfactor = clamp(t, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
        }
        lfactor = max(lfactor, ZERO_VALUE_NODES);
    }
#endnode

#node DIFFUSE_LAMBERT
    #node_in vec3 ldir
    #node_in vec2 lfac
    #node_in vec3 normal
    #node_in float norm_fac
    #node_out float lfactor

    lfactor = ZERO_VALUE_NODES;
    if (lfac.r != ZERO_VALUE_NODES) {
        float dot_nl = (UNITY_VALUE_NODES - norm_fac) * dot(normal, ldir) + norm_fac;

        lfactor = max(dot_nl, ZERO_VALUE_NODES);
    }
#endnode

#node DIFFUSE_OREN_NAYAR
    #node_in vec3 ldir
    #node_in vec2 lfac
    #node_in vec3 normal
    #node_in float norm_fac
    #node_in vec2 dif_params
    #node_out float lfactor

    lfactor = ZERO_VALUE_NODES;
    if (lfac.r != ZERO_VALUE_NODES) {
        float dot_nl = (UNITY_VALUE_NODES - norm_fac) * dot(normal, ldir) + norm_fac;

        if (dif_params[0] > ZERO_VALUE_NODES) {
            float nv = max(dot(normal, nin_eye_dir), ZERO_VALUE_NODES);
            float sigma_sq = dif_params[0] * dif_params[0];
            float A = UNITY_VALUE_NODES - HALF_VALUE_NODES * (sigma_sq / (sigma_sq + 0.33));

            vec3 l_diff = ldir - dot_nl*normal;
            vec3 e_diff = nin_eye_dir - nv*normal;
            // handle normalize() and acos() values which may result to
            // "undefined behavior"
            // (noticeable for "mediump" precision, nin_eye_dir.g some mobile devies)
            if (length(l_diff) == ZERO_VALUE_NODES || length(e_diff) == ZERO_VALUE_NODES ||
                    abs(dot_nl) > UNITY_VALUE_NODES || abs(nv) > UNITY_VALUE_NODES)
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

                float t = max(dot(Lit_B, View_B), ZERO_VALUE_NODES);
                float B = 0.45 * (sigma_sq / (sigma_sq +  0.09));
                lfactor = dot_nl * (A + (B * t * sin(a) * tan(b)));
            }
        } else
            lfactor = dot_nl;
        lfactor = max(lfactor, ZERO_VALUE_NODES);
    }
#endnode

#node DIFFUSE_MINNAERT
    #node_in vec3 ldir
    #node_in vec2 lfac
    #node_in vec3 normal
    #node_in float norm_fac
    #node_in vec2 dif_params
    #node_out float lfactor

    lfactor = ZERO_VALUE_NODES;
    if (lfac.r != ZERO_VALUE_NODES) {
        float dot_nl = (UNITY_VALUE_NODES - norm_fac) * dot(normal, ldir) + norm_fac;
        float nv = max(dot(normal, nin_eye_dir), ZERO_VALUE_NODES);

        if (dif_params[0] <= UNITY_VALUE_NODES)
            lfactor = dot_nl * pow(max(nv * dot_nl, 0.1), dif_params[0] - UNITY_VALUE_NODES);
        else
            lfactor = dot_nl * pow(1.0001 - nv, dif_params[0] - UNITY_VALUE_NODES);
        lfactor = max(lfactor, ZERO_VALUE_NODES);
    }
#endnode

#node DIFFUSE_TOON
    #node_in vec3 ldir
    #node_in vec2 lfac
    #node_in vec3 normal
    #node_in float norm_fac
    #node_in vec2 dif_params
    #node_out float lfactor

    lfactor = ZERO_VALUE_NODES;
    if (lfac.r != ZERO_VALUE_NODES) {
        float dot_nl = (UNITY_VALUE_NODES - norm_fac) * dot(normal, ldir) + norm_fac;
        float ang = acos(dot_nl);

        if (ang < dif_params[0])
            lfactor = UNITY_VALUE_NODES;
        else if (ang > (dif_params[0] + dif_params[1]) || dif_params[1] == ZERO_VALUE_NODES)
                lfactor = ZERO_VALUE_NODES;
            else
                lfactor = UNITY_VALUE_NODES - ((ang - dif_params[0])/dif_params[1]);
        lfactor = max(lfactor, ZERO_VALUE_NODES);
    }
#endnode

#node SPECULAR_PHONG
    #node_in vec3 ldir
    #node_in vec2 lfac
    #node_in vec3 normal
    #node_in float norm_fac
    #node_in vec2 sp_params
    #node_out float sfactor

    sfactor = ZERO_VALUE_NODES;
    if (lfac.g == UNITY_VALUE_NODES) {
        vec3 halfway = normalize(ldir + nin_eye_dir);
        sfactor = (UNITY_VALUE_NODES - norm_fac) * max(dot(normal, halfway),
                         ZERO_VALUE_NODES) + norm_fac;
        sfactor = pow(sfactor, sp_params[0]);
    }
#endnode

#node SPECULAR_WARDISO
    #node_in vec3 ldir
    #node_in vec2 lfac
    #node_in vec3 normal
    #node_in vec2 sp_params
    #node_out float sfactor

    sfactor = ZERO_VALUE_NODES;
    if (lfac.g == UNITY_VALUE_NODES) {
        vec3 halfway = normalize(ldir + nin_eye_dir);
        float nh = max(dot(normal, halfway), 0.001);
        // NOTE: 0.01 for mobile devices
        float nv = max(dot(normal, nin_eye_dir), 0.01);
        float nl = max(dot(normal, ldir), 0.01);
        float angle = tan(acos(nh));
        float alpha = max(sp_params[0], 0.001);

        sfactor = nl * (UNITY_VALUE_NODES/(4.0*M_PI*alpha*alpha))
                  * (exp(-(angle * angle) / (alpha * alpha)) /(sqrt(nv * nl)));
    }
#endnode

#node SPECULAR_TOON
    #node_in vec3 ldir
    #node_in vec2 lfac
    #node_in vec3 normal
    #node_in vec2 sp_params
    #node_out float sfactor

    sfactor = ZERO_VALUE_NODES;
    if (lfac.g == UNITY_VALUE_NODES) {
        vec3 h = normalize(ldir + nin_eye_dir);
        float angle = acos(dot(h, normal));

        if (angle < sp_params[0])
            sfactor = UNITY_VALUE_NODES;
        else if (angle >= sp_params[0] + sp_params[1] || sp_params[1] == ZERO_VALUE_NODES)
            sfactor = ZERO_VALUE_NODES;
        else
            sfactor = UNITY_VALUE_NODES - (angle - sp_params[0]) / sp_params[1];
    }
#endnode

#node SPECULAR_BLINN
    #node_in vec3 ldir
    #node_in vec2 lfac
    #node_in vec3 normal
    #node_in float norm_fac
    #node_in vec2 sp_params
    #node_out float sfactor

    sfactor = ZERO_VALUE_NODES;
    if (lfac.g == UNITY_VALUE_NODES) {
        if (sp_params[0] < UNITY_VALUE_NODES || sp_params[1] == ZERO_VALUE_NODES)
            sfactor = ZERO_VALUE_NODES;
        else {
            if (sp_params[1] < 100.0)
                sp_params[1]= sqrt(UNITY_VALUE_NODES / sp_params[1]);
            else
                sp_params[1]= 10.0 / sp_params[1];

            vec3 halfway = normalize(nin_eye_dir + ldir);
            float nh = (UNITY_VALUE_NODES - norm_fac) * max(dot(normal, halfway),
                         ZERO_VALUE_NODES) + norm_fac;
            if (nh < ZERO_VALUE_NODES)
                sfactor = ZERO_VALUE_NODES;
            else {
                float nv = max(dot(normal, nin_eye_dir), 0.01);
                float nl = dot(normal, ldir);
                if (nl <= 0.01)
                    sfactor = ZERO_VALUE_NODES;
                else {
                    float vh = max(dot(nin_eye_dir, halfway), 0.01);

                    float a = UNITY_VALUE_NODES;
                    float b = (2.0 * nh * nv) / vh;
                    float c = (2.0 * nh * nl) / vh;

                    float g = min(min(a, b), c);

                    float p = sqrt(pow(sp_params[0], 2.0) + pow(vh, 2.0) - UNITY_VALUE_NODES);
                    float f = pow(p - vh, 2.0) / pow(p + vh, 2.0) * (UNITY_VALUE_NODES 
                            + pow(vh * (p + vh) - UNITY_VALUE_NODES, 2.0)/pow(vh * (p - vh) 
                            + UNITY_VALUE_NODES, 2.0));
                    float ang = acos(nh);
                    sfactor = max(f * g * exp(-pow(ang, 2.0) / (2.0 * pow(sp_params[1], 2.0))), 
                            ZERO_VALUE_NODES);
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
    if (dot(ldir, normal) * dot(nin_eye_dir, normal) < ZERO_VALUE_NODES) {
        float backside_factor = translucency_params.x;
        float spot_hardness = translucency_params.y;
        float spot_intensity = translucency_params.z;
        float spot_diff_factor = translucency_params.w;

        // NOTE: abs(): used for permanent translucency
        // when staring at the light source, independently from face normal
        float ln = clamp(abs(dot(ldir, normal)), ZERO_VALUE_NODES, UNITY_VALUE_NODES);
        float el = clamp(dot(nin_eye_dir, -ldir), ZERO_VALUE_NODES, UNITY_VALUE_NODES);
        float transmit_coeff = pow(el, spot_hardness);

        // translucency light diffusion
        color_out = color_in + translucency_color * vec4(lcolorint * ln
                * pow(D, vec3(backside_factor)), UNITY_VALUE_NODES);

        // translucency light transmission
        color_out += spot_intensity * mix(vec4(D, UNITY_VALUE_NODES), vec4(UNITY_VALUE_NODES),
                spot_diff_factor) * translucency_color
                * vec4(lcolorint * ln * vec3(transmit_coeff), UNITY_VALUE_NODES);
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

    value = UNITY_VALUE_NODES / (UNITY_VALUE_NODES + pow(2.71828183, -(value_in-center)*width));
#endnode

#node GAMMA
    #node_in vec3 color_in
    #node_in float gamma
    #node_out vec3 color_out

    color_out = color_in;
    if (color_out.x > ZERO_VALUE_NODES)
        color_out.x = pow(color_in.x, gamma);
    if (color_out.y > ZERO_VALUE_NODES)
        color_out.y = pow(color_in.y, gamma);
    if (color_out.z > ZERO_VALUE_NODES)
        color_out.z = pow(color_in.z, gamma);
#endnode

#node B4W_SRGB_TO_LINEAR
    #node_in vec3 color_in
    #node_out vec3 color_out

    color_out = max(vec3(ZERO_VALUE_NODES), color_in);
    color_out = pow(color_out, vec3(2.2));
#endnode

#node B4W_LINEAR_TO_SRGB
    #node_in vec3 color_in
    #node_out vec3 color_out

    color_out = max(vec3(ZERO_VALUE_NODES), color_in);
    color_out = pow(color_out, vec3(UNITY_VALUE_NODES/2.2));
#endnode

#node TEXTURE_EMPTY
    #node_out vec3 color
    #node_out vec3 normal
    #node_out float value

#node_if USE_OUT_value
    color[2] = color[1] = color[0] = ZERO_VALUE_NODES;
#node_endif

#node_if USE_OUT_value
    normal[2] = normal[1] = normal[0] = ZERO_VALUE_NODES;
#node_endif

#node_if USE_OUT_value
    value = ZERO_VALUE_NODES;
#node_endif
#endnode

#node TEXTURE_ENVIRONMENT
    #node_in vec3 coords
    #node_out optional vec3 color
    #node_out optional float value
    #node_param uniform samplerCube texture

    vec4 texval = textureCube(texture, coords);

# node_if USE_OUT_color
    color = texval.xyz;
    srgb_to_lin(color);
# node_endif

# node_if USE_OUT_value
    value = texval.w;
# node_endif
#endnode

#node TEXTURE_COLOR
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

    vec4 texval = texture2D(texture, vec_to_uv(uv));
# node_if USE_OUT_color
    color = texval.xyz;
    srgb_to_lin(color);
# node_endif
# node_if USE_OUT_value
    value = texval.w;
# node_endif

# node_if USE_uv2
    texval = texture2D(texture, vec_to_uv(uv2));
#  node_if USE_OUT_color2
    color2 = texval.xyz;
    srgb_to_lin(color2);
#  node_endif
#  node_if USE_OUT_value2
    value2 = texval.w;
#  node_endif
# node_endif

# node_if USE_uv3
    texval = texture2D(texture, vec_to_uv(uv3));
# node_if USE_OUT_color3
    color3 = texval.xyz;
    srgb_to_lin(color3);
#  node_endif
#  node_if USE_OUT_value3
    value3 = texval.w;
#  node_endif
# node_endif

# node_if USE_uv4
    texval = texture2D(texture, vec_to_uv(uv4));
# node_if USE_OUT_color4
    color4 = texval.xyz;
    srgb_to_lin(color4);
#  node_endif
#  node_if USE_OUT_value4
    value4 = texval.w;
#  node_endif
# node_endif
#endnode

#node TEXTURE_NORMAL
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

    vec4 texval = texture2D(texture, vec_to_uv(uv));
# node_if USE_OUT_normal
    normal = normalize(nin_tbn_matrix * (texval.xyz - HALF_VALUE_NODES));
# node_endif
# node_if USE_OUT_value
    value = texval.w;
# node_endif

# node_if USE_uv2
    texval = texture2D(texture, vec_to_uv(uv2));
#  node_if USE_OUT_normal2
    normal2 = normalize(nin_tbn_matrix * (texval.xyz - HALF_VALUE_NODES));
#  node_endif
#  node_if USE_OUT_value2
    value2 = texval.w;
#  node_endif
# node_endif

# node_if USE_uv3
    texval = texture2D(texture, vec_to_uv(uv3));
#  node_if USE_OUT_normal3
    normal3 = normalize(nin_tbn_matrix * (texval.xyz - HALF_VALUE_NODES));
#  node_endif
#  node_if USE_OUT_value3
    value3 = texval.w;
#  node_endif
# node_endif

# node_if USE_uv4
    texval = texture2D(texture, vec_to_uv(uv4));
#  node_if USE_OUT_normal4
    normal4 = normalize(nin_tbn_matrix * (texval.xyz - HALF_VALUE_NODES));
#  node_endif
#  node_if USE_OUT_value4
    value4 = texval.w;
#  node_endif
# node_endif
#endnode

#node VALUE
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

    vec = vec3(ZERO_VALUE_NODES);
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

    vec_out = reflect(-vec_in1, vec_in2);
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

        float multiplier = clamp(HALF_VALUE_NODES * (lod_dist - view_dist),
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
#endnode

#node B4W_CLAMP
    #node_in vec3 vector_in
    #node_out vec3 vector_out

    vector_out = clamp(vector_in, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
#endnode

#node B4W_REFRACTION
    #node_in vec3 normal_in
    #node_in float refr_bump
    #node_out vec3 color_out

    color_out = normal_in;
    refr_bump;
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
        in mat4 nin_view_matrix,
        in mat4 nin_zup_view_matrix,
        in mat4 nin_zup_view_matrix_inverse,
        in mat4 nin_zup_model_matrix,
        in mat4 nin_zup_model_matrix_inverse,
        out vec3 nout_color,
        out vec3 nout_specular_color,
        out vec3 nout_normal,
        out vec4 nout_shadow_factor,
        out float nout_alpha) {

    // NOTE: set up out variables to prevent IE 11 linking crash
    nout_color = vec3(ZERO_VALUE_NODES);
    nout_specular_color = vec3(ZERO_VALUE_NODES);
    nout_normal = vec3(ZERO_VALUE_NODES);
    nout_shadow_factor = vec4(ZERO_VALUE_NODES);
    nout_alpha = ZERO_VALUE_NODES;

#if USE_NODE_MATERIAL_BEGIN  || USE_NODE_GEOMETRY_NO \
        || CAUSTICS || CALC_TBN_SPACE || USE_NODE_TEX_COORD_NO

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
    vec3 binormal = cross(sided_normal, v_tangent.xyz) * v_tangent.w;
    mat3 tbn_matrix = mat3(v_tangent.xyz, binormal, sided_normal);
    mat3 nin_tbn_matrix = tbn_matrix;
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
