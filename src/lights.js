"use strict";

/**
 * Lights internal API module.
 * @name lights
 * @namespace
 * @exports exports as lights
 */
b4w.module["__lights"] = function(exports, require) {

var m_util = require("__util");

var m_vec3 = require("vec3");

var _lamps_numb = 0;

/**
 * Convert blender lamp object to light
 * @param lamp_obj lamp object
 */
exports.lamp_to_light = function(lamp_obj) {
    var light = init_light();
    light.index = _lamps_numb++;

    light.name = lamp_obj["name"];

    var data = lamp_obj["data"];
    light.type = data["type"];

    var quat = lamp_obj._render.quat;
    var dir = m_util.quat_to_dir(quat, m_util.AXIS_Y, []);

    // though dir seems to be normalized, do it explicitely
    m_vec3.normalize(dir, dir);

    light.direction[0] = dir[0];
    light.direction[1] = dir[1];
    light.direction[2] = dir[2];

    light.color[0] = data["color"][0];
    light.color[1] = data["color"][1];
    light.color[2] = data["color"][2];

    light.energy = data["energy"];

    update_color_intensity(light);

    light.distance = data["distance"];

    if (light.type === "POINT" || light.type === "SPOT") {
        light.falloff_type = data["falloff_type"];
    }

    if (light.type === "SPOT") {
        light.spot_size = data["spot_size"];
        light.spot_blend = data["spot_blend"];
    }
    
    light.generate_shadows = data["b4w_generate_shadows"];
    light.dynamic_intensity = data["b4w_dynamic_intensity"];
    lamp_obj._light = light;
}


function init_light() {

    var light = {};

    light.direction = new Float32Array(3);
    m_vec3.normalize(light.direction, light.direction);

    light.color = new Float32Array(3);
    light.energy = 1.0;

    light.color_intensity = new Float32Array(3);
    update_color_intensity(light);

    light.distance = 25.0;
    
    light.generate_shadows = false;

    return light;
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
    light.color_intensity[0] = light.color[0] * light.energy;
    light.color_intensity[1] = light.color[1] * light.energy;
    light.color_intensity[2] = light.color[2] * light.energy;
}

exports.update_light_transform = update_light_transform;
/**
 * @methodOf lights 
 */
function update_light_transform(obj) {

    if (obj["type"] != "LAMP")
        throw "Wrong light object";

    var light = obj._light;
    if (!light)
        return;

    m_util.quat_to_dir(obj._render.quat, m_util.AXIS_Y, light.direction);

}

/**
 * Perform module cleanup
 */
exports.cleanup = function() {
    _lamps_numb = 0;
}

}
