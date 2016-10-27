#ifndef LIGHTING_NODES_GLSLF
#define LIGHTING_NODES_GLSLF

// #import u_light_factors
// #import u_light_color_intensities
// #import u_light_positions
// #import u_light_directions
// #import v_shade_tang

#include <std.glsl>

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

    color_out = vec4(E + D * A, _0_0);
    specular_out = vec3(_0_0);
#endnode

#node LIGHTING_LAMP
    #node_var LAMP_TYPE HEMI
    #node_var LAMP_IND 0
    #node_var LAMP_SPOT_SIZE 0.8
    #node_var LAMP_SPOT_BLEND 0.03
    #node_var LAMP_LIGHT_DIST 30.0
    #node_var LAMP_SHADOW_MAP_IND -1
    #node_var LAMP_USE_SPHERE 0

    #node_in vec4 shadow_factor

    #node_out vec3 ldir
    #node_out vec2 lfac
    #node_out vec3 lcolorint
    #node_out float norm_fac

    // unpack light_factors
    lfac = vec2(u_light_positions[LAMP_IND].w, u_light_color_intensities[LAMP_IND].w);
# node_if LAMP_TYPE == HEMI
    norm_fac = _0_5;
# node_else
    norm_fac = _0_0;
# node_endif

    // 0.0 - full shadow, 1.0 - no shadow
    lcolorint = u_light_color_intensities[LAMP_IND].xyz;
# node_if LAMP_SHADOW_MAP_IND != -1
    lcolorint *= shadow_factor[LAMP_SHADOW_MAP_IND];
# node_endif

# node_if LAMP_TYPE == SPOT || LAMP_TYPE == POINT
    vec3 lpos = u_light_positions[LAMP_IND].xyz;
    ldir = lpos - nin_pos_world;

    // calc attenuation, falloff_type = "INVERSE_SQUARE"
    float dist = length(ldir);

    float vis_factor = LAMP_LIGHT_DIST / (LAMP_LIGHT_DIST + dist * dist);

    ldir = normalize(ldir);

#  node_if LAMP_TYPE == SPOT
    // spot shape like in Blender,
    // source/blender/gpu/shaders/gpu_shader_material.glsl
    vec3 ldirect = u_light_directions[LAMP_IND];
    float spot_factor = dot(ldir, ldirect);
    spot_factor *= smoothstep(_0_0, _1_0,
                              (spot_factor - LAMP_SPOT_SIZE) / LAMP_SPOT_BLEND);
    vis_factor *= spot_factor;
#  node_endif

#  node_if LAMP_USE_SPHERE
    vis_factor *= max(LAMP_LIGHT_DIST - dist, _0_0) / LAMP_LIGHT_DIST;
#  node_endif

    lcolorint *= vis_factor;
# node_else // LAMP_TYPE == SPOT || LAMP_TYPE == POINT
    ldir = u_light_directions[LAMP_IND];
# node_endif // LAMP_TYPE == SPOT || LAMP_TYPE == POINT
#endnode

#node DIFFUSE_FRESNEL
    #node_var MAT_USE_TBN_SHADING 0
    #node_in vec3 ldir
    #node_in vec2 lfac
    #node_in vec3 normal
    #node_in float norm_fac
    #node_in vec2 dif_params
    #node_out float lfactor

# node_if MAT_USE_TBN_SHADING
    vec3 crss = cross(ldir, v_shade_tang.xyz);
    normal = cross(crss, v_shade_tang.xyz);
    normal = -normalize(normal);
# node_endif

    lfactor = _0_0;
    if (lfac.r != _0_0) {
        float dot_nl = (_1_0 - norm_fac) * dot(normal, ldir) + norm_fac;

        if (dif_params[0] == _0_0) {
            lfactor = _1_0;
        } else {
            float t = _1_0 + abs(dot_nl);
            t = dif_params[1] + (_1_0 - dif_params[1]) * pow(t, dif_params[0]);
            lfactor = clamp(t, _0_0, _1_0);
        }
        lfactor = max(lfactor, _0_0);
    }
