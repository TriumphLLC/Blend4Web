#var NUM_LIGHTS 0

#define LIGHT_INDEX 0

attribute float a_lf_dist;
attribute vec2 a_lf_bb_vertex;
attribute vec2 a_texcoord;

uniform mat4 u_view_matrix;
uniform mat4 u_proj_matrix;

uniform vec3 u_light_directions[NUM_LIGHTS];

varying vec2 v_texcoord;

void main(void) {

    v_texcoord = a_texcoord;

    // locate flare center

    vec3 dir = normalize(u_light_directions[LIGHT_INDEX]);
    vec4 pos_clip = u_proj_matrix * u_view_matrix * vec4(dir, 0.0);

    pos_clip.x /= pos_clip.w; 
    pos_clip.y /= pos_clip.w;

    // remove duplicate rear flares 
    pos_clip += 99999.0 * step(pos_clip.z, 0.0);

    // cull by distance
    pos_clip += 100.0 * (step(1.0, abs(pos_clip.x)) + step(1.0, abs(pos_clip.y)));

    // move flares reverse to camera movement    
    pos_clip.x = - a_lf_dist*pos_clip.x;
    pos_clip.y = - a_lf_dist*pos_clip.y;

    // billboard vertices
    float aspect = u_proj_matrix[1][1] / u_proj_matrix[0][0];
    vec2 bb_rel_pos = vec2(a_lf_bb_vertex.x / aspect, a_lf_bb_vertex.y);

    // scale flares but not sun
    if (a_lf_dist > -0.999) {
        const float SCALE_FACTOR = 1.9;
        bb_rel_pos *= (1.0 + SCALE_FACTOR * length(pos_clip.xy));
    }

    // z = 0.9999; compare with skydome
    gl_Position = vec4(pos_clip.xy + bb_rel_pos, 0.999999, 1.0);
}
