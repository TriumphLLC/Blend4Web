/*============================================================================
                                   EXPORTS
============================================================================*/

#export nodes_main

#if USE_NODE_GEOMETRY_OR || USE_NODE_TEX_COORD_GE
attribute vec3 a_orco_tex_coord;
varying vec3 v_orco_tex_coord;
#endif

/*============================================================================
                                  FUNCTIONS
============================================================================*/

#node TEX_COORD_UV
    #node_param attribute vec2 a_uv
    #node_param varying vec2 v_uv
    v_uv = a_uv;
#endnode

#node UV_MERGED
    #node_param attribute vec2 a_uv
    #node_param varying vec2 v_uv
    v_uv = a_uv;
#endnode

#node UVMAP
    #node_param attribute vec2 a_uv
    #node_param varying vec2 v_uv
    v_uv = a_uv;
#endnode

#node GEOMETRY_UV
    #node_param attribute vec2 a_uv
    #node_param varying vec2 v_uv
    v_uv = a_uv;
#endnode

#node GEOMETRY_VC
    #node_param attribute vec3 a_vertex_color
    #node_param varying vec3 v_vertex_color
    v_vertex_color = a_vertex_color;
#endnode

#node GEOMETRY_VC1
    #node_param attribute float a_vertex_color
    #node_param varying float v_vertex_color
    v_vertex_color = a_vertex_color;
#endnode

#node GEOMETRY_VC2
    #node_param attribute vec2 a_vertex_color
    #node_param varying vec2 v_vertex_color
    v_vertex_color = a_vertex_color;
#endnode

#node GEOMETRY_VC3
    #node_param attribute vec3 a_vertex_color
    #node_param varying vec3 v_vertex_color
    v_vertex_color = a_vertex_color;
#endnode

#nodes_global

void nodes_main(void) {
#if USE_NODE_GEOMETRY_OR || USE_NODE_TEX_COORD_GE
    v_orco_tex_coord = a_orco_tex_coord;
#endif
    #nodes_main
}