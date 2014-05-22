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
var m_bounds    = require("__boundings");
var m_cam       = require("__camera");
var m_cfg       = require("__config");
var m_cons      = require("__constraints");
var m_ctl       = require("__controls");
var m_curve     = require("__curve");
var m_dds       = require("__dds");
var m_debug     = require("__debug");
var m_ext       = require("__extensions");
var m_lights    = require("__lights");
var m_loader    = require("__loader");
var m_assets    = require("__assets");
var m_md5       = require("__md5");
var m_particles = require("__particles");
var m_prerender = require("__prerender");
var m_phy       = require("__physics");
var m_print     = require("__print");
var m_reformer  = require("__reformer");
var m_render    = require("__renderer");
var m_scenes    = require("__scenes");
var m_nla       = require("__nla");
var m_sfx       = require("__sfx");
var m_shaders   = require("__shaders");
var m_tex       = require("__textures");
var m_tsr       = require("__tsr");
var m_trans     = require("__transform");
var m_nodemat   = require("__nodemat");
var m_util      = require("__util");

var m_vec3 = require("vec3");
var m_vec4 = require("vec4");
var m_mat4 = require("mat4");

var cfg_def = m_cfg.defaults;
var cfg_ldr = m_cfg.assets;
var cfg_phy = m_cfg.physics;

var DEBUG_DISABLE_BATCHING = false;
var DEBUG_BPYDATA = false;
var DEBUG_LOD_DIST_NOT_SET = false;

var _quat4_tmp = new Float32Array(4);

var _bpy_data = {};
var _scheduler = null;
var _all_objects_cache = null;
var _color_id_counter = 0;
var _debug_resources_root = "";

// sequence to load objects on scene
var ADD_TYPES = ["LAMP", "EMPTY", "CAMERA", "SPEAKER", "MESH", "ARMATURE"];
var ADD_PHY_TYPES = ["MESH", "CAMERA", "EMPTY"];
var ADD_SFX_TYPES = ["SPEAKER"];

/**
 * Check if engine loaded (detect last loading stage)
 */
exports.is_loaded = function() {
    var scheduler = get_scheduler();
    return m_loader.is_loaded(scheduler);
}

function get_scheduler() {
    return _scheduler;
}

/**
 * Executed every frame
 */
exports.update = function() {

    var bpy_data = get_bpy_data();
    var scheduler = get_scheduler();
    m_loader.update_scheduler(scheduler, bpy_data);
}

function free_load_data(bpy_data, scheduler) {
    // free memory
    //m_assets.cleanup();
    cleanup_meshes(get_all_objects(bpy_data));
    set_bpy_data({});  
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
        m_print.warn("B4W Warning: image", image_path, "is not from app root");
}

/**
 * Load main json
 */
function load_main(bpy_data, scheduler, stage, cb_param, cb_finish, 
        cb_set_rate) {

    var main_path = scheduler.filepath;
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

        scheduler.binary_name = bpy_data["binaries"][0]["binfile"];
        if (!scheduler.binary_name) {
            m_loader.skip_stage_by_name(scheduler, "load_binaries");
            m_loader.skip_stage_by_name(scheduler, "prepare_bindata");
        }
        show_export_warnings(bpy_data);
        cb_finish(scheduler, stage);
    }

    var progress_cb = function(rate) {
        cb_set_rate(scheduler, stage, rate);
    }

    m_assets.enqueue([[main_path, m_assets.AT_JSON, main_path]], asset_cb, null, 
            progress_cb);
}

function show_export_warnings(bpy_data) {
    if (bpy_data["b4w_export_warnings"])
        for (var i = 0; i < bpy_data["b4w_export_warnings"].length; i++)
            m_print.error("EXPORT WARNING:", 
                    bpy_data["b4w_export_warnings"][i]);
}

/**
 * Load binary file
 */
