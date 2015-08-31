#import u_cube_fog u_fog_color_density u_underwater_fog_color_density
#import u_cam_water_depth u_fog_params
#import v_pos_world
#import srgb_to_lin
#export water_fog fog

#var WAVES_HEIGHT 0.0

void shade_fog(inout vec3 color, in float eye_dist, in float height, in vec4 fog_color_density)
{
#if USE_FOG
    float fac = clamp((eye_dist - u_fog_params.z) / u_fog_params.y , 0.0, 1.0);

# if FOG_TYPE == QUADRATIC
    fac *= fac;
# elif FOG_TYPE == LINEAR
    /* pass */
# elif FOG_TYPE == INVERSE_QUADRATIC
    fac = sqrt(fac);
# endif

    if (u_fog_params.w > 0.0) {
        if (height > u_fog_params.w)
            fac = 0.0;
        else if (height > 0.0){
            float hi = (u_fog_params.w - height) / u_fog_params.w;
            fac *= hi * hi;
        }
    }
    float outfac = 1.0 - (1.0 - fac) * (1.0 - u_fog_params.x);
#else
    float outfac = 0.0;
#endif
    color = mix(color, fog_color_density.rgb, outfac);
}

#if PROCEDURAL_FOG
vec3 procedural_fog_color(in mat4 cube_fog, in vec3 eye_dir)
{
    vec3 x_fog = mix( cube_fog[0].rgb, cube_fog[1].rgb,
                      max(sign(eye_dir.x), 0.0) );
    vec3 z_fog = mix( cube_fog[2].rgb, cube_fog[3].rgb,
                      max(sign(eye_dir.z), 0.0) );
    vec3 y_fog = vec3(cube_fog[0].a, cube_fog[1].a, cube_fog[2].a);

    vec3 color = mix(x_fog, z_fog, abs(eye_dir.z));
    color      = mix(color, y_fog, abs(eye_dir.y));
    srgb_to_lin(color);

    return color;
}
#endif

#if WATER_EFFECTS
void water_fog_factor(inout float f)
{
    /*
        ^ Visibility
       _|
      1 |*
        |*
        | *
        |   **
       _|      ***
     0.5|          **
        |             *
        |              *
        |              *
     ---|------------------->
                       Distance
    */
    f -= 0.5;
    f = 4.0 * (f * f * f) + 0.5;
}

void fog_underwater(inout vec3 color, in float eye_dist,
    in vec3 eye_dir, in float cam_depth,
    in vec4 underwater_fog_color_density, in vec4 fog_color_density,
    in float dist_to_water_level)
{
    // air fog factor 
    float factor = fog_color_density.w * eye_dist;
    float air_vis = exp(-factor * factor);
    air_vis = clamp(air_vis, 0.0, 1.0);

    // water fog factor 

    float eye_dir_y = max(eye_dir.y, 0.0);
    eye_dist = max(eye_dist - max(cam_depth/eye_dir_y, 0.0), 0.0);
    float water_factor = underwater_fog_color_density.w * eye_dist;
    float wat_vis = 1.0 - water_factor;
    wat_vis = max(wat_vis, 0.0);

    // vertical gradient to smooth fog artifacts
    water_fog_factor(wat_vis);
    wat_vis += max(dist_to_water_level - 0.5, 0.0);

    // apply more dense fog (air or water)
    if (wat_vis < air_vis) {
        // color of underwater depth
        vec3 depth_col = vec3(0.0, 0.02, 0.05);
        vec3 water_col = underwater_fog_color_density.rgb;

        cam_depth = clamp(-cam_depth * 0.03, 0.0, 0.8);
        vec3 fog_color = mix(water_col, depth_col, min(eye_dir_y, 1.0));
        fog_color = mix(fog_color, vec3(0.0), cam_depth);
        color = mix(fog_color, color, wat_vis);
    } // else {
    if (wat_vis >= air_vis) {
        color = mix(fog_color_density.rgb, color, air_vis);
    }
}

// special fog for water bottom surface
void water_fog(inout vec3 color, in float eye_dist, in float cam_depth)
{
    float factor = u_underwater_fog_color_density.w * eye_dist;
    float f = 1.0 - factor;
    f = clamp(f, 0.0, 1.0);
    water_fog_factor(f);

    cam_depth = clamp(-cam_depth * 0.03, 0.0, 0.8);
    vec3 fog_color = mix(u_underwater_fog_color_density.rgb, vec3(0.0), cam_depth);
    color = mix(fog_color, color, f);
}
#endif

void fog(inout vec3 color, float eye_dist, vec3 eye_dir, float dist_to_water)
{
# if PROCEDURAL_FOG
    vec3 cube_fog  = procedural_fog_color(u_cube_fog, eye_dir);
    vec4 fog_color = vec4(cube_fog, u_fog_color_density.a);
# else  // PROCEDURAL_FOG
    vec4 fog_color = u_fog_color_density;
# endif  // PROCEDURAL_FOG
# if WATER_EFFECTS
    fog_underwater(color, eye_dist, eye_dir, u_cam_water_depth,
        u_underwater_fog_color_density, fog_color, dist_to_water);
# else
    shade_fog(color, eye_dist, v_pos_world.y, fog_color);
# endif  // WATER_EFFECTS
}
