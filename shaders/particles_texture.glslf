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

#include <std_enums.glsl>

#include <precision_statement.glslf>
#include <color_util.glslf>
#if SOFT_PARTICLES
#include <pack.glslf>
#endif

#var PARTICLES_SHADELESS 0
#var SOFT_STRENGTH 1.0

#if TEXTURE_COLOR
uniform sampler2D u_sampler;
#endif

/*============================================================================
                               GLOBAL UNIFORMS
============================================================================*/

uniform float u_environment_energy;

#if NUM_LIGHTS > 0
uniform vec3 u_light_positions[NUM_LIGHTS];
uniform vec3 u_light_directions[NUM_LIGHTS];
uniform vec3 u_light_color_intensities[NUM_LIGHTS];
uniform vec4 u_light_factors[NUM_LFACTORS];
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
#if USE_FOG
uniform vec4 u_fog_params; // intensity, depth, start, height
#endif
#endif

#if TEXTURE_COLOR
uniform float u_diffuse_color_factor;
#endif

#if USE_ENVIRONMENT_LIGHT && SKY_TEXTURE
uniform samplerCube u_sky_texture;
#elif USE_ENVIRONMENT_LIGHT && SKY_COLOR
uniform vec3 u_horizon_color;
uniform vec3 u_zenith_color;
#endif

#if SOFT_PARTICLES
uniform PRECISION sampler2D u_scene_depth;
uniform float u_view_max_depth;
#endif

/*============================================================================
                               MATERIAL UNIFORMS
============================================================================*/

uniform vec4  u_diffuse_color;
uniform vec2  u_diffuse_params;
uniform float u_diffuse_intensity;
uniform float u_emit;
uniform float u_ambient;

uniform vec3  u_specular_color;
uniform vec3  u_specular_params;

varying float v_alpha;
varying vec3 v_color;
varying vec2 v_texcoord;
varying vec3 v_pos_world;

#if !PARTICLES_SHADELESS || !DISABLE_FOG
varying vec3 v_eye_dir;
#endif

#if !DISABLE_FOG || SOFT_PARTICLES
varying vec4 v_pos_view;
#endif

#if SOFT_PARTICLES
varying vec3 v_tex_pos_clip;
#endif

/*============================================================================
                                  FUNCTIONS
============================================================================*/

#include <environment.glslf>
#if !DISABLE_FOG
#include <fog.glslf>
#endif

#if !PARTICLES_SHADELESS
#include <lighting_nodes.glslf>
#endif

/*============================================================================
                                    MAIN
============================================================================*/

void main(void) {

    vec4 diffuse_color = u_diffuse_color;

#if TEXTURE_COLOR
    vec4 texture_color = texture2D(u_sampler, v_texcoord);
    srgb_to_lin(texture_color.rgb);
# if TEXTURE_BLEND_TYPE == TEXTURE_BLEND_TYPE_MIX
    diffuse_color.rgb = mix(diffuse_color.rgb, texture_color.rgb, u_diffuse_color_factor);
# elif TEXTURE_BLEND_TYPE == TEXTURE_BLEND_TYPE_MULTIPLY
    diffuse_color.rgb *= mix(vec3(1.0), texture_color.rgb, u_diffuse_color_factor);
# endif
    diffuse_color.a = texture_color.a;
#endif // TEXTURE_COLOR

    diffuse_color.rgb *= v_color;

    vec3 D = u_diffuse_intensity * diffuse_color.rgb;

#if !PARTICLES_SHADELESS || !DISABLE_FOG
    vec3 eye_dir = normalize(v_eye_dir);
#endif

#if !PARTICLES_SHADELESS
    vec3 E = u_emit * diffuse_color.rgb;

    vec3 normal = vec3(0.0, 1.0, 0.0);

#if USE_ENVIRONMENT_LIGHT && !SKY_TEXTURE && SKY_COLOR
    vec3 environment_color = u_environment_energy * get_environment_color(vec3(0.0));
#else
    vec3 environment_color = u_environment_energy * get_environment_color(normal);
#endif

    vec3 A = u_ambient * environment_color;

    float specint = u_specular_params[0];
    vec2 spec_params = vec2(u_specular_params[1], u_specular_params[2]);
    vec3 S = specint * u_specular_color;

    vec3 color;
    vec3 specular;
    nodes_lighting(E, A, D, S, v_pos_world, normal, eye_dir, spec_params, 
            u_diffuse_params, vec4(1.0), 0.0, vec4(0.0), color, specular);
    
#else // !PARTICLES_SHADELESS
    vec3 color = D;
#endif // !PARTICLES_SHADELESS

#if !DISABLE_FOG
    fog(color, length(v_pos_view), eye_dir, 1.0);
#endif

    float alpha = diffuse_color.a * v_alpha;

#if SOFT_PARTICLES
    float view_depth = -v_pos_view.z / u_view_max_depth;
    vec4 scene_depth_rgba = texture2DProj(u_scene_depth, v_tex_pos_clip);
    float scene_depth = unpack_float(scene_depth_rgba);
    float delta = scene_depth - view_depth;
    float depth_diff = u_view_max_depth / SOFT_STRENGTH * delta;
    alpha = alpha * min(depth_diff, 1.0);
#endif

    lin_to_srgb(color);
#if ALPHA && !ALPHA_CLIP 
    premultiply_alpha(color, alpha);
#endif
    gl_FragColor = vec4(color, alpha);
}
