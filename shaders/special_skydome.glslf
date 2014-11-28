#var WATER_LEVEL 0.0

#include <precision_statement.glslf>
#include <gamma.glslf>

uniform samplerCube u_sky;

#if WATER_EFFECTS && !DISABLE_FOG
    uniform vec3 u_camera_eye_frag;
    uniform vec3 u_sun_intensity;
    uniform float u_environment_energy;
    uniform vec4 u_underwater_fog_color_density;
#endif

varying vec3 v_ray;

void main(void) {
    vec3 sky_color = textureCube(u_sky, v_ray).rgb;
    #if WATER_EFFECTS && !DISABLE_FOG && !REFLECTION_PASS
        srgb_to_lin(sky_color.rgb);

        // apply underwater fog to the skyplane
        float cam_depth = u_camera_eye_frag.y - WATER_LEVEL;
        cam_depth = min(-cam_depth * 0.03, 0.8);
        float sun_color_intens = clamp(length(u_sun_intensity) + u_environment_energy, 0.0, 1.0);
        vec3 ray = normalize(v_ray);

        // color of underwater depth
        vec3 depth_col = vec3(0.0);

        vec4 fog_color = u_underwater_fog_color_density;
        fog_color.rgb = mix(fog_color.rgb, depth_col, min(-ray.y + cam_depth, 1.0))
                         * sun_color_intens;

        // fog blending factor
        float factor = clamp(sign(ray.y - 0.05 * cam_depth), 0.0, 1.0);

        sky_color = mix(fog_color.rgb, sky_color, factor);

        lin_to_srgb(sky_color.rgb);
    #endif

    gl_FragColor = vec4(sky_color, 1.0);
}
