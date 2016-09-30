#ifndef MATH_GLSLV
#define MATH_GLSLV

/*==============================================================================
                                    VARS
==============================================================================*/
#var EPSILON 0.000001
#var REFLECTION_TYPE REFL_NONE
#var REFRACTIVE 0
#var SHADOW_USAGE NO_SHADOWS

/*============================================================================*/

#include <std.glsl>

struct vertex
{
    vec3 position;
    vec3 center;
    vec3 tangent;
    vec3 shade_tang;
    vec3 binormal;
    vec3 normal;
    vec3 color;
};

/*
bool is_equalf(float a, float b) {
    return abs(a - b) < EPSILON;
}
*/

bool is_equal3f(vec3 a, vec3 b) {
    return any(lessThan(abs(a - b), vec3(EPSILON)));
}

vec3 qrot(in vec4 q, in vec3 v)
{
    return v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v);
}

vec4 qinv(in vec4 quat) {
    // NOTE: input quaternions should be always in normalized form
    //return vec4(-quat.xyz, quat.w) / dot(quat, quat);
    return vec4(-quat.xyz, quat.w);
}

vec4 qmult(in vec4 a, in vec4 b) {
    vec4 dest;

    dest.x = a.x * b.w + a.w * b.x + a.y * b.z - a.z * b.y;
    dest.y = a.y * b.w + a.w * b.y + a.z * b.x - a.x * b.z;
    dest.z = a.z * b.w + a.w * b.z + a.x * b.y - a.y * b.x;
    dest.w = a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z;

    return dest;
}

vec4 qsetAxisAngle(in vec3 axis, in float rad) {
    vec4 dest;
    rad = rad * 0.5;
    float s = sin(rad);

    dest.x = s * axis[0];
    dest.y = s * axis[1];
    dest.z = s * axis[2];
    dest.w = cos(rad);

    return dest;
}

vec4 qfrom_dir(in vec3 dir, in vec3 ident) {
    vec4 dest;

    float d = dot(ident, dir);
    vec3 cr = cross(ident, dir);
    dest.xyz = cr.xyz;
    dest.w = 1.0 + d;

    return normalize(dest);
}

vec3 tsr_transform(vec4 trans, vec4 quat, vec3 vec)
{
    // scale
    vec3 dest = vec * trans.w;
    // quat * vec
    dest = qrot(quat, dest);
    // translate
    dest += trans.xyz;

    return dest;
}

vec3 tsr9_transform(mat3 tsr, vec3 vec)
{
    // scale
    vec3 dest = vec * tsr[1][0];
    // quat * vec
    vec4 quat = vec4(tsr[1][1], tsr[1][2], tsr[2][0], tsr[2][1]);
    dest = qrot(quat, dest);
    // translate
    dest += tsr[0];

    return dest;
}

vec3 tsr_transform_dir(vec4 trans, vec4 quat, vec3 dir)
{
    // scale
    vec3 dest = dir * trans.w;
    // quat * dir
    dest = qrot(quat, dest);

    return dest;
}

vec3 tsr9_transform_dir(mat3 tsr, vec3 dir)
{
    // scale
    vec3 dest = dir * tsr[1][0];
    // quat * dir
    vec4 quat = vec4(tsr[1][1], tsr[1][2], tsr[2][0], tsr[2][1]);
    dest = qrot(quat, dest);

    return dest;
}

// translate vector with tsr in inverse direction
vec3 tsr_transform_inv(vec4 trans, vec4 quat, vec3 vec)
{
    // translate
    vec3 dest = vec - trans.xyz;
    // inverse quat * vec
    dest = qrot(qinv(quat), dest);
    // scale
    dest /= trans.w;

    return dest;
}

// translate directional vector with tsr in inverse direction
vec3 tsr_transform_inv_dir(vec4 trans, vec4 quat, vec3 dir)
{
    return qrot(qinv(quat), dir) / trans.w;
}

/*
vec3 qrot(in vec4 quat, in vec3 vec)
{
    float x = vec[0], y = vec[1], z = vec[2],
        qx = quat[0], qy = quat[1], qz = quat[2], qw = quat[3];

    // calculate quat * vec
    float ix = qw * x + qy * z - qz * y;
    float iy = qw * y + qz * x - qx * z;
    float iz = qw * z + qx * y - qy * x;
    float iw = -qx * x - qy * y - qz * z;

    vec3 dest;

    // calculate result * inverse quat
    dest[0] = ix * qw + iw * -qx + iy * -qz - iz * -qy;
    dest[1] = iy * qw + iw * -qy + iz * -qx - ix * -qz;
    dest[2] = iz * qw + iw * -qz + ix * -qy - iy * -qx;

    return dest;
}
*/
/*
mat3 mat3_transpose(mat3 m) {
    mat3 m_out = m;
    m_out[0][1] = m[1][0];
    m_out[0][2] = m[2][0];
    m_out[1][0] = m[0][1];
    m_out[1][2] = m[2][1];
    m_out[2][0] = m[0][2];
    m_out[2][1] = m[1][2];
    return m_out;
}
*/
mat4 identity() {
    return mat4(_1_0, _0_0, _0_0, _0_0,
                _0_0, _1_0, _0_0, _0_0,
                _0_0, _0_0, _1_0, _0_0,
                _0_0, _0_0, _0_0, _1_0);
}

mat4 rotation_x(float angle) {
    return mat4(_1_0, _0_0, _0_0, _0_0,
                _0_0, cos(angle), sin(angle), _0_0,
                _0_0,-sin(angle), cos(angle), _0_0,
                _0_0, _0_0, _0_0, _1_0);
}

