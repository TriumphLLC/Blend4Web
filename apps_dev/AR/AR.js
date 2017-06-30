"use strict"

// register the application module
b4w.register("AR_main", function(exports, require) {

// import modules used by the app
var m_anim      = require("animation");
var m_app       = require("app");
var m_cam       = require("camera");
var m_cfg       = require("config");
var m_cont      = require("container");
var m_ctl       = require("controls");
var m_data      = require("data");
var m_main      = require("main");
var m_mat4      = require("mat4");
var m_math      = require("math");
var m_preloader = require("preloader");
var m_tsr       = require("tsr");
var m_scs       = require("scenes");
var m_trans     = require("transform");
var m_util      = require("util");
var m_ver       = require("version");
var m_vec3      = require("vec3");
var m_vec4      = require("vec4");

var _tsr_tmp = m_tsr.create();
var _vec2_tmp = new Float32Array(2);
var _vec3_tmp = m_vec3.create();
var _mat34_tmp = new Float64Array(12);
var _mat44_tmp = new Float32Array(16);
var _mat44_tmp2 = new Float32Array(16);

var VEC3_IDENT = new Float32Array([0,0,0]);

var INIT_CAM_POS = new Float32Array([30,30,30]);

// detect application mode
var DEBUG = (m_ver.type() == "DEBUG");

// automatically detect assets path
var APP_ASSETS_PATH = m_cfg.get_std_assets_path() + "AR/";

// It will be an instance of arController
var _ar_controller = null;

var _video_elem = null;
var _visible = false;
var _start_see_time = -Infinity;
var updated_proj_matrix_once = false;

var DETECTION_DELAY = 100;
var EMPTY_SUFF = "_Emty";
var GEOM_SUFF = "_geom";
var EMPTY_ACTION_SUFF = "_EmtyAction";
var GEOM_ACTION_SUFF = "_ArmatureAction";
var ARMATURE_SUFF = "_Armature";
var ANIMATION_DURATION = 1;

var PLANET_NAMES = ["Earth", "Jupiter", "Mars", "Mercury", "Neptune",
        "Saturn", "Uranus", "Venus"];
var PLANET_ORIGIN_SCALES = {
    "Mercury": 0.964,
    "Venus": 1.845,
    "Earth": 2.0,
    "Mars": 1.374,
    "Jupiter": 8.439,
    "Saturn": 5.539,
    "Uranus": 3.986,
    "Neptune": 3.995,
};

var PLANET_PROC_SCALES = {
    "Mercury": 2,
    "Venus": 1.5,
    "Earth": 1.5,
    "Mars": 1.7,
    "Jupiter": 1,
    "Saturn": 1,
    "Uranus": 1,
    "Neptune": 1,
};

var ERROR_DEVICES_MSG = "Camera devices are unavailable. Try to plug in your Web camera. If the camera is actually present, try closing any other tabs which use the camera, and reboot the current tab.";


var FOCUSED_SCALE = 20;

var _planets = [];
var _focusing = false;

var _sun = null;
var _orbits = null;
var _activated_rotation = true;

/**
 * export the method to initialize the app (called at the bottom of this file)
 */
exports.init = function() {
    m_app.init({
        canvas_container_id: "main_canvas_container",
        callback: init_cb,
        show_fps: DEBUG,
        console_verbose: DEBUG,
        autoresize: false
    });
}

/**
 * callback executed when the app is initialized 
 */
function init_cb(canvas_elem, success) {

    if (!success) {
        console.log("b4w init failure");
        return;
    }

    m_preloader.create_preloader();

    // ignore right-click on the canvas element
    canvas_elem.oncontextmenu = function(e) {
        e.preventDefault();
        e.stopPropagation();
        return false;
    };

    load();
}

/**
 * load the scene data
 */
function load() {
    m_data.load(APP_ASSETS_PATH + "AR.json", load_cb, preloader_cb);
}

/**
 * update the app's preloader
 */
function preloader_cb(percentage) {
    m_preloader.update_preloader(percentage);
}

/**
 * callback executed when the scene data is loaded
 */
function load_cb(data_id, success) {
    // prepare media devices, for example, a Web camera
    navigator.mediaDevices.enumerateDevices()
        .then(got_devices)
        .catch(catch_error);

    var control_panel = document.querySelector(".control");
    control_panel.style.display = null;

    if (!success) {
        console.log("b4w load failure");
        return;
    }

    m_app.enable_camera_controls();

    init_planets();
    init_orbits();
    init_sun();

    var mclick_s = m_ctl.create_mouse_click_sensor();
    var tclick_s = m_ctl.create_touch_click_sensor();
    var timeline_s = m_ctl.create_timeline_sensor();

    var click_logic = function(s) {
        return s[0] || s[1];
    }

    var start_animation_cb = function(obj, id, pulse) {
        var mclick_value = m_ctl.get_sensor_value(obj, id, 0);
        var tclick_value = m_ctl.get_sensor_value(obj, id, 1);
        var timeline = m_ctl.get_sensor_value(obj, id, 2);

        if (mclick_value || tclick_value) {
            var payload = mclick_value ?
                    m_ctl.get_sensor_payload(obj, id, 0):
                    m_ctl.get_sensor_payload(obj, id, 1);
            var canv_coords = m_cont.client_to_canvas_coords(
                    payload.coords[0], payload.coords[1],
                    _vec2_tmp);

            var obj = m_scs.pick_object(canv_coords[0], canv_coords[1]);

            if (obj) {
                var clicked_planet = get_planet_by_geom(obj);
                if (clicked_planet) {
                    // check second click on planet

                    if (clicked_planet.focused) {
                        _focusing = false;
                    } else {
                        _focusing = true;
                    }

                    // init sun data
                    _sun.start_time = timeline;
                    var sun_trans = m_trans.get_translation_rel(_sun.geom, _vec3_tmp);
                    _sun.start_trans_length = m_vec3.length(sun_trans);

                    // init orbit
                    _orbits.start_time = timeline;
                    _orbits.start_scale = m_trans.get_scale(_orbits.front);

                    // init data of planet animations
                    for (var i = 0; i < _planets.length; i++) {
                        var planet = _planets[i];

                        var trans = m_trans.get_translation_rel(planet.armature, _vec3_tmp);
                        if (_focusing) {
                            m_vec3.copy(trans, planet.original_trans);
                            if (planet.geom == obj) {
                                planet.focused = true;
                            } else {
                                planet.focused = false;
                            }
                        } else {
                            planet.focused = false;
                        }

                        planet.start_scale = m_trans.get_scale(planet.armature);
                        planet.start_time = timeline;
                        planet.start_trans_length = m_vec3.length(trans);
                    }
                }
            }
        }
    }

    m_ctl.create_sensor_manifold(null, "TRIG_ANIMATION", m_ctl.CT_SHOT,
            [mclick_s, tclick_s, timeline_s], click_logic, start_animation_cb);

    var timeline_s = m_ctl.create_timeline_sensor();
    function animation_cb(obj, id, pulse) {
        var timeline = m_ctl.get_sensor_value(obj, id, 0); 

        animate_sun(timeline);

        animate_planets(timeline);

        animate_orbits(timeline);
    }

    m_ctl.create_sensor_manifold(null, "ANIMATION", m_ctl.CT_POSITIVE,
            [timeline_s], null, animation_cb);
}

function init_orbits() {
    _orbits = {
        front: m_scs.get_object_by_name("orbits_front"),
        back: m_scs.get_object_by_name("orbits_back"),
        start_scale: 1,
        start_time: -Infinity
    }
}

function animate_orbits(timeline) {
    var duration = timeline - _orbits.start_time;
    if (duration <= ANIMATION_DURATION) {
        if (_focusing) {
            var new_scale = m_math.ease_in_expo(duration,
                    _orbits.start_scale, 50,
                    ANIMATION_DURATION);
        } else {
            if (m_scs.is_hidden(_orbits.front)) {
                m_scs.show_object(_orbits.front);
                m_scs.show_object(_orbits.back);
            }
            var new_scale = m_math.ease_out_expo(duration,
                    _orbits.start_scale, 1 - _orbits.start_scale,
                    ANIMATION_DURATION);
        }

        m_trans.set_scale(_orbits.front, new_scale);
        m_trans.set_scale(_orbits.back, new_scale);
    } else {
        if (!_focusing) {
            m_trans.set_scale(_orbits.front, 1);
            m_trans.set_scale(_orbits.back, 1);
        } else {
            if (!m_scs.is_hidden(_orbits.front)) {
                m_scs.hide_object(_orbits.front);
                m_scs.hide_object(_orbits.back);
            }
        }
    }
}

function animate_planets(timeline) {
    if (_focusing) {
        _activated_rotation = false;
    }

    for (var i = 0; i < _planets.length; i++) {
        var planet = _planets[i];

        var duration = timeline - planet.start_time;
        if (duration <= ANIMATION_DURATION) {

            // procedural animation
            var new_scale;
            var new_trans;
            var new_trans_length;

            if (_focusing) {
                if (planet.focused) {
                    new_scale = m_math.ease_out_bounce(duration,
                            planet.start_scale,
                            FOCUSED_SCALE /
                            (PLANET_ORIGIN_SCALES[planet.name] * PLANET_PROC_SCALES[planet.name]),
                            ANIMATION_DURATION);
                    new_trans_length = m_math.ease_out_expo(duration,
                            planet.start_trans_length, -planet.start_trans_length,
                            ANIMATION_DURATION);
                } else {
                    new_scale = m_math.ease_in_circ(duration,
                            planet.start_scale, -planet.start_scale,
                            ANIMATION_DURATION);
                    new_trans_length = m_math.ease_in_expo(duration,
                            planet.start_trans_length, 500,
                            ANIMATION_DURATION);
                }

                var original_trans_dir = m_vec3.normalize(planet.original_trans, _vec3_tmp);
                new_trans = m_vec3.scale(original_trans_dir, new_trans_length,
                        _vec3_tmp);
                m_anim.stop(planet.empty);
            } else {
                // procedural scale
                new_scale = m_math.ease_out_expo(duration,
                        planet.start_scale,
                        PLANET_PROC_SCALES[planet.name] - planet.start_scale,
                        ANIMATION_DURATION);

                // procedural translation
                var original_trans_dir = m_vec3.normalize(planet.original_trans, _vec3_tmp);
                var original_trans_length = m_vec3.length(planet.original_trans);
                new_trans_length = m_math.ease_out_expo(duration,
                        planet.start_trans_length,
                        original_trans_length - planet.start_trans_length,
                        ANIMATION_DURATION);
                new_trans = m_vec3.scale(original_trans_dir, new_trans_length,
                        _vec3_tmp);
            }
            m_trans.set_translation_rel_v(planet.armature, new_trans);
            m_trans.set_scale(planet.armature, new_scale);
        } else {
            if (!_focusing) {
                if (!_activated_rotation) {
                    for (var i = 0; i < _planets.length; i++) {
                        var planet = _planets[i];
                        m_trans.set_translation_rel_v(planet.armature,
                                planet.original_trans);
                        m_anim.play(planet.empty);
                        _activated_rotation = true;
                    }
                }
            } else {
                for (var i = 0; i < _planets.length; i++) {
                    var planet = _planets[i];

                    if (!planet.focused) {
                        m_trans.set_scale(planet.armature, 0);
                    }
                }
            }
        }
    }
}

function animate_sun(timeline) {
    var duration = timeline - _sun.start_time;
    if (duration <= ANIMATION_DURATION) {
        var sun_offset_dir = m_vec3.copy(m_util.AXIS_X, _vec3_tmp);

        var new_trans;
        if (_focusing) {
            var new_trans_length = m_math.ease_out_expo(duration,
                    _sun.start_trans_length, 50,
                    ANIMATION_DURATION);
            new_trans = m_vec3.scale(sun_offset_dir, new_trans_length,
                    _vec3_tmp);
        } else {
            var new_trans_length = m_math.ease_out_expo(duration,
                    _sun.start_trans_length, -_sun.start_trans_length,
                    ANIMATION_DURATION);
            new_trans = m_vec3.scale(sun_offset_dir, new_trans_length,
                    _vec3_tmp);
        }
        new_trans = m_vec3.add(new_trans, _sun.origin_trans, new_trans);

        m_trans.set_translation_rel_v(_sun.geom, new_trans);
        m_trans.set_translation_rel_v(_sun.crown_geom, new_trans);
        m_trans.set_translation_rel_v(_sun.lamp, new_trans);
    }
}

function init_sun() {
    var geom = m_scs.get_object_by_name("Sun_geom");
    _sun = {
        geom: m_scs.get_object_by_name("Sun_geom"),
        crown_geom: m_scs.get_object_by_name("Sun_crown_geom"),
        lamp: m_scs.get_object_by_name("Lamp"),
        start_time: -Infinity,
        start_trans_length: 0,
        origin_trans: m_trans.get_translation_rel(geom, new Float32Array(3))
    }
}

function get_planet_by_geom(planet_geom) {
    for (var i = 0; i < _planets.length; i++) {
        var planet = _planets[i];

        if (planet.geom === planet_geom)
            return planet;
    }
    
    return null;
}

function create_planet(name) {
    var planet = {
        name: name,
        empty: m_scs.get_object_by_name(name + EMPTY_SUFF),
        geom: m_scs.get_object_by_name(name + GEOM_SUFF),
        empty_action: name + EMPTY_ACTION_SUFF,
        geom_action: name + GEOM_ACTION_SUFF,
        armature: m_scs.get_object_by_name(name + ARMATURE_SUFF),
        focused: false,
        start_time: -Infinity,
        start_scale: 1,
        original_trans: new Float32Array(3),
        start_trans_length: 1
    }
    return planet;
}

function init_planets() {
    for (var i = 0; i < PLANET_NAMES.length; i++) {
        var new_planet = create_planet(PLANET_NAMES[i]);
        m_trans.set_scale(new_planet.armature, PLANET_PROC_SCALES[new_planet.name]);
        _planets.push(new_planet);
    }
}

function got_devices(device_infos) {
    var video_sources = document.querySelector("select#video_source");
    while (video_sources.firstChild) {
        video_sources.removeChild(video_sources.firstChild);
    }

    if (!device_infos.length)
        throw new Error(ERROR_DEVICES_MSG);

    for (var i = 0; i !== device_infos.length; ++i) {
        var device_info = device_infos[i];

        if (device_info.kind === "videoinput") {
            var option = document.createElement("option");
            option.value = device_info.deviceId;
            option.text = device_info.label || "Camera " + (video_sources.length + 1);
            video_sources.appendChild(option);
        }
    }

    m_main.set_render_callback(ar_tick);
}

function catch_error(error) {
    setup_non_ar();

    notify_user(error);
}

function setup_non_ar() {
    // place camera
    var cam = m_scs.get_active_camera();
    m_cam.target_setup(cam, {
        pos: INIT_CAM_POS,
        pivot: VEC3_IDENT,
        use_panning: true
    });

    window.removeEventListener("resize", resize_ar);
    window.addEventListener("resize", resize_non_ar);
    resize_non_ar();

    // place solar system
    var empty = m_scs.get_object_by_name("Empty");
    m_scs.show_object(empty);
    m_trans.set_translation_v(empty, VEC3_IDENT);

    // disable ar
    m_main.clear_render_callback();
}

function notify_user(error) {
    var error_el = document.getElementById("error");
    if (error_el) {
        error_el.style.display = null;
        if (error.name == "DevicesNotFoundError") {
            error_el.textContent = ERROR_DEVICES_MSG;
        } else if (error.name == "TrackStartError") {
            error_el.textContent = "Media devices are unavailable.";
            error_el.textContent += " Try to close another program using Web camera.";
        } else {
            error_el.textContent = "Error: " + error.name + " " + error.message;
        }
    }
}

function got_stream(stream) {
    window.stream = stream;
    _video_elem.srcObject = stream;
    return navigator.mediaDevices.enumerateDevices();
}

function change_video_source() {
    if (window.stream) {
        window.stream.getTracks().forEach(function(track) {
            track.stop();
        });
    }
    var video_sources = document.querySelector("select#video_source");
    video_sources.onchange = change_video_source;
    var video_source = video_sources.value;

    var constraints = {
        video: {deviceId: video_source ? {exact: video_source} : undefined}
    };
    navigator.mediaDevices.getUserMedia(constraints)
        .then(got_stream)
        .then(got_devices)
        .then(update_projection_matrix)
        .catch(catch_error);
}

function ar_tick() {
    init_ar();

    update_ar();
}

function update_projection_matrix() {
    if (!_ar_controller) {
        return;
    } else {
        resize_ar();
        if (!updated_proj_matrix_once) {
            camera_mat = _ar_controller.getCameraMatrix();
            var cam = m_scs.get_active_camera();
            var rot_x = m_mat4.fromXRotation(-Math.PI, _mat44_tmp);
            var new_proj_cam = m_mat4.multiply(camera_mat, rot_x, _mat44_tmp);
            m_cam.set_projection(cam, new_proj_cam);
            updated_proj_matrix_once = true;
        }
    }
}

function init_ar() {
    update_projection_matrix();
    window.addEventListener("resize", resize_ar);

    if (!_video_elem) {
        _video_elem = document.getElementById("v");

        change_video_source();
    }
}

function update_ar() {
    // set solar system transform
    var empty = m_scs.get_object_by_name("Empty");
    _ar_controller.detectMarker(_video_elem);
    var markerNum = _ar_controller.getMarkerNum();

    if (markerNum > 0) {
        if (_start_see_time === -Infinity) {
            _start_see_time = performance.now();
        } else if (performance.now() - _start_see_time > DETECTION_DELAY) {
            // use performance.now() - _start_see_time > DETECTION_DELAY
            // to prevent false positive error
            if (_visible) {
                _ar_controller.getTransMatSquareCont(0, 1, _mat34_tmp, _mat34_tmp);
                if (m_scs.is_hidden(empty)) {
                    m_scs.show_object(empty);
                }
            } else {
                _ar_controller.getTransMatSquare(0, 1, _mat34_tmp);
            }

            _ar_controller.getTransMatSquare(0, 1, _mat34_tmp);
            var trans_mat = _ar_controller.transMatToGLMat(_mat34_tmp, _mat44_tmp);
            // NOTE: mobile Firefox reverses y-axis of video stream.
            // Maybe it is a bug. Maybe not
            if (m_main.detect_mobile() && check_user_agent("Firefox"))
                trans_mat = change_handedness_y(trans_mat, _mat44_tmp);
            var rot_x = m_mat4.fromXRotation(-Math.PI, _mat44_tmp2);
            var new_trans_mat = m_mat4.multiply(rot_x, trans_mat, _mat44_tmp);
            var tsr = m_tsr.from_mat4(new_trans_mat, _tsr_tmp);

            var trans = m_tsr.get_trans_view(tsr, _vec3_tmp);
            var new_trans = m_vec3.scale(trans, 20, _vec3_tmp);

            m_tsr.set_trans(new_trans, tsr);

            m_trans.set_tsr(empty, tsr);

            _visible = true;
        }
    } else {
        m_scs.hide_object(empty);

        _visible = false;
        _start_see_time = -Infinity;
    }
}

function change_handedness_y(matrix, dest) {
    // NOTE: convert matrix from right(left) handed to left(right) handed
    // coordinate system (reverse y-axis).
    //  x -x  x  x
    // -x  x -x -x
    //  x -x  x  x
    //  x -x  x  x
    dest[0] = matrix[0];
    dest[1] = -matrix[1];
    dest[2] = matrix[2];
    dest[3] = matrix[3];
    dest[4] = -matrix[4];
    dest[5] = matrix[5];
    dest[6] = -matrix[6];
    dest[7] = -matrix[7];
    dest[8] = matrix[8];
    dest[9] = -matrix[9];
    dest[10] = matrix[10];
    dest[11] = matrix[11];
    dest[12] = matrix[12];
    dest[13] = -matrix[13];
    dest[14] = matrix[14];
    dest[15] = matrix[15];

    return dest;
}

var cameraParam = new ARCameraParam();
var camera_mat = null;

cameraParam.onload = function() {

    _ar_controller = new ARController(320, 240, cameraParam);

    // configure detection mode
    _ar_controller.setThreshold(100);
    _ar_controller.setPatternDetectionMode(artoolkit.AR_MARKER_INFO_CUTOFF_PHASE_POSE_ERROR_MULTI);

    // Uncomment the next line to detect a custom marker.
    _ar_controller.loadMarker(APP_ASSETS_PATH + "solar.patt");

    // For more information see:
    // https://archive.artoolkit.org/documentation/doku.php?id=3_Marker_Training:marker_training
};
cameraParam.load(APP_ASSETS_PATH + "camera_para.dat");

function resize_non_ar() {
    m_cont.resize_to_container(true);
}

function resize_ar() {
    var _video_elem = document.getElementById("v");
    var canvas = m_cont.get_canvas();
    if (!_video_elem || !canvas)
        return;

    var screen_width = window.innerWidth;
    var screen_height = window.innerHeight;

    var source_width = _video_elem.videoWidth
    var source_height = _video_elem.videoHeight;

    var source_aspect = source_width / source_height;
    var screen_aspect = screen_width / screen_height;

    if (screen_aspect < source_aspect) {
        var new_width = source_aspect * screen_height;
        canvas.style.width = new_width + "px";
        canvas.style.marginLeft = -(new_width - screen_width) / 2 + "px";

        canvas.style.height = screen_height + "px";
        canvas.style.marginTop = "0px";
    } else {
        var new_height = 1 / (source_aspect / screen_width);
        canvas.style.height = new_height + "px";
        canvas.style.marginTop = -(new_height - screen_height) / 2 + "px";

        canvas.style.width = screen_width + "px";
        canvas.style.marginLeft = "0px";
    }

    _video_elem.style.width = canvas.style.width;
    _video_elem.style.height = canvas.style.height;
    _video_elem.style.marginLeft = canvas.style.marginLeft;
    _video_elem.style.marginTop = canvas.style.marginTop;
}

function check_user_agent(str) {
    var user_agent = navigator.userAgent;
    if (user_agent.indexOf(str) > -1)
        return true;
    else
        return false;
}

});

// import the app module and start the app by calling the init method
b4w.require("AR_main").init();
