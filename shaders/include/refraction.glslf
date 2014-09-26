#if REFRACTIVE
#import u_scene_depth
#import v_view_depth
#import u_refractmap
#import unpack_float
#import srgb_to_lin

#export refraction_correction
#export material_refraction

float refraction_correction (in float scene_depth,
                 inout vec2 refract_coord, in vec2 screen_coord) {

    vec4  scene_depth_refr_rgba = texture2D(u_scene_depth, refract_coord);
    float scene_depth_refr      = unpack_float(scene_depth_refr_rgba);

    // if refracted object is closer than surface use undisturbed coords
    if (scene_depth_refr < v_view_depth) {
        refract_coord = screen_coord;
        return scene_depth;
    } else {
        return scene_depth_refr;
    }
    return scene_depth;
}

vec3 material_refraction (in vec3 tex_pos_clip, in vec2 perturbation) {
    vec2 screen_coord = tex_pos_clip.xy/tex_pos_clip.z;
    vec2 refract_coord = screen_coord + perturbation;

    vec4 scene_depth_rgba = texture2DProj(u_scene_depth, tex_pos_clip);
    float scene_depth = unpack_float(scene_depth_rgba);

    refraction_correction(scene_depth, refract_coord, screen_coord);

    vec3 refract_color = texture2D(u_refractmap, refract_coord).rgb;
    srgb_to_lin(refract_color);
    return refract_color;
}
#endif
