#var WATER_LEVEL 0.0
#var WAVES_HEIGHT 0.0
#var NUM_LAMP_LIGHTS 0
#var NUM_VALUES 0
#var NUM_RGBS 0

#var PARALLAX_STEPS 0.0
#var PARALLAX_LOD_DIST 0.0
#var WATER_LEVEL 0.0
#var WAVES_HEIGHT 0.0

// lamp dirs
#var NUM_LIGHTS 0
#var LAMP_IND 0
#var LAMP_SPOT_SIZE 0
#var LAMP_SPOT_BLEND 0
#var LAMP_LIGHT_DIST 0
#var LAMP_LIGHT_FACT_IND 0
#var LAMP_FAC_CHANNELS rgb
#var LAMP_SHADOW_MAP_IND 0
#var NUM_LFACTORS 0
/*============================================================================
                                  INCLUDES
============================================================================*/
#include <std_enums.glsl>

#include <precision_statement.glslf>
#include <pack.glslf>

#if !SHADELESS
#include <procedural.glslf>
# if CAUSTICS
#include <caustics.glslf>
# endif
#endif

#include <color_util.glslf>
#include <math.glslv>

/*============================================================================
                               GLOBAL UNIFORMS
============================================================================*/

uniform float u_time;

#if USE_ENVIRONMENT_LIGHT && SKY_TEXTURE
uniform samplerCube u_sky_texture;
#elif USE_ENVIRONMENT_LIGHT && SKY_COLOR
uniform vec3 u_horizon_color;
uniform vec3 u_zenith_color;
#endif

uniform float u_environment_energy;

#if !SHADELESS

# if NUM_LIGHTS > 0
uniform vec3 u_light_positions[NUM_LIGHTS];
uniform vec3 u_light_directions[NUM_LIGHTS];
uniform vec3 u_light_color_intensities[NUM_LIGHTS];
uniform vec4 u_light_factors[NUM_LFACTORS];
# endif

# if WATER_EFFECTS && CAUSTICS
uniform vec4 u_sun_quaternion;
# endif
#endif


#if NORMAL_TEXCOORD || REFLECTION_TYPE == REFL_PLANE || REFRACTIVE
uniform mat3 u_view_tsr_frag;
#endif

#if !DISABLE_FOG
uniform vec4 u_fog_color_density;
# if WATER_EFFECTS
uniform vec4 u_underwater_fog_color_density;
uniform float u_cam_water_depth;
# endif
# if PROCEDURAL_FOG
uniform mat4 u_cube_fog;
# endif
# if USE_FOG
uniform vec4 u_fog_params; // intensity, depth, start, height
# endif
#endif


#if WATER_EFFECTS || !DISABLE_FOG
uniform vec3 u_sun_intensity;
#endif

#if WATER_EFFECTS && CAUSTICS
uniform vec3 u_sun_direction;
#endif

/*============================================================================
                               SAMPLER UNIFORMS
============================================================================*/

#if TEXTURE_COLOR0_CO
uniform sampler2D u_colormap0;
#endif

#if TEXTURE_SPEC && !ALPHA_AS_SPEC
uniform sampler2D u_specmap0;
#endif

#if TEXTURE_NORM_CO
uniform sampler2D u_normalmap0;
#endif

#if TEXTURE_STENCIL_ALPHA_MASK
uniform sampler2D u_colormap1;
uniform sampler2D u_stencil0;
#endif

#if REFLECTION_TYPE == REFL_PLANE
uniform sampler2D u_plane_reflection;
#elif REFLECTION_TYPE == REFL_CUBE
uniform samplerCube u_cube_reflection;
#elif REFLECTION_TYPE == REFL_MIRRORMAP
uniform samplerCube u_mirrormap;
#endif

#if SHADOW_USAGE == SHADOW_MAPPING_OPAQUE
uniform sampler2D u_shadow_mask;
#elif SHADOW_USAGE == SHADOW_MAPPING_BLEND
uniform vec4 u_pcf_blur_radii;
uniform vec4 u_csm_center_dists;
uniform PRECISION sampler2D u_shadow_map0;
# if CSM_SECTION1 || NUM_CAST_LAMPS > 1
uniform PRECISION sampler2D u_shadow_map1;
# endif
# if CSM_SECTION2 || NUM_CAST_LAMPS > 2
uniform PRECISION sampler2D u_shadow_map2;
# endif
# if CSM_SECTION3 || NUM_CAST_LAMPS > 3
uniform PRECISION sampler2D u_shadow_map3;
# endif
#endif

#if REFRACTIVE
uniform sampler2D u_refractmap;
#endif

#if REFRACTIVE && USE_REFRACTION_CORRECTION
uniform PRECISION sampler2D u_scene_depth;
#endif

/*============================================================================
                               MATERIAL UNIFORMS
============================================================================*/

