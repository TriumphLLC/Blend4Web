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
 * Lights internal API module.
 * @name lights
 * @namespace
 * @exports exports as lights
 */
b4w.module["__lights"] = function(exports, require) {

var m_print = require("__print");
var m_tsr   = require("__tsr");
var m_util  = require("__util");
var m_vec3  = require("__vec3");

var _vec3_tmp = new Float32Array(3);
var _vec3_empty = new Float32Array(3);
/**
 * Create light
 * @param type Light type: POINT, SUN,...
 */
function init_light(type) {

    // initialize properties (do not consider values as default!)
    var light = {
        name: "",
        type: type,

        use_diffuse: false,
        use_specular: false,

        prev_direction: new Float32Array(3),
        direction: new Float32Array(3),
        color: new Float32Array(3),
        color_intensity: new Float32Array(3),

        energy: 0,
        default_energy: 0,
        distance: 0,

        use_sphere: false,

        spot_size: 0,
        spot_blend: 0,

        clip_start: 0.1,
        clip_end: 30.0,

        falloff_type: "",

        generate_shadows: false,

        // have influence only for sun
        need_sun_fog_update: false,
        dynamic_intensity: false
    }

    //setting default values
    light.use_diffuse = true;
    light.use_specular = true;
    light.energy = 1;
    light.distance = 25;
    light.falloff_type = "INVERSE_SQUARE";

    return light;
}

/**
 * Convert blender lamp object to light
 * @param lamp_obj lamp object
 */
exports.lamp_to_light = function(bpy_obj, obj) {

    var data = bpy_obj["data"];

    var light = obj.light = init_light(data["type"]);

    light.name = obj.name;
    light.use_diffuse = data["use_diffuse"];
    light.use_specular = data["use_specular"];
    var quat = m_tsr.get_quat_view(obj.render.world_tsr);
    var dir = m_util.quat_to_dir(quat, m_util.AXIS_Z, _vec3_tmp);
    // though dir seems to be normalized, do it explicitely
    m_vec3.normalize(dir, dir);
    light.direction.set(dir);

    light.color[0] = data["color"][0];
    light.color[1] = data["color"][1];
    light.color[2] = data["color"][2];

    light.energy = light.default_energy = data["energy"];
    update_color_intensity(light);

    light.distance = data["distance"];
    light.use_sphere = data["use_sphere"];

    light.clip_start = data["clip_start"];
    light.clip_end = data["clip_end"];

    if (light.type === "POINT" || light.type === "SPOT")
        light.distance = data["distance"];

    if (light.type === "SPOT") {
        light.spot_blend = data["spot_blend"];
        light.spot_size = data["spot_size"];
    } else if (light.type === "POINT")
        light.spot_size = Math.PI / 2;

    light.generate_shadows = data["b4w_generate_shadows"];
    light.dynamic_intensity = data["b4w_dynamic_intensity"];
}


/**
 * Set light color
 */
exports.set_light_color = function(light, color) {

    light.color[0] = color[0];
    light.color[1] = color[1];
    light.color[2] = color[2];

    update_color_intensity(light);
}

/**
 * Set light spot blend
 */
exports.set_light_spot_blend = function(light, spot_blend) {
    light.spot_blend = spot_blend;
}

/**
 * Set light distance
 */
exports.set_light_distance = function(light, distance) {
    light.distance = distance;
}

/**
 * Set light spot size
 */
exports.set_light_spot_size = function(light, spot_size) {
    light.spot_size = spot_size;
}

/**
 * Set light energy
 */
exports.set_light_energy = function(light, energy) {
    light.energy = energy;
    update_color_intensity(light);
}

/**
 * color, energy -> color_intensity
 */
function update_color_intensity(light) {
    m_vec3.scale(light.color, light.energy, light.color_intensity);
}

exports.update_light_transform = update_light_transform;
/**
 * @methodOf lights 
 */
function update_light_transform(obj) {

    var light = obj.light;
    if (!light)
        return;

    var quat = m_tsr.get_quat_view(obj.render.world_tsr);
    m_util.quat_to_dir(quat, m_util.AXIS_Z, light.direction);
    m_vec3.normalize(light.direction, light.direction);

    if (light.type == "SUN") {
        var prev_angle = Math.acos(m_vec3.dot(light.prev_direction, m_util.VEC3_UNIT));
        var new_angle  = Math.acos(m_vec3.dot(light.direction, m_util.VEC3_UNIT));
        var floor_prev = Math.floor(prev_angle / 0.025);
        var floor_new  = Math.floor(new_angle / 0.025);

        if (floor_prev != floor_new)
            light.need_sun_fog_update = true;
        else
            light.need_sun_fog_update = false;
    }

    m_vec3.copy(light.direction, light.prev_direction);
}

}
