"use strict";

/**
 * Particles API. Particles emission controlled by
 * {@link module:animation}.
 * @module particles
 */
b4w.module["particles"] = function(exports, require) {

var m_particles = require("__particles");
var m_print     = require("__print");

/**
 * Set particles size.
 * @method module:particles.set_size
 * @param {Object3D} obj Emitter object.
 * @param {String} psys_name Particles system name.
 * @param {Number} size Particles size.
 */
exports.set_size = function(obj, psys_name, size) {
    if (!m_particles.has_particles(obj)) {
        m_print.error("\"",obj["name"], "\" has no particle systems");
        return;
    }
    m_particles.set_size(obj, psys_name, size);
}


/**
 * Set particles normal factor.
 * @method module:particles.set_normal_factor
 * @param {Object3D} obj Emitter object.
 * @param {String} psys_name Particles system name.
 * @param {Number} nfactor Particles normal factor.
 */
exports.set_normal_factor = function(obj, psys_name, nfactor) {
    if (!m_particles.has_particles(obj)) {
        m_print.error("\"",obj["name"], "\" has no particle systems");
        return;
    }
    m_particles.set_normal_factor(obj, psys_name, nfactor);
}

/**
 * Set particles number factor.
 * @method module:particles.set_factor
 * @param {Object3D} obj Emitter object.
 * @param {String} psys_name Particles system name.
 * @param {Number} factor Particles num factor.
 */
exports.set_factor = function(obj, psys_name, factor) {
    if (!m_particles.has_particles(obj)) {
        m_print.error("\"",obj["name"], "\" has no particle systems");
        return;
    }
    factor = Math.min(factor, 1);
    factor = Math.max(factor, 0);

    m_particles.set_factor(obj, psys_name, factor);
}

}
