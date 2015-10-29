#include <precision_statement.glslf>
#include <color_util.glslf>
#if SOFT_PARTICLES
#include <pack.glslf>
#endif

#var SOFT_STRENGTH 1.0

uniform vec4 u_diffuse_color;

uniform float u_p_alpha_start;
uniform float u_p_alpha_end;
uniform vec2 u_texel_size;

#if SOFT_PARTICLES
uniform PRECISION sampler2D u_scene_depth;
uniform float u_view_max_depth;
#endif

varying float v_alpha;
varying vec3 v_color;

#if SOFT_PARTICLES
varying vec4 v_pos_view;
varying vec3 v_tex_pos_clip;
varying float v_size;
#endif

void main(void) {

    vec2 coords = gl_PointCoord - 0.5;
    float diam = 2.0 * length(coords);

    float transp = smoothstep(u_p_alpha_start, u_p_alpha_end, diam);
    float alpha = u_diffuse_color.a * v_alpha * (1.0 - transp);
    vec3 color = v_color * u_diffuse_color.rgb;

#if SOFT_PARTICLES
    vec2 center_screen_coord = v_tex_pos_clip.xy/v_tex_pos_clip.z;
    vec2 point_screen_coords = vec2(coords.x, -coords.y) * v_size * u_texel_size;
    vec2 screen_coord = vec2(center_screen_coord + point_screen_coords);

    vec4 scene_depth_rgba = texture2D(u_scene_depth, screen_coord);
    float scene_depth = unpack_float(scene_depth_rgba);
    float view_depth = -v_pos_view.z / u_view_max_depth;

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
