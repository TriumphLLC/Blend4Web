// lamp dirs
#var LAMP_IND 0
#var LAMP_SPOT_SIZE 0
#var LAMP_SPOT_BLEND 0
#var LAMP_LIGHT_DIST 0
#var LAMP_LIGHT_FACT_IND 0
#var LAMP_FAC_CHANNELS rgb
#var LAMP_SHADOW_MAP_IND 0

#import u_light_factors
#import u_light_color_intensities
#import u_light_positions
#import u_light_directions

#define M_PI 3.14159265359

#export nodes_lighting

float ZERO_VALUE_NODES = 0.0;
float UNITY_VALUE_NODES = 1.0;
float HALF_VALUE_NODES = 0.5;

#node LIGHTING_BEGIN
    #node_out vec3 E
    #node_out vec3 A
    #node_out vec3 D
    #node_out optional vec3 S
    #node_out optional vec3 normal
    #node_out optional vec2 diffuse_params
    #node_out optional vec2 specular_params
    #node_out optional vec4 shadow_factor
    #node_out optional float translucency_color
    #node_out optional vec4 translucency_params

    E                   = nin_E;
    A                   = nin_A;
    D                   = nin_D;
#node_if USE_OUT_S
    S                   = nin_S;
#node_endif
#node_if USE_OUT_normal
    normal              = nin_normal;
#node_endif
#node_if USE_OUT_specular_params
    specular_params     = nin_specular_params;
#node_endif
#node_if USE_OUT_diffuse_params
    diffuse_params      = nin_diffuse_params;
#node_endif
#node_if USE_OUT_shadow_factor
    shadow_factor       = nin_shadow_factor;
#node_endif
#node_if USE_OUT_translucency_color
    translucency_color  = nin_translucency_color;
#node_endif
#node_if USE_OUT_translucency_params
    translucency_params = nin_translucency_params;
#node_endif
#endnode

// lighting_ambient function
#node LIGHTING_AMBIENT
    #node_in vec3 E
    #node_in vec3 A
    #node_in vec3 D
    #node_out vec4 color_out
    #node_out vec3 specular_out

    color_out = vec4(E + D * A, ZERO_VALUE_NODES);
    specular_out = vec3(ZERO_VALUE_NODES);
#endnode

#node LIGHTING_LAMP
    #node_in vec4 shadow_factor

    #node_out vec3 ldir
    #node_out vec2 lfac
    #node_out vec3 lcolorint
    #node_out float norm_fac

    lfac = u_light_factors[LAMP_LIGHT_FACT_IND].LAMP_FAC_CHANNELS;
# node_if LAMP_TYPE == HEMI
    norm_fac = HALF_VALUE_NODES;
# node_else
    norm_fac = ZERO_VALUE_NODES;
# node_endif

    // 0.0 - full shadow, 1.0 - no shadow
    lcolorint = u_light_color_intensities[LAMP_IND];
# node_if LAMP_SHADOW_MAP_IND != -1
    lcolorint *= shadow_factor[LAMP_SHADOW_MAP_IND];
# node_endif

# node_if LAMP_TYPE == SPOT || LAMP_TYPE == POINT
    vec3 lpos = u_light_positions[LAMP_IND];
    ldir = lpos - nin_pos_world;

    // calc attenuation, falloff_type = "INVERSE_SQUARE"
    float dist = length(ldir);
    lcolorint *= LAMP_LIGHT_DIST / (LAMP_LIGHT_DIST + dist * dist);

    ldir = normalize(ldir);

#  node_if LAMP_TYPE == SPOT
    // spot shape like in Blender,
    // source/blender/gpu/shaders/gpu_shader_material.glsl
    vec3 ldirect = u_light_directions[LAMP_IND];
    float spot_factor = dot(ldir, ldirect);
    spot_factor *= smoothstep(ZERO_VALUE_NODES, UNITY_VALUE_NODES,
                              (spot_factor - LAMP_SPOT_SIZE) / LAMP_SPOT_BLEND);
    lcolorint *= spot_factor;
