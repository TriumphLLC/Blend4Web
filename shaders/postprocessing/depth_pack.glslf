#include <precision_statement.glslf>
#include <pack.glslf>
#include <depth_fetch.glslf>

uniform sampler2D u_depth;
uniform vec2 u_camera_range;

varying vec2 v_texcoord;

void main(void) {
    gl_FragColor = pack(clamp(depth_fetch(u_depth, v_texcoord, u_camera_range), 0.0, 0.999999));
}