mat4 rotation_y(float angle) {
    return mat4(cos(angle), _0_0,-sin(angle), _0_0,
                _0_0, _1_0, _0_0, _0_0,
                sin(angle), _0_0, cos(angle), _0_0,
                _0_0, _0_0, _0_0, _1_0);
}

mat4 rotation_z(float angle) {
    return mat4(cos(angle), sin(angle), _0_0, _0_0,
               -sin(angle), cos(angle), _0_0, _0_0,
                _0_0, _0_0, _1_0, _0_0,
                _0_0, _0_0, _0_0, _1_0);
}

vertex tbn_norm(in vertex v) {
    return vertex(v.position, v.center, normalize(v.tangent),
            normalize(v.shade_tang), normalize(v.binormal), normalize(v.normal), v.color);
}

#if REFLECTION_TYPE == REFL_PLANE || SHADOW_USAGE == SHADOW_MAPPING_OPAQUE \
        || REFRACTIVE || USE_NODE_B4W_REFRACTION
vec3 clip_to_tex(vec4 pos_clip) {
    float xc = pos_clip.x;
    float yc = pos_clip.y;
    float wc = pos_clip.w;

    vec3 tex_pos_clip;

    tex_pos_clip.x = (xc + wc) / 2.0;
    tex_pos_clip.y = (yc + wc) / 2.0;
    tex_pos_clip.z = wc;

    return tex_pos_clip;
}
#endif

mat3 tsr_identity() {
    return mat3(_0_0, _0_0, _0_0,
                _1_0, _0_0, _0_0,
                _0_0, _1_0, _0_0);
}

mat4 tsr_to_mat4(mat3 t) {
    mat4 matrix;

    // NOTE: for IPad compatibility
    matrix[0][0] = (_1_0 - (t[1][2] * (t[1][2] + t[1][2]) + t[2][0] * (t[2][0] + t[2][0]))) * t[1][0];
    matrix[0][1] = (t[1][1] * (t[1][2] + t[1][2]) + t[2][1] * (t[2][0] + t[2][0])) * t[1][0];
    matrix[0][2] = (t[1][1] * (t[2][0] + t[2][0]) - t[2][1] * (t[1][2] + t[1][2])) * t[1][0];
    matrix[0][3] = _0_0;
    matrix[1][0] = (t[1][1] * (t[1][2] + t[1][2]) - t[2][1] * (t[2][0] + t[2][0])) * t[1][0];
    matrix[1][1] = (_1_0 - (t[1][1] * (t[1][1] + t[1][1]) + t[2][0] * (t[2][0] + t[2][0]))) * t[1][0];
    matrix[1][2] = (t[1][2] * (t[2][0] + t[2][0]) + t[2][1] * (t[1][1] + t[1][1])) * t[1][0];
    matrix[1][3] = _0_0;
    matrix[2][0] = (t[1][1] * (t[2][0] + t[2][0]) + t[2][1] * (t[1][2] + t[1][2])) * t[1][0];
    matrix[2][1] = (t[1][2] * (t[2][0] + t[2][0]) - t[2][1] * (t[1][1] + t[1][1])) * t[1][0];
    matrix[2][2] = (_1_0 - (t[1][1] * (t[1][1] + t[1][1]) + t[1][2] * (t[1][2] + t[1][2]))) * t[1][0];
    matrix[2][3] = _0_0;
    matrix[3][0] = t[0][0];
    matrix[3][1] = t[0][1];
    matrix[3][2] = t[0][2];
    // NOTE: for IPad3. _1_0 doesn't work
    matrix[3][3] = 1.0;

    return matrix;
}

mat3 tsr_multiply(in mat3 tsr, in mat3 tsr2) {
    mat3 dest;
    // translate
    vec3 vec = tsr2[0];
    vec4 trans = vec4(tsr[0], tsr[1][0]);
    vec4 quat = vec4(tsr[1][1], tsr[1][2], tsr[2][0], tsr[2][1]);
    dest[0] = tsr_transform(trans, quat, vec);
    // scale
    dest[1][0] = tsr[1][0] * tsr2[1][0];
    // quat
    dest[1][1] = tsr[1][1] * tsr2[2][1] + tsr[2][1] * tsr2[1][1] + tsr[1][2] * tsr2[2][0] - tsr[2][0] * tsr2[1][2];
    dest[1][2] = tsr[1][2] * tsr2[2][1] + tsr[2][1] * tsr2[1][2] + tsr[2][0] * tsr2[1][1] - tsr[1][1] * tsr2[2][0];
    dest[2][0] = tsr[2][0] * tsr2[2][1] + tsr[2][1] * tsr2[2][0] + tsr[1][1] * tsr2[1][2] - tsr[1][2] * tsr2[1][1];
    dest[2][1] = tsr[2][1] * tsr2[2][1] - tsr[1][1] * tsr2[1][1] - tsr[1][2] * tsr2[1][2] - tsr[2][0] * tsr2[2][0];
    return dest;
}

mat3 tsr_set_quat(in vec4 quat, in mat3 tsr) {
    mat3 dest;
    // translation
    dest[0] = tsr[0];
    // scale
    dest[1][0] = tsr[1][0];
    // quat
    dest[1][1] = quat[0];
    dest[1][2] = quat[1];
    dest[2][0] = quat[2];
    dest[2][1] = quat[3];
    return dest;
}

#endif
