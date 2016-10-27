#ifndef BLENDING_GLSLF
#define BLENDING_GLSLF

vec3 rgb_to_hsv(vec3 rgb)
{
    vec4 k = vec4(_0_0, -_1_0 / 3.0, 2.0 / 3.0, -_1_0);
    vec4 p = mix(vec4(rgb.bg, k.wz), vec4(rgb.gb, k.xy), step(rgb.b, rgb.g));
    vec4 q = mix(vec4(p.xyw, rgb.r), vec4(rgb.r, p.yzx), step(p.x, rgb.r));

    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10;
    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

vec3 hsv_to_rgb(vec3 hsv)
{
    vec4 k = vec4(_1_0, 2.0 / 3.0, _1_0 / 3.0, 3.0);
    vec3 p = abs(fract(vec3(hsv.r, hsv.r, hsv.r) + k.xyz) * 6.0 - k.www);
    return hsv.b * mix(k.xxx, clamp(p - k.xxx, _0_0, _1_0), hsv.g);
}

vec3 col_blend(vec3 col1, vec3 col2, float fact)
{
    return mix(col1, col2, fact);
}

vec3 col_add(vec3 col1, vec3 col2, float fact)
{
    return fact * col1 + col2;
}

vec3 col_sub(vec3 col1, vec3 col2, float fact)
{
    return col2 - fact * col1;
}

vec3 col_mul(vec3 col1, vec3 col2, float fact)
{
    float facm = _1_0 - fact;
    return (vec3(facm) + fact * col1) * col2;
}

vec3 col_screen(vec3 col1, vec3 col2, float fact)
{
    vec3 facm = vec3(_1_0 - fact);
    return vec3(_1_0) - (facm + fact * (vec3(_1_0) - col1)) * (vec3(_1_0) - col2);
}

vec3 col_overlay(vec3 col1, vec3 col2, float fact)
{
    vec3 facm = vec3(_1_0 - fact);
    return mix(col2 * (facm + 2.0 * fact * col1),
            vec3(_1_0) - (facm + 2.0 * fact * (vec3(_1_0) - col1)) * (vec3(_1_0) - col2),
            step(0.5, col2));
}

vec3 col_diff(vec3 col1, vec3 col2, float fact)
{
    return mix(col2, abs(col1 - col2), fact);
}

vec3 col_div(vec3 col1, vec3 col2, float fact)
{
    return mix(col2, col2 / (col1 + step(col1, vec3(_0_0))), fact);
}

vec3 col_dark(vec3 col1, vec3 col2, float fact)
{
    return mix(col2, min(col1, col2), fact);
}

vec3 col_light(vec3 col1, vec3 col2, float fact)
{
    return max(fact * col1, col2);
}

vec3 col_hue(vec3 col1, vec3 col2, float fact)
{
    vec3 c1 = rgb_to_hsv(col2);
    if (c1.y != _0_0) {
        vec3 c2 = rgb_to_hsv(col1);
        vec3 c3 = hsv_to_rgb(vec3(c1.x, c2.yz));
        return mix(col1, c3, fact);
    }
    return col1;
}

vec3 col_sat(vec3 col1, vec3 col2, float fact)
{
    vec3 c1 = rgb_to_hsv(col1);
    if (c1.y != _0_0) {
        vec3 c2 = rgb_to_hsv(col2);
        return hsv_to_rgb(vec3(c1.x, mix(c1.y, c2.y, fact), c1.z));
    }
    return col1;
}

vec3 col_val(vec3 col1, vec3 col2, float fact)
{
    vec3 c1 = rgb_to_hsv(col1);
    vec3 c2 = rgb_to_hsv(col2);
    return hsv_to_rgb(vec3(c1.xy, mix(c1.z, c2.z, fact)));
}

vec3 col_color(vec3 col1, vec3 col2, float fact)
{
    vec3 c1 = rgb_to_hsv(col2);
    if (c1.y != _0_0) {
        vec3 c2 = rgb_to_hsv(col1);
        vec3 c3 = hsv_to_rgb(vec3(c1.xy, c2.z));
        return mix(col1, c3, fact);
    }
    return col1;
}

vec3 col_soft_light(vec3 col1, vec3 col2, float fact)
{
    vec3 sc = vec3(_1_0) - (vec3(_1_0) - col2) * (vec3(_1_0) - col1);
    return mix(col1, ((vec3(_1_0) - col1) * col2 * col1) + col1 * sc, fact);
}

vec3 col_lin_light(vec3 col1, vec3 col2, float fact)
{
    return col1 + fact * (2.0 * col2 - _1_0);
}

float val_mul(float val1, float val2, float fact, float facg)
{
    float facm = _1_0 - facg;
    return (facm + fact * val1) * val2;
}

float val_screen(float val1, float val2, float fact, float facg)
{
    float facm = _1_0 - facg;
    return _1_0 - (facm + fact * (_1_0 - val1)) * (_1_0 - val2);
}

float val_overlay(float val1, float val2, float fact, float facg)
{
    float facm = _1_0 - facg;
    return mix(val2 * (facm + 2.0 * fact * val1),
            _1_0 - (facm + 2.0 * fact * (_1_0 - val1)) * (_1_0 - val2),
            step(0.5, val2));
}
#endif
