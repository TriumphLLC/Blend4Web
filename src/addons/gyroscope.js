"use strict";

/**
 * Gyroscope actions add-on.
 * Provides support for gyroscope for mobile devices.
 * @see http://www.w3.org/TR/orientation-event/
 * @module gyroscope
 */

b4w.module["gyroscope"] = function(exports, require) {

var m_ctl        = require("controls");
var m_scenes     = require("scenes");
var m_cam        = require("camera");

var _begin_angles = new Float32Array(3);
var _curr_angles = new Float32Array(3);

var VERTICAL_BETA_ANGLE_THRESHOLD_UP = Math.PI * 110 / 180;
var VERTICAL_BETA_ANGLE_THRESHOLD_DOWN = Math.PI * 70 / 180;
var VERTICAL_GAMMA_ANGLE_THRESHOLD_UP = Math.PI * 70 / 180;
var VERTICAL_GAMMA_ANGLE_THRESHOLD_DOWN = - Math.PI * 70 / 180;

/**
 * Enable camera rotation for mobile devices.
 * @method module:gyroscope.enable_camera_rotation
 */
exports.enable_camera_rotation = function() {
    var cam_obj = m_scenes.get_active_camera();
    create_camera_rotation_sensors(cam_obj);
}

function create_camera_rotation_sensors(obj) {

    var g_a_sensor = m_ctl.create_gyro_angles_sensor();
    var save_angles = true;

    var cam_rotate_cb = function(obj, id, pulse) {
        if (pulse > 0) {

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
    m_ctl.create_sensor_manifold(obj, "CAMERA_ROTATE_GYRO", 
            m_ctl.CT_CONTINUOUS, [g_a_sensor], null, 
            cam_rotate_cb);
}

};
