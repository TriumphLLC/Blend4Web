#include <precision_statement.glslf>
#include <pack.glslf>

uniform sampler2D u_depth;

uniform mat4 u_view_proj_inverse;
uniform mat4 u_view_proj_prev;

varying vec2 v_texcoord;

void main(void) {

    float depth = texture2D(u_depth, v_texcoord).x;

    vec4 curr_view_pos = vec4(v_texcoord * 2.0 - 1.0, 2.0 * depth - 1.0, 1.0);

    vec4 D = u_view_proj_inverse * curr_view_pos;
    vec4 worldPos = D / D.w;

    vec4 prev_view_pos = u_view_proj_prev * worldPos;
    prev_view_pos /= prev_view_pos.w;

    vec2 velocity = (curr_view_pos.xy - prev_view_pos.xy) / 4.0 + 0.5;
    velocity = clamp(velocity, 0.0, 1.0);

    gl_FragColor = pack(velocity);
}
