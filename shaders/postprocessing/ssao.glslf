// SSAO shader by Arkano22 (www.gamedev.net/topic/550699-ssao-no-halo-artifacts/)
// generating noise texture by Martins Upitis (martinsh) (devlog-martinsh.blogspot.com)

#include <precision_statement.glslf>
#include <depth_fetch.glslf>

#define SSAO_QUALITY_16 1
#define SSAO_QUALITY_32 2

uniform sampler2D u_color;
uniform sampler2D u_depth;
uniform vec2 u_texel_size;
uniform float u_view_max_depth;
uniform vec2 u_camera_range;

varying vec2 v_texcoord;

uniform float u_ssao_radius_increase; // was 1.7 // sampling radius increase
uniform float u_ssao_dithering_amount; // was 0.0007 // dithering amount
uniform float u_ssao_gauss_center; // was 0.2 // gauss bell center
uniform float u_ssao_gauss_width_square; // was 2.0 * 2.0 // gauss bell width
uniform float u_ssao_gauss_width_left_square; // was 0.1 * 0.1 // self-shadowing reduction
uniform float u_ssao_influence; // was 0.7 // how much ao affects final rendering
uniform float u_ssao_dist_factor; // did not exist // how much ao decreases with distance

// generating noise/pattern texture for dithering
vec2 generate_dithering_tex(vec2 coord) { 

    float d1 = dot(coord, vec2(12.9898, 78.233));
    float d2 = dot(coord, vec2(12.9898, 78.233) * 2.0);

    float noiseX = fract(sin(d1) * 43758.5453) * 2.0 - 1.0;
    float noiseY = fract(sin(d2) * 43758.5453) * 2.0 - 1.0;

    return vec2(noiseX, noiseY);
}

float read_depth(in vec2 coord) {
    return depth_fetch(u_depth, coord, u_camera_range);
}

float compare_depths(in float depth1, in float depth2, inout int far) {   

    float gauss_area_square = u_ssao_gauss_width_square;

    float depth_diff = (depth1 - depth2) * 100.0; // depth difference (0-100)

    //reduce left bell width to avoid self-shadowing 
    if (depth_diff < u_ssao_gauss_center)
        gauss_area_square = u_ssao_gauss_width_left_square;
    else
        far = 1;
    
    float d = depth_diff - u_ssao_gauss_center;
    float gauss = exp(-2.0 * d * d / gauss_area_square);

    return gauss;
}   

float calculate_ao(float depth, vec2 d) {  
    float temp = 0.0;
    float temp2 = 0.0;

    // scale depth to fit other ranges than 100.0
    float f = max(1.0, u_view_max_depth / 100.0);

    depth *= f;

    d /= depth;

    vec2 coord1 = v_texcoord + d;
    vec2 coord2 = v_texcoord - d;
    
    int far = 0;
    temp = compare_depths(depth, f * read_depth(coord1), far);

    if (far > 0 ||  /* depth extrapolation */
                    /* remove darker banding at the screen edges */
        coord1.y < 0.0 || coord1.y > 1.0 || coord1.x < 0.0 || coord1.x > 1.0) { 

        temp2 = compare_depths(f * read_depth(coord2), depth, far);
        temp += (1.0 - temp) * temp2; 
    }

    return temp;  
}   

void main(void) {  

    vec2 noise = generate_dithering_tex(v_texcoord) * u_ssao_dithering_amount;

    #if SSAO_QUALITY == SSAO_QUALITY_16
        noise *= 1.5;
    #endif

    float depth = read_depth(v_texcoord);
    float ao = 0.0;
    
    vec2 p = u_texel_size * 0.5;

    for (int i = 0; i < 4; i++) {  
        //calculate color bleeding and ao:

        #if SSAO_QUALITY == SSAO_QUALITY_16
        if (i == 0 || i == 2) {
        #endif
            ao += calculate_ao(depth, p);  
            ao += calculate_ao(depth, vec2( p.x, -p.y));  
            ao += calculate_ao(depth, vec2(-p.x,  p.y));  
            ao += calculate_ao(depth, vec2(-p.x, -p.y));
        #if SSAO_QUALITY == SSAO_QUALITY_16
        } else if (i == 1 || i == 3) {
        #endif
            ao += calculate_ao(depth, vec2( p.x * 1.2, 0.0));  
            ao += calculate_ao(depth, vec2(-p.x * 1.2, 0.0));  
            ao += calculate_ao(depth, vec2(0.0,  p.y * 1.2));  
            ao += calculate_ao(depth, vec2(0.0, -p.y * 1.2));
        #if SSAO_QUALITY == SSAO_QUALITY_16
        }
        #endif

        //sample jittering:
        p += noise;

        //increase sampling area:
        p *= u_ssao_radius_increase;  
    }         

    //final values, some adjusting:
    #if SSAO_QUALITY == SSAO_QUALITY_16
    ao = 1.0 - ao / 16.0;
    #elif SSAO_QUALITY == SSAO_QUALITY_32
    ao = 1.0 - ao / 32.0;
    #endif

    // nasty hack adjusting ssao level with camera distance - needed to remove far strips
    float ssao_influence = u_ssao_influence * (1.0 - u_ssao_dist_factor * depth);

    ao = (1.0 - ssao_influence) + ao * ssao_influence;

    #if SSAO_WHITE
        ao = 1.0;
    #endif

    // TODO replace this by rendering to one channel using color mask
    float tex_input = texture2D(u_color, v_texcoord).r;

    gl_FragColor = vec4(tex_input, ao, 0.0, 1.0);
}  
