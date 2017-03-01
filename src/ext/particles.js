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
"use strict";

/**
 * {@link https://www.blend4web.com/doc/en/particles.html|Particle system} API. Please note that particle emission itself is controlled by the {@link module:animation} module.
 * @module particles
 */
b4w.module["particles"] = function(exports, require) {

var m_particles = require("__particles");
var m_print     = require("__print");

/**
 * Set particle size.
 * @method module:particles.set_size
 * @param {Object3D} obj Emitter object.
 * @param {string} psys_name Particle system name.
 * @param {number} size Particle size.
 * @example var m_particles = require("particles");
 * var m_scenes = require("scenes");
 *
 * var cube = m_scenes.get_object_by_name("Cube");
 * m_particles.set_size(cube, "MyParticleSystem", 2.4);
 */
exports.set_size = function(obj, psys_name, size) {
    if (!m_particles.obj_has_psys(obj, psys_name)) {
        m_print.error("set_size(): Object \"" + obj.name + "\" has not a particle system named \"" 
                + psys_name + "\"");
        return;
    }
    m_particles.set_size(obj, psys_name, size);
}


/**
 * Set particle normal factor.
 * @method module:particles.set_normal_factor
 * @param {Object3D} obj Emitter object.
 * @param {string} psys_name Particle system name.
 * @param {number} nfactor Particle normal factor.
 * @example var m_particles = require("particles");
 * var m_scenes = require("scenes");
 *
 * var cube = m_scenes.get_object_by_name("Cube");
 * m_particles.set_normal_factor(cube, "MyParticleSystem", 15);
 */
exports.set_normal_factor = function(obj, psys_name, nfactor) {
    if (!m_particles.obj_has_psys(obj, psys_name)) {
        m_print.error("set_normal_factor(): Object \"" + obj.name + "\" has not a particle system named \"" 
                + psys_name + "\"");
        return;
    }
    m_particles.set_normal_factor(obj, psys_name, nfactor);
}

/**
 * Set particle number factor.
 * @method module:particles.set_factor
 * @param {Object3D} obj Emitter object.
 * @param {string} psys_name Particle system name.
 * @param {number} factor Particle number factor. A coefficient defining the 
 * number of particles to be emitted. 1 - all particles, 0 - none.
 * @example var m_particles = require("particles");
 * var m_scenes = require("scenes");
 *
 * var cube = m_scenes.get_object_by_name("Cube");
 * m_particles.set_factor(cube, "MyParticleSystem", 0.3);
 */
exports.set_factor = function(obj, psys_name, factor) {
    if (!m_particles.obj_has_psys(obj, psys_name)) {
        m_print.error("set_factor(): Object \"" + obj.name + "\" has not a particle system named \"" 
                + psys_name + "\"");
        return;
    }
    factor = Math.min(factor, 1);
    factor = Math.max(factor, 0);

    m_particles.set_factor(obj, psys_name, factor);
}

}
