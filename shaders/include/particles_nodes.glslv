#ifndef PARTICLES_NODES_GLSLV
#define PARTICLES_NODES_GLSLV

// #import v_texcoord

/*==============================================================================
                                  FUNCTIONS
==============================================================================*/

#node TEX_COORD_UV
    v_texcoord = nin_bb_vertex;
#endnode

#node UV_MERGED
    v_texcoord = nin_bb_vertex;
#endnode

#node UVMAP
    v_texcoord = nin_bb_vertex;
#endnode

#node GEOMETRY_UV
    v_texcoord = nin_bb_vertex;
#endnode

#node PARTICLE_INFO
    #node_var PART_INFO_SIZE 0
    #node_var PART_INFO_AGE 0
    #node_var PART_INFO_LT 0
    #node_var PART_INFO_LOC 0
    #node_var PART_INFO_IND 0
    #node_var PART_INFO_VEL 0
    #node_var PART_INFO_A_VEL 0

    // v_p_params -> indices, time, lifetimes, sizes
    #node_param optional GLSL_OUT vec4 v_p_params
    #node_param optional GLSL_OUT vec3 v_p_location
    #node_param optional GLSL_OUT vec3 v_p_vel
    #node_param optional GLSL_OUT vec3 v_p_a_vel

    #node_param optional GLSL_IN float a_p_indices

# node_if PART_INFO_SIZE
    v_p_params[3] = nin_part_size;
# node_endif

# node_if PART_INFO_AGE
    v_p_params[1] = nin_part_age;
# node_endif

# node_if PART_INFO_LT
    v_p_params[2] = nin_lifetime;
# node_endif

# node_if PART_INFO_LOC
    v_p_location = nin_pos;
# node_endif

# node_if PART_INFO_IND
    v_p_params[0] = a_p_indices;
# node_endif

# node_if PART_INFO_VEL
    v_p_vel = nin_part_velocity;
# node_endif

# node_if PART_INFO_A_VEL
    v_p_a_vel = nin_part_ang_vel;
# node_endif

#endnode

#nodes_global

void nodes_main(in vec3 nin_pos, in vec3 nin_part_velocity, in vec3 nin_part_ang_vel,
        in float nin_part_age, in float nin_part_size, in vec2 nin_bb_vertex,
        in float nin_lifetime) {
#if USE_NODE_GEOMETRY_OR || USE_NODE_TEX_COORD_GE
    v_texcoord = nin_bb_vertex;
#endif
    #nodes_main
}

#endif