#  node_endif
# node_else // LAMP_TYPE == SPOT || LAMP_TYPE == POINT
    ldir = u_light_directions[LAMP_IND];
# node_endif // LAMP_TYPE == SPOT || LAMP_TYPE == POINT
#endnode

#node DIFFUSE_FRESNEL
    #node_in vec3 ldir
    #node_in vec2 lfac
    #node_in vec3 normal
    #node_in float norm_fac
    #node_in vec2 dif_params
    #node_out float lfactor

    lfactor = ZERO_VALUE_NODES;
    if (lfac.r != ZERO_VALUE_NODES) {
        float dot_nl = (UNITY_VALUE_NODES - norm_fac) * dot(normal, ldir) + norm_fac;

        if (dif_params[0] == ZERO_VALUE_NODES) {
            lfactor = UNITY_VALUE_NODES;
        } else {
            float t = UNITY_VALUE_NODES + abs(dot_nl);
            t = dif_params[1] + (UNITY_VALUE_NODES - dif_params[1]) * pow(t, dif_params[0]);
            lfactor = clamp(t, ZERO_VALUE_NODES, UNITY_VALUE_NODES);
        }
        lfactor = max(lfactor, ZERO_VALUE_NODES);
    }
#endnode

#node DIFFUSE_LAMBERT
    #node_in vec3 ldir
    #node_in vec2 lfac
    #node_in vec3 normal
    #node_in float norm_fac
    #node_out float lfactor

    lfactor = ZERO_VALUE_NODES;
    if (lfac.r != ZERO_VALUE_NODES) {
        float dot_nl = (UNITY_VALUE_NODES - norm_fac) * dot(normal, ldir) + norm_fac;

        lfactor = max(dot_nl, ZERO_VALUE_NODES);
    }
#endnode

#node DIFFUSE_OREN_NAYAR
    #node_in vec3 ldir
    #node_in vec2 lfac
    #node_in vec3 normal
    #node_in float norm_fac
    #node_in vec2 dif_params
    #node_out float lfactor

    lfactor = ZERO_VALUE_NODES;
    if (lfac.r != ZERO_VALUE_NODES) {
        float dot_nl = (UNITY_VALUE_NODES - norm_fac) * dot(normal, ldir) + norm_fac;

        if (dif_params[0] > ZERO_VALUE_NODES) {
            float nv = max(dot(normal, nin_eye_dir), ZERO_VALUE_NODES);
            float sigma_sq = dif_params[0] * dif_params[0];
            float A = UNITY_VALUE_NODES - HALF_VALUE_NODES * (sigma_sq / (sigma_sq + 0.33));

            vec3 l_diff = ldir - dot_nl*normal;
            vec3 e_diff = nin_eye_dir - nv*normal;
            // handle normalize() and acos() values which may result to
            // "undefined behavior"
            // (noticeable for "mediump" precision, nin_eye_dir.g some mobile devies)
            if (length(l_diff) == ZERO_VALUE_NODES || length(e_diff) == ZERO_VALUE_NODES ||
                    abs(dot_nl) > UNITY_VALUE_NODES || abs(nv) > UNITY_VALUE_NODES)
                // HACK: undefined result of normalize() for this vectors
                // remove t-multiplier for zero-length vectors
                lfactor = dot_nl * A;
            else {
                float Lit_A = acos(dot_nl);
                float View_A = acos(nv);
                vec3 Lit_B = normalize(l_diff);
                vec3 View_B = normalize(e_diff);

                float a, b;
                a = max(Lit_A, View_A);
                b = min(Lit_A, View_A);
                b *= 0.95;

                float t = max(dot(Lit_B, View_B), ZERO_VALUE_NODES);
                float B = 0.45 * (sigma_sq / (sigma_sq +  0.09));
                lfactor = dot_nl * (A + (B * t * sin(a) * tan(b)));
            }
        } else
            lfactor = dot_nl;
        lfactor = max(lfactor, ZERO_VALUE_NODES);
    }
