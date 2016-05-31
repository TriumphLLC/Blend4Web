#define DV_NONE 0
#define DV_OPAQUE_WIREFRAME 1
#define DV_TRANSPARENT_WIREFRAME 2
#define DV_FRONT_BACK_VIEW 3
#define DV_DEBUG_SPHERES 4
#define DV_CLUSTERS_VIEW 5
#define DV_BATCHES_VIEW 6

/*============================================================================
                                   INCLUDES
============================================================================*/

#include <precision_statement.glslf>
#include <color_util.glslf>

/*============================================================================
                                   UNIFORMS
============================================================================*/

#if !DEBUG_SPHERE
uniform int u_debug_view_mode;
uniform float u_cluster_id;
uniform float u_batch_debug_id;
uniform float u_debug_colors_seed;
uniform vec3 u_wireframe_edge_color;
#endif

/*============================================================================
                                   VARYINGS
============================================================================*/

varying vec3 v_barycentric;

/*============================================================================
                                    CONST
============================================================================*/

const float WIREFRAME_WIDTH = 1.0;

#if DEBUG_SPHERE
# if DEBUG_SPHERE_DYNAMIC
const vec3 DEBUG_SPHERE_COLOR = vec3(1.0, 0.05, 0.05);
# else
const vec3 DEBUG_SPHERE_COLOR = vec3(0.05, 0.05, 1.0);
# endif
#else
const vec3 FRONT_COLOR = vec3(0.4, 0.4, 1.0);
const vec3 BACK_COLOR = vec3(1.0, 0.4, 0.4);
const vec3 FACE_COLOR_OPAQUE = vec3(1.0, 1.0, 1.0);
#endif

#if !DEBUG_SPHERE
float get_wireframe_edge_factor() {
    // 0.0 means edge, 1.0 means polygon's center (approximately)
    float factor = 1.0;

# if WIREFRAME_QUALITY == 0
    vec3 dist = sign(v_barycentric - vec3(0.02 * WIREFRAME_WIDTH));
    if (dist.x < 0.0 || dist.y < 0.0 || dist.z < 0.0)
        factor = 0.0;
# elif WIREFRAME_QUALITY == 1
    #extension GL_OES_standard_derivatives: enable

    vec3 derivatives = fwidth(v_barycentric);
    vec3 smoothed_bc = smoothstep(vec3(0.0), derivatives * WIREFRAME_WIDTH, v_barycentric);
    factor = min(min(smoothed_bc.x, smoothed_bc.y), smoothed_bc.z);
    factor = clamp(factor, 0.0, 1.0);
# endif
    return factor;
}
#endif

/*============================================================================
                                    MAIN
============================================================================*/

void main() {

    vec3 color = vec3(0.0);
    float alpha = 0.0;

// batches with a sphere geometry
#if DEBUG_SPHERE
    vec3 dist = sign(v_barycentric - vec3(0.02 * WIREFRAME_WIDTH));

    if (dist.x < 0.0 || dist.y < 0.0 || dist.z < 0.0) {
        color = DEBUG_SPHERE_COLOR;
        alpha = 1.0;        
    } else
        discard;

// batches with the duplicated source geometry
#else
    if (u_debug_view_mode == DV_OPAQUE_WIREFRAME) {
        float factor = get_wireframe_edge_factor();
        color = vec3(mix(u_wireframe_edge_color, FACE_COLOR_OPAQUE, factor));
        alpha = 1.0;
    } else if (u_debug_view_mode == DV_TRANSPARENT_WIREFRAME) {
        float factor = get_wireframe_edge_factor();
        color = u_wireframe_edge_color;
        alpha = mix(1.0, 0.0, factor);
    } else if (u_debug_view_mode == DV_FRONT_BACK_VIEW) {
        float factor = get_wireframe_edge_factor();
        if (gl_FrontFacing)
            color = mix(u_wireframe_edge_color, FRONT_COLOR, factor);
        else
            color = mix(u_wireframe_edge_color, BACK_COLOR, factor);
        alpha = 1.0;
    } else if (u_debug_view_mode == DV_CLUSTERS_VIEW) {
        // NOTE: add 2 because u_cluster_id can be -1 and we don't want zeros
        float val = u_cluster_id + u_debug_colors_seed + 2.0;

        // random color
        color = vec3(fract(val * 19.73), fract(val * 6.34), fract(val * 1.56));
        alpha = 1.0;
    } else if (u_debug_view_mode == DV_BATCHES_VIEW) {
        float val = u_batch_debug_id + u_debug_colors_seed;

        // random color
        color = vec3(fract(val * 19.73), fract(val * 6.34), fract(val * 1.56));
        alpha = 1.0;
    }
#endif

    lin_to_srgb(color);
#if ALPHA
    premultiply_alpha(color, alpha);
#endif

    gl_FragColor = vec4(color, alpha);

}
