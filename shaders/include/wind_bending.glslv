#import a_bending_col_detail a_bending_col_main a_emitter_center
#import au_detail_bending_amp au_branch_bending_amp au_wind_bending_amp \
        au_wind_bending_freq au_detail_bending_freq
#import u_wind u_time

#export bend_vertex

#if WIND_BEND
    void main_bend(inout vec3 pos_world, 
                   in vec3 center_world, 
                   in float wind_bending_amp, 
                   in float wind_bending_freq,
                   in float time,
                   in vec3 wind_world,
                   in float bend_stiffness) {

        // http://http.developer.nvidia.com/GPUGems3/gpugems3_ch16.html

        // calc and smooth bend factor
        float phase = length(center_world);
        float freq = wind_bending_freq * (1.0 + 0.1 * fract(phase)); // add some random variations
        float bend_scale = wind_bending_amp * bend_stiffness *
                (1.0 + sin(2.0*3.14 * time * freq + phase));

        float bf = (pos_world.y - center_world.y) * abs(bend_scale);
        bf += 1.0;
        bf *= bf;
        bf = bf * bf - bf;

        // calculate bend
        vec3 pos_bend = pos_world;
        pos_bend.xz += wind_world.xz * bf * sign(bend_scale);

        // normalize by non-bended length to keep overall form
        float len = length(pos_world - center_world);
        pos_world = center_world + normalize(pos_bend - center_world) * len;
    }

# if DETAIL_BEND 

    vec4 smooth_curve( vec4 x ) {  
      return x * x *( 3.0 - 2.0 * x );  
    }  

    vec4 triangle_wave( vec4 x ) {  
      return abs( fract( x + 0.5 ) * 2.0 - 1.0 );  
    }  

    vec4 smooth_triangle_wave( vec4 x ) {  
      return smooth_curve( triangle_wave( x ) );  
    }

    void detail_bend(inout vec3 pos_world,
                     in float time,
                     in vec3 normal,
                     in vec3 wind_world,
                     in vec3 center_world,
                     in float detail_freq,
                     in float detail_amp,
                     in float branch_amp,
                     in vec3 bend_params)
    {
        float obj_phase;
        float branch_phase;
        float vtx_phase;
        vec2 waves_in;
        vec4 waves;
        vec2 waves_sum;
        vec3 bend;

        // Phases (object, vertex, branch)
        obj_phase    = dot(center_world, vec3(1.0));
        branch_phase = obj_phase + bend_params.g;
        vtx_phase    = dot(pos_world, vec3(bend_params.g));

        // x is used for edges; y is used for branches
        waves_in = (time + vec2(vtx_phase, branch_phase));

        waves = ((fract( (waves_in.xxyy *
                       vec4(1.975, 0.793, 0.375, 0.193)) ) *
                       2.0) - 1.0) * length(wind_world) * detail_freq;
        waves = smooth_triangle_wave(waves);

        waves_sum = waves.xz + waves.yw;

        // move branches both up and down
        waves_sum.y = 0.5 - waves_sum.y;

        bend = waves_sum.xyx * bend_params.rbr * vec3(detail_amp * normal.x,
                                                      branch_amp,
                                                      detail_amp * normal.z);

        pos_world += bend;
    }

# endif // DETAIL_BEND

void bend_vertex(inout vec3 position, inout vec3 center, in vec3 normal) {

    vec3 wind = u_wind * 1.0 + 0.7 * sin(u_time); // make wind gusty;

# if BEND_CENTER_ONLY
    vec3 vertex_position = center;
    vec3 object_center = a_emitter_center;
# else
    vec3 vertex_position = position;
    vec3 object_center = center;
# endif

# if MAIN_BEND_COL
#  if DETAIL_BEND
    detail_bend(vertex_position, u_time, normal, wind, object_center,
                au_detail_bending_freq, au_detail_bending_amp, au_branch_bending_amp,
                a_bending_col_detail);
#  endif
    main_bend(vertex_position, object_center, au_wind_bending_amp, au_wind_bending_freq,
            u_time, wind, a_bending_col_main);
# else
    main_bend(vertex_position, object_center, au_wind_bending_amp, au_wind_bending_freq,
            u_time, wind, 1.0);
# endif

# if BEND_CENTER_ONLY
    position += vertex_position - center;
    center = vertex_position;        
# else
    position = vertex_position;
    center = object_center;
# endif
}

#endif // WIND_BEND
