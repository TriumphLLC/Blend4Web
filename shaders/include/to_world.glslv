#ifndef TO_WORLD_GLSLV
#define TO_WORLD_GLSLV

#include <math.glslv>

/*==============================================================================
                                    VARS
==============================================================================*/
#var BILLBOARD_ALIGN BILLBOARD_ALIGN_VIEW
#var USE_INSTANCED_PARTCLS 0
#var BILLBOARD_SPHERICAL 0
#var BILLBOARD_RANDOM 0
#var BILLBOARD 0
#var BILLBOARD_JITTERED 0
#var BILLBOARD_PRES_GLOB_ORIENTATION 0
#var STATIC_BATCH 0
#var REFLECTION_PASS REFL_PASS_NONE
/*============================================================================*/

#define MAX_BILLBOARD_ANGLE M_PI_4

#if BILLBOARD_SPHERICAL || !BILLBOARD && (BILLBOARD_ALIGN == BILLBOARD_ALIGN_VIEW)
mat3 billboard_spherical(vec3 center_pos, mat3 view_tsr) {
    vec4 bb_q = vec4(view_tsr[1][1], view_tsr[1][2], view_tsr[2][0],view_tsr[2][1]);
    // NOTE: camera is rotated downward by default,
    // inversed vertex order during reflection pass
#if REFLECTION_PASS == REFL_PASS_PLANE
    vec4 right_q = qsetAxisAngle(RIGHT_VECTOR, -M_PI/2.0);
#else
    vec4 right_q = qsetAxisAngle(RIGHT_VECTOR, M_PI/2.0);
#endif
    bb_q = qmult(right_q, bb_q);
    bb_q = qinv(bb_q);

    mat3 bb_tsr = tsr_identity();
    bb_tsr[0] = center_pos;
    bb_tsr = tsr_set_quat(bb_q, bb_tsr);

    return bb_tsr;
}
#else
mat3 billboard_cylindrical(vec3 camera_eye, vec3 center_pos) {
    vec3 center_to_cam = camera_eye - center_pos;
    center_to_cam.z = 0.0;
    center_to_cam = normalize(center_to_cam);

    vec4 bb_q = qfrom_dir(center_to_cam, TOWARD_VECTOR);
    mat3 bb_tsr = tsr_identity();
    bb_tsr[0] = center_pos;
    bb_tsr = tsr_set_quat(bb_q, bb_tsr);

    return bb_tsr;
}
#endif // BILLBOARD_SPHERICAL


#if BILLBOARD_JITTERED
mat3 bend_jitter_rotate_tsr(in vec3 wind_world, float wind_param, float jitter_amp,
        float jitter_freq, vec3 vec_seed, mat3 model_tsr) {

    float seed = fract(length(vec_seed) / 0.17); // [0, 1]
    float rand_freq = jitter_freq + seed / 10.0; // + 0%-10%
    float rand_phase = seed;
    if (jitter_freq != 0.0)
        rand_phase /= jitter_freq ; //  [0, 1/freq]

    wind_world *= 1.0 + 0.5 * sin(wind_param); // make wind gusty

    // jitter rotation angle
    float bj_angle = length(wind_world) * jitter_amp * sin(2.0*3.14 * wind_param
            * rand_freq + rand_phase);
    vec4 bj_quat = qsetAxisAngle(TOWARD_VECTOR, bj_angle);

    // rotate tsr from the right
    vec4 model_quat = vec4(model_tsr[1][1], model_tsr[1][2], model_tsr[2][0], model_tsr[2][1]);
    model_quat = qmult(model_quat, bj_quat);
    model_tsr = tsr_set_quat(model_quat, model_tsr);

    return model_tsr;
}
#endif

mat3 billboard_tsr(in vec3 camera_eye, in vec3 wcen, in mat3 view_tsr) {
#if BILLBOARD_SPHERICAL || !BILLBOARD && (BILLBOARD_ALIGN == BILLBOARD_ALIGN_VIEW)
    mat3 bill_tsr = billboard_spherical(wcen, view_tsr);
#elif BILLBOARD_RANDOM
    // get initial random rotation angle
    float seed = fract((wcen.x * 1.43 - wcen.z * 0.123 + wcen.y * 6.1));
    float alpha_rand = 2.0 * M_PI * seed;

    vec4 view_quat = vec4(view_tsr[1][1], view_tsr[1][2], view_tsr[2][0], view_tsr[2][1]);
    float alpha_cam = asin(2.0 * (view_quat.x * view_quat.y - view_quat.z * view_quat.w));

    float alpha_diff = alpha_cam - alpha_rand;
    if (alpha_diff < 0.0)
        alpha_diff = 2.0 * M_PI + alpha_diff;

    float res_angle = alpha_rand;
    if (alpha_diff <= MAX_BILLBOARD_ANGLE)
        res_angle += alpha_diff;
    else if (alpha_diff <= M_PI - MAX_BILLBOARD_ANGLE)
        res_angle += MAX_BILLBOARD_ANGLE * (2.0 * alpha_diff - M_PI) 
                / (2.0 * MAX_BILLBOARD_ANGLE - M_PI);
    else if (alpha_diff <= M_PI + MAX_BILLBOARD_ANGLE)
        res_angle += alpha_diff - M_PI;
    else if (alpha_diff <= 2.0 * M_PI - MAX_BILLBOARD_ANGLE)
        res_angle += MAX_BILLBOARD_ANGLE * (2.0 * alpha_diff - M_PI) 
                / (2.0 * MAX_BILLBOARD_ANGLE - M_PI) + M_PI;
    else
        res_angle += alpha_diff - 2.0 * M_PI;

    vec4 bill_quat = qsetAxisAngle(UP_VECTOR, res_angle);
    mat3 bill_tsr;
    bill_tsr[0] = wcen;
    bill_tsr[1][0] = 1.0;
    bill_tsr = tsr_set_quat(bill_quat, bill_tsr);
#else
    mat3 bill_tsr = billboard_cylindrical(camera_eye, wcen);
#endif

    return bill_tsr;
}

#if BILLBOARD_PRES_GLOB_ORIENTATION && !STATIC_BATCH || USE_INSTANCED_PARTCLS
mat3 billboard_tsr_global(in vec3 camera_eye, in vec3 wcen, in mat3 view_tsr,
       in mat3 model_tsr) {

    mat3 bill_tsr = billboard_tsr(camera_eye, wcen, view_tsr);
    // NOTE: translation is already in bill_tsr
    model_tsr[0] = vec3(0.0, 0.0, 0.0);
    bill_tsr = tsr_multiply(bill_tsr, model_tsr);

    return bill_tsr;
}
#endif

vertex to_world(in vec3 pos, in vec3 cen, in vec3 tng, in vec3 shd_tng, in vec3 bnr, 
        in vec3 nrm, in mat3 model_tsr) {

    pos = tsr9_transform(model_tsr, pos);
    cen = tsr9_transform(model_tsr, cen);
    tng = tsr9_transform_dir(model_tsr, tng);
    shd_tng = tsr9_transform_dir(model_tsr, shd_tng);
    bnr = tsr9_transform_dir(model_tsr, bnr);
    nrm = tsr9_transform_dir(model_tsr, nrm);

    return tbn_norm(vertex(pos, cen, tng, shd_tng, bnr, nrm, vec3(0.0)));
}

#endif
