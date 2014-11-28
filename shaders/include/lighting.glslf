#export lighting_result lighting lighting_ambient

#var NUM_LIGHTS 0

#define M_PI 3.14159265359

float ZERO_VALUE = 0.0;
float UNITY_VALUE = 1.0;

struct lighting_result {
    vec4 color;
    vec3 specular;
};

#if SPECULAR_SHADER == SPECULAR_PHONG || SPECULAR_SHADER == SPECULAR_COOKTORR
float spec_phong_shading(vec3 ldir, vec3 eye_dir, vec3 normal, vec4 lfac,
                         float hardness) {
    vec3 halfway = normalize(ldir + eye_dir);
    float sfactor = lfac[0] * max(dot(normal, halfway), ZERO_VALUE) + lfac[1];
    return pow(sfactor, hardness);
}
#endif

#if SPECULAR_SHADER == SPECULAR_WARDISO
float spec_wardiso_shading(vec3 ldir, vec3 eye_dir, vec3 normal,
                            float specular_slope) {
    vec3 halfway = normalize(ldir + eye_dir);
    float nh = max(dot(normal, halfway), 0.001);
    // NOTE: 0.01 for mobile devices
    float nv = max(dot(normal, eye_dir), 0.01);
    float nl = max(dot(normal, ldir), 0.01);
    float angle = tan(acos(nh));
    float alpha = max(specular_slope, 0.001);

    return nl * (UNITY_VALUE/(4.0*M_PI*alpha*alpha))
              * (exp(-(angle * angle) / (alpha * alpha)) /(sqrt(nv * nl)));
}
#endif

#if SPECULAR_SHADER == SPECULAR_TOON
float spec_toon_shading(vec3 ldir, vec3 eye_dir, vec3 normal, float size,
        float tsmooth) {
    vec3 h = normalize(ldir + eye_dir);
    float angle = acos(dot(h, normal));

    if (angle < size)
        return UNITY_VALUE;
    else if (angle >= size + tsmooth || tsmooth == ZERO_VALUE)
        return ZERO_VALUE;
    else
        return UNITY_VALUE - (angle - size) / tsmooth;
}
#endif

#if DIFFUSE_SHADER == DIFFUSE_OREN_NAYAR
void shade_diffuse_oren_nayer(float nl, vec3 n, vec3 l, vec3 e, float rough, inout float is)
{
    if (rough > ZERO_VALUE) {
        float nv = max(dot(n, e), ZERO_VALUE);
        float sigma_sq = rough * rough;
        float A = UNITY_VALUE - 0.5 * (sigma_sq / (sigma_sq + 0.33));

        vec3 l_diff = l - nl*n;
        vec3 e_diff = e - nv*n;
        // handle normalize() and acos() values which may result to
        // "undefined behavior"
        // (noticeable for "mediump" precision, e.g some mobile devies)
        if (length(l_diff) == ZERO_VALUE || length(e_diff) == ZERO_VALUE ||
                abs(nl) > UNITY_VALUE || abs(nv) > UNITY_VALUE)
            // HACK: undefined result of normalize() for this vectors
            // remove t-multiplier for zero-length vectors
            is = is * A;
        else {
            float Lit_A = acos(nl);
            float View_A = acos(nv);
            vec3 Lit_B = normalize(l_diff);
            vec3 View_B = normalize(e_diff);

            float a, b;
            a = max(Lit_A, View_A);
            b = min(Lit_A, View_A);
            b *= 0.95;

            float t = max(dot(Lit_B, View_B), ZERO_VALUE);
            float B = 0.45 * (sigma_sq / (sigma_sq +  0.09));
            is = is * (A + (B * t * sin(a) * tan(b)));
        }
    }
}
#endif

#if DIFFUSE_SHADER == DIFFUSE_FRESNEL
void shade_diffuse_fresnel(vec3 n, vec3 l, float fpower, float fblend_fac, out float is)
{
    float t;

    if(fpower == ZERO_VALUE) {
        is = UNITY_VALUE;
    } else {
        t = UNITY_VALUE + abs(dot(l, n));
        t = fblend_fac + (UNITY_VALUE - fblend_fac) * pow(t, fpower);
        is = clamp(t, ZERO_VALUE, UNITY_VALUE);
    }
}
#endif

