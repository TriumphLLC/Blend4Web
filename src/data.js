/**
 * Copyright (C) 2014-2016 Triumph LLC
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
 * Data internal API.
 * @name data
 * @namespace
 * @exports exports as data
 */
b4w.module["__data"] = function(exports, require) {

var m_anchors   = require("__anchors");
var m_anim      = require("__animation");
var m_assets    = require("__assets");
var m_batch     = require("__batch");
var m_cfg       = require("__config");
var m_ctl       = require("__controls");
var m_texcomp   = require("__texcomp");
var m_debug     = require("__debug");
var m_ext       = require("__extensions");
var m_input     = require("__input");
var m_loader    = require("__loader");
var m_md5       = require("__md5");
var m_nla       = require("__nla");
var m_lnodes    = require("__logic_nodes");
var m_particles = require("__particles");
var m_nodemat   = require("__nodemat");
var m_obj       = require("__objects");
var m_obj_util  = require("__obj_util");
var m_phy       = require("__physics");
var m_print     = require("__print");
var m_quat      = require("__quat");
var m_reformer  = require("__reformer");
var m_render    = require("__renderer");
var m_scenes    = require("__scenes");
var m_sfx       = require("__sfx");
var m_shaders   = require("__shaders");
var m_subs      = require("__subscene");
var m_tex       = require("__textures");
var m_time      = require("__time");
var m_trans     = require("__transform");
var m_tsr       = require("__tsr");
var m_util      = require("__util");
var m_vec3      = require("__vec3");
var m_vec4      = require("__vec4");

var cfg_anim = m_cfg.animation;
var cfg_def  = m_cfg.defaults;
var cfg_ldr  = m_cfg.assets;
var cfg_phy  = m_cfg.physics;
var cfg_sfx  = m_cfg.sfx;

var DEBUG_BPYDATA = false;
var DEBUG_LOD_DIST_NOT_SET = false;

var NORMAL_NUM_COMP  = 3;
var TANGENT_NUM_COMP  = 4;
var TBN_QUAT_NUM_COMP = 4;

var _bpy_data_array = null;
var _all_objects_cache = null;
var _debug_resources_root = "";

var _primary_scene = null;
var _dupli_obj_id_overrides = {};

var _vec3_tmp = new Float32Array(3);
var _vec4_tmp = new Float32Array(4);
var _quat_tmp = new Float32Array(4);
var _quat_tmp2 = new Float32Array(4);

var PLAY_MEDIA_IMAGE_MOBILE = "data:image/png;base64,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";
var _play_media_btn = null;
var _play_media_bkg = null;
var _canvas_container_z_index = 0;
var _media_data_init = false;

var SECONDARY_LOAD_TYPES_DISABLED = ["LAMP", "CAMERA"];
var ADD_PHY_TYPES = ["MESH", "CAMERA", "EMPTY"];

var B4W_HEADER_OFFSET = 12;

var _canvas = null;
/**
 * Check if primary scene is loaded (detect last loading stage)
 */
exports.is_primary_loaded = function(data_id) {
    return m_loader.is_primary_loaded(data_id);
}

/**
 * Executed every frame
 */
exports.update = function() {
    m_loader.update_scheduler(_bpy_data_array);
}

function free_load_data(bpy_data, thread) {

    //m_assets.cleanup();
    _bpy_data_array[thread.id] = null;
    _all_objects_cache[thread.id] = null;
}

function print_image_info(image_data, image_path, show_path_warning, comp_method) {

    var w, h;

    if (image_data instanceof ArrayBuffer) {
        var dds_wh = m_texcomp.get_width_height(image_data, comp_method);
        w = dds_wh.width;
        h = dds_wh.height;
    } else {
        w = image_data.width;
        h = image_data.height;
    }

    var color;
    if (w > 2048 || h > 2048)
        color = "a00";
    else if (w > 1024 || h > 1024)
        color = "aa0";
    else
        color = "0a0";
    m_print.log("%cLOAD IMAGE " + w + "x" + h, "color: #" + color, image_path);

    if (image_path.indexOf(_debug_resources_root) == -1 && show_path_warning)
        m_print.warn("image", image_path, "is not from app root.");
}

function print_video_info(video, image_path, show_path_warning, type) {

    if (type == m_assets.AT_VIDEO_ELEMENT) {
        var w = video.videoWidth;
        var h = video.videoHeight;
    } else {
        var w = video.images[0].width;
        var h = video.images[0].height;
    }

    var color;
    if (w > 2048 || h > 2048)
        color = "a00";
    else if (w > 1024 || h > 1024)
        color = "aa0";
    else
        color = "0a0";
    m_print.log("%cLOAD VIDEO " + w + "x" + h, "color: #" + color, image_path);

    if (image_path.indexOf(_debug_resources_root) == -1 && show_path_warning)
        m_print.warn("video", image_path, "is not from app root.");
}


/**
 * Load main json
 */
function load_main(bpy_data, thread, stage, cb_param, cb_finish,
        cb_set_rate) {

    var main_path = thread.filepath;
    if (!main_path)
        m_util.panic("Nothing requested");

    var asset_cb = function(loaded_bpy_data, uri, type, path) {

        // Failed to load scene main file
        if (!loaded_bpy_data) {
            m_loader.abort_thread(thread);
            return;
        }

        m_print.log("%cLOAD METADATA", "color: #616", path);

        check_format_version(loaded_bpy_data);
        
        // copy-link its properties to initial bpy_data
        for (var prop in loaded_bpy_data)
            bpy_data[prop] = loaded_bpy_data[prop];

        prepare_thread_bpy(thread, bpy_data);
        
        show_export_errors(bpy_data, thread);
        show_export_warnings(bpy_data, thread);
        cb_finish(thread, stage);
    }

    var progress_cb = function(rate) {
        cb_set_rate(thread, stage, rate);
    }

    m_assets.enqueue([{id:main_path, type:m_assets.AT_JSON, url:main_path}], asset_cb, null,
            progress_cb);
}

function prepare_thread_bpy(thread, bpy_data) {
    // Set primary bpy data
    if (thread.is_primary)
        _primary_scene = m_scenes.find_main_scene(bpy_data["scenes"]);

    var bin_name = bpy_data["binaries"][0]["binfile"];
    if (bin_name)
        thread.binary_name = bin_name;
    else {
        m_loader.skip_stage_by_name(thread, "load_binaries");
        m_loader.skip_stage_by_name(thread, "prepare_bindata");
    }

    if (!cfg_def.is_mobile_device)
        m_loader.skip_stage_by_name(thread, "mobile_media_start");

    if (!cfg_def.antialiasing || !cfg_def.smaa)
        m_loader.skip_stage_by_name(thread, "load_smaa_textures");
}

function show_export_warnings(bpy_data, thread) {
    if (bpy_data["b4w_export_warnings"])
        for (var i = 0; i < bpy_data["b4w_export_warnings"].length; i++) {
            var warn_data = bpy_data["b4w_export_warnings"][i];
            if (thread.is_primary && warn_data["type"] == "PRIMARY" || warn_data["type"] == "ALL")
                m_print.export_warn(warn_data["text"] +
                    " See more details in https://www.blend4web.com/doc/en/addon.html#other-messages");
        }
}

function show_export_errors(bpy_data, thread) {
    if (bpy_data["b4w_export_errors"])
        for (var i = 0; i < bpy_data["b4w_export_errors"].length; i++) {
            var err_data = bpy_data["b4w_export_errors"][i];
            if (thread.is_primary && err_data["type"] == "PRIMARY" || err_data["type"] == "ALL")
                m_print.export_error(err_data["text"] +
                    " See more details in https://www.blend4web.com/doc/en/addon.html#non-critical-export-errors");
        }
}

/**
 * Load binary file
 */
function load_binaries(bpy_data, thread, stage, cb_param, cb_finish,
        cb_set_rate) {
    var binary_path = dirname(thread.filepath) + thread.binary_name;

    if (!binary_path)
        m_util.panic("Binary data is missing");

    var binary_cb = function(bin_data, uri, type, path) {

        // Failed to load scene binary file
        if (!bin_data) {
            m_loader.abort_thread(thread);
            return;
        }

        m_print.log("%cLOAD BINARY", "color: #616", path);

        bpy_data["bin_data"] = bin_data;
        check_bin_data_version(bin_data, bpy_data);
        cb_finish(thread, stage);
    }

    var progress_cb = function(rate) {
        cb_set_rate(thread, stage, rate);
    }

    m_assets.enqueue([{id:binary_path, type:m_assets.AT_ARRAYBUFFER, url:binary_path}],
            binary_cb, null, progress_cb);
}

function wait_for_shaders(bpy_data, thread, stage, cb_param, cb_finish,
        cb_set_rate) {

    if (m_shaders.check_shaders_loaded())
        cb_finish(thread, stage);
}

function check_format_version(loaded_bpy_data) {

    var ver_loaded = m_util.str_to_version(loaded_bpy_data["b4w_format_version"]);
    var cmp = m_util.version_cmp(ver_loaded, cfg_def.min_format_version);

    switch (cmp) {
    case -1:
        if (ver_loaded[0] < cfg_def.min_format_version[0])
            m_util.panic("JSON version is too old relative to B4W engine: " 
                    + m_util.version_to_str(ver_loaded) + ", required: " 
                    + m_util.version_to_str(cfg_def.min_format_version) + ". "
                    + "Reexport scene with the latest B4W addon to fix it.");
        else
            m_print.warn("JSON version is a bit old relative to B4W engine: "
                    + m_util.version_to_str(ver_loaded) + ", required: " 
                    + m_util.version_to_str(cfg_def.min_format_version) 
                    + ". Some compatibility issues can occur. "
                    + "Reexport scene with the latest B4W addon to fix it.");
        break;
    case 1:
        if (ver_loaded[0] > cfg_def.min_format_version[0])
            m_util.panic("B4W engine version is too old relative to JSON. " 
                    + "Can't load the scene. Update your " 
                    + "engine version to fix it.");
        else
            m_print.error("B4W engine version is a bit old relative to JSON. " 
                    + "Some compatibility issues can occur. Update " 
                    + "your engine version to fix it.");
        break;
    }
    
    cfg_def.loaded_data_version = ver_loaded;
}

/**
 * Prepare bin data after main libs loaded
 */
function prepare_bindata(bpy_data, thread, stage, cb_param, cb_finish,
        cb_set_rate) {

    var bin_data = bpy_data["bin_data"];
    var bin_offsets = bpy_data["binaries"][0];
    var objects = bpy_data["objects"];
    var meshes = bpy_data["meshes"];
    var actions = bpy_data["actions"];

    var is_le = m_util.check_endians();

    var headers = get_header(bin_data);

    prepare_bindata_submeshes(bin_data, bin_offsets, meshes, is_le, B4W_HEADER_OFFSET);
    prepare_bindata_psystems(bin_data, bin_offsets, objects, is_le, B4W_HEADER_OFFSET);
    prepare_bindata_actions(bin_data, bin_offsets, actions, is_le, B4W_HEADER_OFFSET);

    cb_finish(thread, stage);
}

function check_bin_data_version(bin_data, bpy_data) {

    var headers = get_header(bin_data);
    var ver_loaded = m_util.str_to_version(bpy_data["b4w_format_version"]);
    if (headers[0] != ver_loaded[0])
        m_util.panic("BIN version does not match to JSON version: " 
                + m_util.version_to_str(headers) + ", required: " 
                + m_util.version_to_str(cfg_def.min_format_version)
                + ". Couldn't load the scene. "
                + "Reexport scene to fix it.");
    if (headers[1] != ver_loaded[1])
        m_print.warn("BIN version does not match to JSON version: " + 
                + m_util.version_to_str(headers) + ", required: " 
                + m_util.version_to_str(cfg_def.min_format_version) 
                + ". Some compatibility issues can occur. "
                + "Reexport scene to fix it.");
}

function get_header(bin_data) {
    var has_data = new Uint8Array(bin_data, 0, 4);
    var major_version = new Uint32Array(bin_data, 4, 1)[0];
    var minor_version = new Uint32Array(bin_data, 8, 1)[0];
    return [major_version, minor_version];
}

function prepare_bindata_submeshes(bin_data, bin_offsets, meshes, is_le, b4w_offset) {
    var int_props = ["indices"];
    var float_props = ["position", "texcoord", "texcoord2", "shade_tangs"];
    var short_props = ["normal", "tangent"];
    var ushort_props = ["group"];
    var uchar_props = ["color"];

    for (var i = 0; i < meshes.length; i++) {
        var submeshes = meshes[i]["submeshes"];

        for (var j = 0; j < submeshes.length; j++) {

            for (var prop_name in submeshes[j]) {
                var length = submeshes[j][prop_name][1];

                if (int_props.indexOf(prop_name) != -1) {
                    var offset = submeshes[j][prop_name][0] * m_util.INT_SIZE
                            + bin_offsets["int"] + b4w_offset;
                    submeshes[j][prop_name] = extract_bindata_uint(bin_data,
                            offset, length, is_le);
                } else if (float_props.indexOf(prop_name) != -1) {
                    var offset = submeshes[j][prop_name][0] * m_util.FLOAT_SIZE
                            + bin_offsets["float"] + b4w_offset;
                    submeshes[j][prop_name] = extract_bindata_float(bin_data,
                            offset, length, is_le);
                } else if (short_props.indexOf(prop_name) != -1) {
                    var offset = submeshes[j][prop_name][0] * m_util.SHORT_SIZE
                            + bin_offsets["short"] + b4w_offset;
                    submeshes[j][prop_name] = extract_bindata_short(bin_data,
                            offset, length);
                } else if (ushort_props.indexOf(prop_name) != -1) {
                    var offset = submeshes[j][prop_name][0] * m_util.SHORT_SIZE
                            + bin_offsets["ushort"] + b4w_offset;
                    submeshes[j][prop_name] = extract_bindata_ushort(bin_data,
                            offset, length);
                } else if (uchar_props.indexOf(prop_name) != -1) {
                    var offset = submeshes[j][prop_name][0] * m_util.BYTE_SIZE
                            + bin_offsets["uchar"] + b4w_offset;
                    submeshes[j][prop_name] = extract_bindata_uchar(bin_data,
                            offset, length);
                }
            }

            setup_tbn_quat(meshes[i], submeshes[j]);
        }
    }
}

function setup_tbn_quat(mesh, submesh) {
    if (mesh["b4w_shape_keys"].length) {
        var base_length = submesh["base_length"];
        var frames = submesh["normal"].length / base_length / NORMAL_NUM_COMP;
        var tbn_length = submesh["normal"].length / NORMAL_NUM_COMP * TBN_QUAT_NUM_COMP;

        submesh["tbn_quat"] = m_util.gen_tbn_quats(
                submesh["normal"].subarray(0, base_length * NORMAL_NUM_COMP),
                submesh["tangent"].subarray(0, base_length * TANGENT_NUM_COMP),
                new Float32Array(tbn_length)
        );
        for (var i1 = 1; i1 < frames; i1++) {
            var flame_offset = i1 * base_length;

            for (var i2 = 0; i2 < base_length; i2++) {

                var normal1 = submesh["normal"].subarray(
                        i2 * NORMAL_NUM_COMP,
                        (i2 + 1) * NORMAL_NUM_COMP);
                var normal2 = m_vec3.add(
                        submesh["normal"].subarray(
                                (flame_offset + i2) * NORMAL_NUM_COMP,
                                (flame_offset + i2 + 1) * NORMAL_NUM_COMP),
                        normal1,
                        _vec3_tmp);

                if (submesh["tangent"].length) {
                    var tangent1 = submesh["tangent"].subarray(
                            i2 * TANGENT_NUM_COMP,
                            (i2 + 1) * TANGENT_NUM_COMP);
                    var tangent2 = m_vec4.add(
                            submesh["tangent"].subarray(
                                    (flame_offset + i2) * TANGENT_NUM_COMP,
                                    (flame_offset + i2 + 1) * TANGENT_NUM_COMP),
                            tangent1,
                            _vec4_tmp);

                    var quat1 = m_util.get_tbn_quat(normal1, tangent1, _quat_tmp);
                    var quat2 = m_util.get_tbn_quat(normal2, tangent2, _quat_tmp2);

                    var inv_quat1 = m_quat.invert(quat1, _quat_tmp);
                    var delta_quat = m_quat.multiply(quat2, quat1, _quat_tmp);
                } else {
                    var delta_quat = m_quat.rotationTo(normal1, normal2, _quat_tmp);
                }

                submesh["tbn_quat"].set(delta_quat,
                        (flame_offset + i2) * TBN_QUAT_NUM_COMP);
            }
        }
    } else {
        submesh["tbn_quat"] = m_util.gen_tbn_quats(
                submesh["normal"], submesh["tangent"]
        );
    }
}

function prepare_bindata_psystems(bin_data, bin_offsets, bpy_objects, is_le, b4w_offset) {
    for (var i = 0; i < bpy_objects.length; i++) {
        var psystems = bpy_objects[i]["particle_systems"];

        for (var j = 0; j < psystems.length; j++) {
            var psys = psystems[j];
            var offset = psys["transforms"][0] * m_util.FLOAT_SIZE
                    + bin_offsets["float"] + b4w_offset;
            var length = psys["transforms"][1];
            psys["transforms"] = extract_bindata_float(bin_data,
                    offset, length, is_le);
        }
    }
}

// make points for every frame from start to end
function prepare_bindata_actions(bin_data, bin_offsets, actions, is_le, b4w_offset) {
    for (var i = 0; i < actions.length; i++) {
        var action = actions[i];
        var fcurves = action["fcurves"];

        var frame_range = action["frame_range"]; // same for all fcurves
        var start = frame_range[0]; // integer
        var end   = frame_range[1]; // integer

        var arr_length = m_anim.get_approx_curve_length(start, end);
        var bflags = null;

        if (arr_length < 0)
            arr_length = 0;

        // HACK: do not process euler rotation if quaternion rotation exists
        // currently applied in Blender b4w addon; temporary backward compatibility
        var has_euler_rot = false;
        var has_quat_rot = false;
        for (var data_path in fcurves) {
            has_euler_rot |= data_path.indexOf("rotation_euler") > -1;
            has_quat_rot |= data_path.indexOf("rotation_quaternion") > -1;
        }

        var paths_to_rename = [];
        for (var data_path in fcurves) {
            // HACK: see above
            if (has_euler_rot && has_quat_rot
                    && data_path.indexOf("rotation_euler") > -1) {
                delete fcurves[data_path];
                continue;
            }

            var channels = fcurves[data_path];
            for (var array_index in channels) {
                var fcurve = channels[array_index];
                var offset = bin_offsets["float"]
                        + fcurve["bin_data_pos"][0] * m_util.FLOAT_SIZE + b4w_offset;
                var fcurve_bin_data = extract_bindata_float(bin_data, offset,
                        fcurve["bin_data_pos"][1], is_le);

                var points = new Float32Array(arr_length);
                // blend flags are common for all action fcurves
                // if some channel is blended all transform will be blended
                if (bflags === null)
                    bflags = new Int8Array(arr_length);

                m_anim.approximate_curve(fcurve, fcurve_bin_data,
                        points, bflags, start, end);
                fcurve._pierced_points = points;
            }

            if (data_path.indexOf("rotation_euler") > -1) {
                m_anim.fcurve_replace_euler_by_quat(fcurves[data_path]);
                paths_to_rename.push(data_path);
            }
        }
        
        for (var j = 0; j < paths_to_rename.length; j++) {
            var path_old = paths_to_rename[j];
            var path_new = path_old.replace("euler", "quaternion");
            fcurves[path_new] = fcurves[path_old];
            delete fcurves[path_old];
        }

        action._bflags = bflags;
    }
}

function extract_bindata_float(bin_data, offset, length, is_le) {
    if (is_le)
        var arr = new Float32Array(bin_data, offset, length);
    else {
        var arr = new Float32Array(length);
        var dataview = new DataView(bin_data);
        for (var i = 0; i < length; i++)
            arr[i] = dataview.getFloat32(offset + i * m_util.FLOAT_SIZE, true);
    }
    return arr;
}

function extract_bindata_uint(bin_data, offset, length, is_le) {
    if (is_le)
        var arr = new Uint32Array(bin_data, offset, length);
    else {
        var arr = new Uint32Array(length);
        var dataview = new DataView(bin_data);
        for (var i = 0; i < length; i++)
            arr[i] = dataview.getUint32(offset + i * m_util.INT_SIZE, true);
    }
    return arr;
}

/**
 * Extract float data packed into shorts (floats in range [-1; 1])
 */
function extract_bindata_short(bin_data, offset, length) {

    var arr = new Float32Array(length);
    var dataview = new DataView(bin_data);
    for (var i = 0; i < length; i++)
        arr[i] = dataview.getInt16(offset + i * m_util.SHORT_SIZE, true) / 32767;
    return arr;
}

/**
 * Extract float data packed into unsigned shorts (floats in range [0; 1])
 */
function extract_bindata_ushort(bin_data, offset, length) {
    var arr = new Float32Array(length);
    var dataview = new DataView(bin_data);
    for (var i = 0; i < length; i++)
        arr[i] = dataview.getUint16(offset + i * m_util.SHORT_SIZE, true) / 65535;
    return arr;
}

/**
 * Extract float data packed into unsigned char (floats in range [0; 1])
 */
function extract_bindata_uchar(bin_data, offset, length) {
    var arr = new Float32Array(length);
    var dataview = new DataView(bin_data);
    for (var i = 0; i < length; i++)
        arr[i] = dataview.getUint8(offset + i * m_util.BYTE_SIZE, true) / 255;
    return arr;
}

function report_empty_submeshes(bpy_data) {

    var already_reported = {};

    var bpy_objects = bpy_data["objects"];

    for (var i = 0; i < bpy_objects.length; i++) {

        var bpy_obj = bpy_objects[i];
        if (bpy_obj["type"] !== "MESH")
            continue;

        // reporting for emitters is not supported
        if (bpy_obj["particle_systems"].length)
            continue;

        var mesh = bpy_obj["data"];
        var mesh_name = mesh["name"];
        var submeshes = mesh["submeshes"];
        var materials = mesh["materials"];

        for (var j = 0; j < submeshes.length; j++) {
            if (submeshes[j]["base_length"] === 0 &&
                    !already_reported[mesh_name]) {

                if (materials[j])
                    m_print.warn("material \"" + materials[j]["name"]
                        + "\" is not assigned to any face (object \""
                        + bpy_obj["name"] + "\").");
                already_reported[mesh_name] = true;
            }
        }
    }
}

function report_odd_uvs(meshes) {
    for (var i = 0; i < meshes.length; i++) {
        var mesh = meshes[i];
        var materials = mesh["materials"];
        var submeshes = mesh["submeshes"];

        if (!materials.length) {
            // Unnecessary uv maps
            if(mesh["uv_textures"].length)
                m_print.warn("mesh \"" + mesh["name"]
                             + "\" has a UV map but has no exported material.");

        }
    }
}

function prepare_bpy_data(bpy_data, thread, stage, cb_param, cb_finish,
        cb_set_rate) {

    make_bpy_links(bpy_data);

    m_reformer.check_bpy_data(bpy_data);

    create_bpy_textures(bpy_data, thread);

    report_empty_submeshes(bpy_data);
    report_odd_uvs(bpy_data["meshes"]);

    create_special_materials(bpy_data);
    assign_default_material(bpy_data);

    prepare_bpy_actions(bpy_data["actions"], thread.id);
    prepare_bpy_lods(bpy_data);
    prepare_bpy_scenes(bpy_data, thread);
    prepare_bpy_objects(bpy_data, thread);
    prepare_bpy_worlds(bpy_data, thread);
    prepare_bpy_logic_nodes_objects_params(bpy_data);

    prepare_bpy_scenes_audio(bpy_data, thread);

    if (DEBUG_BPYDATA)
        m_print.log("%cDEBUG BPYDATA:", "color: #a0a", bpy_data);

    cb_finish(thread, stage);
}

function create_bpy_textures(bpy_data, thread) {
    var textures = bpy_data["textures"];
    var global_af = get_global_anisotropic_filtering(bpy_data, thread);
    for (var i = 0; i < textures.length; i++) {
        // NOTE: disable offscreen rendering for secondary loaded data
        if ((!thread.is_primary) && (textures[i]["b4w_source_type"] == "SCENE"))
            textures[i]["b4w_source_id"] = "";  
        m_tex.create_texture_bpy(textures[i], global_af, bpy_data["scenes"], thread.id);
    }
}

function prepare_bpy_scenes(bpy_data, thread) {
    // NOTE: save only first scene for secondary data
    if (!thread.is_primary && bpy_data["scenes"].length > 1) {
        bpy_data["scenes"] = [m_scenes.find_main_scene(bpy_data["scenes"])];
        m_print.warn("loading data contains multiple scenes.",
                "Only the first one will be loaded.");
    }

    if (thread.is_primary)
        var main_scene = _primary_scene;
    else
        var main_scene = m_scenes.find_main_scene(bpy_data["scenes"]);

    m_time.set_framerate(_primary_scene["fps"]);
    if (bpy_data["scenes"].length > 1) {
        var index_of_main_scene = bpy_data["scenes"].indexOf(_primary_scene);
        bpy_data["scenes"].splice(index_of_main_scene, 1);
        bpy_data["scenes"].unshift(_primary_scene);
    }

    for (var i = 0; i < bpy_data["scenes"].length; i++) {
        var scene = bpy_data["scenes"][i];

        scene._render = m_scenes.create_scene_render();
        scene._is_main = scene == main_scene;
        scene._is_primary_thread = thread.is_primary;

        if (cfg_phy.enabled && scene["b4w_enable_physics"] &&
                (thread.is_primary || 
                 (!m_phy.scene_has_physics(_primary_scene) &&
                  scene == m_scenes.find_main_scene(bpy_data))))
            m_phy.init_scene_physics(scene);
    }
}

/**
 * Attach scene links through combining bpy objects by scene, then cache bpy objects.
 */
function prepare_bpy_objects(bpy_data, thread) {
    // process objects by scene
    for (var i = 0; i < bpy_data["scenes"].length; i++) {
        var bpy_scene = bpy_data["scenes"][i];
        var scene_objs = combine_scene_bpy_objects(bpy_scene, "ALL");

        for (var j = 0; j < scene_objs.length; j++) {
            var bpy_obj = scene_objs[j];

            // filter unwanted objects
            if (m_obj.check_bpy_obj_scene_compatibility(bpy_obj, bpy_scene, bpy_data)) {
                if (!bpy_obj._scenes)
                    bpy_obj._scenes = [];
                // NOTE: attach scene data from the primary scene for dynamically loaded objects
                bpy_obj._scenes.push(thread.is_primary ? bpy_scene : _primary_scene);
            }
        }
        prepare_hair_dupli_objects(scene_objs);
    }

    // create bpy cache
    process_bpy_objects_hierarchy(bpy_data, thread);
    
    var bpy_objects = get_bpy_cache(thread.id);
    for (var i = 0; i < bpy_objects.length; i++) {
        var bpy_obj = bpy_objects[i];

        // NOTE: disable parenting to LAMP or CAMERA objects
        if (!thread.is_primary && bpy_obj["parent"] &&
                SECONDARY_LOAD_TYPES_DISABLED.indexOf(bpy_obj["parent"]["type"]) > -1)
            bpy_obj["parent"] = "";

        if (bpy_obj["type"] == "MESH") {
            var mesh = m_reformer.apply_mesh_modifiers(bpy_obj);
            if (mesh) {
                bpy_data["meshes"].push(mesh);
                bpy_obj["data"] = mesh;
            }
        }
    }
}

/**
 * Attach scene links through combining bpy worlds by scene
 */
function prepare_bpy_worlds(bpy_data, thread) {
    // process world by scene
    for (var i = 0; i < bpy_data["scenes"].length; i++) {
        var bpy_scene = bpy_data["scenes"][i];
        var bpy_world = bpy_scene["world"];

        if (!bpy_world._scenes)
            bpy_world._scenes = [];
        bpy_world._scenes.push(thread.is_primary ? bpy_scene : _primary_scene);
    }
}

/**
 * Combine all bpy objects from the scene.
 */
function combine_scene_bpy_objects(bpy_scene, type) {
    if (!type)
        type = "ALL";

    var scene_objs_arr = [];

    // HACK: camera can be linked from another scene or group so append it here
    if (bpy_scene["objects"].indexOf(bpy_scene["camera"]) == -1)
        bpy_scene["objects"].push(bpy_scene["camera"]);

    combine_scene_bpy_objects_iter(bpy_scene["objects"], type, scene_objs_arr);
    return scene_objs_arr;
}

function combine_scene_bpy_objects_iter(bpy_objects, type, dest) {
    // search in dupli groups
    for (var i = 0; i < bpy_objects.length; i++) {
        var bpy_obj = bpy_objects[i];

        if (type == "ALL" || type == bpy_obj["type"])
            dest.push(bpy_obj);

        var dupli_group = bpy_obj["dupli_group"];
        if (dupli_group) {
            var dg_objects = dupli_group["objects"];
            combine_scene_bpy_objects_iter(dg_objects, type, dest);
        }
    }
}

/**
 * Make bpy_obj->bpy_scene links for HAIR dupli objects which aren't reachable 
 * from any scene.
 */
function prepare_hair_dupli_objects(bpy_objects) {
    for (var i = 0; i < bpy_objects.length; i++) {
        var bpy_obj = bpy_objects[i];
        if (bpy_obj._scenes && bpy_obj.type != "WORLD") {
            var psystems = bpy_obj["particle_systems"];
            for (var j = 0; j < psystems.length; j++) {
                var pset = psystems[j]["settings"];

                if (pset["type"] != "HAIR")
                    continue;

                if (pset["render_type"] == "OBJECT") {
                    var dg_obj = pset["dupli_object"];

                    // dg_obj isn't presented on any scene or already processed 
                    // as hair dupli object, don't filter unwanted objects (needless)
                    if (!dg_obj._scenes)
                        dg_obj._scenes = bpy_obj._scenes.slice();

                } else if (pset["render_type"] == "GROUP") {
                    var dg = pset["dupli_group"];
                    for (var k = 0; k < dg["objects"].length; k++) {
                        var dg_obj = dg["objects"][k];
                        if (!dg_obj._scenes)
                            dg_obj._scenes = bpy_obj._scenes.slice();
                    }
                }
            }
        }
    }
}

function prepare_bpy_logic_nodes_objects_params(bpy_data) {
    for (var i = 0; i < bpy_data["scenes"].length; i++) {
        var bpy_scene = bpy_data["scenes"][i];

        if (bpy_scene["b4w_use_logic_editor"]) {
            var scene_objs = combine_scene_bpy_objects(bpy_scene, "ALL");
            var scene_world = bpy_scene["world"];

            m_reformer.assign_logic_nodes_object_params(scene_objs, scene_world, bpy_scene);
        }
    }
}

function prepare_bpy_scenes_audio(bpy_data, thread) {
    for (var i = 0; i < bpy_data["scenes"].length; i++) {
        var scene = bpy_data["scenes"][i];
        var scene_dst = thread.is_primary ? scene : _primary_scene;

        // NOTE: not the fastest way to check speaker existence
        var has_spks = Boolean(get_bpy_cache_scene(thread.id, scene_dst, "SPEAKER").length);

        if (has_spks && !scene_dst._sfx)
            m_sfx.attach_scene_sfx(scene_dst);
    }
}

/**
 * Update all objects hierarchical cache using breadth-first search algorithm.
 * NOTE: do proper cache update to prevent mysterious bugs
 */
function process_bpy_objects_hierarchy(bpy_data, thread) {
    var scenes = bpy_data["scenes"];

    // double hierarchy: groups than parents
    var object_levels = [];

    for (var i = 0; i < scenes.length; i++) {
        var scene_objs = scenes[i]["objects"];
        process_bpy_objects_hierarchy_iter(scene_objs, 0, thread.is_primary,
                object_levels);
    }

    _all_objects_cache[thread.id] = [];

    for (var i = 0; i < object_levels.length; i++) {
        var grp_level = object_levels[i];

        for (var j = 0; j < grp_level.length; j++) {
            var par_level = grp_level[j];

            for (var k = 0; k < par_level.length; k++)
                _all_objects_cache[thread.id].push(par_level[k]);
        }
    }

    // process objects, that aren't reached from scenes
    var particles = bpy_data["particles"];
    for (var i = 0; i < particles.length; i++) {
        var dg_obj = particles[i]["dupli_object"];
        if (dg_obj) {
            dg_obj._is_hair_dupli = true;
            _all_objects_cache[thread.id].push(dg_obj);
        }

        var dg_group = particles[i]["dupli_group"];
        if (dg_group) {
            var objects = dg_group["objects"];
            for (var j = 0; j < objects.length; j++) {
                var dg_obj = objects[j];
                dg_obj._is_hair_dupli = true;
                _all_objects_cache[thread.id].push(dg_obj);
            }
        }
    }
    
    // filter cached orphan objects which don't belong to any scene
    var cache = _all_objects_cache[thread.id];
    for (var i = cache.length - 1; i >= 0; i--)
        if (!cache[i]._scenes)
            cache.splice(i, 1);
}

function process_bpy_objects_hierarchy_iter(bpy_objects, grp_num, is_primary, 
        object_levels) {

    // initialize new group level
    object_levels[grp_num] = object_levels[grp_num] || [];
    var group_level = object_levels[grp_num];

    for (var i = 0; i < bpy_objects.length; i++) {
        var bpy_obj = bpy_objects[i];

        var pnum = parent_num(bpy_obj);

        // initialize new parent level
        group_level[pnum] = group_level[pnum] || [];

        // don't process LAMP and CAMERA objects on secondary load
        if (is_primary || SECONDARY_LOAD_TYPES_DISABLED.indexOf(bpy_obj["type"]) == -1)
            // push unique (other scenes may link to same object)
            if (group_level[pnum].indexOf(bpy_obj) == -1)
                group_level[pnum].push(bpy_obj);

        var dupli_group = bpy_obj["dupli_group"];
        if (dupli_group) {
            var dg_objects = dupli_group["objects"];
            process_bpy_objects_hierarchy_iter(dg_objects, grp_num + 1, 
                    is_primary, object_levels);
        }
    }
}

function get_bpy_cache(data_id) {
    return _all_objects_cache[data_id];
}

function get_bpy_cache_scene(data_id, bpy_scene, obj_type) {
    var bpy_scene_objs = [];

    var bpy_objects = get_bpy_cache(data_id);
    for (var i = 0; i < bpy_objects.length; i++) {
        var bpy_obj = bpy_objects[i];

        if (bpy_obj["type"] == obj_type || obj_type == "ALL")
            for (var j = 0; j < bpy_obj._scenes.length; j++)
                if (bpy_scene == bpy_obj._scenes[j])
                    bpy_scene_objs.push(bpy_obj);
    }

    return bpy_scene_objs;
}

/**
 * Initialize engine objects.
 * We have a bpy_objects <-> objects bijection here so we can use them equally
 */
function process_objects(bpy_data, thread, stage, cb_param, cb_finish,
        cb_set_rate) {

    var bpy_objects = get_bpy_cache(thread.id);
    var bpy_worlds = bpy_data["worlds"];
    create_objects_from_bpy(bpy_data, bpy_objects, thread.id);
    create_world_objects_from_bpy(bpy_data, bpy_worlds, thread.id);
    var objects = m_obj.get_all_objects(thread.id);

    // update new objects (after creating - for making links beetween 
    // objects: parenting, duplication, ...)
    for (var i = 0; i < bpy_objects.length; i++) {
        var bpy_obj = bpy_objects[i];
        var obj = bpy_obj._object;
        m_nla.update_object(bpy_obj, obj);
    }

    for (var i = 0; i < bpy_worlds.length; i++) {
        var bpy_world = bpy_worlds[i];
        var world = bpy_world._object;
        m_nla.update_object(bpy_world, world);
    }

    if (thread.is_primary)
        calc_light_index(bpy_data, thread.id);

    for (var i = 0; i < bpy_objects.length; i++) {
        var bpy_obj = bpy_objects[i];
        var obj = bpy_obj._object;
        if (!obj.is_hair_dupli) {
            m_obj.update_object_relations(bpy_obj, obj);
            m_trans.update_transform(obj);
        }
    }

    prepare_lod_objects(bpy_objects);

    link_skinned_objs(objects);
    calc_max_bones(objects);
    prepare_vehicles(objects);
    prepare_floaters(objects);

    cb_finish(thread, stage);
}

/**
 * Create new b4w objects, append scene data, attach service & hack properties, 
 * update new objects.
 */
function create_objects_from_bpy(bpy_data, bpy_objects, data_id) {
    // create new objects
    for (var i = 0; i < bpy_objects.length; i++) {
        var bpy_obj = bpy_objects[i];
        
        var obj = m_obj_util.create_object(bpy_obj["name"], bpy_obj["type"], 
                bpy_obj["origin_name"]);
        
        for (var j = 0; j < bpy_obj._scenes.length; j++)
            m_obj_util.append_scene_data(obj, bpy_obj._scenes[j]);

        // HACK: tmp reference
        bpy_obj._object = obj;

        m_obj.update_object(bpy_obj, obj);

        obj.render.data_id = data_id;
        obj.is_hair_dupli = bpy_obj._is_hair_dupli || false;
    }
}

/**
 * Create new b4w world objects used in environment animation,
 * append scene data, attach service & hack properties, update new objects.
 */
function create_world_objects_from_bpy(bpy_data, bpy_worlds, data_id) {
    //create new world objects
    for (var i = 0; i < bpy_worlds.length; i++) {
        var bpy_world = bpy_worlds[i];

        var meta_name = "%meta_world%" + bpy_world["name"];
        var world = m_obj_util.create_object(meta_name, "WORLD",
                 meta_name);

        for (var j = 0; j < bpy_world._scenes.length; j++)
            m_obj_util.append_scene_data(world, bpy_world._scenes[j]);

        bpy_world._object = world;

        m_obj.update_world(bpy_world, world);
    }
}

function calc_light_index(bpy_data, data_id) {
    for (var i = 0; i < bpy_data["scenes"].length; i++) {
        var scene = bpy_data["scenes"][i];
        var lamps_counter = 0;
        var scene_objs = m_obj.get_scene_objs(scene, "LAMP", data_id);
        for (var j = 0; j < scene_objs.length; j++) {
            var obj = scene_objs[j];
            var sc_data = m_obj_util.get_scene_data(obj, scene);
            sc_data.light_index = lamps_counter++;
        }
    }
}

/**
 * use bpy objects for appending the scenes and for the batching
 */
function process_scenes(bpy_data, thread, stage, cb_param, cb_finish,
        cb_set_rate) {
    
    create_scene_props(bpy_data);

    for (var i = 0; i < bpy_data["scenes"].length; i++) {

        // NOTE: dynamically loaded objects are considered to be already on the 
        // primary main scene (have different data_id)
        var scene_dst = thread.is_primary ? bpy_data["scenes"][i] : _primary_scene;

        // NOTE: get lamps from the primary scene for dynamically loaded scenes
        var lamps = thread.is_primary 
                ? m_obj.get_scene_objs(scene_dst, "LAMP", thread.id) 
                : m_obj.get_scene_objs(scene_dst, "LAMP", 0);

        var scene_objs = m_obj.get_scene_objs(scene_dst, "ALL", thread.id);

        // var bpy_scene_objs = get_bpy_cache_scene(thread.id, scene_dst, "ALL");
        var bpy_mesh_objs = get_bpy_cache_scene(thread.id, scene_dst, "MESH");
        var bpy_empty_objs = get_bpy_cache_scene(thread.id, scene_dst, "EMPTY");
        var bpy_world_objs = get_bpy_cache_scene(thread.id, scene_dst, "WORLD");

        if (thread.is_primary)
            m_scenes.append_scene(scene_dst, scene_objs, lamps, bpy_mesh_objs, 
                    bpy_empty_objs);

        var has_wind = false;
        for (var j = 0; j < bpy_empty_objs.length; j++) {
            var obj = bpy_empty_objs[j]._object;
            var scenes_data = obj.scenes_data;
            for (var k = 0; k < scenes_data.length; k++) {
                var scene = scenes_data[k].scene;
                var scene_has_wind = m_scenes.update_force_scene(scene, obj);
                if (scene_dst.name == scene.name)
                    has_wind = has_wind || scene_has_wind;
            }
        }
        if (thread.is_primary)
            if (scene_dst._render.water_params && !has_wind)
                m_print.warn("Scene \"" + scene_dst.name + "\" has water but has "
                        + "no wind.");

        // batching
        var metaobjects = [];
        m_scenes.set_active(scene_dst)
        m_batch.generate_main_batches(scene_dst, bpy_mesh_objs, lamps, metaobjects);

        var bpy_line_objs = get_bpy_cache_scene(thread.id, scene_dst, "LINE");
        m_batch.generate_line_batches(scene_dst, bpy_line_objs);

        var scene_graph = m_scenes.get_graph(scene_dst);
        if (thread.is_primary) {
            // generate sky batch
            var sky = scene_dst._render.sky_params;
            var bpy_world = scene_dst["world"];
            if (sky.render_sky || sky.procedural_skydome) {
                var world = bpy_world._object;
                m_batch.append_sky_batch_to_world(scene_dst, sky, world);
                m_batch.create_forked_batches(world, scene_graph, scene_dst);
            }
            m_scenes.generate_auxiliary_batches(scene_dst, scene_graph);
            var wls = scene_dst._render.world_light_set;
            if (wls && wls.use_environment_light)
                m_batch.append_cube_sky_batch_to_world(scene_dst, bpy_world._object);
        }

        //create forked batches
        for (var j = 0; j < bpy_mesh_objs.length; j++)
            m_batch.create_forked_batches(bpy_mesh_objs[j]._object, scene_graph, scene_dst);
        for (var j = 0; j < metaobjects.length; j++) {
            m_batch.create_forked_batches(metaobjects[j], scene_graph, scene_dst);
            m_obj.objects_storage_add(metaobjects[j]);
        }

        // original and meta objects both
        var scene_objs = m_obj.get_scene_objs(scene_dst, "ALL", thread.id);
        m_scenes.assign_scene_data_subs(scene_dst, scene_objs, lamps);

        // update boundings for shape keys objs
        // and props for zup tsrs
        for (var j = 0; j < scene_objs.length; j++) {
            var obj = scene_objs[j];
            if (obj.render.use_shape_keys)
                m_obj.update_boundings(obj);

            if (m_obj_util.check_inv_zup_tsr_is_needed(obj))
                obj.need_inv_zup_tsr = true;
        }
    }

    m_scenes.append_scene_vtex(_primary_scene, bpy_data["textures"], thread.id);

    // creating media controls for some devices only for primary thread
    if (thread.is_primary)
        if (_primary_scene._render.video_textures.length)
            thread.has_video_textures = true;

    // this must be done after the batches generation because textures
    // get "use_node_dds" flag in the "generate_main_batches" function
    setup_dds_loading(bpy_data);

    cb_finish(thread, stage);
}

function create_scene_props(bpy_data) {
    for (var i = 0; i < bpy_data["scenes"].length; i++) {
        var bpy_scene = bpy_data["scenes"][i];
        bpy_scene._camera = bpy_scene["camera"]._object;
    }
}

function drop_bpy_data(bpy_data, thread) {
    for (var i = 0; i < bpy_data["scenes"].length; i++) {
        var bpy_scene = bpy_data["scenes"][i];
        bpy_scene["camera"] = null;
    }
}

function link_skinned_objs(objects) {

    for (var i = 0; i < objects.length; i++) {

        var skinned_obj = objects[i];
        if (skinned_obj.type != "MESH")
            continue;

        var armobj = skinned_obj.armobj;
        if (armobj) {
            var render = armobj.render;
            var skinned_render = skinned_obj.render;
            var bone_skinning_info = skinned_render.bone_skinning_info;
            // construct bone map for deform_bone -> bone indices compliance
            // this structure is needed for optimization
            var mesh_bone_map = [];
            for (var bone_name in bone_skinning_info) {
                var bi = bone_skinning_info[bone_name];
                var bone_index = bi.bone_index;
                var deform_bone_index = bi.deform_bone_index;

                var sk_ind = 4 * deform_bone_index;
                var ind = 4 * bone_index;
                mesh_bone_map.push(sk_ind, ind);
            }
            render.mesh_to_arm_bone_maps.push(mesh_bone_map);
            render.skinned_renders.push(skinned_obj.render);
        }
    }
}

function setup_dds_loading(bpy_data) {

    var materials = bpy_data["materials"];
    // check extension for dds
    if (!(cfg_ldr.dds_available || cfg_ldr.pvr_available) || !cfg_def.use_compression) {
        unset_images_dds(bpy_data["images"]);
        return;
    }

    for (var i = 0; i < materials.length; i++) {

        var material = materials[i];

        // setup dds for non-node materials
        var texture_slots = material["texture_slots"];
        for (var j = 0; j < texture_slots.length; j++) {

            var texture_slot = texture_slots[j];
            var texture = texture_slot["texture"];

            if (texture["type"] != "IMAGE" && texture["type"] != "ENVIRONMENT_MAP")
                continue;

            var image = texture["image"];

            if (image._is_compressed) {
                // it was already marked as dds on previous cycle - so do nothing
            } else if (image["filepath"].indexOf(".dds") > -1) {
                // dds texture was used in blender - so just mark it as dds
                // this is mostly a debug feature, so s3tc ext check is not performed
                image._is_compressed = true;
            } else {
                // check: load texture as usual or as dds; then if needed mark it as dds and adjust filepath
                image._is_compressed = !texture["b4w_disable_compression"] &&
                                !texture_slot["use_map_normal"] &&
                                texture["type"] != "ENVIRONMENT_MAP" &&
                                !texture["b4w_shore_dist_map"] &&
                                image["source"] != "MOVIE";

                if (image._is_compressed) {
                    image._comp_method = cfg_def.compress_format;
                    if (cfg_def.compress_format == "dds")
                        image["filepath"] += ".dds";
                    else
                       image["filepath"] = m_assets.split_extension(image["filepath"])[0] + ".pvr";
               } else
                    image._comp_method = "";
            }
        }

        // setup dds for node materials
        var node_tree = material["node_tree"];
        if (node_tree) {
            var nodes = node_tree["nodes"];

            for (var j = 0; j < nodes.length; j++) {
                var node = nodes[j];

                if (node["type"] == "TEXTURE") {

                    var tex = node["texture"];
                    if (tex) {
                        var image = tex["image"];
                        if (image)
                            if (image._is_compressed) {
                                // it was already marked as dds on previous cycle - so do nothing
                            } else {
                                image._is_compressed = tex._render.allow_node_dds &&
                                                !tex["b4w_disable_compression"] &&
                                                image["source"] != "MOVIE" &&
                                                tex["type"] != "ENVIRONMENT_MAP";

                                if (image._is_compressed) {
                                    image._comp_method = cfg_def.compress_format;
                                    if (cfg_def.compress_format == "dds")
                                        image["filepath"] += ".dds";
                                    else
                                       image["filepath"] = m_assets.split_extension(image["filepath"])[0] + ".pvr";
                               } else
                                    image._comp_method = "";
                            }
                    }
                }
            }
        }
    }
}

function unset_images_dds(images) {
    // mark image as dds only if it was used in blender
    for (var i = 0; i < images.length; i++) {
        var image = images[i];
        var use_dds = Boolean(image["source"] == "FILE" &&
                              image["filepath"].indexOf(".dds") > -1 &&
                              cfg_def.compress_format == ".dds")
        image._is_compressed = use_dds;
    }
}

/**
 * global anisotropic filtering, may be overriden by individual textures
 * use value from the first scene because it's difficult
 * or impossible to assign textures to scenes
 */
function get_global_anisotropic_filtering(bpy_data, thread) {
    if (thread.is_primary)
        return bpy_data["scenes"][0]["b4w_anisotropic_filtering"];
    else
        return _primary_scene["b4w_anisotropic_filtering"];
}

/**
 * Prepare object's groups.
 * remove odd objects (proxy sources)
 * unfold dupli_group objects
 */
function duplicate_objects(bpy_data, thread, stage, cb_param, cb_finish,
        cb_set_rate) {

    var groups = bpy_data["groups"];
    var bpy_objects = bpy_data["objects"];

    // save old objects to find new ones later
    var grp_ids_old = {};
    var obj_ids_old = {};

    var grp_ids = {};
    var obj_ids = {};

    for (var i = 0; i < groups.length; i++) {
        var group = groups[i];
        grp_ids_old[group["uuid"]] = group;
        grp_ids[group["uuid"]] = group;
    }

    for (var i = 0; i < bpy_objects.length; i++) {
        var bpy_obj = bpy_objects[i];
        obj_ids_old[bpy_obj["uuid"]] = bpy_obj;
        obj_ids[bpy_obj["uuid"]] = bpy_obj;
    }

    var scenes = bpy_data["scenes"];

    for (var i = 0; i < scenes.length; i++) {
        var scene = scenes[i];
        duplicate_objects_iter(scene["objects"], null, obj_ids, grp_ids, null);
    }

    for (var id in grp_ids)
        if (!(id in grp_ids_old))
            groups.push(grp_ids[id]);

    for (var id in obj_ids)
        if (!(id in obj_ids_old))
            bpy_objects.push(obj_ids[id]);

    cb_finish(thread, stage);
}

function duplicate_objects_iter(obj_links, origin_obj, obj_ids, grp_ids, cluster_data) {

    var proxy_source_ids = [];

    for (var i = 0; i < obj_links.length; i++) {
        var obj_link = obj_links[i];
        var bpy_obj = obj_ids[obj_link["uuid"]];

        var proxy_link = bpy_obj["proxy"];
        if (proxy_link) {
            // save to purge later
            if (origin_obj &&
                    proxy_source_ids.indexOf(proxy_link["uuid"]) == -1)
                proxy_source_ids.push(proxy_link["uuid"]);

            var proxy = obj_ids[proxy_link["uuid"]];

            // currently blender doesn't preserve constraints for
            // proxy objects, so try to use constraints of proxy source
            var consts = proxy["constraints"];
            for (var j = 0; j < consts.length; j++) {
                var new_cons = m_util.clone_object_json(consts[j]);
                new_cons.name = new_cons.name + "_CLONE";
                bpy_obj["constraints"].push(new_cons);
            }

            // NOTE: handle missing b4w_proxy_inherit_anim as true (temporary)
            if (!("b4w_proxy_inherit_anim" in bpy_obj) ||
                    bpy_obj["b4w_proxy_inherit_anim"]) {
                var anim_data = bpy_obj["animation_data"];
                if (anim_data)
                    proxy["animation_data"] = m_util.clone_object_json(bpy_obj["animation_data"]);

                proxy["b4w_use_default_animation"] = bpy_obj["b4w_use_default_animation"];
                proxy["b4w_auto_skel_anim"] = bpy_obj["b4w_auto_skel_anim"];
                proxy["b4w_anim_behavior"] = bpy_obj["b4w_anim_behavior"];

                // NOTE: deprecated
                proxy["b4w_cyclic_animation"] = bpy_obj["b4w_cyclic_animation"];
            }
        }
    }

    // purge source object links for proxies
    for (var i = 0; i < proxy_source_ids.length; i++) {
        var proxy_src_id = proxy_source_ids[i];

        var obj_index = m_util.get_index_for_key_value(obj_links, "uuid",
                proxy_src_id);
        if (obj_index > -1)
            obj_links.splice(obj_index, 1);
    }

    // for parent/constraint targets
    var obj_id_overrides = {};

    if (origin_obj) {
        for (var i = 0; i < obj_links.length; i++) {
            var obj_link = obj_links[i];
            var bpy_obj = obj_ids[obj_link["uuid"]];

            var bpy_obj_new = m_util.clone_object_json(bpy_obj);
            var name = ("origin_name" in bpy_obj) ? bpy_obj["origin_name"] :
                    bpy_obj["name"];
            bpy_obj_new["name"] = m_obj_util.gen_dupli_name(origin_obj["name"], name);

            bpy_obj_new["origin_name"] = name;
            bpy_obj_new["dg_parent"] = {"uuid" : origin_obj["uuid"]};

            assign_bpy_obj_id(bpy_obj_new);
            obj_ids[bpy_obj_new["uuid"]] = bpy_obj_new;
            obj_id_overrides[obj_link["uuid"]] = bpy_obj_new["uuid"];
            obj_link["uuid"] = bpy_obj_new["uuid"];

            if (cluster_data && cluster_data[bpy_obj["uuid"]])
                bpy_obj_new["b4w_cluster_data"] = cluster_data[bpy_obj["uuid"]];
        }
    }

    for (var i = 0; i < obj_links.length; i++) {
        var obj_link = obj_links[i];
        var bpy_obj = obj_ids[obj_link["uuid"]];

        if (bpy_obj["dupli_group"]) {
            var grp_link = bpy_obj["dupli_group"];
            var grp = grp_ids[grp_link["uuid"]];

            var grp_new = m_util.clone_object_json(grp);
            grp_new["name"] = m_util.unique_name(grp["name"]+"_CLONE");
            assign_grp_id(grp_new);
            grp_ids[grp_new["uuid"]] = grp_new;
            // NOTE: may affect original objects
            // it's seams save for two-level object access
            grp_link["uuid"] = grp_new["uuid"];

            var dg_obj_links = grp_new["objects"];

            duplicate_objects_iter(dg_obj_links, bpy_obj, obj_ids, grp_ids, 
                    bpy_obj["b4w_cluster_data"]);
        }
    }

    // same as non-empty obj_id_overrides
    if (origin_obj) {
        for (var i = 0; i < obj_links.length; i++) {
            var obj_link = obj_links[i];
            var bpy_obj = obj_ids[obj_link["uuid"]];

            if (bpy_obj["parent"] && bpy_obj["parent"]["uuid"] in obj_id_overrides)
                bpy_obj["parent"]["uuid"] = obj_id_overrides[bpy_obj["parent"]["uuid"]];
            else if (bpy_obj["parent"]) {
                m_print.warn("Object's \"" + bpy_obj.name
                     + "\" parent is not in dupli group. Disabling parenting.");
                bpy_obj["parent"] = null;
            }

            var consts = bpy_obj["constraints"];
            for (var j = 0; j < consts.length; j++) {
                var cons = consts[j];

                if (cons["target"] && cons["target"]["uuid"] in obj_id_overrides)
                    cons["target"]["uuid"] = obj_id_overrides[cons["target"]["uuid"]];
            }

            var pose = bpy_obj["pose"];
            if (pose) {
                var pose_bones = pose["bones"];
                for (var j = 0; j < pose_bones.length; j++) {
                    var pose_bone = pose_bones[j];

                    // make links to constraint targets
                    var constraints = pose_bone["constraints"];
                    if (constraints) { // compatibility check
                        for (var k = 0; k < constraints.length; k++) {
                            var cons = constraints[k];

                            if (cons["target"] && cons["target"]["uuid"] in obj_id_overrides)
                                cons["target"]["uuid"] = obj_id_overrides[cons["target"]["uuid"]];
                        }
                    }
                }
            }

            var mods = bpy_obj["modifiers"];
            for (var j = 0; j < mods.length; j++) {
                var mod = mods[j];

                if (mod["object"] && (mod["object"]["uuid"] in obj_id_overrides))
                    mod["object"]["uuid"] = obj_id_overrides[mod["object"]["uuid"]];
            }

            var lods = bpy_obj["lod_levels"];

            if (lods && lods.length) {
                for (var j = 0; j < lods.length; j++) {
                    var lod = lods[j];

                    if (lod["object"] && lod["object"]["uuid"] in obj_id_overrides)
                        lod["object"]["uuid"] = obj_id_overrides[lod["object"]["uuid"]];
                }
            }
        }
    }
    for (var key in obj_id_overrides)
        _dupli_obj_id_overrides[key] = obj_id_overrides[key];
}

function assign_bpy_obj_id(bpy_obj) {
    bpy_obj["uuid"] = m_md5.hexdigest("Object" + bpy_obj["name"]);
}

function assign_grp_id(grp) {
    grp["uuid"] = m_md5.hexdigest("Group" + grp["name"]);
}


/**
 * Make links for bpy_data.
 * executed before compatibility checks from check_bpy_data()
 */
function make_bpy_links(bpy_data) {

    var cameras     = bpy_data["cameras"];
    var groups      = bpy_data["groups"];
    var materials   = bpy_data["materials"];
    var meshes      = bpy_data["meshes"];
    var node_groups = bpy_data["node_groups"];
    var objects     = bpy_data["objects"];
    var particles   = bpy_data["particles"];
    var scenes      = bpy_data["scenes"];
    var speakers    = bpy_data["speakers"];
    var lamps       = bpy_data["lamps"];
    var textures    = bpy_data["textures"];
    var worlds      = bpy_data["worlds"];

    // NOTE: Temporary check. Can't do it in reformer.
    if (!node_groups) {
        m_print.warn("\"node_groups\" datablock undefined. reexport main scene.");
        node_groups = bpy_data["node_groups"] = [];
    }

    var storage = gen_datablocks_storage(bpy_data);

    // make links from scenes to their objects
    for (var i = 0; i < scenes.length; i++) {
        var scene = scenes[i];

        var scene_objects = scene["objects"]; // names and libs
        for (var j = 0; j < scene_objects.length; j++)
            make_link_uuid(scene_objects, j, storage);

        if (scene["camera"])
            make_link_uuid(scene, "camera", storage);

        if (scene["world"])
            make_link_uuid(scene, "world", storage);
    }

    // make links from groups to their objects
    for (var i = 0; i < groups.length; i++) {
        var group = groups[i];

        var group_objects = group["objects"]; // names and libs
        for (var j = 0; j < group_objects.length; j++)
            make_link_uuid(group_objects, j, storage);
    }

    /*
     * OBJECTS
     * make links from objects to their data (meshes, lamps, cameras)
     * and to groups if any
     */
    for (var i = 0; i < objects.length; i++) {
        var bpy_obj = objects[i];

        if (bpy_obj["dupli_group"])
            make_link_uuid(bpy_obj, "dupli_group", storage);

        if (bpy_obj["parent"])
            make_link_uuid(bpy_obj, "parent", storage);

        if (bpy_obj["dg_parent"])
            make_link_uuid(bpy_obj, "dg_parent", storage);

        if (bpy_obj["animation_data"]) {
            var adata = bpy_obj["animation_data"];
            if (adata["action"])
                make_link_uuid(adata, "action", storage);

            if (adata["nla_tracks"])
                for (var j = 0; j < adata["nla_tracks"].length; j++) {
                    var track = adata["nla_tracks"][j];

                    for (var k = 0; k < track["strips"].length; k++)
                        if (track["strips"][k]["action"])
                            make_link_uuid(track["strips"][k], "action", storage);
                }
        }

        switch (bpy_obj["type"]) {
        case "MESH":

            if (!bpy_obj["data"])
                m_util.panic("mesh not found for object " + bpy_obj["name"]);

            make_link_uuid(bpy_obj, "data", storage);

            var found_armat_mod = false;

            // also make links for armature/curve modifiers
            var modifiers = bpy_obj["modifiers"];
            for (var j = 0; j < modifiers.length; j++) {
                var modifier = modifiers[j];

                if (modifier["type"] == "ARMATURE") {

                    if (found_armat_mod)
                        m_print.warn("Object \"" + bpy_obj["name"] + "\" has more " +
                            "than one armature modifiers. Only the first one will be used.");

                    found_armat_mod = true;
                    make_link_uuid(modifier, "object", storage);
                } else if (modifier["type"] == "CURVE")
                    make_link_uuid(modifier, "object", storage);
            }

            // also make links for possible particle systems
            var psystems = bpy_obj["particle_systems"];
            if (psystems) {
                for (var j = 0; j < psystems.length; j++) {
                    var psys = psystems[j];
                    make_link_uuid(psys, "settings", storage);
                }
            }
            break;

        case "ARMATURE":
            make_link_uuid(bpy_obj, "data", storage);

            // also make links from pose bones to armature bones
            var pose = bpy_obj["pose"];
            var pose_bones = pose["bones"];
            var armature = bpy_obj["data"];
            var armature_bones = armature["bones"];
            for (var j = 0; j < pose_bones.length; j++) {
                var pose_bone = pose_bones[j];
                var bone_index = pose_bone["bone"];
                var armature_bone = armature_bones[bone_index];
                pose_bone["bone"] = armature_bone;

                // make links to constraint targets
                var constraints = pose_bone["constraints"];
                if (constraints) { // compatibility check
                    for (var k = 0; k < constraints.length; k++) {
                        var cons = constraints[k];
                        if (cons["target"])
                            make_link_uuid(cons, "target", storage);
                    }
                }

                // also make links between children and parents
                var parent_recursive = pose_bone["parent_recursive"];
                for (var k = 0; k < parent_recursive.length; k++) {
                    var parent_index = parent_recursive[k];
                    parent_recursive[k] = pose_bones[parent_index];
                }
            }
            break;

        case "LAMP":
        case "CAMERA":
        case "SPEAKER":
        case "CURVE":
            make_link_uuid(bpy_obj, "data", storage);
            break;
        case "EMPTY":
        default:
            break;
        }

        // make links to constraint targets
        var constraints = bpy_obj["constraints"];
        if (constraints) { // compatibility check
            for (var j = 0; j < constraints.length; j++) {
                var cons = constraints[j];
                if (cons["target"])
                    make_link_uuid(cons, "target", storage);
            }
        }

        // make links to lods
        var lods = bpy_obj["lod_levels"];
        if (lods) { // compatibility check
            for (var j = 0; j < lods.length; j++) {
                var lod = lods[j];
                if (lod["object"])
                    make_link_uuid(lod, "object", storage);
            }
        }
    }

    /*
     * MESHES
     * make links from meshes to materials used by them
     */
    for (var i = 0; i < meshes.length; i++) {
        var mesh = meshes[i];

        var mesh_materials = mesh["materials"];
        for (var j = 0; j < mesh_materials.length; j++)
            make_link_uuid(mesh_materials, j, storage);
    }

    /*
     * MATERIALS
     * make links from materials to textures used by them
     */
    for (var i = 0; i < materials.length; i++) {
        var material = materials[i];

        var texture_slots = material["texture_slots"];
        for (var j = 0; j < texture_slots.length; j++) {
            make_link_uuid(texture_slots[j], "texture", storage);
        }

        // also make links for node-based materials
        // currently MATERIAL nodes are supported
        var node_tree = material["node_tree"];
        if (!node_tree)
            continue;

        process_node_tree(node_tree, storage);
    }

    /*
     * NODE GROUPS
     * make links from node groups
     */
    for (var i = 0; i < node_groups.length; i++) {
        var node_group = node_groups[i];

        var node_tree = node_group["node_tree"];
        if (!node_tree)
            continue;

        process_node_tree(node_tree, storage);
    }

    /*
     * TEXTURES
     * make links from textures to their images
     */
    for (var i = 0; i < textures.length; i++) {
        var texture = textures[i];

        var tex_type = texture["type"];
        if (tex_type == "IMAGE" || tex_type == "ENVIRONMENT_MAP")
            make_link_uuid(texture, "image", storage);
    }

    /*
     * CAMERAS
     */
    for (var i = 0; i < cameras.length; i++) {
        var camera = cameras[i];
        if (camera["dof_object"])
            make_link_uuid(camera, "dof_object", storage);
    }

    /*
     * SPEAKERS
     */
    // make links from speakers to their sounds
    for (var i = 0; i < speakers.length; i++) {
        var speaker = speakers[i];

        // NOTE: temporary compatibility check: allow speakers without sound
        // can change to unconditional linking
        if (speaker["sound"])
            make_link_uuid(speaker, "sound", storage);

        if (speaker["animation_data"]) {
            var adata = speaker["animation_data"];

            if (adata["action"])
                make_link_uuid(adata, "action", storage);

            if (adata["nla_tracks"])
                for (var j = 0; j < adata["nla_tracks"].length; j++) {
                    var track = adata["nla_tracks"][j];

                    for (var k = 0; k < track["strips"].length; k++)
                        if (track["strips"][k]["action"])
                            make_link_uuid(track["strips"][k], "action", storage);
                }
        }
    }

    /*
     * PARTICLES
     * make links from particles'es texture slots to textures
     */
    for (var i = 0; i < particles.length; i++) {
        var part = particles[i];

        var texture_slots = part["texture_slots"];
        for (var j = 0; j < texture_slots.length; j++)
            make_link_uuid(texture_slots[j], "texture", storage);

        if (part["dupli_group"])
            make_link_uuid(part, "dupli_group", storage);

        if (part["dupli_object"])
            make_link_uuid(part, "dupli_object", storage);
    }

    for (var i = 0; i < lamps.length; i++) {
        var lamp = lamps[i];
        if (lamp["animation_data"]) {
            var adata = lamp["animation_data"];

            if (adata["action"])
                make_link_uuid(adata, "action", storage);

            if (adata["nla_tracks"])
                for (var j = 0; j < adata["nla_tracks"].length; j++) {
                    var track = adata["nla_tracks"][j];

                    for (var k = 0; k < track["strips"].length; k++)
                        if (track["strips"][k]["action"])
                            make_link_uuid(track["strips"][k], "action", storage);
                }
        }
    }

    /*
     * WORLDS
     * make links from world.texture_slots to texture used by them
     */
    for (var i = 0; i < worlds.length; i++) {
        var world = worlds[i];

        var texture_slots = world["texture_slots"];
        if (texture_slots)
            for (var j = 0; j < texture_slots.length; j++) {
                make_link_uuid(texture_slots[j], "texture", storage);
            }

        if (world["animation_data"]) {
            var adata = world["animation_data"];
            if (adata["action"])
                make_link_uuid(adata, "action", storage);

            if (adata["nla_tracks"])
                for (var j = 0; j < adata["nla_tracks"].length; j++) {
                    var track = adata["nla_tracks"][j];

                    for (var k = 0; k < track["strips"].length; k++)
                        if (track["strips"][k]["action"])
                            make_link_uuid(track["strips"][k], "action", storage);
                }
        }
    }
}

function process_node_tree(node_tree, storage) {
    var nodes = node_tree["nodes"];
    for (var j = 0; j < nodes.length; j++) {
        var node = nodes[j];

        if (node["type"] == "TEXTURE" && node["texture"])
            make_link_uuid(node, "texture", storage);

        if (node["type"] == "LAMP" && node["lamp"]) {
            if (node["lamp"]["uuid"] in _dupli_obj_id_overrides)
                node["lamp"]["uuid"] = _dupli_obj_id_overrides[node["lamp"]["uuid"]];
            if (!storage[node["lamp"]["uuid"]])
                node["lamp"] = null;
        }

        // NOTE: Check node["node_group"] for compatibility with older scenes
        if (node["type"] == "GROUP" && node["node_group"])
            make_link_uuid(node, "node_group", storage);
    }

    var links = node_tree["links"];
    for (var j = 0; j < links.length; j++) {
        var link = links[j];
        make_link_name(link, "from_node", nodes);
        make_link_name(link, "to_node", nodes);

        make_link_ident(link, "from_socket", link["from_node"]["outputs"]);
        make_link_ident(link, "to_socket", link["to_node"]["inputs"]);
    }

    var adata = node_tree["animation_data"];
    if (adata) {

        if (adata["action"])
            make_link_uuid(adata, "action", storage);

        if (adata["nla_tracks"])
            for (var j = 0; j < adata["nla_tracks"].length; j++) {
                var track = adata["nla_tracks"][j];

                for (var k = 0; k < track["strips"].length; k++)
                    if (track["strips"][k]["action"])
                        make_link_uuid(track["strips"][k], "action", storage);
            }
    }
}

function gen_datablocks_storage(bpy_data) {

    var DB_NAMES = [
        "actions",
        "armatures",
        "cameras",
        "curves",
        "groups",
        "images",
        "lamps",
        "materials",
        "meshes",
        "node_groups",
        "objects",
        "particles",
        "scenes",
        "sounds",
        "speakers",
        "textures",
        "worlds"
    ];

    var storage = {};

    for (var i = 0; i < DB_NAMES.length; i++) {
        var db_arr = bpy_data[DB_NAMES[i]];

        for (var j = 0; j < db_arr.length; j++) {
            var db = db_arr[j];
            storage[db["uuid"]] = db;
        }
    }

    return storage;
}

function make_link_uuid(storage, prop, uuid_storage) {
    var entity_new = uuid_storage[storage[prop]["uuid"]];
    if (!entity_new)
        m_print.error("Dangling link found:", prop, storage);
    storage[prop] = entity_new;
}

function make_link_name(storage, property, search_here) {
    var entity_old = storage[property];
    var entity_new = m_util.keysearch("name", entity_old["name"], search_here);

    storage[property] = entity_new;
}

function make_link_ident(storage, property, search_here) {
    var entity_old = storage[property];
    var entity_new = m_util.keysearch("identifier", entity_old["identifier"],
            search_here);

    storage[property] = entity_new;
}

function copy_link(from, to) {
    for (var prop in from)
        // don't replace existing properties
        if (!(prop in to))
            to[prop] = from[prop];
}

function load_textures(bpy_data, thread, stage, cb_param, cb_finish, cb_set_rate) {
    var dir_path = dirname(thread.filepath);

    var images = bpy_data["images"];
    var img_by_uri = {};
    var image_assets = [];

    for (var i = 0; i < images.length; i++) {
        var image = images[i];
        var uuid = image["uuid"];

        if (image["source"] === "FILE" || image["source"] === "MOVIE") {

            var tex_users = find_image_users(image, bpy_data["textures"]);

            if (!tex_users.length) {
                m_print.warn("image ", image["name"], " has no users.");
                continue;
            }

            if (tex_users[0]["b4w_shore_dist_map"])
                continue;

            var image_path = m_util.normpath_preserve_protocol(dir_path + 
                    image["filepath"]);

            if (image["source"] === "FILE") {
                if (image._is_compressed)
                    var asset_type = m_assets.AT_ARRAYBUFFER;
                else
                    var asset_type = m_assets.AT_IMAGE_ELEMENT;

                var head_ext = m_assets.split_extension(image_path);
                var path_ext_low = head_ext[1].toLowerCase();

                if (!m_assets.check_image_extension(path_ext_low)) {
                    m_print.error("image ", image["name"], " has unsupported format.");
                    continue;
                }

                if (cfg_ldr.min50_available && cfg_def.use_min50) {
                    if (head_ext[1] == "dds") {
                        var head_ext_wo_dds = m_assets.split_extension(head_ext[0]);
                        image_path = head_ext_wo_dds[0] + ".min50." +
                            head_ext_wo_dds[1] + ".dds";
                    } else
                        image_path = head_ext[0] + ".min50." + head_ext[1];
                }
            } else if (image["source"] === "MOVIE") {
                if (!cfg_def.seq_video_fallback) {
                    var head_ext = m_assets.split_extension(image_path);
                    var path_ext_low = head_ext[1].toLowerCase();
                    var ext = m_sfx.detect_video_container(path_ext_low);

                    if (ext == "") {
                        m_print.error("failed to load video file (unsupported format)", image_path);
                        continue;
                    }

                    if (ext != path_ext_low)
                        image_path = head_ext[0] +".altconv." + ext;
                    else
                        image_path = head_ext[0] +"." + head_ext[1];
                    var asset_type = m_assets.AT_VIDEO_ELEMENT;
                } else {
                    var head_ext = m_assets.split_extension(image_path);
                    image_path = head_ext[0] +".altconv.seq";
                    var asset_type = m_assets.AT_SEQ_VIDEO_ELEMENT;
                }
            }

            image_assets.push({id:uuid, type:asset_type, url:image_path});
            img_by_uri[uuid] = image;
        }
    }

    if (image_assets.length) {
        var image_counter = 0;
        var asset_cb = function(image_data, uri, type, path) {
            // process only loaded images
            if (image_data) {
                var show_path_warning = true;
                var image = img_by_uri[uri];
                if (type == m_assets.AT_VIDEO_ELEMENT 
                        || type == m_assets.AT_SEQ_VIDEO_ELEMENT)
                    print_video_info(image_data, path, show_path_warning, type);
                else print_image_info(image_data, path, show_path_warning, image._comp_method);

                var tex_users = find_image_users(image, bpy_data["textures"]);

                for (var i = 0; i < tex_users.length; i++) {
                    var tex_user = tex_users[i];
                    var filepath = tex_user["image"]["filepath"];
                    if (type == m_assets.AT_SEQ_VIDEO_ELEMENT) {
                        tex_user._render.seq_fps = image_data.fps;
                        m_tex.update_texture(tex_user._render, image_data.images,
                                "", filepath, thread.id);
                    } else {
                        m_tex.update_texture(tex_user._render, image_data,
                                image._comp_method, filepath, thread.id);
                        if (tex_user._render.source == "ENVIRONMENT_MAP")
                            for (var j = 0; j < bpy_data["scenes"].length; j++)
                                m_scenes.update_world_texture(bpy_data["scenes"][j]);
                    }
                }
            }

            var rate = ++image_counter / image_assets.length;
            cb_set_rate(thread, stage, rate);
        }
        var pack_cb = function() {
            m_print.log("%cLOADED ALL IMAGES", "color: #0a0");

            cb_finish(thread, stage);
        }

        m_assets.enqueue(image_assets, asset_cb, pack_cb);
    } else
        cb_finish(thread, stage);
}

function update_scenes_nla(bpy_data, thread, stage, cb_param, cb_finish, cb_set_rate) {
    var scenes = m_scenes.get_rendered_scenes();
    for (var i = 0; i < scenes.length; i++) {
        var scene = scenes[i];
        if (scene["b4w_use_nla"]) {
            var nla_cyclic = scene["b4w_nla_cyclic"];
            if (scene["b4w_use_logic_editor"])
                nla_cyclic = false;
            m_nla.update_scene(scene, nla_cyclic, thread.id);
        }
    }
    cb_finish(thread, stage);
}

/**
 * Find textures
 */
function find_image_users(image, textures) {

    var tex_image_users = [];

    for (var i = 0; i < textures.length; i++) {
        var tex = textures[i];
        if (tex["image"] === image)
            tex_image_users.push(tex);
    }

    return tex_image_users;
}

function load_speakers(bpy_data, thread, stage, cb_param, cb_finish, cb_set_rate) {
    var dir_path = dirname(thread.filepath);

    var sound_assets = [];
    var spks_by_uuid = {};

    var objects = m_obj.get_all_objects(thread.id);
    for (var i = 0; i < objects.length; i++) {
        var obj = objects[i];

        if (is_loaded_spk(obj)) {
            var uuid = obj.sfx.uuid;
            // BACKGROUND_MUSIC speaker needs a unique resource (unique uuid)
            if (m_sfx.get_spk_behavior(obj) == "BACKGROUND_MUSIC") {
                uuid = m_util.gen_uuid();
                thread.has_background_music = true;
            } else if (m_sfx.get_spk_behavior(obj) != "NONE" && cfg_def.init_wa_context_hack)
                thread.init_wa_context = true;

            if (!(uuid in spks_by_uuid)) {
                spks_by_uuid[uuid] = [];

                var sound_path = m_util.normpath_preserve_protocol(
                        dir_path + obj.sfx.filepath);

                switch (m_sfx.source_type(obj)) {
                case m_sfx.AST_ARRAY_BUFFER:
                    var asset_type = m_assets.AT_AUDIOBUFFER;
                    break;
                case m_sfx.AST_HTML_ELEMENT:
                    var asset_type = m_assets.AT_AUDIO_ELEMENT;
                    break;
                }

                var head_ext = m_assets.split_extension(sound_path);
                var path_ext_low = head_ext[1].toLowerCase();
                var ext = m_sfx.detect_audio_container(path_ext_low);

                if (ext != "") {
                    if (ext != path_ext_low)
                        sound_path = head_ext[0] +".altconv." + ext;
                    else
                        sound_path = head_ext[0] +"." + head_ext[1];

                    sound_assets.push({id:uuid, type:asset_type, url:sound_path});
                }
                else
                    m_print.error("failed to load audio file (unsupported format)", sound_path);
            }
            spks_by_uuid[uuid].push(obj);
        }
    }

    if (sound_assets.length) {
        var sound_counter = 0;
        var asset_cb = function(sound_data, uuid, type, path) {

            // process only loaded sounds
            if (sound_data) {
                m_print.log("%cLOAD SOUND", "color: #0aa", path);

                if (path.indexOf(_debug_resources_root) == -1)
                    m_print.warn("sound", path, "is not from app root.");

                var spk_objs = spks_by_uuid[uuid];
                for (var i = 0; i < spk_objs.length; i++)
                    m_sfx.update_spkobj(spk_objs[i], sound_data);
            }

            var rate = ++sound_counter / sound_assets.length;
            cb_set_rate(thread, stage, rate);
        }
        var pack_cb = function() {
            m_print.log("%cLOADED ALL SOUNDS", "color: #0aa");
            cb_finish(thread, stage);
        }

        m_assets.enqueue(sound_assets, asset_cb, pack_cb);

    } else
        cb_finish(thread, stage);

}

function is_loaded_spk(obj) {
    return m_obj_util.is_speaker(obj) && m_sfx.source_type(obj) != m_sfx.AST_NONE;
}

function speakers_play(scene, data_id, force_init) {
    var spk_objs = m_obj.get_scene_objs(scene, "SPEAKER", data_id);
    for (var i = 0; i < spk_objs.length; i++) {
        var sobj = spk_objs[i];

        if (!m_obj_util.is_speaker(sobj))
            continue;

        // NOTE: autostart or init for mobile devices
        if (m_sfx.is_autoplay(sobj) || force_init)
            m_sfx.play_def(sobj);
    }
}

function video_play(scene, data_id) {
    var textures = scene._render.video_textures;
    for (var i = 0; i < textures.length; i++) {
        var vtex = textures[i]._render;
        if (scene["b4w_use_nla"] && textures[i]["b4w_nla_video"] 
                || !textures[i]["use_auto_refresh"])
            continue;

        if (data_id != vtex.vtex_data_id)
            continue;

        m_tex.reset_video(vtex.name, data_id);
        m_tex.play_video(vtex.name, data_id);
    }
}

function start_nla(bpy_data, thread, stage, cb_param, cb_finish, cb_set_rate) {
    m_nla.start();
    m_print.log("%cSTART NLA", "color: #0a0");
    cb_finish(thread, stage);
}


/**
 * Create special materials
 */
function create_special_materials(bpy_data) {

    var materials = bpy_data["materials"];

    var default_material = m_reformer.create_material("DEFAULT");
    materials.push(default_material);
}

/**
 * Assign default material for meshes with empty materials
 */
function assign_default_material(bpy_data) {

    var meshes = bpy_data["meshes"];
    var def_mat = m_util.keysearch("name", "DEFAULT", bpy_data["materials"]);

    for (var i = 0; i < meshes.length; i++) {
        var mesh = meshes[i];

        if (mesh["materials"].length == 0)
            mesh["materials"].push(def_mat);
    }
}

function prepare_bpy_actions(actions, data_id) {
    for (var i = 0; i < actions.length; i++) {
        var action = actions[i];
        action._data_id = data_id;
        m_anim.append_action(action);
    }
}

/**
 * Prepare LODs
 *      find objects with LODs, also check proxies
 *      make copy of lod objects
 *      remove old lod objects
 *      add new lod objects to scene/group
 */
function prepare_bpy_lods(bpy_data) {

    var scenes = bpy_data["scenes"];

    for (var i = 0; i < scenes.length; i++) {
        var scene = scenes[i];

        // array of [container, object] pairs
        var added_objs = [];
        // array of objects
        var removed_objs = [];

        var scene_objs = scenes[i]["objects"];

        for (var j = 0; j < scene_objs.length; j++) {
            var bpy_obj = scene_objs[j];
            prepare_bpy_obj_lods(scene_objs, bpy_obj, null, added_objs,
                    removed_objs);

            var dupli_group = bpy_obj["dupli_group"];
            if (dupli_group) {
                var dg_objects = dupli_group["objects"];

                for (var k = 0; k < dg_objects.length; k++) {
                    var dg_obj = dg_objects[k];

                    prepare_bpy_obj_lods(dg_objects, dg_obj, bpy_obj,
                            added_objs, removed_objs);
                }
            }
        }

        for (var j = 0; j < removed_objs.length; j++)
            remove_bpy_object(removed_objs[j], [scene]);

        for (var j = 0; j < added_objs.length; j++)
            m_util.append_unique(added_objs[j][0], added_objs[j][1]);
    }
}

function prepare_bpy_obj_lods(container, lod_parent_bpy, dg_parent_bpy, added_objs, removed_objs) {

    if (!(lod_parent_bpy["lod_levels"] && lod_parent_bpy["lod_levels"].length))
        return;

    var lods_num = lod_parent_bpy["lod_levels"].length;

    for (var i = 0; i < lods_num; i++) {
        var lod = lod_parent_bpy["lod_levels"][i];
        var lod_obj = lod["object"];

        if (!lod_obj)
            continue;

        var lod_obj_new = m_util.clone_object_nr(lod_obj);

        lod_obj_new["name"] = lod_parent_bpy["name"] + "_LOD_" +
                String(i + 1);

        lod_obj_new["b4w_cluster_data"] = lod_parent_bpy["b4w_cluster_data"];

        assign_bpy_obj_id(lod_obj_new);

        lod_obj_new["lod_levels"] = [];

        if (dg_parent_bpy)
            lod_obj_new["dg_parent"] = dg_parent_bpy;

        added_objs.push([container, lod_obj_new]);
        removed_objs.push(lod_obj);

        lod["object"] = lod_obj_new;
    }
}

/**
 * Calculate upper limit for number of bones used in vertex shader
 * to minimize shader variations
 */
function calc_max_bones(objects) {

    var upper_max_bones = -1;
    var blending_max_bones = -1;

    var gl_max_bones = m_anim.get_max_bones();

    // calc
    for (var i = 0; i < objects.length; i++) {
        var obj = objects[i];
        var render = obj.render;

        if (!(m_obj_util.is_mesh(obj) && render.is_skinning))
            continue;

        var max_bones = render.max_bones;

        if (max_bones > upper_max_bones)
            upper_max_bones = max_bones;

        if (gl_max_bones >= max_bones && max_bones > blending_max_bones)
            blending_max_bones = max_bones;

    }

    // assign
    for (var i = 0; i < objects.length; i++) {
        var obj = objects[i];
        var render = obj.render;

        if (!(m_obj_util.is_mesh(obj) && render.is_skinning))
            continue;

        render.frames_blending = true;

        if (upper_max_bones < gl_max_bones)
            render.max_bones = upper_max_bones;
        else if (render.max_bones <= gl_max_bones)
            render.max_bones = blending_max_bones;
        else {
            m_print.warn("too many bones for \"" + obj.name + "\" / " +
                render.max_bones + " bones (max " + gl_max_bones +
                " with blending, " + 2 * gl_max_bones + " without blending)." 
                + " Blending between frames will be disabled.");
            render.max_bones = upper_max_bones;
            render.frames_blending = false;
        }
        render.frames_blending = render.frames_blending
                && !cfg_anim.frames_blending_hack;
    }
}

function prepare_lod_objects(bpy_objects) {

    for (var i = 0; i < bpy_objects.length; i++) {
        var bpy_obj = bpy_objects[i];
        var obj = bpy_obj._object;

        if (!m_obj_util.is_mesh(obj))
            continue;

        var lods_num = bpy_obj["lod_levels"].length;

        if (!lods_num)
            continue;

        var prev_lod_obj = obj;

        for (var j = 0; j < lods_num; j++) {
            var bpy_lod_obj = bpy_obj["lod_levels"][j]["object"];

            if (bpy_lod_obj) {
                var lod_obj = bpy_lod_obj._object;
                // inherit transition ratio from the first LOD
                lod_obj.render.lod_transition_ratio = obj.render.lod_transition_ratio;

                prev_lod_obj.render.lod_dist_max = bpy_obj["lod_levels"][j]["distance"];
                lod_obj.render.lod_dist_min = bpy_obj["lod_levels"][j]["distance"];

                if (bpy_obj["lod_levels"][j + 1])
                    lod_obj.render.lod_dist_max = bpy_obj["lod_levels"][j + 1]["distance"];
                else {
                    lod_obj.render.last_lod = true;
                    lod_obj.render.lod_dist_max = m_obj_util.LOD_DIST_MAX_INFINITY;
                    break;
                }

                prev_lod_obj.render.last_lod = false;

                prev_lod_obj = lod_obj;
            } else {
                prev_lod_obj.render.last_lod = true;
                prev_lod_obj.render.lod_dist_max = bpy_obj["lod_levels"][j]["distance"];
                break;
            }
        }

        if (DEBUG_LOD_DIST_NOT_SET &&
                bpy_obj["lod_levels"][lods_num - 1]["distance"] === m_obj_util.LOD_DIST_MAX_INFINITY)
            m_print.warn("object \"" + obj.name + "\" has default LOD distance.");
    }
}

function prepare_vehicles(objects) {

    for (var i = 0; i < objects.length; i++) {
        var obj_i = objects[i];


        if (!obj_i.is_vehicle)
            continue;

        var vh_set_i = obj_i.vehicle_settings;

        if (vh_set_i.part == "CHASSIS") {

            obj_i.vehicle = {};

            obj_i.vehicle.force_max = vh_set_i.force_max;
            obj_i.vehicle.brake_max = vh_set_i.brake_max;
            obj_i.vehicle.suspension_compression = vh_set_i.suspension_compression;
            obj_i.vehicle.suspension_stiffness = vh_set_i.suspension_stiffness;
            obj_i.vehicle.suspension_damping = vh_set_i.suspension_damping;
            obj_i.vehicle.wheel_friction = vh_set_i.wheel_friction;
            obj_i.vehicle.roll_influence = vh_set_i.roll_influence;
            obj_i.vehicle.max_suspension_travel_cm = vh_set_i.max_suspension_travel_cm;
            obj_i.vehicle.engine_force = 0;
            obj_i.vehicle.brake_force = 1;
            obj_i.vehicle.steering = 0;
            obj_i.vehicle.speed = 0;

            // links to wheel objects
            obj_i.vehicle.props = [];
            obj_i.vehicle.prop_offsets = [];
            obj_i.vehicle.steering_wheel = null;

            // check dupli groups for car objects
            var dg_parent = m_obj_util.get_dg_parent(obj_i);
            if (dg_parent)
                // NOTE: not the smartest way to do it
                var car_objects = m_obj_util.get_dg_objects(dg_parent, objects);
            else
                var car_objects = objects;

            for (var j = 0; j < car_objects.length; j++) {
                var obj_j = car_objects[j];

                if (!obj_j.is_vehicle)
                    continue;

                var vh_set_j = obj_j.vehicle_settings;

                if (m_phy.is_car_wheel(obj_j) && vh_set_i.name == vh_set_j.name) {
                    var w_index = m_phy.wheel_index(obj_j.vehicle_settings.part);
                    obj_i.vehicle.props[w_index] = obj_j;

                    obj_i.vehicle.prop_offsets[w_index] = new Float32Array(8);

                } else if (m_phy.is_vehicle_steering_wheel(obj_j) && vh_set_i.name == vh_set_j.name) {
                    obj_i.vehicle.steering_wheel = obj_j;

                    obj_i.vehicle.steering_max = vh_set_j.steering_max;
                    obj_i.vehicle.steering_ratio = vh_set_j.steering_ratio;
                    obj_i.vehicle.inverse_control = vh_set_j.inverse_control;

                    var wtsr_inv = m_tsr.invert(obj_i.render.world_tsr,
                            m_tsr.create())
                    var steering_wheel_tsr = m_tsr.multiply(wtsr_inv,
                            obj_j.render.world_tsr, wtsr_inv);
                    obj_i.vehicle.steering_wheel_tsr = steering_wheel_tsr;

                    var steering_wheel_axis = new Float32Array([1,0,0]);
                    m_tsr.transform_dir_vec3(steering_wheel_axis, steering_wheel_tsr,
                            steering_wheel_axis);
                    obj_i.vehicle.steering_wheel_axis = steering_wheel_axis;
                } else if (m_phy.is_vehicle_speedometer(obj_j) && vh_set_i.name == vh_set_j.name) {
                    obj_i.vehicle.speedometer = obj_j;

                    obj_i.vehicle.speed_ratio = vh_set_j.speed_ratio;
                    obj_i.vehicle.max_speed_angle = vh_set_j.max_speed_angle;

                    var wtsr_inv = m_tsr.invert(obj_i.render.world_tsr,
                            m_tsr.create())
                    var speedometer_tsr = m_tsr.multiply(wtsr_inv,
                            obj_j.render.world_tsr, wtsr_inv);
                    obj_i.vehicle.speedometer_tsr = speedometer_tsr;

                    var speedometer_axis = new Float32Array([1,0,0]);
                    m_tsr.transform_dir_vec3(speedometer_axis, speedometer_tsr,
                            speedometer_axis);
                    obj_i.vehicle.speedometer_axis = speedometer_axis;
                } else if (m_phy.is_vehicle_tachometer(obj_j) && vh_set_i.name == vh_set_j.name) {
                    obj_i.vehicle.tachometer = obj_j;

                    obj_i.vehicle.delta_tach_angle = vh_set_j.delta_tach_angle;

                    var wtsr_inv = m_tsr.invert(obj_i.render.world_tsr,
                            m_tsr.create())
                    var tachometer_tsr = m_tsr.multiply(wtsr_inv,
                            obj_j.render.world_tsr, wtsr_inv);
                    obj_i.vehicle.tachometer_tsr = tachometer_tsr;

                    var tachometer_axis = new Float32Array([1,0,0]);
                    m_tsr.transform_dir_vec3(tachometer_axis, tachometer_tsr,
                            tachometer_axis);
                    obj_i.vehicle.tachometer_axis = tachometer_axis;
                }
            }

            if (obj_i.vehicle.props.length != 4)
                m_util.panic("Not enough wheels for chassis " + obj_i.name);

        } else if (vh_set_i.part == "HULL") {

            obj_i.vehicle = {};
            obj_i.vehicle.props = [];
            obj_i.vehicle.prop_offsets = [];

            obj_i.vehicle.force_max = vh_set_i.force_max;
            obj_i.vehicle.brake_max = vh_set_i.brake_max;
            obj_i.vehicle.floating_factor = vh_set_i.floating_factor;
            obj_i.vehicle.water_lin_damp = vh_set_i.water_lin_damp;
            obj_i.vehicle.water_rot_damp = vh_set_i.water_rot_damp;
            obj_i.vehicle.engine_force = 0;
            obj_i.vehicle.brake_force = 1;
            obj_i.vehicle.steering = 0;
            obj_i.vehicle.speed = 0;

            // links to bob objects
            obj_i.vehicle.steering_wheel = null;

            // check dupli groups for boat objects
            var dg_parent = m_obj_util.get_dg_parent(obj_i);
            if (dg_parent)
                // NOTE: not the smartest way to do it
                var boat_objects = m_obj_util.get_dg_objects(dg_parent, objects);
            else
                var boat_objects = objects;

            for (var j = 0; j < boat_objects.length; j++) {
                var obj_j = boat_objects[j];

                if (!obj_j.is_vehicle)
                    continue;

                var vh_set_j = obj_j.vehicle_settings;

                if (m_phy.is_boat_bob(obj_j) && vh_set_i.name == vh_set_j.name) {
                    obj_i.vehicle.props.push(obj_j);
                    obj_i.vehicle.prop_offsets.push(new Float32Array(8));

                } else if (m_phy.is_vehicle_steering_wheel(obj_j) && vh_set_i.name == vh_set_j.name) {
                    obj_i.vehicle.steering_wheel = obj_j;

                    obj_i.vehicle.steering_max = vh_set_j.steering_max;
                    obj_i.vehicle.steering_ratio = vh_set_j.steering_ratio;
                    obj_i.vehicle.inverse_control = vh_set_j.inverse_control;

                    var wtsr_inv = m_tsr.invert(obj_i.render.world_tsr,
                            m_tsr.create())
                    var steering_wheel_tsr = m_tsr.multiply(wtsr_inv,
                            obj_j.render.world_tsr, wtsr_inv);
                    obj_i.vehicle.steering_wheel_tsr = steering_wheel_tsr;
                    var steering_wheel_axis = new Float32Array([1,0,0]);
                    m_tsr.transform_dir_vec3(steering_wheel_axis, steering_wheel_tsr,
                            steering_wheel_axis);
                    obj_i.vehicle.steering_wheel_axis = steering_wheel_axis;
                } else if (m_phy.is_vehicle_speedometer(obj_j) && vh_set_i.name == vh_set_j.name) {
                    obj_i.vehicle.speedometer = obj_j;

                    obj_i.vehicle.speed_ratio = vh_set_j.speed_ratio;
                    obj_i.vehicle.max_speed_angle = vh_set_j.max_speed_angle;

                    var wtsr_inv = m_tsr.invert(obj_i.render.world_tsr,
                            m_tsr.create())
                    var speedometer_tsr = m_tsr.multiply(wtsr_inv,
                            obj_j.render.world_tsr, wtsr_inv);
                    obj_i.vehicle.speedometer_tsr = speedometer_tsr;

                    var speedometer_axis = new Float32Array([1,0,0]);
                    m_tsr.transform_dir_vec3(speedometer_axis, speedometer_tsr,
                            speedometer_axis);
                    obj_i.vehicle.speedometer_axis = speedometer_axis;
                } else if (m_phy.is_vehicle_tachometer(obj_j) && vh_set_i.name == vh_set_j.name) {
                    obj_i.vehicle.tachometer = obj_j;

                    obj_i.vehicle.delta_tach_angle = vh_set_j.delta_tach_angle;

                    var wtsr_inv = m_tsr.invert(obj_i.render.world_tsr,
                            m_tsr.create())
                    var tachometer_tsr = m_tsr.multiply(wtsr_inv,
                            obj_j.render.world_tsr, wtsr_inv);
                    obj_i.vehicle.tachometer_tsr = tachometer_tsr;

                    var tachometer_axis = new Float32Array([1,0,0]);
                    m_tsr.transform_dir_vec3(tachometer_axis, tachometer_tsr,
                            tachometer_axis);
                    obj_i.vehicle.tachometer_axis = tachometer_axis;
                }
            }
        }
    }
}

function prepare_floaters(objects) {
    for (var i = 0; i < objects.length; i++) {
        var obj_i = objects[i];

        if (!obj_i.is_floating)
            continue;

        var fl_set_i = obj_i.floating_settings;

        if (fl_set_i.part == "MAIN_BODY") {
            obj_i.floater = {};
            obj_i.floater.floating_factor = fl_set_i.floating_factor;
            obj_i.floater.water_lin_damp = fl_set_i.water_lin_damp;
            obj_i.floater.water_rot_damp = fl_set_i.water_rot_damp;

            // links to bob objects
            obj_i.floater.bobs = [];

            // check dupli groups for floater objects
            var dg_parent = m_obj_util.get_dg_parent(obj_i);
            if (dg_parent)
                // NOTE: not the smartest way to do it
                var bob_objects = m_obj_util.get_dg_objects(dg_parent, objects);
            else
                var bob_objects = objects;

            for (var j = 0; j < bob_objects.length; j++) {
                var obj_j = bob_objects[j];

                if (!obj_j.is_floating)
                    continue;

                var fl_set_j = obj_j.floating_settings;

                if (m_phy.is_floater_bob(obj_j) && fl_set_i.name ==
                        fl_set_j.name) {
                    obj_i.floater.bobs.push(obj_j);
                    obj_j.bob_synchronize_pos = obj_j.floating_settings.synchronize_position;
                }
            }
        }
    }
}

/**
 * Remove objects from given scenes (also from dupli_group)
 * remove of already removed objects also supported
 */
function remove_bpy_object(remobj, bpy_scenes) {

    for (var i = 0; i < bpy_scenes.length; i++) {
        var bpy_objs = bpy_scenes[i]["objects"];

        // from dupli groups
        for (var j = 0; j < bpy_objs.length; j++) {
            var bpy_obj = bpy_objs[j];

            var dupli_group = bpy_obj["dupli_group"];
            if (dupli_group) {
                var dg_objects = dupli_group["objects"];

                obj_index = dg_objects.indexOf(remobj);
                if (obj_index > -1)
                    dg_objects.splice(obj_index, 1);
            }
        }

        // from scene
        var obj_index = bpy_objs.indexOf(remobj);
        if (obj_index > -1)
            bpy_objs.splice(obj_index, 1);
    }
}

function wait_physics_workers(bpy_data, thread, stage, cb_param, cb_finish,
        cb_set_rate) {

    var loaded = true;

    for (var i = 0; i < bpy_data["scenes"].length; i++) {
        var scene = bpy_data["scenes"][i];

        if (!m_phy.check_worker_loaded(scene)) {
            loaded = false;
            break;
        }
    }

    if (loaded) {
        cb_finish(thread, stage);
        m_print.log("%cPHYSICS READY", "color: #0a0");
    }
}

function add_physics_objects(bpy_data, thread, stage, cb_param, cb_finish,
        cb_set_rate) {

    for (var i = 0; i < bpy_data["scenes"].length; i++) {
        var scene = bpy_data["scenes"][i];

        if (thread.is_primary)
            var enable_physics = m_phy.scene_has_physics(scene);
        else {
            var enable_physics = m_phy.scene_has_physics(_primary_scene) ||
                    m_phy.scene_has_physics(scene);

            // secondary data objects are on primary scene already
            scene = _primary_scene;
        }

        if (cfg_phy.enabled && enable_physics) {
            for (var j = 0; j < ADD_PHY_TYPES.length; j++) {
                var type = ADD_PHY_TYPES[j];

                var sobjs = m_obj.get_scene_objs(scene, type, thread.id);
                for (var k = 0; k < sobjs.length; k++) {
                    var obj = sobjs[k];
                    // add only currently loaded objects
                    if (obj.render.data_id == thread.id) {
                        m_phy.append_object(obj, scene);
                        // turn off physics for secondary loaded objects
                        if (thread.load_hidden && m_phy.obj_has_physics(obj))
                            m_phy.disable_simulation(obj);
                    }
                }
            }
        }
    }
    cb_finish(thread, stage);
}

/**
 * Load shoremap image on corresponding scenes
 */
function load_shoremap(bpy_data, thread, stage, cb_param, cb_finish,
        cb_set_rate) {

    var img_by_uri = {};
    var image_assets = [];
    var bpy_scenes = bpy_data["scenes"];

    for (var i = 0; i < bpy_data["scenes"].length; i++) {

        var scene = bpy_scenes[i];

        if (scene._render.water_params) {

            var image = scene._render.water_params.shoremap_image;

            if (image && image["source"] === "FILE") {
                var uuid = image["uuid"];
                var dir_path = dirname(thread.filepath);
                var image_path = m_util.normpath_preserve_protocol(dir_path + 
                        image["filepath"]);

                if (image._is_compressed)
                    var asset_type = m_assets.AT_ARRAYBUFFER;
                else
                    var asset_type = m_assets.AT_IMAGE_ELEMENT;

                image_assets.push({id:uuid, type:asset_type, url:image_path});
                img_by_uri[uuid] = image;
            }
        }
    }

    if (image_assets.length) {
        var asset_cb = function(html_image, uri, type, path) {

            if (!html_image) { // image not loaded
                var image = img_by_uri[uri];
                for (var i = 0; i < bpy_scenes.length; i++) {
                    var scene = bpy_scenes[i];
                    var shr_image = scene._render.water_params.shoremap_image;
                    if (shr_image === image) {
                        scene._render.water_params.shoremap_image = null;
                        m_print.warn("image", shr_image["filepath"],
                            " was not found. Disabling water shore effects.");
                    }
                }
                return;
            }

            var show_path_warning = true;
            print_image_info(html_image, path, show_path_warning);
            var image = img_by_uri[uri];
            var tex_users = find_image_users(image, bpy_data["textures"]);
            for (var i = 0; i < tex_users.length; i++) {
                var tex_user = tex_users[i];
                var filepath = tex_user["image"]["filepath"];
                var comp_method = "";
                if (image._is_compressed)
                    comp_method = filepath.indexOf(".dds") != -1 ? "dds": "pvr";
                m_tex.update_texture(tex_user._render, html_image,
                                    comp_method, filepath, thread.id);
            }

            for (var i = 0; i < bpy_scenes.length; i++) {
                var scene = bpy_scenes[i];
                if (scene._render.water_params) {
                    var shr_image = scene._render.water_params.shoremap_image;
                    if (shr_image === image)
                        update_scene_shore_distance(html_image, image, scene);
                }
            }
        }
        var pack_cb = function() {
            cb_finish(thread, stage);
        }
        m_assets.enqueue(image_assets, asset_cb, pack_cb);
    } else
        cb_finish(thread, stage);
}

function update_scene_shore_distance(html_image, shoremap, scene) {
    var tmpcanvas = document.createElement("canvas");
    var width  = shoremap.size[0];
    var height = shoremap.size[1];
    tmpcanvas.width  = width;
    tmpcanvas.height = height;

    var ctx = tmpcanvas.getContext("2d");
    ctx.drawImage(html_image, 0, 0);

    var image_data = ctx.getImageData(0, 0, width, height);

    var dist_color = image_data.data;

    var bit_shift = new Float32Array(4);
    bit_shift[0] = 1.0 / (255.0 * 255.0 * 255.0);
    bit_shift[1] = 1.0 / (255.0 * 255.0);
    bit_shift[2] = 1.0 / (255.0);
    bit_shift[3] = 1.0;

    var arr_size = width * height;
    var shore_distances = new Float32Array(arr_size);

    // unpack dist from depth color (g,b channels)
    for (var j = 0; j < arr_size; j++) {
        shore_distances[j] = bit_shift[1] * dist_color[4 * j + 2]
                           + bit_shift[2] * dist_color[4 * j + 3];
    }
    scene._render.shore_distances = shore_distances;
}

// SMAA - Enhanced Subpixel Morphological Antialiasing
function load_smaa_textures(bpy_data, thread, stage, cb_param, cb_finish,
        cb_set_rate) {

    var scene = bpy_data["scenes"][0];

    var subs_smaa_arr = []
    var smaa_passes_names = [m_subs.SMAA_EDGE_DETECTION,
                             m_subs.SMAA_BLENDING_WEIGHT_CALCULATION,
                             m_subs.SMAA_NEIGHBORHOOD_BLENDING,
                             m_subs.SMAA_RESOLVE];

    for (var i = 0; i < smaa_passes_names.length; i++) {
        var smaa_sub = m_scenes.get_subs(scene, smaa_passes_names[i]);
        if (smaa_sub)
            subs_smaa_arr.push(smaa_sub);
    }

    if (!subs_smaa_arr.length) {
        cb_finish(thread, stage);
        return;
    }

    var smaa_images = [];

    var dir_path = dirname(thread.filepath);
    var asset_type = m_assets.AT_IMAGE_ELEMENT;

    var search_texture_path = m_cfg.paths.smaa_search_texture_path;
    smaa_images.push({id:"SEARCH_TEXTURE", type:asset_type, filepath:search_texture_path});

    var area_texture_path = m_cfg.paths.smaa_area_texture_path;
    smaa_images.push({id:"AREA_TEXTURE", type:asset_type, url:area_texture_path});

    for (var i = 0; i < subs_smaa_arr.length; i++) {
        var subs_smaa = subs_smaa_arr[i];

        if (subs_smaa.type == m_subs.SMAA_BLENDING_WEIGHT_CALCULATION) {
            var slinks_internal = subs_smaa.slinks_internal;

            for (var j = 0; j < slinks_internal.length; j++) {
                var slink = slinks_internal[j];
                if (slink.to == "u_search_tex")
                    var search_texture = slink.texture;
                else if (slink.to == "u_area_tex")
                    var area_texture = slink.texture;
            }
            break;
        }
    }

    if (smaa_images.length) {
        var asset_cb = function(image_data, uri, type, path) {

            if (!image_data) // image not loaded
                return;

            var show_path_warning = false;
            print_image_info(image_data, path, show_path_warning);

            if (uri == "SEARCH_TEXTURE")
                var texture = search_texture
            else
                var texture = area_texture

            texture.source = "IMAGE";
            texture.auxilary_texture = true;

            var is_dds = path.indexOf(".dds") != -1 ? 1: 0;
            m_tex.update_texture(texture, image_data, is_dds, path, thread.id);
            m_tex.set_filters(texture, m_tex.TF_LINEAR, m_tex.TF_LINEAR);
        }
        var pack_cb = function() {
            cb_finish(thread, stage);
        }
        m_assets.enqueue(smaa_images, asset_cb, pack_cb);
    } else
        cb_finish(thread, stage);
}

/**
 * Add objects to scenes and finish loading
 */
function prepare_objects_adding(bpy_data, thread, stage, cb_param, cb_finish,
        cb_set_rate) {

    for (var i = 0; i < bpy_data["scenes"].length; i++) {
        var scene = bpy_data["scenes"][i];

        // secondary data objects are on primary scene already
        if (!thread.is_primary)
            scene = _primary_scene;

        // firstly, process lamps
        var lamps = m_obj.get_scene_objs(scene, "LAMP", thread.id);
        for (var j = 0; j < lamps.length; j++) {
            var lamp = lamps[j];

            // add only currently loaded objects
            if (lamp.render.data_id == thread.id)
                cb_param.added_objects.push({
                    scene: scene,
                    obj: lamp
                });
        }

        // all other objects are processed after lamps
        var objs = m_obj.get_scene_objs(scene, "ALL", thread.id);
        for (var j = 0; j < objs.length; j++) {
            var obj = objs[j];

            if (obj.type == "LAMP")
                continue;

            // add only currently loaded objects
            if (obj.render.data_id == thread.id) {
                if (thread.load_hidden && m_obj_util.is_mesh(obj))
                    m_scenes.change_visibility(obj, true);
                cb_param.added_objects.push({
                    scene: scene,
                    obj: obj
                });
            }
        }
    }
}

function add_objects(bpy_data, thread, stage, cb_param, cb_finish,
        cb_set_rate) {

    var obj_data = cb_param.added_objects;
    var obj_counter = cb_param.obj_counter;

    if (obj_data.length) {
        var obj = obj_data[obj_counter].obj;
        var scene = obj_data[obj_counter].scene;
        var sc_data = m_obj_util.get_scene_data(obj, scene);

        m_scenes.append_object(scene, obj, false);
        if (obj.anchor && !scene._render.hmd_stereo_use &&
                !scene._render.anaglyph_use)
            m_anchors.append(obj);
        var rate = ++cb_param.obj_counter / obj_data.length;

        var cube_refl_subs = sc_data.cube_refl_subs;
        if (obj.render.cube_reflection_id != -1 && cube_refl_subs){
            var center = m_vec3.copy(obj.render.bs_world.center, _vec3_tmp);
            m_scenes.update_cube_reflect_subs(cube_refl_subs, center);
        }

        var refl_objs = obj.reflective_objs;
        if (refl_objs.length && scene._render.reflection_params) {
            var rp_trans = m_tsr.get_trans_view(obj.render.world_tsr);
            var rp_quat = m_tsr.get_quat_view(obj.render.world_tsr);
            var refl_subs = sc_data.plane_refl_subs;
            for (var i = 0; i < refl_subs.length; i++) {
                m_scenes.update_plane_reflect_subs(refl_subs[i], rp_trans, rp_quat);
                m_obj_util.update_refl_objects(refl_objs,
                                               refl_subs[i].camera.reflection_plane);
           }
        }
    } else
        var rate = 1;

    cb_set_rate(thread, stage, rate);
}

function end_objects_adding(bpy_data, thread, stage, cb_param, cb_finish,
        cb_set_rate) {
    if (thread.is_primary) {
        var scene_main = m_scenes.get_main();
        m_scenes.update_world_texture(scene_main);
        var scenes = m_scenes.get_rendered_scenes();
        for (var i = 0; i < scenes.length; i++) {
            var scene = scenes[i];
            m_scenes.update_world_texture(scene);
            m_scenes.prepare_rendering(scene, scene_main);
        }
        m_scenes.set_active(scene_main);
    } else
        m_scenes.update_scene_permanent_uniforms(_primary_scene);

    var objects = m_obj.get_all_objects(thread.id);
    m_obj.update_objects_dynamics(objects);

    // remove unused batches
    for (var k = 0; k < objects.length; k++) {
        var obj = objects[k];
        for (var i = 0; i < obj.scenes_data.length; i++) {
            var batches = obj.scenes_data[i].batches;
            for (var j = 0; j < batches.length; j++)
                if (batches[j].shader == null)
                    batches.splice(j--, 1);
        }
    }

    cb_finish(thread, stage);
}

function init_logic_nodes(bpy_data, thread, stage, cb_param, cb_finish,
        cb_set_rate) {

    if (thread.is_primary) {
        var scenes = m_scenes.get_rendered_scenes();
        for (var i = 0; i < scenes.length; i++) {
            var scene = scenes[i];
            if (scene["b4w_use_logic_editor"])
                m_lnodes.init_logic(scene, thread.id)
        }
    }

    cb_finish(thread, stage);
}

function synchronize_media(bpy_data, thread, stage, cb_param, cb_finish,
        cb_set_rate) {

    if (thread.is_primary)
        for (var i = 0; i < bpy_data["scenes"].length; i++) {
            video_play(bpy_data["scenes"][i], thread.id);
            speakers_play(bpy_data["scenes"][i], thread.id, false);
        }
    else { 
        video_play(_primary_scene, thread.id);
        speakers_play(_primary_scene, thread.id, false); 
    }

    cb_finish(thread, stage);
}

exports.setup_canvas = function(canvas) {
    _canvas = canvas;
}

function mobile_media_start(bpy_data, thread, stage, cb_param, cb_finish,
        cb_set_rate) {

    // NOTE: not all bpy data can be dropped on this stage at the moment
    drop_bpy_data(bpy_data, thread);
    if (cfg_def.media_auto_activation && (thread.has_video_textures || 
            thread.has_background_music || thread.init_wa_context)) {
        if (!_play_media_btn)
            create_media_controls(bpy_data, cb_finish, thread, stage);
    } else
        cb_finish(thread, stage);
}

function create_media_controls(bpy_data, cb_finish, thread, stage) {
    var canvas_container = _canvas.parentElement;
    _canvas_container_z_index = canvas_container.style.zIndex;
    canvas_container.style.zIndex = "999";

    _play_media_btn = document.createElement("div");
    _play_media_btn.style.position = "relative";
    _play_media_btn.style.height = "88px";
    _play_media_btn.style.width = "88px";

    var h = Math.round(_canvas.offsetHeight / 2 - 44);
    var w = Math.round(_canvas.offsetWidth / 2 - 44);

    _play_media_btn.style.top = h.toString() + "px";
    _play_media_btn.style.left = w.toString() + "px";
    _play_media_btn.style.backgroundImage = "url('" + PLAY_MEDIA_IMAGE_MOBILE + "')";
    _play_media_btn.style.backgroundSize = "88px";

    _play_media_bkg = document.createElement("div");
    _play_media_bkg.style.position = "relative";
    _play_media_bkg.style.height = _canvas.offsetHeight.toString() + "px";
    _play_media_bkg.style.width = _canvas.offsetWidth.toString() + "px";
    _play_media_bkg.style.background = "rgba(0, 0, 0, 0.5)";
    _play_media_bkg.style.zIndex = "999";

    canvas_container.appendChild(_play_media_bkg);

    _play_media_bkg.appendChild(_play_media_btn);

    _play_media_btn.addEventListener("click", init_media, false);

    function init_media() {

        if (thread.has_video_textures) {
            m_tex.play();
            m_tex.pause();
            m_tex.reset();
        }

        if (thread.has_background_music) {
            if (thread.is_primary)
                for (var i = 0; i < bpy_data["scenes"].length; i++)
                    speakers_play(bpy_data["scenes"][i], thread.id, true);
            else
                speakers_play(_primary_scene, thread.id, true);
            m_sfx.pause();
        }

        if (thread.init_wa_context) {
            m_sfx.play_empty_sound();
        }

        remove_media_controls();
        cb_finish(thread, stage);
    }
}

function remove_media_controls() {
    if (_play_media_btn) {
        var canvas_container = _canvas.parentElement;
        canvas_container.style.zIndex = _canvas_container_z_index;
        _play_media_bkg.removeChild(_play_media_btn);
        canvas_container.removeChild(_play_media_bkg);
        _play_media_bkg = null;
        _play_media_btn = null;
        _canvas_container_z_index = 0;
    }
}

exports.update_media_controls = function (width, height) {
    if(_play_media_btn) {
        _play_media_bkg.style.height = height.toString() + "px";
        _play_media_bkg.style.width = width.toString() + "px";

        var h = Math.round(height / 2 - 44);
        var w = Math.round(width / 2 - 44);

        _play_media_btn.style.top = h.toString() + "px";
        _play_media_btn.style.left = w.toString() + "px";
    }
}

/**
 * path helper function
 */
function dirname(path) {
    var dirname = path.split("/").slice(0, -1).join("/");
    if (dirname)
        dirname += "/";
    return dirname;
}

/**
 * Stage properties.
 * priority: 
 *      ASYNC_PRIORITY - stage can be executed asynchronously alongside with other stages
 *          (relevant for stages which perform http requests)
 *      SYNC_PRIORITY - such stages are executed in a strict order one-by-one
 * background_loading:
 *      - stage can be executed after the rendering starts
 * inputs:
 *      - previous stages which are needed to be finished before this stage can start
 * is_resource:
 *      - stage will be omitted if "do_not_load_resources" flag is set
 * relative_size:
 *      - a value which represents amount of time required to finish this stage
 * primary_only:
 *      - stage is executed only in the primary thread, it's omitted during the dynamic loading
 * cb_before: 
 *      - a stage callback which is processed first during the stage execution
 *          call cb_finish as follows: cb_finish(thread, stage) to finish the stage
 *          (suitable for preparatory actions)
 * cb_loop:
 *      - a stage callback which is called multiple times within a loop; 
 *          call cb_set_rate callback as follows: cb_set_rate(thread, stage, 1) to break the loop, 
 *          call cb_finish as follows: cb_finish(thread, stage) to finish the stage
 *          (suitable for cyclical actions which can be breaked into a separate steps;
 *          not needed for asynchronous resources(speakers, textures, ...))
 * cb_after: 
 *      - a stage callback which is processed last during the stage execution
 *          call cb_finish as follows: cb_finish(thread, stage) to finish the stage
 *          (suitable for finishing actions)
 * cb_param:
 *      - an utility parameter which is available inside all of the stage callbacks
 *          (can be used to translate some data through the stage callbacks)
 */
exports.load = function(path, loaded_cb, stageload_cb, wait_complete_loading,
        load_hidden) {

    var stages = {
        "load_main": {
            priority: m_loader.ASYNC_PRIORITY,
            background_loading: false,
            inputs: [],
            is_resource: false,
            relative_size: 500,
            primary_only: false,
            cb_before: load_main
        },
        "duplicate_objects": {
            priority: m_loader.SYNC_PRIORITY,
            background_loading: false,
            inputs: ["load_main"],
            is_resource: false,
            relative_size: 50,
            primary_only: false,
            cb_before: duplicate_objects
        },
        "load_binaries": {
            priority: m_loader.ASYNC_PRIORITY,
            background_loading: false,
            inputs: ["load_main"],
            is_resource: false,
            relative_size: 500,
            primary_only: false,
            cb_before: load_binaries
        },
        "wait_for_shaders": {
            priority: m_loader.SYNC_PRIORITY,
            background_loading: false,
            inputs: [],
            is_resource: false,
            relative_size: 50,
            primary_only: true,
            cb_loop: wait_for_shaders
        },
        "prepare_bindata": {
            priority: m_loader.SYNC_PRIORITY,
            background_loading: false,
            inputs: ["duplicate_objects", "load_binaries"],
            is_resource: false,
            relative_size: 100,
            primary_only: false,
            cb_before: prepare_bindata
        },
        "prepare_bpy_data": {
            priority: m_loader.SYNC_PRIORITY,
            background_loading: false,
            inputs: ["duplicate_objects", "prepare_bindata"],
            is_resource: false,
            relative_size: 100,
            primary_only: false,
            cb_before: prepare_bpy_data
        },
        "process_objects": {
            priority: m_loader.SYNC_PRIORITY,
            background_loading: false,
            inputs: ["prepare_bpy_data"],
            is_resource: false,
            relative_size: 150,
            primary_only: false,
            cb_before: process_objects
        },
        "process_scenes": {
            priority: m_loader.SYNC_PRIORITY,
            background_loading: false,
            inputs: ["process_objects", "wait_for_shaders"],
            is_resource: false,
            relative_size: 300,
            primary_only: false,
            cb_before: process_scenes
        },
        "load_smaa_textures": {
            priority: m_loader.ASYNC_PRIORITY,
            background_loading: false,
            inputs: ["process_scenes"],
            is_resource: false,
            relative_size: 30,
            primary_only: true,
            cb_before: load_smaa_textures
        },
        "load_shoremap": {
            priority: m_loader.ASYNC_PRIORITY,
            background_loading: false,
            inputs: ["process_scenes"],
            is_resource: false,
            relative_size: 30,
            primary_only: true,
            cb_before: load_shoremap
        },
        "load_textures": {
            priority: m_loader.ASYNC_PRIORITY,
            background_loading: true,
            inputs: ["process_scenes"],
            is_resource: true,
            relative_size: 500,
            primary_only: false,
            cb_before: load_textures
        },
        "update_scenes_nla": {
            priority: m_loader.SYNC_PRIORITY,
            background_loading: false,
            inputs: ["process_scenes", "load_textures"],
            is_resource: false,
            relative_size: 50,
            primary_only: false,
            cb_before: update_scenes_nla
        },
        "wait_physics_workers": {
            priority: m_loader.SYNC_PRIORITY,
            background_loading: false,
            inputs: ["load_shoremap"],
            is_resource: false,
            relative_size: 20,
            primary_only: false,
            cb_loop: wait_physics_workers
        },
        "add_physics_objects": {
            priority: m_loader.SYNC_PRIORITY,
            background_loading: false,
            inputs: ["wait_physics_workers"],
            is_resource: false,
            relative_size: 50,
            primary_only: false,
            cb_before: add_physics_objects
        },
        "add_objects": {
            priority: m_loader.SYNC_PRIORITY,
            background_loading: false,
            inputs: ["add_physics_objects"],
            is_resource: false,
            relative_size: 600,
            primary_only: false,
            cb_before: prepare_objects_adding,
            cb_loop: add_objects,
            cb_after: end_objects_adding,
            cb_param: {
                added_objects: [],
                obj_counter: 0
            }
        },
        "init_logic_nodes": {
            priority: m_loader.SYNC_PRIORITY,
            background_loading: false,
            inputs: ["update_scenes_nla", "add_objects"],
            is_resource: false,
            relative_size: 50,
            primary_only: false,
            cb_before: init_logic_nodes
        },
        "load_speakers": {
            priority: m_loader.ASYNC_PRIORITY,
            background_loading: true,
            inputs: ["add_objects"],
            is_resource: true,
            relative_size: 100,
            primary_only: false,
            cb_before: load_speakers
        },
        "mobile_media_start": {
            priority: m_loader.SYNC_PRIORITY,
            background_loading: false,
            inputs: ["load_textures", "update_scenes_nla", "load_speakers", "init_logic_nodes"],
            is_resource: true,
            relative_size: 5,
            primary_only: false,
            cb_before: mobile_media_start,
            cb_loop: mobile_media_start
        },
        "synchronize_media": {
            priority: m_loader.SYNC_PRIORITY,
            background_loading: true,
            inputs: ["mobile_media_start"],
            is_resource: true,
            relative_size: 50,
            primary_only: false,
            cb_before: synchronize_media
        },
        "start_nla": {
            priority: m_loader.SYNC_PRIORITY,
            background_loading: true,
            inputs: ["mobile_media_start"],
            is_resource: false,
            relative_size: 5,
            primary_only: true,
            cb_before: start_nla
        }
    };

    var scheduler = m_loader.get_scheduler();
    if (!scheduler) {
        scheduler = m_loader.create_scheduler();
        _bpy_data_array = {};
        _all_objects_cache = {};
        _dupli_obj_id_overrides = {};
    }

    _bpy_data_array[scheduler.threads.length] = {};
    var data_id = m_loader.create_thread(stages, path, loaded_cb, stageload_cb,
            free_load_data, wait_complete_loading || cfg_sfx.audio_loading_hack,
            cfg_def.do_not_load_resources, load_hidden);
    return data_id;
}

exports.unload = function(data_id) {
    // not even started loading
    // NOTE: data_id = 0 always allowed to unload
    var scheduler = m_loader.get_scheduler();
    if (!scheduler || !scheduler.threads.length || data_id
            && !m_loader.thread_is_finished(scheduler.threads[data_id])) {
        m_print.error("Unable to unload data!");
        return;
    }
    // unload all data
    if (data_id == 0) {
        m_print.log("%cUNLOAD ALL", "color: #00a");

        m_anchors.cleanup();
        m_anim.cleanup();
        m_sfx.cleanup();
        m_nla.cleanup();
        m_batch.cleanup();
        m_scenes.cleanup();
        m_loader.cleanup();
        // m_ctl.cleanup depends of m_phy.cleanup
        m_ctl.cleanup();
        m_phy.cleanup();
        m_obj.cleanup();
        m_util.cleanup();
        m_render.cleanup();
        m_nodemat.cleanup();
        m_shaders.cleanup();
        m_ext.cleanup();
        m_assets.cleanup();
        m_tex.cleanup();
        m_lnodes.cleanup();
        m_particles.cleanup();
        m_input.cleanup();
        m_debug.cleanup();

        _all_objects_cache = null;
        _dupli_obj_id_overrides = {};
        _primary_scene = null;
        _bpy_data_array = null;
        _media_data_init = false;
    } else {
        m_print.log("%cUNLOAD DATA " + data_id, "color: #00a");

        // actions cleanup
        m_anim.remove_actions(data_id);

        // mark all objects
        var objs = m_obj.get_all_objects(m_obj.DATA_ID_ALL);
        for (var i = 0; i < objs.length; i++) {
            var obj = objs[i];
            // keep WebGL data for objects that will stay on the scene
            if (m_obj_util.get_object_data_id(obj) != data_id)
                m_obj.obj_switch_cleanup_flags(obj, false, false, false, false);
        }

        // unload 
        var objs = m_obj.get_all_objects(data_id);
        for (var i = objs.length - 1; i >= 0; i--) {
            var obj = objs[i];
            prepare_object_unloading(obj);
            m_obj.remove_object(obj);
        }

        // revert flags
        var objs = m_obj.get_all_objects(m_obj.DATA_ID_ALL);
        for (var i = 0; i < objs.length; i++)
            m_obj.obj_switch_cleanup_flags(objs[i], true, true, true, true);
    }

    remove_media_controls();
}

exports.prepare_object_unloading = prepare_object_unloading;
function prepare_object_unloading(obj) {
    // anim cleanup
    if (m_anim.is_animated(obj))
        m_anim.remove(obj);

    // particles cleanup
    m_particles.remove_obj_from_cache(obj);

    // scenes cleanup
    m_obj.clear_outline_anim(obj);

    // controls cleanup
    if (m_ctl.check_sensor_manifold(obj))
        m_ctl.remove_sensor_manifold(obj);

    // physics cleanup
    if (m_phy.obj_has_physics(obj)) {
        m_phy.remove_object(obj);
    }

    // unload objects
    m_scenes.remove_object_bundles(obj);

    // unload sounds / speaker cleanup
    if (m_obj_util.is_speaker(obj))
        m_sfx.speaker_remove(obj);

    if (m_anchors.is_anchor(obj))
        m_anchors.remove(obj);
}


exports.set_debug_resources_root = function(debug_resources_root) {

    _debug_resources_root = debug_resources_root;
}

function parent_num(bpy_obj) {
    var par = get_parent(bpy_obj);
    if (par)
        return 1 + parent_num(par);
    else
        return 0;

}

function get_parent(bpy_obj) {
    var armobj = m_anim.get_bpy_armobj(bpy_obj);
    if (armobj && armobj["parent"] == bpy_obj)
        return null;
    else
        return bpy_obj["parent"] || armobj;
}

exports.activate_media = function() {
    if (!_media_data_init && !cfg_def.media_auto_activation) {

        m_tex.play();
        m_tex.pause();
        m_tex.reset();

        speakers_play(_primary_scene, m_obj.DATA_ID_ALL, true);
        m_sfx.pause();

        if (cfg_def.init_wa_context_hack)
            m_sfx.play_empty_sound();

        _media_data_init = true;
    }
}

exports.reset = function() {
    _canvas = null;
}

}
