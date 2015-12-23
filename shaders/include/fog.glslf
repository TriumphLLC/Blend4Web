#import u_cube_fog u_fog_color_density u_underwater_fog_color_density
#import u_cam_water_depth u_fog_params
#import v_pos_world
#import srgb_to_lin
#export water_fog fog

#var WAVES_HEIGHT 0.0

# if USE_FOG
void shade_fog(inout vec3 color, in float eye_dist, in float height,
               in vec4 fog_color_density)
{
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
    fog_color_density.a = 1.0 - (1.0 - fac) * (1.0 - u_fog_params.x);
    color = mix(color, fog_color_density.rgb, fog_color_density.a);
}
#endif

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

# if WATER_EFFECTS
void fog_underwater(inout vec3 color, in float eye_dist,
    in vec3 eye_dir, in float cam_depth, in vec4 underwater_fog_color_density,
    in float dist_to_water_level)
{
    float eye_dir_y = max(eye_dir.y, 0.0);
    float eye_fac = max(eye_dist - max(cam_depth / eye_dir_y, 0.0), 0.0);
    float water_fac = underwater_fog_color_density.w * eye_fac;
    vec3 depth_col = vec3(0.0, 0.02, 0.05);
    vec3 water_col = underwater_fog_color_density.rgb;

    // vertical gradient to smooth fog artifacts for dynamic water
    water_fac = min(water_fac, 1.0);
    water_fog_factor(water_fac);
    water_fac *= clamp(2.0 - dist_to_water_level, 0.0, 1.0);

    vec3 fog_color = mix(water_col, depth_col, min(eye_dir_y, 1.0));
    cam_depth = clamp(-cam_depth * 0.03, 0.0, 0.8);
    fog_color *= 1.0 - cam_depth;
    color = mix(color, fog_color, water_fac);
}
#endif

// special fog for water bottom surface
void water_fog(inout vec3 color, in float eye_dist, in float cam_depth)
{
    float factor = u_underwater_fog_color_density.w * eye_dist;
    factor = clamp(factor, 0.0, 1.0);
    water_fog_factor(factor);

    cam_depth = clamp(-cam_depth * 0.03, 0.0, 0.8);
    vec3 fog_color = mix(u_underwater_fog_color_density.rgb, vec3(0.0), cam_depth);
    color = mix(color, fog_color, factor);
}
#endif

void fog(inout vec3 color, float eye_dist, vec3 eye_dir, float dist_to_water)
{
# if USE_FOG
#  if PROCEDURAL_FOG
    vec3 cube_fog  = procedural_fog_color(u_cube_fog, eye_dir);
    vec4 fog_color = vec4(cube_fog, u_fog_color_density.a);
#  else  // PROCEDURAL_FOG
    vec4 fog_color = u_fog_color_density;
#  endif  // PROCEDURAL_FOG
    shade_fog(color, eye_dist, v_pos_world.y, fog_color);
# endif

# if WATER_EFFECTS
    fog_underwater(color, eye_dist, eye_dir, u_cam_water_depth,
                   u_underwater_fog_color_density, dist_to_water);
# else
# endif  // WATER_EFFECTS
}
