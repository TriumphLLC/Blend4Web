#var PRECISION lowp

precision PRECISION sampler2D;

#include <precision_statement.glslf>
#include <std_enums.glsl>

#if DOF_TYPE == DOF_BOKEH
uniform sampler2D u_sharp;
uniform sampler2D u_blurred1;
uniform sampler2D u_blurred2;
uniform float u_dof_dist;

#else
#include <depth_fetch.glslf>

uniform sampler2D u_sharp;
uniform sampler2D u_blurred;
uniform sampler2D u_depth;
uniform float u_view_max_depth;
uniform float u_dof_dist;
uniform float u_dof_front;
uniform float u_dof_rear;
uniform vec2 u_camera_range;
#endif

varying vec2 v_texcoord;

void main(void) {
    vec4 tex_sharp = texture2D(u_sharp, v_texcoord);
    if (u_dof_dist > 0.0) {

#if DOF_TYPE == DOF_BOKEH
        float coc;

        vec4 tex_blurred1 = texture2D(u_blurred1, v_texcoord);
        vec4 tex_blurred2 = texture2D(u_blurred2, v_texcoord);

        coc = min(tex_blurred1.a, tex_blurred2.a);

        if (coc > 0.0) {
            // combining blurs for hexagonal bokeh
            tex_blurred1.xyz = min(tex_blurred1.xyz, tex_blurred2.xyz);
            gl_FragColor = vec4(mix(tex_sharp.xyz, tex_blurred1.xyz, coc), tex_sharp.a);
        }
        else
            gl_FragColor = tex_sharp;

#elif DOF_TYPE == DOF_SIMPLE
        float depth = depth_fetch(u_depth, v_texcoord, u_camera_range);
        depth *= u_view_max_depth;
        float strength;
        if (depth < u_dof_dist)
            strength = (u_dof_dist - depth)/u_dof_front;
        else
            strength = (depth - u_dof_dist)/u_dof_rear;

        strength = clamp(strength, 0.0, 1.0);

        vec4 tex_blurred = texture2D(u_blurred, v_texcoord);

        gl_FragColor = mix(tex_sharp, tex_blurred, strength);

#else
        gl_FragColor = tex_sharp;
#endif

    } else
        gl_FragColor = tex_sharp;
}

