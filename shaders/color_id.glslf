#include <precision_statement.glslf>

uniform vec3 u_color_id;
uniform vec4 u_diffuse_color;
#if TEXTURE_COLOR
uniform sampler2D u_sampler;
#endif

#if TEXTURE_COLOR
varying vec2 v_texcoord;
#endif

#if USE_GLOW
uniform float u_glow_intensity;
#endif


void main(void) {

#if ALPHA
# if TEXTURE_COLOR
    float alpha = (texture2D(u_sampler, v_texcoord)).a;
# else
    float alpha = u_diffuse_color.a;
# endif
    if (alpha < 0.5)
        discard;
#endif

#if USE_GLOW
	gl_FragColor = vec4(1.0, 1.0, 1.0, u_glow_intensity);
#else
	gl_FragColor = vec4(u_color_id, 1.0);
#endif
}

