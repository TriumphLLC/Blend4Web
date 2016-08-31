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
 * Lights API.
 * @module lights
 * @local LightParams
 */
b4w.module["lights"] = function(exports, require) {

// TODO: consider use of standard translation/rotation functions from transform module

var m_lights   = require("__lights");
var m_obj      = require("__objects");
var m_obj_util = require("__obj_util");
var m_print    = require("__print");
var m_scenes   = require("__scenes");
var m_trans    = require("__transform");
var m_tsr      = require("__tsr");
var m_util     = require("__util");
var m_vec3     = require("__vec3");

var _sun_pos        = new Float32Array(3);
var _date           = {};
var _julian_date    = 0;
var _max_sun_angle  = 60;

/**
 * @typedef LightParams
 * @type {Object}
 * @property {String} light_type Light type
 * @property {Number} light_energy Light energy
 * @property {RGB} light_color Light color
 * @property {Number} light_spot_blend Blend parameter of SPOT light
 * @property {Number} light_spot_size Size parameter of SPOT light
 * @property {Number} light_distance Light falloff distance for POINT and SPOT
 * lights
 * @cc_externs light_type light_energy light_color
 * @cc_externs light_spot_blend light_spot_size light_distance
*/

/**
 * Get lamp objects.
 * If lamps_type is defined, creates a new array
 * @method module:lights.get_lamps
 * @param {String} [lamps_type] Lamps type ("POINT", "SPOT", "SUN", "HEMI")
 * @returns {Object3D[]} Array with lamp objects.
 */
exports.get_lamps = function(lamps_type) {

    var scene = m_scenes.get_active();
    var lamps = m_obj.get_scene_objs(scene, "LAMP", m_obj.DATA_ID_ALL);

    if (!lamps_type)
        return lamps;

    var rslt = [];
    for (var i = 0; i < lamps.length; i++) {
        var lamp = lamps[i];
        if (lamp.light.type === lamps_type)
            rslt.push(lamp);
    }
    return rslt;
}

exports.get_sun_params = get_sun_params;
/**
 * Get the sun parameters.
 * @method module:lights.get_sun_params
 * @returns {SunParams} Sun params object
 * @cc_externs hor_position vert_position
 */
function get_sun_params() {
    var scene = m_scenes.get_active();
    var lamps = m_obj.get_scene_objs(scene, "LAMP", m_obj.DATA_ID_ALL);
    var sun = null;

    for (var i = 0; i < lamps.length; i++) {
        var lamp = lamps[i];
        var light = lamp.light;
        if (light.type == "SUN") {
            sun = lamp;
            break
        }
    }

    if (sun) {
        var cur_dir = sun.light.direction;

        // sun azimuth
        var angle_hor = m_util.rad_to_deg(Math.atan2(cur_dir[2], cur_dir[0])) + 90;
        if (angle_hor > 180)
            angle_hor -= 360;

        // sun altitude
        var angle_vert = m_util.rad_to_deg(Math.atan2(
                cur_dir[1],
                Math.sqrt(cur_dir[0]*cur_dir[0] + cur_dir[2]*cur_dir[2])
                ));

        var sun_params = {};
        sun_params.hor_position  = angle_hor;
        sun_params.vert_position = angle_vert;
        return sun_params;
    } else
        return null;
}

exports.set_sun_params = set_sun_params;
/**
 * Set the sun parameters.
 * @method module:lights.set_sun_params
 * @param {SunParams} sun_params sun parameters
 */
function set_sun_params(sun_params) {

    var scene = m_scenes.get_active();
    var lamps = m_obj.get_scene_objs(scene, "LAMP", m_obj.DATA_ID_ALL);

    // Index of lamp(sun) on the scene

    for (var i = 0; i < lamps.length; i++) {
        var lamp = lamps[i];
        var light = lamp.light;
        if (light.type == "SUN") {
            var sun = lamp;
            break;
        }
    }

    if (!sun) {
        m_print.error("There is no sun on the scene");
        return;
    }

    if (typeof sun_params.hor_position == "number" &&
        typeof sun_params.vert_position == "number") {
        // convert to radians
        var angle_hor  =  m_util.deg_to_rad(180 - sun_params.hor_position);
        var angle_vert =  m_util.deg_to_rad(90 - sun_params.vert_position);

        var sun_render = sun.render;

        // rotate sun
        m_trans.set_rotation_euler(sun, [angle_vert, angle_hor, 0]);
        var dir = new Float32Array(3);
        var sun_quat = m_tsr.get_quat_view(sun_render.world_tsr);
        m_util.quat_to_dir(sun_quat, m_util.AXIS_Y, dir);

        var trans = m_tsr.get_trans_view(sun_render.world_tsr);
        var dist_to_center = m_vec3.length(trans);

        m_vec3.copy(dir, _sun_pos);
        m_vec3.scale(_sun_pos, dist_to_center, _sun_pos);

        // translate sun
        m_trans.set_translation(sun, _sun_pos);
        m_trans.update_transform(sun);

        var sun_light = sun.light;

        if (sun_light.dynamic_intensity) {

            // set amplitude lighting params
            var def_env_color = scene["world"]["light_settings"]["environment_energy"];
            var def_horizon_color = scene["world"]["horizon_color"];
            var def_zenith_color = scene["world"]["zenith_color"];

            // change sun intensity dependent to its position
            var energy     = Math.cos(Math.abs(angle_vert));
            var sun_energy = Math.max( Math.min(3.0 * energy, 1.0), 0.0) * sun_light.default_energy;
            var env_energy = Math.max(energy, 0.1) * def_env_color;

            m_lights.set_light_energy(sun_light, sun_energy);

            m_scenes.set_environment_colors(scene, env_energy, def_horizon_color, def_zenith_color);
        }
        m_scenes.update_lamp_scene(sun, scene);
    }
}

exports.set_day_time = set_day_time;
/**
 * Set the time of day.
 * @method module:lights.set_day_time
 * @param {Number} time new time (0.0...24.0)
 */
function set_day_time(time) {
    var scene = m_scenes.get_active();
    var lamps = m_obj.get_scene_objs(scene, "LAMP", m_obj.DATA_ID_ALL);

    for (var i = 0; i < lamps.length; i++) {
        var lamp = lamps[i];
        var light = lamp.light;
        if (light.type == "SUN") {
            var sun = lamp;
            break;
        }
    }

    if (!sun) {
        m_print.error("There is no sun on the scene");
        return;
    }

    update_sun_position(time);
}

/**
 * Set the date.
 * @method module:lights.set_date
 * @param {Date} date new date
 */
exports.set_date = function(date) {
    _date.y = date.getDate();
    _date.m = date.getMonth();
    _date.d = date.getFullYear();
	if(!_date.y) {
		m_print.error("There is no year 0 in the Julian system!");
        return;
    }
    if( _date.y == 1582 && date.m == 10 && date.d > 4 && date.d < 15 ) {
        m_print.error("The dates 5 through 14 October, 1582, do not exist in the Gregorian system!");
        return;
    }
    _julian_date = calendar_to_julian(_date);
}

/**
 * Set the maximum sun angle
 * @method module:lights.set_max_sun_angle
 * @param {Number} angle New angle in degrees (0..90)
 */
exports.set_max_sun_angle = function(angle) {
    _max_sun_angle = Math.min(Math.max(angle, 0), 90);
}

/**
 * Get the light params.
 * @method module:lights.get_light_params
 * @param {Object3D} lamp_obj Lamp object
 * @returns {LightParams | null} Light params or null in case of error
 */
exports.get_light_params = function(lamp_obj) {

    if (m_obj_util.is_lamp(lamp_obj))
        var light = lamp_obj.light;
    else {
        m_print.error("get_light_params(): Wrong object");
        return null;
    }

    var type = get_light_type(lamp_obj);

    if (type)
        switch (type) {
        case "SPOT":
            var rslt = {
                "light_type": type,
                "light_color": new Float32Array(3),
                "light_energy": light.energy,
                "light_spot_blend": light.spot_blend,
                "light_spot_size": light.spot_size,
                "light_distance" : light.distance
            };
            rslt["light_color"].set(light.color);
            break;
        case "POINT":
            var rslt = {
                "light_type": type,
                "light_color": new Float32Array(3),
                "light_energy": light.energy,
                "light_distance" : light.distance
            };
            rslt["light_color"].set(light.color);
            break;
        default:
            var rslt = {
                "light_type": type,
                "light_color": new Float32Array(3),
                "light_energy": light.energy
            };
            rslt["light_color"].set(light.color);
            break;
        }
    if (rslt)
        return rslt;
    else
        return null;
}

exports.get_light_type = get_light_type
/**
 * Get the light type.
 * @method module:lights.get_light_type
 * @param {Object3D} lamp_obj Lamp object.
 * @returns {String} Light type
 */
function get_light_type(lamp_obj) {
    if (m_obj_util.is_lamp(lamp_obj))
        return lamp_obj.light.type;
    else
        m_print.error("get_light_type(): Wrong object");
    return false;
}
/**
 * Set the light params.
 * @method module:lights.set_light_params
 * @param {Object3D} lamp_obj Lamp object
 * @param {LightParams} light_params Light params
 */
exports.set_light_params = function(lamp_obj, light_params) {

    if (m_obj_util.is_lamp(lamp_obj))
        var light = lamp_obj.light;
    else {
        m_print.error("set_light_params(): Wrong object");
        return;
    }

    var scene = m_scenes.get_active();

    var need_update_shaders = false;

    if (typeof light_params.light_energy == "number")
        m_lights.set_light_energy(light, light_params.light_energy);

    if (typeof light_params.light_color == "object")
        m_lights.set_light_color(light, light_params.light_color);

    if (typeof light_params.light_spot_blend == "number") {
        m_lights.set_light_spot_blend(light, light_params.light_spot_blend);
        need_update_shaders = true;        
    }

    if (typeof light_params.light_spot_size == "number") {
        m_lights.set_light_spot_size(light, light_params.light_spot_size);
        need_update_shaders = true;
    }

    if (typeof light_params.light_distance == "number") {
        m_lights.set_light_distance(light, light_params.light_distance);
        need_update_shaders = true;
    }

    m_scenes.update_lamp_scene(lamp_obj, scene);

    if (need_update_shaders)
        m_obj.update_all_mesh_shaders(scene);
}

/**
 * Get the light energy.
 * @method module:lights.get_light_energy
 * @param {Object3D} lamp_obj Lamp object
 * @returns {Number} Light energy value
 */
exports.get_light_energy = function(lamp_obj) {
    if (!m_obj_util.is_lamp(lamp_obj)) {
        m_print.error("get_light_energy(): Wrong object");
        return 0;
    }

    return lamp_obj.light.energy;
}

/**
 * Set the light energy.
 * @method module:lights.set_light_energy
 * @param {Object3D} lamp_obj Lamp object
 * @param {Number} energy Light energy value
 */
exports.set_light_energy = function(lamp_obj, energy) {
    if (!m_obj_util.is_lamp(lamp_obj)) {
        m_print.error("set_light_energy(): Wrong object");
        return;
    }

    var scene = m_scenes.get_active();
    m_lights.set_light_energy(lamp_obj.light, energy);
    m_scenes.update_lamp_scene(lamp_obj, scene);
}

/**
 * Get the light color.
 * @method module:lights.get_light_color
 * @param {Object3D} lamp_obj Lamp object
 * @param {?RGB} [dest=new Float32Array(3)] Destination RGB vector
 * @returns {?RGB} Destination RGB vector
 */
exports.get_light_color = function(lamp_obj, dest) {
    if (!m_obj_util.is_lamp(lamp_obj)) {
        m_print.error("get_light_color(): Wrong object");
        return null;
    }

    dest = dest || new Float32Array(3);
    dest.set(lamp_obj.light.color);
    return dest;
}

/**
 * Set the light color.
 * @method module:lights.set_light_color
 * @param {Object3D} lamp_obj Lamp object
 * @param {RGB} color Light color
 */
exports.set_light_color = function(lamp_obj, color) {
    if (!m_obj_util.is_lamp(lamp_obj)) {
        m_print.error("set_light_color(): Wrong object");
        return;
    }

    var scene = m_scenes.get_active();
    m_lights.set_light_color(lamp_obj.light, color);
    m_scenes.update_lamp_scene(lamp_obj, scene);
}

function update_sun_position(time) {

    var day   = _date.d;
    var month = _date.m;
    var year  = _date.y;

    // TODO: Calculate real sun position depending on date

    // Detect if current year is leap
    //var leap_year = (year % 4 == 0) ? 0: 1;

    // Number of days after January 1st
    //var days_passed = day + 31 * (month - 1);

    //if (month <= 2)
    //    {}
    //else if (month <= 4)
    //    days_passed += leap_year - 3;
    //else if (month <= 6)
    //    days_passed += leap_year - 4;
    //else if (month <= 9)
    //    days_passed += leap_year - 5;
    //else if (month <= 11)
    //    days_passed += leap_year - 6;
    //else
    //    days_passed += leap_year - 7;

    //var angle = get_sun_coordinates (_julian_date, (days_passed - 1));

    var angle_hor  = time < 12 ? time * 15 : (time - 24) * 15 ;
    var angle_vert = -Math.cos(time / 12 * Math.PI) * _max_sun_angle;

    var sun_params = {};
    sun_params.hor_position  = angle_hor;
    sun_params.vert_position = angle_vert;

    set_sun_params(sun_params);
}

function get_sun_coordinates (jul_date, days) {

    ////////////////////////////////////////////////////////////////////////////
    //                      Ecliptic coordinates                              //
    ////////////////////////////////////////////////////////////////////////////

    // Number of days since GreenWich noon
    var n = jul_date - 2451545;

    // The mean longitude of the Sun, corrected for the aberration of light
    var l = 280.460 + 0.9856474 * n;
    l = l % 360;

    // The mean anomaly of the Sun
    var g = 357.528 + 0.9856003 * n;
    g = g % 360;

    g = m_util.deg_to_rad(g);

    // Ecliptic longitude of the Sun
    var e_longitude = l + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g);

    // Distance of the Sun from the Earth, in astronomical units
    var r = 1.00014 - 0.01671 * Math.cos(g) - 0.00014 * Math.cos(2 * g);

    // Oblique of the ecliptic
    var oblique = 23.439 - 0.0000004 * n;

    return oblique;
}

function calendar_to_julian(date) {
    var y  = date.y;
    var m  = date.m;
    var d  = date.d;

	var jy, ja, jm;			//scratch

	if( m > 2 ) {
		jy = y;
		jm = m + 1;
	} else {
		jy = y - 1;
		jm = m + 13;
	}

	var intgr = Math.floor( Math.floor(365.25 * jy) +
                Math.floor(30.6001 * jm) + d + 1720995 );

	//check for switch to Gregorian calendar
    var gregcal = 15 + 31*( 10 + 12*1582 );
	if( d + 31 * (m + 12 * y) >= gregcal ) {
		ja = Math.floor (0.01 * jy);
		intgr += 2 - ja + Math.floor (0.25 * ja);
	}

    //round to nearest second
    var jd0 = (intgr) * 100000;
    var jd  = Math.floor(jd0);
    if( jd0 - jd > 0.5 ) ++jd;
    return jd/100000;
}

}
