#var PARALLAX_STEPS 0.0
#var WATER_LEVEL 0.0
#var WAVES_HEIGHT 0.0

/*============================================================================
                                  INCLUDES
============================================================================*/
#include <std_enums.glsl>

#include <precision_statement.glslf>
#include <pack.glslf>
#include <fog.glslf>
#include <lighting.glslf>

#if CAUSTICS
#include <procedural.glslf>
#include <caustics.glslf>
#endif

#include <gamma.glslf>
#include <math.glslv>

/*============================================================================
                               GLOBAL UNIFORMS
============================================================================*/

#define TEXCOORD (TEXTURE_COLOR && TEXTURE_COORDS == TEXTURE_COORDS_UV || TEXTURE_STENCIL_ALPHA_MASK || TEXTURE_SPEC || TEXTURE_NORM)

uniform float u_time;
uniform vec3  u_horizon_color;
uniform vec3  u_zenith_color;
uniform float u_environment_energy;

uniform float u_shadow_visibility_falloff;

uniform vec3 u_light_positions[NUM_LIGHTS];
uniform vec3 u_light_directions[NUM_LIGHTS];
uniform vec3 u_light_color_intensities[NUM_LIGHTS];
uniform vec4 u_light_factors1[NUM_LIGHTS];
uniform vec4 u_light_factors2[NUM_LIGHTS];

#if WATER_EFFECTS && CAUSTICS
uniform vec4 u_sun_quaternion;
#endif

#if TEXTURE_COORDS == TEXTURE_COORDS_NORMAL
uniform mat4 u_view_matrix_frag;
#endif

#if !DISABLE_FOG 
uniform vec4 u_fog_color_density;
# if WATER_EFFECTS
uniform vec4 u_underwater_fog_color_density;
uniform float u_cam_water_depth;
# endif
#endif

#if WATER_EFFECTS || !DISABLE_FOG
uniform vec3 u_sun_intensity;
#endif

#if WATER_EFFECTS && CAUSTICS// || PARALLAX
uniform vec3 u_sun_direction;
#endif

#if !DISABLE_FOG && PROCEDURAL_FOG
uniform mat4 u_cube_fog;
#endif

/*============================================================================
                               SAMPLER UNIFORMS
============================================================================*/

#if TEXTURE_COLOR
    uniform sampler2D u_colormap0;
#endif

#if TEXTURE_SPEC && !ALPHA_AS_SPEC
    uniform sampler2D u_specmap;
#endif

#if TEXTURE_NORM
    uniform sampler2D u_normalmap0;
#endif

#if TEXTURE_STENCIL_ALPHA_MASK
uniform sampler2D u_colormap1;
uniform sampler2D u_stencil0;
#endif

#if REFLECTIVE
uniform sampler2D u_reflectmap;
#elif TEXTURE_MIRROR
uniform samplerCube u_mirrormap;
#endif

#if SHADOW_SRC == SHADOW_SRC_MASK
uniform sampler2D u_shadow_mask;
#elif SHADOW_SRC != SHADOW_SRC_NONE
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

/*============================================================================
                               MATERIAL UNIFORMS
============================================================================*/

uniform vec4  u_diffuse_color;
uniform vec2  u_diffuse_params;
uniform float u_diffuse_intensity;
uniform float u_emit;
uniform float u_ambient; 

uniform float u_normal_factor;
uniform vec2  u_normalmap0_uv_velocity;
uniform vec4  u_fresnel_params;

#if TEXTURE_COLOR
uniform float u_diffuse_color_factor;
uniform vec2  u_colormap0_uv_velocity;
#endif

#if TEXTURE_SPEC
uniform float u_specular_color_factor;
#endif

uniform vec3  u_specular_color;
uniform vec2  u_specular_params;

#if TEXTURE_NORM && PARALLAX
uniform float u_parallax_scale;
#endif

#if REFLECTIVE
uniform float u_reflect_factor;
#elif TEXTURE_MIRROR
uniform float u_mirror_factor;
#endif

/*============================================================================
                                   VARYINGS
============================================================================*/

