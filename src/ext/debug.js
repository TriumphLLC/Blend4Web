"use strict";

/**
 * Engine debugging API.
 * @module debug
 */
b4w.module["debug"] = function(exports, require) {

var m_batch    = require("__batch");
var m_print    = require("__print");
var controls   = require("__controls");
var debug      = require("__debug");
var physics    = require("__physics");
var scenegraph = require("__scenegraph");
var m_scenes   = require("__scenes");
var sfx        = require("__sfx");
var m_textures = require("__textures");
var m_util     = require("__util");

var m_vec3 = require("vec3");

/**
 * Print info about the physics worker
 * @method module:debug.physics_worker
 */
exports["physics_worker"] = function() {
    physics.debug_worker();
}
/**
 * Print object info by physics ID.
 * @method module:debug.physics_id
 * @param id Physics ID
 */
exports["physics_id"] = function(id) {
    m_print.log("O", physics.find_obj_by_body_id(id))

    var bundles = physics.get_active_scene()._physics.bundles;

    for (var i = 0; i < bundles.length; i++) {
        var bundle = bundles[i];
        var phy = bundle.physics;

        if (phy.body_id == id)
            m_print.log("B", bundle);
    }
}

/**
 * Print names and info for dynamic objects inside the view frustum.
 * @method module:debug.visible_objects
 */
exports["visible_objects"] = function() {
    var scene = m_scenes.get_active();

    var objs = m_scenes.get_scene_objs(scene, "MESH");

    var subs_main = m_scenes.get_subs(scene, "MAIN_OPAQUE");
    var bundles = subs_main.bundles;

    for (var i = 0; i < objs.length; i++) {
        var obj = objs[i];
        var render = obj._render;

        if (render.type != "DYNAMIC")
            continue;

        for (var j = 0; j < bundles.length; j++) {
            var bundle = bundles[j];
            if (bundle.do_render && bundle.obj_render == render) {
                m_print.log(obj["name"], obj); 
                break;
            }
        }
    }
}

/**
 * Print debug info for the object with the given name
 * @method module:debug.object_info
 * @param name Object name
 */
exports["object_info"] = function(name) {
    var scene = m_scenes.get_active();

    var objs = m_scenes.get_scene_objs(scene, "MESH");

    for (var i = 0; i < objs.length; i++) {
        var obj = objs[i];

        if (obj["name"] != name)
            continue;

        m_print.log("Object", obj);

        var subscenes = m_scenes.get_all_subscenes(scene);

        for (var j = 0; j < subscenes.length; j++) {
            var subs = subscenes[j];
            var bundles = subs.bundles;

            var print_bundles = [];

            for (var k = 0; k < bundles.length; k++) {
                if (bundles[k].obj_render == obj._render)
                    print_bundles.push(bundles[k]);
            }

            m_print.log("Subscene " + subs.type, print_bundles);
        }
    }
}

/**
 * Print debug info for the object with the given name
 * @method module:debug.object_info
 * @param name Object name
 */
exports["objects_stat"] = function() {
    var scene = m_scenes.get_active();

    console.log("Armatures: " + m_scenes.get_scene_objs(scene, "ARMATURE").length);
    console.log("Cameras: " + m_scenes.get_scene_objs(scene, "CAMERA").length);
    console.log("Curves: " + m_scenes.get_scene_objs(scene, "CURVE").length);
    console.log("Empties: " + m_scenes.get_scene_objs(scene, "EMPTY").length);
    console.log("Lamps: " + m_scenes.get_scene_objs(scene, "LAMP").length);
    console.log("Meshes: " + m_scenes.get_scene_objs(scene, "MESH").length);
    console.log("Speakers: " + m_scenes.get_scene_objs(scene, "SPEAKER").length);
}

/**
 * Return the number of vertices in the active scene.
 * @method module:debug.num_vertices
 */
exports["num_vertices"] = function() {

    var num = 0;

    var scene = m_scenes.get_active();

    var main_subscenes = [m_scenes.get_subs(scene, "MAIN_OPAQUE"), 
                          m_scenes.get_subs(scene, "MAIN_BLEND")];

    for (var i = 0; i < main_subscenes.length; i++) {

        var subs = main_subscenes[i];
    
        if (!subs)
            continue;
    
        var bundles = subs.bundles;

        for (var j = 0; j < bundles.length; j++) {

            var batch = bundles[j].batch;
            // NOTE: some objects (particles) do not have any submesh
            if (batch)
                num += batch.num_vertices;
        }
    }

    return num;
}

/**
 * Return the number of all triangles in the active scene.
 * @method module:debug.num_triangles
 */
exports["num_triangles"] = function() {

    var num = 0;

    var scene = m_scenes.get_active();

    var main_subscenes = [m_scenes.get_subs(scene, "MAIN_OPAQUE"), 
                          m_scenes.get_subs(scene, "MAIN_BLEND")];

    for (var i = 0; i < main_subscenes.length; i++) {
    
        var subs = main_subscenes[i];
    
        if (!subs)
            continue;
    
        var bundles = subs.bundles;

        for (var j = 0; j < bundles.length; j++) {

            var batch = bundles[j].batch;
            // NOTE: some objects (particles) do not have any submesh
            if (batch)
                num += batch.num_triangles;
        }
    }

    return num;
}

/**
 * Return the number of batches in the main scenes.
 * @method module:debug.num_draw_calls
 */
exports["num_draw_calls"] = function() {

    var scene = m_scenes.get_active();
    
    var main_subscenes = [m_scenes.get_subs(scene, "MAIN_OPAQUE"), 
                          m_scenes.get_subs(scene, "MAIN_BLEND")];
    
    var number = main_subscenes[0].bundles.length + 
                 main_subscenes[1].bundles.length;

    return number;
}

/**
 * Return geometry info in the main scenes.
 * @method module:debug.geometry_stats
 */
exports["geometry_stats"] = function() {

    var scene = m_scenes.get_active();
    var subscenes = m_scenes.get_all_subscenes(scene);
    var unique_batches = {};

    for (var i = 0; i < subscenes.length; i++) {
    
        var subs = subscenes[i];

        if (subs.type == "SINK" || subs.type == "WIREFRAME")
            continue;
    
        var bundles = subs.bundles;
        for (var j = 0; j < bundles.length; j++) {
            var batch = bundles[j].batch;
            var render = bundles[j].obj_render;
            // NOTE: some objects (particles) do not have any submesh
            if (batch)
                if (subs.type != "COLOR_PICKING" && subs.type != "GLOW_MASK" 
                        || render.origin_selectable)
                    unique_batches[batch.id] = batch;
        }
    }

    var vbo_number = 0;
    var vbo_memory = 0;
    var ibo_number = 0;
    var ibo_memory = 0;

    for (var id in unique_batches) {
        var batch = unique_batches[id];
        var bufs_data = batch.bufs_data;
        
        if (bufs_data.debug_ibo_bytes) {
            ibo_number++;
            ibo_memory += bufs_data.debug_ibo_bytes / (1024 * 1024);
        }

        vbo_number++;
        vbo_memory += bufs_data.debug_vbo_bytes / (1024 * 1024);
    }

    return {"vbo_number": vbo_number, "vbo_memory": vbo_memory,
            "ibo_number": ibo_number, "ibo_memory": ibo_memory};   
}

/**
 * Return the number of unique textures in the main scenes.
 * @method module:debug.num_textures
 */
exports["num_textures"] = function() {

    var tex_list = [];
    
    var memory = 0;

    var scene = m_scenes.get_active();

    var main_subscenes = [m_scenes.get_subs(scene, "MAIN_OPAQUE"), 
                          m_scenes.get_subs(scene, "MAIN_BLEND")];

    for (var i = 0; i < main_subscenes.length; i++) {
    
        var subs = main_subscenes[i];
    
        if (!subs)
            continue;
    
        var bundles = subs.bundles;

        for (var j = 0; j < bundles.length; j++) {

            var batch = bundles[j].batch;
            // NOTE: some objects (particles) do not have any submesh
            if (batch) {
                var batch_texs = batch.textures;
            
                for (var k = 0; k < batch_texs.length; k++) {

                    var batch_tex = batch_texs[k];
                    
                    if (batch_tex.source === "IMAGE" ||
                            batch_tex.source === "ENVIRONMENT_MAP") {

                        var tex = batch_tex.w_texture;
                        
                        if (tex_list.indexOf(tex) === -1) {
                            tex_list.push(tex);

                            var mem = batch_tex.width * batch_tex.height * 
                                4 / (1024 * 1024) / batch_tex.compress_ratio; 

                            // mipmaps
                            mem *=  1.3333;
                            
                            memory += mem;
                        }
                    }
                }
            }
        }
    }

    return {"number": tex_list.length, "memory": memory};
}

/**
 * Return the number and the total size of unique output framebuffers.
 * @method module:debug.num_render_targets
 */
exports["num_render_targets"] = function() {

    var list = [];
    
    var memory = 0;

    var scene = m_scenes.get_active();

    var subscenes = m_scenes.get_all_subscenes(scene);

    for (var i = 0; i < subscenes.length; i++) {
    
        var subs = subscenes[i];

        if (subs.type == "SINK")
            continue;
    
        var cam = subs.camera;
        var c_at = cam.color_attachment;
        var d_at = cam.depth_attachment;

        var subs_textures = [cam.color_attachment, cam.depth_attachment];
        subs_textures.push.apply(subs_textures, subs.textures_internal);

        for (var j = 0; j < subs_textures.length; j++) {
            var tex = subs_textures[j];
            if (m_textures.is_texture(tex) && list.indexOf(tex) == -1) {
                list.push(tex);
                memory += cam.width * cam.height * m_textures.get_texture_channel_size(tex);
            }
        }
    }

    return {"number": list.length, "memory": (memory / 1024 / 1024)};
}

/**
 * Draw a frustum for the active camera.
 * @method module:debug.make_camera_frustum_shot
 */
exports["make_camera_frustum_shot"] = function() {

    var active_scene = m_scenes.get_active();
    var subs_main = m_scenes.get_subs(active_scene, "MAIN_OPAQUE");
    if (!subs_main)
        return;

    m_scenes.make_frustum_shot(subs_main.camera, subs_main, [1,1,0]);
}

/**
 * Draw a light frustum, used for rendering the shadow maps.
 * @method module:debug.make_light_frustum_shot
 */
exports["make_light_frustum_shot"] = function() {

    var active_scene = m_scenes.get_active();
    var subs_main = m_scenes.get_subs(active_scene, "MAIN_OPAQUE");
    var subscenes_shadow = m_scenes.subs_array(active_scene, ["SHADOW_CAST"]);
    if (!subs_main)
        return;

    for (var i = 0; i < subscenes_shadow.length; i++) {
        var subs_shadow = subscenes_shadow[i];

        var color;
        switch (i) {
        case 0:
            color = [1, 0, 0];
            break;        
        case 1:
            color = [0, 1, 0];
            break;        
        case 2:
            color = [0, 0, 1];
            break;        
        default:
            color = [1, 0, 1];
        }

        m_scenes.make_frustum_shot(subs_shadow.camera, subs_main, color);
    }
}


/**
 * Print info about the active scene graph in DOT format.
 * @method module:debug.scenegraph_to_dot
 */
exports["scenegraph_to_dot"] = function() {
    var scene = m_scenes.get_active();
    var graph = m_scenes.get_graph(scene);

    m_print.log(scenegraph.debug_convert_to_dot(graph));
}

/**
 * Print info about the controls module.
 * @method module:debug.controls_info
 */
exports["controls_info"] = controls.debug;

/**
 * Get the distance between two objects.
 * @method module:debug.object_distance
 */
exports["object_distance"] = function(obj, obj2) {
    var dist = m_vec3.dist(obj._render.trans, obj2._render.trans);
    return dist;
}

/**
 * Store a simple telemetry message.
 * @method module:debug.msg
 */
exports["msg"] = debug.msg;

/**
 * Store a flashback telemetry message.
 * @method module:debug.fbmsg
 */
exports["fbmsg"] = debug.fbmsg;

/**
 * Print the list of flashback messages.
 * @method module:debug.print_telemetry
 */
exports["print_telemetry"] = debug.print_telemetry;

/**
 * Plot the list of flashback messages as a gnuplot datafile.
 * @method module:debug.plot_telemetry
 */
exports["plot_telemetry"] = debug.plot_telemetry;

/**
 * Store the callback function result as a flashback message.
 * @method module:debug.fbres
 */
exports["fbres"] = function(fun, timeout) {
    if (!timeout)
        timeout = 16;

    var cb = function() {
        debug.fbmsg("FBRES", fun());
        setTimeout(cb, timeout);
    }

    cb();
}

/**
 * Check the engine constants, abort if not constant.
 * @method module:debug.assert_constants
 */
exports["assert_constants"] = function() {
    var VEC3_IDENT = new Float32Array(3);
    var QUAT4_IDENT = new Float32Array([0,0,0,1]);

    var AXIS_X = new Float32Array([1, 0, 0]);
    var AXIS_Y = new Float32Array([0, 1, 0]);
    var AXIS_Z = new Float32Array([0, 0, 1]);
    var AXIS_MX = new Float32Array([-1, 0, 0]);
    var AXIS_MY = new Float32Array([ 0,-1, 0]);
    var AXIS_MZ = new Float32Array([ 0, 0,-1]);

    if (!m_util.cmp_arr(VEC3_IDENT, m_util.VEC3_IDENT))
        throw "Wrong VEC3_IDENT";
    if (!m_util.cmp_arr(QUAT4_IDENT, m_util.QUAT4_IDENT))
        throw "Wrong QUAT4_IDENT";

    if (!m_util.cmp_arr(AXIS_X, m_util.AXIS_X))
        throw "Wrong AXIS_X";
    if (!m_util.cmp_arr(AXIS_Y, m_util.AXIS_Y))
        throw "Wrong AXIS_Y";
    if (!m_util.cmp_arr(AXIS_Z, m_util.AXIS_Z))
        throw "Wrong AXIS_Z";
    if (!m_util.cmp_arr(AXIS_MX, m_util.AXIS_MX))
        throw "Wrong AXIS_MX";
    if (!m_util.cmp_arr(AXIS_MY, m_util.AXIS_MY))
        throw "Wrong AXIS_MY";
    if (!m_util.cmp_arr(AXIS_MZ, m_util.AXIS_MZ))
        throw "Wrong AXIS_MZ";
}

/**
 * Mute the BACKGROUND_MUSIC speakers.
 * @method module:debug.mute_music
 */
exports["mute_music"] = function() {
    var spks = sfx.get_speaker_objects();

    for (var i = 0; i < spks.length; i++) {
        var spk = spks[i];

        if (sfx.get_spk_behavior(spk) == "BACKGROUND_MUSIC")
            sfx.mute(spk, true);
    }
}

/**
 * Check the object for a finite value.
 * @method module:debug.check_finite
 */
exports["check_finite"] = function(o) {
    debug.check_finite(o);
}


/**
 * Set debugging parameters.
 * @method module:debug.set_debug_params
 */
exports["set_debug_params"] = function(params) {
    var active_scene = m_scenes.get_active();
    var subs_wireframe = m_scenes.get_subs(active_scene, "WIREFRAME");

    if (subs_wireframe) {
        if ("wireframe_mode" in params)
            m_scenes.set_wireframe_mode(subs_wireframe, params["wireframe_mode"]);
        if ("wireframe_edge_color" in params)
            m_scenes.set_wireframe_edge_color(subs_wireframe, params["wireframe_edge_color"]);
    } else
        throw("Wireframe subscene not found.");
}

exports["get_error_quantity"] = function() {
    return m_print.get_error_count();
}

exports["get_warning_quantity"] = function() {
    return m_print.get_warning_count();
}

exports["clear_errors_warnings"] = function() {
    return m_print.clear_errors_warnings();
}

}