function load_binaries(bpy_data, scheduler, stage, cb_param, cb_finish, 
        cb_set_rate) {
    var binary_path = dirname(scheduler.filepath) + scheduler.binary_name;

    if (!binary_path)
        throw "Binary data is missing";

    var binary_cb = function(bin_data, uri, type, path) {

        if (!bin_data) // Failed to load scene binary file
            return;

        m_print.log("%cLOAD BINARY", "color: #616", path);

        bpy_data["bin_data"] = bin_data;
        cb_finish(scheduler, stage);
    }

    var progress_cb = function(rate) {
        cb_set_rate(scheduler, stage, rate);
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
function prepare_bindata(bpy_data, scheduler, stage, cb_param, cb_finish, 
        cb_set_rate) {

    var bin_data = bpy_data["bin_data"];
    var bin_offsets = bpy_data["binaries"][0];

    var objects = bpy_data["objects"];
    var meshes = bpy_data["meshes"];

    var is_le = m_util.check_endians();

    prepare_bindata_submeshes(bin_data, bin_offsets, meshes, is_le);
    prepare_bindata_psystems(bin_data, bin_offsets, objects, is_le);

    cb_finish(scheduler, stage);
}

function prepare_bindata_submeshes(bin_data, bin_offsets, meshes, is_le) {
    var int_props = ["indices"];
    var float_props = ["position", "normal", "tangent", "texcoord", "texcoord2",
             "color", "group"];

    for (var i = 0; i < meshes.length; i++) {
        var submeshes = meshes[i]["submeshes"];

        for (var j = 0; j < submeshes.length; j++) {

            for (var prop_name in submeshes[j]) {
                if (int_props.indexOf(prop_name) != -1) {
                    var offset = submeshes[j][prop_name][0] * 4 + bin_offsets["int"];
                    var length = submeshes[j][prop_name][1];
                    submeshes[j][prop_name] = extract_bindata_uint(bin_data, 
                            offset, length, is_le);
                } else if (float_props.indexOf(prop_name) != -1) {
                    var offset = submeshes[j][prop_name][0] * 4 + bin_offsets["float"];                    
                    var length = submeshes[j][prop_name][1];
                    submeshes[j][prop_name] = extract_bindata_float(bin_data, 
                            offset, length, is_le);
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
            var offset = psys["transforms"][0] * 4 + bin_offsets["float"];
            var length = psys["transforms"][1];
            psys["transforms"] = extract_bindata_float(bin_data, 
                    offset, length, is_le);
        }
    }
}

function extract_bindata_float(bin_data, offset, length, is_le) {
    if (is_le)
        var arr = new Float32Array(bin_data, offset, length);
    else {
        var arr = new Float32Array(length); 
        var dataview = new DataView(bin_data);
        for (var i = 0; i < length; i++)
            arr = dataview.getFloat32(offset + i * 4, true);
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
            arr = dataview.getUint32(offset + i * 4, true);
    }
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

                m_print.warn("B4W Warning: material \"" + materials[j]["name"] 
                    + "\" is not assigned to any faces (object \"" 
                    + obj["name"] + "\")");
                already_reported[mesh_name] = true;
            }
        }
    }
}

/**
 * Prepare root data after main libs loaded
 */
function prepare_root_datablocks(bpy_data, scheduler, stage, cb_param, cb_finish, 
        cb_set_rate) {
    
    make_links(bpy_data);

    m_reformer.check_bpy_data(bpy_data);

    // create textures
    var textures = bpy_data["textures"];
    var global_af = get_global_anisotropic_filtering(bpy_data);
    for (var i = 0; i < textures.length; i++)
        m_tex.create_texture_bpy(textures[i], global_af, bpy_data["scenes"]);

    create_special_materials(bpy_data);

    var def_mat = m_util.keysearch("name", "DEFAULT", bpy_data["materials"]);
    assign_default_material(def_mat, bpy_data["meshes"]);

    report_empty_submeshes(bpy_data);
        
    prepare_actions(bpy_data["actions"]);

    prepare_hair_particles(bpy_data);

    prepare_lod_constraints(bpy_data);
        
    var objects = get_all_objects(bpy_data);
    for (var i = 0; i < objects.length; i++) {
        var obj = objects[i];
        update_object(obj);
    }

    calc_max_bones(objects);
    prepare_lod_objects(objects);
    prepare_vehicles(objects);
    prepare_floaters(objects);

    cb_finish(scheduler, stage);
}

function prepare_root_scenes(bpy_data, scheduler, stage, cb_param, cb_finish, 
        cb_set_rate) {

    for (var i = 0; i < bpy_data["scenes"].length; i++) {

        var scene = bpy_data["scenes"][i];
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
        remove_orphan_meshes(get_all_objects(bpy_data), bpy_data["meshes"]);

        m_scenes.append_scene(scene);
        if (cfg_phy.enabled && scene["b4w_enable_physics"])
            m_phy.attach_scene_physics(scene);

        if (scene["b4w_enable_audio"])
            m_sfx.attach_scene_sfx(scene);

        var meta_objects = m_batch.generate_main_batches(
                m_scenes.get_graph(scene), scene["b4w_batch_grid_size"], 
                scene_objects, bpy_data);
        m_scenes.add_meta_objects(scene, meta_objects);

        m_scenes.generate_auxiliary_batches(m_scenes.get_graph(scene));
    }

    setup_dds_loading(bpy_data);

    if (DEBUG_BPYDATA)
        m_print.log("%cDEBUG BPYDATA:", "color: #a0a", bpy_data);

    cb_finish(scheduler, stage);
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
                        m_print.warn("B4W Warning: material ", material["name"], " has empty textures");
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
 * use value from the first scene because it's diffucult
 * or impossible to assign textures to scenes
 */
function get_global_anisotropic_filtering(bpy_data) {
    return bpy_data["scenes"][0]["b4w_anisotropic_filtering"];
}

/**
 * Prepare object's groups.
 * remove odd objects (proxy sources)
 * unfold dupli_group objects
 */
function duplicate_objects(bpy_data, scheduler, stage, cb_param, cb_finish, 
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

    cb_finish(scheduler, stage);
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
            obj_new["name"] = origin_name_prefix + "*" + obj["name"];
            obj_new["origin_name"] = obj["name"];
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

            var consts = obj["constraints"];
            for (var j = 0; j < consts.length; j++) {
                var cons = consts[j];

                if (cons["target"]["uuid"] in obj_id_overrides)
                    cons["target"]["uuid"] = obj_id_overrides[cons["target"]["uuid"]];
            }

            var mods = obj["modifiers"];
            for (var j = 0; j < mods.length; j++) {
                var mod = mods[j];

                if (mod["object"] && (mod["object"]["uuid"] in obj_id_overrides))
                    mod["object"]["uuid"] = obj_id_overrides[mod["object"]["uuid"]];
            }
        }
    }
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
    
    var cameras   = bpy_data["cameras"];
    var groups    = bpy_data["groups"];
    var materials = bpy_data["materials"];
    var meshes    = bpy_data["meshes"];
    var objects   = bpy_data["objects"];
    var particles = bpy_data["particles"];
    var scenes    = bpy_data["scenes"];
    var speakers  = bpy_data["speakers"];
    var textures  = bpy_data["textures"];

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
            make_link_uuid(obj, "data", storage);
            break;
        case "CAMERA":
            make_link_uuid(obj, "data", storage);
            break;
        case "SPEAKER":
            make_link_uuid(obj, "data", storage);
            break;
        case "EMPTY":
            break;
        case "CURVE":
            make_link_uuid(obj, "data", storage);
            break;
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

        var nodes = node_tree["nodes"];
        for (var j = 0; j < nodes.length; j++) {
            var node = nodes[j];

            if ((node["type"] == "MATERIAL" || node["type"] == "MATERIAL_EXT") 
                    && node["material"])
                make_link_uuid(node, "material", storage);

            if (node["type"] == "TEXTURE" && node["texture"])
                make_link_uuid(node, "texture", storage);
        }
        
        var links = node_tree["links"];
        for (var j = 0; j < links.length; j++) {
            var link = links[j];
            make_link_name(link, "from_node", nodes);
            make_link_name(link, "to_node", nodes);

            make_link_ident(link, "from_socket", link["from_node"]["outputs"]);
            make_link_ident(link, "to_socket", link["to_node"]["inputs"]);
        }
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

        if (speaker["animation_data"] && speaker["animation_data"]["action"])
            make_link_uuid(speaker["animation_data"], "action", storage);
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

function load_textures(bpy_data, scheduler, stage, cb_param, cb_finish, cb_set_rate) {
    if (cfg_def.do_not_load_resources)
        return;

    var dir_path = dirname(scheduler.filepath);

    var images = bpy_data["images"];
    var img_by_uri = {};
    var image_assets = [];

    for (var i = 0; i < images.length; i++) {
        var image = images[i];
        var uuid = image["uuid"];

        if (image["source"] === "FILE") {

            var tex_users = find_image_users(image, bpy_data["textures"]);

            if (!tex_users.length) {
                m_print.warn("B4W Warning: image ", image["name"], " has no users");
                continue;
            }

            if (tex_users[0]["b4w_shore_dist_map"])
                continue;

            var image_path = normpath(dir_path + image["filepath"]);

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

            if (!image_data) // image not loaded
                return;

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

            var rate = ++cb_param.image_counter / image_assets.length;
            cb_set_rate(scheduler, stage, rate);
        }
        var pack_cb = function() {
            m_print.log("%cLOADED ALL IMAGES", "color: #0a0");
            cb_finish(scheduler, stage);
        }

        m_assets.enqueue(image_assets, asset_cb, pack_cb);
    } else
        cb_finish(scheduler, stage);
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

function load_speakers(bpy_data, scheduler, stage, cb_param, cb_finish, cb_set_rate) {

    if (cfg_def.do_not_load_resources)
        return;

    var objects = get_all_objects(bpy_data);
    var dir_path = dirname(scheduler.filepath);

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

                var sound_path = normpath(dir_path + sound["filepath"]);

                switch(m_sfx.source_type(obj)) {
                case m_sfx.AST_ARRAY_BUFFER: 
                    var asset_type = m_assets.AT_AUDIOBUFFER;
                    break;
                case m_sfx.AST_HTML_ELEMENT: 
                    var asset_type = m_assets.AT_AUDIO_ELEMENT;
                    break;
                }

                var head_ext = m_assets.split_extension(sound_path);
                var ext = m_sfx.detect_media_container(head_ext[1]);
                if (ext != head_ext[1])
                    sound_path = head_ext[0] +".lossconv." + ext;
                else
                    sound_path = head_ext[0] +"." + ext;

                sound_assets.push([uuid, asset_type, sound_path]);
            }
            spks_by_uuid[uuid].push(obj);
        }
    }

    if (sound_assets.length) {
        var asset_cb = function(sound_data, uuid, type, path) {

            if (!sound_data) // sound not loaded
                return;
        
            m_print.log("%cLOAD SOUND", "color: #0aa", path);

            if (path.indexOf(_debug_resources_root) == -1)
                m_print.warn("B4W Warning: sound", path, 
                    "is not from app root");

            var spk_objs = spks_by_uuid[uuid];
            for (var i = 0; i < spk_objs.length; i++)
                m_sfx.update_spkobj(spk_objs[i], sound_data);

            var rate = ++cb_param.sound_counter / sound_assets.length;
            cb_set_rate(scheduler, stage, rate);
        }
        var pack_cb = function() {
            m_print.log("%cLOADED ALL SOUNDS", "color: #0aa");
            speakers_play(m_scenes.get_active());
            cb_finish(scheduler, stage);
        }

        m_assets.enqueue(sound_assets, asset_cb, pack_cb);

    } else
        cb_finish(scheduler, stage);
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
    var spk_objs = m_scenes.get_appended_objs(scene, "SPEAKER");
    for (var i = 0; i < spk_objs.length; i++) {
        var sobj = spk_objs[i];

        if (!m_sfx.is_speaker(sobj))
            continue;

        // NOTE: autostart cyclic
        if (m_sfx.is_cyclic(sobj))
            m_sfx.play_def(sobj);
    }
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
function assign_default_material(material, meshes) {
    for (var i = 0; i < meshes.length; i++) {
        var mesh = meshes[i];

        if (mesh["materials"].length == 0)
            mesh["materials"].push(material);
    }
}