uniform float u_emit;
uniform float u_ambient;
uniform vec4  u_fresnel_params;
uniform float u_specular_alpha;

#if REFLECTION_TYPE == REFL_PLANE || REFLECTION_TYPE == REFL_CUBE
uniform float u_reflect_factor;
#elif REFLECTION_TYPE == REFL_MIRRORMAP
uniform float u_mirror_factor;
#endif

#if REFLECTION_TYPE == REFL_PLANE
uniform vec4 u_refl_plane;
#endif

uniform vec4  u_diffuse_color;
uniform vec2  u_diffuse_params;
uniform float u_diffuse_intensity;

#if TEXTURE_NORM_CO
uniform float u_normal_factor;
#endif

#if TEXTURE_COLOR0_CO
uniform float u_diffuse_color_factor;
uniform float u_alpha_factor;
#endif

#if TEXTURE_SPEC
uniform float u_specular_color_factor;
#endif

uniform vec3  u_specular_color;
uniform vec3  u_specular_params;

#if TEXTURE_NORM_CO && PARALLAX
uniform float u_parallax_scale;
#endif

#if REFRACTIVE
uniform float u_refr_bump;
#endif

/*============================================================================
                                   VARYINGS
============================================================================*/

varying vec3 v_pos_world;

varying vec3 v_normal;

#if NODES || !DISABLE_FOG || (TEXTURE_NORM_CO && PARALLAX) || (WATER_EFFECTS && CAUSTICS) || SHADOW_USAGE == SHADOW_MASK_GENERATION || SHADOW_USAGE == SHADOW_MAPPING_BLEND
varying vec4 v_pos_view;
#endif

#if TEXTURE_NORM_CO || CALC_TBN_SPACE
varying vec4 v_tangent;
#endif

varying vec3 v_eye_dir;
#if TEXCOORD
varying vec2 v_texcoord;
#endif

#if VERTEX_COLOR || DYNAMIC_GRASS
varying vec3 v_color;
#endif

#if SHADOW_USAGE == SHADOW_MAPPING_BLEND
varying vec4 v_shadow_coord0;
# if CSM_SECTION1 || NUM_CAST_LAMPS > 1
varying vec4 v_shadow_coord1;
# endif
# if CSM_SECTION2 || NUM_CAST_LAMPS > 2
varying vec4 v_shadow_coord2;
# endif
# if CSM_SECTION3 || NUM_CAST_LAMPS > 3
varying vec4 v_shadow_coord3;
# endif
#endif

#if REFLECTION_TYPE == REFL_PLANE || SHADOW_USAGE == SHADOW_MAPPING_OPAQUE \
        || REFRACTIVE
varying vec3 v_tex_pos_clip;
#endif

#if REFRACTIVE
varying float v_view_depth;
#endif

/*============================================================================
                                  INCLUDES
============================================================================*/

#if !SHADELESS
#include <shadow.glslf>
#endif
#include <mirror.glslf>

#if REFRACTIVE
#include <refraction.glslf>
#endif

#include <environment.glslf>

#if !SHADELESS
#include <lighting_nodes.glslf>
#endif

#if !DISABLE_FOG
#include <fog.glslf>
#endif

/*============================================================================
                                    MAIN
============================================================================*/

