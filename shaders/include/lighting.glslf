#export lighting_result lighting lighting_ambient

#var NUM_LIGHTS 0
#var LAMP_IND 0
#var LAMP_SPOT_SIZE 0
#var LAMP_SPOT_BLEND 0
#var LAMP_LIGHT_DIST 0
#var LAMP_LIGHT_FACT_IND 0
#var LAMP_FAC_CHANNELS rgb
#var LAMP_SHADOW_MAP_IND 0
#var NUM_LFACTORS 0

#define M_PI 3.14159265359

float ZERO_VALUE_LIGHT = 0.0;
float UNITY_VALUE_LIGHT = 1.0;
float HALF_VALUE_LIGHT = 0.5;

struct lighting_result {
    vec4 color;
    vec3 specular;
};

#if SPECULAR_SHADER == SPECULAR_PHONG || SPECULAR_SHADER == SPECULAR_COOKTORR
float spec_phong_shading(vec3 ldir, vec3 eye_dir, vec3 normal, float norm_fac,
                         float hardness) {
    vec3 halfway = normalize(ldir + eye_dir);
    float sfactor = (UNITY_VALUE_LIGHT - norm_fac) * max(dot(normal, halfway),
                     ZERO_VALUE_LIGHT) + norm_fac;
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

    return nl * (UNITY_VALUE_LIGHT/(4.0*M_PI*alpha*alpha))
              * (exp(-(angle * angle) / (alpha * alpha)) /(sqrt(nv * nl)));
}
#endif

#if SPECULAR_SHADER == SPECULAR_TOON
float spec_toon_shading(vec3 ldir, vec3 eye_dir, vec3 normal, float size,
        float tsmooth) {
    vec3 h = normalize(ldir + eye_dir);
    float angle = acos(dot(h, normal));

    if (angle < size)
        return UNITY_VALUE_LIGHT;
    else if (angle >= size + tsmooth || tsmooth == ZERO_VALUE_LIGHT)
        return ZERO_VALUE_LIGHT;
    else
        return UNITY_VALUE_LIGHT - (angle - size) / tsmooth;
}
#endif

