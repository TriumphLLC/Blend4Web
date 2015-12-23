#var ABSORB 0.0
#var WATER_LEVEL 0.0
#var SSS_STRENGTH 6.0
#var SSS_WIDTH 0.0
#var PRECISION lowp

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
#include <procedural.glslf>
#include <pack.glslf>
#include <color_util.glslf>
#include <math.glslv>

#define REFL_BUMP 0.001  //How much normal affects reflection displacement
#define REFR_BUMP 0.0005  //How much normal affects refraction displacement

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

#if NUM_LIGHTS > 0
uniform vec3 u_light_positions[NUM_LIGHTS];
uniform vec3 u_light_directions[NUM_LIGHTS];
uniform vec3 u_light_color_intensities[NUM_LIGHTS];
uniform vec4 u_light_factors[NUM_LFACTORS];
#endif
uniform vec3 u_sun_intensity;
uniform vec3 u_sun_direction;

#if REFLECTION_TYPE == REFL_PLANE || SHORE_SMOOTHING || (WATER_EFFECTS && !DISABLE_FOG)
uniform float u_cam_water_depth;
#endif

#if !DISABLE_FOG 
uniform vec4 u_fog_color_density;
# if WATER_EFFECTS
uniform vec4 u_underwater_fog_color_density;
# endif
# if PROCEDURAL_FOG
uniform mat4 u_cube_fog;
# endif
# if USE_FOG
uniform vec4 u_fog_params; // intensity, depth, start, height
# endif
#endif

/*============================================================================
                               SAMPLER UNIFORMS
============================================================================*/

#if NUM_NORMALMAPS > 0
uniform sampler2D u_normalmap0;
#endif

#if REFRACTIVE
uniform sampler2D u_refractmap;
#endif

#if REFLECTION_TYPE == REFL_PLANE
uniform sampler2D u_plane_reflection;
#elif REFLECTION_TYPE == REFL_MIRRORMAP
uniform samplerCube u_mirrormap;
#endif

#if SHORE_SMOOTHING
uniform PRECISION sampler2D u_scene_depth;
#endif

#if FOAM
uniform sampler2D u_foam;
#endif

/*============================================================================
                               MATERIAL UNIFORMS
============================================================================*/

uniform vec4  u_diffuse_color; // water color and alpha
uniform vec2  u_diffuse_params;
uniform float u_diffuse_intensity;
uniform float u_ambient; 

uniform vec4 u_fresnel_params;

uniform vec3 u_specular_color;
uniform vec3 u_specular_params;

uniform vec3 u_shallow_water_col;
uniform vec3 u_shore_water_col;

#if NUM_NORMALMAPS > 0
uniform float u_water_norm_uv_velocity;
uniform vec2 u_normalmap0_scale;
# if NUM_NORMALMAPS > 1
uniform vec2 u_normalmap1_scale;
#  if NUM_NORMALMAPS > 2
uniform vec2 u_normalmap2_scale;
#   if NUM_NORMALMAPS > 3
uniform vec2 u_normalmap3_scale;
#   endif
#  endif
# endif
#endif

#if REFLECTION_TYPE == REFL_MIRRORMAP
uniform float u_mirror_factor;
#else
uniform float u_reflect_factor;
#endif

#if SHORE_SMOOTHING || !DISABLE_FOG
uniform float u_view_max_depth;
#endif

#if SHORE_PARAMS
uniform float u_water_shallow_col_fac;
uniform float u_water_shore_col_fac;
#endif

#if FOAM
uniform float u_foam_factor;
uniform vec2 u_foam_uv_freq;
uniform vec2 u_foam_mag;
uniform vec2 u_foam_scale;
#endif

#if REFRACTIVE
uniform float u_refr_bump;
#endif

#if DEBUG_WIREFRAME
const float WIREFRAME_WIDTH = 1.0;
uniform vec3 u_wireframe_edge_color;
#endif

/*============================================================================
                                   VARYINGS
============================================================================*/

varying vec3 v_eye_dir;
varying vec3 v_pos_world;

#if (NUM_NORMALMAPS > 0 || FOAM) && !GENERATED_MESH
varying vec2 v_texcoord;
#endif

#if NUM_NORMALMAPS > 0
varying vec3 v_tangent;
varying vec3 v_binormal;
#endif

#if DYNAMIC || NUM_NORMALMAPS > 0
varying vec3 v_normal;
#endif

#if (NUM_NORMALMAPS > 0 || FOAM) && GENERATED_MESH && DYNAMIC
varying vec3 v_calm_pos_world;
# endif

#if SHORE_PARAMS
varying vec3 v_shore_params;
#endif

#if SHORE_SMOOTHING || REFLECTION_TYPE == REFL_PLANE || REFRACTIVE
varying vec3 v_tex_pos_clip;
#endif

