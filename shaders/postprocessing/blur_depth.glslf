#include <precision_statement.glslf>
#include <depth_fetch.glslf>

uniform sampler2D u_color;
uniform sampler2D u_depth;
uniform vec2 u_texel_size;
uniform vec2 u_camera_range;
uniform float u_blur_depth_edge_size;
uniform float u_blur_depth_diff_threshold;

varying vec2 v_texcoord;

float read_depth(in vec2 coord) {
    return depth_fetch(u_depth, coord, u_camera_range);
}

void main(void) {  

    vec2 texel_size = u_texel_size;
    vec4 tex_input = texture2D(u_color, v_texcoord);

    // do not blur when nearby depths are significantly different 
    float depth0 = read_depth(v_texcoord);
    float depth1 = read_depth(v_texcoord + u_blur_depth_edge_size * texel_size);
    float depth2 = read_depth(v_texcoord - u_blur_depth_edge_size * texel_size);

    float diff1 = abs(depth0 - depth1);
    float diff2 = abs(depth0 - depth2);
    float diff_max = max(diff1, diff2);

    if (diff_max > u_blur_depth_diff_threshold) {
        gl_FragColor = tex_input;
        return;
    }

    // gaussian blur
    vec2 offset = vec2(0.0, 0.0);
    gl_FragColor = tex_input * 0.2270270270;

    offset += texel_size;
    gl_FragColor += texture2D(u_color, v_texcoord + offset) * 0.1945945946, 
    gl_FragColor += texture2D(u_color, v_texcoord - offset) * 0.1945945946, 

    offset += texel_size;
    gl_FragColor += texture2D(u_color, v_texcoord + offset) * 0.1216216216, 
    gl_FragColor += texture2D(u_color, v_texcoord - offset) * 0.1216216216, 

    offset += texel_size;
    gl_FragColor += texture2D(u_color, v_texcoord + offset) * 0.0540540541, 
    gl_FragColor += texture2D(u_color, v_texcoord - offset) * 0.0540540541, 

    offset += texel_size;
    gl_FragColor += texture2D(u_color, v_texcoord + offset) * 0.0162162162;
    gl_FragColor += texture2D(u_color, v_texcoord - offset) * 0.0162162162;
}  
