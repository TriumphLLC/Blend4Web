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
 * Gyroscope actions add-on.
 * Provides support for gyroscope on mobile devices.
 * @see http://www.w3.org/TR/orientation-event/
 * @module gyroscope
 */

b4w.module["gyroscope"] = function(exports, require) {

var m_cam        = require("camera");
var m_ctl        = require("controls");
var m_scenes     = require("scenes");
var m_trans      = require("transform");
var m_util       = require("util");
var m_vec3       = require("vec3");

var _begin_angles = new Float32Array(3);
var _curr_angles = new Float32Array(3);

var _vec3_tmp = m_vec3.create();

var VERTICAL_BETA_ANGLE_THRESHOLD_UP = m_util.deg_to_rad(110);
var VERTICAL_BETA_ANGLE_THRESHOLD_DOWN = m_util.deg_to_rad(70);
var VERTICAL_GAMMA_ANGLE_THRESHOLD_UP = m_util.deg_to_rad(70);
var VERTICAL_GAMMA_ANGLE_THRESHOLD_DOWN = - m_util.deg_to_rad(70);

/**
 * Enable camera rotation according to orientation of mobile device.
 * @method module:gyroscope.enable_camera_rotation
 */
exports.enable_camera_rotation = function() {
    var cam_obj = m_scenes.get_active_camera();
    create_camera_rotation_sensors(cam_obj);
}

function create_camera_rotation_sensors(obj) {
    var g_a_sensor = m_ctl.create_gyro_angles_sensor();
    var g_q_sensor = m_ctl.create_gyro_quat_sensor();
    var save_angles = true;

    var cam_rotate_cb = function(obj, id, pulse) {
        if (pulse > 0) {
            if (m_cam.is_eye_camera(obj)) {
                var hmd_quat = m_ctl.get_sensor_payload(obj, id, 1);
                var up_axis = m_vec3.transformQuat(m_util.AXIS_Z, hmd_quat, _vec3_tmp);
                m_cam.set_vertical_axis(obj, up_axis);
                m_trans.set_rotation_v(obj, hmd_quat);
            } else {
                _curr_angles = m_ctl.get_sensor_payload(obj, id, 0);

                if (save_angles) {
                    _begin_angles[0] = _curr_angles[0];
                    _begin_angles[1] = _curr_angles[1];
                    _begin_angles[2] = _curr_angles[2];
                    save_angles = false;
                }
                var delta_beta = 0;
                var delta_gamma = 0;

                if (window.orientation == 0) {
                    delta_beta = (_curr_angles[1] - _begin_angles[1]);
                    delta_gamma = (_curr_angles[0] - _begin_angles[0]);
                    if (_curr_angles[1] > VERTICAL_BETA_ANGLE_THRESHOLD_DOWN &&
                            _curr_angles[1] < VERTICAL_BETA_ANGLE_THRESHOLD_UP)
                        delta_gamma = 0;
                }

                if (window.orientation == 180) {
                    delta_beta = (_curr_angles[1] - _begin_angles[1]);
                    if (_curr_angles[1] < 0)
                        delta_beta = -delta_beta;
                    delta_gamma = (_begin_angles[0] - _curr_angles[0]);
                    if (delta_beta > Math.PI / 2 || delta_beta < - Math.PI / 2)
                        delta_beta = 0;
                    if (_curr_angles[1] > - VERTICAL_BETA_ANGLE_THRESHOLD_UP &&
                            _curr_angles[1] < - VERTICAL_BETA_ANGLE_THRESHOLD_DOWN)
                        delta_gamma = 0;
                }

                if (window.orientation == -90) {
                    delta_beta = (_curr_angles[0] - _begin_angles[0]);
                    if (delta_beta > Math.PI / 2 || delta_beta < - Math.PI / 2)
                        delta_beta = 0;
                    delta_gamma = (_begin_angles[1] - _curr_angles[1]);
                    if (_curr_angles[0] > VERTICAL_GAMMA_ANGLE_THRESHOLD_UP ||
                            _curr_angles[0] < VERTICAL_GAMMA_ANGLE_THRESHOLD_DOWN)
                        delta_gamma = 0;
                }

                if (window.orientation == 90) {
                    delta_beta = (_begin_angles[0] - _curr_angles[0]);
                    if (delta_beta > Math.PI / 2 || delta_beta < - Math.PI / 2)
                        delta_beta = 0;
                    delta_gamma = (_curr_angles[1] - _begin_angles[1]);
                    if (_curr_angles[0] > VERTICAL_GAMMA_ANGLE_THRESHOLD_UP ||
                            _curr_angles[0] < VERTICAL_GAMMA_ANGLE_THRESHOLD_DOWN)
                        delta_gamma = 0;
                }

                m_cam.rotate_camera(obj, delta_gamma, delta_beta);
                _begin_angles[0] = _curr_angles[0];
                _begin_angles[1] = _curr_angles[1];
                _begin_angles[2] = _curr_angles[2];
            }
        }
    }
    m_ctl.create_sensor_manifold(obj, "CAMERA_ROTATE_GYRO",
            m_ctl.CT_CONTINUOUS, [g_a_sensor, g_q_sensor], null,
            cam_rotate_cb);
}

/**
 * Disable camera rotation according to orientation of mobile device.
 * @method module:gyroscope.disable_camera_rotation
 */
exports.disable_camera_rotation = function() {
    var cam_obj = m_scenes.get_active_camera();
    m_ctl.remove_sensor_manifold(cam_obj, "CAMERA_ROTATE_GYRO");
}

};
