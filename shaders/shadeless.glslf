#include <std_enums.glsl>

#include <precision_statement.glslf>
#include <fog.glslf>
#include <gamma.glslf>

// global
uniform float u_time;

uniform vec4 u_fog_color_density;

// material
#if TEXTURE_COLOR
    uniform sampler2D u_colormap0;
    uniform float u_diffuse_color_factor;
    uniform vec2 u_colormap0_uv_velocity;
    #if TEXTURE_STENCIL_ALPHA_MASK
        uniform sampler2D u_colormap1;
        uniform sampler2D u_stencil0;
        varying vec2 v_texcoord;
    #else
        varying vec2 v_texcoord;
    #endif
#endif

#if VERTEX_COLOR
    varying vec3 v_color;
#else
    uniform vec4 u_diffuse_color;
#endif

varying vec4 v_pos_view;

void main(void) {

    #if TEXTURE_COLOR
        vec2 texcoord = v_texcoord;
    #endif
    
    #if VERTEX_COLOR
        vec3 vert_rgb = v_color;
        srgb_to_lin(vert_rgb);
        vec4 diffuse_color = vec4(vert_rgb, 1.0);
    #else
        vec4 diffuse_color = u_diffuse_color;
    #endif

    #if TEXTURE_COLOR
        #if TEXTURE_STENCIL_ALPHA_MASK
            vec4 texture_color0 = texture2D(u_colormap0, texcoord);
            srgb_to_lin(texture_color0.rgb);

            vec4 texture_color1 = texture2D(u_colormap1, texcoord);
            srgb_to_lin(texture_color1.rgb);

            vec4 texture_stencil0 = texture2D(u_stencil0, texcoord);

            vec4 texture_color = mix(texture_color0, texture_color1, texture_stencil0.r);
        #else
            vec4 texture_color = texture2D(u_colormap0, texcoord + u_time * u_colormap0_uv_velocity);
            srgb_to_lin(texture_color.rgb);
        #endif

        #if TEXTURE_BLEND_TYPE == TEXTURE_BLEND_TYPE_MIX
            diffuse_color.rgb = mix(diffuse_color.rgb, texture_color.rgb, u_diffuse_color_factor);
            diffuse_color.a = texture_color.a;
        #elif TEXTURE_BLEND_TYPE == TEXTURE_BLEND_TYPE_MULTIPLY
            diffuse_color.rgb *= mix(vec3(1.0), texture_color.rgb, u_diffuse_color_factor);
            diffuse_color.a = texture_color.a;
        #endif
    #endif    

    vec3 color = diffuse_color.rgb;

    #if ALPHA
        float alpha = diffuse_color.a;
        #if ALPHA_CLIP
            if (alpha < 0.5)
                discard;
            alpha = 1.0; // prevent blending with html content
        #endif
    #else
        float alpha = 1.0;
    #endif
    
    #if !DISABLE_FOG
        fog(color, length(v_pos_view), u_fog_color_density);
    #endif

    lin_to_srgb(color);
#if ALPHA && !ALPHA_CLIP 
    premultiply_alpha(color, alpha);
#endif
    gl_FragColor = vec4(color, alpha);
}
	
