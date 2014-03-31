
attribute vec2 a_bb_vertex;

varying vec2 v_texcoord;

void main(void) {

    v_texcoord = a_bb_vertex + 0.5;
    
    gl_Position = vec4(2.0 * a_bb_vertex.xy, 0.0, 1.0);
}