#endnode

#node DIFFUSE_LAMBERT
    #node_var MAT_USE_TBN_SHADING 0
    #node_in vec3 ldir
    #node_in vec2 lfac
    #node_in vec3 normal
    #node_in float norm_fac
    #node_out float lfactor

# node_if MAT_USE_TBN_SHADING
    vec3 crss = cross(ldir, v_shade_tang.xyz);
    normal = cross(crss, v_shade_tang.xyz);
    normal = -normalize(normal);
# node_endif

    lfactor = _0_0;
    if (lfac.r != _0_0) {
        float dot_nl = (_1_0 - norm_fac) * dot(normal, ldir) + norm_fac;

        lfactor = max(dot_nl, _0_0);
    }
#endnode

#node DIFFUSE_OREN_NAYAR
    #node_var MAT_USE_TBN_SHADING 0
    #node_in vec3 ldir
    #node_in vec2 lfac
    #node_in vec3 normal
    #node_in float norm_fac
    #node_in vec2 dif_params
    #node_out float lfactor

# node_if MAT_USE_TBN_SHADING
    vec3 crss = cross(ldir, v_shade_tang.xyz);
    normal = cross(crss, v_shade_tang.xyz);
    normal = -normalize(normal);
# node_endif

    lfactor = _0_0;
    if (lfac.r != _0_0) {
        float dot_nl = (_1_0 - norm_fac) * dot(normal, ldir) + norm_fac;

        if (dif_params[0] > _0_0) {
            float nv = max(dot(normal, nin_eye_dir), _0_0);
            float sigma_sq = dif_params[0] * dif_params[0];
            float A = _1_0 - _0_5 * (sigma_sq / (sigma_sq + 0.33));

            vec3 l_diff = ldir - dot_nl*normal;
            vec3 e_diff = nin_eye_dir - nv*normal;
            // handle normalize() and acos() values which may result to
            // "undefined behavior"
            // (noticeable for "mediump" precision, nin_eye_dir.g some mobile devies)
            if (length(l_diff) == _0_0 || length(e_diff) == _0_0 ||
                    abs(dot_nl) > _1_0 || abs(nv) > _1_0)
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

                float t = max(dot(Lit_B, View_B), _0_0);
                float B = 0.45 * (sigma_sq / (sigma_sq +  0.09));
                lfactor = dot_nl * (A + (B * t * sin(a) * tan(b)));
            }
        } else
            lfactor = dot_nl;
        lfactor = max(lfactor, _0_0);
    }
#endnode

#node DIFFUSE_MINNAERT
    #node_var MAT_USE_TBN_SHADING 0
    #node_in vec3 ldir
    #node_in vec2 lfac
    #node_in vec3 normal
    #node_in float norm_fac
    #node_in vec2 dif_params
    #node_out float lfactor

# node_if MAT_USE_TBN_SHADING
    vec3 crss = cross(ldir, v_shade_tang.xyz);
    normal = cross(crss, v_shade_tang.xyz);
    normal = -normalize(normal);
# node_endif

    lfactor = _0_0;
    if (lfac.r != _0_0) {
        float dot_nl = (_1_0 - norm_fac) * dot(normal, ldir) + norm_fac;
        float nv = max(dot(normal, nin_eye_dir), _0_0);

        if (dif_params[0] <= _1_0)
            lfactor = dot_nl * pow(max(nv * dot_nl, 0.1), dif_params[0] - _1_0);
        else
            lfactor = dot_nl * pow(1.0001 - nv, dif_params[0] - _1_0);
        lfactor = max(lfactor, _0_0);
    }
#endnode

#node DIFFUSE_TOON
    #node_var MAT_USE_TBN_SHADING 0
    #node_in vec3 ldir
    #node_in vec2 lfac
    #node_in vec3 normal
    #node_in float norm_fac
    #node_in vec2 dif_params
    #node_out float lfactor

