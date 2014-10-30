"use strict";

/**
 * Data internal API.
 * @name data
 * @namespace
 * @exports exports as data
 */
b4w.module["__data"] = function(exports, require) {

var m_anim      = require("__animation");
var m_batch     = require("__batch");
var m_cfg       = require("__config");
var m_ctl       = require("__controls");
var m_dds       = require("__dds");
var m_ext       = require("__extensions");
var m_lights    = require("__lights");
var m_loader    = require("__loader");
var m_assets    = require("__assets");
var m_md5       = require("__md5");
var m_obj       = require("__objects");
var m_phy       = require("__physics");
var m_print     = require("__print");
var m_reformer  = require("__reformer");
var m_render    = require("__renderer");
var m_scenes    = require("__scenes");
var m_nla       = require("__nla");
var m_sfx       = require("__sfx");
var m_shaders   = require("__shaders");
var m_tex       = require("__textures");
var m_nodemat   = require("__nodemat");
var m_util      = require("__util");

var m_vec4 = require("vec4");
var m_mat4 = require("mat4");

var cfg_def = m_cfg.defaults;
var cfg_ldr = m_cfg.assets;
var cfg_phy = m_cfg.physics;
var cfg_anim = m_cfg.animation;

var DEBUG_BPYDATA = false;
var DEBUG_LOD_DIST_NOT_SET = false;

var BINARY_INT_SIZE = 4;
var BINARY_SHORT_SIZE = 2;
var BINARY_FLOAT_SIZE = 4;

var _bpy_data_array = null;
var _all_objects_cache = null;
var _debug_resources_root = "";

var _data_is_primary = false;
var _primary_scene = null;
var _dupli_obj_id_overrides = {};

var SECONDARY_LOAD_TYPES_DISABLED = ["LAMP", "CAMERA"];
var ADD_PHY_TYPES = ["MESH", "CAMERA", "EMPTY"];
var ADD_SFX_TYPES = ["SPEAKER"];

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
    // free memory
    //m_assets.cleanup();
    cleanup_meshes(get_all_objects_cached(bpy_data, thread.id));
    _bpy_data_array[thread.id] = null;
    _all_objects_cache[thread.id] = null;
}

