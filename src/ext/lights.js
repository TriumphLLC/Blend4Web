"use strict";

/**
 * Lights API.
 * @module lights
 */
b4w.module["lights"] = function(exports, require) {

// TODO: consider use of standard translation/rotation functions from transform module

var m_print     = require("__print");
var lights      = require("__lights");
var scenes      = require("__scenes");
var transform   = require("__transform");
var util        = require("__util");

var m_vec3 = require("vec3");

var _sun_pos        = new Float32Array(3);
var _date           = {};
var _julian_date    = 0;
var _max_sun_angle  = 60;

/**
 * Get lamp objects.
 * If lamps_type is defined, creates a new array
 * @method module:lights.get_lamps
 * @param {String} [lamps_type] Lamps type ("POINT", "SPOT", "SUN", "HEMI")
 * @returns {Array} Array with lamp object IDs
 */
exports.get_lamps = function(lamps_type) {

    var scene = scenes.get_active();
    var lamps = scenes.get_scene_objs(scene, "LAMP", scenes.DATA_ID_ALL);

    if (!lamps_type)
        return lamps;

    var rslt = [];
    for (var i = 0; i < lamps.length; i++) {
        var lamp = lamps[i];
        if (lamp._light.type === lamps_type)
            rslt.push(lamp);
    }
    return rslt;
}

exports.get_sun_params = get_sun_params;
/**
 * Get the sun parameters.
 * @method module:lights.get_sun_params
 * @returns {Object} Sun params object
 */
function get_sun_params() {
    var scene = scenes.get_active();
    var lamps = scenes.get_scene_objs(scene, "LAMP", scenes.DATA_ID_ALL);
    var sun = null;

    for (var i = 0; i < lamps.length; i++) {
        var lamp = lamps[i];
        var light = lamp._light;
        if (light.type == "SUN") {
            sun = lamp;
            break
        }
    }

    if (sun) {
        var cur_dir = sun._light.direction;

        // sun azimuth
        var angle_hor = Math.atan2(cur_dir[2], cur_dir[0]) * 180 / Math.PI + 90;
        if (angle_hor > 180)
            angle_hor -= 360;

        // sun altitude
        var angle_vert = Math.atan2(
                cur_dir[1],
                Math.sqrt(cur_dir[0]*cur_dir[0] + cur_dir[2]*cur_dir[2])
                ) * 180 / Math.PI;

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
 * @param {Object} sun_params sun parameters
 */
function set_sun_params (sun_params) {

    var scene = scenes.get_active();
    var lamps = scenes.get_scene_objs(scene, "LAMP", scenes.DATA_ID_ALL);

    // Index of lamp(sun) on the scene

    for (var i = 0; i < lamps.length; i++) {
        var lamp = lamps[i];
        var light = lamp._light;
        if (light.type == "SUN") {
            var sun = lamp;
            break;
        }
    }

    if (!sun) {
        m_print.error("There is no sun on the scene");
        return null;
    }

    if (typeof sun_params.hor_position == "number" &&
        typeof sun_params.vert_position == "number") {
        // convert to radians
        var angle_hor  =  ((180 - sun_params.hor_position)) / 180 * Math.PI;
        var angle_vert =  ((90 - sun_params.vert_position)) / 180 * Math.PI;

        var sun_render = sun._render;

        // rotate sun
        transform.set_rotation_euler(sun, [angle_vert, angle_hor, 0]);
        var dir = new Float32Array(3);
        util.quat_to_dir(sun_render.quat, util.AXIS_Y, dir);

        var dist_to_center = m_vec3.length(sun_render.trans);

        m_vec3.copy(dir, _sun_pos);
        m_vec3.scale(_sun_pos, dist_to_center, _sun_pos);

        // translate sun
        transform.set_translation(sun, _sun_pos);
        transform.update_transform(sun);

        var sun_light = sun._light;

        if (sun_light.dynamic_intensity) {

            // set amplitude lighting params
            var def_sun_energy = sun["data"]["energy"];
            var def_env_color = scene["world"]["light_settings"]["environment_energy"];

            // change sun intensity dependent to its position
            var energy     = Math.cos(Math.abs(angle_vert));
            var sun_energy = Math.max( Math.min(3.0 * energy, 1.0), 0.0) * def_sun_energy;
            var env_energy = Math.max(energy, 0.1) * def_env_color;

            lights.set_light_energy(sun_light, sun_energy);
            scenes.set_environment_colors(scene, env_energy, null, null);
        }
        scenes.update_lamp_scene(sun, scene);
    }
}

exports.set_day_time = set_day_time;
/**
 * Set the time of day.
 * @method module:lights.set_day_time
 * @param {Number} time new time (0.0...24.0)
 */
function set_day_time(time) {
    var scene = scenes.get_active();
    var lamps = scenes.get_scene_objs(scene, "LAMP", scenes.DATA_ID_ALL);

    for (var i = 0; i < lamps.length; i++) {
        var lamp = lamps[i];
        var light = lamp._light;
        if (light.type == "SUN") {
            var sun = lamp;
            break;
        }
    }

    if (!sun) {
        m_print.error("There is no sun on the scene");
        return null;
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
 * @param {String} light_name Name of the light object
 * @returns {Object} Light params
 */
exports.get_light_params = function(light_name) {

    var scene = scenes.get_active();

    if (!scene) {
        m_print.error("No active scene");
        return false;
    }

    var lamps = scenes.get_scene_objs(scene, "LAMP", scenes.DATA_ID_ALL);

    for (var i = 0; i < lamps.length; i++) {
        var lamp = lamps[i];
        if (lamp["name"] === light_name) {
            var light = lamp._light;
            break;
        }
    }

    if (!light) {
        m_print.error("B4W Warning: light \"" + light_name + "\" not found");
        return false;
    }

    var rslt = {
        "light_color": light.color,
        "light_energy": light.energy
    };

    return rslt;
}

/**
 * Set the light params.
 * @method module:lights.set_light_params
 * @param {String} light_name Name of the light object
 * @param {Object} light_params Light params
 * @cc_externs hor_position vert_position light_energy light_color
 */
exports.set_light_params = function(light_name, light_params) {

    var scene = scenes.get_active();

    if (!scene) {
        m_print.error("No active scene");
        return false;
    }

    var lamps = scenes.get_scene_objs(scene, "LAMP", scenes.DATA_ID_ALL);

    for (var i = 0; i < lamps.length; i++) {
        var lamp = lamps[i];
        if (lamp["name"] === light_name) {
            var light = lamp._light;
            break;
        }
    }

    if (!light) {
        m_print.error("B4W Warning: light \"" + light_name +
            "\" not found");
        return false;
    }

    if (typeof light_params.light_energy == "number") {
        lights.set_light_energy(light, light_params.light_energy);
        scenes.update_lamp_scene(lamp, scene);
    }

    if (typeof light_params.light_color == "object") {
        lights.set_light_color(light, light_params.light_color);
        scenes.update_lamp_scene(lamp, scene);
    }
}

/**
 * Get all lights' names.
 * @method module:lights.get_lights_names
 * @returns {Array} Lights' names
 */
exports.get_lights_names = function() {

    var scene = scenes.get_active();

    if (!scene) {
        m_print.error("No active scene");
        return false;
    }

    var rslt = [];

    var lamps = scenes.get_scene_objs(scene, "LAMP", scenes.DATA_ID_ALL);

    for (var i = 0; i < lamps.length; i++) {
        var lamp = lamps[i];
        rslt.push(lamp._light.name);
    }
    return rslt;
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

    // Convert to radians
    g *= Math.PI / 180;

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
