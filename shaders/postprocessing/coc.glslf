#var PRECISION lowp

precision PRECISION sampler2D;

#include <precision_statement.glslf>
#include <depth_fetch.glslf>

uniform sampler2D u_color;
uniform sampler2D u_depth;
uniform float u_view_max_depth;
uniform float u_dof_dist;
uniform float u_dof_front;
uniform float u_dof_rear;
uniform vec2 u_camera_range;

varying vec2 v_texcoord;

void main(void) {

    vec4 color = texture2D(u_color, v_texcoord);
    if (u_dof_dist > 0.0) {
        float depth = depth_fetch(u_depth, v_texcoord, u_camera_range);
        depth *= u_view_max_depth;
        float coc = 0.0;

        if (depth < u_dof_dist)
            coc = (u_dof_dist - depth)/u_dof_front / 1.5;
        else if (depth > u_dof_dist)
            coc = (depth - u_dof_dist)/ u_dof_rear / 4.0;

        coc = clamp(coc, 0.0, 1.0);
        gl_FragColor = vec4(color.xyz, coc);

    } else
        gl_FragColor = vec4(color.xyz, 0.0);
}

