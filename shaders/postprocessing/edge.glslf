#include <precision_statement.glslf>
#include <pack.glslf>

uniform sampler2D u_sampler;
uniform vec2 u_texel_size;

varying vec2 v_texcoord;

float get(float x, float y, float multiplier) {
    vec2 coord = v_texcoord + vec2(x,y) * u_texel_size;
    vec4 rgba_depth = texture2D(u_sampler, coord) * multiplier;

    return unpack_float(rgba_depth);
}

void main(void) {
    float sum = (
        get(-1.0,-1.0, -1.0) + get( 0.0,-1.0, -1.0) + get( 1.0,-1.0, -1.0) +
        get(-1.0, 0.0, -1.0) + get( 0.0, 0.0,  8.0) + get( 1.0, 0.0, -1.0) +
        get(-1.0, 1.0, -1.0) + get( 0.0, 1.0, -1.0) + get( 1.0, 1.0, -1.0)
    );

    sum *= 1000.0;
    gl_FragColor = vec4(sum, sum, sum, 1.0);
}

