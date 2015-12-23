#var EPSILON 0.0001
#export is_equal3f
#export identity qrot rotation_x rotation_y rotation_z qinv
#export vertex
#export tbn_norm
#export tsr_translate
#export tsr_translate_inv
#export clip_to_tex
#export tsr_to_mat4

float ZERO_VALUE_MATH = 0.0;
float UNITY_VALUE_MATH = 1.0;

struct vertex
{
    vec3 position;
    vec3 center;
    vec3 tangent;
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
    return vec4(-quat.xyz, quat.w) / dot(quat, quat);
}

vec3 tsr_translate(vec4 trans, vec4 quat, vec4 vec)
{
    // scale
    vec3 dest = vec.xyz * trans.w;
    // quat * vec
    dest = qrot(quat, dest);
    // translate
    dest += trans.xyz * vec.w;

    return dest;
}

// translate vec4 with tsr in inverse direction
vec3 tsr_translate_inv(vec4 trans, vec4 quat, vec4 vec)
{
    // translate
    vec3 dest = vec.xyz - trans.xyz * vec.w;
    // inverse quat * vec
    vec4 quat_inv = qinv(quat);
    dest = qrot(quat_inv, dest);
    // scale
    dest /= trans.w;

    return dest;
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
    return mat4(UNITY_VALUE_MATH, ZERO_VALUE_MATH, ZERO_VALUE_MATH, ZERO_VALUE_MATH,
                ZERO_VALUE_MATH, UNITY_VALUE_MATH, ZERO_VALUE_MATH, ZERO_VALUE_MATH,
                ZERO_VALUE_MATH, ZERO_VALUE_MATH, UNITY_VALUE_MATH, ZERO_VALUE_MATH,
                ZERO_VALUE_MATH, ZERO_VALUE_MATH, ZERO_VALUE_MATH, UNITY_VALUE_MATH);
}

mat4 rotation_x(float angle) {
    return mat4(UNITY_VALUE_MATH, ZERO_VALUE_MATH, ZERO_VALUE_MATH, ZERO_VALUE_MATH,
                ZERO_VALUE_MATH, cos(angle), sin(angle), ZERO_VALUE_MATH,
                ZERO_VALUE_MATH,-sin(angle), cos(angle), ZERO_VALUE_MATH,
                ZERO_VALUE_MATH, ZERO_VALUE_MATH, ZERO_VALUE_MATH, UNITY_VALUE_MATH);
}

mat4 rotation_y(float angle) {
    return mat4(cos(angle), ZERO_VALUE_MATH,-sin(angle), ZERO_VALUE_MATH,
                ZERO_VALUE_MATH, UNITY_VALUE_MATH, ZERO_VALUE_MATH, ZERO_VALUE_MATH,
                sin(angle), ZERO_VALUE_MATH, cos(angle), ZERO_VALUE_MATH,
                ZERO_VALUE_MATH, ZERO_VALUE_MATH, ZERO_VALUE_MATH, UNITY_VALUE_MATH);
}

mat4 rotation_z(float angle) {
    return mat4(cos(angle), sin(angle), ZERO_VALUE_MATH, ZERO_VALUE_MATH,
               -sin(angle), cos(angle), ZERO_VALUE_MATH, ZERO_VALUE_MATH,
                ZERO_VALUE_MATH, ZERO_VALUE_MATH, UNITY_VALUE_MATH, ZERO_VALUE_MATH,
                ZERO_VALUE_MATH, ZERO_VALUE_MATH, ZERO_VALUE_MATH, UNITY_VALUE_MATH);
}

vertex tbn_norm(in vertex v) {
    return vertex(v.position, v.center, normalize(v.tangent),
            normalize(v.binormal), normalize(v.normal), v.color);
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

mat4 tsr_to_mat4(mat3 t) {
    mat4 matrix;

    // NOTE: for IPad compatibility
    matrix[0][0] = (UNITY_VALUE_MATH - (t[1][2] * (t[1][2] + t[1][2]) + t[2][0] * (t[2][0] + t[2][0]))) * t[1][0];
    matrix[0][1] = (t[1][1] * (t[1][2] + t[1][2]) + t[2][1] * (t[2][0] + t[2][0])) * t[1][0];
    matrix[0][2] = (t[1][1] * (t[2][0] + t[2][0]) - t[2][1] * (t[1][2] + t[1][2])) * t[1][0];
    matrix[0][3] = ZERO_VALUE_MATH;
    matrix[1][0] = (t[1][1] * (t[1][2] + t[1][2]) - t[2][1] * (t[2][0] + t[2][0])) * t[1][0];
    matrix[1][1] = (UNITY_VALUE_MATH - (t[1][1] * (t[1][1] + t[1][1]) + t[2][0] * (t[2][0] + t[2][0]))) * t[1][0];
    matrix[1][2] = (t[1][2] * (t[2][0] + t[2][0]) + t[2][1] * (t[1][1] + t[1][1])) * t[1][0];
    matrix[1][3] = ZERO_VALUE_MATH;
    matrix[2][0] = (t[1][1] * (t[2][0] + t[2][0]) + t[2][1] * (t[1][2] + t[1][2])) * t[1][0];
    matrix[2][1] = (t[1][2] * (t[2][0] + t[2][0]) - t[2][1] * (t[1][1] + t[1][1])) * t[1][0];
    matrix[2][2] = (UNITY_VALUE_MATH - (t[1][1] * (t[1][1] + t[1][1]) + t[1][2] * (t[1][2] + t[1][2]))) * t[1][0];
    matrix[2][3] = ZERO_VALUE_MATH;
    matrix[3][0] = t[0][0];
    matrix[3][1] = t[0][1];
    matrix[3][2] = t[0][2];
    // NOTE: for IPad3. UNITY_VALUE_MATH doesn't work
    matrix[3][3] = 1.0;

    return matrix;
}