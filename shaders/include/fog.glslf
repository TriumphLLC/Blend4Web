#export procedural_fog_color fog_underwater water_fog fog

#var WAVES_HEIGHT 0.0
// GL_EXP2 fog

void fog(inout vec3 color, in float eye_dist, in vec4 fog_color_density)
{
    float factor = fog_color_density.w * eye_dist;
    float f = exp(-factor * factor);
    f = clamp(f, 0.0, 1.0);
    color = mix(fog_color_density.rgb, color, f);
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
    in float dist_to_water_level, in float light_col_intensity)
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
        fog_color = mix(fog_color, vec3(0.0), cam_depth)
                  * light_col_intensity;
        color = mix(fog_color, color, wat_vis);
    } // else {
    if (wat_vis >= air_vis) {
        color = mix(fog_color_density.rgb, color, air_vis);
    }
}

// special fog for water bottom surface
void water_fog(inout vec3 color, in float eye_dist, in float cam_depth, 
        in vec4 underwater_fog_color_density, in float light_col_intensity)
{
    float factor = underwater_fog_color_density.w * eye_dist;
    float f = 1.0 - factor;
    f = clamp(f, 0.0, 1.0);
    water_fog_factor(f);

    cam_depth = clamp(-cam_depth * 0.03, 0.0, 0.8);
    vec3 fog_color = mix(underwater_fog_color_density.rgb, vec3(0.0), cam_depth)
                     * light_col_intensity;
    color = mix(fog_color, color, f);
}
#endif