#if SHORE_SMOOTHING || REFLECTION_TYPE == REFL_PLANE || REFRACTIVE || !DISABLE_FOG
varying float v_view_depth;
#endif

#if DEBUG_WIREFRAME
varying vec3 v_barycentric;
#endif

/*============================================================================
                                  FUNCTIONS
============================================================================*/

#include <environment.glslf>

#if REFRACTIVE && SHORE_SMOOTHING && USE_REFRACTION_CORRECTION
#include <refraction.glslf>
#endif

#if !DISABLE_FOG
#include <fog.glslf>
#endif

vec3 reflection (in vec2 screen_coord, in vec3 normal, in vec3 eye_dir,
                 in vec3 light_energies, out float mirror_factor) {

    // NOTE: set up out variables to prevent IE 11 linking crash
    mirror_factor = 0.0;

    vec3 eye_reflected = reflect(-eye_dir, normal);

#if REFLECTION_TYPE == REFL_PLANE
    vec2 reflect_coord = screen_coord.xy + normal.xz * REFL_BUMP
                                                  / v_view_depth;
    mirror_factor = u_reflect_factor;

    vec3 reflect_color;
    if (u_cam_water_depth < 0.0) {
# if !DISABLE_FOG && WATER_EFFECTS
        reflect_color = u_underwater_fog_color_density.rgb;
# else
        reflect_color = u_diffuse_color.rgb;
# endif
        //float eye_dot_norm = dot(eye_dir, normal);
        //mirror_factor *= max(1.0 - 1.0 / eye_dot_norm, 0.0);
    } else {
        reflect_color = texture2D(u_plane_reflection, reflect_coord).rgb;
        srgb_to_lin(reflect_color);
    }
#elif REFLECTION_TYPE == REFL_MIRRORMAP
    mirror_factor = u_mirror_factor;
    vec3 reflect_color = light_energies * textureCube(u_mirrormap, eye_reflected).rgb;
    srgb_to_lin(reflect_color);
#else // REFLECTION_TYPE == REFL_PLANE
    mirror_factor = u_reflect_factor;
    vec3 reflect_color = light_energies * vec3(0.3,0.5,1.0);
    srgb_to_lin(reflect_color);
#endif // REFLECTION_TYPE == REFL_PLANE

    // calculate mirror factor using fresnel
    vec3 reflected_halfway = normalize(eye_reflected + eye_dir);
    float one_minus_cos_theta = 1.0 - dot(eye_dir, reflected_halfway);
    float r0 = u_fresnel_params[3];
    float N = u_fresnel_params[2];
    float r = r0 + (1.0 - r0) * pow(one_minus_cos_theta, N);

    mirror_factor = min(mirror_factor * r, 1.0);

    return reflect_color;
}

/*============================================================================
                                  INCLUDES
============================================================================*/

#include <lighting_nodes.glslf>
                                  
/*============================================================================
                                    MAIN
============================================================================*/