#endnode

#node DIFFUSE_MINNAERT
    #node_in vec3 ldir
    #node_in vec2 lfac
    #node_in vec3 normal
    #node_in float norm_fac
    #node_in vec2 dif_params
    #node_out float lfactor

    lfactor = ZERO_VALUE_NODES;
    if (lfac.r != ZERO_VALUE_NODES) {
        float dot_nl = (UNITY_VALUE_NODES - norm_fac) * dot(normal, ldir) + norm_fac;
        float nv = max(dot(normal, nin_eye_dir), ZERO_VALUE_NODES);

        if (dif_params[0] <= UNITY_VALUE_NODES)
            lfactor = dot_nl * pow(max(nv * dot_nl, 0.1), dif_params[0] - UNITY_VALUE_NODES);
        else
            lfactor = dot_nl * pow(1.0001 - nv, dif_params[0] - UNITY_VALUE_NODES);
        lfactor = max(lfactor, ZERO_VALUE_NODES);
    }
#endnode

#node DIFFUSE_TOON
    #node_in vec3 ldir
    #node_in vec2 lfac
    #node_in vec3 normal
    #node_in float norm_fac
    #node_in vec2 dif_params
    #node_out float lfactor

    lfactor = ZERO_VALUE_NODES;
    if (lfac.r != ZERO_VALUE_NODES) {
        float dot_nl = (UNITY_VALUE_NODES - norm_fac) * dot(normal, ldir) + norm_fac;
        float ang = acos(dot_nl);

        if (ang < dif_params[0])
            lfactor = UNITY_VALUE_NODES;
        else if (ang > (dif_params[0] + dif_params[1]) || dif_params[1] == ZERO_VALUE_NODES)
                lfactor = ZERO_VALUE_NODES;
            else
                lfactor = UNITY_VALUE_NODES - ((ang - dif_params[0])/dif_params[1]);
        lfactor = max(lfactor, ZERO_VALUE_NODES);
    }
#endnode

#node SPECULAR_PHONG
    #node_in vec3 ldir
    #node_in vec2 lfac
    #node_in vec3 normal
    #node_in float norm_fac
    #node_in vec2 sp_params
    #node_out float sfactor

    sfactor = ZERO_VALUE_NODES;
    if (lfac.g != ZERO_VALUE_NODES) {
        vec3 halfway = normalize(ldir + nin_eye_dir);
        sfactor = (UNITY_VALUE_NODES - norm_fac) * max(dot(normal, halfway),
                         ZERO_VALUE_NODES) + norm_fac;
        sfactor = pow(sfactor, sp_params[0]);
    }
#endnode

#node SPECULAR_WARDISO
    #node_in vec3 ldir
    #node_in vec2 lfac
    #node_in vec3 normal
    #node_in vec2 sp_params
    #node_out float sfactor

    sfactor = ZERO_VALUE_NODES;
    if (lfac.g != ZERO_VALUE_NODES) {
        vec3 halfway = normalize(ldir + nin_eye_dir);
        float nh = max(dot(normal, halfway), 0.001);
        // NOTE: 0.01 for mobile devices
        float nv = max(dot(normal, nin_eye_dir), 0.01);
        float nl = max(dot(normal, ldir), 0.01);
        float angle = tan(acos(nh));
        float alpha = max(sp_params[0], 0.001);

        sfactor = nl * (UNITY_VALUE_NODES/(4.0*M_PI*alpha*alpha))
                  * (exp(-(angle * angle) / (alpha * alpha)) /(sqrt(nv * nl)));
    }
#endnode