varying vec3 v_eye_dir;
varying vec3 v_pos_world;
varying vec3 v_normal;
varying vec4 v_pos_view;

#if TEXTURE_NORM
varying vec4 v_tangent;
#endif

#if TEXCOORD
varying vec2 v_texcoord;
#endif

#if VERTEX_COLOR || DYNAMIC_GRASS
varying vec3 v_color;
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

#if REFLECTIVE || SHADOW_SRC == SHADOW_SRC_MASK
varying vec3 v_tex_pos_clip;
#endif

/*============================================================================
                                  FUNCTIONS
============================================================================*/

#include <shadow.glslf>
#include <mirror.glslf>

/*============================================================================
                                    MAIN
============================================================================*/

void main(void) {

#if WATER_EFFECTS
    float plane_dist = v_pos_world.y - WATER_LEVEL;
#endif

#if TEXCOORD
    vec2 texcoord = v_texcoord;
#endif

    vec3 sided_normal = v_normal;
#if DOUBLE_SIDED_LIGHTING
    if (!gl_FrontFacing)
        sided_normal = -sided_normal;
#endif

#if TEXTURE_NORM
    vec3 binormal = cross(sided_normal, v_tangent.xyz) * v_tangent.w;
    mat3 tbn_matrix = mat3(v_tangent.xyz, binormal, sided_normal);
#endif

#if TEXTURE_NORM && PARALLAX
    // parallax relief mapping
    // http://steps3d.narod.ru/tutorials/parallax-mapping-tutorial.html

    // transform eye to tangent space
    vec3 eye = normalize(v_eye_dir * tbn_matrix);

    // distance between checked layers
    float pstep = 1.0 / PARALLAX_STEPS;

    // adjustment for one layer height of the layer
    vec2 dtex = eye.xy * u_parallax_scale / (PARALLAX_STEPS * eye.z);

    float height = 1.0;
    float h = texture2D(u_normalmap0, texcoord).a; // get height

    for (float i = 1.0; i <= PARALLAX_STEPS; i++)
    {
        if (h < height) {
            height   -= pstep;
            texcoord -= dtex;
            h         = texture2D(u_normalmap0, texcoord).a;
        }
    }

    // find point via linear interpolation
    vec2 prev = texcoord + dtex;
    float h_prev = texture2D(u_normalmap0, prev).a - (height + pstep);
    float h_current = h - height;
    float weight = h_current / (h_current - h_prev);

    // interpolate to get tex coords
    texcoord = weight * prev + (1.0 - weight) * texcoord;
    // experiments with silhouette clipping
    //if (texcoord.x > 1.0 || texcoord.x < 0.0 || texcoord.y > 1.0 ||
    //    texcoord.y < 0.0) discard;

#endif

#if TEXTURE_NORM
    vec4 normalmap = texture2D(u_normalmap0, texcoord + 
        u_time * u_normalmap0_uv_velocity);

    vec3 n = normalmap.rgb - 0.5;
    n = mix(vec3(0.0, 0.0, 1.0), n, u_normal_factor);

    // equivalent to n.x * v_tangent + n.y * v_binormal + n.z * sided_normal
    vec3 normal = tbn_matrix * n; 

//# if PARALLAX
//    //parallax selfshadowing experiments
//
//    float NdotL = dot(normal, u_sun_direction);
//    float selfShadow = 0.0;
//
//    if (NdotL > 0.0) {
//        vec2 offsetCoord = texcoord;
//        vec3 tsL = u_sun_direction;
//        // Trace a shadow ray along the light vector.
//        //const int numShadowSteps = mix(60,5,tsL.z);
//        const float numShadowSteps = 20.0;
//        pstep = 1.0 / numShadowSteps;
//        dtex = vec2(tsL.x, -tsL.y) * u_parallax_scale / (numShadowSteps * tsL.z);
//
//        // We start one iteration out to avoid shadow acne 
//        // (could start bumped a little without going
//        // a whole iteration).
//        height = normalmap.a + pstep * 0.1;
//
//        //while ((normalmap.a < height) && (height < 1.0)) {
//        for (float i = 1.0; i <= numShadowSteps; i++) {
//            if (height < 1.0 && normalmap.a < height) {
//                height += pstep;
//                offsetCoord += dtex;
//                normalmap = texture2D(u_normalmap0, offsetCoord);
//            }
//        }
//
//        // We are in shadow if we left the loop because
//        // we hit a point
//        selfShadow = normalmap.a > height ? 1.0: 0.0;
//
//        // Shadows will make the whole scene darker, so up the light contribution
//        //lightColor = lightColor * 1.2;
//    }
//# endif
#else
    vec3 normal = sided_normal;
#endif

    normal = normalize(normal);

    vec3 eye_dir = normalize(v_eye_dir);

    // ambient
    float sky_factor = 0.5 * normal.y + 0.5; // dot of vertical vector and normal
    vec3 environment_color = u_environment_energy * mix(u_horizon_color, u_zenith_color, sky_factor);
    vec3 A = u_ambient * environment_color;

    // material diffuse params (Lambert)
#if VERTEX_COLOR || DYNAMIC_GRASS
    vec3 vert_rgb = v_color;
    srgb_to_lin(vert_rgb);
#endif

#if VERTEX_COLOR || DYNAMIC_GRASS
    vec4 diffuse_color = vec4(vert_rgb, 1.0);
#else
    vec4 diffuse_color = u_diffuse_color;
#endif

#if TEXTURE_COLOR

# if TEXTURE_COORDS == TEXTURE_COORDS_NORMAL
    vec2 texcoord_norm = normalize(u_view_matrix_frag * vec4(normal, 0.0)).st;
    texcoord_norm = texcoord_norm * vec2(0.495) + vec2(0.5);
# endif

# if TEXTURE_STENCIL_ALPHA_MASK
    vec4 texture_color0 = texture2D(u_colormap0, texcoord);
    srgb_to_lin(texture_color0.rgb);

    vec4 texture_color1;
#  if TEXTURE_COORDS == TEXTURE_COORDS_NORMAL
    texture_color1 = texture2D(u_colormap1, texcoord_norm);
#  elif TEXTURE_COORDS == TEXTURE_COORDS_UV
    texture_color1 = texture2D(u_colormap1, texcoord);
#  endif
    srgb_to_lin(texture_color1.rgb);

    vec4 texture_stencil0 = texture2D(u_stencil0, texcoord);
    vec4 texture_color = mix(texture_color0, texture_color1, texture_stencil0.r);

# else  // TEXTURE_STENCIL_ALPHA_MASK
#  if TEXTURE_COORDS == TEXTURE_COORDS_NORMAL
    vec4 texture_color = texture2D(u_colormap0, texcoord_norm);
#  elif TEXTURE_COORDS == TEXTURE_COORDS_UV
    vec4 texture_color = texture2D(u_colormap0, texcoord + u_time * u_colormap0_uv_velocity);
#  endif
    srgb_to_lin(texture_color.rgb);
# endif  // TEXTURE_STENCIL_ALPHA_MASK

# if TEXTURE_BLEND_TYPE == TEXTURE_BLEND_TYPE_MIX
    diffuse_color.rgb = mix(diffuse_color.rgb, texture_color.rgb, u_diffuse_color_factor);
    diffuse_color.a = texture_color.a;
# elif TEXTURE_BLEND_TYPE == TEXTURE_BLEND_TYPE_MULTIPLY
    diffuse_color.rgb *= mix(vec3(1.0), texture_color.rgb, u_diffuse_color_factor);
    diffuse_color.a = texture_color.a;
# endif
#endif  // TEXTURE_COLOR
    vec3 D = u_diffuse_intensity * diffuse_color.rgb;
    float shadow_factor = calc_shadow_factor(u_shadow_visibility_falloff, D);
//# if PARALLAX
//    shadow_factor -= selfShadow;
//# endif

    // emission
    vec3 E = u_emit * diffuse_color.rgb;

    // material specular params (Phong)
    vec3 specular_color = u_specular_color;
#if TEXTURE_SPEC
# if ALPHA_AS_SPEC
    vec3 stexture_color = vec3(diffuse_color.a);
# else
    vec3 stexture_color = texture2D(u_specmap, texcoord).rgb;
# endif
    srgb_to_lin(stexture_color.rgb);

    specular_color = mix(specular_color, stexture_color, u_specular_color_factor);
#endif
    float specint = u_specular_params[0];
    float spec_param = u_specular_params[1];
    vec3 S = specint * specular_color;

    lighting_result lresult = lighting(E, A, D, S, v_pos_world, normal, eye_dir,
        spec_param, u_diffuse_params, shadow_factor, u_light_positions,
        u_light_directions, u_light_color_intensities, u_light_factors1,
        u_light_factors2, 0.0, vec4(0.0));
    vec3 color = lresult.color.rgb;

#if REFLECTIVE || TEXTURE_MIRROR
# if TEXTURE_NORM
    apply_mirror(color, eye_dir, normal, u_fresnel_params[2],
        u_fresnel_params[3], specular_color, n.st);
# else
    apply_mirror(color, eye_dir, normal, u_fresnel_params[2],
        u_fresnel_params[3], specular_color, vec2(0.0));
# endif
#endif

    color += lresult.specular;
    float sum_sfactor = lresult.color.a;

#if WATER_EFFECTS
# if WETTABLE
    //darken slightly to simulate wet surface
    color = max(color - sqrt(0.01 * -min(plane_dist, 0.0)), 0.5 * color);
# endif
# if CAUSTICS
    vec4 q = u_sun_quaternion;
    vec3 v = v_pos_world;
    v.xz = 10.0 * sin(0.1 * v.xz);
    // rotate world coordinates to match sun directions
    vec3 rotated_world = v + 2.0 *
                    cross(-q.xyz, cross(-q.xyz, v) + q.w * v);
    vec2 caust_coord = rotated_world.xz;
#  if TEXTURE_NORM
    mat3 tbn_transpose = mat3_transpose(tbn_matrix);
    vec3 norm_tang = tbn_transpose * normal;
    caust_coord += norm_tang.st;
#  endif
    apply_caustics(color, caust_coord.st, plane_dist, u_time,
                   shadow_factor, normal,
                   u_sun_direction,
                   u_sun_intensity, v_pos_world);
# endif  // CAUSTICS
#endif  //WATER_EFFECTS

#if ALPHA
# if ALPHA_CLIP
    float alpha = diffuse_color.a;
    if (alpha < 0.5)
        discard;
    alpha = 1.0; // prevent blending with html content
# else
    // make pixels with high specular more opaque; note: only the first channel of S is used
    float alpha = diffuse_color.a + sum_sfactor * S.r;
# endif
#else
    float alpha = 1.0;
#endif

#if !DISABLE_FOG
# if PROCEDURAL_FOG
    vec3 cube_fog  = procedural_fog_color(u_cube_fog, eye_dir);
    vec4 fog_color = vec4(cube_fog, u_fog_color_density.a);
    srgb_to_lin(fog_color.rgb);
# else  // PROCEDURAL_FOG
    vec4 fog_color = u_fog_color_density;
    fog_color.rgb *= u_sun_intensity;
# endif  // PROCEDURAL_FOG
# if WATER_EFFECTS
    fog_underwater(color, length(v_pos_view), eye_dir.y, u_cam_water_depth,
        u_underwater_fog_color_density, fog_color, plane_dist,
        length(u_sun_intensity) + u_environment_energy);
# else
    fog(color, length(v_pos_view), fog_color);
# endif  // WATER_EFFECTS
#endif  // !DISABLE_FOG

#if SSAO_ONLY && SHADOW_SRC == SHADOW_SRC_MASK
    color = vec3(shadow_ssao.a);
#endif

    lin_to_srgb(color);
#if ALPHA && !ALPHA_CLIP 
    premultiply_alpha(color, alpha);
#endif
    gl_FragColor = vec4(color, alpha);
}
