#include <precision_statement.glslf>
#include <fog.glslf>
#include <gamma.glslf>
#include <lighting.glslf>

uniform vec4 u_diffuse_color;

uniform float u_p_alpha_start;
uniform float u_p_alpha_end;

uniform vec4 u_fog_color_density;

varying float v_alpha;
varying vec3 v_color;
#if !DISABLE_FOG
varying vec3 v_pos_view;
#endif

void main(void) {

    float diam = 2.0*sqrt((gl_PointCoord.x - 0.5) * (gl_PointCoord.x - 0.5) +
            (gl_PointCoord.y - 0.5) * (gl_PointCoord.y - 0.5));

    float transp = smoothstep(u_p_alpha_start, u_p_alpha_end, diam);
    float alpha = u_diffuse_color.a * v_alpha * (1.0 - clamp(transp, 0.0, 1.0));

    vec3 color = v_color * u_diffuse_color.rgb;

#if !DISABLE_FOG
    fog(color, length(v_pos_view), u_fog_color_density);
#endif

    lin_to_srgb(color);
#if ALPHA && !ALPHA_CLIP 
    premultiply_alpha(color, alpha);
#endif

    gl_FragColor = vec4(color, alpha);
}

