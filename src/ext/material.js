"use strict";

/**
 * Material API.
 * @module material
 */
b4w.module["material"] = function(exports, require) {

var m_batch   = require("__batch");
var m_cfg     = require("__config");
var m_print   = require("__print");
var m_obj     = require("__objects");
var m_shaders = require("__shaders");
var m_util    = require("__util");

var m_vec4    = require("vec4");

var cfg_def = m_cfg.defaults;

var BATCH_INHERITED_TEXTURES = ["u_colormap0", "u_colormap1", "u_stencil0",
        "u_specmap", "u_normalmap0", "u_mirrormap"];

/**
 * Inherit the batch material from another object.
 * @method module:material.inherit_material
 * @param {Object} obj_to Destination Object ID 
 * @param {String} mat_to_name Destination material name
 * @param {Object} obj_from Source Object ID 
 * @param {String} mat_from_name Source material name
 */
exports.inherit_material = function(obj_from, mat_from_name, obj_to, 
        mat_to_name) {

    if (!m_obj.is_dynamic_mesh(obj_to) || !m_obj.is_dynamic_mesh(obj_from)) {
        m_print.error("Wrong or batched object(s)");
        return;
    }

    var types = ["MAIN", "DEPTH", "COLOR_ID"];
    var batches_found = false;
    for (var i = 0; i < types.length; i++) {
        var type = types[i];

        var batch_from = m_batch.find_batch_material(obj_from, 
                mat_from_name, type);
        var batch_to = m_batch.find_batch_material(obj_to, mat_to_name, 
                type);

        if (batch_from && batch_to) {
            batches_found = true;
            var child_batch = m_batch.find_batch_material_forked(obj_to, mat_to_name,
                    type);
            if (type == "MAIN") {
                m_batch.set_material_props(batch_to, batch_from);
                if (child_batch)
                    m_batch.set_material_props(child_batch, batch_from);
            }

            // inherit textures
            for (var j = 0; j < batch_to.texture_names.length; j++) {
                var to_name = batch_to.texture_names[j];
                if (BATCH_INHERITED_TEXTURES.indexOf(to_name) !== -1) {
                    var from_index = batch_from.texture_names.indexOf(to_name);
                    if (from_index !== -1) {
                        batch_to.textures[j] = batch_from.textures[from_index];

                        //inherit textures for child batches
                        if (child_batch) {
                            var child_index 
                                        = child_batch.texture_names.indexOf(to_name);
                            if (child_index !== -1)
                                child_batch.textures[child_index] 
                                        = batch_from.textures[from_index];
                        }
                    }
                }
            }
        }
    }

    if (!batches_found)
        m_print.error("Wrong objects for inheriting material!")
}

function check_batch_material(obj, mat_name) {
    var batches = obj._batches;

    for (var i = 0; i < batches.length; i++) {
        var batch = batches[i];

        if (batch.material_names.indexOf(mat_name) > -1)
            return (batch.type == "MAIN");
    }

    return false;
}

/**
 * Get materials' names for the given object
 * @method module:material.get_materials_names
 * @param {Object} obj Object ID
 * @returns {Array} Array of materials' names
 */
exports.get_materials_names = function(obj) {

    var mat_names = new Array();

    var batches = obj._batches;
    for (var j = 0; j < batches.length; j++)
        for (var i = 0; i < batches[j].material_names.length; i++)
            if (mat_names.indexOf(batches[j].material_names[i]) == -1)
                mat_names.push(batches[j].material_names[i]);

    return mat_names;
}

/**
 * Set the diffuse color and alpha for the object material.
 * @method module:material.set_diffuse_color
 * @param {Object} obj Object ID 
 * @param {String} mat_name Material name
 * @param {Float32Array} color Color+alpha vector
 */
exports.set_diffuse_color = function(obj, mat_name, color) {
    var batch = m_batch.find_batch_material(obj, mat_name, "MAIN");
    if (batch) {
        batch.diffuse_color.set(color);
        var reflect_batch = m_batch.find_batch_material_forked(obj, mat_name, "MAIN");
        if (reflect_batch)
            reflect_batch.diffuse_color.set(color);
    } else
        m_print.error("Couldn't set property \"diffuse_color\"!");
}

/**
 * Get the diffuse color and alpha for the object material.
 * @method module:material.get_diffuse_color
 * @param {Object} obj Object ID 
 * @param {String} mat_name Material name
 * @returns {Float32Array} Material diffuse color+alpha
 */
exports.get_diffuse_color = function(obj, mat_name) {
    var batch = m_batch.find_batch_material(obj, mat_name, "MAIN");
    if (batch) {
        var color = new Array(4);
        color[0] = batch.diffuse_color[0];
        color[1] = batch.diffuse_color[1];
        color[2] = batch.diffuse_color[2];
        color[3] = batch.diffuse_color[3];

        return color;
    } else
        m_print.error("Couldn't get property \"diffuse_color\"!");
}

/**
 * Set the diffuse color intensity for the object material.
 * @method module:material.set_diffuse_intensity
 * @param {Object} obj Object ID 
 * @param {String} mat_name Material name
 * @param {Number} intensity Diffuse intencity value
 */
exports.set_diffuse_intensity = function(obj, mat_name, intensity) {
    var batch = m_batch.find_batch_material(obj, mat_name, "MAIN");
    if (batch) {
        batch.diffuse_intensity = intensity;
        var reflect_batch = m_batch.find_batch_material_forked(obj, mat_name, "MAIN");
        if (reflect_batch)
            reflect_batch.diffuse_intensity = intensity;
    } else
        m_print.error("Couldn't set property \"diffuse_color\"!");
}

/**
 * Get the diffuse color intensity for the object material.
 * @method module:material.get_diffuse_intensity
 * @param {Object} obj Object ID 
 * @param {String} mat_name Material name
 * @returns {Number} Diffuse intencity value
 */
exports.get_diffuse_intensity = function(obj, mat_name) {
    var batch = m_batch.find_batch_material(obj, mat_name, "MAIN");
    if (batch)
        return batch.diffuse_intensity;
    else
        m_print.error("Couldn't get property \"diffuse_intensity\"!");
}

/**
 * Set the specular color for the object material.
 * @method module:material.set_specular_color
 * @param {Object} obj Object ID 
 * @param {String} mat_name Material name
 * @param {Float32Array} color Color vector
 */
exports.set_specular_color = function(obj, mat_name, color) {
    var batch = m_batch.find_batch_material(obj, mat_name, "MAIN");
    if (batch) {
        batch.specular_color.set(color);
        var reflect_batch = m_batch.find_batch_material_forked(obj, mat_name, "MAIN");
        if (reflect_batch)
            reflect_batch.specular_color.set(color);
    } else
        m_print.error("Couldn't set property \"specular_color\"!");
}

/**
 * Get the specular color for the object material.
 * @method module:material.get_specular_color
 * @param {Object} obj Object ID 
 * @param {String} mat_name Material name
 * @returns {Float32Array} Specular color
 */
exports.get_specular_color = function(obj, mat_name) {
    var batch = m_batch.find_batch_material(obj, mat_name, "MAIN");
    if (batch) {
        var color = new Array(3);
        color[0] = batch.specular_color[0];
        color[1] = batch.specular_color[1];
        color[2] = batch.specular_color[2];
        return color;
    } else
        m_print.error("Couldn't get property \"specular_color\"!");
}

/**
 * Set the specular color intensity for the object material.
 * @method module:material.set_specular_intensity
 * @param {Object} obj Object ID 
 * @param {String} mat_name Material name
 * @param {Number} intensity Specular intensity value
 */
exports.set_specular_intensity = function(obj, mat_name, intensity) {
    if (!check_specular_intensity(obj, mat_name))
        m_print.error("Property \"specular_intensity\" is missing!");

    var batch = m_batch.find_batch_material(obj, mat_name, "MAIN");
    batch.specular_params[0] = intensity;
    var reflect_batch = m_batch.find_batch_material_forked(obj, mat_name, "MAIN");
    if (reflect_batch)
        reflect_batch.specular_params[0] = intensity;
}

/**
 * Get the specular color intensity for the object material.
 * @method module:material.get_specular_intensity
 * @param {Object} obj Object ID 
 * @param {String} mat_name Material name
 * @returns {Number} Specular color intensity
 */
exports.get_specular_intensity = function(obj, mat_name) {
    if (!check_specular_intensity(obj, mat_name))
        m_print.error("Property \"specular_intensity\" is missing!");

    var batch = m_batch.find_batch_material(obj, mat_name, "MAIN");
    return batch.specular_params[0];
}

exports.check_specular_intensity = check_specular_intensity;
/**
 * Check the specular intensity for the object material.
 * @method module:material.check_specular_intensity
 * @param {Object} obj Object ID 
 * @param {String} mat_name Material name
 * @returns {Boolean} Specular intensity presence
 */
function check_specular_intensity(obj, mat_name) {
    var batch = m_batch.find_batch_material(obj, mat_name, "MAIN");
    return Boolean(batch && batch.specular_params[0]);
}

/**
 * Set the specular color hardness for the object material.
 * @method module:material.set_specular_hardness
 * @param {Object} obj Object ID 
 * @param {String} mat_name Material name
 * @param {Number} hardness Specular hardness value
 */
exports.set_specular_hardness = function(obj, mat_name, hardness) {
    if (!check_specular_hardness(obj, mat_name))
        m_print.error("Property \"specular_hardness\" is missing!");

    var batch = m_batch.find_batch_material(obj, mat_name, "MAIN");
    batch.specular_params[1] = hardness;
    var reflect_batch = m_batch.find_batch_material_forked(obj, mat_name, "MAIN");
    if (reflect_batch)
        reflect_batch.specular_params[1] = hardness;
}

/**
 * Get the specular color hardness for the object material.
 * @method module:material.get_specular_hardness
 * @param {Object} obj Object ID 
 * @param {String} mat_name Material name
 * @returns {Number} Specular color hardness
 */
exports.get_specular_hardness = function(obj, mat_name) {
    if (!check_specular_hardness(obj, mat_name))
        m_print.error("Property \"specular_hardness\" is missing!");

    var batch = m_batch.find_batch_material(obj, mat_name, "MAIN");
    return batch.specular_params[1];
}

exports.check_specular_hardness = check_specular_hardness;
/**
 * Check the specular hardness for the object material.
 * @method module:material.check_specular_hardness
 * @param {Object} obj Object ID 
 * @param {String} mat_name Material name
 * @returns {Boolean} Specular hardness presence
 */
function check_specular_hardness(obj, mat_name) {
    var batch = m_batch.find_batch_material(obj, mat_name, "MAIN");
    return Boolean(batch && batch.specular_params[1]);
}

/**
 * Set the emit factor for the object material.
 * @method module:material.set_emit_factor
 * @param {Object} obj Object ID 
 * @param {String} mat_name Material name
 * @param {Number} emit_factor Emit factor value
 */
exports.set_emit_factor = function(obj, mat_name, emit_factor) {
    var batch = m_batch.find_batch_material(obj, mat_name, "MAIN");
    if (batch) {
        batch.emit = emit_factor;
        var reflect_batch = m_batch.find_batch_material_forked(obj, mat_name, "MAIN");
        if (reflect_batch)
            reflect_batch.emit = emit_factor;
    } else
        m_print.error("Couldn't set property \"emit_factor\"!");
}

/**
 * Get the emit factor for the object material.
 * @method module:material.get_emit_factor
 * @param {Object} obj Object ID 
 * @param {String} mat_name Material name
 * @returns {Number} Emit factor value
 */
exports.get_emit_factor = function(obj, mat_name) {
    var batch = m_batch.find_batch_material(obj, mat_name, "MAIN");
    if (batch)
        return batch.emit;
    else
        m_print.error("Couldn't get property \"emit_factor\"!");

}

/**
 * Set the ambient factor for the object material.
 * @method module:material.set_ambient_factor
 * @param {Object} obj Object ID 
 * @param {String} mat_name Material name
 * @param {Number} ambient_factor Ambient factor value
 */
exports.set_ambient_factor = function(obj, mat_name, ambient_factor) {
    var batch = m_batch.find_batch_material(obj, mat_name, "MAIN");
    if (batch) {
        batch.ambient = ambient_factor;
        var reflect_batch = m_batch.find_batch_material_forked(obj, mat_name, "MAIN");
        if (reflect_batch)
            reflect_batch.ambient = ambient_factor;
    } else
        m_print.error("Couldn't set property \"ambient_factor\"!");
}

/**
 * Get the ambient factor for the object material.
 * @method module:material.get_ambient_factor
 * @param {Object} obj Object ID 
 * @param {String} mat_name Material name
 * @returns {Number} Ambient factor value
 */
exports.get_ambient_factor = function(obj, mat_name) {
    var batch = m_batch.find_batch_material(obj, mat_name, "MAIN");
    if (batch)
        return batch.ambient;
    else
        m_print.error("Couldn't get property \"ambient_factor\"!");

}

/**
 * Set the diffuse color factor for the object material.
 * @method module:material.set_diffuse_color_factor
 * @param {Object} obj Object ID 
 * @param {String} mat_name Material name
 * @param {Number} diffuse_color_factor Diffuse color factor value
 */
exports.set_diffuse_color_factor = function(obj, mat_name, 
        diffuse_color_factor) {
    var batch = m_batch.find_batch_material(obj, mat_name, "MAIN");
    if (batch) {
        batch.diffuse_color_factor = diffuse_color_factor;
        var reflect_batch = m_batch.find_batch_material_forked(obj, mat_name, "MAIN");
        if (reflect_batch)
            reflect_batch.diffuse_color_factor = diffuse_color_factor;
    } else
        m_print.error("Couldn't set property \"diffuse_color_factor\"!");
}

/**
 * Get the diffuse color factor for the object material.
 * @method module:material.get_diffuse_color_factor
 * @param {Object} obj Object ID 
 * @param {String} mat_name Material name
 * @returns {Number} Diffuse color factor value
 */
exports.get_diffuse_color_factor = function(obj, mat_name) {
    var batch = m_batch.find_batch_material(obj, mat_name, "MAIN");
    if (batch)
        return batch.diffuse_color_factor;
    else
        m_print.error("Couldn't get property \"diffuse_color_factor\"!");
}

/**
 * Set the alpha factor for the object material.
 * @method module:material.set_alpha_factor
 * @param {Object} obj Object ID
 * @param {String} mat_name Material name
 * @param {Number} alpha_factor Alpha factor value
 */
exports.set_alpha_factor = function(obj, mat_name,
        alpha_factor) {
    var batch = m_batch.find_batch_material(obj, mat_name, "MAIN");
    if (batch) {
        batch.alpha_factor = alpha_factor;
        var reflect_batch = m_batch.find_batch_material_forked(obj, mat_name, "MAIN");
        if (reflect_batch)
            reflect_batch.alpha_factor = alpha_factor;
    } else
        m_print.error("Couldn't set property \"alpha_factor\"!");
}

/**
 * Get the diffuse alpha factor for the object material.
 * @method module:material.get_alpha_factor
 * @param {Object} obj Object ID
 * @param {String} mat_name Material name
 * @returns {Number} Diffuse alpha factor value
 */
exports.get_alpha_factor = function(obj, mat_name) {
    var batch = m_batch.find_batch_material(obj, mat_name, "MAIN");
    if (batch)
        return batch.alpha_factor;
    else
        m_print.error("Couldn't get property \"alpha_factor\"!");
}

/**
 * Get the material extended params
 * @method module:material.get_material_extended_params
 * @param {Object} obj Object
 * @param {String} mat_name Material name
 * @returns {(Object|null)} Material extended params or null
 */
exports.get_material_extended_params = function(obj, mat_name) {

    if (!obj || !mat_name) {
        m_print.error("missing arguments in get_material_params");
        return null;
    }

    // check that getting material params is possible
    if (!check_batch_material(obj, mat_name))
        return null;

    var batch = m_batch.find_batch_material(obj, mat_name, "MAIN");
    if (!batch)
        return null;

    var mat_params = {};

    if (batch.type == "MAIN") {
        mat_params.reflect_factor = batch.reflect_factor;
        mat_params.fresnel        = batch.fresnel_params[2];
        mat_params.fresnel_factor = 5 * (1 - batch.fresnel_params[3]);
        mat_params.parallax_scale = batch.parallax_scale;
        mat_params.parallax_steps = m_batch.get_batch_directive(batch,
                "PARALLAX_STEPS")[1];
    }

    return mat_params;
}

/**
 * Get params for the water material 
 * @method module:material.get_water_material_params
 * @param {Object} obj Object
 * @param {String} water_mat_name Water material name
 * @returns {(Object|null)} Water material params or null
 */
exports.get_water_material_params = function(obj, water_mat_name) {

    if (!obj || !water_mat_name) {
        m_print.error("missing arguments in get_water_material_params");
        return null;
    }

    // check that getting material params is possible
    if (!check_batch_material(obj, water_mat_name))
        return null;

    var batch = m_batch.find_batch_material(obj, water_mat_name, "MAIN");
    if (!batch || !batch.water)
        return null;

    if (!batch) {
        m_print.error("material not found");
        return null;
    }
    var water_mat_params = {};

    if (batch.type == "MAIN") {

        if (cfg_def.shore_distance) {

            var shlwc = water_mat_params.shallow_water_col = new Array(3);

            shlwc[0]  = batch.shallow_water_col[0];
            shlwc[1]  = batch.shallow_water_col[1];
            shlwc[2]  = batch.shallow_water_col[2];

            var shrwc = water_mat_params.shore_water_col = new Array(3);

            shrwc[0]  = batch.shore_water_col[0];
            shrwc[1]  = batch.shore_water_col[1];
            shrwc[2]  = batch.shore_water_col[2];

            water_mat_params.shallow_water_col_fac = batch.shallow_water_col_fac;
            water_mat_params.shore_water_col_fac = batch.shore_water_col_fac;
        }

        water_mat_params.foam_factor = batch.foam_factor;
        water_mat_params.norm_uv_velocity = batch.water_norm_uv_velocity;
        water_mat_params.absorb_factor = m_batch.get_batch_directive(batch,
                "ABSORB")[1];
        water_mat_params.sss_strength = m_batch.get_batch_directive(batch,
                "SSS_STRENGTH")[1];
        water_mat_params.sss_width = m_batch.get_batch_directive(batch,
                "SSS_WIDTH")[1];
        water_mat_params.dst_noise_scale0 = m_batch.get_batch_directive(batch,
                "DST_NOISE_SCALE_0")[1];
        water_mat_params.dst_noise_scale1 = m_batch.get_batch_directive(batch,
                "DST_NOISE_SCALE_1")[1];
        water_mat_params.dst_noise_freq0 = m_batch.get_batch_directive(batch,
                "DST_NOISE_FREQ_0")[1];
        water_mat_params.dst_noise_freq1 = m_batch.get_batch_directive(batch,
                "DST_NOISE_FREQ_1")[1];
        water_mat_params.dir_min_shore_fac = m_batch.get_batch_directive(batch,
                "DIR_MIN_SHR_FAC")[1];
        water_mat_params.dir_freq = m_batch.get_batch_directive(batch,
                "DIR_FREQ")[1];
        water_mat_params.dir_noise_scale = m_batch.get_batch_directive(batch,
                "DIR_NOISE_SCALE")[1];
        water_mat_params.dir_noise_freq = m_batch.get_batch_directive(batch,
                "DIR_NOISE_FREQ")[1];
        water_mat_params.dir_min_noise_fac = m_batch.get_batch_directive(batch,
                "DIR_MIN_NOISE_FAC")[1];
        water_mat_params.dst_min_fac = m_batch.get_batch_directive(batch,
                "DST_MIN_FAC")[1];
        water_mat_params.waves_hor_fac = m_batch.get_batch_directive(batch,
                "WAVES_HOR_FAC")[1];
    }

    return water_mat_params;
}

/**
 * Set the material params
 * @method module:material.set_material_params
 * @param {Object} obj Object
 * @param {String} mat_name Material name
 * @param {Object} mat_params Material params
 * @cc_externs material_reflectivity material_fresnel
 * @cc_externs material_fresnel_factor material_parallax_scale
 * @cc_externs material_parallax_steps
 */
exports.set_material_extended_params = function(obj, mat_name, mat_params) {
    if (!obj || !mat_name || !mat_params) {
        m_print.error("missing arguments in set_material_params");
        return;
    }

    // check that setting material params is possible
    if (!check_batch_material(obj, mat_name)) {
        m_print.error("setting material params is not possible");
        return null;
    }
    
    var batch = m_batch.find_batch_material(obj, mat_name, "MAIN");

    if (!batch) {
        m_print.error("material not found");
        return;
    }
    var batches = [batch];
    var reflect_batch = m_batch.find_batch_material_forked(obj, mat_name, "MAIN");
    if (reflect_batch)
        batches.push(reflect_batch);

    for (var i = 0; i < batches.length; i++) {
        var batch = batches[i];
        if (typeof mat_params.material_reflectivity == "number") {
            var refl = mat_params.material_reflectivity;
            batch.reflect_factor = refl;
        }

        if (typeof mat_params.material_fresnel == "number") {
            var fresnel = mat_params.material_fresnel;
            batch.fresnel_params[2] = fresnel;
        }

        if (typeof mat_params.material_fresnel_factor == "number") {
            var fresnel_factor = 1 - mat_params.material_fresnel_factor / 5;
            batch.fresnel_params[3] = fresnel_factor;
        }

        if (typeof mat_params.material_parallax_scale == "number") {
            var parallax_scale = mat_params.material_parallax_scale;
            batch.parallax_scale = parallax_scale;
        }

        if (typeof mat_params.material_parallax_steps == "number") {
            var parallax_steps = m_shaders.glsl_value(parseFloat(mat_params.material_parallax_steps));
            m_batch.set_batch_directive(batch, "PARALLAX_STEPS", parallax_steps);
            m_batch.update_shader(batch, true);
        }
    }
}

/**
 * Set params for the water material
 * @method module:material.set_water_material_params
 * @param {Object} obj Object
 * @param {String} water_mat_name  Water material name
 * @param {Object} water_mat_params Water material params
 * @cc_externs shallow_water_col shore_water_col shallow_water_col_fac
 * @cc_externs shore_water_col_fac foam_factor absorb_factor sss_strength
 * @cc_externs sss_width shore_smoothing norm_uv_velocity
 */
exports.set_water_material_params = function(obj, water_mat_name, water_mat_params) {

    if (!obj || !water_mat_name || !water_mat_params) {
        m_print.error("missing arguments in set_water_material_params");
        return null;
    }

    // check that setting material params is possible
    if (!check_batch_material(obj, water_mat_name)) {
        m_print.error("setting water material params is not possible");
        return null;
    }

    var batch = m_batch.find_batch_material(obj, water_mat_name, "MAIN");

    if (!batch) {
        m_print.error("material not found");
        return null;
    }
    var batches = [batch];
    var reflect_batch = m_batch.find_batch_material_forked(obj, mat_name, "MAIN");
    if (reflect_batch)
        batches.push(reflect_batch);

    for (var i = 0; i < batches.length; i++) {
        var batch = batches[i];
        if (cfg_def.shore_distance) {
            if (typeof  water_mat_params.shallow_water_col == "object")
                batch.shallow_water_col.set(
                        water_mat_params.shallow_water_col);
            if (typeof  water_mat_params.shallow_water_col_fac == "number") {
                batch.shallow_water_col_fac = water_mat_params.shallow_water_col_fac;
            }
            if (typeof  water_mat_params.shore_water_col == "object")
                batch.shore_water_col.set(water_mat_params.shore_water_col);
            if (typeof  water_mat_params.shore_water_col_fac == "number") {
                batch.shore_water_col_fac = water_mat_params.shore_water_col_fac;
            }
        }

        if (cfg_def.shore_smoothing && batch.water_shore_smoothing) {
            if (typeof water_mat_params.shore_smoothing == "boolean") {
                if (water_mat_params.shore_smoothing)
                    m_batch.set_batch_directive(batch, "SHORE_SMOOTHING", 1);
                else
                    m_batch.set_batch_directive(batch, "SHORE_SMOOTHING", 0);
            }
            if (typeof water_mat_params.absorb_factor == "number") {
                var absorb_factor = m_shaders.glsl_value(parseFloat(water_mat_params.absorb_factor));
                m_batch.set_batch_directive(batch, "ABSORB", absorb_factor);
            }
        }

        if (typeof water_mat_params.foam_factor == "number" && cfg_def.foam) {
            batch.foam_factor = water_mat_params.foam_factor;
        }
        if (typeof water_mat_params.norm_uv_velocity == "number") {
            batch.water_norm_uv_velocity = water_mat_params.norm_uv_velocity;
        }

        if (cfg_def.water_dynamic && batch.water_dynamic) {
            if (typeof water_mat_params.water_dynamic == "boolean") {
                if (water_mat_params.water_dynamic)
                    m_batch.set_batch_directive(batch, "DYNAMIC", 1);
                else
                    m_batch.set_batch_directive(batch, "DYNAMIC", 0);
            }
            if (typeof water_mat_params.waves_height == "number") {
                var waves_height = m_shaders.glsl_value(parseFloat(
                                       water_mat_params.waves_height));
                m_batch.set_batch_directive(batch, "WAVES_HEIGHT", waves_height);
            }
            if (typeof water_mat_params.waves_length  == "number") {
                var waves_length = m_shaders.glsl_value(parseFloat(
                                       water_mat_params.waves_length));
                m_batch.set_batch_directive(batch, "WAVES_LENGTH", waves_length);
            }
            if (typeof water_mat_params.sss_strength == "number") {
                var waves_length = m_shaders.glsl_value(parseFloat(
                                       water_mat_params.sss_strength));
                m_batch.set_batch_directive(batch, "SSS_STRENGTH", waves_length);
            }
            if (typeof water_mat_params.sss_width == "number") {
                var waves_length = m_shaders.glsl_value(parseFloat(
                                       water_mat_params.sss_width));
                m_batch.set_batch_directive(batch, "SSS_WIDTH", waves_length);
            }
            if (typeof water_mat_params.dst_noise_scale0 == "number") {
                var dst_noise_scale0 = m_shaders.glsl_value(parseFloat(
                                       water_mat_params.dst_noise_scale0));
                m_batch.set_batch_directive(batch, "DST_NOISE_SCALE_0", dst_noise_scale0);
            }
            if (typeof water_mat_params.dst_noise_scale1 == "number") {
                var dst_noise_scale1 = m_shaders.glsl_value(parseFloat(
                                       water_mat_params.dst_noise_scale1));
                m_batch.set_batch_directive(batch, "DST_NOISE_SCALE_1", dst_noise_scale1);
            }
            if (typeof water_mat_params.dst_noise_freq0 == "number") {
                var dst_noise_freq0 = m_shaders.glsl_value(parseFloat(
                                      water_mat_params.dst_noise_freq0));
                m_batch.set_batch_directive(batch, "DST_NOISE_FREQ_0", dst_noise_freq0);
            }
            if (typeof water_mat_params.dst_noise_freq1 == "number") {
                var dst_noise_freq1 = m_shaders.glsl_value(parseFloat(
                                      water_mat_params.dst_noise_freq1));
                m_batch.set_batch_directive(batch, "DST_NOISE_FREQ_1", dst_noise_freq1);
            }
            if (typeof water_mat_params.dir_min_shore_fac == "number") {
                var dir_min_shore_fac = m_shaders.glsl_value(parseFloat(
                                        water_mat_params.dir_min_shore_fac));
                m_batch.set_batch_directive(batch, "DIR_MIN_SHR_FAC", dir_min_shore_fac);
            }
            if (typeof water_mat_params.dir_freq == "number") {
                var dir_freq = m_shaders.glsl_value(parseFloat(
                               water_mat_params.dir_freq));
                m_batch.set_batch_directive(batch, "DIR_FREQ", dir_freq);
            }
            if (typeof water_mat_params.dir_noise_scale == "number") {
                var dir_noise_scale = m_shaders.glsl_value(parseFloat(
                                      water_mat_params.dir_noise_scale));
                m_batch.set_batch_directive(batch, "DIR_NOISE_SCALE", dir_noise_scale);
            }
            if (typeof water_mat_params.dir_noise_freq == "number") {
                var dir_noise_freq = m_shaders.glsl_value(parseFloat(
                                     water_mat_params.dir_noise_freq));
                m_batch.set_batch_directive(batch, "DIR_NOISE_FREQ", dir_noise_freq);
            }
            if (typeof water_mat_params.dir_min_noise_fac == "number") {
                var dir_min_noise_fac = m_shaders.glsl_value(parseFloat(
                                        water_mat_params.dir_min_noise_fac));
                m_batch.set_batch_directive(batch, "DIR_MIN_NOISE_FAC", dir_min_noise_fac);
            }
            if (typeof water_mat_params.dst_min_fac == "number") {
                var dst_min_fac = m_shaders.glsl_value(parseFloat(
                                  water_mat_params.dst_min_fac));
                m_batch.set_batch_directive(batch, "DST_MIN_FAC", dst_min_fac);
            }
            if (typeof water_mat_params.waves_hor_fac == "number") {
                var waves_hor_fac = m_shaders.glsl_value(parseFloat(
                                    water_mat_params.waves_hor_fac));
                m_batch.set_batch_directive(batch, "WAVES_HOR_FAC", waves_hor_fac);
            }
        }
        m_batch.update_shader(batch, true);
    }
    return true;
}

}
