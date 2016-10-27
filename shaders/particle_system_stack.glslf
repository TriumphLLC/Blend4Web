#version GLSL_VERSION

/*==============================================================================
                                    VARS
==============================================================================*/
#var PRECISION highp

#var NUM_LIGHTS 0
#var SKY_TEXTURE 0
#var SKY_COLOR 0
#var PROCEDURAL_FOG 0
#var TEXTURE_BLEND_TYPE TEXTURE_BLEND_TYPE_MIX

#var ALPHA 0
#var ALPHA_CLIP 0

#var SOFT_STRENGTH 0.25

#var SOFT_PARTICLES 0
#var NODES 0
#var HALO_PARTICLES 0
#var TEXTURE_COLOR 0
#var USE_ENVIRONMENT_LIGHT 0
#var SKY_STARS 0
#var DISABLE_FOG 0
#var WATER_EFFECTS 0
#var USE_FOG 0
#var PARTICLES_SHADELESS 0
#var USE_TBN_SHADING 0

/*==============================================================================
                                  INCLUDES
==============================================================================*/
#include <precision_statement.glslf>
#include <std.glsl>


#include <color_util.glslf>
#if SOFT_PARTICLES || NODES
#include <pack.glslf>
#endif

/*==============================================================================
                               GLOBAL UNIFORMS
==============================================================================*/

#if !HALO_PARTICLES

# if TEXTURE_COLOR
uniform sampler2D u_sampler;
# endif

uniform float u_environment_energy;

# if NUM_LIGHTS > 0
// light_factors packed in the w componnets
uniform vec4 u_light_positions[NUM_LIGHTS];
uniform vec3 u_light_directions[NUM_LIGHTS];
uniform vec4 u_light_color_intensities[NUM_LIGHTS];
# endif

# if TEXTURE_COLOR
uniform float u_diffuse_color_factor;
# endif

# if USE_ENVIRONMENT_LIGHT && SKY_TEXTURE
uniform samplerCube u_sky_texture;
# elif USE_ENVIRONMENT_LIGHT && SKY_COLOR
uniform vec3 u_horizon_color;
uniform vec3 u_zenith_color;
# endif

/*==============================================================================
                               MATERIAL UNIFORMS
==============================================================================*/

uniform vec2 u_diffuse_params;
uniform float u_diffuse_intensity;
uniform float u_emit;
uniform float u_ambient;

uniform vec3  u_specular_color;
uniform vec3  u_specular_params;

#else //!HALO_PARTICLES

uniform float u_halo_size;
uniform vec3  u_halo_rings_color;
uniform float u_halo_hardness;
uniform vec3  u_halo_lines_color;
# if SKY_STARS
uniform vec3 u_sun_intensity;
uniform float u_halo_stars_blend;
uniform float u_halo_stars_height;
# endif

uniform float u_p_alpha_start;
uniform float u_p_alpha_end;
#endif //!HALO_PARTICLES

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

uniform vec4 u_diffuse_color;

#if SOFT_PARTICLES
uniform PRECISION sampler2D u_scene_depth;
uniform float u_view_max_depth;
#endif

/*==============================================================================
                                SHADER INTERFACE
==============================================================================*/
#if SOFT_PARTICLES
GLSL_IN vec3 v_tex_pos_clip;
#endif

#if TEXTURE_COLOR || HALO_PARTICLES || USE_NODE_TEX_COORD_UV || USE_NODE_UV_MERGED \
        || USE_NODE_UVMAP || USE_NODE_GEOMETRY_UV || USE_NODE_GEOMETRY_OR \
        || USE_NODE_TEX_COORD_GE
GLSL_IN vec2 v_texcoord;
#endif

GLSL_IN vec3 v_pos_world;

#if !NODES
# if !HALO_PARTICLES
GLSL_IN float v_alpha;
# endif
GLSL_IN vec3 v_color;
#endif

#if !PARTICLES_SHADELESS || !DISABLE_FOG
GLSL_IN vec3 v_eye_dir;
#endif

#if SOFT_PARTICLES || !DISABLE_FOG || NODES
GLSL_IN vec4 v_pos_view;
#endif

#if HALO_PARTICLES
GLSL_IN float v_vertex_random;
# if SKY_STARS
GLSL_IN vec4 v_position_world;
# endif
#endif