# node_if MAT_USE_TBN_SHADING
    vec3 crss = cross(ldir, v_shade_tang.xyz);
    normal = cross(crss, v_shade_tang.xyz);
    normal = -normalize(normal);
# node_endif

    lfactor = _0_0;
    if (lfac.r != _0_0) {
        float dot_nl = (_1_0 - norm_fac) * dot(normal, ldir) + norm_fac;
        float ang = acos(dot_nl);

        if (ang < dif_params[0])
            lfactor = _1_0;
        else if (ang > (dif_params[0] + dif_params[1]) || dif_params[1] == _0_0)
                lfactor = _0_0;
            else
                lfactor = _1_0 - ((ang - dif_params[0])/dif_params[1]);
        lfactor = max(lfactor, _0_0);
    }
#endnode

#node SPECULAR_PHONG
    #node_var MAT_USE_TBN_SHADING 0
    #node_in vec3 ldir
    #node_in vec2 lfac
    #node_in vec3 normal
    #node_in float norm_fac
    #node_in vec2 sp_params
    #node_out float sfactor

    sfactor = _0_0;
    if (lfac.g != _0_0) {
        vec3 halfway = normalize(ldir + nin_eye_dir);

# node_if MAT_USE_TBN_SHADING
        if (norm_fac == _0_0) {
            sfactor = dot(v_shade_tang.xyz, halfway);
            sfactor = sqrt(_1_0 - sfactor * sfactor);
        }
# node_else
        sfactor = (_1_0 - norm_fac) * max(dot(normal, halfway),
                         _0_0) + norm_fac;
# node_endif
        sfactor = pow(sfactor, sp_params[0]);
    }
#endnode

#node SPECULAR_COOKTORR
    #node_var MAT_USE_TBN_SHADING 0
    #node_in vec3 ldir
    #node_in vec2 lfac
    #node_in vec3 normal
    #node_in float norm_fac
    #node_in vec2 sp_params
    #node_out float sfactor

    sfactor = _0_0;

    if (lfac.g != _0_0) {
        vec3 halfway = normalize(ldir + nin_eye_dir);

# node_if MAT_USE_TBN_SHADING
        if (norm_fac == _0_0) {
            sfactor = dot(v_shade_tang.xyz, halfway);
            sfactor = sqrt(_1_0 - sfactor * sfactor);
        }
# node_else
        sfactor = max(dot(normal, halfway), _0_0);
        sfactor = (_1_0 - norm_fac) * sfactor + norm_fac;
# node_endif

# node_if MAT_USE_TBN_SHADING
        float nv = max(dot(v_shade_tang.xyz, nin_eye_dir), _0_0);
        nv = sqrt(_1_0 - nv * nv);
# node_else
        float nv = max(dot(normal, nin_eye_dir), _0_0);
# node_endif

        sfactor = pow(sfactor, sp_params[0]);

        sfactor = sfactor / (0.1 + nv);
    }
#endnode

#node SPECULAR_WARDISO
    #node_var MAT_USE_TBN_SHADING 0
    #node_in vec3 ldir
    #node_in vec2 lfac
    #node_in vec3 normal
    #node_in float norm_fac
    #node_in vec2 sp_params
    #node_out float sfactor

    sfactor = _0_0;
    if (lfac.g != _0_0) {
        vec3 halfway = normalize(ldir + nin_eye_dir);
# node_if MAT_USE_TBN_SHADING
        float nh = _0_0;
        float nv = _0_0;
        float nl = _0_0;
        if (norm_fac == _0_0) {
            nh = dot(v_shade_tang.xyz, halfway);
            nv = dot(v_shade_tang.xyz, nin_eye_dir);
            nl = dot(v_shade_tang.xyz, ldir);
            nh = sqrt(_1_0 - nh * nh);
            nv = sqrt(_1_0 - nv * nv);
            nl = sqrt(_1_0 - nl * nl);
        }
# node_else
        float nh = max(dot(normal, halfway), 0.01);
        // NOTE: 0.01 for mobile devices
        float nv = max(dot(normal, nin_eye_dir), 0.01);
        float nl = max(dot(normal, ldir), 0.01);
# node_endif
        float angle = tan(acos(nh));
        float alpha = max(sp_params[0], 0.01);

        sfactor = nl * (_1_0/(4.0*M_PI*alpha*alpha))
                  * (exp(-(angle * angle) / (alpha * alpha)) /(sqrt(nv * nl)));
    }
