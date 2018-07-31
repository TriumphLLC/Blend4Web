/**
 * Copyright (C) 2014-2017 Triumph LLC
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
import register from "../util/register.js";

import m_geom_fact from "../intern/geometry.js";
import m_obj_fact from "../intern/objects.js";
import m_batch_fact from "../intern/batch.js";
import m_obj_util_fact from "../intern/obj_util.js";
import m_print_fact from "../intern/print.js";
import m_scenes_fact from "../intern/scenes.js";
import * as m_tsr from "../intern/tsr.js";
import * as m_util from "../intern/util.js";

/**
 * Objects API.
 * <p>Additional topics in the User Manual: {@link
 * https://www.blend4web.com/doc/en/objects.html#object-transform-api|Object Transform API}, 
 * {@link https://www.blend4web.com/doc/en/objects.html#get-object-api|Get
 * Object API}, {@link
 * https://www.blend4web.com/doc/en/objects.html#object-selection|Object
 * Selection}, {@link
 * https://www.blend4web.com/doc/en/objects.html#copying-objects-instancing|Copying
 * Objects (Instancing)}
 * @module objects
 * @local ObjectMetaTags
 * @local WindBendingParams
 */
function Objects(ns, exports) {

var m_geom     = m_geom_fact(ns);
var m_obj      = m_obj_fact(ns);
var m_batch    = m_batch_fact(ns);
var m_obj_util = m_obj_util_fact(ns);
var m_print    = m_print_fact(ns);
var m_scenes   = m_scenes_fact(ns);

/**
 * @typedef {Object} ObjectMetaTags
 * @property {string} title The title meta tag.
 * @property {string} description The description meta tag.
 * @property {string} category The category meta tag.
 */

/**
 * Wind bending params.
 * @typedef {Object} WindBendingParams
 * @property {number} angle Angle of main wind bending in degrees
 * @property {number} main_frequency Frequency of main wind bending
 * @property {number} detail_frequency Frequency of detail wind bending
 * @property {number} detail_amplitude Amplitude of detail wind bending
 * @property {number} branch_amplitude Amplitude of branches wind bending
 * @cc_externs angle main_frequency detail_frequency
 * @cc_externs detail_amplitude branch_amplitude
 */

/**
 * Get the Blender-assigned meta tags from the object.
 * @method module:objects.get_meta_tags
 * @param {Object3D} obj Object 3D
 * @returns {ObjectMetaTags} Object meta tags
 * @cc_externs title description category
 * @example var m_scenes    = require("scenes");
 * var m_objects   = require("objects");
 *
 * ....
 *
 * var my_object = m_scenes.get_object_by_name("MyObject");
 * var my_object_meta_tags = m_objects.get_meta_tags(my_object);
 */
exports.get_meta_tags = function(obj) {
    if (obj)
        return m_obj.get_meta_tags(obj);
}

/**
 * Get the Blender-assigned custom property field from the object.
 * @method module:objects.get_custom_prop
 * @param {Object3D} obj Object 3D
 * @returns {*} Object custom property field
 * @example var m_scenes    = require("scenes");
 * var m_objects   = require("objects");
 *
 * var my_object = m_scenes.get_object_by_name("MyObject");
 * var my_custom_prop = m_objects.get_custom_prop(my_object);
 */
exports.get_custom_prop = function(obj) {
    if (obj)
        return m_obj.get_custom_prop(obj);
}
/**
 * Copy MESH object.
 * @method module:objects.copy
 * @param {Object3D} obj Object 3D
 * @param {string} name New unique object name
 * @param {boolean} [deep_copy=false] Copy WebGL buffers
 * @returns {Object3D} New object.
 * @example var m_scenes    = require("scenes");
 * var m_objects   = require("objects");
 *
 * var my_object = m_scenes.get_object_by_name("MyObject");
 * var new_object = m_objects.copy(my_object, "NewObject");
 */
exports.copy = function(obj, name, deep_copy) {

    if (!(m_obj_util.is_mesh(obj) || m_obj_util.is_empty(obj))) {
        m_print.error("object \"" + obj.name + "\" is not of type \"MESH\".");
        return false;
    }

    if (!m_obj_util.is_dynamic(obj)) {
        m_print.error("object \"" + obj.name + "\" is not dynamic.");
        return false;
    }
    if (!(m_geom.has_dyn_geom(obj) || m_geom.check_shape_keys(obj)) && deep_copy) {
        m_print.error("object \"" + obj.name + "\" has not dynamic " 
                + "geometry for deep copying.");
        return false;
    }
    // HACK: a temporary (provisional) solution
    var objs = m_obj.get_scene_objs(m_scenes.get_active(), "MESH", m_obj.DATA_ID_ALL);
    if (objs.indexOf(obj) == - 1) {
        objs = m_obj.get_scene_objs(m_scenes.get_active(), "EMPTY", m_obj.DATA_ID_ALL);
        if (objs.indexOf(obj) == - 1) {
            m_print.error("object \"" + obj.name + "\" does not belong to the "
                    + "active scene.");
            return false;
        }
    }
    name = name || "";
    return m_obj.copy(obj, name, deep_copy);
}

/**
 * Update object's boundings (box, cone, cylinder, ellipsoid, sphere, capsule).
 * @method module:objects.update_boundings
 * @param {Object3D} obj Object 3D
 * @example var m_scenes = require("scenes");
 * var m_objects = require("objects");
 *
 * var my_object = m_scenes.get_object_by_name("MyObject");
 * m_objects.update_boundings(my_object);
 */
exports.update_boundings = function(obj) {

    if (!m_obj_util.is_mesh(obj)) {
        m_print.error("The type of the object \"" + obj.name +
            "\" is not \"MESH\".");
        return;
    }

    if (!(m_geom.has_dyn_geom(obj) || m_geom.check_shape_keys(obj))) {
        m_print.error("object \"" + obj.name + "\" has not dynamic " 
                + "geometry.");
        return;
    }
    m_obj.update_boundings(obj);
}

/**
 * Get parent object.
 * @method module:objects.get_parent
 * @param {Object3D} obj Child object
 * @returns {?Object3D} Parent object
 * @example var m_scenes = require("scenes");
 * var m_objects = require("objects");
 *
 * var my_object = m_scenes.get_object_by_name("MyObject");
 * var parent_object = m_objects.get_parent(my_object);
 */
exports.get_parent = m_obj_util.get_parent;

/**
 * Get DupliGroup parent object.
 * @method module:objects.get_dg_parent
 * @param {Object3D} obj Child object
 * @returns {?Object3D} Parent object
 * @example var m_scenes = require("scenes");
 * var m_objects = require("objects");
 *
 * var my_object = m_scenes.get_object_by_name("MyObject");
 * var dg_parent = m_objects.get_dg_parent(my_object);
 */
exports.get_dg_parent = m_obj_util.get_dg_parent;

/**
 * Check if the object is a MESH.
 * @method module:objects.is_mesh
 * @param {Object3D} obj Object 3D
 * @returns {boolean} Checking result.
 * @example var m_scenes = require("scenes");
 * var m_objects = require("objects");
 *
 * var my_object = m_scenes.get_object_by_name("MyObject");
 * if (m_objects.is_mesh(my_object) == true)
 * {
 *    console.log("This is a mesh object.");
 * }
 */
exports.is_mesh = m_obj_util.is_mesh;

/**
 * Check if the object is an ARMATURE.
 * @method module:objects.is_armature
 * @param {Object3D} obj Object 3D
 * @returns {boolean} Checking result.
 * @example var m_scenes = require("scenes");
 * var m_objects = require("objects");
 *
 * var my_object = m_scenes.get_object_by_name("MyObject");
 * if (m_objects.is_armature(my_object))
 * {
 *     console.log("This is an armature");
 * }
 *     else
 * {
 *    console.log("This is not an armature");
 * }
 */
exports.is_armature = m_obj_util.is_armature;

/**
 * Check if the object is a SPEAKER.
 * @method module:objects.is_speaker
 * @param {Object3D} obj Object 3D
 * @returns {boolean} Checking result.
 * @example var m_scenes = require("scenes");
 * var m_objects = require("objects");
 *
 * var my_object = m_scenes.get_object_by_name("MyObject");
 * if (m_objects.is_speaker(my_object))
 * {
 *     console.log("This is a speaker");
 * }
 *     else
 * {
 *     console.log("This is not a speaker");
 * }
 */
exports.is_speaker = m_obj_util.is_speaker;

/**
 * Check if the object is a CAMERA.
 * @method module:objects.is_camera
 * @param {Object3D} obj Object 3D
 * @returns {boolean} Checking result.
 * @example var m_scenes = require("scenes");
 * var m_objects = require("objects");
 *
 * var my_object = m_scenes.get_object_by_name("MyObject");
 * if (m_objects.is_camera(my_object)) 
 * {
 *     console.log("This is a camera");
 * }
 *     else
 * {
 *     console.log("This is not a camera");
 * }
 */
exports.is_camera = m_obj_util.is_camera;

/**
 * Check if the object is a LAMP.
 * @method module:objects.is_lamp
 * @param {Object3D} obj Object 3D
 * @returns {boolean} Checking result.
 * @example var m_scenes = require("scenes");
 * var m_objects = require("objects");
 *
 * var my_object = m_scenes.get_object_by_name("MyObject");
 * if (m_objects.is_lamp(my_object))
 * {
 *     console.log("This is a lamp");
 * } 
 *     else
 * {
 *     console.log("This is not a lamp");
 * }
 */
exports.is_lamp = m_obj_util.is_lamp;

/**
 * Check if the object is an EMPTY.
 * @method module:objects.is_empty
 * @param {Object3D} obj Object 3D
 * @returns {boolean} Checking result.
 * @example var m_scenes = require("scenes");
 * var m_objects = require("objects");
 *
 * var my_object = m_scenes.get_object_by_name("MyObject");
 * if (m_objects.is_empty(my_object))
 * {
 *     console.log("This is an empty object");
 * } 
 *     else
 * {
 *     console.log("This is not an empty object");
 * }
 */
exports.is_empty = m_obj_util.is_empty;

/**
 * Check if the object is a LINE.
 * @method module:objects.is_line
 * @param {Object3D} obj Object 3D
 * @returns {boolean} Checking result.
 * @example var m_scenes = require("scenes");
 * var m_objects = require("objects");
 *
 * var my_object = m_scenes.get_object_by_name("MyObject");
 * if (m_objects.is_line(my_object))
 * {
 *     console.log("This is a line");
 * }
 *     else
 * {
 *     console.log("This is not a line");
 * }
 */
exports.is_line = m_obj_util.is_line;

/**
 * Check if the object is a WORLD.
 * @method module:objects.is_world
 * @param {Object3D} obj Object 3D
 * @returns {boolean} Checking result.
 * @example var m_scenes = require("scenes");
 * var m_objects = require("objects");
 *
 * var my_object = m_scenes.get_object_by_name("MyObject");
 * if (m_objects.is_world(my_object))
 * {
 *     console.log("This is a world object");
 * }
 *     else
 * {
 *     console.log("This is not a world object");
 * }
 */
exports.is_world = m_obj_util.is_world;

/**
 * Get all scene selectable objects.
 * @method module:objects.get_selectable_objects
 * @returns {Object3D[]} Array with selectable objects.
 * @example var m_scenes = require("scenes");
 * var m_objects = require("objects");
 *
 * var selectable_objects_list = m_objects.get_selectable_objects();
 */
exports.get_selectable_objects = function() {

    return m_obj.get_selectable_objects();
}
/**
 * Get all scene outlining objects.
 * @method module:objects.get_outlining_objects
 * @returns {Object3D[]} Array with outlining objects.
 * @example var m_scenes = require("scenes");
 * var m_objects = require("objects");
 *
 * var outlining_objects_list = m_objects.get_outlining_objects();
 */
exports.get_outlining_objects = function() {

    return m_obj.get_outlining_objects();
}
/**
 * Check if object is dynamic.
 * @method module:objects.is_dynamic
 * @param {Object3D} obj Object 3D
 * @returns {boolean} Checking result.
 * @example var m_scenes = require("scenes");
 * var m_objects = require("objects");
 *
 * var my_object = m_scenes.get_object_by_name("MyObject");
 * if (m_objects.is_dynamic(my_object))
 * {
 *     console.log("This is a dynamic object");
 * } 
 *     else
 * {
 *     console.log("This is not a dynamic object");
 * }
 */
exports.is_dynamic = m_obj_util.is_dynamic;

/**
 * Set object's wind bending parameters. Object must be dynamic.
 * @param {Object3D} obj Object 3D
 * @param {WindBendingParams} wb_params Wind Bending parameters
 * @example
 * var m_obj = require("objects");
 * var wb_params =
 * {
 *     angle: 45,
 *     main_frequency: 0.25,
 *     detail_frequency: 1,
 *     detail_amplitude: 0.1,
 *     branch_amplitude: 0.3
 * };
 * m_obj.set_wind_bending_params(obj, wb_params);
 */
exports.set_wind_bending_params = function(obj, wb_params) {

    if (!m_obj_util.is_dynamic_mesh(obj)) {
        m_print.error("The type of the object \"" + obj.name +
            "\" is not \"MESH\" or it is not dynamic.");
        return;
    }

    var render = obj.render;
    if (!render.wind_bending) {
        m_print.error("The \"" + obj.name + "\" object " +
            "doesn't have wind bending parameters.");
        return;
    }

    if (typeof wb_params.angle == "number") {
        var amp = m_batch.wb_angle_to_amp(m_util.deg_to_rad(wb_params.angle), 
            render.bb_original, m_tsr.get_scale(render.world_tsr));
        render.wind_bending_amp = amp;
    }

    if (typeof wb_params.main_frequency == "number")
        render.wind_bending_freq = wb_params.main_frequency;

    if (typeof wb_params.detail_frequency == "number")
        render.detail_bending_freq = wb_params.detail_frequency;

    if (typeof wb_params.detail_amplitude == "number")
        render.detail_bending_amp = wb_params.detail_amplitude;

    if (typeof wb_params.branch_amplitude == "number")
        render.branch_bending_amp = wb_params.branch_amplitude;

    m_obj.set_hair_particles_wind_bend_params(obj);
}

/**
 * Get object's wind bending parameters. Object must be dynamic.
 * @param {Object3D} obj Object 3D
 * @returns {WindBendingParams} Wind Bending parameters
 * @example var m_scenes = require("scenes");
 * var m_objects = require("objects");
 *
 * var my_object = m_scenes.get_object_by_name("MyObject");
 * var wind_params = m_objects.get_wind_bending_params(my_object);
 */
exports.get_wind_bending_params = function(obj) {

    var render = obj.render;

    if (!render.wind_bending)
        return null;

    var wb_params = {};

    var angle = m_util.rad_to_deg(m_batch.wb_amp_to_angle(render.wind_bending_amp,
            render.bb_original, m_tsr.get_scale(render.world_tsr)));

    wb_params.angle = angle;
    wb_params.main_frequency = render.wind_bending_freq;
    wb_params.detail_frequency = render.detail_bending_freq;
    wb_params.detail_amplitude = render.detail_bending_amp;
    wb_params.branch_amplitude = render.branch_bending_amp;

    return wb_params;
}

/**
 * Create line object
 * @param {string} name Line object name
 * @example var m_scenes = require("scenes");
 * var m_objects = require("objects");
 *
 * var my_line = m_objects.create_line("MyLine");
 */
exports.create_line = function(name) {
    return m_obj.create_line(name);
}

/*
 * Create empty object
 * @param { string } name Name of the empty object
 */
exports.create_empty = function (name) {
    return m_obj.create_empty(name);
}

/**
 * Hide objects that have the given data_id.
 * @param {number} data_id ID of loaded data.
 * @example
 * var m_obj = require("objects");
 * m_obj.hide_all_by_data_id(0);
 */
exports.hide_all_by_data_id = function(data_id) {
    var objs = m_obj.get_all_objects("ALL", data_id);
    for (var i = 0; i < objs.length; i++)
        m_scenes.change_visibility(objs[i], true);
}

/**
 * Show objects that have the given data_id.
 * @param {number} data_id ID of loaded data.
 * @example
 * var m_obj = require("objects");
 * m_obj.show_all_by_data_id(1);
 */
exports.show_all_by_data_id = function(data_id) {
    var objs = m_obj.get_all_objects("ALL", data_id);
    for (var i = 0; i < objs.length; i++)
        m_scenes.change_visibility(objs[i], false);
}

}

var objects_factory = register("objects", Objects);

export default objects_factory;
