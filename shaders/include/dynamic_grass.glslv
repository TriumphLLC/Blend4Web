#var PRECISION lowp

#import u_scale_threshold
#import vertex qrot
#import to_world billboard_matrix tbn_norm

#export grass_vertex

#if DYNAMIC_GRASS

// U along X, V along -Z (0..1)
vec2 pos_to_uv(vec3 position, float dim, vec2 base_point)
{
    vec2 pos_uv = vec2((position.x - base_point.x) / dim,
            -(position.z - base_point.y) / dim);
    return fract(pos_uv);
}

vec2 uv_to_pos(vec2 uv, float dim, vec2 base_point)
{
    return vec2(uv.x * dim, -uv.y * dim) + base_point;
}

// compose infinity vertex
vertex infinity_vertex()
{
    return vertex(vec3(-10000.0), vec3(0.0), vec3(0.0), vec3(0.0), vec3(0.0),
            vec3(0.0));
}

// Translate grass vertex from local to world space using grass maps
vertex grass_vertex(vec3 position, vec3 tangent, vec3 binormal, vec3 normal,
        vec3 center, PRECISION sampler2D grass_map_depth, sampler2D grass_map_color,
        vec3 grass_map_dim, float grass_size, vec3 camera_eye, vec4 camera_quat,
        mat4 view_matrix)
{

    // get camera view angles
    vec3 cam_view = qrot(camera_quat, vec3(0.0, -1.0, 0.0));
    float sin_alpha = -cam_view.x;
    float cos_alpha = -cam_view.z;

    // get world position of base point ([0.0, 0.0] (left lower) on UV)
    vec2 base_point =vec2(camera_eye.x + grass_size * (-1.0 - sin_alpha) / 2.0,
            camera_eye.z + grass_size * (1.0 - cos_alpha) / 2.0);

    vec2 cen_uv = pos_to_uv(center, grass_size, base_point);

    // rounding grass plane
    float grass_edge_length = grass_size / 2.0;
    vec2 pos_from_map_center = abs(uv_to_pos(cen_uv - vec2(0.5), grass_size, vec2(0.0)));
    float max_radius = grass_edge_length * (1.0 + sqrt(2.0)) / 2.0;

    if (length(pos_from_map_center) > max_radius)
        return infinity_vertex();

    // for map sampling scale uv coords according to BATCH/MAP size ratio
    float map_size_mult = grass_size / grass_map_dim.z;
    vec2 cen_uv_scaled = (cen_uv - vec2(0.5)) * map_size_mult + vec2(0.5);
    vec3 grass_map_trans = cam_view * (grass_size / grass_map_dim.z - 1.0) / 2.0;
    cen_uv_scaled.x += grass_map_trans.x;
    cen_uv_scaled.y -= grass_map_trans.z;

    // remove short grass
    vec4 scale_color = texture2D(grass_map_color, cen_uv_scaled);
    float scale = scale_color.r;

    if (scale < u_scale_threshold)
        return infinity_vertex();

    // (DELTA = (HIGH - LOW)) > 0
    float height_delta = grass_map_dim.y - grass_map_dim.x;
    // in world space: HIGH - MAP * DELTA
    float height = grass_map_dim.y - texture2D(grass_map_depth, cen_uv_scaled).r *
            height_delta;

    // calculate new center and position
    vec2 pos_cen_delta = position.xz - center.xz;
    center.xz = uv_to_pos(cen_uv, grass_size, base_point);
    center.y = height;

    position.xz = center.xz + pos_cen_delta;
    // scale only grass height for now
    position.y *= scale;
    position.y += height;

    vec3 color = scale_color.gba;
# if BILLBOARD
    // NOTE: position in local space: position - center
    position -= center;
    mat4 bill_matrix = billboard_matrix(camera_eye, center, view_matrix);
    vertex world = to_world(position, center, tangent, binormal, normal, bill_matrix);
    world.center = center;
    world.color = color;
    return tbn_norm(world);
# else
    return tbn_norm(vertex(position, center, tangent, binormal, normal, color));
# endif
}

#endif
