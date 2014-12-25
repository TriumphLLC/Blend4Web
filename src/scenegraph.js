"use strict";

/**
 * Rendering graph routines.
 *
 * Rendering graph consists of rendering subscenes, which in turn may have
 * zero or more inputs and one or more outputs. All subscenes must be closed
 * to last SINK element. SINK element is a fictional subscene without any outputs.
 *
 * @name scenegraph
 * @namespace
 * @exports exports as scenegraph
 */
b4w.module["__scenegraph"] = function(exports, require) {

var m_cam    = require("__camera");
var m_cfg    = require("__config");
var m_debug  = require("__debug");
var m_graph  = require("__graph");
var m_render = require("__renderer");
var m_tex    = require("__textures");
var m_util   = require("__util");

var m_vec4 = require("vec4");

var cfg_dbg = m_cfg.debug_subs;
var cfg_def = m_cfg.defaults;
var cfg_scs = m_cfg.scenes;

var DEBUG_DISABLE_TEX_REUSE = false;

/**
 * Prepare forward rendering graph compatible with generic WebGL 1.0.
 * @param cam_render Camera render object
 * @param sc_render Scene render object
 * @returns Rendering graph
 */
exports.create_rendering_graph_compat = function(cam_render, sc_render) {

    var graph = m_graph.create();

    var cam = cam_render.cameras[0];

    var num_lights   = sc_render.lamps_number;
    var wls_params   = sc_render.world_light_set;
    var fog          = sc_render.fog_color_density;
    var water_params = sc_render.water_params;

    var subs_main_opaque = create_subs_main("OPAQUE", cam, true, water_params,
            num_lights, fog, wls_params, null, sc_render.sun_exist);
    m_graph.append_node_attr(graph, subs_main_opaque);

    var subs_main_blend = create_subs_main("BLEND", cam, true, water_params,
            num_lights, fog, wls_params, null, null, sc_render.sun_exist);
    m_graph.append_node_attr(graph, subs_main_blend);
    m_graph.append_edge_attr(graph, subs_main_opaque, subs_main_blend,
            create_slink("SCREEN", "NONE", 1, 1, true));

    if (sc_render.xray) {
        var subs_main_xray = create_subs_main("XRAY", cam, false, water_params,
                num_lights, fog, wls_params, null, sc_render.sun_exist);
        m_graph.append_node_attr(graph, subs_main_xray);
        m_graph.append_edge_attr(graph, subs_main_blend, subs_main_xray,
                create_slink("SCREEN", "NONE", 1, 1, true));
    }

    var subs_sink = create_subs_sink();
    m_graph.append_node_attr(graph, subs_sink);

    // wireframe stuff
    if (cfg_def.wireframe_debug) {
        var subs_wireframe = create_subs_wireframe(cam);
        m_graph.append_node_attr(graph, subs_wireframe);

        if (sc_render.xray)
            m_graph.append_edge_attr(graph, subs_main_xray, subs_wireframe,
                    create_slink("SCREEN", "NONE", 1, 1, true));
        else
            m_graph.append_edge_attr(graph, subs_main_blend, subs_wireframe,
                    create_slink("SCREEN", "NONE", 1, 1, true));

        m_graph.append_edge_attr(graph, subs_wireframe, subs_sink,
                create_slink("SCREEN", "NONE", 1, 1, true));
    } else
        m_graph.append_edge_attr(graph, subs_main_blend, subs_sink,
                create_slink("SCREEN", "NONE", 1, 1, true));

    if (sc_render.color_picking) {
        // color picking only for left main subscene
        var cam = cam_copy(subs_main_opaque.camera);

        // camera depends on bpy camera
        cam_render.cameras.push(cam);

        var subs_color_picking = create_subs_color_picking(cam, false);
        m_graph.append_node_attr(graph, subs_color_picking);
        if (sc_render.xray) {
            var cam = cam_copy(subs_main_opaque.camera);
            cam_render.cameras.push(cam);
            var subs_color_picking_xray = create_subs_color_picking(cam, true);
            m_graph.append_node_attr(graph, subs_color_picking_xray);
            var cp_slink_c = create_slink("COLOR", "COLOR",
                                                        1, 1, true);
            m_graph.append_edge_attr(graph, subs_color_picking,
                                     subs_color_picking_xray, cp_slink_c);
            m_graph.append_edge_attr(graph, subs_color_picking_xray, subs_sink,
                    create_slink("COLOR", "NONE", 1, 1, true));
            // do not use renderbuffer to improve depth textures reusability
            m_graph.append_edge_attr(graph, subs_color_picking_xray, subs_sink,
                    create_slink("DEPTH", "NONE", 1, 1, true));
        } else {
            m_graph.append_edge_attr(graph, subs_color_picking, subs_sink,
                    create_slink("COLOR", "NONE", 1, 1, true));
            // do not use renderbuffer to improve depth textures reusability
            m_graph.append_edge_attr(graph, subs_color_picking, subs_sink,
                    create_slink("DEPTH", "NONE", 1, 1, true));
        }
    }

    if (sc_render.sky_params.procedural_skydome) {
        var sky_params = sc_render.sky_params;
        var subs_sky = create_subs_sky(num_lights, sky_params);

        m_graph.append_node_attr(graph, subs_sky);

        var slink_sky = create_slink("CUBEMAP", "u_sky",
                cfg_scs.cubemap_tex_size, 1, false);
        m_graph.append_edge_attr(graph, subs_sky, subs_sink, slink_sky);
    }

    enforce_graph_consistency(graph, true);

    if (cfg_def.resolution_factor > 1)
        apply_resolution_factor(graph);

    process_subscene_links(graph);
    assign_render_targets(graph);

    return graph;
}

function cam_copy(cam) {
    var cam_new = m_util.clone_object_r(cam);

    // reset attachments, see process_subscene_links() and assign_render_targets()
    cam_new.framebuffer = null;
    cam_new.color_attachment = null;
    cam_new.depth_attachment = null;

    return cam_new;
}

/**
 * Enforce uniqueness, slinks compliance, compat mode etc
 */
function enforce_graph_consistency(graph, compat) {

    var slinks = [];

    // make inter-subscene slinks unique
    m_graph.traverse_edges(graph, function(node1, node2, attr) {
        var slink = attr;

        if (slinks.indexOf(slink) > -1)
            m_graph.replace_edge_attr(graph, node1, node2, slink,
                    clone_slink(slink));
        else
            slinks.push(slink);
    });

    m_graph.traverse(graph, function(id, attr) {
        var subs = attr;

        // make internal slinks unique
        for (var i = 0; i < subs.slinks_internal.length; i++) {
            var slink = subs.slinks_internal[i];

            if (slinks.indexOf(slink) > -1)
                subs.slinks_internal[i] = clone_slink(slink);
            else
                slinks.push(slink);
        }

        // assign linear filtering to MOTION_BLUR accumulator
        // if such subscene connected to ANTIALIASING
        if (subs.type == "ANTIALIASING")
            m_graph.traverse_inputs(graph, id, function(id_in, attr_in,
                    attr_edge) {

                var subs_in = attr_in;

                if (subs_in.type == "MOTION_BLUR") {
                    for (var i = 0; i < subs_in.slinks_internal.length; i++) {
                        var slink_mb_int = subs_in.slinks_internal[i];
                        slink_mb_int.min_filter = m_tex.TF_LINEAR;
                        slink_mb_int.mag_filter = m_tex.TF_LINEAR;
                    }
                }
            });

    });

    m_graph.traverse(graph, function(id, attr) {
        var subs = attr;

        var dest = {};

        combine_same_slinks(graph, id, dest);

        for (var i in dest) {
            var slinks = dest[i];

            if (compat)
                for (var j = 0; j < slinks.length; j++) {
                    var slink = slinks[j];
                    if (slink.from != "DEPTH")
                        continue;

                    if (!check_slink_tex_conn(slink))
                        slink.use_renderbuffer = true;
                    else
                        throw "Failed to use renderbuffer as input texture: " +
                                slink.from + "->" + slink.to;
                }

            // select maximum quality min filter
            var min_filt_slink = slinks[0];
            for (var j = 0; j < slinks.length; j++) {
                if (slinks[j].min_filter == m_tex.TF_LINEAR) {
                    min_filt_slink = slinks[j];
                    break;
                }
            }

            // select maximum quality mag filter
            var mag_filt_slink = slinks[0];
            for (var j = 0; j < slinks.length; j++) {
                if (slinks[j].mag_filter == m_tex.TF_LINEAR) {
                    mag_filt_slink = slinks[j];
                    break;
                }
            }

            // select non-renderbuffer
            var not_rb_slink = slinks[0];
            for (var j = 0; j < slinks.length; j++) {
                if (!slinks[j].use_renderbuffer) {
                    not_rb_slink = slinks[j];
                    break;
                }
            }

            // assign values from selected slinks
            for (var j = 0; j < slinks.length; j++) {
                slinks[j].min_filter = min_filt_slink.min_filter;
                slinks[j].mag_filter = mag_filt_slink.mag_filter;
                slinks[j].use_renderbuffer = not_rb_slink.use_renderbuffer;
            }
        }

    });
}

function combine_same_slinks(graph, id, dest) {

    m_graph.traverse_inputs(graph, id, function(id_in, attr_in,
            attr_edge) {
        var slink = attr_edge;

        // passive slink doesn't affect other
        if (!slink.active)
            return;

        if (slink.from == slink.to) {
            dest[slink.from] = dest[slink.from] || [];

            if (dest[slink.from].indexOf(slink) == -1)
                dest[slink.from].push(slink);

            combine_same_slinks(graph, id_in, dest);
        }
    });

    m_graph.traverse_outputs(graph, id, function(id_out, attr_out,
            attr_edge) {
        var slink = attr_edge;

        // passive slink doesn't affect other
        if (!slink.active)
            return;

        dest[slink.from] = dest[slink.from] || [];
        if (dest[slink.from].indexOf(slink) == -1)
            dest[slink.from].push(slink);
    });

    // special case: internal interchanges with output
    var subs = m_graph.get_node_attr(graph, id);
    if (subs.type == "MOTION_BLUR") {
        for (var i = 0; i < subs.slinks_internal.length; i++) {
            var slink = subs.slinks_internal[i];
            dest[slink.from].push(slink);
        }
    }
}


exports.check_slink_tex_conn = check_slink_tex_conn;
function check_slink_tex_conn(slink) {
    switch (slink.to) {
    case "COLOR":
    case "CUBEMAP":
    case "DEPTH":
    case "SCREEN":
    case "NONE":
        return false;
    default:
        return true;
    }
}

function clone_slink(slink) {
    if (slink.texture)
        throw "Failed to clone slink with attached texture";

    return m_util.clone_object_json(slink);
}

function process_subscene_links(graph) {

    var graph_sorted = m_graph.topsort(graph);
    var tex_storage_all = [];

    m_graph.traverse(graph_sorted, function(id, attr) {
        var subs = attr;

        // disable texture reuse for some scenes
        switch (subs.type) {
        case "MOTION_BLUR":
        case "SMAA_RESOLVE":
        case "SMAA_NEIGHBORHOOD_BLENDING":
        case "MAIN_REFLECT":
            var tex_storage = [];
            break;
        default:
            var tex_storage = tex_storage_all;
            break;
        }

        // assign new (or unused) internal textures
        for (var i = 0; i < subs.slinks_internal.length; i++) {
            var slink = subs.slinks_internal[i];

            var tex = tex_aquire(tex_storage, slink,
                    calc_slink_id(slink));

            slink.texture = tex;
            subs.textures_internal[i] = tex;
        }

        // release internal textures now
        for (var i = 0; i < subs.textures_internal.length; i++) {
            var tex = subs.textures_internal[i];
            tex_dec_ref(tex_storage, tex);
        }

        // NOTE: special case for internal textures, which may be used as external
        switch (subs.type) {
        case "MOTION_BLUR":
        case "SMAA_RESOLVE":
        case "SMAA_NEIGHBORHOOD_BLENDING":
        case "MAIN_REFLECT":
            var tex_storage = [];
            break;
        default:
            break;
        }

        // connect new (or unused) external textures
        m_graph.traverse_outputs(graph_sorted, id, function(id_out, attr_out,
                attr_edge) {
            var slink = attr_edge;

            var tex = find_nearest_tex(graph_sorted, id, slink.from);
            if (tex && slink.active && !slink.texture) {
                tex_inc_ref(tex_storage, tex);
                slink.texture = tex;
                return;
            }

            var tex = tex_aquire(tex_storage, slink,
                    calc_slink_id(slink));

            slink.texture = tex;
        });

        // release unused textures from previous subscenes
        m_graph.traverse_inputs(graph_sorted, id, function(id_in, attr_in,
                attr_edge) {
            var slink = attr_edge;
            var subs_in = attr_in;

            tex_dec_ref(tex_storage, slink.texture);
        });

        // release unused non-connected textures
        m_graph.traverse_outputs(graph_sorted, id, function(id_out, attr_out,
                attr_edge) {
            var slink = attr_edge;

            if (slink.texture && slink.to == "NONE") {
                tex_dec_ref(tex_storage, slink.texture);
            }
        });
    });
}

function apply_resolution_factor(graph) {
    traverse_slinks(graph, function(slink, internal, subs1, subs2) {
        if (slink.update_dim
              && ((has_lower_subs(graph, subs1, "SMAA_NEIGHBORHOOD_BLENDING")
                   && subs1.type != "SMAA_NEIGHBORHOOD_BLENDING")

               || (has_lower_subs(graph, subs1, "ANTIALIASING")))
            )
            slink.size_mult *= cfg_def.resolution_factor;
    });
}

function calc_slink_id(slink) {
    var id_obj = m_util.clone_object_json(slink);
    delete id_obj.to;
    delete id_obj.active;
    return JSON.stringify(id_obj);
}

function find_nearest_tex(graph, id, type) {

    var tex = null;

    m_graph.traverse_inputs(graph, id, function(id_in, attr_in,
            attr_edge) {
        var slink = attr_edge;

        if (slink.active && slink.from == slink.to && slink.from == type &&
                slink.texture) {
            tex = slink.texture;
            return true;
        }
    });

    m_graph.traverse_outputs(graph, id, function(id_out, attr_out,
            attr_edge) {
        var slink = attr_edge;

        if (slink.active && slink.from == type && slink.texture) {
            tex = slink.texture;
            return true;
        }
    });

    return tex;
}

function tex_inc_ref(storage, tex) {
    for (var i = 0; i < storage.length; i++) {
        var item = storage[i];

        if (item.tex === tex)
            item.ref++;
    }
}

function tex_dec_ref(storage, tex) {
    for (var i = 0; i < storage.length; i++) {
        var item = storage[i];

        if (item.tex === tex && item.ref)
            item.ref--;
    }
}

function tex_aquire(storage, slink, slink_id) {

    var storage_item_free = null;

    // find first unused attachment
    for (var i = 0; i < storage.length; i++) {
        var item = storage[i];

        if (item.id == slink_id && item.ref === 0) {
            storage_item_free = item;
            break;
        }
    }

    if (storage_item_free && !DEBUG_DISABLE_TEX_REUSE) {
        storage_item_free.ref++;
        return storage_item_free.tex;
    } else {
        var tex = tex_create_for_slink(slink);
        storage.push({
            id: slink_id,
            ref: 1,
            tex: tex
        });
        return tex;
    }
}

function tex_create_for_slink(slink) {
    var size = slink.size_mult * slink.size;

    switch (slink.from) {
    case "COLOR":
        var tex = m_tex.create_texture("COLOR", m_tex.TT_RGBA_INT);
        m_tex.resize(tex, size, size);
        m_tex.set_filters(tex, slink.min_filter, slink.mag_filter);
        return tex;
    case "DEPTH":
        if (slink.use_renderbuffer) {
            var tex = m_tex.create_texture("DEPTH_RBUF", m_tex.TT_RENDERBUFFER);
            m_tex.resize(tex, size, size);
        } else {
            var tex = m_tex.create_texture("DEPTH_TEX", m_tex.TT_DEPTH);
            m_tex.resize(tex, size, size);
            m_tex.set_filters(tex, slink.min_filter, slink.mag_filter);
        }
        return tex;
    case "CUBEMAP":
        var tex = m_tex.create_cubemap_texture("CUBEMAP", size);
        return tex;
    case "SCREEN":
        return null;
    default:
        throw "Wrong slink param: " + slink.from;
    }
}


exports.traverse_slinks = traverse_slinks;
/**
 */
function traverse_slinks(graph, callback) {

    var exit = false;

    // process slinks assigned as inter-subscene edges
    m_graph.traverse_edges(graph, function(node1, node2, attr) {
        var slink = attr;
        if (!slink)
            return;

        var subs1 = m_graph.get_node_attr(graph, node1);
        var subs2 = m_graph.get_node_attr(graph, node2);

        if (callback(slink, false, subs1, subs2)) {
            exit = true;
            return true;
        }
    });

    if (exit)
        return;

    // process internal slinks
    m_graph.traverse(graph, function(node, attr) {
        var subs = attr;

        for (var i = 0; i < subs.slinks_internal.length; i++) {
            var slink = subs.slinks_internal[i];

            if (callback(slink, true, subs, null))
                return true;
        }
    });
}

function assign_render_targets(graph) {
    m_graph.traverse(graph, function(id, attr) {
        var subs = attr;

        if (subs.type == "SINK")
            return;

        var cam = subs.camera;

        m_graph.traverse_outputs(graph, id, function(id_out, attr_out,
                attr_edge) {
            var slink = attr_edge;

            if (slink.active && slink.texture) {
                m_cam.set_attachment(cam, slink.from, slink.texture);

                if (slink.from == slink.to && attr_out.camera)
                    m_cam.set_attachment(attr_out.camera, slink.from, slink.texture);
            }
        });

        for (var i = 0; i < subs.slinks_internal.length; i++) {
            var slink = subs.slinks_internal[i];

            if (slink.active && slink.from == slink.to) {
                var tex = subs.textures_internal[i];
                m_cam.set_attachment(cam, slink.from, tex);
            }
        }

        if ((cam.color_attachment || cam.depth_attachment) && !cam.framebuffer)
            cam.framebuffer = m_render.render_target_create(cam.color_attachment,
                    cam.depth_attachment);
    });
}

/**
 * Prepare full-featured rendering graph for given scene render.
 * @param {Boolean} render_to_texture Prepare graph for texture rendering
 * @param sc_render Scene render object
 * @param cam_render Camera render object
 * @returns Rendering graph
 */
exports.create_rendering_graph = function(render_to_texture, sc_render, cam_render) {

    var graph = m_graph.create();

    // subscenes from previous level
    var prev_level = [];
    // currently populated level
    var curr_level = [];

    // per eye
    var depth_subscenes       = [];

    var slinks_main_color_o   = [];
    var slinks_main_depth_o   = [];

    // per eye
    var reflect_subscenes     = [];
    var reflect_links         = [];

    // per eye
    var refract_subscenes     = [];
    var refract_links         = [];

    // shared
    var shadow_subscenes      = [];
    var shadow_links          = [];

    var num_lights      = sc_render.lamps_number;
    var water_params    = sc_render.water_params;
    var shore_smoothing = sc_render.shore_smoothing;
    var render_shadows  = sc_render.render_shadows;
    var ssao            = sc_render.ssao;
    var god_rays        = sc_render.god_rays;
    var refractions     = sc_render.refractions;
    var refl_planes     = sc_render.refl_planes;
    var bloom           = sc_render.bloom;
    var motion_blur     = sc_render.motion_blur;
    var compositing     = sc_render.compositing;
    var antialiasing    = sc_render.antialiasing;
    var wls_params      = sc_render.world_light_set;
    var fog             = sc_render.fog_color_density;
    var shadow_params   = sc_render.shadow_params;
    var mb_params       = sc_render.mb_params;
    var bloom_params    = sc_render.bloom_params;
    var cc_params       = sc_render.cc_params;
    var gr_params       = sc_render.god_rays_params;
    var glow_params     = sc_render.glow_params;
    var dof             = sc_render.dof;

    // prepare main cam/cams

    var main_cams = [];

    if (cfg_def.anaglyph_use && !render_to_texture) {

        var cam_left = cam_render.cameras[0];
        var cam_right = cam_copy(cam_left);

        m_cam.make_stereo(cam_left, m_cam.TYPE_STEREO_LEFT);
        //m_cam.set_view(cam_left, bpy_scene["camera"]);

        m_cam.make_stereo(cam_right, m_cam.TYPE_STEREO_RIGHT);
        //m_cam.set_view(cam_right, bpy_scene["camera"]);

        main_cams.push(cam_left, cam_right);
        cam_render.cameras.push(cam_right);
    } else {
        var cam = cam_render.cameras[0];
        main_cams.push(cam);
    }

    // shadow stuff
    if (render_shadows) {
        m_cam.update_camera_shadows(main_cams[0], shadow_params);

        var csm_num = shadow_params.csm_num;
        for (var i = 0; i < csm_num; i++) {
            var subs_shadow = create_subs_shadow_cast(i, shadow_params);
            m_graph.append_node_attr(graph, subs_shadow);
            shadow_subscenes.push(subs_shadow);

            var tex_size = shadow_params.csm_resolution;

            var cam = subs_shadow.camera;

            cam.width = tex_size;
            cam.height = tex_size;

            subs_shadow.clear_color = false;

            shadow_links.push(create_slink("DEPTH", "u_shadow_map" + i,
                        tex_size, 1, false));

            if (m_debug.check_depth_only_issue()) {
                subs_shadow.slinks_internal.push(create_slink("COLOR",
                        "COLOR", tex_size, 1, false));
            }
        }
    }

    // main reflect
    if (refl_planes.length > 0 && !render_to_texture) {
        for (var i = 0; i < main_cams.length; i++) {
            var cam = cam_copy(main_cams[i]);
            cam_render.cameras.push(cam);

            var subs_main = create_subs_main("REFLECT", cam, false,
                    water_params, num_lights, fog, wls_params, null, sc_render.sun_exist);
            subs_main.reflection_plane = refl_planes[0];
            subs_main.camera.reflection_plane = refl_planes[0];

            m_graph.append_node_attr(graph, subs_main);

            reflect_subscenes.push(subs_main);

            var slink_refl_c = create_slink("COLOR", "u_reflectmap", 1,
                    cfg_def.reflect_multiplier, true);
            reflect_links.push(slink_refl_c);

            var slink_refl_d = create_slink("DEPTH", "DEPTH", 1,
                    cfg_def.reflect_multiplier, true);
            subs_main.slinks_internal.push(slink_refl_d);
        }
    }

    prev_level = [];
    curr_level = [];

    if (sc_render.dynamic_grass) {
        var subs_grass_map = create_subs_grass_map();

        m_graph.append_node_attr(graph, subs_grass_map);

        var tex_size = cfg_scs.grass_tex_size;

        // NOTE: deprecated
        subs_grass_map.camera.width = tex_size;
        subs_grass_map.camera.height = tex_size;

        var slink_grass_map_d = create_slink("DEPTH", "u_grass_map_depth",
                tex_size, 1, false);
        slink_grass_map_d.min_filter = m_tex.TF_LINEAR;
        slink_grass_map_d.mag_filter = m_tex.TF_LINEAR;


        // NOTE: need to be optional?
        var slink_grass_map_c = create_slink("COLOR", "u_grass_map_color",
                tex_size, 1, false);
        slink_grass_map_c.min_filter = m_tex.TF_LINEAR;
        slink_grass_map_c.mag_filter = m_tex.TF_LINEAR;
    } else {
        var subs_grass_map = null;
        var slink_grass_map_d = null;
        var slink_grass_map_c = null;
    }

    // main opaque
    for (var i = 0; i < main_cams.length; i++) {
        var cam = main_cams[i];

        var cam_depth = cam_copy(cam);
        cam_render.cameras.push(cam_depth);

        // depth + shadow receive pass with blur
        if (render_shadows) {

            var subs_depth = create_subs_depth_shadow(graph, cam_depth,
                    shadow_params);
            m_graph.append_node_attr(graph, subs_depth);

            for (var j = 0; j < shadow_subscenes.length; j++) {
                var subs_shadow = shadow_subscenes[j];
                var slink_shadow = shadow_links[j];

                m_graph.append_edge_attr(graph, subs_shadow, subs_depth, slink_shadow);
            }

            var slink_depth_c = create_slink("COLOR", "u_color", 1, 1, true);
            var slink_depth_d = create_slink("DEPTH", "u_depth", 1, 1, true);

            if (ssao) {
                // ssao
                var cam_ssao = cam_copy(cam);
                cam_render.cameras.push(cam_ssao);

                var ssao_params = sc_render.ssao_params;
                var subs_ssao = create_subs_ssao(cam_ssao, fog, ssao_params);
                m_graph.append_node_attr(graph, subs_ssao);

                var slink_ssao = create_slink("COLOR", "u_ssao_mask", 1, 1, true);

                m_graph.append_edge_attr(graph, subs_depth, subs_ssao, slink_depth_c);
                m_graph.append_edge_attr(graph, subs_depth, subs_ssao, slink_depth_d);

                // ssao_blur
                var cam_ssao_blur = cam_copy(cam);
                cam_render.cameras.push(cam_ssao_blur);

                var subs_ssao_blur = create_subs_ssao_blur(cam_ssao_blur, ssao_params);
                m_graph.append_node_attr(graph, subs_ssao_blur);

                var slink_ssao_blur = create_slink("COLOR", "u_shadow_mask", 1, 1, true);

                m_graph.append_edge_attr(graph, subs_ssao, subs_ssao_blur, slink_ssao);
                m_graph.append_edge_attr(graph, subs_depth, subs_ssao_blur, slink_depth_d);
            }

            var cam_depth_pack = cam_copy(cam_depth);
            cam_render.cameras.push(cam_depth_pack);

            var subs_depth_pack = create_subs_depth_pack(cam_depth_pack);
            m_graph.append_node_attr(graph, subs_depth_pack);
            m_graph.append_edge_attr(graph, subs_depth, subs_depth_pack,
                    create_slink("DEPTH", "u_depth", 1, 1, true));

            depth_subscenes.push(subs_depth_pack);

            var slink_depth_o = create_slink("DEPTH", "DEPTH", 1, 1, true);
            slinks_main_depth_o.push(slink_depth_o);
        } else {
            var subs_depth = create_subs_depth_shadow(graph, cam_depth,
                    shadow_params);
            m_graph.append_node_attr(graph, subs_depth);

            var slink_depth_o = create_slink("DEPTH", "DEPTH", 1, 1, true);
            slinks_main_depth_o.push(slink_depth_o);

            if (m_debug.check_depth_only_issue()) {
                subs_depth.slinks_internal.push(create_slink("COLOR",
                        "COLOR", 1, 1, true));
            }

            var cam_depth_pack = cam_copy(cam_depth);
            cam_render.cameras.push(cam_depth_pack);

            var subs_depth_pack = create_subs_depth_pack(cam_depth_pack);
            m_graph.append_node_attr(graph, subs_depth_pack);
            m_graph.append_edge_attr(graph, subs_depth, subs_depth_pack,
                    create_slink("DEPTH", "u_depth", 1, 1, true));

            depth_subscenes.push(subs_depth_pack);
        }

        if (subs_grass_map) {
            m_graph.append_edge_attr(graph, subs_grass_map, subs_depth,
                    slink_grass_map_d);
            m_graph.append_edge_attr(graph, subs_grass_map, subs_depth,
                    slink_grass_map_c);
        }

        // main
        var subs_main = create_subs_main("OPAQUE", cam, false,
                water_params, num_lights, fog, wls_params, null, sc_render.sun_exist);

        m_graph.append_node_attr(graph, subs_main);
        curr_level.push(subs_main);

        m_graph.append_edge_attr(graph, subs_depth, subs_main, slinks_main_depth_o[i]);

        if (slink_ssao)
            m_graph.append_edge_attr(graph, subs_ssao_blur, subs_main, slink_ssao_blur);
        else
            // NOTE: same as slink_depth_c
            m_graph.append_edge_attr(graph, subs_depth, subs_main,
                    create_slink("COLOR", "u_shadow_mask", 1, 1, true));

        var slink_main_c = create_slink("COLOR", "u_color", 1, 1, true);
        var slink_main_o = create_slink("COLOR", "COLOR", 1, 1, true);
        slinks_main_color_o.push(slink_main_o);

        if (subs_grass_map) {
            m_graph.append_edge_attr(graph, subs_grass_map, subs_main,
                    slink_grass_map_d);
            m_graph.append_edge_attr(graph, subs_grass_map, subs_main,
                    slink_grass_map_c);
        }

        if (reflect_subscenes.length) {
            m_graph.append_edge_attr(graph, reflect_subscenes[i], subs_main,
                    reflect_links[i]);
            subs_main.reflection_plane = refl_planes[0];
        }
    }

    prev_level = curr_level;
    curr_level = [];

    if (!render_to_texture && sc_render.color_picking) {
        // color picking only for left main subscene
        var cam = cam_copy(prev_level[0].camera);

        // camera depends on bpy camera
        cam_render.cameras.push(cam);

        var subs_color_picking = create_subs_color_picking(cam, false);
        m_graph.append_node_attr(graph, subs_color_picking);

        if (sc_render.xray) {
            var cam = cam_copy(prev_level[0].camera);
            cam_render.cameras.push(cam);
            var subs_color_picking_xray = create_subs_color_picking(cam, true);
            m_graph.append_node_attr(graph, subs_color_picking_xray);
            var cp_slink_c = create_slink("COLOR", "COLOR", 1, 1, true);
            m_graph.append_edge_attr(graph, subs_color_picking,
                                     subs_color_picking_xray, cp_slink_c);
            var cp_slink_d = create_slink("DEPTH", "DEPTH", 1, 1, true);
            m_graph.append_edge_attr(graph, subs_color_picking,
                                     subs_color_picking_xray, cp_slink_d);
        }
    } else
        var subs_color_picking = null;

    // refraction subscene
    if (refractions && !render_to_texture) {
        for (var i = 0; i < main_cams.length; i++) {
            var subs_refr = create_subs_refract();
            m_graph.append_node_attr(graph, subs_refr);
            m_graph.append_edge_attr(graph, prev_level[i], subs_refr, slink_main_c);

            refract_subscenes.push(subs_refr);
            refract_links.push(create_slink("COLOR", "u_refractmap", 1, 1, true));
        }
    }

    // main blend stuff
    var blend_subscenes = []
    for (var i = 0; i < main_cams.length; i++) {

        var subs_depth = depth_subscenes[i];
        var cam = cam_copy(main_cams[i]);

        cam_render.cameras.push(cam);

        var subs_main = create_subs_main("BLEND", cam, false, water_params,
                num_lights, fog, wls_params, shadow_params, sc_render.sun_exist);

        curr_level.push(subs_main);
        m_graph.append_node_attr(graph, subs_main);

        m_graph.append_edge_attr(graph, prev_level[i], subs_main, slinks_main_color_o[i]);
        m_graph.append_edge_attr(graph, prev_level[i], subs_main, slinks_main_depth_o[i]);

        if (subs_grass_map) {
            m_graph.append_edge_attr(graph, subs_grass_map, subs_main,
                    slink_grass_map_d);
            m_graph.append_edge_attr(graph, subs_grass_map, subs_main,
                    slink_grass_map_c);
        }

        for (var j = 0; j < shadow_subscenes.length; j++) {
            var subs_shadow = shadow_subscenes[j];
            var slink_shadow = shadow_links[j];

            m_graph.append_edge_attr(graph, subs_shadow, subs_main, slink_shadow);
        }

        if (subs_depth.type == "DEPTH_PACK") {
            var slink_depth_in = create_slink("COLOR", "u_scene_depth", 1, 1,
                                              true);
            slink_depth_in.min_filter = m_tex.TF_NEAREST;
            slink_depth_in.mag_filter = m_tex.TF_NEAREST;
            m_graph.append_edge_attr(graph, subs_depth, subs_main,
                                     slink_depth_in);
        } else {
            var slink_depth_in = create_slink("DEPTH", "u_scene_depth", 1, 1,
                                              true);
            slink_depth_in.min_filter = m_tex.TF_LINEAR;
            slink_depth_in.mag_filter = m_tex.TF_LINEAR;
            m_graph.append_edge_attr(graph, subs_depth, subs_main,
                                     slink_depth_in);
        }

        if (reflect_subscenes.length) {
            m_graph.append_edge_attr(graph, reflect_subscenes[i], subs_main,
                    reflect_links[i]);
            subs_main.reflection_plane = refl_planes[0];
        }

        if (refract_subscenes.length)
            m_graph.append_edge_attr(graph, refract_subscenes[i], subs_main, refract_links[i]);

        blend_subscenes.push(subs_main);
    }

    prev_level = curr_level;
    curr_level = [];

    if (sc_render.xray) {
        // Objects which are rendered above all
        for (var i = 0; i < main_cams.length; i++) {

            var subs_depth = depth_subscenes[i];
            var cam = cam_copy(main_cams[i]);

            cam_render.cameras.push(cam);

            var subs_main = create_subs_main("XRAY", cam, false, water_params,
                    num_lights, fog, wls_params, shadow_params, sc_render.sun_exist);

            curr_level.push(subs_main);
            m_graph.append_node_attr(graph, subs_main);

            m_graph.append_edge_attr(graph, prev_level[i], subs_main, slinks_main_color_o[i]);
            m_graph.append_edge_attr(graph, prev_level[i], subs_main, slinks_main_depth_o[i]);

            if (subs_grass_map) {
                m_graph.append_edge_attr(graph, subs_grass_map, subs_main,
                        slink_grass_map_d);
                m_graph.append_edge_attr(graph, subs_grass_map, subs_main,
                        slink_grass_map_c);
            }

            for (var j = 0; j < shadow_subscenes.length; j++) {
                var subs_shadow = shadow_subscenes[j];
                var slink_shadow = shadow_links[j];

                m_graph.append_edge_attr(graph, subs_shadow, subs_main, slink_shadow);
            }

            if (subs_depth.type == "DEPTH_PACK") {
                var slink_depth_in = create_slink("COLOR", "u_scene_depth", 1, 1,
                                                  true);
                slink_depth_in.min_filter = m_tex.TF_NEAREST;
                slink_depth_in.mag_filter = m_tex.TF_NEAREST;
                m_graph.append_edge_attr(graph, subs_depth, subs_main,
                                         slink_depth_in);
            } else {
                var slink_depth_in = create_slink("DEPTH", "u_scene_depth", 1, 1,
                                                  true);
                slink_depth_in.min_filter = m_tex.TF_LINEAR;
                slink_depth_in.mag_filter = m_tex.TF_LINEAR;
                m_graph.append_edge_attr(graph, subs_depth, subs_main,
                                         slink_depth_in);
            }

            if (reflect_subscenes.length) {
                m_graph.append_edge_attr(graph, reflect_subscenes[i], subs_main,
                        reflect_links[i]);
                subs_main.reflection_plane = refl_planes[0];
            }

            if (refract_subscenes.length)
                m_graph.append_edge_attr(graph, refract_subscenes[i], subs_main, refract_links[i]);

        }

        prev_level = curr_level;
        curr_level = [];
    }

    // wireframe stuff
    if (cfg_def.wireframe_debug) {
        for (var i = 0; i < main_cams.length; i++) {
            var cam = m_util.clone_object_r(main_cams[i]);
            cam_render.cameras.push(cam);

            var subs_wireframe = create_subs_wireframe(cam);
            curr_level.push(subs_wireframe);
            m_graph.append_node_attr(graph, subs_wireframe);
            m_graph.append_edge_attr(graph, prev_level[i], subs_wireframe,
                    slinks_main_color_o[i]);
            m_graph.append_edge_attr(graph, prev_level[i], subs_wireframe,
                    slinks_main_depth_o[i]);

            if (subs_grass_map) {
                m_graph.append_edge_attr(graph, subs_grass_map, subs_wireframe,
                        slink_grass_map_d);
                m_graph.append_edge_attr(graph, subs_grass_map, subs_wireframe,
                        slink_grass_map_c);
            }
        }

        prev_level = curr_level;
        curr_level = [];
    }

    // god rays stuff
    if (god_rays && !render_to_texture) {
        for (var i = 0; i < main_cams.length; i++) {

            var max_ray_length = gr_params.max_ray_length;
            var intensity      = gr_params.intensity;
            var steps_per_pass = gr_params.steps_per_pass;

            var subs_prev = prev_level[i];
            var water = water_params ? 1 : 0;

            var slink_gr_d = create_slink("DEPTH", "u_input", 1, 1, true);
            slink_gr_d.min_filter = m_tex.TF_LINEAR;
            slink_gr_d.mag_filter = m_tex.TF_LINEAR;

            var slink_gr_c = create_slink("COLOR", "u_input", 1, 0.25, true);
            slink_gr_c.min_filter = m_tex.TF_LINEAR;
            slink_gr_c.mag_filter = m_tex.TF_LINEAR;

            // 1-st pass
            var step = max_ray_length / steps_per_pass;
            var cam_god_rays = cam_copy(main_cams[i]);
            cam_render.cameras.push(cam_god_rays);
            var subs_god_rays = create_subs_god_rays(cam_god_rays,
                                water, max_ray_length, true, step, num_lights,
                                steps_per_pass);
            m_graph.append_node_attr(graph, subs_god_rays);
            m_graph.append_edge_attr(graph, subs_prev, subs_god_rays, slink_gr_d);

            // 2-nd pass
            step = max_ray_length / steps_per_pass * 0.5;
            var cam_blur1 = cam_copy(main_cams[i]);
            cam_render.cameras.push(cam_blur1);
            var subs_gr_blur1 = create_subs_god_rays(cam_blur1,
                                water, max_ray_length, false, step, num_lights,
                                steps_per_pass);
            m_graph.append_node_attr(graph, subs_gr_blur1);
            m_graph.append_edge_attr(graph, subs_god_rays, subs_gr_blur1, slink_gr_c);

            // 3-d pass
            step = max_ray_length / steps_per_pass * 0.25;
            var cam_blur2 = cam_copy(main_cams[i]);
            cam_render.cameras.push(cam_blur2);
            var subs_gr_blur2 = create_subs_god_rays(cam_blur2,
                                water, max_ray_length, false, step, num_lights,
                                steps_per_pass);
            m_graph.append_node_attr(graph, subs_gr_blur2);
            m_graph.append_edge_attr(graph, subs_gr_blur1, subs_gr_blur2, slink_gr_c);

            if (reflect_subscenes.length) {
                subs_god_rays.reflection_plane = refl_planes[0];
                subs_gr_blur1.reflection_plane = refl_planes[0];
                subs_gr_blur2.reflection_plane = refl_planes[0];
            }

            // combine with main scene
            var subs_god_rays_comb = create_subs_god_rays_comb(intensity,
                                                               num_lights);
            curr_level.push(subs_god_rays_comb);
            m_graph.append_node_attr(graph, subs_god_rays_comb);
            m_graph.append_edge_attr(graph, subs_prev, subs_god_rays_comb,
                    create_slink("COLOR", "u_main", 1, 1, true));
            m_graph.append_edge_attr(graph, subs_gr_blur2, subs_god_rays_comb,
                    create_slink("COLOR", "u_god_rays", 1, 1, true));
        }
        prev_level = curr_level;
        curr_level = [];
    }

    // bloom
    if (bloom && !render_to_texture) {
        for (var i = 0; i < main_cams.length; i++) {
            var subs_prev = prev_level[i];

            var subs_luminance = create_subs_luminance();
            m_graph.append_node_attr(graph, subs_luminance);
            m_graph.append_edge_attr(graph, subs_prev, subs_luminance,
                    create_slink("COLOR", "u_input", 1, 1, true));

            var subs_av_luminance = create_subs_av_luminance();
            m_graph.append_node_attr(graph, subs_av_luminance);

            // NOTE: deprecated
            subs_av_luminance.camera.width = 1;
            subs_av_luminance.camera.height = 1;

            var slink_luminance_av = create_slink("COLOR", "u_input", 1, 0.25, true);
            slink_luminance_av.min_filter = m_tex.TF_LINEAR;
            slink_luminance_av.mag_filter = m_tex.TF_LINEAR;

            var slink_luminance_tr = create_slink("COLOR", "u_luminance", 1, 0.25, true);
            slink_luminance_tr.min_filter = m_tex.TF_LINEAR;
            slink_luminance_tr.mag_filter = m_tex.TF_LINEAR;

            m_graph.append_edge_attr(graph, subs_luminance, subs_av_luminance,
                    slink_luminance_av);

            var bloom_key = bloom_params.key;
            var edge_lum  = bloom_params.edge_lum;

            var cam_luminance = cam_copy(main_cams[i]);
            cam_render.cameras.push(cam_luminance);
            var subs_lum_trunced = create_subs_luminance_trunced(bloom_key,
                                         edge_lum, num_lights, cam_luminance);

            m_graph.append_node_attr(graph, subs_lum_trunced);
            m_graph.append_edge_attr(graph, subs_prev, subs_lum_trunced,
                    create_slink("COLOR", "u_main", 1, 1, true));
            m_graph.append_edge_attr(graph, subs_luminance, subs_lum_trunced,
                    slink_luminance_tr);
            m_graph.append_edge_attr(graph, subs_av_luminance, subs_lum_trunced,
                    create_slink("COLOR", "u_average_lum", 1, 1, false));

            var slink_blur_in = create_slink("COLOR", "u_color", 1, 0.25, true);
            slink_blur_in.min_filter = m_tex.TF_LINEAR;
            slink_blur_in.mag_filter = m_tex.TF_LINEAR;

            var blur_x = create_subs_bloom_blur(graph, subs_luminance, "X_BLUR", true);
            m_graph.append_node_attr(graph, blur_x);
            m_graph.append_edge_attr(graph, subs_lum_trunced, blur_x, slink_blur_in);

            var blur_y = create_subs_bloom_blur(graph, blur_x, "Y_BLUR", true);
            m_graph.append_node_attr(graph, blur_y);
            m_graph.append_edge_attr(graph, blur_x, blur_y, slink_blur_in);

            var bloom_blur = bloom_params.blur;
            var subs_bloom_combine = create_subs_bloom_combine(bloom_blur);
            m_graph.append_node_attr(graph, subs_bloom_combine);

            var slink_bloom = create_slink("COLOR", "u_bloom", 1, 0.25, true);
            slink_bloom.min_filter = m_tex.TF_LINEAR;
            slink_bloom.mag_filter = m_tex.TF_LINEAR;
            m_graph.append_edge_attr(graph, blur_y, subs_bloom_combine, slink_bloom);
            m_graph.append_edge_attr(graph, subs_prev, subs_bloom_combine,
                    create_slink("COLOR", "u_main", 1, 1, true));

            curr_level.push(subs_bloom_combine);
        }
        prev_level = curr_level;
        curr_level = [];
    }


    // motion blur stuff
    if (motion_blur && !render_to_texture) {

        for (var i = 0; i < prev_level.length; i++) {
            var subs_to_blur = prev_level[i];
            var subs_mb = create_subs_motion_blur(mb_params.mb_decay_threshold,
                    mb_params.mb_factor);
            curr_level.push(subs_mb);

            m_graph.append_node_attr(graph, subs_mb);

            var slink_mb_in = create_slink("COLOR", "u_mb_tex_curr", 1, 1, true);
            m_graph.append_edge_attr(graph, subs_to_blur, subs_mb, slink_mb_in);

            var slink_mb_accum = create_slink("COLOR", "u_mb_tex_accum", 1, 1, true);
            subs_mb.slinks_internal.push(slink_mb_accum);
        }

        prev_level = curr_level;
        curr_level = [];
    }

    // depth of field stuff
    if (dof && !render_to_texture) {
        for (var i = 0; i < prev_level.length; i++) {

            var subs_prev = prev_level[i];
            var cam_dof = cam_copy(main_cams[i]);
            cam_render.cameras.push(cam_dof);

            var slink_blur_in = create_slink("COLOR", "u_color", 1, 1, true);
            slink_blur_in.min_filter = m_tex.TF_LINEAR;
            slink_blur_in.mag_filter = m_tex.TF_LINEAR;

            var pp_x = create_subs_postprocessing("X_BLUR");
            m_graph.append_node_attr(graph, pp_x);
            m_graph.append_edge_attr(graph, subs_prev, pp_x, slink_blur_in);

            var pp_y = create_subs_postprocessing("Y_BLUR");
            m_graph.append_node_attr(graph, pp_y);
            m_graph.append_edge_attr(graph, pp_x, pp_y, slink_blur_in);

            var subs_depth = blend_subscenes[i];
            var subs_dof = create_subs_dof(cam_dof);
            cam_dof.dof_distance = cam_render.dof_distance;
            cam_dof.dof_object = cam_render.dof_object;
            cam_dof.dof_front = cam_render.dof_front;
            cam_dof.dof_rear = cam_render.dof_rear;
            cam_dof.dof_power = cam_render.dof_power;
            cam_dof.dof_on = 1;
            curr_level.push(subs_dof);

            m_graph.append_node_attr(graph, subs_dof);
            m_graph.append_edge_attr(graph, subs_prev, subs_dof,
                    create_slink("COLOR", "u_sharp", 1, 1, true));
            m_graph.append_edge_attr(graph, pp_y, subs_dof,
                    create_slink("COLOR", "u_blurred", 1, 1, true));
            m_graph.append_edge_attr(graph, subs_depth, subs_dof,
                    create_slink("DEPTH", "u_depth", 1, 1, true));
        }
        prev_level = curr_level;
        curr_level = [];
    }

    // glow_mask
    if (!render_to_texture && sc_render.glow) {
        for (var i = 0; i < main_cams.length; i++) {
            var subs_prev = prev_level[i];

            var cam_glow = cam_copy(main_cams[i]);
            cam_render.cameras.push(cam_glow);

            var subs_glow_mask = create_subs_glow_mask(cam_glow);
            m_graph.append_node_attr(graph, subs_glow_mask);

            var pp_x_ext = create_subs_postprocessing("X_EXTEND");

            // almost the same
            var slink_mask_pp = create_slink("COLOR", "u_color", 1, 1, true);
            var slink_mask_gl = create_slink("COLOR", "u_glow_mask", 1, 1, true);

            pp_x_ext.is_for_glow = true;
            m_graph.append_node_attr(graph, pp_x_ext);
            m_graph.append_edge_attr(graph, subs_glow_mask, pp_x_ext,
                    slink_mask_pp);

            var slink_ext = create_slink("COLOR", "u_color", 1, 0.5, true);
            slink_ext.min_filter = m_tex.TF_LINEAR;
            slink_ext.mag_filter = m_tex.TF_LINEAR;

            var pp_y_ext = create_subs_postprocessing("Y_EXTEND");
            pp_y_ext.is_for_glow = true;
            m_graph.append_node_attr(graph, pp_y_ext);
            m_graph.append_edge_attr(graph, pp_x_ext, pp_y_ext, slink_ext);

            var pp_x = create_subs_postprocessing("X_BLUR");
            pp_x.is_for_glow = true;
            m_graph.append_node_attr(graph, pp_x);
            m_graph.append_edge_attr(graph, pp_y_ext, pp_x, slink_ext);

            // almost the same
            var slink_blur_blur = create_slink("COLOR", "u_color", 1, 0.25, true);
            slink_blur_blur.min_filter = m_tex.TF_LINEAR;
            slink_blur_blur.mag_filter = m_tex.TF_LINEAR;
            var slink_blur_glow = create_slink("COLOR", "u_glow_mask_blurred", 1, 0.25, true);
            slink_blur_glow.min_filter = m_tex.TF_LINEAR;
            slink_blur_glow.mag_filter = m_tex.TF_LINEAR;

            var pp_y = create_subs_postprocessing("Y_BLUR");
            pp_y.is_for_glow = true;
            m_graph.append_node_attr(graph, pp_y);
            m_graph.append_edge_attr(graph, pp_x, pp_y, slink_blur_blur);

            var subs_glow = create_subs_glow(glow_params);
            m_graph.append_node_attr(graph, subs_glow);

            m_graph.append_edge_attr(graph, subs_prev, subs_glow,
                    create_slink("COLOR", "u_glow_src", 1, 1, true));

            m_graph.append_edge_attr(graph, subs_glow_mask, subs_glow,
                    slink_mask_gl);
            m_graph.append_edge_attr(graph, pp_y, subs_glow, slink_blur_glow);

            curr_level.push(subs_glow);
        }

        prev_level = curr_level;
        curr_level = [];
    }

    // compositing
    if (compositing && !render_to_texture) {

        for (var i = 0; i < prev_level.length; i++) {
            var subs_prev = prev_level[i];

            var brightness = cc_params.brightness;
            var contrast   = cc_params.contrast;
            var exposure   = cc_params.exposure;
            var saturation = cc_params.saturation;

            var subs_compositing = create_subs_compositing(brightness, contrast,
                                                          exposure, saturation);

            m_graph.append_node_attr(graph, subs_compositing);
            m_graph.append_edge_attr(graph, subs_prev, subs_compositing,
                    create_slink("COLOR", "u_color", 1, 1, true));

            curr_level.push(subs_compositing);
        }
        prev_level = curr_level;
        curr_level = [];
    }

    // antialiasing stuff
    if (antialiasing && !render_to_texture) {

        for (var i = 0; i < prev_level.length; i++) {
            var subs_prev = prev_level[i];

            if (cfg_def.smaa) {

                var slink_smaa_in = create_slink("COLOR", "u_color",
                                                 1, 1, true);
                slink_smaa_in.min_filter = m_tex.TF_LINEAR;
                slink_smaa_in.mag_filter = m_tex.TF_LINEAR;

                // NOTE: temoporary disabled T2X mode due to artifacts with blend objects
                //if (!m_cfg.context.alpha) {

                //    var depth_subs = find_upper_subs(graph, subs_prev, "DEPTH");

                //    // velocity buffer
                //    var cam_velocity = cam_copy(main_cams[i]);
                //    cam_render.cameras.push(cam_velocity);

                //    var subs_velocity = create_subs_veloctity(cam_velocity);
                //    var slink_velocity_in = create_slink("DEPTH", "u_depth",
                //                                     1, 1, true);
                //    slink_velocity_in.min_filter = m_tex.TF_NEAREST;
                //    slink_velocity_in.mag_filter = m_tex.TF_NEAREST;

                //    m_graph.append_node_attr(graph, subs_velocity);
                //    m_graph.append_edge_attr(graph, depth_subs, subs_velocity,
                //                             slink_velocity_in);

                //    var slink_velocity_smaa = create_slink("COLOR", "u_velocity_tex",
                //                                     1, 1, true);
                //}

                // 1-st pass - edge detection
                var subs_smaa_1 = create_subs_smaa("SMAA_EDGE_DETECTION");
                m_graph.append_node_attr(graph, subs_smaa_1);

                m_graph.append_edge_attr(graph, subs_prev, subs_smaa_1,
                                         slink_smaa_in);

                // 2-nd pass - blending weight calculation
                var subs_smaa_2 = create_subs_smaa("SMAA_BLENDING_WEIGHT_CALCULATION");
                m_graph.append_node_attr(graph, subs_smaa_2);
                m_graph.append_edge_attr(graph, subs_smaa_1, subs_smaa_2,
                                         slink_smaa_in);

                var slink_search_tex = create_slink("COLOR", "u_search_tex",
                                                    1, 1, false);
                var slink_area_tex = create_slink("COLOR", "u_area_tex",
                                                    1, 1, false);

                slink_search_tex.min_filter = m_tex.TF_LINEAR;
                slink_search_tex.mag_filter = m_tex.TF_LINEAR;
                slink_area_tex.min_filter   = m_tex.TF_LINEAR;
                slink_area_tex.mag_filter   = m_tex.TF_LINEAR;
                subs_smaa_2.slinks_internal.push(slink_search_tex);
                subs_smaa_2.slinks_internal.push(slink_area_tex);

                // 3-rd pass - neighborhood blending
                var subs_smaa_3 = create_subs_smaa("SMAA_NEIGHBORHOOD_BLENDING");
                m_graph.append_node_attr(graph, subs_smaa_3);

                m_graph.append_edge_attr(graph, subs_prev,
                                         subs_smaa_3, slink_smaa_in);

                var slink_smaa_blend = create_slink("COLOR", "u_blend",
                                                    1, 1, true);
                slink_smaa_blend.min_filter = m_tex.TF_LINEAR;
                slink_smaa_blend.mag_filter = m_tex.TF_LINEAR;
                m_graph.append_edge_attr(graph, subs_smaa_2,
                                         subs_smaa_3, slink_smaa_blend);

                // 4-th pass - resolve

                // NOTE: temoporary disabled T2X mode due to artifacts with blend objects
                //if (!m_cfg.context.alpha) {
                //    m_graph.append_edge_attr(graph, subs_velocity, subs_smaa_3,
                //                             slink_velocity_smaa);
                //    var subs_smaa_r = create_subs_smaa("SMAA_RESOLVE");
                //    m_graph.append_node_attr(graph, subs_smaa_r);

                //    m_graph.append_edge_attr(graph, subs_smaa_3, subs_smaa_r,
                //                             slink_smaa_in);
                //    m_graph.append_edge_attr(graph, subs_velocity, subs_smaa_r,
                //                             slink_velocity_smaa);

                //    var slink_smaa_in_prev = create_slink("COLOR", "u_color_prev",
                //                                          1, 1, true);
                //    slink_smaa_in_prev.min_filter = m_tex.TF_LINEAR;
                //    slink_smaa_in_prev.mag_filter = m_tex.TF_LINEAR;

                //    subs_smaa_r.slinks_internal.push(slink_smaa_in_prev);

                //    curr_level.push(subs_smaa_r);
                //} else
                    curr_level.push(subs_smaa_3);

            } else {
                var subs_aa = create_subs_aa();
                m_graph.append_node_attr(graph, subs_aa);

                var slink_aa_in = create_slink("COLOR", "u_color", 1, 1, true);
                slink_aa_in.min_filter = m_tex.TF_LINEAR;
                slink_aa_in.mag_filter = m_tex.TF_LINEAR;
                m_graph.append_edge_attr(graph, subs_prev, subs_aa, slink_aa_in);

                if (cfg_def.resolution_factor > 1) {
                    var subs_rescale = create_subs_postprocessing("NONE");
                    m_graph.append_node_attr(graph, subs_rescale);
                    m_graph.append_edge_attr(graph, subs_aa, subs_rescale, slink_aa_in);
                    curr_level.push(subs_rescale);
                } else
                    curr_level.push(subs_aa);
            }
        }

        prev_level = curr_level;
        curr_level = [];
    }

    if (cfg_def.anaglyph_use && !render_to_texture) {
        var subs_anaglyph = create_subs_anaglyph();

        m_graph.append_node_attr(graph, subs_anaglyph);
        m_graph.append_edge_attr(graph, prev_level[0], subs_anaglyph,
                create_slink("COLOR", "u_sampler_left", 1, 1, true));
        m_graph.append_edge_attr(graph, prev_level[1], subs_anaglyph,
                create_slink("COLOR", "u_sampler_right", 1, 1, true));

        curr_level.push(subs_anaglyph);
    } else
        curr_level.push(prev_level[0]);

    // special precautions needed to prevent blend scene from on-screen rendering
    var prev_id = m_graph.node_by_attr(graph, prev_level[0]);
    var need_subs_screen = false;
    m_graph.traverse_inputs(graph, prev_id, function(id_in, attr_in,
            attr_edge) {
        var slink_in = attr_edge;

        if (slink_in.from == slink_in.to) {
            need_subs_screen = true;
            return true;
        }
    });

    if (need_subs_screen || render_to_texture) {
        var subs_screen = create_subs_screen(prev_level[0]);
        m_graph.append_node_attr(graph, subs_screen);
        m_graph.append_edge_attr(graph, prev_level[0], subs_screen,
                create_slink("COLOR", "u_color", 1, 1, true));

        prev_level = curr_level;
        curr_level = [];
        curr_level.push(subs_screen);
    }

    if (subs_color_picking)
        if (subs_color_picking_xray)
            curr_level.push(subs_color_picking_xray);
        else
            curr_level.push(subs_color_picking);

    if (!render_to_texture && sc_render.sky_params.procedural_skydome) {
        var sky_params = sc_render.sky_params;
        var subs_sky = create_subs_sky(num_lights, sky_params);
        m_graph.append_node_attr(graph, subs_sky);

        curr_level.push(subs_sky);
    }

    var subs_sink = create_subs_sink();
    m_graph.append_node_attr(graph, subs_sink);


    if (cfg_dbg.enabled) {
        var subs_debug_view = create_subs_postprocessing("NONE");
        m_graph.append_node_attr(graph, subs_debug_view);
    }

    for (var i = 0; i < curr_level.length; i++) {
        var subs = curr_level[i];
        switch (subs.type) {
        case "COLOR_PICKING":
        case "COLOR_PICKING_XRAY":
            m_graph.append_edge_attr(graph, curr_level[i], subs_sink,
                    create_slink("COLOR", "NONE", 1, 1, true));
            m_graph.append_edge_attr(graph, curr_level[i], subs_sink,
                    create_slink("DEPTH", "NONE", 1, 1, true));
            break;
        case "SKY":
            var slink_sky = create_slink("CUBEMAP", "u_sky",
                    cfg_scs.cubemap_tex_size, 1, false);
            m_graph.append_edge_attr(graph, subs_sky, subs_sink, slink_sky);
            break;
        default:
            var subs_to = (cfg_dbg.enabled) ? subs_debug_view : subs_sink;
            m_graph.append_edge_attr(graph, curr_level[i], subs_to,
                    create_slink("SCREEN", "NONE", 1, 1, true));
            break;
        }
    }

    if (cfg_dbg.enabled) {
        var subs_from = null;
        var subs_num = 0;

        m_graph.traverse(graph, function(id, attr) {
            if (attr.type == cfg_dbg.subs_type) {
                if (subs_num == cfg_dbg.subs_number) {
                    subs_from = attr;
                    return true;
                } else
                    subs_num++;
            }
        });
        if (subs_from) {
            var node = m_graph.node_by_attr(graph, subs_from);
            m_graph.traverse_edges(graph, function(edge_from, edge_to, edge_attr) {
                if (edge_from == node) {
                    m_graph.append_edge_attr(graph, subs_from, subs_debug_view,
                            create_slink(cfg_dbg.slink_type, "u_color",
                            edge_attr.size, edge_attr.size_mult,
                            edge_attr.update_dim));
                    m_graph.append_edge_attr(graph, subs_debug_view, subs_sink,
                            create_slink("SCREEN", "NONE", 0.5, 0.5, true));
                    return true;
                }
            });
        }
    }

    // remove unattached depth subscenes
    // it would be better not to push them to graph at all

    var sink_nodes = m_graph.get_sink_nodes(graph);
    for (var i = 0; i < sink_nodes.length; i++) {
        var sink_node = sink_nodes[i];
        for (var j = 0; j < depth_subscenes.length; j++) {
            var subs_depth = depth_subscenes[j];

            if (m_graph.get_node_attr(graph, sink_node) == subs_depth)
                m_graph.remove_node(graph, sink_node);
        }
    }

    enforce_graph_consistency(graph, false);

    if (cfg_def.resolution_factor > 1)
        apply_resolution_factor(graph);

    process_subscene_links(graph);
    assign_render_targets(graph);

    return graph;
}

function create_subs_shadow_cast(csm_index, shadow_params) {
    var subs = init_subs("SHADOW_CAST");
    subs.csm_index = csm_index;
    subs.self_shadow_polygon_offset = shadow_params.self_shadow_polygon_offset;

    subs.camera = m_cam.create_camera(m_cam.TYPE_ORTHO_ASYMMETRIC);

    return subs;
}

/**
 * Create abstract subscene.
 * @param type Subscene type
 */
exports.init_subs = init_subs;
function init_subs(type) {
    var subs = {
        type: type,

        // rendering flags
        do_render: false,
        enqueue: false,
        clear_color: false,
        clear_depth: false,
        depth_test: false,
        blend: false,
        pack: false,
        // assign webgl texture before rendering
        assign_texture: false,
        need_fog_update: false,
        need_perm_uniforms_update: false,

        // common properties
        debug_render_calls: 0,
        time: 0,
        camera: null,
        cube_view_matrices: null,
        reflection_plane: null,
        bundles: [],
        slinks_internal: [],
        textures_internal: [],
        wind: new Float32Array(3),
        zsort_eye_last: new Float32Array(3),
        grass_map_dim: new Float32Array(3),
        fog_color_density: new Float32Array(4),
        cube_fog: new Float32Array(16),

        // environment properties
        environment_energy: 0,
        num_lights: 0,
        shadow_lamp_id: 0,
        light_directions: null,
        light_positions: null,
        light_color_intensities: null,
        light_factors1: null,
        light_factors2: null,
        horizon_color: new Float32Array(3),
        zenith_color: new Float32Array(3),
        sun_intensity: new Float32Array([0,0,0]), // affects fog color
        sun_direction: new Float32Array(3),
        sun_quaternion: new Float32Array(4),
        sky_texture_slots: null,

        // glow properties
        glow_factor: 0,
        draw_glow_flag: 0,
        is_for_glow: false,
        glow_color: new Float32Array(3),

        // water properties
        water: 0,
        water_params: null,
        use_shoremap: false,
        shoremap_center: new Float32Array(2),
        shoremap_size: new Float32Array(2),
        shoremap_tex_size: 0,
        max_shore_dist: 0,
        cam_water_depth: 0,
        water_fog_color_density: null,
        water_waves_height: 0,
        water_waves_length: 0,
        water_level: 0,
        caustics: false,
        caust_scale: 0,
        caust_speed: new Float32Array(2),
        caust_brightness: 0,

        // sky properties
        procedural_skydome: false,
        use_as_environment_lighting: false,
        mie_brightness: 0,
        rayleigh_brightness: 0,
        spot_brightness: 0,
        mie_strength: 0,
        rayleigh_strength: 0,
        scatter_strength: 0,
        mie_collection_power: 0,
        rayleigh_collection_power: 0,
        mie_distribution: 0,
        sky_color: new Float32Array(3),

        // ssao properties
        ssao_hemisphere: 0,
        ssao_blur_depth: 0,
        ssao_blur_discard_value: 0,
        ssao_radius_increase: 0,
        ssao_influence: 0,
        ssao_dist_factor: 0,
        ssao_samples: 0,
        ssao_only: 0,
        ssao_white: 0,

        // color correction properties
        brightness: 0,
        contrast: 0,
        exposure: 0,
        saturation: 0,

        // god rays properties
        god_rays_intensity: 0,
        max_ray_length: 0,
        radial_blur_step: 0,
        steps_per_pass: 0,

        // shadow map properties
        csm_index: 0,
        self_shadow_polygon_offset: 0,
        self_shadow_normal_offset: 0,
        v_light_matrix: null,
        b_light_matrix: null,
        p_light_matrix: null,

        // other postprocessing properties
        bloom_key: 0,
        bloom_blur: 0,
        bloom_edge_lum: 0,
        blur_texel_size_mult: 0,
        ext_texel_size_mult: 0,
        mb_decay_threshold: 0,
        mb_factor: 0,
        motion_blur_exp: 0,
        pp_effect: "",
        jitter_projection_space: new Float32Array(2)
    }

    // setting default values
    subs.do_render = true;
    subs.enqueue = true;
    subs.clear_color = true;
    subs.clear_depth = true;
    subs.depth_test = true;
    subs.need_perm_uniforms_update = true;

    return subs;
}

function create_slink(from, to, size, size_mult, update_dim) {
    var slink = {
        // assign explicitly in all cases
        from: from,
        to: to,
        size: size,
        size_mult: size_mult,
        update_dim: update_dim,

        // generic default values
        active: true,
        texture: null,
        use_renderbuffer: false,
        min_filter: m_tex.TF_NEAREST,
        mag_filter: m_tex.TF_NEAREST
    };

    return slink;
}

function create_subs_grass_map() {

    var subs = init_subs("GRASS_MAP");
    subs.camera = m_cam.create_camera(m_cam.TYPE_ORTHO_ASPECT);

    return subs;
}

function create_subs_postprocessing(pp_effect) {

    var pp_subs = init_subs("POSTPROCESSING");
    pp_subs.clear_color = false;
    pp_subs.clear_depth = false;
    pp_subs.depth_test = false;

    pp_subs.camera = m_cam.create_camera(m_cam.TYPE_NONE);
    pp_subs.pp_effect = pp_effect;

    return pp_subs;
}

/**
 * more accurate and a bit different from standrad Gauss blur
 * get width/height from input subscene
 */
function create_subs_bloom_blur(graph, subs_input, pp_effect) {

    var subs = init_subs("BLOOM_BLUR");
    subs.clear_color = false;
    subs.clear_depth = false;
    subs.depth_test = false;

    subs.camera = m_cam.create_camera(m_cam.TYPE_NONE);
    subs.pp_effect = pp_effect;

    return subs;
}

/**
 * Create MAIN_* subscene
 * @param main_type "OPAQUE", "BLEND", "REFLECT"
 * @param cam Camera to attach
 * @param scene Scene
 * @param [subs_attach_out] Output subscene (used to provide color/depth/both
 * attachments)
 */
function create_subs_main(main_type, cam, opaque_do_clear_depth,
        water_params, num_lights, fog, wls_params, shadow_params, sun_exist) {
    var subs = init_subs("MAIN_" + main_type);

    if (main_type === "OPAQUE") {
        subs.clear_color = true;
        subs.clear_depth = opaque_do_clear_depth;
        subs.blend = false;
    } else if (main_type === "BLEND") {
        subs.clear_color = false;
        subs.clear_depth = false;
        subs.blend = true;
    } else if (main_type === "XRAY") {
        subs.clear_color = false;
        subs.clear_depth = true;
        subs.blend = true;
    } else if (main_type === "REFLECT") {
        subs.clear_color = true;
        subs.clear_depth = true;
        subs.blend = false;
    } else
        throw "wrong main subscene type";

    if (subs.blend && shadow_params)
        subs.self_shadow_normal_offset = shadow_params.self_shadow_normal_offset;

    subs.camera = cam;

    subs.horizon_color.set(wls_params.horizon_color);
    subs.zenith_color.set(wls_params.zenith_color);
    subs.environment_energy = wls_params.environment_energy;
    subs.sky_texture_slots = wls_params.sky_texture_slots;

    // by link
    subs.fog_color_density = fog;

    if (water_params)
        assign_water_params(subs, water_params, sun_exist)

    subs.light_directions        = new Float32Array(num_lights * 3); // vec3's
    subs.light_positions         = new Float32Array(num_lights * 3); // vec3's
    subs.light_color_intensities = new Float32Array(num_lights * 3); // vec3's
    subs.light_factors1          = new Float32Array(num_lights * 4); // vec4's
    subs.light_factors2          = new Float32Array(num_lights * 4); // vec4's

    return subs;
}

function assign_water_params(subs, water_params, sun_exist) {
    subs.water_params = water_params;

    var wp = water_params;

    // water fog
    if (wp.fog_color_density)
        subs.water_fog_color_density = new Float32Array(wp.fog_color_density);

    // dynamics
    subs.water_waves_height = wp.waves_height;
    subs.water_waves_length = wp.waves_length;
    subs.water_level        = wp.water_level;

    // caustics
    if (wp.caustic_scale && sun_exist) {
        subs.caustics         = true;
        subs.caust_scale      = wp.caustic_scale;
        subs.caust_speed.set(wp.caustic_speed);
        subs.caust_brightness = wp.caustic_brightness;
    }

    // shore boundings
    if (wp.shoremap_image) {
        subs.use_shoremap = true;

        var shore_boundings = wp.shore_boundings;
        subs.shoremap_center[0] = (shore_boundings[0] +
                                   shore_boundings[1]) / 2;
        subs.shoremap_center[1] = (shore_boundings[2] +
                                   shore_boundings[3]) / 2;

        subs.shoremap_size[0]   = shore_boundings[0] - shore_boundings[1];
        subs.shoremap_size[1]   = shore_boundings[2] - shore_boundings[3];

        subs.shoremap_tex_size  = wp.shoremap_tex_size;
        subs.max_shore_dist     = wp.max_shore_dist;
    }
}

/**
 * Assign input subscenes for given subscene.
 * Can be executed multiple times for single subscene
 */
function assign_inputs(graph, subs, inputs) {
    for (var i = 0; i < inputs.length; i++) {
        m_graph.append_edge_attr(graph, inputs[i], subs);
    }
}

function create_subs_color_picking(cam, xray) {

    var subs = init_subs("COLOR_PICKING");
    if (xray) {
        subs.type += "_XRAY";
        subs.clear_color = false;
        subs.clear_depth = true;
    }

    subs.enqueue = false;

    subs.camera = cam;

    return subs;
}

function create_subs_wireframe(cam) {

    var subs = init_subs("WIREFRAME");
    subs.do_render = false;
    subs.clear_color = false;
    subs.clear_depth = false;

    subs.camera = cam;

    return subs;
}

/**
 * Used for depth and (optionally) shadow receive rendering
 */
function create_subs_depth_shadow(graph, cam, shadow_params) {
    var subs = init_subs("DEPTH");
    subs.camera = cam;
    subs.self_shadow_normal_offset = shadow_params.self_shadow_normal_offset;
    return subs;
}

/**
 * Store red channel from subs depth attachment as RGBA texture
 */
function create_subs_depth_pack(cam) {

    var subs = init_subs("DEPTH_PACK");
    subs.clear_color = false;
    subs.clear_depth = false;

    subs.camera = cam;

    return subs;
}

function create_subs_ssao(cam, fog, ssao_params) {

    var subs = init_subs("SSAO");
    subs.clear_color = false;
    subs.clear_depth = false;
    subs.depth_test = false;

    subs.camera = cam;

    // by link
    subs.fog_color_density = fog;
    subs.water_fog_color_density = new Float32Array(fog);

    subs.ssao_radius_increase = ssao_params.radius_increase;
    subs.ssao_hemisphere = ssao_params.hemisphere;
    subs.ssao_influence = ssao_params.influence; // how much AO affects final rendering
    subs.ssao_dist_factor = ssao_params.dist_factor; // how much ao decreases with distance
    subs.ssao_samples = ssao_params.samples; // number of samples aka quality

    return subs;
}

function create_subs_ssao_blur(cam, ssao_params) {
    var subs = init_subs("SSAO_BLUR");
    subs.clear_color = false;
    subs.clear_depth = false;
    subs.depth_test = false;

    subs.ssao_blur_depth = ssao_params.blur_depth;
    subs.ssao_blur_discard_value = ssao_params.blur_discard_value;

    subs.camera = cam;

    return subs;
}

function create_subs_aa() {
    var subs = init_subs("ANTIALIASING");
    subs.clear_color = false;
    subs.clear_depth = false;
    subs.depth_test = false;

    subs.camera = m_cam.create_camera(m_cam.TYPE_NONE);

    return subs;
}

function create_subs_smaa(pass) {
    var subs = init_subs(pass);

    if (pass == "SMAA_BLENDING_WEIGHT_CALCULATION" ||
        pass == "SMAA_EDGE_DETECTION")
        subs.clear_color = true;
    else
        subs.clear_color = false;

    subs.clear_depth = false;
    subs.depth_test = false;

    subs.camera = m_cam.create_camera(m_cam.TYPE_NONE);

    if (pass == "SMAA_BLENDING_WEIGHT_CALCULATION")
        subs.jitter_subsample_ind = new Float32Array(4);

    return subs;
}

function create_subs_compositing(brightness, contrast, exposure, saturation) {

    var subs = init_subs("COMPOSITING");
    subs.clear_color = false;
    subs.clear_depth = false;
    subs.depth_test = false;

    subs.camera = m_cam.create_camera(m_cam.TYPE_NONE);
    subs.brightness = brightness;
    subs.contrast   = contrast;
    subs.exposure   = exposure;
    subs.saturation = saturation;

    return subs;
}

function create_subs_motion_blur(mb_decay_threshold, mb_factor) {
    var mb_subs = init_subs("MOTION_BLUR");
    mb_subs.clear_color = false;
    mb_subs.clear_depth = false;
    mb_subs.depth_test = false;

    mb_subs.camera = m_cam.create_camera(m_cam.TYPE_NONE);

    mb_subs.assign_texture = true;

    mb_subs.mb_decay_threshold = mb_decay_threshold;
    mb_subs.mb_factor = mb_factor;

    return mb_subs;
}

function create_subs_dof(cam) {

    var subs = init_subs("DOF");
    subs.clear_color = false;
    subs.clear_depth = false;
    subs.depth_test = false;

    subs.camera = cam;

    return subs;
}


function create_subs_glow_mask(cam) {
    var subs = init_subs("GLOW_MASK");

    subs.camera = cam;
    subs.depth_test = false;

    return subs;
}

function create_subs_glow(glow_params) {
    var subs = init_subs("GLOW");

    subs.glow_color.set(glow_params.glow_color);
    subs.glow_factor = glow_params.glow_factor;
    subs.ext_texel_size_mult = 5;
    subs.blur_texel_size_mult = 3;
    subs.depth_test = false;

    subs.camera = m_cam.create_camera(m_cam.TYPE_NONE);

    return subs;
}

function create_subs_refract() {

    var subs = init_subs("REFRACT");
    subs.clear_color = false;
    subs.clear_depth = false;
    subs.depth_test = false;

    subs.camera = m_cam.create_camera(m_cam.TYPE_NONE);

    return subs;
}

function create_subs_god_rays(cam, water, ray_length, pack, step,
                              num_lights, steps_per_pass) {

    var subs = init_subs("GOD_RAYS");
    subs.clear_color = false;
    subs.clear_depth = false;
    subs.depth_test = false;

    subs.horizon_color[0] = 1;
    subs.horizon_color[1] = 1;
    subs.horizon_color[2] = 1;

    subs.zenith_color[0] = 1;
    subs.zenith_color[1] = 1;
    subs.zenith_color[2] = 1;

    subs.environment_energy = 1;

    subs.pack = pack;
    subs.water = water;
    subs.radial_blur_step = step;
    subs.max_ray_length = ray_length;
    subs.steps_per_pass = steps_per_pass;
    subs.camera = cam;

    subs.num_lights = num_lights;
    subs.light_directions        = new Float32Array(num_lights * 3); // vec3's
    subs.light_positions         = new Float32Array(num_lights * 3); // vec3's
    subs.light_color_intensities = new Float32Array(num_lights * 3); // vec3's
    subs.light_factors1          = new Float32Array(num_lights * 4); // vec4's
    subs.light_factors2          = new Float32Array(num_lights * 4); // vec4's

    return subs;
}

function create_subs_god_rays_comb(intensity, num_lights) {

    var subs = init_subs("GOD_RAYS_COMBINE");
    subs.clear_color = false;
    subs.clear_depth = false;
    subs.depth_test = false;

    subs.camera = m_cam.create_camera(m_cam.TYPE_NONE);

    subs.god_rays_intensity = intensity;

    subs.num_lights = num_lights;
    subs.light_directions        = new Float32Array(num_lights * 3); // vec3's
    subs.light_positions         = new Float32Array(num_lights * 3); // vec3's
    subs.light_color_intensities = new Float32Array(num_lights * 3); // vec3's
    subs.light_factors1          = new Float32Array(num_lights * 4); // vec4's
    subs.light_factors2          = new Float32Array(num_lights * 4); // vec4's

    return subs;
}

/**
 * Create subscene for screen rendering
 */
function create_subs_sky(num_lights, sky_params) {

    var subs = init_subs("SKY");

    subs.enqueue = false;
    subs.clear_color = false;
    subs.clear_depth = false;
    subs.depth_test = false;

    var cam = m_cam.create_camera(m_cam.TYPE_NONE);

    // NOTE: check it
    cam.width = cfg_scs.cubemap_tex_size;
    cam.height = cfg_scs.cubemap_tex_size;

    subs.camera = cam;

    subs.cube_view_matrices = m_util.generate_cubemap_matrices();

    subs.num_lights = num_lights;
    subs.light_directions        = new Float32Array(num_lights * 3); // vec3's
    subs.light_positions         = new Float32Array(num_lights * 3); // vec3's
    subs.light_color_intensities = new Float32Array(num_lights * 3); // vec3's
    subs.light_factors1          = new Float32Array(num_lights * 4); // vec4's
    subs.light_factors2          = new Float32Array(num_lights * 4); // vec4's

    subs.horizon_color[0] = 1;
    subs.horizon_color[1] = 1;
    subs.horizon_color[2] = 1;

    subs.zenith_color[0] = 1;
    subs.zenith_color[1] = 1;
    subs.zenith_color[2] = 1;

    subs.environment_energy = 1;

    subs.sky_color.set(sky_params.sky_color);

    subs.procedural_skydome          = sky_params.procedural_skydome;
    subs.use_as_environment_lighting = sky_params.use_as_environment_lighting;
    subs.rayleigh_brightness         = sky_params.rayleigh_brightness;
    subs.mie_brightness              = sky_params.mie_brightness;
    subs.spot_brightness             = sky_params.spot_brightness;
    subs.scatter_strength            = sky_params.scatter_strength;
    subs.rayleigh_strength           = sky_params.rayleigh_strength;
    subs.mie_strength                = sky_params.mie_strength;
    subs.rayleigh_collection_power   = sky_params.rayleigh_collection_power;
    subs.mie_collection_power        = sky_params.mie_collection_power;
    subs.mie_distribution            = sky_params.mie_distribution;

    return subs;
}

/**
 * Create subscene for screen rendering
 */
function create_subs_screen() {

    var subs = init_subs("SCREEN");
    subs.clear_color = false;
    subs.clear_depth = false;

    subs.camera = m_cam.create_camera(m_cam.TYPE_NONE);

    return subs;
}

function create_subs_anaglyph() {

    var subs = init_subs("ANAGLYPH");
    subs.clear_color = false;
    subs.clear_depth = false;

    subs.camera = m_cam.create_camera(m_cam.TYPE_NONE);

    return subs;
}

function create_subs_luminance() {

    var subs = init_subs("LUMINANCE");
    subs.clear_color = false;
    subs.clear_depth = false;

    subs.camera = m_cam.create_camera(m_cam.TYPE_NONE);

    return subs;
}

function create_subs_av_luminance() {

    var subs = init_subs("AVERAGE_LUMINANCE");
    subs.clear_color = false;
    subs.clear_depth = false;

    subs.camera = m_cam.create_camera(m_cam.TYPE_NONE);

    return subs;
}

function create_subs_luminance_trunced(bloom_key, edge_lum, num_lights, cam) {

    var subs = init_subs("LUMINANCE_TRUNCED");
    subs.clear_color = false;
    subs.clear_depth = false;

    subs.bloom_key = bloom_key;
    subs.bloom_edge_lum = edge_lum;

    //var cam = m_cam.create_camera(m_cam.TYPE_NONE);
    subs.camera = cam;

    subs.light_directions        = new Float32Array(num_lights * 3); // vec3's
    subs.light_positions         = new Float32Array(num_lights * 3); // vec3's
    subs.light_color_intensities = new Float32Array(num_lights * 3); // vec3's
    subs.light_factors1          = new Float32Array(num_lights * 4); // vec4's
    subs.light_factors2          = new Float32Array(num_lights * 4); // vec4's

    return subs;
}

function create_subs_bloom_combine(blur) {

    var subs = init_subs("BLOOM");
    subs.clear_color = false;
    subs.clear_depth = false;

    subs.camera = m_cam.create_camera(m_cam.TYPE_NONE);
    subs.bloom_blur = blur;

    return subs;
}

function create_subs_veloctity(cam) {

    var subs = init_subs("VELOCITY");
    subs.clear_color = false;
    subs.clear_depth = false;

    subs.camera = cam;

    return subs;
}

/**
 * Fictional subscene to close graph
 */
function create_subs_sink() {

    var subs_sink = init_subs("SINK");
    subs_sink.enqueue = false;

    return subs_sink;
}

/**
 * Find destination subscene (node with no outputs).
 */
function find_sink_subs(graph) {

    var sink_nodes = m_graph.get_sink_nodes(graph);
    if (sink_nodes.length == 0)
        throw "No sink subscene";
    else if (sink_nodes.length == 1)
        return m_graph.get_node_attr(graph, sink_nodes[0]);
    else
        throw "Rendering graph is corrupted";
}

/**
 * Find first on-screen subscene.
 */
exports.find_on_screen = function(graph) {

    var subs = null;

    m_graph.traverse(graph, function(node, attr) {
        if (attr.camera && attr.camera.framebuffer === null) {
            subs = attr;
            return true;
        }
        return false;
    });

    return subs;
}

/**
 * Find input of given type.
 */
exports.find_input = function(graph, subs, type) {
    var inputs = get_inputs(graph, subs);
    for (var i = 0; i < inputs.length; i++)
        if (inputs[i].type === type)
            return inputs[i];

    return null;
}

exports.has_lower_subs = has_lower_subs;
/**
 * Traverse graph downwards and check if subs has output of given type.
 * subs itself also checked
 * @methodOf graph
 */
function has_lower_subs(graph, subs, type) {

    if (subs.type === type)
        return true;

    var outputs = get_outputs(graph, subs);
    for (var i = 0; i < outputs.length; i++)
        if (has_lower_subs(graph, outputs[i], type))
            return true;

    return false;
}

exports.has_upper_subs = has_upper_subs;
/**
 * Traverse graph upwards and check if subs has input of given type.
 * subs itself also checked
 * @methodOf graph
 */
function has_upper_subs(graph, subs, type) {

    if (subs.type === type)
        return true;

    var inputs = get_inputs(graph, subs);
    for (var i = 0; i < inputs.length; i++)
        if (has_upper_subs(graph, inputs[i], type))
            return true;

    return false;
}

exports.find_upper_subs = find_upper_subs;
/**
 * Traverse graph upwards and find first subscene of given type.
 * subs itself also may be found,
 * @methodOf graph
 */
function find_upper_subs(graph, subs, type) {
    if (subs.type === type)
        return subs;

    var inputs = get_inputs(graph, subs);
    for (var i = 0; i < inputs.length; i++) {
        var upper = find_upper_subs(graph, inputs[i], type);
        if (upper)
            return upper;
    }

    return null;
}

exports.get_inputs = get_inputs;
function get_inputs(graph, subs) {
    var node = m_graph.node_by_attr(graph, subs);
    if (node == m_graph.NULL_NODE)
        throw "Subscene not in graph";

    var inputs = [];

    var in_edge_count = m_graph.in_edge_count(graph, node);
    for (var i = 0; i < in_edge_count; i++) {
        var node_input = m_graph.get_in_edge(graph, node, i);
        if (node_input != node)
            inputs.push(m_graph.get_node_attr(graph, node_input));
    }
    return inputs;
}

exports.get_outputs = get_outputs;
function get_outputs(graph, subs) {
    var node = m_graph.node_by_attr(graph, subs);
    if (node == m_graph.NULL_NODE)
        throw "Subscene not in graph";

    var outputs = [];

    var out_edge_count = m_graph.out_edge_count(graph, node);
    for (var i = 0; i < out_edge_count; i++) {
        var node_output = m_graph.get_out_edge(graph, node, i);
        if (node_output != node)
            outputs.push(m_graph.get_node_attr(graph, node_output));
    }
    return outputs;
}

/**
 * Find first subscene in graph/array matching given type
 */
exports.find_subs = function(graph, type) {
    var subs = null;

    m_graph.traverse(graph, function(node, attr) {
        if (attr.type == type) {
            subs = attr;
            return true;
        }
        return false;
    });

    return subs;
}

exports.debug_convert_to_dot = function(graph) {

    var PAPER_SIZE = "11.7,16.5";   // A3
    //var PAPER_SIZE = "8.3,11.7";    // A4

    var dot_str = "digraph scenegraph {\n";

    dot_str += "    ";
    dot_str += "size=\"" + PAPER_SIZE + "\";\n";
    dot_str += "    ";
    dot_str += "ratio=\"fill\";\n";

    dot_str += "    ";
    dot_str += "node [shape=box margin=\"0.25,0.055\"];\n"

    var tex_ids = debug_calc_tex_ids(graph);

    m_graph.traverse(graph, function(node, attr) {
        dot_str += "    ";
        dot_str += dot_format_node(node, attr, tex_ids);
    });

    m_graph.traverse_edges(graph, function(node1, node2, attr) {
        dot_str += "    ";
        dot_str += dot_format_edge(node1, node2, attr, tex_ids);
    });

    dot_str += "}";

    return dot_str;
}

function debug_calc_tex_ids(graph) {
    var index_buf = [];
    var ids = [];

    traverse_slinks(graph, function(slink, internal, subs1, subs2) {
        if (slink.texture) {
            var num = index_buf.indexOf(slink.texture);
            if (num == -1) {
                index_buf.push(slink.texture);
                ids.push(slink.texture, index_buf.length - 1);
            }
        }
    });

    return ids;
}

function dot_format_node(node, subs, tex_ids) {
    var cam = subs.camera;

    var label = "";

    var label = subs.type.replace(/_/g, " ");
    if (subs.type == "POSTPROCESSING")
        label += " (" + subs.pp_effect.replace(/_/g, " ") + ")";

    if (subs.camera) {
        label += "\\n"
        for (var i = 0; i < tex_ids.length; i+=2) {
            if (tex_ids[i] == subs.camera.color_attachment)
                label += "C" + tex_ids[i+1] + " ";
        }
        for (var i = 0; i < tex_ids.length; i+=2) {
            if (tex_ids[i] == subs.camera.depth_attachment)
                label += "D" + tex_ids[i+1];
        }
    }

    if (subs.slinks_internal.length)
        label += "\\n-----\\n";

    for (var i = 0; i < subs.slinks_internal.length; i++)
        label += dot_format_edge_label(subs.slinks_internal[i], node, null,
                tex_ids);

    var color = "black";

    if (subs.type == "SINK")
        var style = "dotted";
    else if (subs.enqueue)
        var style = "solid";
    else
        var style = "dashed";

    style += ",bold";

    return String(node) + " [label=\"" + label + "\" " +
        "color=\"" + color + "\" " +
        "style=\"" + style + "\"" +
        "];\n";
}

function dot_format_edge(node1, node2, slink, tex_ids) {
    var label = dot_format_edge_label(slink, node1, node2, tex_ids);

    if (slink.active)
        var style = "solid";
    else
        var style = "dotted";

    return String(node1) + " -> " + String(node2) + " [label=\"" + label + "\" " +
            "style=\"" + style + "\"];\n";
}

function dot_format_edge_label(slink, node1, node2, tex_ids) {
    function filters_to_string(filters) {
        var string = "";

        if (filters.min == m_tex.TF_LINEAR)
            string += "L";
        else if (filters.min == m_tex.TF_NEAREST)
            string += "N";

        if (filters.mag == m_tex.TF_LINEAR)
            string += "L";
        else if (filters.mag == m_tex.TF_NEAREST)
            string += "N";

        return string;
    };

    var label = "";

    label += slink.from + "\\n"
    label += slink.to != "NONE" ? slink.to + "\\n" : "";

    label += "("

    if (slink.update_dim) {

        var size_mult = slink.size_mult
        if (Math.round(size_mult) != size_mult)
            size_mult = size_mult.toFixed(2);

        var size = (size_mult == 1 ? "" : size_mult) + "S";
        label += size + "x" + size;
    } else {
        label += slink.size + "x" + slink.size;
    }

    if (slink.from != "SCREEN") {
        label += " ";

        // texture filtering
        if (slink.use_renderbuffer)
            label += "RR";
        else
            label += filters_to_string({min: slink.min_filter, mag: slink.mag_filter});

        // texture ID number (sharing info)
        for (var i = 0; i < tex_ids.length; i+=2) {
            if (tex_ids[i] == slink.texture)
                label += " " + tex_ids[i+1];
        }
    }

    label += ")" + "\\n"

    return label;
}

/**
 * Create new rendering queue based on graph structure.
 * Perform topological sorting based on depth-first search algorithm.
 * @param graph Rendering graph array
 * @param [subs_sink] Root subscene node
 */
exports.create_rendering_queue = function(graph) {

    var subscenes = m_graph.topsort_attr(graph);
    var queue = [];

    for (var i = 0; i < subscenes.length; i++) {
        var subs = subscenes[i];
        if (subs.enqueue)
            queue.push(subs);
    }

    return queue;
}

}