function prepare_actions(actions) {
    for (var i = 0; i < actions.length; i++) {
        var action = actions[i];
        m_anim.append_action(action);
    }
}

/**
 * Prepare LOD constraints
 *      find objects with lod constraints, also check proxies
 *      make copy of lod objects
 *      remove old lod objects 
 *      add new lod objects to scene/group
 */
function prepare_lod_constraints(bpy_data) {

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

            prepare_obj_lod_constraints(scene_objs, obj, added_objs, 
                    removed_objs);

            var dupli_group = obj["dupli_group"];
            if (dupli_group) {
                var dg_objects = dupli_group["objects"];

                for (var k = 0; k < dg_objects.length; k++) {
                    var dg_obj = dg_objects[k];

                    prepare_obj_lod_constraints(dg_objects, dg_obj, 
                            added_objs, removed_objs);
                }
            }
        }

        for (var j = 0; j < removed_objs.length; j++)
            remove_object(removed_objs[j], [scene]);

        for (var j = 0; j < added_objs.length; j++)
            m_util.append_unique(added_objs[j][0], added_objs[j][1]);
    }
    update_all_objects(bpy_data);
}

function prepare_obj_lod_constraints(container, obj, added_objs, removed_objs) {
    var lods_num = get_lods_num(obj);
    var num = 0;
    var constraints = obj["constraints"];

    // TODO: handle reflection plane

    for (var i = 0; num < lods_num; i++) {
        var cons = constraints[i];

        // LODs take place in LOCKED_TRACK constraint
        if (!(cons["type"] == "LOCKED_TRACK" && cons["target"]))
            continue;

        var lod_obj = cons["target"];

        var lod_obj_new = m_util.clone_object_nr(lod_obj);
        lod_obj_new["name"] = obj["name"] + "_LOD_" + 
                String(num+1);

        added_objs.push([container, lod_obj_new]);
        removed_objs.push(lod_obj);

        cons["target"] = lod_obj_new;

        num++;
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
                    // NOTE: update it, because we need some render/color_id 
                    // info later
                    update_object(pset["dupli_object"]);

                } else if (pset["render_type"] == "GROUP") {

                    var dg = pset["dupli_group"];

                    // find EMPTY object
                    var empty_objs = m_scenes.combine_scene_objects(scene, "EMPTY");

                    for (var n = 0; n < empty_objs.length; n++)
                        if (empty_objs[n]["dupli_group"] == dg)
                            removed_objs.push(empty_objs[n]);

                    for (var n = 0; n < dg["objects"].length; n++)
                        update_object(dg["objects"][n]);
                } else
                    m_print.warn("B4W Warning: render type", pset["render_type"], 
                            "not supported for particle systems (" + pset["name"] + ")");
            }
        }

        for (var j = 0; j < removed_objs.length; j++) {
            remove_object(removed_objs[j], [scene]);
        }
    }
    update_all_objects(bpy_data);
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
    }
}

