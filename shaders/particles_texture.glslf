#include <precision_statement.glslf>
#include <gamma.glslf>

uniform sampler2D u_sampler;

varying float v_alpha;
varying vec3 v_color;
varying vec2 v_texcoord;


void main(void) {

    vec4 color_alpha = texture2D(u_sampler, v_texcoord);

    vec3 color = color_alpha.rgb;

    srgb_to_lin(color);

    color *= v_color;

    float alpha = color_alpha.a * v_alpha;

    lin_to_srgb(color);

#if ALPHA && !ALPHA_CLIP 
    premultiply_alpha(color, alpha);
#endif
    gl_FragColor = vec4(color, alpha);
}