void process_lamp(inout lighting_result lresult, vec3 D, vec3 S, vec3 pos_world, vec3 normal,
          vec3 eye_dir, vec2 specular_params, vec2 diffuse_params,
          float shadow_factor, vec3 lpos,
          vec3 ldirect, vec3 lcolint, vec4 lfac1, vec4 lfac2,
          float translucency_color, vec4 translucency_params)
{
    /*
        lfac1
        sun   (1.0, 0.0, 0.0, diff)
        hemi  (0.5, 0.5, 0.0, diff)
        point (1.0, 0.0, 0.0, diff)
        spot  (1.0, 0.0, 0.0, diff)
    */
    /*
        lfac2
        sun   (-1.0,  -1.0,     -1.0, spec)
        hemi  (-1.0,  -1.0,     -1.0, spec)
        point (-1.0,  -1.0, lampdist, spec)
        spot  (size, blend, lampdist, spec)
    */
    if (lfac1.w + lfac2.w == ZERO_VALUE)
        return;

    // calc light direction and intensity
    vec3 ldir = vec3(ZERO_VALUE);

    // 0.0 - full shadow, 1.0 - no shadow
    vec3 lcolorint = lcolint * shadow_factor;

    // experiments with removing self-shadow artefacts
    //if (lfactor > 0.0 && lfactor < 0.2)
    //    color = vec3(1.0, 0.0, 0.0);

    float lampdist = lfac2.z;

    if (lampdist != -UNITY_VALUE) { // point and spot

        ldir = lpos - pos_world;

        // calc attenuation, falloff_type = "INVERSE_SQUARE"
        float dist = length(ldir);
        lcolorint *= lampdist / (lampdist + dist * dist);

        ldir = normalize(ldir);

        // spot shape like in Blender, source/blender/gpu/shaders/gpu_shader_material.glsl
        float spot_size = lfac2.x;
        float spot_blend = lfac2.y;
        if (spot_size > -UNITY_VALUE) {
            float spot_factor = dot(ldir, ldirect);
            spot_factor *= smoothstep(ZERO_VALUE, UNITY_VALUE, (spot_factor - spot_size) / spot_blend);
            lcolorint *= spot_factor;
        }
    } else // sun and hemi
        ldir = ldirect;


    float lfactor = ZERO_VALUE;
    if (lfac1.w != ZERO_VALUE) {
# if DIFFUSE_SHADER == DIFFUSE_FRESNEL
        shade_diffuse_fresnel(normal, ldir, diffuse_params[0],
                diffuse_params[1], lfactor);
# else
        // diffuse factor
        float dot_nl = max(dot(normal, ldir), ZERO_VALUE);
        // lambert
        lfactor = lfac1[0] * dot_nl + lfac1[1];
# if DIFFUSE_SHADER == DIFFUSE_OREN_NAYAR
        shade_diffuse_oren_nayer(dot_nl, normal, ldir,
                eye_dir, diffuse_params[0], lfactor);
# endif
# endif
    }

    // specular factor
    float sfactor = ZERO_VALUE;
    if (lfac2.w != ZERO_VALUE) {
# if SPECULAR_SHADER == SPECULAR_PHONG || SPECULAR_SHADER == SPECULAR_COOKTORR
        sfactor = spec_phong_shading(ldir, eye_dir, normal, lfac1,
                specular_params[0]);
# elif SPECULAR_SHADER == SPECULAR_WARDISO
        sfactor = spec_wardiso_shading(ldir, eye_dir, normal,
                specular_params[0]);
# elif SPECULAR_SHADER == SPECULAR_TOON
        sfactor = spec_toon_shading(ldir, eye_dir, normal,
                specular_params[0], specular_params[1]);
# else
        sfactor = ZERO_VALUE;
# endif
    }

# if USE_NODE_TRANSLUCENCY
    // backside lighting
    if (dot(ldir, normal) * dot(eye_dir, normal) < ZERO_VALUE) {
        float backside_factor = translucency_params.x;
        float spot_hardness = translucency_params.y;
        float spot_intensity = translucency_params.z;
        float spot_diff_factor = translucency_params.w;

        // NOTE: abs(): used for permanent translucency
        // when staring at the light source, independently from face normal
        float ln = clamp(abs(dot(ldir, normal)), ZERO_VALUE, UNITY_VALUE);
        float el = clamp(dot(eye_dir, -ldir), ZERO_VALUE, UNITY_VALUE);
        float transmit_coeff = pow(el, spot_hardness);

        // translucency light diffusion
        lresult.color += translucency_color * vec4(lcolorint * ln
                * pow(D, vec3(backside_factor)), UNITY_VALUE);

        // translucency light transmission
        lresult.color += spot_intensity * mix(vec4(D, UNITY_VALUE), vec4(UNITY_VALUE),
                spot_diff_factor) * translucency_color
                * vec4(lcolorint * ln * vec3(transmit_coeff), UNITY_VALUE);
    } else {
        // frontside lighting
        lresult.specular += lcolorint * S * sfactor;
        lresult.color += vec4(lcolorint * D * lfactor, sfactor);
    }
# else
    lresult.specular += lcolorint * S * sfactor;
    lresult.color += vec4(lcolorint * D * lfactor, sfactor);
# endif
}