#node SPECULAR_TOON
    #node_in vec3 ldir
    #node_in vec2 lfac
    #node_in vec3 normal
    #node_in vec2 sp_params
    #node_out float sfactor

    sfactor = ZERO_VALUE_NODES;
    if (lfac.g != ZERO_VALUE_NODES) {
        vec3 h = normalize(ldir + nin_eye_dir);
        float angle = acos(dot(h, normal));

        if (angle < sp_params[0])
            sfactor = UNITY_VALUE_NODES;
        else if (angle >= sp_params[0] + sp_params[1] || sp_params[1] == ZERO_VALUE_NODES)
            sfactor = ZERO_VALUE_NODES;
        else
            sfactor = UNITY_VALUE_NODES - (angle - sp_params[0]) / sp_params[1];
    }
#endnode

#node SPECULAR_BLINN
    #node_in vec3 ldir
    #node_in vec2 lfac
    #node_in vec3 normal
    #node_in float norm_fac
    #node_in vec2 sp_params
    #node_out float sfactor

    sfactor = ZERO_VALUE_NODES;
    if (lfac.g != ZERO_VALUE_NODES) {
        if (sp_params[0] < 1.0 || sp_params[1] == ZERO_VALUE_NODES)
            sfactor = ZERO_VALUE_NODES;
        else {
            if (sp_params[1] < 100.0)
                sp_params[1]= sqrt(1.0 / sp_params[1]);
            else
                sp_params[1]= 10.0 / sp_params[1];

            vec3 halfway = normalize(nin_eye_dir + ldir);
            float nh = (UNITY_VALUE_NODES - norm_fac) * max(dot(normal, halfway),
                         ZERO_VALUE_NODES) + norm_fac;
            if (nh < ZERO_VALUE_NODES)
                sfactor = ZERO_VALUE_NODES;
            else {
                float nv = max(dot(normal, nin_eye_dir), 0.01);
                float nl = dot(normal, ldir);
                if (nl <= 0.01)
                    sfactor = ZERO_VALUE_NODES;
                else {
                    float vh = max(dot(nin_eye_dir, halfway), 0.01);

                    float a = UNITY_VALUE_NODES;
                    float b = (2.0 * nh * nv) / vh;
                    float c = (2.0 * nh * nl) / vh;

                    float g = min(min(a, b), c);

                    float p = sqrt(pow(sp_params[0], 2.0) + pow(vh, 2.0) - UNITY_VALUE_NODES);
                    float f = pow(p - vh, 2.0) / pow(p + vh, 2.0) * (UNITY_VALUE_NODES 
                            + pow(vh * (p + vh) - UNITY_VALUE_NODES, 2.0)/pow(vh * (p - vh) 
                            + UNITY_VALUE_NODES, 2.0));
                    float ang = acos(nh);
                    sfactor = max(f * g * exp(-pow(ang, 2.0) / (2.0 * pow(sp_params[1], 2.0))), 
                            ZERO_VALUE_NODES);
                }
            }
        }
    }
#endnode

#node LIGHTING_APPLY
    #node_in vec4 color_in
    #node_in vec3 specular_in
    #node_in float lfactor
    #node_in float sfactor
    #node_in vec3 ldir
    #node_in vec3 normal
    #node_in vec4 translucency_params
    #node_in vec3 D
    #node_in vec3 S
    #node_in vec3 lcolorint
    #node_in float translucency_color
    
    #node_out vec4 color_out
    #node_out vec3 specular_out

    specular_out = specular_in + lcolorint * S * sfactor;
    color_out = color_in + vec4(lcolorint * D * lfactor, sfactor);

#endnode

#node LIGHTING_END
    #node_in vec4 color
    #node_in vec3 specular

    nout_color    = color.rgb;
    nout_specular = specular;
#endnode

#nodes_global
    
void nodes_lighting(
        vec3 nin_E,
        vec3 nin_A,
        vec3 nin_D,
        vec3 nin_S,
        vec3 nin_pos_world,
        vec3 nin_normal,
        vec3 nin_eye_dir,
        vec2 nin_specular_params,
        vec2 nin_diffuse_params,
        vec4 nin_shadow_factor,
        float nin_translucency_color,
        vec4 nin_translucency_params,
        out vec3 nout_color,
        out vec3 nout_specular) {

    #nodes_main
}