#if DIFFUSE_SHADER == DIFFUSE_OREN_NAYAR
void shade_diffuse_oren_nayer(float nl, vec3 n, vec3 l, vec3 e, float rough, inout float is)
{
    if (rough > ZERO_VALUE_LIGHT) {
        float nv = max(dot(n, e), ZERO_VALUE_LIGHT);
        float sigma_sq = rough * rough;
        float A = UNITY_VALUE_LIGHT - HALF_VALUE_LIGHT * (sigma_sq / (sigma_sq + 0.33));

        vec3 l_diff = l - nl*n;
        vec3 e_diff = e - nv*n;
        // handle normalize() and acos() values which may result to
        // "undefined behavior"
        // (noticeable for "mediump" precision, e.g some mobile devies)
        if (length(l_diff) == ZERO_VALUE_LIGHT || length(e_diff) == ZERO_VALUE_LIGHT ||
                abs(nl) > UNITY_VALUE_LIGHT || abs(nv) > UNITY_VALUE_LIGHT)
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

            float t = max(dot(Lit_B, View_B), ZERO_VALUE_LIGHT);
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

    if(fpower == ZERO_VALUE_LIGHT) {
        is = UNITY_VALUE_LIGHT;
    } else {
        t = UNITY_VALUE_LIGHT + abs(dot(l, n));
        t = fblend_fac + (UNITY_VALUE_LIGHT - fblend_fac) * pow(t, fpower);
        is = clamp(t, ZERO_VALUE_LIGHT, UNITY_VALUE_LIGHT);
    }
}
#endif

void shade_diffuse(vec3 normal, vec3 ldir, vec3 eye_dir, vec2 diffuse_params,
                   const float norm_fac, out float lfactor) {
#if DIFFUSE_SHADER == DIFFUSE_FRESNEL
        shade_diffuse_fresnel(normal, ldir, diffuse_params[0],
                diffuse_params[1], lfactor);
#else
        // diffuse factor
        float dot_nl = max(dot(normal, ldir), ZERO_VALUE_LIGHT);
        // lambert
        lfactor = (UNITY_VALUE_LIGHT - norm_fac) * dot_nl + norm_fac;
# if DIFFUSE_SHADER == DIFFUSE_OREN_NAYAR
        shade_diffuse_oren_nayer(dot_nl, normal, ldir,
                eye_dir, diffuse_params[0], lfactor);
# endif
#endif
}

void shade_spec(vec3 ldir, vec3 eye_dir, vec3 normal, float norm_fac,
                 vec2 specular_params, out float sfactor) {
# if SPECULAR_SHADER == SPECULAR_PHONG || SPECULAR_SHADER == SPECULAR_COOKTORR
        sfactor = spec_phong_shading(ldir, eye_dir, normal, norm_fac,
                                  specular_params[0]);
# elif SPECULAR_SHADER == SPECULAR_WARDISO
        sfactor = spec_wardiso_shading(ldir, eye_dir, normal,
                                    specular_params[0]);
# elif SPECULAR_SHADER == SPECULAR_TOON
        sfactor = spec_toon_shading(ldir, eye_dir, normal,
                                 specular_params[0], specular_params[1]);
# else
        sfactor = ZERO_VALUE_LIGHT;
# endif
}

void apply_lighting(vec3 eye_dir, vec3 ldir, vec3 normal, vec2 lfac,
                    vec4 translucency_params, vec3 D, vec3 S, vec3 lcolorint,
                    inout lighting_result lresult, float translucency_color,
                    vec2 diffuse_params, vec2 specular_params, float norm_fac) {

    float lfactor = ZERO_VALUE_LIGHT;
    if (lfac.r != ZERO_VALUE_LIGHT)
        shade_diffuse(normal, ldir, eye_dir, diffuse_params, norm_fac,
                      lfactor);

    float sfactor = ZERO_VALUE_LIGHT;
    if (lfac.g != ZERO_VALUE_LIGHT)
        shade_spec(ldir, eye_dir, normal, norm_fac, specular_params,
                   sfactor);

# if USE_NODE_B4W_TRANSLUCENCY
    // backside lighting
    if (dot(ldir, normal) * dot(eye_dir, normal) < ZERO_VALUE_LIGHT) {
        float backside_factor = translucency_params.x;
        float spot_hardness = translucency_params.y;
        float spot_intensity = translucency_params.z;
        float spot_diff_factor = translucency_params.w;

        // NOTE: abs(): used for permanent translucency
        // when staring at the light source, independently from face normal
        float ln = clamp(abs(dot(ldir, normal)), ZERO_VALUE_LIGHT, UNITY_VALUE_LIGHT);
        float el = clamp(dot(eye_dir, -ldir), ZERO_VALUE_LIGHT, UNITY_VALUE_LIGHT);
        float transmit_coeff = pow(el, spot_hardness);

        // translucency light diffusion
        lresult.color += translucency_color * vec4(lcolorint * ln
                * pow(D, vec3(backside_factor)), UNITY_VALUE_LIGHT);

        // translucency light transmission
        lresult.color += spot_intensity * mix(vec4(D, UNITY_VALUE_LIGHT), vec4(UNITY_VALUE_LIGHT),
                spot_diff_factor) * translucency_color
                * vec4(lcolorint * ln * vec3(transmit_coeff), UNITY_VALUE_LIGHT);
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

#lamp POINT
{
    vec2 lfac = light_factors[LAMP_LIGHT_FACT_IND].LAMP_FAC_CHANNELS;
    vec3 lpos = light_positions[LAMP_IND];
    vec3 lcolint = light_color_intensities[LAMP_IND];
    float norm_fac = ZERO_VALUE_LIGHT;

    // 0.0 - full shadow, 1.0 - no shadow
    vec3 lcolorint = lcolint;
    if (bool(LAMP_SHADOW_MAP_IND))
         lcolorint *= shadow_factor;

    vec3 ldir = lpos - pos_world;

    // calc attenuation, falloff_type = "INVERSE_SQUARE"
    float dist = length(ldir);
    lcolorint *= LAMP_LIGHT_DIST / (LAMP_LIGHT_DIST + dist * dist);

    ldir = normalize(ldir);

    apply_lighting(eye_dir, ldir, normal, lfac, translucency_params,
                   D, S, lcolorint, lresult, translucency_color,
                   diffuse_params, specular_params, norm_fac);
}
#endlamp

#lamp SPOT
{
    vec2 lfac = light_factors[LAMP_LIGHT_FACT_IND].LAMP_FAC_CHANNELS;
    vec3 lpos = light_positions[LAMP_IND];
    vec3 lcolint = light_color_intensities[LAMP_IND];
    vec3 ldirect = light_directions[LAMP_IND];
    float norm_fac = ZERO_VALUE_LIGHT;

    // 0.0 - full shadow, 1.0 - no shadow
    vec3 lcolorint = lcolint;
    if (bool(LAMP_SHADOW_MAP_IND))
         lcolorint *= shadow_factor;

    vec3 ldir = lpos - pos_world;

    // calc attenuation, falloff_type = "INVERSE_SQUARE"
    float dist = length(ldir);
    lcolorint *= LAMP_LIGHT_DIST / (LAMP_LIGHT_DIST + dist * dist);

    ldir = normalize(ldir);

    // spot shape like in Blender,
    // source/blender/gpu/shaders/gpu_shader_material.glsl
    float spot_factor = dot(ldir, ldirect);
    spot_factor *= smoothstep(ZERO_VALUE_LIGHT, UNITY_VALUE_LIGHT,
                              (spot_factor - LAMP_SPOT_SIZE) / LAMP_SPOT_BLEND);
    lcolorint *= spot_factor;

    apply_lighting(eye_dir, ldir, normal, lfac, translucency_params,
                   D, S, lcolorint, lresult, translucency_color,
                   diffuse_params, specular_params, norm_fac);
}
#endlamp

#lamp SUN
{
    vec2 lfac = light_factors[LAMP_LIGHT_FACT_IND].LAMP_FAC_CHANNELS;
    vec3 lcolint = light_color_intensities[LAMP_IND];
    vec3 ldir = light_directions[LAMP_IND];
    float norm_fac = ZERO_VALUE_LIGHT;

    // 0.0 - full shadow, 1.0 - no shadow
    vec3 lcolorint = lcolint;
    if (bool(LAMP_SHADOW_MAP_IND))
         lcolorint *= shadow_factor;

    apply_lighting(eye_dir, ldir, normal, lfac, translucency_params,
                   D, S, lcolorint, lresult, translucency_color,
                   diffuse_params, specular_params, norm_fac);
}
#endlamp

#lamp HEMI
{
    vec2 lfac = light_factors[LAMP_LIGHT_FACT_IND].LAMP_FAC_CHANNELS;
    vec3 lcolint = light_color_intensities[LAMP_IND];
    vec3 ldir = light_directions[LAMP_IND];
    float norm_fac = HALF_VALUE_LIGHT;

    // 0.0 - full shadow, 1.0 - no shadow
    vec3 lcolorint = lcolint;
    if (bool(LAMP_SHADOW_MAP_IND))
         lcolorint *= shadow_factor;

    apply_lighting(eye_dir, ldir, normal, lfac, translucency_params,
                   D, S, lcolorint, lresult, translucency_color,
                   diffuse_params, specular_params, norm_fac);
}
#endlamp

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
              vec4 light_factors[NUM_LFACTORS],
              float translucency_color,
              vec4 translucency_params)
{
    lighting_result lresult;
    // sum color as described in Math for 3D GP and CG, page 206
    lresult.color = vec4(E + D * A, ZERO_VALUE_LIGHT);
    lresult.specular = vec3(ZERO_VALUE_LIGHT);
# lamps_main
    return lresult;
}
#else
lighting_result lighting_ambient(vec3 E, vec3 A, vec3 D)
{
    lighting_result lresult;
    // sum color as described in Math for 3D GP and CG, page 206
    lresult.color = vec4(E + D * A, ZERO_VALUE_LIGHT);
    lresult.specular = vec3(ZERO_VALUE_LIGHT);
    return lresult;
}
#endif