#endnode

#node SPECULAR_TOON
    #node_var MAT_USE_TBN_SHADING 0
    #node_in vec3 ldir
    #node_in vec2 lfac
    #node_in vec3 normal
    #node_in float norm_fac
    #node_in vec2 sp_params
    #node_out float sfactor

    sfactor = _0_0;
    if (lfac.g != _0_0) {
        vec3 h = normalize(ldir + nin_eye_dir);
# node_if MAT_USE_TBN_SHADING
        float cosinus = dot(h, v_shade_tang.xyz);
        float angle = sp_params[0] + sp_params[1];
        if (norm_fac == _0_0)
            angle = acos(sqrt(_1_0 - cosinus * cosinus));
# node_else
        float angle = acos(dot(h, normal));
# node_endif

        if (angle < sp_params[0])
            sfactor = _1_0;
        else if (angle >= sp_params[0] + sp_params[1] || sp_params[1] == _0_0)
            sfactor = _0_0;
        else
            sfactor = _1_0 - (angle - sp_params[0]) / sp_params[1];
    }
#endnode

#node SPECULAR_BLINN
    #node_var MAT_USE_TBN_SHADING 0
    #node_in vec3 ldir
    #node_in vec2 lfac
    #node_in vec3 normal
    #node_in float norm_fac
    #node_in vec2 sp_params
    #node_out float sfactor

    sfactor = _0_0;
    if (lfac.g != _0_0) {
        if (sp_params[0] < 1.0 || sp_params[1] == _0_0)
            sfactor = _0_0;
        else {
            if (sp_params[1] < 100.0)
                sp_params[1]= sqrt(1.0 / sp_params[1]);
            else
                sp_params[1]= 10.0 / sp_params[1];

            vec3 halfway = normalize(nin_eye_dir + ldir);
# node_if MAT_USE_TBN_SHADING
            float nh = 0.0;
            if (norm_fac == _0_0) {
                float dot_ht = dot(v_shade_tang.xyz, halfway);
                nh = sqrt(_1_0 - dot_ht * dot_ht);
            }
# node_else
            float nh = (_1_0 - norm_fac) * max(dot(normal, halfway),
                         _0_0) + norm_fac;
# node_endif
            if (nh < _0_0)
                sfactor = _0_0;
            else {
                float nv = max(dot(normal, nin_eye_dir), 0.01);
                float nl = dot(normal, ldir);
                if (nl <= 0.01)
                    sfactor = _0_0;
                else {
                    float vh = max(dot(nin_eye_dir, halfway), 0.01);

                    float a = _1_0;
                    float b = (2.0 * nh * nv) / vh;
                    float c = (2.0 * nh * nl) / vh;

                    float g = min(min(a, b), c);

                    float p = sqrt(pow(sp_params[0], 2.0) + pow(vh, 2.0) - _1_0);
                    float f = pow(p - vh, 2.0) / pow(p + vh, 2.0) * (_1_0 
                            + pow(vh * (p + vh) - _1_0, 2.0)/pow(vh * (p - vh) 
                            + _1_0, 2.0));
                    float ang = acos(nh);
                    sfactor = max(f * g * exp(-pow(ang, 2.0) / (2.0 * pow(sp_params[1], 2.0))), 
                            _0_0);
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

#endif