void main(void) {

#if NODES || !DISABLE_FOG || (TEXTURE_NORM_CO && PARALLAX) || (WATER_EFFECTS && CAUSTICS) || SHADOW_USAGE == SHADOW_MASK_GENERATION || SHADOW_USAGE == SHADOW_MAPPING_BLEND
    float view_dist = length(v_pos_view);
#endif

#if WATER_EFFECTS
    float dist_to_water = v_pos_world.y - WATER_LEVEL;
#endif

#if WATER_EFFECTS || !DISABLE_FOG || (CAUSTICS && WATER_EFFECTS)
    vec3 sun_color_intens = u_sun_intensity;
#endif

#if TEXCOORD
    vec2 texcoord = v_texcoord;
#endif

    vec3 sided_normal = normalize(v_normal);
#if DOUBLE_SIDED_LIGHTING
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
#endif

#if TEXTURE_NORM_CO
    vec3 binormal = cross(sided_normal, v_tangent.xyz) * v_tangent.w;
    mat3 tbn_matrix = mat3(v_tangent.xyz, binormal, sided_normal);
#endif

#if NORMAL_TEXCOORD || REFRACTIVE
    mat4 view_matrix = tsr_to_mat4(u_view_tsr_frag);
#endif

#if NORMAL_TEXCOORD
    vec2 texcoord_norm = normalize(view_matrix * vec4(v_normal, 0.0)).st;
    texcoord_norm = texcoord_norm * vec2(0.495) + vec2(0.5);
#endif

#if TEXTURE_NORM_CO && PARALLAX
    // parallax relief mapping
    // http://steps3d.narod.ru/tutorials/parallax-mapping-tutorial.html
    if (view_dist < PARALLAX_LOD_DIST) {

        float multiplier = clamp(0.5 * (PARALLAX_LOD_DIST - view_dist), 0.0, 1.0);
        float parallax_scale = u_parallax_scale * multiplier;

        // transform eye to tangent space
        vec3 eye = normalize(v_eye_dir * tbn_matrix);

        // distance between checked layers
        float pstep = 1.0 / PARALLAX_STEPS;

        // adjustment for one layer height of the layer
        vec2 dtex = eye.xy * parallax_scale / (PARALLAX_STEPS * eye.z);

        float height = 1.0;

        float h; // get height
# if TEXTURE_NORM_CO == TEXTURE_COORDS_NORMAL
        vec2 parallax_texcoord = texcoord_norm;
# else
        vec2 parallax_texcoord = texcoord;
# endif
        h = texture2D(u_normalmap0, parallax_texcoord).a;

        for (float i = 1.0; i <= PARALLAX_STEPS; i++)
        {
            if (h < height) {
                height   -= pstep;
                parallax_texcoord -= dtex;
                h = texture2D(u_normalmap0, parallax_texcoord).a;
            }
        }

        // find point via linear interpolation
        vec2 prev = parallax_texcoord + dtex;
        float h_prev = texture2D(u_normalmap0, prev).a - (height + pstep);
        float h_current = h - height;
        float weight = h_current / (h_current - h_prev);

        // interpolate to get tex coords
        parallax_texcoord = weight * prev + (1.0 - weight) * parallax_texcoord;

        // include parallax offset in other texture coordinates
# if TEXTURE_NORM_CO == TEXTURE_COORDS_NORMAL
#  if TEXCOORD
        texcoord += parallax_texcoord - texcoord_norm;
#  endif
        texcoord_norm = parallax_texcoord;
# else // TEXTURE_NORM_CO == TEXTURE_COORDS_NORMAL
#  if NORMAL_TEXCOORD
        texcoord_norm += parallax_texcoord - texcoord;
#  endif
        texcoord = parallax_texcoord;
# endif // TEXTURE_NORM_CO == TEXTURE_COORDS_NORMAL
    }

#endif // TEXTURE_NORM_CO && PARALLAX

#if TEXTURE_NORM_CO
    vec4 normalmap;
# if TEXTURE_NORM_CO == TEXTURE_COORDS_NORMAL
    normalmap = texture2D(u_normalmap0, texcoord_norm);
# else
    normalmap = texture2D(u_normalmap0, texcoord);
# endif

    vec3 n = normalmap.rgb - 0.5;
    n = mix(vec3(0.0, 0.0, 1.0), n, u_normal_factor);

    // equivalent to n.x * v_tangent + n.y * v_binormal + n.z * sided_normal
    vec3 normal = tbn_matrix * n;

#else
    vec3 normal = sided_normal;
#endif

    normal = normalize(normal);

// recalculate normal texcoords with parallax and normalmapping applied
#if NORMAL_TEXCOORD
    texcoord_norm = normalize(view_matrix * vec4(normal, 0.0)).st;
    texcoord_norm = texcoord_norm * vec2(0.495) + vec2(0.5);
#endif

    vec3 eye_dir = normalize(v_eye_dir);

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
    float spec_alpha = 1.0;

#if TEXTURE_COLOR0_CO == TEXTURE_COORDS_NORMAL
    vec4 texture_color = texture2D(u_colormap0, texcoord_norm);
#elif TEXTURE_COLOR0_CO == TEXTURE_COORDS_UV_ORCO
    vec4 texture_color = texture2D(u_colormap0, texcoord);
#endif

#if TEXTURE_COLOR0_CO
    srgb_to_lin(texture_color.rgb);

# if TEXTURE_STENCIL_ALPHA_MASK
    vec4 texture_color1;
#  if TEXTURE_COLOR1_CO == TEXTURE_COORDS_NORMAL
    texture_color1 = texture2D(u_colormap1, texcoord_norm);
#  else
    texture_color1 = texture2D(u_colormap1, texcoord);
#  endif
    srgb_to_lin(texture_color1.rgb);

#  if TEXTURE_STENCIL_ALPHA_MASK_CO == TEXTURE_COORDS_NORMAL
    vec4 texture_stencil = texture2D(u_stencil0, texcoord_norm);
#  else
    vec4 texture_stencil = texture2D(u_stencil0, texcoord);
#  endif
    texture_color = mix(texture_color, texture_color1, texture_stencil.r);
# endif  // TEXTURE_STENCIL_ALPHA_MASK

# if TEXTURE_BLEND_TYPE == TEXTURE_BLEND_TYPE_MIX
    diffuse_color.rgb = mix(diffuse_color.rgb, texture_color.rgb, u_diffuse_color_factor);
    float texture_alpha = u_alpha_factor * texture_color.a;
    texture_alpha += (1.0 - step(0.0, texture_alpha));
    diffuse_color.a = mix(texture_alpha, 1.0, u_diffuse_color.a);
    spec_alpha = texture_color.a;
# elif TEXTURE_BLEND_TYPE == TEXTURE_BLEND_TYPE_MULTIPLY
    diffuse_color.rgb *= mix(vec3(1.0), texture_color.rgb, u_diffuse_color_factor);
    diffuse_color.a = texture_color.a;
    spec_alpha = texture_color.a;
# endif
#endif  // TEXTURE_COLOR0_CO

#if SHADELESS
    vec3 color = diffuse_color.rgb;
#else // SHADELESS

    vec3 D = u_diffuse_intensity * diffuse_color.rgb;

    // ambient
    vec3 environment_color = u_environment_energy * get_environment_color(normal);

    vec3 A = u_ambient * environment_color;

    vec4 shadow_factor = calc_shadow_factor(D);

    // emission
    vec3 E = u_emit * diffuse_color.rgb;

    // material specular params (Phong)
    vec3 specular_color = u_specular_color;
# if TEXTURE_SPEC
#  if ALPHA_AS_SPEC
    vec3 stexture_color = vec3(spec_alpha);
#  elif TEXTURE_SPEC_CO == TEXTURE_COORDS_NORMAL
    vec3 stexture_color = texture2D(u_specmap0, texcoord_norm).rgb;
#  else
    vec3 stexture_color = texture2D(u_specmap0, texcoord).rgb;
#  endif
    srgb_to_lin(stexture_color.rgb);

    specular_color = mix(specular_color, stexture_color, u_specular_color_factor);
# endif  // TEXTURE_SPEC
    float specint = u_specular_params[0];
    vec2 spec_params = vec2(u_specular_params[1], u_specular_params[2]);
    vec3 S = specint * specular_color;
    
    vec3 color;
    vec3 specular;

    nodes_lighting(E, A, D, S, v_pos_world, normal, eye_dir, spec_params, 
        u_diffuse_params, shadow_factor, 0.0, vec4(0.0), color, specular);

#endif // SHADELESS

#if REFLECTION_TYPE == REFL_PLANE || REFLECTION_TYPE == REFL_CUBE
# if NORMAL_TEXCOORD
    apply_mirror(color, eye_dir, normal, u_reflect_factor, view_matrix);
# else
    apply_mirror(color, eye_dir, normal, u_reflect_factor, mat4(0.0));
# endif
#elif REFLECTION_TYPE == REFL_MIRRORMAP
# if NORMAL_TEXCOORD
    apply_mirror(color, eye_dir, normal, 0.0, view_matrix);
# else
    apply_mirror(color, eye_dir, normal, 0.0, mat4(0.0));
# endif
#endif

#if !SHADELESS
    color += specular;
#endif //SHADELESS

    float alpha = diffuse_color.a;

#if !SHADELESS
# if WATER_EFFECTS
#  if WETTABLE
    //darken slightly to simulate wet surface
    color = max(color - sqrt(0.01 * -min(dist_to_water, 0.0)), 0.5 * color);
#  endif
#  if CAUSTICS
    apply_caustics(color, dist_to_water, u_time, shadow_factor, normal,
                   u_sun_direction, sun_color_intens, u_sun_quaternion,
                   v_pos_world, view_dist);
#  endif  // CAUSTICS
# endif  //WATER_EFFECTS
#endif  //SHADELESS

#if ALPHA
# if ALPHA_CLIP
    if (alpha < 0.5)
        discard;
    alpha = 1.0; // prevent blending with html content
# else  // ALPHA_CLIP
#  if !SHADELESS
    // make pixels with high specular more opaque; note: only the first channel of S is used
    float t = max(max(specular.r, specular.g), specular.b) * u_specular_alpha;
    alpha = diffuse_color.a * (1.0 - t) + t;
#  endif  // SHADELESS
# endif  // ALPHA CLIP
#else  // ALPHA
    alpha = 1.0;
#endif  // ALPHA

#if REFRACTIVE
    vec2 normal_view = -(view_matrix * vec4(normal, 0.0)).xy;
    color = mix(material_refraction(v_tex_pos_clip, normal_view * u_refr_bump),
                color, alpha);
    alpha = 1.0;
#endif

#if !DISABLE_FOG
# if WATER_EFFECTS
    fog(color, view_dist, eye_dir, dist_to_water);
# else
    fog(color, view_dist, eye_dir, 1.0);
# endif
#endif

    lin_to_srgb(color);
#if ALPHA && !ALPHA_CLIP
    premultiply_alpha(color, alpha);
#endif
    gl_FragColor = vec4(color, alpha);
}