function prepare_lod_objects(objects) {

    for (var i = 0; i < objects.length; i++) {
        var obj = objects[i];
        if (!m_util.is_mesh(obj))
            continue;

        var lods_num = get_lods_num(obj);
        if (!lods_num)
            continue;

        obj._render.last_lod = false;

        var prev_lod_dist_max = obj._render.lod_dist_max;
        var last_lod_cons_index = 0;

        for (var j = 0; j < lods_num; j++) {
            var lod_obj = get_lod_by_index(obj, j);

            lod_obj._render.lod_dist_min = prev_lod_dist_max;
            obj._render.last_lod = false;

            prev_lod_dist_max = lod_obj._render.lod_dist_max;
            last_lod_cons_index = j;
        }

        get_lod_by_index(obj, last_lod_cons_index)._render.last_lod = true;
    }
}

function get_lods_num(bpy_obj) {
    return bpy_obj["b4w_lods_num"];
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

/**
 * Update object:
 *      assign render type
 *      prepare transform
 *      assign color_id
 *      prepare skinning
 *      apply pose if any
 *      init forces
 *      init particle systems
 */
function update_object(obj) {

    // NOTE: type for mesh objects: STATIC, DYNAMIC
    obj._render = m_util.create_render(obj["type"] === "MESH" ?
            get_mesh_obj_render_type(obj) : obj["type"]);

    obj._constraint = null;
    obj._descends = [];

    var render = obj._render;

    var pos = obj["location"];
    var scale = obj["scale"][0];
    var rot = _quat4_tmp;
    quat_bpy_b4w(obj["rotation_quaternion"], rot);

    m_trans.set_translation(obj, pos);
    m_trans.set_rotation(obj, rot);
    m_trans.set_scale(obj, scale);

    switch(obj["type"]) {
    case "ARMATURE":

        var pose_bones = obj["pose"]["bones"];
        for (var i = 0; i < pose_bones.length; i++) {
            var pose_bone = pose_bones[i];
            var arm_bone = pose_bone["bone"];

            var mat_loc = new Float32Array(arm_bone["matrix_local"]);
            var mat_loc_inv = new Float32Array(16);
            m_mat4.invert(mat_loc, mat_loc_inv);

            var mat_bas = new Float32Array(pose_bone["matrix_basis"]);

            var tail = new Float32Array(3);
            m_vec3.subtract(arm_bone["tail_local"], arm_bone["head_local"], tail);
            // translate tail offset from armature to bone space
            m_util.vecdir_multiply_matrix(tail, mat_loc_inv, tail);

            pose_bone._tail = tail;

            // include current bone to chain with its parents 
            pose_bone._chain = [pose_bone].concat(pose_bone["parent_recursive"]);

            pose_bone._tsr_local = m_tsr.from_mat4(mat_loc, m_tsr.create());
            pose_bone._tsr_basis = m_tsr.from_mat4(mat_bas, m_tsr.create());
            pose_bone._tsr_channel_cache = m_tsr.create();
            pose_bone._tsr_channel_cache_valid = false;
        }

        var bone_pointers = m_anim.calc_armature_bone_pointers(obj);
        render.bone_pointers = bone_pointers;

        var pose_data = m_anim.calc_pose_data(obj, bone_pointers);

        render.quats_before = pose_data.quats;
        render.quats_after  = pose_data.quats;
        render.trans_before = pose_data.trans;
        render.trans_after  = pose_data.trans;
        render.frame_factor = 0;

        break;
    case "MESH":
        render.selectable = cfg_def.all_objs_selectable || obj["b4w_selectable"];
        render.origin_selectable = obj["b4w_selectable"];
        render.glow_anim_settings = {
            glow_duration: obj["b4w_glow_settings"]["glow_duration"],
            glow_period: obj["b4w_glow_settings"]["glow_period"],
            glow_relapses: obj["b4w_glow_settings"]["glow_relapses"]
        };

        if (render.selectable) {
            // assign color id
            obj._color_id = gen_color_id(_color_id_counter);
            _color_id_counter++;
        }
        
        prepare_skinning_info(obj);
        prepare_vertex_anim(obj);

        // apply pose if any
        var armobj = m_anim.get_first_armature_object(obj);
        if (armobj) {
            var bone_pointers = obj._render.bone_pointers;
            var pose_data = m_anim.calc_pose_data(armobj, bone_pointers);

            render.quats_before = pose_data.quats;
            render.quats_after  = pose_data.quats;
            render.trans_before = pose_data.trans;
            render.trans_after  = pose_data.trans;
            render.frame_factor = 0;
        }

        obj._batches = [];

        render.shadow_cast = obj["b4w_shadow_cast"];
        render.shadow_receive = obj["b4w_shadow_receive"];
        render.shadow_cast_only = obj["b4w_shadow_cast_only"] 
                && render.shadow_cast;

        render.reflexible = obj["b4w_reflexible"];
        render.reflexible_only = obj["b4w_reflexible_only"] 
                && render.reflexible;
        render.reflective = obj["b4w_reflective"];
        render.caustics   = obj["b4w_caustics"];

        render.wind_bending = obj["b4w_wind_bending"];
        render.wind_bending_angle = obj["b4w_wind_bending_angle"];
        var amp = m_batch.wb_angle_to_amp(obj["b4w_wind_bending_angle"], 
                m_batch.bb_bpy_to_b4w(obj["data"]["b4w_bounding_box"]), obj["scale"][0]);
        render.wind_bending_amp = amp;
        render.wind_bending_freq   = obj["b4w_wind_bending_freq"];
        render.detail_bending_freq = obj["b4w_detail_bending_freq"];
        render.detail_bending_amp  = obj["b4w_detail_bending_amp"];
        render.branch_bending_amp  = obj["b4w_branch_bending_amp"];
        render.hide = false;

        render.main_bend_col = obj["b4w_main_bend_stiffness_col"];
        var bnd_st = obj["b4w_detail_bend_colors"];
        render.detail_bend_col = {};
        render.detail_bend_col.leaves_stiffness = bnd_st["leaves_stiffness_col"];
        render.detail_bend_col.leaves_phase = bnd_st["leaves_phase_col"];
        render.detail_bend_col.overall_stiffness = bnd_st["overall_stiffness_col"];

        // overrided by hair render if needed
        render.dynamic_grass = false;

        render.do_not_cull = obj["b4w_do_not_cull"];
        render.disable_fogging = obj["b4w_disable_fogging"];
        render.dynamic_geometry = obj["b4w_dynamic_geometry"];

        // assign params for object (bounding) physics simulation
        // it seams BGE uses first material to get physics param
        var first_mat = first_mesh_material(obj);
        render.friction = first_mat["physics"]["friction"];
        render.elasticity = first_mat["physics"]["elasticity"];

        render.lod_dist_min = 0;
        render.lod_dist_max = obj["b4w_lod_distance"];

        if (DEBUG_LOD_DIST_NOT_SET && obj["b4w_lod_distance"] === 10000)
            m_print.warn("B4W Warning: object \"" + obj["name"] 
                + "\" has default LOD distance");

        render.last_lod = true;
        break;
    case "CAMERA":
        m_cam.camera_object_to_camera(obj);
        m_cam.assign_boundings(obj);
        break;

    case "LAMP":
        m_lights.lamp_to_light(obj);
        break;

    case "CURVE":
        var spline = m_curve.create_spline(obj);
        if (spline)
            obj._spline = spline;
        break;
    case "SPEAKER":
        break;
    case "EMPTY":
        // NOTE: center = 1/2 height
        var bb = m_bounds.zero_bounding_box();
        render.bb_local = bb;

        var bs = m_bounds.zero_bounding_sphere();
        render.bs_local = bs;
        break;
    default:
        break;
    }

    // NOTE: temporary disable armature parenting
    if (obj["parent"] && obj["parent_type"] == "OBJECT" && obj["parent"]["type"] != "ARMATURE") {
        var trans = render.trans;
        var quat = render.quat;
        var scale = render.scale;
        m_cons.append_stiff_obj(obj, obj["parent"], trans, quat, scale);
    } else if (obj["parent"] && obj["parent_type"] == "BONE" &&
            obj["parent"]["type"] == "ARMATURE") {
        var trans = render.trans;
        var quat = render.quat;
        m_cons.append_stiff_bone(obj, obj["parent"], obj["parent_bone"], trans, quat);
    } else if (obj._dg_parent && obj._dg_parent["b4w_group_relative"]) {
        // get offset from render before child-of constraint being applied
        var offset = m_tsr.create_sep(render.trans, render.scale, render.quat);
        m_cons.append_child_of(obj, obj._dg_parent, offset);
    } else if (obj._dg_parent && !obj._dg_parent["b4w_group_relative"]) {
        m_trans.update_transform(obj);    // to get world matrix
        var wm = render.world_matrix;
        m_mat4.multiply(obj._dg_parent._render.world_matrix, wm, wm);

        var trans = m_util.matrix_to_trans(wm);
        var scale = m_util.matrix_to_scale(wm);
        var quat = m_util.matrix_to_quat(wm);

        m_trans.set_translation(obj, trans);
        m_trans.set_rotation(obj, quat);
        m_trans.set_scale(obj, scale);
    }

    // store force field
    if (obj["field"]) {
        render.force_strength = obj["field"]["strength"];
        m_particles.update_force(obj);
    }

    // make links from group objects to their parent
    var dupli_group = obj["dupli_group"];
    if (dupli_group) {
        var dg_objects = dupli_group["objects"];
        for (var i = 0; i < dg_objects.length; i++) {
            var dg_obj = dg_objects[i];
            dg_obj._dg_parent = obj;
        }
    }

    render.use_collision_compound = obj["game"]["use_collision_compound"];
    render.physics_type = obj["game"]["physics_type"];

    m_trans.update_transform(obj);
}

function quat_bpy_b4w(quat, dest) {
    var w = quat[0];
    var x = quat[1];
    var y = quat[2];
    var z = quat[3];

    dest[0] = x;
    dest[1] = y;
    dest[2] = z;
    dest[3] = w;

    return dest;
}

/**
 * Get render type for mesh object.
 */
function get_mesh_obj_render_type(bpy_obj) {
    var is_animated = m_anim.is_animatable(bpy_obj);
    var has_do_not_batch = bpy_obj["b4w_do_not_batch"];
    var dynamic_geom = bpy_obj["b4w_dynamic_geometry"];
    var has_anim_particles = m_particles.has_anim_particles(bpy_obj);
    var is_collision = bpy_obj["b4w_collision"];
    var is_vehicle_part = bpy_obj["b4w_vehicle"];
    var is_floater_part = bpy_obj["b4w_floating"];
    var dyn_grass_emitter = m_particles.has_dynamic_grass_particles(bpy_obj);
    


    // skydome and lens flares not strictly required to be dynamic
    // make it so just to prevent some possible bugs in the future

    if (DEBUG_DISABLE_BATCHING ||
            is_animated || has_do_not_batch || dynamic_geom || 
            has_anim_particles || is_collision || is_vehicle_part || 
            is_floater_part || has_skydome_mat(bpy_obj) || 
            has_lens_flares_mat(bpy_obj) || dyn_grass_emitter)
        return "DYNAMIC";
    else
        return "STATIC";
}

/**
 * Check if mesh object has special skydome material
 */
function has_skydome_mat(obj) {
    var mesh = obj["data"];

    for (var i = 0; i < mesh["materials"].length; i++)
        if (mesh["materials"][i]["b4w_skydome"])
            return true;

    return false;
}
/**
 * Check if mesh object has special lens flares material
 */
function has_lens_flares_mat(obj) {
    var mesh = obj["data"];

    for (var i = 0; i < mesh["materials"].length; i++)
        if (mesh["materials"][i]["name"] === "LENS_FLARES")
            return true;

    return false;
}

function gen_color_id(counter) {

    // black reserved for background
    var counter = counter + 1;

    if (counter > 51 * 51 * 51)
        m_print.error("Color ID pool depleted");

    // 255 / 5 = 51
    var r = Math.floor(counter / (51 * 51));
    counter %= (51 * 51);
    var g = Math.floor(counter / 51);
    counter %= 51;
    var b = counter;

    var color_id = [r/51, g/51, b/51];

    return color_id;
}

/**
 * Prepare skinning
 *
 * get info about relations between vertex groups and bones
 * and save to mesh internals for using in buffers generation.
 * Finally mark render to use skinning shaders
 */
function prepare_skinning_info(obj) {

    if (obj["type"] != "MESH")
        throw("Wrong object type: " + obj["name"]);

    // search for armature modifiers

    var render = obj._render;

    var armobj = m_anim.get_first_armature_object(obj);
    if (!armobj) {
        render.is_skinning = false; 
        return;
    }

    var mesh = obj["data"];

    if (mesh["vertex_groups"].length) {
        render.is_skinning = true; 
        var vertex_groups = mesh["vertex_groups"];
    } else {
        render.is_skinning = false; 
        return; 
    }

    // collect deformation bones

    var bones = armobj["data"]["bones"];
    var pose_bones = armobj["pose"]["bones"];

    var deform_bone_index = 0;
    var bone_pointers = {};

    for (var i = 0; i < bones.length; i++) {
        var bone = bones[i];
        var bone_name = bone["name"];

        // bone is deform if it has corresponding vertex group
        var vgroup = m_util.keysearch("name", bone_name, vertex_groups);
        if (!vgroup)
            continue;

        var pose_bone_index = m_util.get_index_for_key_value(pose_bones, "name", 
                bone_name);

        bone_pointers[bone_name] = {
            bone_index: i,
            deform_bone_index: deform_bone_index++,
            // pose bone index may differ from bone_index
            pose_bone_index: pose_bone_index,
            vgroup_index: vgroup["index"]
        };
    }

    var num_bones = deform_bone_index;
    var max_bones = cfg_def.max_bones;

    if (num_bones > 2 * max_bones) {
        m_util.panic("B4W Error: too many bones for \"" + obj["name"]);
    } else if (num_bones > max_bones) {
        m_print.warn("B4W Warning: too many bones for \"" + obj["name"] + " / " + 
            armobj["name"] + "\": " + num_bones + " bones (max " + max_bones + 
            "). Blending between frames will be disabled");

        // causes optimizing out the half of the uniform arrays,
        // effectively doubles the limit of bones
        render.frames_blending = false;
    } else
        render.frames_blending = true;

    render.bone_pointers = bone_pointers;
    // will be extended beyond this limit later
    render.max_bones = num_bones;
}

function prepare_vertex_anim(obj) {

    if (obj["type"] != "MESH")
        throw("Wrong object type: " + obj["name"]);

    var render = obj._render;

    if (obj["data"]["b4w_vertex_anim"].length)
        render.vertex_anim = true;
    else
        render.vertex_anim = false;
}

function first_mesh_material(obj) {
    if (obj["type"] !== "MESH")
        throw "Wrong object";

    return obj["data"]["materials"][0];
}

function add_physics_objects(bpy_data, scheduler, stage, cb_param, cb_finish, 
        cb_set_rate) {
    for (var i = 0; i < bpy_data["scenes"].length; i++) {
        var scene = bpy_data["scenes"][i];

        for (var j = 0; j < ADD_PHY_TYPES.length; j++) {
            var type = ADD_PHY_TYPES[j];

            var sobjs = m_scenes.get_scene_objs(scene, type);
            for (var k = 0; k < sobjs.length; k++) {
                var obj = sobjs[k];

                if (cfg_phy.enabled && scene["b4w_enable_physics"])
                    m_phy.append_object(obj, scene);
            }
        }
    }
    cb_finish(scheduler, stage);
}

/**
 * Load shoremap image on corresponding scenes
 */
function load_shoremap(bpy_data, scheduler, stage, cb_param, cb_finish, 
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
                var dir_path = dirname(scheduler.filepath);
                var image_path = normpath(dir_path + image["filepath"]);

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
            cb_finish(scheduler, stage);
        }
        m_assets.enqueue(image_assets, asset_cb, pack_cb);
    } else
        cb_finish(scheduler, stage);
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
function load_smaa_textures(bpy_data, scheduler, stage, cb_param, cb_finish,
        cb_set_rate) {

    if (!cfg_def.antialiasing || !cfg_def.smaa) {
        cb_finish(scheduler, stage);
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
        cb_finish(scheduler, stage);
        return;
    }

    var smaa_images = [];

    var dir_path = dirname(scheduler.filepath);
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
            cb_finish(scheduler, stage);
        }
        m_assets.enqueue(smaa_images, asset_cb, pack_cb);
    } else 
        cb_finish(scheduler, stage);
}