#if NUM_LIGHTS > 0
lighting_result lighting(
              vec3 E,
              vec3 A,
              vec3 D,
              vec3 S,
              vec3 pos_world,
              vec3 normal,
              vec3 eye_dir,
              vec2 specular_params,
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
    lresult.color = vec4(E + D * A, ZERO_VALUE);
    lresult.specular = vec3(ZERO_VALUE);

// HACK: unroll for iOS. (loops causing a great performance dropdown)

# if UNROLL_LOOPS
    process_lamp(lresult, D, S, pos_world, normal,
        eye_dir, specular_params, diffuse_params,
        shadow_factor, light_positions[0],
        light_directions[0], light_color_intensities[0],
        light_factors1[0], light_factors2[0],
        translucency_color, translucency_params);
# if NUM_LIGHTS > 1
    process_lamp(lresult, D, S, pos_world, normal,
        eye_dir, specular_params, diffuse_params,
        shadow_factor, light_positions[1],
        light_directions[1], light_color_intensities[1],
        light_factors1[1], light_factors2[1],
        translucency_color, translucency_params);
# endif
# if NUM_LIGHTS > 2
    process_lamp(lresult, D, S, pos_world, normal,
        eye_dir, specular_params, diffuse_params,
        shadow_factor, light_positions[2],
        light_directions[2], light_color_intensities[2],
        light_factors1[2], light_factors2[2],
        translucency_color, translucency_params);
# endif
# if NUM_LIGHTS > 3
    process_lamp(lresult, D, S, pos_world, normal,
        eye_dir, specular_params, diffuse_params,
        shadow_factor, light_positions[3],
        light_directions[3], light_color_intensities[3],
        light_factors1[3], light_factors2[3],
        translucency_color, translucency_params);
# endif
# else
    for (int i = 0; i < NUM_LIGHTS; i++) {
        /*
            lfac1
            sun   (1.0, 0.0, 0.0, diff)
            hemi  (0.5, 0.5, 0.0, diff)
            point (1.0, 0.0, 0.0, diff)
            spot  (1.0, 0.0, 0.0, diff)
        */
        vec4 lfac1 = light_factors1[i];
        /*
            lfac2
            sun   (-1.0,  -1.0,     -1.0, spec)
            hemi  (-1.0,  -1.0,     -1.0, spec)
            point (-1.0,  -1.0, lampdist, spec)
            spot  (size, blend, lampdist, spec)
        */
        vec4 lfac2 = light_factors2[i];
        if (lfac1.w + lfac2.w != ZERO_VALUE) {

            // calc light direction and intensity
            vec3 ldir = vec3(ZERO_VALUE);
            vec3 lcolorint = light_color_intensities[i];

            // 0.0 - full shadow, 1.0 - no shadow
            lcolorint *= shadow_factor;

            // experiments with removing self-shadow artefacts
            //if (lfactor > 0.0 && lfactor < 0.2)
            //    color = vec3(1.0, 0.0, 0.0);

            float lampdist = lfac2.z;

            if (lampdist != -UNITY_VALUE) { // point and spot

                ldir = light_positions[i] - pos_world;

                // calc attenuation, falloff_type = "INVERSE_SQUARE"
                float dist = length(ldir);
                lcolorint *= lampdist / (lampdist + dist * dist);

                ldir = normalize(ldir);

                // spot shape like in Blender, source/blender/gpu/shaders/gpu_shader_material.glsl
                float spot_size = lfac2.x;
                float spot_blend = lfac2.y;
                if (spot_size > -UNITY_VALUE) {
                    float spot_factor = dot(ldir, light_directions[i]);
                    spot_factor *= smoothstep(ZERO_VALUE, UNITY_VALUE, (spot_factor - spot_size) / spot_blend);
                    lcolorint *= spot_factor;
                }
            } else // sun and hemi
                ldir = light_directions[i];


            float lfactor = ZERO_VALUE;
            if (lfac1.w != ZERO_VALUE) {
#if DIFFUSE_SHADER == DIFFUSE_FRESNEL
                shade_diffuse_fresnel(normal, ldir, diffuse_params[0],
                        diffuse_params[1], lfactor);
#else
                // diffuse factor
                float dot_nl = max(dot(normal, ldir), ZERO_VALUE);
                // lambert
                lfactor = lfac1[0] * dot_nl + lfac1[1];
#if DIFFUSE_SHADER == DIFFUSE_OREN_NAYAR
                shade_diffuse_oren_nayer(dot_nl, normal, ldir,
                        eye_dir, diffuse_params[0], lfactor);
#endif
#endif
            }

            // specular factor
            float sfactor = ZERO_VALUE;
            if (lfac2.w != ZERO_VALUE) {
#if SPECULAR_SHADER == SPECULAR_PHONG || SPECULAR_SHADER == SPECULAR_COOKTORR
                sfactor = spec_phong_shading(ldir, eye_dir, normal, lfac1,
                    specular_params[0]);
#elif SPECULAR_SHADER == SPECULAR_WARDISO
                sfactor = spec_wardiso_shading(ldir, eye_dir, normal,
                    specular_params[0]);
#elif SPECULAR_SHADER == SPECULAR_TOON
                sfactor = spec_toon_shading(ldir, eye_dir, normal,
                    specular_params[0], specular_params[1]);
#endif
            }

#if USE_NODE_TRANSLUCENCY
            // backside lighting
            if (dot(ldir, normal) * dot(eye_dir, normal) < ZERO_VALUE) {
                float backside_factor = translucency_params.x;
                float spot_hardness = translucency_params.y;
                float spot_intensity = translucency_params.z;
                float spot_diff_factor = translucency_params.w;

                // NOTE: abs(): used for permanent translucency
                // when staring at the light source, independently from face normal
                float ln = clamp(abs(dot(ldir, normal)), ZERO_VALUE, UNITY_VALUE);
                float el = clamp(dot(eye_dir, -ldir), ZERO_VALUE, UNITY_VALUE);
                float transmit_coeff = pow(el, spot_hardness);

                // translucency light diffusion
                lresult.color += translucency_color * vec4(lcolorint * ln
                        * pow(D, vec3(backside_factor)), UNITY_VALUE);

                // translucency light transmission
                lresult.color += spot_intensity * mix(vec4(D, UNITY_VALUE), vec4(UNITY_VALUE),
                        spot_diff_factor) * translucency_color
                        * vec4(lcolorint * ln * vec3(transmit_coeff), UNITY_VALUE);
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
    }
#endif
    return lresult;
}
#else
lighting_result lighting_ambient(vec3 E, vec3 A, vec3 D) {
    lighting_result lresult;

    // sum color as described in Math for 3D GP and CG, page 206
    lresult.color = vec4(E + D * A, ZERO_VALUE);
    lresult.specular = vec3(ZERO_VALUE);
    return lresult;
}
#endif
