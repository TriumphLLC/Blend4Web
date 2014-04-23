#export lighting_result lighting

#var NUM_LIGHTS 0

#define M_PI 3.14159265359

struct lighting_result {
    vec4 color;
    vec3 specular;
};

#if SPECULAR_SHADER == SPECULAR_PHONG || SPECULAR_SHADER == SPECULAR_COOKTORR
float spec_phong_shading(vec3 ldir, vec3 eye_dir, vec3 normal, vec4 lfac,
                         float hardness) {
    vec3 halfway = normalize(ldir + eye_dir);
    float sfactor = lfac[0] * max(dot(normal, halfway), 0.0) + lfac[1];
    return pow(sfactor, hardness);
}
#endif

#if SPECULAR_SHADER == SPECULAR_WARDISO
float spec_wardiso_shading(vec3 ldir, vec3 eye_dir, vec3 normal, 
                            float specular_slope) {
    vec3 halfway = normalize(ldir + eye_dir);
    float nh = max(dot(normal, halfway), 0.001);
    float nv = max(dot(normal, eye_dir), 0.001);
    float nl = max(dot(normal, ldir), 0.001);
    float angle = tan(acos(nh));
    float alpha = max(specular_slope, 0.001);

    return nl * (1.0/(4.0*M_PI*alpha*alpha)) 
              * (exp(-(angle * angle) / (alpha * alpha)) /(sqrt(nv * nl)));
}
#endif

#if DIFFUSE_SHADER == DIFFUSE_OREN_NAYAR
void shade_diffuse_oren_nayer(float nl, vec3 n, vec3 l, vec3 e, float rough, inout float is)
{
    if (rough > 0.0) {
        float nv = max(dot(n, e), 0.0);

        float Lit_A = acos(nl);
        float View_A = acos(nv);

        vec3 Lit_B = normalize(l - nl*n);
        vec3 View_B = normalize(e - nv*n);

        float t = max(dot(Lit_B, View_B), 0.0);

        float a, b;
      
        a = max(Lit_A, View_A);
        b = min(Lit_A, View_A);
        float sigma_sq = rough * rough;

        float A = 1.0 - 0.5 * (sigma_sq / (sigma_sq + 0.33));
        float B = 0.45 * (sigma_sq / (sigma_sq +  0.09));

        b *= 0.95;
        is = is * (A + (B * t * sin(a) * tan(b)));
    } else {
        is = is;
    }
}
#endif

#if DIFFUSE_SHADER == DIFFUSE_FRESNEL
void shade_diffuse_fresnel(vec3 n, vec3 l, float fpower, float fblend_fac, out float is)
{
    float t;

    if(fpower == 0.0) {
        is = 1.0;
    } else {
        t = 1.0 + abs(dot(l, n));
        t = fblend_fac + (1.0 - fblend_fac) * pow(t, fpower);
        is = clamp(t, 0.0, 1.0);
    }
}
#endif