/**
 * Add objects to scenes and finish loading
 */
function prepare_objects_adding(bpy_data, scheduler, stage, cb_param, cb_finish,
        cb_set_rate) {

    for (var i = 0; i < bpy_data["scenes"].length; i++) {
        var scene = bpy_data["scenes"][i];

        if (scene["b4w_load_empty"])
            continue;

        for (var j = 0; j < ADD_TYPES.length; j++) {
            var type = ADD_TYPES[j];
            var sobjs = m_scenes.get_scene_objs(scene, type);

            for (var k = 0; k < sobjs.length; k++) {
                var obj = sobjs[k];

                // NOTE: ignore ARMATURE proxy
                if (!(m_util.is_armature(obj) && obj["proxy"]))
                    cb_param.added_objects.push({
                        scene: scene, 
                        obj: obj, 
                        type: "obj"
                    });
            }
        }

        for (var j = 0; j < ADD_SFX_TYPES.length; j++) {
            var type = ADD_SFX_TYPES[j];
            var sobjs = m_scenes.get_scene_objs(scene, type);

            for (var k = 0; k < sobjs.length; k++) {
                var obj = sobjs[k];

                if (scene["b4w_enable_audio"])
                    cb_param.added_objects.push({
                        scene: scene, 
                        obj: obj, 
                        type: "sfx_obj"
                    });
            }
        }
    }
}

