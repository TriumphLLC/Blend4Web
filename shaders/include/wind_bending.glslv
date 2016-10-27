#ifndef WIND_BENDING_GLSLV
#define WIND_BENDING_GLSLV

// #import a_bending_col_detail a_bending_col_main a_emitter_center
// #import au_detail_bending_amp au_branch_bending_amp au_wind_bending_amp \
//         au_wind_bending_freq au_detail_bending_freq
// #import u_wind u_time

/*==============================================================================
                                VARS
==============================================================================*/
#var WIND_BEND 0
#var MAIN_BEND_COL 0
#var DETAIL_BEND 0
#var BEND_CENTER_ONLY 0 
#var REFLECTION_PASS REFL_PASS_NONE
#var BILLBOARD 0

/*============================================================================*/

#include <std.glsl>

#if WIND_BEND
    void main_bend(inout vec3 pos_world, 
                   in vec3 center_world, 
                   in float wind_bending_amp, 
                   in float wind_bending_freq,
                   in float time,
                   in vec3 wind_world,
                   in float bend_stiffness,
                   in mat4 view_refl_matrix) {

        // http://http.developer.nvidia.com/GPUGems3/gpugems3_ch16.html

# if REFLECTION_PASS == REFL_PASS_PLANE && BILLBOARD
      vec3 pw = (view_refl_matrix * vec4(pos_world, 1.0)).xyz;
      vec3 cw = (view_refl_matrix * vec4(center_world, 1.0)).xyz;
# else
      vec3 pw = pos_world;
      vec3 cw = center_world;
# endif


        // calc and smooth bend factor
        float phase = length(cw);
        float freq = wind_bending_freq * (1.0 + 0.1 * fract(phase)); // add some random variations
        float bend_scale = wind_bending_amp * bend_stiffness *
                (1.0 + sin(2.0*3.14 * time * freq + phase));

        float bf = (pw.z - cw.z) * abs(bend_scale);
        bf += 1.0;
        bf *= bf;
        bf = bf * bf - bf;

        // calculate bend
        vec3 pos_bend = pw;
        pos_bend.xy += wind_world.xy * bf * sign(bend_scale);

        vec3 bend_diff = pos_bend - cw;
        // NOTE: avoid normalizing issues
        if (all(equal(bend_diff, vec3(0.0))))
            pos_world = center_world;
        else {
 # if REFLECTION_PASS == REFL_PASS_PLANE && BILLBOARD
      bend_diff = (view_refl_matrix * vec4(bend_diff, 0.0)).xyz;
 # endif
            // normalize by non-bended length to keep overall form
            float len = length(pw - cw);
            pos_world = center_world + normalize(bend_diff) * len;
        }

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
                     in vec3 bend_params,
                     in mat4 view_refl_matrix)
    {
        float obj_phase;
        float branch_phase;
        float vtx_phase;
        vec2 waves_in;
        vec4 waves;
        vec2 waves_sum;
        vec3 bend;

#  if REFLECTION_PASS == REFL_PASS_PLANE && BILLBOARD
        vec3 pw = (view_refl_matrix * vec4(pos_world, 1.0)).xyz;
        vec3 cw = (view_refl_matrix * vec4(center_world, 1.0)).xyz;
#  else
        vec3 pw = pos_world;
        vec3 cw = center_world;
#  endif

        // Phases (object, vertex, branch)
        obj_phase    = dot(cw, vec3(1.0));
        branch_phase = obj_phase + bend_params.g;
        vtx_phase    = dot(pw, vec3(bend_params.g));

        // x is used for edges; y is used for branches
        waves_in = (time + vec2(vtx_phase, branch_phase));

        waves = ((fract( (waves_in.xxyy *
                       vec4(1.975, 0.793, 0.375, 0.193)) ) *
                       2.0) - 1.0) * length(wind_world) * detail_freq;
        waves = smooth_triangle_wave(waves);

        waves_sum = waves.xz + waves.yw;

        // move branches both up and down
        waves_sum.y = 0.5 - waves_sum.y;

        bend = waves_sum.xxy * bend_params.rrb * vec3(detail_amp * normal.x,
                                                      detail_amp * normal.y,
                                                      branch_amp);
#  if REFLECTION_PASS == REFL_PASS_PLANE && BILLBOARD
        bend = (view_refl_matrix * vec4(bend, 0.0)).xyz;
#  endif

        pos_world += bend;
    }

# endif // DETAIL_BEND

void bend_vertex(inout vec3 position, inout vec3 center, in vec3 normal, in mat4 view_refl_matrix) {

    vec3 wind = u_wind * 1.0 + 0.7 * sin(u_time); // make wind gusty;

# if BEND_CENTER_ONLY
    vec3 vertex_position = center;
    vec3 object_center = a_emitter_center;
#  if REFLECTION_PASS == REFL_PASS_PLANE && BILLBOARD
    object_center = (view_refl_matrix * vec4(object_center, 1.0)).xyz;
#  endif
# else
    vec3 vertex_position = position;
    vec3 object_center = center;
# endif

# if MAIN_BEND_COL
#  if DETAIL_BEND
    detail_bend(vertex_position, u_time, normal, wind, object_center,
                au_detail_bending_freq, au_detail_bending_amp, au_branch_bending_amp,
                a_bending_col_detail, view_refl_matrix);
#  endif
    main_bend(vertex_position, object_center, au_wind_bending_amp, au_wind_bending_freq,
            u_time, wind, a_bending_col_main, view_refl_matrix);
# else
    main_bend(vertex_position, object_center, au_wind_bending_amp, au_wind_bending_freq,
            u_time, wind, 1.0, view_refl_matrix);
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

#endif
