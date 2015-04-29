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

/**
 * Create light
 * @param type Light type: POINT, SUN,...
 */
exports.init_light = init_light;
function init_light(type) {

    // initialize properties (do not consider values as default!)
    var light = {
        name: "",
        index: 0,
        type: type,

        use_diffuse: false,
        use_specular: false,

        direction: new Float32Array(3),
        color: new Float32Array(3),
        color_intensity: new Float32Array(3),

        energy: 0,
        distance: 0,

        spot_size: 0,
        spot_blend: 0,

        falloff_type: "",

        generate_shadows: false,

        // have influence only for sun
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
exports.lamp_to_light = function(lamp_obj) {

    var data = lamp_obj["data"];

    var light = init_light(data["type"]);

    light.name = lamp_obj["name"];

    light.use_diffuse = data["use_diffuse"];
    light.use_specular = data["use_specular"];

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

    if (light.type === "POINT" || light.type === "SPOT")
        light.distance = data["distance"];

    if (light.type === "SPOT") {
        light.spot_blend = data["spot_blend"];
        light.spot_size = data["spot_size"];
    } else if (light.type === "POINT")
        light.spot_size = Math.PI / 2;

    light.generate_shadows = data["b4w_generate_shadows"];
    light.dynamic_intensity = data["b4w_dynamic_intensity"];

    lamp_obj._light = light;
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

exports.is_lamp = function(obj) {
    if (obj["type"] === "LAMP")
        return true;
    else
        return false;
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

}
