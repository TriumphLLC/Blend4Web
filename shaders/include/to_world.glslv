#import rotation_y rotation_z tbn_norm
#import vertex

#export to_world
#export billboard_matrix bend_jitter_matrix billboard_spherical

#define SKIN_SLERP 0
#define M_PI   3.14159265359
#define BILLBOARD_THRESHOLD M_PI / 3.0

const vec3 UP = vec3(0.0, 1.0, 0.0);

#if HAIR_BILLBOARD_SPHERICAL
mat4 billboard_spherical(vec3 center_pos, mat4 view_matrix) {

    vec3 x = vec3(view_matrix[0][0],view_matrix[1][0],view_matrix[2][0]);
    vec3 y = vec3(view_matrix[0][1],view_matrix[1][1],view_matrix[2][1]);
    vec3 z = vec3(view_matrix[0][2],view_matrix[1][2],view_matrix[2][2]);

    y = cross(z, x);

    return mat4(vec4(x, 0.0), vec4(y, 0.0), vec4(z, 0.0), 
            vec4(center_pos, 1.0));
}
#else
mat4 billboard_cylindrical(vec3 camera_eye, vec3 center_pos) {

    vec3 center_to_cam = camera_eye - center_pos;
    center_to_cam.y = 0.0;
    center_to_cam = normalize(center_to_cam);

    vec3 x = normalize(cross(UP, center_to_cam));
    vec3 y = normalize(cross(center_to_cam, x));

    return mat4(vec4(x, 0.0), vec4(y, 0.0), vec4(center_to_cam, 0.0), 
            vec4(center_pos, 1.0));
}
#endif // HAIR_BILLBOARD_SPHERICAL


#if HAIR_BILLBOARD_JITTERED
mat4 bend_jitter_matrix(in vec3 wind_world, float wind_param, float jitter_amp, 
        float jitter_freq, vec3 vec_seed) {

    float seed = fract(length(vec_seed) / 0.17); // [0, 1]
    float rand_freq = jitter_freq + seed / 10.0; // + 0%-10%
    float rand_phase = seed / jitter_freq; //  [0, 1/freq]

    wind_world *= 1.0 + 0.5 * sin(wind_param); // make wind gusty

    float angle = length(wind_world) * jitter_amp * sin(2.0*3.14 * wind_param 
            * rand_freq + rand_phase);

    return rotation_z(angle);
}
#endif

mat4 billboard_matrix(in vec3 camera_eye, in vec3 wcen, in mat4 view_matrix) {
#if HAIR_BILLBOARD_SPHERICAL
    mat4 bill_matrix = billboard_spherical(wcen, view_matrix);
#else
    mat4 bill_matrix = billboard_cylindrical(camera_eye, wcen);
#endif

#if HAIR_BILLBOARD_RANDOM
    vec3 center_to_cam = camera_eye - wcen;
    center_to_cam[1] = 0.0;
    float seed = fract(dot(wcen, wcen) / 127.0);
    float alpha_rand = 2.0 * M_PI * seed;
    center_to_cam = (rotation_y(alpha_rand) * vec4(center_to_cam, 0.0)).xyz;
    center_to_cam = normalize(center_to_cam);

    float cos_alpha = center_to_cam[2];
    float sin_alpha = center_to_cam[0];

    if (abs(cos_alpha) > cos(BILLBOARD_THRESHOLD)) {
        if (cos_alpha < 0.0)
            bill_matrix = bill_matrix * rotation_y(M_PI);
    } else {
        float alpha = acos(cos_alpha);
        if (sin_alpha < 0.0)
            alpha = 2.0 * M_PI - alpha;

        float coeff = BILLBOARD_THRESHOLD / (M_PI / 2.0 - BILLBOARD_THRESHOLD);
        float alpha_inv = (coeff + 1.0) * (alpha - sign(sin_alpha) * BILLBOARD_THRESHOLD);
        bill_matrix = bill_matrix * rotation_y(alpha_inv);
    }
#endif

    return bill_matrix;
}

vertex to_world(in vec3 pos, in vec3 cen, in vec3 tng, in vec3 bnr, in vec3 nrm,
        in mat4 model_matrix) {

    pos = (model_matrix * vec4(pos, 1.0)).xyz;
    cen = (model_matrix * vec4(cen, 1.0)).xyz;
    tng = (model_matrix * vec4(tng, 0.0)).xyz;
    bnr = (model_matrix * vec4(bnr, 0.0)).xyz;
    nrm = (model_matrix * vec4(nrm, 0.0)).xyz;

    return tbn_norm(vertex(pos, cen, tng, bnr, nrm, vec3(0.0)));
}
