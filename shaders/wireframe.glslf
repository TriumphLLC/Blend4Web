#define WM_OPAQUE_WIREFRAME 0
#define WM_TRANSPARENT_WIREFRAME 1
#define WM_FRONT_BACK_VIEW 2

/*============================================================================
                                   INCLUDES
============================================================================*/

#include <precision_statement.glslf>
#include <gamma.glslf>

/*============================================================================
                                   UNIFORMS
============================================================================*/

#if !DEBUG_SPHERE
uniform int u_wireframe_mode;
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

/*============================================================================
                                    MAIN
============================================================================*/

void main() {

	vec3 color = vec3(0.0);
	float alpha = 0.0;

#if DEBUG_SPHERE
	vec3 dist = sign(v_barycentric - vec3(0.02 * WIREFRAME_WIDTH));

	if (dist.x < 0.0 || dist.y < 0.0 || dist.z < 0.0) {
		color = DEBUG_SPHERE_COLOR;
		alpha = 1.0;	    
	} else
		discard;
#elif WIREFRAME_QUALITY == 0
	vec3 dist = sign(v_barycentric - vec3(0.02 * WIREFRAME_WIDTH));
	if (u_wireframe_mode == WM_OPAQUE_WIREFRAME) {
		if (dist.x < 0.0 || dist.y < 0.0 || dist.z < 0.0)
	    	color = u_wireframe_edge_color;
		else
	    	color = FACE_COLOR_OPAQUE;
	    alpha = 1.0;
	} else if (u_wireframe_mode == WM_TRANSPARENT_WIREFRAME) {
		if (dist.x < 0.0 || dist.y < 0.0 || dist.z < 0.0)
	    	alpha = 1.0;
		else
	    	alpha = 0.0;
	    color = u_wireframe_edge_color;
	} else if (u_wireframe_mode == WM_FRONT_BACK_VIEW) {
		if (dist.x < 0.0 || dist.y < 0.0 || dist.z < 0.0)
			color = u_wireframe_edge_color;
		else
			if (gl_FrontFacing)
				color = FRONT_COLOR;
			else
				color = BACK_COLOR;
		alpha = 1.0;
	}
#elif WIREFRAME_QUALITY == 1
	#extension GL_OES_standard_derivatives: enable

	vec3 derivatives = fwidth(v_barycentric);
	vec3 smoothed_bc = smoothstep(vec3(0.0), derivatives * WIREFRAME_WIDTH, v_barycentric);
	float edge_factor = min(min(smoothed_bc.x, smoothed_bc.y), smoothed_bc.z);
	edge_factor = clamp(edge_factor, 0.0, 1.0);

	if (u_wireframe_mode == WM_OPAQUE_WIREFRAME) {
		color = vec3(mix(u_wireframe_edge_color, FACE_COLOR_OPAQUE, edge_factor));
		alpha = 1.0;
	} 
	else if (u_wireframe_mode == WM_TRANSPARENT_WIREFRAME) {
		color = u_wireframe_edge_color;
		alpha = mix(1.0, 0.0, edge_factor);
	} else if (u_wireframe_mode == WM_FRONT_BACK_VIEW) {
		if (gl_FrontFacing)
			color = mix(u_wireframe_edge_color, FRONT_COLOR, edge_factor);
		else
			color = mix(u_wireframe_edge_color, BACK_COLOR, edge_factor);
		alpha = 1.0;
	}
#endif

	lin_to_srgb(color);
#if ALPHA
    premultiply_alpha(color, alpha);
#endif

	gl_FragColor = vec4(color, alpha);

}