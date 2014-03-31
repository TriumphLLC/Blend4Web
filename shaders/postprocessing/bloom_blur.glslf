#include <precision_statement.glslf>

uniform vec2 u_texel_size;
uniform sampler2D u_color;

varying vec2 v_texcoord;

void main(void) {

    vec2 offset = vec2(0.0, 0.0);
    vec2 delta = u_texel_size;
    vec4 def_color = texture2D(u_color, v_texcoord);

    gl_FragColor = def_color * 0.0875447373698;
    offset += delta;
    gl_FragColor += texture2D(u_color, v_texcoord+offset) * 0.0858112354248; 
    gl_FragColor += texture2D(u_color, v_texcoord-offset) * 0.0858112354248; 
    offset += delta;
    gl_FragColor += texture2D(u_color, v_texcoord+offset) * 0.0808139781061; 
    gl_FragColor += texture2D(u_color, v_texcoord-offset) * 0.0808139781061; 
    offset += delta;
    gl_FragColor += texture2D(u_color, v_texcoord+offset) * 0.0731235112908; 
    gl_FragColor += texture2D(u_color, v_texcoord-offset) * 0.0731235112908;
    offset += delta;
    gl_FragColor += texture2D(u_color, v_texcoord+offset) * 0.0635705267419;
    gl_FragColor += texture2D(u_color, v_texcoord-offset) * 0.0635705267419;
    offset += delta;
    gl_FragColor += texture2D(u_color, v_texcoord+offset) * 0.0530985673112; 
    gl_FragColor += texture2D(u_color, v_texcoord-offset) * 0.0530985673112; 
    offset += delta;
    gl_FragColor += texture2D(u_color, v_texcoord+offset) * 0.0426125984122;
    gl_FragColor += texture2D(u_color, v_texcoord-offset) * 0.0426125984122;
    offset += delta;
    gl_FragColor += texture2D(u_color, v_texcoord+offset) * 0.0328565115809; 
    gl_FragColor += texture2D(u_color, v_texcoord-offset) * 0.0328565115809; 
    offset += delta;
    gl_FragColor += texture2D(u_color, v_texcoord+offset) * 0.0243407024472;
    gl_FragColor += texture2D(u_color, v_texcoord-offset) * 0.0243407024472;
    gl_FragColor = max(0.7 * def_color, gl_FragColor);

}