#if USE_TBN_SHADING
GLSL_IN vec3 v_shade_tang;
#endif
//------------------------------------------------------------------------------

GLSL_OUT vec4 GLSL_OUT_FRAG_COLOR;

/*==============================================================================
                                  FUNCTIONS
==============================================================================*/
#include <lighting_nodes.glslf>
#if !DISABLE_FOG
#include <fog.glslf>
#endif

#if !HALO_PARTICLES
#include <environment.glslf>
#endif

#if HALO_PARTICLES
#include <halo_color.glslf>
#endif

/*==============================================================================
                                    MAIN
==============================================================================*/

void main(void) {

# if !PARTICLES_SHADELESS || !DISABLE_FOG
        vec3 eye_dir = normalize(v_eye_dir);
# endif

# if HALO_PARTICLES
    vec4 frag_color = halo_color();
    vec3 color = frag_color.rgb * v_color;

    float diam = 0.9 * length(v_texcoord);
    float transp = smoothstep(u_p_alpha_start, u_p_alpha_end, diam);
    float alpha = frag_color.a * (1.0 - transp);

# else // HALO_PARTICLES

    vec4 diffuse_color = u_diffuse_color;

#  if TEXTURE_COLOR
        vec4 texture_color = GLSL_TEXTURE(u_sampler, v_texcoord);
        srgb_to_lin(texture_color.rgb);
#   if TEXTURE_BLEND_TYPE == TEXTURE_BLEND_TYPE_MIX
        diffuse_color.rgb = mix(diffuse_color.rgb, texture_color.rgb, u_diffuse_color_factor);
#   elif TEXTURE_BLEND_TYPE == TEXTURE_BLEND_TYPE_MULTIPLY
        diffuse_color.rgb *= mix(vec3(1.0), texture_color.rgb, u_diffuse_color_factor);
#   endif
        diffuse_color.a = texture_color.a;
#  endif // TEXTURE_COLOR

    diffuse_color.rgb *= v_color;

#  if !PARTICLES_SHADELESS
    vec3 D = u_diffuse_intensity * diffuse_color.rgb;
    
    vec3 E = u_emit * diffuse_color.rgb;

    vec3 normal = vec3(0.0, 0.0, 1.0);

#   if USE_ENVIRONMENT_LIGHT && !SKY_TEXTURE && SKY_COLOR
        vec3 environment_color = u_environment_energy * get_environment_color(vec3(0.0));
#   else
        vec3 environment_color = u_environment_energy * get_environment_color(normal);
#   endif

    vec3 A = u_ambient * environment_color;

    float specint = u_specular_params[0];
    vec2 spec_params = vec2(u_specular_params[1], u_specular_params[2]);
    vec3 S = specint * u_specular_color;

    vec3 color;
    vec3 specular;
    nodes_lighting(E, A, D, S, v_pos_world, normal, eye_dir, spec_params, 
            u_diffuse_params, vec4(1.0), 0.0, vec4(0.0), color, specular);
        
#  else // !PARTICLES_SHADELESS
        vec3 color = diffuse_color.rgb;
#  endif // !PARTICLES_SHADELESS

    float alpha = diffuse_color.a * v_alpha;

#endif // HALO_PARTICLES

#if ALPHA
# if ALPHA_CLIP
    if (alpha < 0.5)
        discard;
    alpha = 1.0; // prevent blending with html content
# endif  // ALPHA CLIP
#else  // ALPHA
    alpha = 1.0;
#endif  // ALPHA

#if !DISABLE_FOG
    fog(color, length(v_pos_view), eye_dir, 1.0);
#endif

#if SOFT_PARTICLES
    float view_depth = -v_pos_view.z / u_view_max_depth;
    vec4 scene_depth_rgba = GLSL_TEXTURE_PROJ(u_scene_depth, v_tex_pos_clip);
    float scene_depth = unpack_float(scene_depth_rgba);
    float delta = scene_depth - view_depth;
    float depth_diff = u_view_max_depth / SOFT_STRENGTH * delta;
    alpha = alpha * min(depth_diff, 1.0);
#endif
    lin_to_srgb(color);
#if ALPHA && !ALPHA_CLIP 
    premultiply_alpha(color, alpha);
#endif
    GLSL_OUT_FRAG_COLOR = vec4(color, alpha);
}