function add_objects(bpy_data, scheduler, stage, cb_param, cb_finish, 
        cb_set_rate) {

    var obj_data = cb_param.added_objects;
    var obj_counter = cb_param.obj_counter;

    if (!obj_data)
        var rate = 1;
    else {
        var type = obj_data[obj_counter].type;
        var obj = obj_data[obj_counter].obj;
        var scene = obj_data[obj_counter].scene;

        switch (type) {
        case "obj":
            m_scenes.append_object(scene, obj);
            break;
        case "sfx_obj":
            m_sfx.append_object(obj, scene);
            break;
        }
        var rate = ++cb_param.obj_counter / obj_data.length;
    }

    cb_set_rate(scheduler, stage, rate);
}

function end_objects_adding(bpy_data, scheduler, stage, cb_param, cb_finish,
        cb_set_rate) {
    for (var i = 0; i < bpy_data["scenes"].length; i++) {
        var scene = bpy_data["scenes"][i]
        m_scenes.prepare_rendering(scene);

        if (scene["b4w_use_nla"])
            m_nla.update_scene_nla(scene, scene["b4w_nla_cyclic"]);
    }

    // NOTE: set first scene as active
    var scene0 = bpy_data["scenes"][0];
    m_scenes.set_active(scene0);

    var objects = get_all_objects(bpy_data);
    update_objects_dynamics(objects);
    cb_finish(scheduler, stage);
}

