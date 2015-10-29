
attribute vec2 a_position;

varying vec2 v_texcoord;

void main(void) {

    v_texcoord = 2.0 * a_position;
    
    gl_Position = vec4(4.0 * (a_position.xy-0.25), 0.0, 1.0);
}