function print_image_info(image_data, image_path, show_path_warning) {

    var w, h;

    if (image_data instanceof ArrayBuffer) {
        var dds_wh = m_dds.get_width_height(image_data);
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
        m_print.warn("B4W Warning: image", image_path, "is not from app root.");
}

/**
 * Load main json
 */
function load_main(bpy_data, thread, stage, cb_param, cb_finish,
        cb_set_rate) {

    var main_path = thread.filepath;
    if (!main_path)
        throw "Nothing requested"

    var asset_cb = function(loaded_bpy_data, uri, type, path) {

        if (!loaded_bpy_data) // Failed to load scene main file
            return;

        m_print.log("%cLOAD METADATA", "color: #616", path);

        check_version(loaded_bpy_data);

        // copy-link its properties to initial bpy_data
        for (var prop in loaded_bpy_data)
            bpy_data[prop] = loaded_bpy_data[prop];

        var bin_name = bpy_data["binaries"][0]["binfile"];
        if (bin_name)
            thread.binary_name = bin_name;
        else {
            m_loader.skip_stage_by_name(thread, "load_binaries");
            m_loader.skip_stage_by_name(thread, "prepare_bindata");
        }
        show_export_errors(bpy_data);
        show_export_warnings(bpy_data);
        cb_finish(thread, stage);
    }

    var progress_cb = function(rate) {
        cb_set_rate(thread, stage, rate);
    }

    m_assets.enqueue([[main_path, m_assets.AT_JSON, main_path]], asset_cb, null,
            progress_cb);
}

function show_export_warnings(bpy_data) {
    if (bpy_data["b4w_export_warnings"])
        for (var i = 0; i < bpy_data["b4w_export_warnings"].length; i++)
            m_print.warn("EXPORT WARNING:",
                    bpy_data["b4w_export_warnings"][i]);
}

function show_export_errors(bpy_data) {
    if (bpy_data["b4w_export_errors"])
        for (var i = 0; i < bpy_data["b4w_export_errors"].length; i++)
            m_print.error("EXPORT ERROR:",
                    bpy_data["b4w_export_errors"][i]);
}

/**
 * Load binary file
 */
function load_binaries(bpy_data, thread, stage, cb_param, cb_finish,
        cb_set_rate) {
    var binary_path = dirname(thread.filepath) + thread.binary_name;

    if (!binary_path)
        throw "Binary data is missing";

    var binary_cb = function(bin_data, uri, type, path) {

        if (!bin_data) // Failed to load scene binary file
            return;

        m_print.log("%cLOAD BINARY", "color: #616", path);

        bpy_data["bin_data"] = bin_data;
        cb_finish(thread, stage);
    }

    var progress_cb = function(rate) {
        cb_set_rate(thread, stage, rate);
    }

    m_assets.enqueue([[binary_path, m_assets.AT_ARRAYBUFFER, binary_path]],
            binary_cb, null, progress_cb);
}

function check_version(loaded_bpy_data) {

    var ver_str = loaded_bpy_data["b4w_format_version"]
    if (Number(ver_str) < cfg_def.min_format_version)
        throw "Incompatible file version: " + ver_str +
                ". Required: " + cfg_def.min_format_version;
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

    prepare_bindata_submeshes(bin_data, bin_offsets, meshes, is_le);
    prepare_bindata_psystems(bin_data, bin_offsets, objects, is_le);
    prepare_bindata_actions(bin_data, bin_offsets, actions, is_le);

    cb_finish(thread, stage);
}

function prepare_bindata_submeshes(bin_data, bin_offsets, meshes, is_le) {
    var int_props = ["indices"];
    var short_props = ["normal", "tangent"];
    var ushort_props = ["color", "group"]
    var float_props = ["position", "texcoord", "texcoord2"];

    for (var i = 0; i < meshes.length; i++) {
        var submeshes = meshes[i]["submeshes"];

        for (var j = 0; j < submeshes.length; j++) {

            for (var prop_name in submeshes[j]) {
                var length = submeshes[j][prop_name][1];

                if (int_props.indexOf(prop_name) != -1) {
                    var offset = submeshes[j][prop_name][0] * BINARY_INT_SIZE
                            + bin_offsets["int"];
                    submeshes[j][prop_name] = extract_bindata_uint(bin_data,
                            offset, length, is_le);
                } else if (float_props.indexOf(prop_name) != -1) {
                    var offset = submeshes[j][prop_name][0] * BINARY_FLOAT_SIZE
                            + bin_offsets["float"];
                    submeshes[j][prop_name] = extract_bindata_float(bin_data,
                            offset, length, is_le);
                } else if (short_props.indexOf(prop_name) != -1) {
                    var offset = submeshes[j][prop_name][0] * BINARY_SHORT_SIZE
                            + bin_offsets["short"];
                    submeshes[j][prop_name] = extract_bindata_short(bin_data,
                            offset, length);
                } else if (ushort_props.indexOf(prop_name) != -1) {
                    var offset = submeshes[j][prop_name][0] * BINARY_SHORT_SIZE
                            + bin_offsets["ushort"];
                    submeshes[j][prop_name] = extract_bindata_ushort(bin_data,
                            offset, length);
                }
            }
        }
    }
}

function prepare_bindata_psystems(bin_data, bin_offsets, objects, is_le) {
    for (var i = 0; i < objects.length; i++) {
        var psystems = objects[i]["particle_systems"];

        for (var j = 0; j < psystems.length; j++) {
            var psys = psystems[j];
            var offset = psys["transforms"][0] * BINARY_FLOAT_SIZE
                    + bin_offsets["float"];
            var length = psys["transforms"][1];
            psys["transforms"] = extract_bindata_float(bin_data,
                    offset, length, is_le);
        }
    }
}

// make points for every frame from start to end
function prepare_bindata_actions(bin_data, bin_offsets, actions, is_le) {
    for (var i = 0; i < actions.length; i++) {
        var action = actions[i];
        var fcurves = action["fcurves"];

        var frame_range = action["frame_range"]; // same for all fcurves
        var start = frame_range[0]; // integer
        var end   = frame_range[1]; // integer

        var arr_length = m_anim.get_approx_curve_length(start, end);
        var bflags = null;

        // HACK: do not process euler rotation if quaternion rotation exists
        // currently applied in Blender b4w addon; temporary backward compatibility
        var has_euler_rot = false;
        var has_quat_rot = false;
        for (var data_path in fcurves) {
            has_euler_rot |= data_path.indexOf("rotation_euler") > -1;
            has_quat_rot |= data_path.indexOf("rotation_quaternion") > -1;
        }

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
                        + fcurve["bin_data_pos"][0] * BINARY_FLOAT_SIZE;
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

            if (data_path.indexOf("rotation_euler") > -1)
                m_anim.fcurves_replace_euler_by_quat(fcurves, data_path);
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
            arr[i] = dataview.getFloat32(offset + i * BINARY_FLOAT_SIZE, true);
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
            arr[i] = dataview.getUint32(offset + i * BINARY_INT_SIZE, true);
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
        arr[i] = dataview.getInt16(offset + i * BINARY_SHORT_SIZE, true) / 32767;
    return arr;
}

/**
 * Extract float data packed into unsigned shorts (floats in range [0; 1])
 */
function extract_bindata_ushort(bin_data, offset, length) {
    var arr = new Float32Array(length);
    var dataview = new DataView(bin_data);
    for (var i = 0; i < length; i++)
        arr[i] = dataview.getUint16(offset + i * BINARY_SHORT_SIZE, true) / 65535;
    return arr;
}

function report_empty_submeshes(bpy_data) {

    var already_reported = {};

    var objects = bpy_data["objects"];

    for (var i = 0; i < objects.length; i++) {

        var obj = objects[i];
        if (obj["type"] !== "MESH")
            continue;

        // reporting for emitters is not supported
        if (obj["particle_systems"].length)
            continue;

        var mesh = obj["data"];
        var mesh_name = mesh["name"];
        var submeshes = mesh["submeshes"];
        var materials = mesh["materials"];

        for (var j = 0; j < submeshes.length; j++) {
            if (submeshes[j]["base_length"] === 0 &&
                    !already_reported[mesh_name]) {

                if (materials[j])
                    m_print.warn("B4W Warning: material \"" + materials[j]["name"]
                        + "\" is not assigned to any face (object \""
                        + obj["name"] + "\").");
                else
                    m_print.warn("B4W Warning: Mesh \"" + mesh["name"] +
                            "\" has no faces (object \"" + obj["name"] + "\").");

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
                m_print.warn("B4W Warning: mesh \"" + mesh["name"]
                             + "\" has a UV map but has no exported material.");

        }
    }
}
/**
 * Prepare root data after main libs loaded
 */
function prepare_root_datablocks(bpy_data, thread, stage, cb_param, cb_finish,
        cb_set_rate) {

    make_links(bpy_data);

    m_reformer.check_bpy_data(bpy_data);
    check_primary_data(bpy_data, thread);

    // create textures
    var textures = bpy_data["textures"];
    var global_af = get_global_anisotropic_filtering(bpy_data);
    for (var i = 0; i < textures.length; i++) {
        // NOTE: disable offscreen rendering for secondary loaded data
        if (!_data_is_primary)
            textures[i]["b4w_render_scene"] = "";
        m_tex.create_texture_bpy(textures[i], global_af, bpy_data["scenes"]);
    }

    report_empty_submeshes(bpy_data);
    report_odd_uvs(bpy_data["meshes"]);

    create_special_materials(bpy_data);
    assign_default_material(bpy_data);

    prepare_actions(bpy_data["actions"], thread.id);

    prepare_hair_particles(bpy_data);
    update_all_objects(bpy_data, thread.id);

    prepare_lods(bpy_data);
    update_all_objects(bpy_data, thread.id);

    var objects = get_all_objects_cached(bpy_data, thread.id);

    for (var i = 0; i < objects.length; i++) {
        var obj = objects[i];
        // NOTE: disable parenting to LAMP or CAMERA objects
        if (!_data_is_primary && obj["parent"] &&
                SECONDARY_LOAD_TYPES_DISABLED.indexOf(obj["parent"]["type"]) > -1)
            obj["parent"] = "";
        m_obj.update_object(obj, false);

        // NOTE: assign data_id property to differ objects and batches while
        // secondary loading
        obj._render.data_id = thread.id;
    }

    // make link from armature to its skinned objects for skeletal animation
    link_skinned_objs(objects);

    calc_max_bones(objects);
    prepare_lod_objects(objects);
    prepare_vehicles(objects);
    prepare_floaters(objects);

    cb_finish(thread, stage);
}

function link_skinned_objs(objects) {

    for (var i = 0; i < objects.length; i++) {

        var skinned_obj = objects[i];
        if (skinned_obj["type"] != "MESH")
            continue;

        var armobj = m_anim.get_first_armature_object(skinned_obj);
        if (armobj) {
            var render = armobj._render;
            if (render.anim_mixing) {
                var skinned_render = skinned_obj._render;
                var bone_pointers = skinned_render.bone_pointers;
                // construct bone map for deform_bone -> bone indices compliance
                // Needed only for mixing skeletal animation
                var mesh_bone_map = [];
                for (var bone_name in bone_pointers) {
                    var bp = bone_pointers[bone_name];
                    var bone_index = bp.bone_index;
                    var deform_bone_index = bp.deform_bone_index;

                    var sk_ind = 4 * deform_bone_index;
                    var ind = 4 * bone_index;
                    mesh_bone_map.push(sk_ind, ind);
                }
                render.mesh_to_arm_bone_maps.push(mesh_bone_map);
            }
            render.skinned_renders.push(skinned_obj._render);
        }
    }
}

/**
 * Check primary/secondary loading data
 */
function check_primary_data(bpy_data, thread) {

    _data_is_primary = (thread.id === 0);
    if (!_primary_scene)
        _primary_scene = bpy_data["scenes"][0];
}

function prepare_root_scenes(bpy_data, thread, stage, cb_param, cb_finish,
        cb_set_rate) {

    // NOTE: save only first scene for secondary data
    if (!_data_is_primary && bpy_data["scenes"].length > 1) {
        bpy_data["scenes"] = [bpy_data["scenes"][0]];
        m_print.warn("B4W Warning: loading data contains multiple scenes.",
                "Only the first one will be loaded.");
    }

    for (var i = 0; i < bpy_data["scenes"].length; i++) {

        var scene = bpy_data["scenes"][i];

        if (_data_is_primary)
            check_scene(scene);

        var scene_objects = m_scenes.combine_scene_objects(scene, "MESH");

        for (var j = 0; j < scene_objects.length; j++) {
            var obj = scene_objects[j];

            var mesh = m_reformer.apply_mesh_modifiers(obj);
            if (mesh) {
                bpy_data["meshes"].push(mesh);
                obj["data"] = mesh;
            }
        }

        // remove orphans before batch generation
        remove_orphan_meshes(get_all_objects_cached(bpy_data, thread.id),
                bpy_data["meshes"]);

        if (_data_is_primary) {
            m_scenes.append_scene(scene);

            if (cfg_phy.enabled && scene["b4w_enable_physics"])
                m_phy.attach_scene_physics(scene);

            if (scene["b4w_enable_audio"])
                m_sfx.attach_scene_sfx(scene);

            var scene_graph = m_scenes.get_graph(scene);
            var grid_size = scene["b4w_batch_grid_size"];

        } else {
            m_scenes.append_to_existed_scene(scene, _primary_scene);

            if (cfg_phy.enabled && scene["b4w_enable_physics"]
                    && !_primary_scene._physics)
                m_phy.attach_scene_physics(_primary_scene);

            if (scene["b4w_enable_audio"] && !_primary_scene._sfx)
                m_sfx.attach_scene_sfx(_primary_scene);

            var scene_graph = m_scenes.get_graph(_primary_scene);
            var grid_size = _primary_scene["b4w_batch_grid_size"];
        }

        var meta_objects = m_batch.generate_main_batches(scene_graph,
                grid_size, scene_objects, scene["world"]);

        if (_data_is_primary) {
            m_scenes.add_meta_objects(scene, meta_objects);
            m_scenes.generate_auxiliary_batches(scene_graph);
        } else
            m_scenes.add_meta_objects(_primary_scene, meta_objects);
    }

    setup_dds_loading(bpy_data);

    if (DEBUG_BPYDATA)
        m_print.log("%cDEBUG BPYDATA:", "color: #a0a", bpy_data);

    cb_finish(thread, stage);
}

function setup_dds_loading(bpy_data) {

    var materials = bpy_data["materials"];

    // check extension for dds
    if (!cfg_ldr.dds_available || !cfg_def.use_dds) {
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

            if (image._is_dds) {
                // it was already marked as dds on previous cycle - so do nothing
            } else if (image["filepath"].indexOf(".dds") > -1) {
                // dds texture was used in blender - so just mark it as dds
                // this is mostly a debug feature, so s3tc ext check is not performed
                image._is_dds = true;
            } else {
                // check: load texture as usual or as dds; then if needed mark it as dds and adjust filepath
                image._is_dds = !texture["b4w_disable_compression"] &&
                                !texture_slot["use_map_normal"] &&
                                texture["type"] != "ENVIRONMENT_MAP" &&
                                !texture["b4w_shore_dist_map"];

                if (image._is_dds)
                    image["filepath"] += ".dds";
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
                    if (!tex) {
                        m_print.warn("B4W Warning: material ", material["name"], " has empty textures.");
                        continue;
                    }

                    var image = tex["image"];

                    if (image._is_dds) {
                        // it was already marked as dds on previous cycle - so do nothing
                    } else {
                        image._is_dds = tex._render.allow_node_dds &&
                                        !tex["b4w_disable_compression"];

                        if (image._is_dds)
                            image["filepath"] += ".dds";
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
                              image["filepath"].indexOf(".dds") > -1)
        image._is_dds = use_dds;
    }
}

/**
 * global anisotropic filtering, may be overriden by individual textures
 * use value from the first scene because it's difficult
 * or impossible to assign textures to scenes
 */
function get_global_anisotropic_filtering(bpy_data) {
    if (_data_is_primary)
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
    var objects = bpy_data["objects"];

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

    for (var i = 0; i < objects.length; i++) {
        var obj = objects[i];
        obj_ids_old[obj["uuid"]] = obj;
        obj_ids[obj["uuid"]] = obj;
    }

    duplicate_objects_iter(objects, null, obj_ids, grp_ids);

    for (var id in grp_ids)
        if (!(id in grp_ids_old))
            groups.push(grp_ids[id]);

    for (var id in obj_ids)
        if (!(id in obj_ids_old))
            objects.push(obj_ids[id]);

    cb_finish(thread, stage);
}

function duplicate_objects_iter(obj_links, origin_name_prefix, obj_ids, grp_ids) {

    var proxy_source_ids = [];

    for (var i = 0; i < obj_links.length; i++) {
        var obj_link = obj_links[i];
        var obj = obj_ids[obj_link["uuid"]];

        var proxy_link = obj["proxy"];
        if (proxy_link) {
            // save to purge later
            if (origin_name_prefix &&
                    proxy_source_ids.indexOf(proxy_link["uuid"]) == -1)
                proxy_source_ids.push(proxy_link["uuid"]);

            var proxy = obj_ids[proxy_link["uuid"]];

            // currently blender doesn't preserve constraints for
            // proxy objects, so try to use constraints of proxy source
            var consts = proxy["constraints"];
            for (var j = 0; j < consts.length; j++) {
                var new_cons = m_util.clone_object_json(consts[j]);
                new_cons.name = new_cons.name + "_CLONE";
                obj["constraints"].push(new_cons);
            }

            // NOTE: handle missing b4w_proxy_inherit_anim as true (temporary)
            if (!("b4w_proxy_inherit_anim" in obj) ||
                    obj["b4w_proxy_inherit_anim"]) {
                var anim_data = obj["animation_data"];
                if (anim_data)
                    proxy["animation_data"] = m_util.clone_object_json(obj["animation_data"]);

                proxy["b4w_use_default_animation"] = obj["b4w_use_default_animation"];
                proxy["b4w_auto_skel_anim"] = obj["b4w_auto_skel_anim"];
                proxy["b4w_anim_behavior"] = obj["b4w_anim_behavior"];

                // NOTE: deprecated
                proxy["b4w_cyclic_animation"] = obj["b4w_cyclic_animation"];
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

    for (var i = 0; i < obj_links.length; i++) {
        var obj_link = obj_links[i];
        var obj = obj_ids[obj_link["uuid"]];

        if (origin_name_prefix) {
            var obj_new = m_util.clone_object_json(obj);
            var obj_name = ("origin_name" in obj) ? obj["origin_name"] :
                    obj["name"];
            obj_new["name"] = origin_name_prefix + "*" + obj_name;
            obj_new["origin_name"] = obj_name;

            assign_obj_id(obj_new);
            obj_ids[obj_new["uuid"]] = obj_new;
            obj_id_overrides[obj_link["uuid"]] = obj_new["uuid"];
            obj_link["uuid"] = obj_new["uuid"];
        }

        // relink
        var obj = obj_ids[obj_link["uuid"]];

        if (obj["dupli_group"]) {
            var grp_link = obj["dupli_group"];
            var grp = grp_ids[grp_link["uuid"]];

            var grp_new = m_util.clone_object_json(grp);
            grp_new["name"] = m_util.unique_name(grp["name"]+"_CLONE");
            assign_grp_id(grp_new);
            grp_ids[grp_new["uuid"]] = grp_new;
            // NOTE: may affect original objects
            // it's seams save for two-level object access
            grp_link["uuid"] = grp_new["uuid"];

            var dg_obj_links = grp_new["objects"];
            duplicate_objects_iter(dg_obj_links, obj["name"], obj_ids, grp_ids);
        }
    }

    // same as non-empty obj_id_overrides
    if (origin_name_prefix) {
        for (var i = 0; i < obj_links.length; i++) {
            var obj_link = obj_links[i];
            var obj = obj_ids[obj_link["uuid"]];

            if (obj["parent"] && obj["parent"]["uuid"] in obj_id_overrides)
                obj["parent"]["uuid"] = obj_id_overrides[obj["parent"]["uuid"]];
            else if (obj["parent"]) {
                m_print.warn("B4W Warning: Object's \"" + obj.name
                     + "\" parent is not in dupli group. Disabling parenting.");
                obj["parent"] = null;
            }

            var consts = obj["constraints"];
            for (var j = 0; j < consts.length; j++) {
                var cons = consts[j];

                if (cons["target"] && cons["target"]["uuid"] in obj_id_overrides)
                    cons["target"]["uuid"] = obj_id_overrides[cons["target"]["uuid"]];
            }

            var mods = obj["modifiers"];
            for (var j = 0; j < mods.length; j++) {
                var mod = mods[j];

                if (mod["object"] && (mod["object"]["uuid"] in obj_id_overrides))
                    mod["object"]["uuid"] = obj_id_overrides[mod["object"]["uuid"]];
            }

            var lods = obj["lod_levels"];

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

function assign_obj_id(obj) {
    obj["uuid"] = m_md5.hexdigest("Object" + obj["name"]);
}

function assign_grp_id(grp) {
    grp["uuid"] = m_md5.hexdigest("Group" + grp["name"]);
}


/**
 * Make links for bpy_data.
 * executed before compatibility checks from check_bpy_data()
 */
function make_links(bpy_data) {

    var cameras     = bpy_data["cameras"];
    var groups      = bpy_data["groups"];
    var materials   = bpy_data["materials"];
    var meshes      = bpy_data["meshes"];
    var node_groups = bpy_data["node_groups"];
    var objects     = bpy_data["objects"];
    var particles   = bpy_data["particles"];
    var scenes      = bpy_data["scenes"];
    var speakers    = bpy_data["speakers"];
    var textures    = bpy_data["textures"];
    var worlds      = bpy_data["worlds"];

    // NOTE: Temporary check. Can't do it in reformer.
    if (!node_groups) {
        m_print.warn("B4W Warning: \"node_groups\" datablock undefined. reexport main scene.");
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

        //var nla_script = scene["b4w_nla_script"] || [];
        //for (var j = 0; j < nla_script.length; j++) {
        //    var slot = nla_script[j];
        //    if (slot["object"])
        //        make_link_uuid(slot, "object", storage);
        //}
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
        var obj = objects[i];

        if (obj["dupli_group"])
            make_link_uuid(obj, "dupli_group", storage);

        // NOTE: not required anymore
        //if (obj["proxy"]) {
        //    make_link_uuid(obj, "proxy", storage);
        //}

        if (obj["parent"])
            make_link_uuid(obj, "parent", storage);

        if (obj["animation_data"]) {
            var adata = obj["animation_data"];
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

        switch (obj["type"]) {
        case "MESH":

            if (!obj["data"])
                throw "mesh not found for object " + obj["name"];

            make_link_uuid(obj, "data", storage);

            // also make links for armature modifier
            var modifiers = obj["modifiers"];
            for (var j = 0; j < modifiers.length; j++) {
                var modifier = modifiers[j];

                if (modifier["type"] == "ARMATURE")
                    make_link_uuid(modifier, "object", storage);
                else if (modifier["type"] == "CURVE")
                    make_link_uuid(modifier, "object", storage);
            }

            // also make links for possible particle systems
            var psystems = obj["particle_systems"];
            if (psystems) {
                for (var j = 0; j < psystems.length; j++) {
                    var psys = psystems[j];
                    make_link_uuid(psys, "settings", storage);
                }
            }
            break;

        case "ARMATURE":
            make_link_uuid(obj, "data", storage);

            // also make links from pose bones to armature bones
            var pose = obj["pose"];
            var pose_bones = pose["bones"];
            var armature = obj["data"];
            var armature_bones = armature["bones"];
            for (var j = 0; j < pose_bones.length; j++) {
                var pose_bone = pose_bones[j];
                var bone_index = pose_bone["bone"];
                var armature_bone = armature_bones[bone_index];
                pose_bone["bone"] = armature_bone;

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
            make_link_uuid(obj, "data", storage);
            break;
        case "EMPTY":
        default:
            break;
        }

        // make links to constraint targets
        var constraints = obj["constraints"];
        if (constraints) { // compatibility check
            for (var j = 0; j < constraints.length; j++) {
                var cons = constraints[j];
                if (cons["target"])
                    make_link_uuid(cons, "target", storage);
            }
        }

        // make links to lods
        var lods = obj["lod_levels"];
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
    }
}

function process_node_tree(node_tree, storage) {
    var nodes = node_tree["nodes"];
    for (var j = 0; j < nodes.length; j++) {
        var node = nodes[j];

        if ((node["type"] == "MATERIAL" || node["type"] == "MATERIAL_EXT")
                && node["material"])
            make_link_uuid(node, "material", storage);

        if (node["type"] == "TEXTURE" && node["texture"])
            make_link_uuid(node, "texture", storage);

        if (node["type"] == "LAMP" && node["lamp"]) {
            if (node["lamp"]["uuid"] in _dupli_obj_id_overrides)
                node["lamp"]["uuid"] = _dupli_obj_id_overrides[node["lamp"]["uuid"]];
            if (!storage[node["lamp"]["uuid"]])
                m_print.error("Dangling link found:", "lamp", node);
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
    if (cfg_def.do_not_load_resources)
        return;

    var dir_path = dirname(thread.filepath);

    var images = bpy_data["images"];
    var img_by_uri = {};
    var image_assets = [];

    for (var i = 0; i < images.length; i++) {
        var image = images[i];
        var uuid = image["uuid"];

        if (image["source"] === "FILE") {

            var tex_users = find_image_users(image, bpy_data["textures"]);

            if (!tex_users.length) {
                m_print.warn("B4W Warning: image ", image["name"], " has no users.");
                continue;
            }

            if (tex_users[0]["b4w_shore_dist_map"])
                continue;

            var image_path = normpath_preserve_protocol(dir_path + 
                    image["filepath"]);

            if (image._is_dds)
                var asset_type = m_assets.AT_ARRAYBUFFER;
            else
                var asset_type = m_assets.AT_IMAGE_ELEMENT;

            if (cfg_ldr.min50_available && cfg_def.use_min50) {
                var head_ext = m_assets.split_extension(image_path);
                if (head_ext[1] == "dds") {
                    var head_ext_wo_dds = m_assets.split_extension(head_ext[0]);
                    image_path = head_ext_wo_dds[0] + ".min50." +
                        head_ext_wo_dds[1] + ".dds";
                } else
                    image_path = head_ext[0] + ".min50." + head_ext[1];
            }

            image_assets.push([uuid, asset_type, image_path, image["name"]]);
            img_by_uri[uuid] = image;
        }
    }

    if (image_assets.length) {
        cb_param.image_counter = 0;
        var asset_cb = function(image_data, uri, type, path) {

            // process only loaded images
            if (image_data) {
                var show_path_warning = true;
                print_image_info(image_data, path, show_path_warning);

                var image = img_by_uri[uri];
                var tex_users = find_image_users(image, bpy_data["textures"]);
                for (var i = 0; i < tex_users.length; i++) {
                    var tex_user = tex_users[i];
                    var filepath = tex_user["image"]["filepath"];
                    m_tex.update_texture(tex_user._render, image_data,
                                         image._is_dds, filepath);
                }
            }

            var rate = ++cb_param.image_counter / image_assets.length;
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

    if (cfg_def.do_not_load_resources)
        return;

    var objects = get_all_objects_cached(bpy_data, thread.id);
    var dir_path = dirname(thread.filepath);

    var sound_assets = [];

    var spks_by_uuid = {};
    for (var i = 0; i < objects.length; i++) {
        var obj = objects[i];

        if (is_loaded_spk(obj)) {

            var sound = obj["data"]["sound"];
            var uuid = sound["uuid"];

            // BACKGROUND_MUSIC speaker needs a unique resource (unique uuid)
            if (m_sfx.get_spk_behavior(obj) == "BACKGROUND_MUSIC")
                uuid = m_util.gen_uuid();

            if (!(uuid in spks_by_uuid)) {
                spks_by_uuid[uuid] = [];

                var sound_path = normpath_preserve_protocol(
                        dir_path + sound["filepath"]);

                switch (m_sfx.source_type(obj)) {
                case m_sfx.AST_ARRAY_BUFFER:
                    var asset_type = m_assets.AT_AUDIOBUFFER;
                    break;
                case m_sfx.AST_HTML_ELEMENT:
                    var asset_type = m_assets.AT_AUDIO_ELEMENT;
                    break;
                }

                var head_ext = m_assets.split_extension(sound_path);
                var ext = m_sfx.detect_media_container(head_ext[1]);

                if (ext != head_ext[1]) {
                    // skip loading sounds for HTML-exported apps if current
                    // sound format is not supported
                    if (m_assets.is_built_in_data()) {
                        m_loader.skip_stage_by_name(thread, "load_speakers");
                        return;
                    }
                    sound_path = head_ext[0] +".lossconv." + ext;
                } else
                    sound_path = head_ext[0] +"." + ext;

                sound_assets.push([uuid, asset_type, sound_path]);
            }
            spks_by_uuid[uuid].push(obj);
        }
    }

    if (sound_assets.length) {
        var asset_cb = function(sound_data, uuid, type, path) {

            // process only loaded sounds
            if (sound_data) {
                m_print.log("%cLOAD SOUND", "color: #0aa", path);

                if (path.indexOf(_debug_resources_root) == -1)
                    m_print.warn("B4W Warning: sound", path,
                        "is not from app root.");

                var spk_objs = spks_by_uuid[uuid];
                for (var i = 0; i < spk_objs.length; i++)
                    m_sfx.update_spkobj(spk_objs[i], sound_data);
            }

            var rate = ++cb_param.sound_counter / sound_assets.length;
            cb_set_rate(thread, stage, rate);
        }
        var pack_cb = function() {
            m_print.log("%cLOADED ALL SOUNDS", "color: #0aa");
            speakers_play(m_scenes.get_active());
            cb_finish(thread, stage);
        }

        m_assets.enqueue(sound_assets, asset_cb, pack_cb);

    } else
        cb_finish(thread, stage);
}

function is_loaded_spk(obj) {
    if (m_sfx.is_speaker(obj) && m_sfx.source_type(obj) != m_sfx.AST_NONE)
        return true;
    else
        return false;
}

/**
 * Find speaker objects
 * NOTE: unused
 */
function find_sound_users(sound, objects) {

    var spk_sound_users = [];

    for (var i = 0; i < objects.length; i++) {
        var obj = objects[i];
        if (is_loaded_spk(obj) && obj["data"]["sound"] === sound)
            spk_sound_users.push(obj);
    }

    return spk_sound_users;
}

function speakers_play(scene) {
    var spk_objs = m_scenes.get_scene_objs(scene, "SPEAKER",
            m_scenes.DATA_ID_ALL);
    for (var i = 0; i < spk_objs.length; i++) {
        var sobj = spk_objs[i];

        if (!m_sfx.is_speaker(sobj))
            continue;

        // NOTE: autostart cyclic
        if (m_sfx.is_cyclic(sobj))
            m_sfx.play_def(sobj);
    }
}


function start_nla(bpy_data, thread, stage, cb_param, cb_finish, cb_set_rate) {
    m_nla.start();
    m_print.log("%cSTART NLA", "color: #0a0");
    cb_finish(thread, stage);
}


/**
 * Check if scene is compatible with engine
 */
function check_scene(bpy_scene) {
    // check camera existence
    if (!bpy_scene["camera"])
        throw "Scene check failed: No camera";

    var lamp_objs = m_scenes.combine_scene_objects(bpy_scene, "LAMP");
    if (!lamp_objs.length)
        throw "Scene check failed: No lamp";
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

function prepare_actions(actions, data_id) {
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
function prepare_lods(bpy_data) {

    var scenes = bpy_data["scenes"];

    for (var i = 0; i < scenes.length; i++) {
        var scene = scenes[i];

        // array of [container, object] pairs
        var added_objs = [];
        // array of objects
        var removed_objs = [];

        var scene_objs = scenes[i]["objects"];

        for (var j = 0; j < scene_objs.length; j++) {
            var obj = scene_objs[j];

            prepare_obj_lods(scene_objs, obj, added_objs,
                    removed_objs);

            var dupli_group = obj["dupli_group"];
            if (dupli_group) {
                var dg_objects = dupli_group["objects"];

                for (var k = 0; k < dg_objects.length; k++) {
                    var dg_obj = dg_objects[k];

                    prepare_obj_lods(dg_objects, dg_obj,
                            added_objs, removed_objs);
                }
            }
        }

        for (var j = 0; j < removed_objs.length; j++)
            remove_object(removed_objs[j], [scene]);

        for (var j = 0; j < added_objs.length; j++)
            m_util.append_unique(added_objs[j][0], added_objs[j][1]);
    }
}

function prepare_obj_lods(container, obj, added_objs, removed_objs) {

    if (!(obj["lod_levels"] && obj["lod_levels"].length))
        return;

    var lods_num = obj["lod_levels"].length;

    for (var i = 0; i < lods_num; i++) {
        var lod = obj["lod_levels"][i];
        var lod_obj = lod["object"];

        if (!lod_obj)
            continue;

        var lod_obj_new = m_util.clone_object_nr(lod_obj);

        lod_obj_new["name"] = obj["name"] + "_LOD_" +
                String(i + 1);

        assign_obj_id(lod_obj_new);

        lod_obj_new["lod_levels"] = [];

        added_objs.push([container, lod_obj_new]);
        removed_objs.push(lod_obj);

        lod["object"] = lod_obj_new;
    }
}

/**
 * Remove objects and empties referenced by hair particle systems
 */
function prepare_hair_particles(bpy_data) {
    var scenes = bpy_data["scenes"];

    for (var i = 0; i < scenes.length; i++) {
        var scene = scenes[i];

        var objects = m_scenes.combine_scene_objects(scene, "ALL");
        var removed_objs = [];

        for (var j = 0; j < objects.length; j++) {
            var obj = objects[j];

            var psystems = obj["particle_systems"];
            for (var k = 0; k < psystems.length; k++) {
                var psys = psystems[k];
                var pset = psys["settings"];

                if (pset["type"] != "HAIR")
                    continue;

                if (pset["render_type"] == "OBJECT") {
                    //removed_objs.push(pset["dupli_object"]);
                    // NOTE: Make partial update, because we need some render/color_id
                    // info later
                    m_obj.update_object(pset["dupli_object"], true);

                } else if (pset["render_type"] == "GROUP") {

                    var dg = pset["dupli_group"];

                    // find EMPTY object
                    var empty_objs = m_scenes.combine_scene_objects(scene, "EMPTY");

                    for (var n = 0; n < empty_objs.length; n++)
                        if (empty_objs[n]["dupli_group"] == dg)
                            removed_objs.push(empty_objs[n]);

                    for (var n = 0; n < dg["objects"].length; n++)
                        m_obj.update_object(dg["objects"][n], true);
                } else
                    m_print.warn("B4W Warning: render type", pset["render_type"],
                            "not supported for particle systems (" + pset["name"] + ").");
            }
        }

        for (var j = 0; j < removed_objs.length; j++) {
            remove_object(removed_objs[j], [scene]);
        }
    }
}

/**
 * Calculate upper limit for number of bones used in vertex shader
 * to minimize shader variations
 */
function calc_max_bones(objects) {

    var upper_max_bones = -1;

    // calc
    for (var i = 0; i < objects.length; i++) {
        var obj = objects[i];
        var render = obj._render;

        if (!(m_util.is_mesh(obj) && render.is_skinning))
            continue;

        var max_bones = render.max_bones;

        if (max_bones > upper_max_bones)
            upper_max_bones = max_bones;

    }

    // assign
    for (var i = 0; i < objects.length; i++) {
        var obj = objects[i];
        var render = obj._render;

        if (!(m_util.is_mesh(obj) && render.is_skinning))
            continue;

        render.max_bones = upper_max_bones;
        set_frames_blending(obj, render.max_bones);
    }
}

function set_frames_blending(obj, num_bones) {

    var max_bones = cfg_def.max_bones;
    var render = obj._render;

    if (num_bones > 2 * max_bones)
        m_util.panic("B4W Error: too many bones for \"" + obj["name"] + "\"");
    else if (num_bones > max_bones) {
        m_print.warn("B4W Warning: too many bones for \"" + obj["name"] + "\" / " +
            num_bones + " bones (max " + max_bones +
            "). Blending between frames will be disabled.");

        // causes optimizing out the half of the uniform arrays,
        // effectively doubles the limit of bones
        render.frames_blending = false;
    } else
        render.frames_blending = true;

    render.frames_blending = render.frames_blending
            && !cfg_anim.frames_blending_hack;

}

function prepare_lod_objects(objects) {

    for (var i = 0; i < objects.length; i++) {
        var obj = objects[i];

        if (!m_util.is_mesh(obj))
            continue;

        var lods_num = obj["lod_levels"].length;

        if (!lods_num)
            continue;

        var prev_lod_obj = obj;

        for (var j = 0; j < lods_num; j++) {
            var lod_obj = obj["lod_levels"][j]["object"];

            if (!lod_obj) {
                prev_lod_obj._render.last_lod = true;
                prev_lod_obj._render.lod_dist_max = obj["lod_levels"][j]["distance"];
                break;
            }

            // inherit transition ratio from the first LOD
            lod_obj._render.lod_transition_ratio = obj._render.lod_transition_ratio;

            prev_lod_obj._render.lod_dist_max = obj["lod_levels"][j]["distance"];
            lod_obj._render.lod_dist_min = obj["lod_levels"][j]["distance"];

            if (obj["lod_levels"][j + 1])
                lod_obj._render.lod_dist_max = obj["lod_levels"][j + 1]["distance"];
            else {
                lod_obj._render.last_lod = true;
                lod_obj._render.lod_dist_max = 10000;
                break;
            }

            prev_lod_obj._render.last_lod = false;

            prev_lod_obj = lod_obj;
        }

        if (DEBUG_LOD_DIST_NOT_SET &&
            obj["lod_levels"][lods_num - 1]["distance"] === 10000)
            m_print.warn("B4W Warning: object \"" + obj["name"]
                + "\" has default LOD distance.");
    }
}


function get_lod_by_index(bpy_obj, index) {
    var constraints = bpy_obj["constraints"];
    var num = 0;

    for (var i = 0; i < constraints.length; i++) {
        var cons = constraints[i];

        // LODs take place in LOCKED_TRACK constraint
        if (cons["type"] == "LOCKED_TRACK") {
            if (index === num)
                return cons["target"];
            num++;
        }
    }

    return null;
}

function prepare_vehicles(objects) {

    for (var i = 0; i < objects.length; i++) {
        var obj_i = objects[i];


        if (!obj_i["b4w_vehicle"])
            continue;

        var vh_set_i = obj_i["b4w_vehicle_settings"];

        if (vh_set_i["part"] == "CHASSIS") {

            obj_i._vehicle = {};

            obj_i._vehicle.force_max = vh_set_i["force_max"];
            obj_i._vehicle.brake_max = vh_set_i["brake_max"];
            obj_i._vehicle.suspension_compression = vh_set_i["suspension_compression"];
            obj_i._vehicle.suspension_stiffness = vh_set_i["suspension_stiffness"];
            obj_i._vehicle.suspension_damping = vh_set_i["suspension_damping"];
            obj_i._vehicle.wheel_friction = vh_set_i["wheel_friction"];
            obj_i._vehicle.roll_influence = vh_set_i["roll_influence"];
            obj_i._vehicle.max_suspension_travel_cm = vh_set_i["max_suspension_travel_cm"];
            obj_i._vehicle.engine_force = 0;
            obj_i._vehicle.brake_force = 1;
            obj_i._vehicle.steering = 0;
            obj_i._vehicle.speed = 0;

            // links to wheel objects
            obj_i._vehicle.props = [];
            obj_i._vehicle.prop_offsets = [];
            obj_i._vehicle.steering_wheel = null;

            // check dupli groups for car objects
            if (obj_i._dg_parent)
                var car_objects = obj_i._dg_parent["dupli_group"]["objects"];
            else
                var car_objects = objects;

            for (var j = 0; j < car_objects.length; j++) {
                var obj_j = car_objects[j];

                if (!obj_j["b4w_vehicle"])
                    continue;

                var vh_set_j = obj_j["b4w_vehicle_settings"];

                if (m_phy.is_car_wheel(obj_j) && vh_set_i["name"] == vh_set_j["name"]) {
                    var w_index = m_phy.wheel_index(obj_j["b4w_vehicle_settings"]["part"]);
                    obj_i._vehicle.props[w_index] = obj_j;

                    obj_i._vehicle.prop_offsets[w_index] = new Float32Array(8);

                } else if (m_phy.is_vehicle_steering_wheel(obj_j) && vh_set_i["name"] == vh_set_j["name"]) {
                    obj_i._vehicle.steering_wheel = obj_j;

                    obj_i._vehicle.steering_max = vh_set_j["steering_max"];
                    obj_i._vehicle.steering_ratio = vh_set_j["steering_ratio"];
                    obj_i._vehicle.inverse_control = vh_set_j["inverse_control"];

                    var wm_inv = m_mat4.invert(obj_i._render.world_matrix,
                            new Float32Array(16));

                    var steering_wheel_matrix = m_mat4.multiply(wm_inv,
                            obj_j._render.world_matrix, wm_inv);
                    obj_i._vehicle.steering_wheel_matrix = steering_wheel_matrix;

                    var steering_wheel_axis = new Float32Array([1,0,0,0]);
                    m_vec4.transformMat4(steering_wheel_axis, steering_wheel_matrix,
                            steering_wheel_axis);
                    obj_i._vehicle.steering_wheel_axis = steering_wheel_axis;
                } else if (m_phy.is_vehicle_speedometer(obj_j) && vh_set_i["name"] == vh_set_j["name"]) {

                    obj_i._vehicle.speedometer = obj_j;

                    obj_i._vehicle.speed_ratio = vh_set_j["speed_ratio"];
                    obj_i._vehicle.max_speed_angle = vh_set_j["max_speed_angle"];

                    var wm_inv = m_mat4.invert(obj_i._render.world_matrix,
                            new Float32Array(16));

                    var speedometer_matrix = m_mat4.multiply(wm_inv,
                            obj_j._render.world_matrix, wm_inv);
                    obj_i._vehicle.speedometer_matrix = speedometer_matrix;

                    var speedometer_axis = new Float32Array([1,0,0,0]);
                    m_vec4.transformMat4(speedometer_axis, speedometer_matrix, speedometer_axis);
                    obj_i._vehicle.speedometer_axis = speedometer_axis;
                } else if (m_phy.is_vehicle_tachometer(obj_j) && vh_set_i["name"] == vh_set_j["name"]) {

                    obj_i._vehicle.tachometer = obj_j;

                    obj_i._vehicle.delta_tach_angle = vh_set_j["delta_tach_angle"];

                    var wm_inv = m_mat4.invert(obj_i._render.world_matrix,
                            new Float32Array(16));

                    var tachometer_matrix = m_mat4.multiply(wm_inv,
                            obj_j._render.world_matrix, wm_inv);
                    obj_i._vehicle.tachometer_matrix = tachometer_matrix;

                    var tachometer_axis = new Float32Array([1,0,0,0]);
                    m_vec4.transformMat4(tachometer_axis, tachometer_matrix,
                            tachometer_axis);
                    obj_i._vehicle.tachometer_axis = tachometer_axis;
                }
            }

            if (obj_i._vehicle.props.length != 4)
                throw "Not enough wheels for chassis " + obj_i["name"];

        } else if (vh_set_i["part"] == "HULL") {

            obj_i._vehicle = {};
            obj_i._vehicle.props = [];
            obj_i._vehicle.prop_offsets = [];

            obj_i._vehicle.force_max = vh_set_i["force_max"];
            obj_i._vehicle.brake_max = vh_set_i["brake_max"];
            obj_i._vehicle.floating_factor = vh_set_i["floating_factor"];
            obj_i._vehicle.water_lin_damp = vh_set_i["water_lin_damp"];
            obj_i._vehicle.water_rot_damp = vh_set_i["water_rot_damp"];
            obj_i._vehicle.engine_force = 0;
            obj_i._vehicle.brake_force = 1;
            obj_i._vehicle.steering = 0;
            obj_i._vehicle.speed = 0;

            // links to bob objects
            obj_i._vehicle.steering_wheel = null;

            // check dupli groups for boat objects
            if (obj_i._dg_parent)
                var boat_objects = obj_i._dg_parent["dupli_group"]["objects"];
            else
                var boat_objects = objects;

            for (var j = 0; j < boat_objects.length; j++) {
                var obj_j = boat_objects[j];

                if (!obj_j["b4w_vehicle"])
                    continue;

                var vh_set_j = obj_j["b4w_vehicle_settings"];

                if (m_phy.is_boat_bob(obj_j) && vh_set_i["name"] == vh_set_j["name"]) {
                    obj_i._vehicle.props.push(obj_j);
                    obj_i._vehicle.prop_offsets.push(new Float32Array(8));

                } else if (m_phy.is_vehicle_steering_wheel(obj_j) && vh_set_i["name"] == vh_set_j["name"]) {
                    obj_i._vehicle.steering_wheel = obj_j;

                    obj_i._vehicle.steering_max = vh_set_j["steering_max"];
                    obj_i._vehicle.steering_ratio = vh_set_j["steering_ratio"];
                    obj_i._vehicle.inverse_control = vh_set_j["inverse_control"];

                    var wm_inv = m_mat4.invert(obj_i._render.world_matrix,
                            new Float32Array(16));

                    var steering_wheel_matrix = m_mat4.multiply(wm_inv,
                            obj_j._render.world_matrix, wm_inv);
                    obj_i._vehicle.steering_wheel_matrix = steering_wheel_matrix;

                    var steering_wheel_axis = new Float32Array([1,0,0,0]);
                    m_vec4.transformMat4(steering_wheel_axis, steering_wheel_matrix,
                            steering_wheel_axis);
                    obj_i._vehicle.steering_wheel_axis = steering_wheel_axis;
                } else if (m_phy.is_vehicle_speedometer(obj_j) && vh_set_i["name"] == vh_set_j["name"]) {

                    obj_i._vehicle.speedometer = obj_j;

                    obj_i._vehicle.speed_ratio = vh_set_j["speed_ratio"];
                    obj_i._vehicle.max_speed_angle = vh_set_j["max_speed_angle"];

                    var wm_inv = m_mat4.invert(obj_i._render.world_matrix,
                            new Float32Array(16));

                    var speedometer_matrix = m_mat4.multiply(wm_inv,
                            obj_j._render.world_matrix, wm_inv);
                    obj_i._vehicle.speedometer_matrix = speedometer_matrix;

                    var speedometer_axis = new Float32Array([1,0,0,0]);
                    m_vec4.transformMat4(speedometer_axis, speedometer_matrix,
                            speedometer_axis);
                    obj_i._vehicle.speedometer_axis = speedometer_axis;
                } else if (m_phy.is_vehicle_tachometer(obj_j) && vh_set_i["name"] == vh_set_j["name"]) {

                    obj_i._vehicle.tachometer = obj_j;

                    obj_i._vehicle.delta_tach_angle = vh_set_j["delta_tach_angle"];

                    var wm_inv = m_mat4.invert(obj_i._render.world_matrix,
                            new Float32Array(16));

                    var tachometer_matrix = m_mat4.multiply(wm_inv,
                            obj_j._render.world_matrix, wm_inv);
                    obj_i._vehicle.tachometer_matrix = tachometer_matrix;

                    var tachometer_axis = new Float32Array([1,0,0,0]);
                    m_vec4.transformMat4(tachometer_axis, tachometer_matrix,
                            tachometer_axis);
                    obj_i._vehicle.tachometer_axis = tachometer_axis;
                }
            }
        }
    }
}

function prepare_floaters(objects) {
    for (var i = 0; i < objects.length; i++) {
        var obj_i = objects[i];

        if (!obj_i["b4w_floating"])
            continue;

        var fl_set_i = obj_i["b4w_floating_settings"];

        if (fl_set_i["part"] == "MAIN_BODY") {
            obj_i._floater = {};
            obj_i._floater.floating_factor = fl_set_i["floating_factor"];
            obj_i._floater.water_lin_damp = fl_set_i["water_lin_damp"];
            obj_i._floater.water_rot_damp = fl_set_i["water_rot_damp"];

            // links to bob objects
            obj_i._floater.bobs = [];

            // check dupli groups for floater objects
            if (obj_i._dg_parent)
                var bob_objects = obj_i._dg_parent["dupli_group"]["objects"];
            else
                var bob_objects = objects;

            for (var j = 0; j < bob_objects.length; j++) {
                var obj_j = bob_objects[j];

                if (!obj_j["b4w_floating"])
                    continue;

                var fl_set_j = obj_j["b4w_floating_settings"];

                if (m_phy.is_floater_bob(obj_j) && fl_set_i["name"] ==
                        fl_set_j["name"]){
                    obj_i._floater.bobs.push(obj_j);
                    obj_j.bob_synchronize_pos = obj_j["b4w_floating_settings"]["synchronize_position"];
                }
            }
        }
    }
}

/**
 * Remove objects from given scenes (also from dupli_group)
 * remove of already removed objects also supported
 */
function remove_object(remobj, scenes) {

    for (var i = 0; i < scenes.length; i++) {
        var scene_objs = scenes[i]["objects"];

        // from dupli groups
        for (var j = 0; j < scene_objs.length; j++) {
            var obj = scene_objs[j];

            var dupli_group = obj["dupli_group"];
            if (dupli_group) {
                var dg_objects = dupli_group["objects"];

                obj_index = dg_objects.indexOf(remobj);
                if (obj_index > -1)
                    dg_objects.splice(obj_index, 1);
            }
        }

        // from scene
        var obj_index = scene_objs.indexOf(remobj);
        if (obj_index > -1)
            scene_objs.splice(obj_index, 1);
    }
}

/**
 * Find and remove orphan meshes
 */
function remove_orphan_meshes(root_objects, meshes) {

    var orphans = meshes.slice(0);

    for (var i = 0; i < root_objects.length; i++) {
        var obj = root_objects[i];

        if (obj["type"] != "MESH")
            continue;

        var mesh = obj["data"];
        var index = orphans.indexOf(mesh);

        if (index > -1)
            orphans.splice(index, 1);
    }

    for (var i = 0; i < orphans.length; i++) {
        var orphan = orphans[i];
        meshes.splice(meshes.indexOf(orphan), 1);
    }
}

function add_physics_objects(bpy_data, thread, stage, cb_param, cb_finish,
        cb_set_rate) {

    for (var i = 0; i < bpy_data["scenes"].length; i++) {
        var scene = bpy_data["scenes"][i];

        if (_data_is_primary)
            var enable_physics = scene["b4w_enable_physics"];
        else
            var enable_physics = _primary_scene["b4w_enable_physics"]
                || scene["b4w_enable_physics"];

        // secondary data objects are on primary scene already
        if (!_data_is_primary)
            scene = _primary_scene;

        for (var j = 0; j < ADD_PHY_TYPES.length; j++) {
            var type = ADD_PHY_TYPES[j];

            var sobjs = m_scenes.get_scene_objs(scene, type,
                    m_scenes.DATA_ID_ALL);
            for (var k = 0; k < sobjs.length; k++) {
                var obj = sobjs[k];
                // add only currently loaded objects
                if (obj._render.data_id == thread.id)
                    if (cfg_phy.enabled && enable_physics) {
                        m_phy.append_object(obj, scene);
                        // turn off physics for secondary loaded objects
                        if (thread.load_hidden && m_phy.has_physics(obj))
                            m_phy.disable_simulation(obj);
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
                var image_path = normpath_preserve_protocol(dir_path + 
                        image["filepath"]);

                if (image._is_dds)
                    var asset_type = m_assets.AT_ARRAYBUFFER;
                else
                    var asset_type = m_assets.AT_IMAGE_ELEMENT;

                image_assets.push([uuid, asset_type, image_path, image["name"]]);
                img_by_uri[uuid] = image;
            }
        }
    }

    if (image_assets.length) {
        var asset_cb = function(html_image, uri, type, path) {

            if (!html_image) // image not loaded
                return;

            var show_path_warning = true;
            print_image_info(html_image, path, show_path_warning);
            var image = img_by_uri[uri];
            var tex_users = find_image_users(image, bpy_data["textures"]);
            for (var i = 0; i < tex_users.length; i++) {
                var tex_user = tex_users[i];
                var filepath = tex_user["image"]["filepath"];
                m_tex.update_texture(tex_user._render, html_image,
                                     image._is_dds, filepath);
            }

            for (var i = 0; i < bpy_scenes.length; i++) {
                var scene = bpy_scenes[i];
                var shr_image = scene._render.water_params.shoremap_image;
                if (shr_image === image)
                    update_scene_shore_distance(html_image, image, scene);
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

    if (!cfg_def.antialiasing || !cfg_def.smaa) {
        cb_finish(thread, stage);
        return;
    }

    var scene = bpy_data["scenes"][0];

    var subs_smaa_arr = []
    var smaa_passes_names = ["SMAA_EDGE_DETECTION",
                             "SMAA_BLENDING_WEIGHT_CALCULATION",
                             "SMAA_NEIGHBORHOOD_BLENDING",
                             "SMAA_RESOLVE"];

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
    smaa_images.push(["SEARCH_TEXTURE", asset_type, search_texture_path,
                       "smaa_search_texture"]);

    var area_texture_path = m_cfg.paths.smaa_area_texture_path;
    smaa_images.push(["AREA_TEXTURE", asset_type, area_texture_path,
                       "smaa_area_texture"]);

    for (var i = 0; i < subs_smaa_arr.length; i++) {
        var subs_smaa = subs_smaa_arr[i];

        if (subs_smaa.type == "SMAA_BLENDING_WEIGHT_CALCULATION") {
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
            m_tex.update_texture(texture, image_data, is_dds, path);
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
        if (!_data_is_primary)
            scene = _primary_scene;

        var sobjs = m_scenes.get_scene_objs(scene, "ALL", m_scenes.DATA_ID_ALL);
        for (var j = 0; j < sobjs.length; j++) {
            var obj = sobjs[j];

            // add only currently loaded objects
            if (obj._render.data_id == thread.id) {
                if (thread.load_hidden)
                    m_scenes.hide_object(obj);
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

    if (!obj_data)
        var rate = 1;
    else {
        var obj = obj_data[obj_counter].obj;
        var scene = obj_data[obj_counter].scene;

        m_scenes.append_object(scene, obj);
        if (ADD_SFX_TYPES.indexOf(obj["type"]) != -1
                && scene["b4w_enable_audio"])
            m_sfx.append_object(obj, scene);

        var rate = ++cb_param.obj_counter / obj_data.length;
    }

    cb_set_rate(thread, stage, rate);
}

function end_objects_adding(bpy_data, thread, stage, cb_param, cb_finish,
        cb_set_rate) {

    if (_data_is_primary) {
        for (var i = 0; i < bpy_data["scenes"].length; i++) {
            var scene = bpy_data["scenes"][i];
            m_scenes.sort_lamps(scene);
            m_scenes.prepare_rendering(scene);

            if (scene["b4w_use_nla"])
                m_nla.update_scene_nla(scene, scene["b4w_nla_cyclic"]);
        }

        // NOTE: set first scene as active
        var scene0 = bpy_data["scenes"][0];
        m_scenes.set_active(scene0);
    } else
        m_scenes.update_scene_permanent_uniforms(_primary_scene);

    var objects = get_all_objects_cached(bpy_data, thread.id);
    m_obj.update_objects_dynamics(objects);
    cb_finish(thread, stage);
}

/**
 * Drop mesh geometry (submeshes)
 */
function cleanup_meshes(objects) {
    for (var i = 0; i < objects.length; i++) {
        var obj = objects[i];

        if (obj["type"] != "MESH")
            continue;

        var mesh = obj["data"];
        delete mesh["submeshes"];
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
 * Normalize path, based on python os.path.normpath() function
 */
function normpath(path) {
    var sep = '/';
    var empty = '';
    var dot = '.';
    var dotdot = '..';

    if (path == empty)
        return dot;

    var initial_slashes = (path.indexOf(sep) == 0) | 0;

    // allow one or two initial slashes, more than two treats as single
    if (initial_slashes && (path.indexOf(sep + sep) == 0)
            && (path.indexOf(sep + sep + sep) != 0))
        initial_slashes = 2;

    var comps = path.split(sep);
    var new_comps = [];
    for (var i = 0; i < comps.length; i++) {
        var comp = comps[i];
        if (comp == empty || comp == dot)
            continue;
        if (comp != dotdot || (!initial_slashes && !new_comps.length)
                || (new_comps.length && (new_comps[new_comps.length - 1] == dotdot)))
            new_comps.push(comp);
        else if (new_comps.length)
            new_comps.pop();
    }

    comps = new_comps;
    path = comps.join(sep);
    for (var i = 0; i < initial_slashes; i++)
        path = sep + path;

    return path || dot;
}

function normpath_preserve_protocol(dir_path) {
    var separated_str = dir_path.split('://',2);
    if (separated_str.length > 1) {
        separated_str[1] = normpath(separated_str[1]);
        return separated_str.join('://');
    } else
        return normpath(dir_path);   
}

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
        "prepare_bindata": {
            priority: m_loader.SYNC_PRIORITY,
            background_loading: false,
            inputs: ["duplicate_objects", "load_binaries"],
            is_resource: false,
            relative_size: 0,
            primary_only: false,
            cb_before: prepare_bindata
        },
        "prepare_root_datablocks": {
            priority: m_loader.SYNC_PRIORITY,
            background_loading: false,
            inputs: ["duplicate_objects", "prepare_bindata"],
            is_resource: false,
            relative_size: 150,
            primary_only: false,
            cb_before: prepare_root_datablocks
        },
        "prepare_root_scenes": {
            priority: m_loader.SYNC_PRIORITY,
            background_loading: false,
            inputs: ["prepare_root_datablocks"],
            is_resource: false,
            relative_size: 350,
            primary_only: false,
            cb_before: prepare_root_scenes
        },
        "load_smaa_textures": {
            priority: m_loader.ASYNC_PRIORITY,
            background_loading: true,
            inputs: ["prepare_root_scenes"],
            is_resource: false,
            relative_size: 10,
            primary_only: true,
            cb_before: load_smaa_textures
        },
        "load_shoremap": {
            priority: m_loader.ASYNC_PRIORITY,
            background_loading: true,
            inputs: ["prepare_root_scenes"],
            is_resource: false,
            relative_size: 10,
            primary_only: true,
            cb_before: load_shoremap
        },
        "load_textures": {
            priority: m_loader.ASYNC_PRIORITY,
            background_loading: true,
            inputs: ["prepare_root_scenes"],
            is_resource: true,
            relative_size: 500,
            primary_only: false,
            cb_before: load_textures,
            cb_param: {
                image_counter: 0
            }
        },
        "add_physics_objects": {
            priority: m_loader.SYNC_PRIORITY,
            background_loading: false,
            inputs: ["load_shoremap"],
            is_resource: false,
            relative_size: 20,
            primary_only: false,
            cb_before: add_physics_objects
        },
        "add_objects": {
            priority: m_loader.SYNC_PRIORITY,
            background_loading: false,
            inputs: ["add_physics_objects"],
            is_resource: false,
            relative_size: 800,
            primary_only: false,
            cb_before: prepare_objects_adding,
            cb_loop: add_objects,
            cb_after: end_objects_adding,
            cb_param: {
                added_objects: [],
                obj_counter: 0
            }
        },
        "load_speakers": {
            priority: m_loader.ASYNC_PRIORITY,
            background_loading: true,
            inputs: ["add_objects"],
            is_resource: true,
            relative_size: 30,
            primary_only: false,
            cb_before: load_speakers,
            cb_param: {
                sound_counter: 0
            }
        },
        "start_nla": {
            priority: m_loader.SYNC_PRIORITY,
            background_loading: true,
            inputs: ["load_speakers"],
            is_resource: false,
            relative_size: 5,
            primary_only: false,
            cb_before: start_nla
        }
    };

    var scheduler = m_loader.get_scheduler();
    if (!scheduler) {
        scheduler = m_loader.create_scheduler();
        _bpy_data_array = [];
        _all_objects_cache = [];
        _dupli_obj_id_overrides = {};
    }

    _bpy_data_array[scheduler.threads.length] = {};
    var data_id = m_loader.create_thread(stages, path, loaded_cb, stageload_cb,
            free_load_data, wait_complete_loading,
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

        m_anim.cleanup();
        m_sfx.cleanup();
        m_nla.cleanup();
        m_scenes.cleanup();
        m_loader.cleanup();
        m_phy.cleanup();
        m_obj.cleanup();
        m_util.cleanup();
        m_render.cleanup();
        m_nodemat.cleanup();
        m_shaders.cleanup();
        m_ctl.cleanup();
        m_ext.cleanup();
        m_assets.cleanup();

        _all_objects_cache = null;
        _dupli_obj_id_overrides = {};
        _data_is_primary = false;
        _primary_scene = null;
        _bpy_data_array = null;
    } else {
        m_print.log("%cUNLOAD DATA " + data_id, "color: #00a");

        // actions cleanup
        m_anim.remove_actions(data_id);

        // unload objects
        var scenes = m_scenes.get_all_scenes();
        for (var i = 0; i < scenes.length; i++) {
            var scene = scenes[i];
            var objs = m_scenes.get_scene_objs(scene, "ALL",
                    m_scenes.DATA_ID_ALL);

            for (var j = objs.length - 1; j >= 0; j--) {
                var obj = objs[j];
                if (obj._render.data_id == data_id) {

                    prepare_object_unloading(scene, obj);

                    // remove objects from scene
                    objs.splice(j, 1); // removing from scene._objects["ALL"]
                    var typed_objs = m_scenes.get_scene_objs(scene, obj["type"],
                            m_scenes.DATA_ID_ALL);
                    var ind = typed_objs.indexOf(obj);
                    if (ind != -1)
                        typed_objs.splice(ind, 1);
                }
            }
        }
    }
}

function prepare_object_unloading(scene, obj) {
    // anim cleanup
    if (m_anim.is_animated(obj))
        m_anim.remove(obj);

    // scenes cleanup
    m_scenes.clear_glow_anim(obj);

    // physics cleanup
    if (m_phy.has_physics(obj)) {
        m_phy.disable_simulation(obj);
        m_phy.remove_bounding_object(obj);
    }

    // controls cleanup
    if (m_ctl.check_sensor_manifold(obj))
        m_ctl.remove_sensor_manifold(obj);

    // unload objects
    m_scenes.remove_object_bundles(scene, obj);

    // unload sounds / speaker cleanup
    if (m_sfx.is_speaker(obj))
        m_sfx.speaker_remove(obj);
}

exports.set_debug_resources_root = function(debug_resources_root) {

    _debug_resources_root = debug_resources_root;
}

/**
 * Get all unique objects from all scenes.
 * do not try to modify objects by this link
 */
function get_all_objects_cached(bpy_data, data_id) {
    if (!_all_objects_cache[data_id])
        update_all_objects(bpy_data, data_id);

    return _all_objects_cache[data_id];
}

/**
 * Update all objects hierarchical cache using breadth-first search algorithm.
 * NOTE: do proper cache update to prevent misterious bugs
 */
function update_all_objects(bpy_data, data_id) {
    var scenes = bpy_data["scenes"];

    // double hierarchy: groups than parents
    var object_levels = [];

    for (var i = 0; i < scenes.length; i++) {
        var scene_objs = scenes[i]["objects"];
        update_all_objects_iter(scene_objs, 0, object_levels);
    }

    _all_objects_cache[data_id] = [];

    for (var i = 0; i < object_levels.length; i++) {
        var grp_level = object_levels[i];

        for (var j = 0; j < grp_level.length; j++) {
            var par_level = grp_level[j];

            for (var k = 0; k < par_level.length; k++)
                _all_objects_cache[data_id].push(par_level[k]);
        }
    }
}

function update_all_objects_iter(objects, grp_num, object_levels) {

    // initialize new group level
    object_levels[grp_num] = object_levels[grp_num] || [];
    var group_level = object_levels[grp_num];

    for (var i = 0; i < objects.length; i++) {
        var obj = objects[i];

        var pnum = parent_num(obj);

        // initialize new parent level
        group_level[pnum] = group_level[pnum] || [];

        // don't process LAMP and CAMERA objects on secondary load
        if (_data_is_primary
                || SECONDARY_LOAD_TYPES_DISABLED.indexOf(obj["type"]) == -1)
            // push unique (other scenes may link to same object)
            if (group_level[pnum].indexOf(obj) == -1)
                group_level[pnum].push(obj);

        var dupli_group = obj["dupli_group"];
        if (dupli_group) {
            var dg_objects = dupli_group["objects"];
            update_all_objects_iter(dg_objects, grp_num + 1, object_levels);
        }
    }
}

function parent_num(obj) {
    var par = obj["parent"] || m_anim.get_first_armature_object(obj);
    if (par)
        return 1 + parent_num(par);
    else
        return 0;
}

}