function update_objects_dynamics(objects) {

    var anim_arms = [];

    for (var i = 0; i < objects.length; i++) {
        var obj = objects[i];

        if (obj._render && (obj._render.type == "DYNAMIC" ||
                obj._render.type == "CAMERA"))
            m_trans.update_transform(obj);

        // try to use default animation
        if (obj["b4w_use_default_animation"] && m_anim.is_animatable(obj)) {
            m_anim.apply_def(obj);

            if (obj["b4w_cyclic_animation"])
                m_anim.cyclic(obj, true);

            if (m_util.is_armature(obj))
                anim_arms.push(obj);

            m_anim.play(obj);
        }
    }

    // optimization
    if (!anim_arms.length)
        return;

    // auto apply armature default animation to meshes
    for (var i = 0; i < objects.length; i++) {
        var obj = objects[i];

        if (m_util.is_mesh(obj) && !obj["b4w_use_default_animation"] &&
                m_anim.is_animatable(obj)) {

            for (var j = 0; j < anim_arms.length; j++) {
                var armobj = anim_arms[j];

                if (m_anim.get_first_armature_object(obj) == armobj) {
                    m_anim.apply_def(obj)
                    m_anim.cyclic(obj, m_anim.is_cyclic(armobj));
                    m_anim.play(obj);
                }
            }
        }
    }
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

exports.load = function(path, loaded_cb, stageload_cb, wait_complete_loading) {
    var stages = {
        "load_main": {
            priority: m_loader.ASYNC_PRIORITY, 
            background_loading: false,
            inputs: [],
            is_resource: false,
            relative_size: 500,
            cb_before: load_main
        },
        "duplicate_objects": {
            priority: m_loader.SYNC_PRIORITY,
            background_loading: false,
            inputs: ["load_main"],
            is_resource: false,
            relative_size: 50,
            cb_before: duplicate_objects
        },
        "load_binaries": {
            priority: m_loader.ASYNC_PRIORITY,
            background_loading: false,
            inputs: ["load_main"],
            is_resource: false,
            relative_size: 500,
            cb_before: load_binaries
        },
        "prepare_bindata": {
            priority: m_loader.SYNC_PRIORITY,
            background_loading: false,
            inputs: ["duplicate_objects", "load_binaries"],
            is_resource: false,
            relative_size: 0,
            cb_before: prepare_bindata
        },
        "prepare_root_datablocks": {
            priority: m_loader.SYNC_PRIORITY,
            background_loading: false,
            inputs: ["duplicate_objects", "prepare_bindata"],
            is_resource: false,
            relative_size: 150,
            cb_before: prepare_root_datablocks
        },
        "prepare_root_scenes": {
            priority: m_loader.SYNC_PRIORITY,
            background_loading: false,
            inputs: ["prepare_root_datablocks"],
            is_resource: false,
            relative_size: 350,
            cb_before: prepare_root_scenes
        },
        "load_smaa_textures": {
            priority: m_loader.ASYNC_PRIORITY,
            background_loading: true,
            inputs: ["prepare_root_scenes"],
            is_resource: false,
            relative_size: 10,
            cb_before: load_smaa_textures
        },
        "load_shoremap": {
            priority: m_loader.ASYNC_PRIORITY,
            background_loading: true,
            inputs: ["prepare_root_scenes"],
            is_resource: false,
            relative_size: 10,
            cb_before: load_shoremap
        },
        "load_textures": {
            priority: m_loader.ASYNC_PRIORITY,
            background_loading: true,
            inputs: ["prepare_root_scenes"],
            is_resource: true,
            relative_size: 500,
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
            cb_before: add_physics_objects
        },
        "add_objects": {
            priority: m_loader.SYNC_PRIORITY,
            background_loading: false,
            inputs: ["add_physics_objects"],
            is_resource: false,
            relative_size: 800,
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
            cb_before: load_speakers,
            cb_param: {
                sound_counter: 0
            }
        }
    };

    _scheduler = m_loader.create_scheduler(stages, path, loaded_cb, 
            stageload_cb, free_load_data, wait_complete_loading, 
            cfg_def.do_not_load_resources);
}

exports.unload = function() {
    m_print.log("%cUNLOAD", "color: #00a");

    // not even started loading
    var scheduler = get_scheduler();
    if (!scheduler || !scheduler.filepath)
        return;

    m_anim.cleanup();
    m_sfx.cleanup();
    m_nla.cleanup();
    m_scenes.cleanup();
    m_lights.cleanup();
    m_phy.cleanup();
    m_util.cleanup();
    m_render.cleanup();
    m_nodemat.cleanup();
    m_shaders.cleanup();
    m_ctl.cleanup();
    m_ext.cleanup();
    m_assets.cleanup();
    m_particles.cleanup();

    _all_objects_cache = null;
    _scheduler = null;
    _color_id_counter = 0;
}

exports.set_debug_resources_root = function(debug_resources_root) {

    _debug_resources_root = debug_resources_root;
}

/**
 * Get all unique objects from all scenes.
 * do not try to modify objects by this link
 */
function get_all_objects(bpy_data) {
    if (!_all_objects_cache)
        update_all_objects(bpy_data);

    return _all_objects_cache;
}

/**
 * Update all objects hierarchical cache using breadth-first search algorithm.
 * NOTE: do proper cache update to prevent misterious bugs
 */
function update_all_objects(bpy_data) {
    var scenes = bpy_data["scenes"];

    // double hierarchy: groups than parents
    var object_levels = [];

    for (var i = 0; i < scenes.length; i++) {
        var scene_objs = scenes[i]["objects"];
        update_all_objects_iter(scene_objs, 0, object_levels);
    }

    _all_objects_cache = [];

    for (var i = 0; i < object_levels.length; i++) {
        var grp_level = object_levels[i];

        for (var j = 0; j < grp_level.length; j++) {
            var par_level = grp_level[j];

            for (var k = 0; k < par_level.length; k++)
                _all_objects_cache.push(par_level[k]);
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
    var par = obj["parent"];
    if (par)
        return 1 + parent_num(par);
    else
        return 0;
}

function set_bpy_data(bpy_data) {
    _bpy_data = bpy_data;
}

function get_bpy_data() {
    return _bpy_data;
}

}