lighting_result lighting(
              vec3 E, 
              vec3 A, 
              vec3 D, 
              vec3 S, 
              vec3 pos_world, 
              vec3 normal,  
              vec3 eye_dir, 
              float specular_param, 
              vec2 diffuse_params, 
              float shadow_factor,
              vec3 light_positions[NUM_LIGHTS],
              vec3 light_directions[NUM_LIGHTS],
              vec3 light_color_intensities[NUM_LIGHTS],
              vec4 light_factors1[NUM_LIGHTS],
              vec4 light_factors2[NUM_LIGHTS],
              float translucency_color,
              vec4 translucency_params) 
{

    lighting_result lresult;

    // sum color as described in Math for 3D GP and CG, page 206
    lresult.color = vec4(E + D * A, 0.0);
    lresult.specular = vec3(0.0);

    for (int i = 0; i < NUM_LIGHTS; i++) {

        /*
            lfac1
            sun   (1.0, 0.0, 0.0, 0.0)
            hemi  (0.5, 0.5, 0.0, 0.0)
            point (1.0, 0.0, 0.0, 0.0)
            spot  (1.0, 0.0, 0.0, 0.0)
        */
        vec4 lfac1 = light_factors1[i];
        /*
            lfac2
            sun   (-1.0,  -1.0,     -1.0, 0.0)
            hemi  (-1.0,  -1.0,     -1.0, 0.0)
            point (-1.0,  -1.0, lampdist, 0.0)
            spot  (size, blend, lampdist, 0.0)
        */
        vec4 lfac2 = light_factors2[i];

        // calc light direction and intensity
        vec3 ldir = vec3(0.0);
        vec3 lcolorint = light_color_intensities[i];

        // 0.0 - full shadow, 1.0 - no shadow
        lcolorint *= shadow_factor;
    
        // experiments with removing self-shadow artefacts
        //if (lfactor > 0.0 && lfactor < 0.2)
        //    color = vec3(1.0, 0.0, 0.0);

        float lampdist = lfac2.z;

        if (lampdist != -1.0) { // point and spot

            ldir = light_positions[i] - pos_world;
            
            // calc attenuation, falloff_type = "INVERSE_SQUARE"
            float dist = length(ldir);
            lcolorint *= lampdist / (lampdist + dist * dist);

            ldir = normalize(ldir);

            // spot shape like in Blender, source/blender/gpu/shaders/gpu_shader_material.glsl
            float spot_size = lfac2.x;
            float spot_blend = lfac2.y;
            if (spot_size > -1.0) {
                float spot_factor = dot(ldir, light_directions[i]);
                spot_factor *= smoothstep(0.0, 1.0, (spot_factor - spot_size) / spot_blend);
                lcolorint *= spot_factor;
            }
        } else // sun and hemi
            ldir = light_directions[i];


        float lfactor;
#if DIFFUSE_SHADER == DIFFUSE_FRESNEL
        shade_diffuse_fresnel(normal, ldir, diffuse_params[0], 
                diffuse_params[1], lfactor);
#else
        // diffuse factor
        float dot_nl = max(dot(normal, ldir), 0.0);
        // lambert
        lfactor = lfac1[0] * dot_nl + lfac1[1];
#if DIFFUSE_SHADER == DIFFUSE_OREN_NAYAR
        shade_diffuse_oren_nayer(dot_nl, normal, ldir,
                eye_dir, diffuse_params[0], lfactor);
#endif
#endif
      
        // specular factor
#if SPECULAR_SHADER == SPECULAR_PHONG || SPECULAR_SHADER == SPECULAR_COOKTORR
        float sfactor = spec_phong_shading(ldir, eye_dir, normal, lfac1,
                                           specular_param);
#elif SPECULAR_SHADER == SPECULAR_WARDISO
        float sfactor = spec_wardiso_shading(ldir, eye_dir, normal,
                                             specular_param);
#else
        float sfactor = 0.0; 
#endif

#if USE_NODE_TRANSLUCENCY
        // backside lighting
        if (dot(ldir, normal) * dot(eye_dir, normal) < 0.0) {
            float backside_factor = translucency_params.x;
            float spot_hardness = translucency_params.y;
            float spot_intensity = translucency_params.z;
            float spot_diff_factor = translucency_params.w;

            // NOTE: abs(): used for permanent translucency 
            // when staring at the light source, independently from face normal
            float ln = clamp(abs(dot(ldir, normal)), 0.0, 1.0);
            float el = clamp(dot(eye_dir, -ldir), 0.0, 1.0);
            float transmit_coeff = pow(el, spot_hardness);

            // translucency light diffusion
            lresult.color += translucency_color * vec4(lcolorint * ln 
                    * pow(D, vec3(backside_factor)), 1.0);

            // translucency light transmission
            lresult.color += spot_intensity * mix(vec4(D, 1.0), vec4(1.0), 
                    spot_diff_factor) * translucency_color 
                    * vec4(lcolorint * ln * vec3(transmit_coeff), 1.0);
        } else {
            // frontside lighting
            lresult.specular += lcolorint * S * sfactor;
            lresult.color += vec4(lcolorint * D * lfactor, sfactor);     
        }
#else
    lresult.specular += lcolorint * S * sfactor;
    lresult.color += vec4(lcolorint * D * lfactor, sfactor);
#endif
    }

    return lresult;
}
