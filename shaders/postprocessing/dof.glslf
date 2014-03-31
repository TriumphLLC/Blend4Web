#include <precision_statement.glslf>
#include <depth_fetch.glslf>

uniform sampler2D u_sharp;
uniform sampler2D u_blurred;
uniform sampler2D u_depth;
uniform float u_view_max_depth;
uniform float u_dof_dist;
uniform float u_dof_front;
uniform float u_dof_rear;
uniform vec2 u_camera_range;

varying vec2 v_texcoord;

void main(void) {
    vec4 tex_sharp = texture2D(u_sharp, v_texcoord);
    if (u_dof_dist > 0.0) {
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
    } else 
        gl_FragColor = tex_sharp;
}

