/**
 * Copyright (C) 2014-2015 Triumph LLC
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

"use strict";

/**
 * Engine debugging API.
 * @module debug
 * @local DebugWireframeMode
 * @local StageloadCallback
 * @local LoadedCallback
 */
b4w.module["debug"] = function(exports, require) {

var m_batch    = require("__batch");
var m_cfg      = require("__config");
var m_ctl      = require("__controls");
var m_debug    = require("__debug");
var m_ext      = require("__extensions");
var m_load     = require("__loader");
var m_obj      = require("__objects");
var m_obj_util = require("__obj_util");
var m_phy      = require("__physics");
var m_print    = require("__print");
var m_render   = require("__renderer");
var m_scenes   = require("__scenes");
var m_scgraph  = require("__scenegraph");
var m_sfx      = require("__sfx");
var m_shaders  = require("__shaders");
var m_textures = require("__textures");
var m_util     = require("__util");
var m_vec3     = require("vec3");

var cfg_def = m_cfg.defaults;

var PERF_NUM_CALLS = 10;

/**
 * Debug wireframe mode.
 * @typedef DebugWireframeMode
 * @type {Number}
 */

 /**
 * Data loaded callback.
 * @callback LoadedCallback
 */

/**
 * Loading stage callback.
 * @callback StageloadCallback
 * @param {Number} percentage Loading progress (0-100).
 */

/**
 * Debug wireframe mode: turn off wireframe view.
 * @const {DebugWireframeMode} module:debug.WM_NONE
 */
exports.WM_NONE = m_debug.WM_NONE;

/**
 * Debug wireframe mode: turn on the black-and-white wireframe view.
 * @const {DebugWireframeMode} module:debug.WM_OPAQUE_WIREFRAME
 */
exports.WM_OPAQUE_WIREFRAME = m_debug.WM_OPAQUE_WIREFRAME;

/**
 * Debug wireframe mode: turn on the transparent (superimposed on the source color) wireframe view.
 * @const {DebugWireframeMode} module:debug.WM_TRANSPARENT_WIREFRAME
 */
exports.WM_TRANSPARENT_WIREFRAME = m_debug.WM_TRANSPARENT_WIREFRAME;

/**
 * Debug wireframe mode: turn on the wireframe view with the front/back faces coloration.
 * @const {DebugWireframeMode} module:debug.WM_FRONT_BACK_VIEW
 */
exports.WM_FRONT_BACK_VIEW = m_debug.WM_FRONT_BACK_VIEW;

/**
 * Debug wireframe mode: turn on the debug spheres view.
 * @const {DebugWireframeMode} module:debug.WM_DEBUG_SPHERES
 */
exports.WM_DEBUG_SPHERES = m_debug.WM_DEBUG_SPHERES;

/**
 * Print info about the physics worker.
 * @method module:debug.physics_stats
 */
exports.physics_stats = function() {
    m_phy.debug_workers();
}

/**
 * Print object info by physics ID.
 * @method module:debug.physics_id
 * @param {Number} id Physics ID
 */
exports.physics_id = function(id) {
    m_print.log("O", m_phy.find_obj_by_body_id(id))

    var bundles = m_phy.get_active_scene()._physics.bundles;

    for (var i = 0; i < bundles.length; i++) {
        var bundle = bundles[i];
        var phy = bundle.physics;

        if (phy.body_id == id)
            m_print.log("B", bundle);
    }
}

/**
 * Print names and info for objects inside the view frustum.
 * @method module:debug.visible_objects
 */
exports.visible_objects = function() {
    var scene = m_scenes.get_active();

    var objs = m_obj.get_scene_objs(scene, "MESH", m_obj.DATA_ID_ALL);

    var main_subscenes = [m_scenes.get_subs(scene, "MAIN_OPAQUE"),
                          m_scenes.get_subs(scene, "MAIN_BLEND"),
                          m_scenes.get_subs(scene, "MAIN_GLOW")];

    for (var i = 0; i < main_subscenes.length; i++) {
        var subs_main = main_subscenes[i];
        var bundles = subs_main.bundles;

        if (!bundles.length)
            continue;

        m_print.group(subs_main.type, "DYNAMIC");

        for (var j = 0; j < objs.length; j++) {
            var obj = objs[j];
            var render = obj.render;

            if (render.type != "DYNAMIC")
                continue;

            for (var k = 0; k < bundles.length; k++) {
                var bundle = bundles[k];
                if (bundle.do_render && bundle.obj_render == render) {
                    m_print.log_raw(obj.name, obj);
                    break;
                }
            }
        }

        m_print.groupEnd();

        m_print.groupCollapsed(subs_main.type, "STATIC");

        for (var j = 0; j < objs.length; j++) {
            var obj = objs[j];
            var render = obj.render;

            if (render.type == "DYNAMIC")
                continue;

            for (var k = 0; k < bundles.length; k++) {
                var bundle = bundles[k];
                if (bundle.do_render && bundle.obj_render == render) {
                    m_print.log_raw(obj.name, obj);
                    break;
                }
            }
        }

        m_print.groupEnd();
    }
}

/**
 * Print debug info for the object with the given name
 * @method module:debug.object_info
 * @param {String} name Object name
 */
exports.object_info = function(name) {
    var scene = m_scenes.get_active();

    var objs = m_obj.get_scene_objs(scene, "MESH", m_obj.DATA_ID_ALL);

    for (var i = 0; i < objs.length; i++) {
        var obj = objs[i];

        if (obj.name != name)
            continue;

        m_print.log("Object", obj);

        var subscenes = m_scenes.get_all_subscenes(scene);

        for (var j = 0; j < subscenes.length; j++) {
            var subs = subscenes[j];
            var bundles = subs.bundles;

            var print_bundles = [];

            for (var k = 0; k < bundles.length; k++) {
                if (bundles[k].obj_render == obj.render)
                    print_bundles.push(bundles[k]);
            }

            m_print.log("Subscene " + subs.type, print_bundles);
        }
    }
}

/**
 * Print debug info for the object with the given name
 * @method module:debug.objects_stat
 */
exports.objects_stat = function() {
    var scene = m_scenes.get_active();

    console.log("Armatures: " + m_obj.get_scene_objs(scene, "ARMATURE",
            m_obj.DATA_ID_ALL).length);
    console.log("Cameras: " + m_obj.get_scene_objs(scene, "CAMERA",
            m_obj.DATA_ID_ALL).length);
    console.log("Curves: " + m_obj.get_scene_objs(scene, "CURVE",
            m_obj.DATA_ID_ALL).length);
    console.log("Empties: " + m_obj.get_scene_objs(scene, "EMPTY",
            m_obj.DATA_ID_ALL).length);
    console.log("Lamps: " + m_obj.get_scene_objs(scene, "LAMP",
            m_obj.DATA_ID_ALL).length);
    console.log("Meshes: " + m_obj.get_scene_objs(scene, "MESH",
            m_obj.DATA_ID_ALL).length);
    console.log("Speakers: " + m_obj.get_scene_objs(scene, "SPEAKER",
            m_obj.DATA_ID_ALL).length);
}

/**
 * Return the number of vertices in the active scene.
 * @method module:debug.num_vertices
 * @returns {Number} The number of vertices.
 */
exports.num_vertices = function() {

    var num = 0;

    var scene = m_scenes.get_active();

    var main_subscenes = [m_scenes.get_subs(scene, "MAIN_OPAQUE"),
                          m_scenes.get_subs(scene, "MAIN_BLEND"),
                          m_scenes.get_subs(scene, "MAIN_GLOW")];

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
 * @returns {Number} The number of all triangles.
 */
exports.num_triangles = function() {

    var num = 0;

    var scene = m_scenes.get_active();

    var main_subscenes = [m_scenes.get_subs(scene, "MAIN_OPAQUE"),
                          m_scenes.get_subs(scene, "MAIN_BLEND"),
                          m_scenes.get_subs(scene, "MAIN_GLOW")];

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
 * @returns {Number} The number of batches.
 */
exports.num_draw_calls = function() {

    var scene = m_scenes.get_active();

    var main_subscenes = [m_scenes.get_subs(scene, "MAIN_OPAQUE"),
                          m_scenes.get_subs(scene, "MAIN_BLEND"),
                          m_scenes.get_subs(scene, "MAIN_GLOW")]

    var number = 0;
    for (var i = 0; i < main_subscenes.length; i++) {
        var subs = main_subscenes[i];
        if (subs)
            number += subs.bundles.length;
    }

    var reflect_subs = m_scenes.subs_array(scene, ["MAIN_PLANE_REFLECT",
                                                   "MAIN_CUBE_REFLECT"]);
    for (var i = 0; i < reflect_subs.length; i++) {
        var subs = reflect_subs[i];
        if (subs.type == "MAIN_PLANE_REFLECT")
            number += subs.bundles.length;
        else
            number += 6 * subs.bundles.length;
    }

    return number;
}

/**
 * Return the number of compiled shaders.
 * @method module:debug.num_shaders
 * @returns {Number} The number of compiled shaders.
 */
exports.num_shaders = function() {
    var compiled_shaders = m_shaders.get_compiled_shaders();
    return m_util.get_dict_length(compiled_shaders);
}

/**
 * Return geometry info in the main scenes.
 * @method module:debug.geometry_stats
 * @returns {Object} Geometry info.
 */
exports.geometry_stats = function() {

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
                if (subs.type != "COLOR_PICKING" && subs.type != "OUTLINE_MASK"
                        || render.origin_selectable || render.origin_outlining)
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
 * @returns {Object} Textures info.
 */
exports.num_textures = function() {

    var tex_list = [];

    var memory = 0;

    var scene = m_scenes.get_active();

    var main_subscenes = [m_scenes.get_subs(scene, "MAIN_OPAQUE"),
                          m_scenes.get_subs(scene, "MAIN_BLEND"),
                          m_scenes.get_subs(scene, "MAIN_GLOW")];

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
 * @returns {Object} Render targets info.
 */
exports.num_render_targets = function() {

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
                memory += cam.width * cam.height * m_textures.get_texture_texel_size(tex);
            }
        }
    }

    return {"number": list.length, "memory": (memory / 1024 / 1024)};
}

/**
 * Draw a frustum for the active camera.
 * @method module:debug.make_camera_frustum_shot
 */
exports.make_camera_frustum_shot = function() {

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
exports.make_light_frustum_shot = function() {

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
exports.scenegraph_to_dot = function() {
    var scenes = m_scenes.get_all_scenes();

    for (var i = 0; i < scenes.length; i++) {
        var scene = scenes[i];
        var graph = m_scenes.get_graph(scene);
        m_print.log("\n" + m_scgraph.debug_convert_to_dot(graph));
    }
}

exports.scenes_to_dot = function() {

}

exports.loading_graph_to_dot = function(data_id) {
    data_id = data_id | 0;
    m_print.log("\n" + m_load.graph_to_dot(data_id));
}

/**
 * Print info about the controls module.
 * @method module:debug.controls_info
 */
exports.controls_info = m_ctl.debug;

/**
 * Get the distance between two objects.
 * @method module:debug.object_distance
 * @param {Object3D} obj The first object.
 * @param {Object3D} obj2 The second object.
 * @returns {Number} Distance.
 */
exports.object_distance = function(obj, obj2) {
    var trans = m_tsr.get_trans_view(obj.render.world_tsr);
    var trans2 = m_tsr.get_trans_view(obj2.render.world_tsr);
    var dist = m_vec3.dist(trans, trans2);
    return dist;
}

/**
 * Store a simple telemetry message.
 * @method module:debug.msg
 */
exports.msg = m_debug.msg;

/**
 * Store a flashback telemetry message.
 * @method module:debug.fbmsg
 */
exports.fbmsg = m_debug.fbmsg;

/**
 * Print the list of flashback messages.
 * @method module:debug.print_telemetry
 */
exports.print_telemetry = m_debug.print_telemetry;

/**
 * Plot the list of flashback messages as a gnuplot datafile.
 * @method module:debug.plot_telemetry
 */
exports.plot_telemetry = m_debug.plot_telemetry;

/**
 * Store the callback function result as a flashback message.
 * @method module:debug.fbres
 * @param {Function} fun fun
 * @param {Number} timeout timeout
 */
exports.fbres = function(fun, timeout) {
    if (!timeout)
        timeout = 16;

    var cb = function() {
        m_debug.fbmsg("FBRES", fun());
        setTimeout(cb, timeout);
    }

    cb();
}

/**
 * Check the engine constants, abort if not constant.
 * @method module:debug.assert_constants
 */
exports.assert_constants = function() {
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
exports.mute_music = function() {
    var spks = m_sfx.get_speaker_objects();

    for (var i = 0; i < spks.length; i++) {
        var spk = spks[i];

        if (m_sfx.get_spk_behavior(spk) == "BACKGROUND_MUSIC")
            m_sfx.mute(spk, true);
    }
}

/**
 * Check the object for a finite value.
 * @method module:debug.check_finite
 * @param {*} o Value
 */
exports.check_finite = function(o) {
    m_debug.check_finite(o);
}

/**
 * Set debugging parameters.
 * @method module:debug.set_debug_params
 * @param {DebugParams} params Debug parameters
 * @cc_externs wireframe_mode wireframe_edge_color
 */
exports.set_debug_params = function(params) {
    var active_scene = m_scenes.get_active();
    var subs_wireframe = m_scenes.get_subs(active_scene, "WIREFRAME");

    if (subs_wireframe) {
        if (typeof params.wireframe_mode == "number") {
            switch (params.wireframe_mode) {
            case m_debug.WM_NONE:
            case m_debug.WM_OPAQUE_WIREFRAME:
            case m_debug.WM_TRANSPARENT_WIREFRAME:
            case m_debug.WM_FRONT_BACK_VIEW:
            case m_debug.WM_DEBUG_SPHERES:
                m_scenes.set_wireframe_mode(subs_wireframe, params.wireframe_mode);
                break;
            default:
                m_print.error("set_debug_params(): Wrong wireframe mode");
                break;
            }
        }
        if (typeof params.wireframe_edge_color == "object")
            m_scenes.set_wireframe_edge_color(subs_wireframe, params.wireframe_edge_color);
    } else
        throw("Wireframe subscene not found.");
}

exports.get_error_quantity = function() {
    return m_print.get_error_count();
}

exports.get_warning_quantity = function() {
    return m_print.get_warning_count();
}

exports.clear_errors_warnings = function() {
    return m_print.clear_errors_warnings();
}

/**
 * Print shaders' statistics.
 * @method module:debug.analyze_shaders
 * @param {String} [opt_shader_id_part=""] Shader ID (filename) part.
 */
exports.analyze_shaders = function(opt_shader_id_part) {

    var compiled_shaders = m_shaders.get_compiled_shaders();

    var count = 0;
    for (var shader_id in compiled_shaders) {
        if (opt_shader_id_part && shader_id.indexOf(opt_shader_id_part) === -1)
            continue;
        count++;
    }
    var msg = "of " + count + " analyzing...";

    var rslts = {};

    for (var shader_id in compiled_shaders) {

        if (opt_shader_id_part && shader_id.indexOf(opt_shader_id_part) === -1)
            continue;

        var cshader = compiled_shaders[shader_id];
        var stat = get_shaders_stat(cshader.vshader, cshader.fshader);

        var shaders_info = cshader.shaders_info;
        var title = shaders_info.vert + " + " + shaders_info.frag;

        // NOTE: cshader.shaders_info
        stat.cshader = cshader;
        stat.shaders_info = shaders_info;

        var stats = rslts[title] = rslts[title] || [];

        stats.push(stat);
        m_print.log(msg);
    }

    for (var title in rslts) {

        m_print.group("%c" + title, "color: #800");
        var stats = rslts[title];
        print_shader_stats_nvidia(stats);
        m_print.groupEnd();
    }
}

/**
 * Return stage callback without loading data.
 * @method module:debug.fake_load
 * @param {StageloadCallback} stageload_cb Callback to report about the loading progress
 * @param {Number} [interval=5000] Loading interval
 * @param {Number} [start=0] Start percentage
 * @param {Number} [end=5000] End percentage
 * @param {LoadedCallback} [loaded_cb=null] Callback to be executed right after load
 */
exports.fake_load = m_debug.fake_load;

function get_shaders_stat(vshader, fshader) {

    var ext_ds = m_ext.get_debug_shaders();
    if (!ext_ds) {
        m_print.error("WEBGL_debug_shaders not found" +
            " (run Chrome with --enable-privileged-webgl-extensions)");
        return;
    }

    var vsrc = ext_ds.getTranslatedShaderSource(vshader);
    var fsrc = ext_ds.getTranslatedShaderSource(fshader);

    // HACK: lower GLSL version for NVIDIA drivers
    vsrc = vsrc.replace("#version", "#version 400 //")
    fsrc = fsrc.replace("#version", "#version 400 //")

    var vout = post_sync("/nvidia_vert", vsrc);
    var vstats = parse_shader_assembly(vout);

    var fout = post_sync("/nvidia_frag", fsrc);
    var fstats = parse_shader_assembly(fout);

    return {
        vsrc: vsrc,
        vout: vout,
        vstats: vstats,
        fsrc: fsrc,
        fout: fout,
        fstats: fstats
    };
}

function parse_shader_assembly(data) {
    var stats = {};

    if (!data)
        return stats;

    var lines = data.split("\n");

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];

        if (line.search(new RegExp(/^[A-Z.]+ /)) == -1)
            continue;

        var op = line.split(" ")[0];

        if (!(op in stats))
            stats[op] = 0;

        stats[op]++;
    }

    var alu_ops = 0;
    var tex_ops = 0;

    for (var op in stats) {
        switch (op) {
        case "KIL":
        case "TEX":
        case "TXB":
        case "TXP":
        case "KIL.F":
        case "TEX.F":
        case "TXB.F":
        case "TXD.F":
        case "TXL.F":
        case "TXQ.F":
        case "TXP.F":
            tex_ops += stats[op];
            break;
        default:
            alu_ops += stats[op];
            break;
        }
    }

    stats["ALU_OPS"] = alu_ops;
    stats["TEX_OPS"] = tex_ops;

    return stats;
}

function post_sync(path, data) {
    var req = new XMLHttpRequest();
    req.open("POST", path, false);
    req.send(data);

    if (req.status == 200)
        return req.responseText;
    else
        throw("Error POST XHR: " + req.status);
}

function print_shader_stats_nvidia(stats) {
    // sort in descending order by fragment shader ALU operations
    stats.sort(function(a, b) {
        return b.fstats["ALU_OPS"] - a.fstats["ALU_OPS"];
    })

    for (var j = 0; j < stats.length; j++) {
        var stat = stats[j];

        var fstats = stat.fstats;
        var vstats = stat.vstats;

        var mat_names = find_material_names_by_comp_shader(stat.cshader);
        mat_names = mat_names ? "\t\t(" + mat_names.join(", ") + ")" : "\t\t(NA)";

        // NOTE some not changing params are commented out
        m_print.groupCollapsed(
            "FRAG -->",
            "ALU", fstats["ALU_OPS"],
            "TEX", fstats["TEX_OPS"],

            "\t\tVERT -->",
            "ALU", vstats["ALU_OPS"],
            "TEX", vstats["TEX_OPS"],
            mat_names
        );

        m_print.groupCollapsed("directives");
        var dirs = stat.shaders_info.directives;
        for (var i = 0; i < dirs.length; i++) {
            var dir = dirs[i];
            m_print.log(dir[0], dir[1]);
        }
        m_print.groupEnd();

        m_print.groupCollapsed("vert src");
        m_print.log(stat.vsrc);
        m_print.groupEnd();

        m_print.groupCollapsed("vert stats");
        for (var op in vstats)
            if (op != "ALU_OPS" && op != "TEX_OPS")
                m_print.log(op, vstats[op]);
        m_print.groupEnd();

        m_print.groupCollapsed("frag src");
        m_print.log(stat.fsrc);
        m_print.groupEnd();

        m_print.groupCollapsed("frag stats");
        for (var op in fstats)
            if (op != "ALU_OPS" && op != "TEX_OPS")
                m_print.log(op, fstats[op]);
        m_print.groupEnd();

        m_print.groupEnd();
    }
}

function find_material_names_by_comp_shader(cshader) {

    var scenes = m_scenes.get_all_scenes();

    for (var i = 0; i < scenes.length; i++) {
        var scene = scenes[i];
        var objects = m_obj.get_scene_objs(scene, "MESH", m_obj.DATA_ID_ALL);

        for (var j = 0; j < objects.length; j++) {
            var obj = objects[j];
            var scene_data = m_obj_util.get_scene_data(obj, scene);

            if (!scene_data || !scene_data.batches.length)
                continue;

            var batches = scene_data.batches;

            for (var k = 0; k < batches.length; k++) {
                var batch = batches[k];

                if (batch.shader == cshader &&
                        batch.material_names.length) {
                    return batch.material_names;
                }
            }
        }
    }

    return null;
}

/**
 * Perform simple performance test.
 * @method module:debug.test_performance
 * @param {TestPerformanceCallback} callback Callback
 */
exports.test_performance = function(callback) {
    var ext = m_ext.get_disjoint_timer_query();
    if (!ext) {
        callback(-1);
        return;
    }

    var graph = m_scgraph.create_performance_graph();
    m_scenes.generate_auxiliary_batches(graph);

    var subs = m_scgraph.find_subs(graph, "PERFORMANCE");

    for (var i = 0; i < PERF_NUM_CALLS; i++)
        m_render.draw(subs);

    window.setTimeout(function() {
        m_debug.process_timer_queries(subs);
        callback(subs.debug_render_time);
    }, 100);
}

}