void main(void) {

#if NUM_NORMALMAPS > 0
    mat3 tbn_matrix = mat3(v_tangent, v_binormal, v_normal);
#endif

#if DYNAMIC
    vec3 normal = normalize(v_normal);
#else
    vec3 normal = vec3(0.0, 1.0, 0.0);
#endif

#if DYNAMIC && FOAM
    float dist_to_water = v_pos_world.y - WATER_LEVEL;
#endif

#if NUM_NORMALMAPS > 0 || FOAM
# if GENERATED_MESH
#  if DYNAMIC
    vec2 texcoord = vec2(v_calm_pos_world.x, -v_calm_pos_world.z) + 0.5;
#  else
    vec2 texcoord = vec2(v_pos_world.x, -v_pos_world.z) + 0.5;
#  endif // DYNAMIC
# else
    vec2 texcoord = v_texcoord;
# endif // GENERATED_MESH
#endif

#if NUM_NORMALMAPS > 0
    // wave motion
    vec3 n_sum = vec3(0.0);
    vec3 tex_norm = texture2D(u_normalmap0, texcoord * u_normalmap0_scale
                              + vec2(0.3, 0.5) * u_water_norm_uv_velocity * u_time).xyz - 0.5;
    n_sum += tex_norm;
# if FOAM
    vec3 n_foam = vec3(0.0);
#  if NORM_FOAM0
    n_foam += tex_norm;
#  endif
# endif
#endif
#if NUM_NORMALMAPS > 1
    tex_norm = texture2D(u_normalmap0, texcoord * u_normalmap1_scale
                         + vec2(-0.3, 0.7) * u_water_norm_uv_velocity * u_time).xyz - 0.5;
    n_sum += tex_norm;
# if FOAM
#  if NORM_FOAM1
    n_foam += tex_norm;
#  endif
# endif
#endif
#if NUM_NORMALMAPS > 2
    tex_norm = texture2D(u_normalmap0, texcoord * u_normalmap2_scale
                         + vec2(0.0, 1.1) * u_water_norm_uv_velocity * u_time).xyz - 0.5;
    n_sum += tex_norm;
# if FOAM
#  if NORM_FOAM2
    n_foam += tex_norm;
#  endif
# endif
#endif
#if NUM_NORMALMAPS > 3
    tex_norm = texture2D(u_normalmap0, texcoord * u_normalmap3_scale
                         + vec2(-0.66, -0.3) * u_water_norm_uv_velocity * u_time).xyz - 0.5;
    n_sum += tex_norm;
# if FOAM
#  if NORM_FOAM3
    n_foam += tex_norm;
#  endif
# endif
#endif

#if NUM_NORMALMAPS > 0
    // converting normals to tangent space
# if FOAM
    // TODO: check directives NORM_FOAM0, ...
    vec3 n_foam_world_norm = tbn_matrix * n_foam;
    if (!is_equal3f(n_foam_world_norm, vec3(0.0)))
        n_foam_world_norm = normalize(n_foam_world_norm);

    vec3 normal_foam = mix(normal, n_foam_world_norm, 0.2);
    normal_foam = normalize(normal_foam);
# endif
#  if DYNAMIC
    normal = mix(normal, normalize(tbn_matrix * n_sum), 0.3);
#  else
    normal = mix(normal, normalize(tbn_matrix * n_sum), 0.5);
#  endif
    normal = normalize(normal);
#endif

    vec3 eye_dir = normalize(v_eye_dir);

#if REFLECTION_TYPE == REFL_PLANE || REFRACTIVE
    vec2 screen_coord = v_tex_pos_clip.xy/v_tex_pos_clip.z;
#endif

#if SHORE_SMOOTHING || !DISABLE_FOG
    float surf_dist = v_view_depth * u_view_max_depth;
#endif

#if SHORE_SMOOTHING
    float alpha = u_diffuse_color.a;

    vec4 scene_depth_rgba = texture2DProj(u_scene_depth, v_tex_pos_clip);
    float scene_depth = unpack_float(scene_depth_rgba);
    float delta = max(scene_depth - v_view_depth, 0.0);

# if REFRACTIVE
    vec2 refract_coord = screen_coord + normal.xz * u_refr_bump
                                                  / v_view_depth;
    float scene_depth_refr = refraction_correction(scene_depth, refract_coord, screen_coord);

    float delta_refr = max(scene_depth_refr - v_view_depth, 0.0);
    float depth_diff_refr = u_view_max_depth / ABSORB * delta_refr;

    float refract_factor;

    if (u_cam_water_depth < 0.0)
        refract_factor = 0.0;
    else
        refract_factor = min(alpha * depth_diff_refr, 1.0);

    float depth_diff = u_view_max_depth / ABSORB * delta;

    // refraction stuff represents disturbed underwater surface
    // so leave alpha slightly transparent only close to the shore
    alpha = min(15.0 * alpha * u_view_max_depth * delta, 1.0);
# else // REFRACTIVE
    float depth_diff = u_view_max_depth / ABSORB * delta;
    if (u_cam_water_depth > 0.0)
        alpha = min(alpha * depth_diff, 1.0);
# endif // REFRACTIVE

    // alpha correction for close to eye pixels
    alpha *= min(5.0 * surf_dist, 1.0);

#else // SHORE_SMOOTHING

    float alpha = u_diffuse_color.a;

# if REFRACTIVE
    float refract_factor = 1.0 - alpha;
    vec2 refract_coord = screen_coord + normal.xz * u_refr_bump
                                                  / v_view_depth;
# endif
#endif // SHORE_SMOOTHING

#if REFRACTIVE
    vec3 refract_color = texture2D(u_refractmap, refract_coord).rgb;
    srgb_to_lin(refract_color);
#endif

#if SHORE_PARAMS
    // shallow gradient
    float grad_f = pow(min(v_shore_params.b / u_water_shallow_col_fac, 1.0), 0.3);
    vec3 diffuse_color = mix(u_shallow_water_col, u_diffuse_color.rgb, grad_f);
    // shore water gradient
    grad_f = pow(min(v_shore_params.b / u_water_shore_col_fac, 1.0), 0.3);
    diffuse_color = mix(u_shore_water_col, diffuse_color, grad_f);
#else
    vec3 diffuse_color = u_diffuse_color.rgb;
#endif

#if FOAM
# if SHORE_SMOOTHING
    float foam_factor = max(1.0 - u_view_max_depth * delta, 0.0);
# else
    float foam_factor = 1.0 - alpha;
# endif // SHORE_SMOOTHING

# if DYNAMIC

    float foam_waves_factor = max(dist_to_water / WAVES_HEIGHT + 0.1, 0.0);

#  if SHORE_PARAMS
    // add foam to directional waves
    vec3 dir_shore = normalize(vec3(v_shore_params.r, 0.0, v_shore_params.g));
    vec3 foam_dir = normalize(mix(vec3(0.0, 1.0, 0.0), dir_shore, 0.8));
    float foam_shore_waves = 1.25*max(dot(normal_foam, foam_dir) - 0.2, 0.0);
    foam_shore_waves += max(dot(normal_foam, vec3(0.0, -1.0, 0.0)), 0.0);
    foam_factor += foam_shore_waves * (1.0 - v_shore_params.b);
    foam_waves_factor *= (1.0 - 0.95 * pow(v_shore_params.b, 0.1));
#  endif // SHORE_PARAMS

    foam_factor += foam_waves_factor;

    foam_factor = min(u_foam_factor * foam_factor, 1.0);

# endif // DYNAMIC

    vec4 foam = texture2D(u_foam,
                          u_foam_mag * sin(u_foam_uv_freq * u_time)
                          + texcoord * u_foam_scale);
#endif // FOAM

    // specular
    float specint = u_specular_params[0];
    vec2 spec_params = vec2(u_specular_params[1], u_specular_params[2]);
    vec3 S = specint * u_specular_color;

    // ambient
    vec3 environment_color = u_environment_energy * get_environment_color(normal);

    vec3 A = u_ambient * environment_color;

    vec3 light_energies = A + u_sun_intensity;

    float mirror_factor;
#if REFLECTION_TYPE == REFL_PLANE
    vec3 reflect_color = reflection(screen_coord, normal, eye_dir,
                                    light_energies, mirror_factor);
#else
    vec3 reflect_color = reflection(vec2(0.0), normal, eye_dir,
                                    light_energies, mirror_factor);
#endif

    /*==========================================================================
                            Apply all needed colors
    ==========================================================================*/

    vec3 D = u_diffuse_intensity * diffuse_color;

    vec3 color;
    vec3 specular;
    nodes_lighting(vec3(0.0), vec3(0.0), D, S, v_pos_world, normal, eye_dir, 
            spec_params, u_diffuse_params, vec4(1.0), 0.0, vec4(0.0), color, specular);

#if DYNAMIC
    // fake subsurface scattering (SSS)

    float sss_fact = max(dot(u_sun_direction, -v_normal) + SSS_WIDTH, 0.0)
                     * max(dot(-eye_dir, u_sun_direction) - 0.5, 0.0)
                     * max(0.0, length(u_sun_intensity) - 0.1);

    sss_fact = clamp(SSS_STRENGTH * sss_fact, 0.0, 1.0);
    color = mix(color, u_shallow_water_col, sss_fact);
    color = mix(color, u_shore_water_col, sss_fact);
#endif

#if REFRACTIVE
    // refraction
    color = mix(refract_color, color, refract_factor);
#endif

    // reflection
    color = mix(color, reflect_color, mirror_factor);

#if FOAM
    float foam_sum = mix(foam.g, foam.r, max(4.0 * (foam_factor - 0.75), 0.0));
    foam_sum = mix(foam.b, foam_sum, max(2.0 * foam_factor - 1.0, 0.0));
    foam_sum = mix(0.0, foam_sum, foam_factor);
    color = mix(color, light_energies, foam_sum);
#endif

    // specular
    color += specular;

#if !DISABLE_FOG
    // fog stuff
# if WATER_EFFECTS
    if (u_cam_water_depth < 0.0) {
        //Underwater fog
        water_fog(color, surf_dist, u_cam_water_depth);
    } else {
        fog(color, surf_dist, eye_dir, 1.0);
    }
# else
    fog(color, surf_dist, eye_dir, 1.0);
# endif
#endif //!DISABLE_FOG

    lin_to_srgb(color);

#if !REFRACTIVE
    // when there is no refractions make alpha stronger
    // in shiny areas and in areas with foam
    alpha = max(alpha, specular.r);
 #if FOAM
    alpha += foam_sum;
 #endif //FOAM
#endif //!REFRACTIVE

#if ALPHA
    premultiply_alpha(color, alpha);
#endif

#if DEBUG_WIREFRAME
	#extension GL_OES_standard_derivatives: enable
	vec3 derivatives = fwidth(v_barycentric);
	vec3 smoothed_bc = smoothstep(vec3(0.0), derivatives * WIREFRAME_WIDTH, v_barycentric);
	float edge_factor = min(min(smoothed_bc.x, smoothed_bc.y), smoothed_bc.z);
	edge_factor = clamp(edge_factor, 0.0, 1.0);

    color = mix(u_wireframe_edge_color, color, edge_factor);
    alpha = mix(1.0, alpha, edge_factor);
#endif

    gl_FragColor = vec4(color, alpha);
}
