// check if module exists
if (b4w.module_check("example2_main"))
    throw "Failed to register module: example2_main";

b4w.register("example2_main", function(exports, require) {

var m_anim  = require("animation");
var m_app   = require("app");
var m_cfg   = require("config");
var m_data  = require("data");
var m_ctl   = require("controls");
var m_phy   = require("physics");
var m_cons  = require("constraints");
var m_scs   = require("scenes");

var _character = null;
var _character_rig = null;

var ROT_SPEED = 1.5;
var CAM_SOFTNESS = 0.2;
var CAM_OFFSET = new Float32Array([0, 4, 1.5]);

exports.init = function() {

    if(detect_mobile())
        var quality = m_cfg.P_LOW;
    else
        var quality = m_cfg.P_HIGH;

    m_app.init({
        canvas_container_id: "canvas3d",
        callback: init_cb,
        physics_enabled: true,
        quality: quality,
        show_fps: true,
        autoresize: true,
        alpha: false
    });
}

function init_cb(canvas_elem, success) {

    if (!success) {
        console.log("b4w init failure");
        return;
    }

    var load_path = m_cfg.get_std_assets_path() +
            "tutorials/making_a_game_p4/game_example.json";
    m_data.load(load_path, load_cb);
}

function load_cb(data_id) {
    _character = m_scs.get_first_character();
    _character_rig = m_scs.get_object_by_dupli_name("character",
                                                    "character_rig");

    var right_arrow = m_ctl.create_custom_sensor(0);
    var left_arrow  = m_ctl.create_custom_sensor(0);
    var up_arrow    = m_ctl.create_custom_sensor(0);
    var down_arrow  = m_ctl.create_custom_sensor(0);
    var touch_jump  = m_ctl.create_custom_sensor(0);

    if(detect_mobile()) {
        setup_control_events(right_arrow, up_arrow,
                             left_arrow, down_arrow, touch_jump);
        document.getElementById("control_jump").style.visibility = "visible";
    }

    setup_movement(up_arrow, down_arrow);
    setup_rotation(right_arrow, left_arrow);

    setup_jumping(touch_jump);

    setup_camera();
}

function setup_movement(up_arrow, down_arrow) {
    var key_w     = m_ctl.create_keyboard_sensor(m_ctl.KEY_W);
    var key_s     = m_ctl.create_keyboard_sensor(m_ctl.KEY_S);
    var key_up    = m_ctl.create_keyboard_sensor(m_ctl.KEY_UP);
    var key_down  = m_ctl.create_keyboard_sensor(m_ctl.KEY_DOWN);

    var move_array = [
        key_w, key_up, up_arrow,
        key_s, key_down, down_arrow
    ];

    var forward_logic  = function(s){return (s[0] || s[1] || s[2])};
    var backward_logic = function(s){return (s[3] || s[4] || s[5])};

    function move_cb(obj, id, pulse) {
        if (pulse == 1) {
            switch(id) {
            case "FORWARD":
                var move_dir = 1;
                m_anim.apply(_character_rig, "character_run_B4W_BAKED");
                break;
            case "BACKWARD":
                var move_dir = -1;
                m_anim.apply(_character_rig, "character_run_B4W_BAKED");
                break;
            }
        } else {
            var move_dir = 0;
            m_anim.apply(_character_rig, "character_idle_01_B4W_BAKED");
        }

        m_phy.set_character_move_dir(obj, move_dir, 0);

        m_anim.play(_character_rig);
        m_anim.set_behavior(_character_rig, m_anim.AB_CYCLIC);
    };

    m_ctl.create_sensor_manifold(_character, "FORWARD", m_ctl.CT_TRIGGER,
        move_array, forward_logic, move_cb);
    m_ctl.create_sensor_manifold(_character, "BACKWARD", m_ctl.CT_TRIGGER,
        move_array, backward_logic, move_cb);

    m_anim.apply(_character_rig, "character_idle_01_B4W_BAKED");
    m_anim.play(_character_rig);
    m_anim.set_behavior(_character_rig, m_anim.AB_CYCLIC);
}

function setup_rotation(right_arrow, left_arrow) {
    var key_a     = m_ctl.create_keyboard_sensor(m_ctl.KEY_A);
    var key_d     = m_ctl.create_keyboard_sensor(m_ctl.KEY_D);
    var key_left  = m_ctl.create_keyboard_sensor(m_ctl.KEY_LEFT);
    var key_right = m_ctl.create_keyboard_sensor(m_ctl.KEY_RIGHT);

    var elapsed_sensor = m_ctl.create_elapsed_sensor();

    var rotate_array = [
        key_a, key_left, left_arrow,
        key_d, key_right, right_arrow,
        elapsed_sensor,
    ];

    var left_logic  = function(s){return (s[0] || s[1] || s[2])};
    var right_logic = function(s){return (s[3] || s[4] || s[5])};

    function rotate_cb(obj, id, pulse) {

        var elapsed = m_ctl.get_sensor_value(obj, "LEFT", 6);

        if (pulse == 1) {
            switch(id) {
            case "LEFT":
                m_phy.character_rotation_inc(obj, elapsed * ROT_SPEED, 0);
                break;
            case "RIGHT":
                m_phy.character_rotation_inc(obj, -elapsed * ROT_SPEED, 0);
                break;
            }
        }
    }

    m_ctl.create_sensor_manifold(_character, "LEFT", m_ctl.CT_CONTINUOUS,
        rotate_array, left_logic, rotate_cb);
    m_ctl.create_sensor_manifold(_character, "RIGHT", m_ctl.CT_CONTINUOUS,
        rotate_array, right_logic, rotate_cb);
}

function setup_jumping(touch_jump) {
    var key_space = m_ctl.create_keyboard_sensor(m_ctl.KEY_SPACE);

    var jump_cb = function(obj, id, pulse) {
        m_phy.character_jump(obj);
    }

    m_ctl.create_sensor_manifold(_character, "JUMP", m_ctl.CT_SHOT,
        [key_space, touch_jump], function(s){return s[0] || s[1]}, jump_cb);
}

function setup_control_events(right_arrow, up_arrow,
                              left_arrow, down_arrow,
                              jump) {

    var touch_start_pos = new Float32Array(2);

    var move_touch_idx;
    var jump_touch_idx;

    var tap_elem = document.getElementById("control_tap");
    var control_elem = document.getElementById("control_circle");
    var tap_elem_offset = tap_elem.clientWidth / 2;
    var ctrl_elem_offset = control_elem.clientWidth / 2;

    function touch_start_cb(event) {
        event.preventDefault();

        var w = window.innerWidth;

        var touches = event.changedTouches;

        for (var i = 0; i < touches.length; i++) {
            var touch = touches[i];
            var x = touch.clientX;
            var y = touch.clientY;

            if (x > w / 2) // right side of the screen
                break;

            touch_start_pos[0] = x;
            touch_start_pos[1] = y;
            move_touch_idx = touch.identifier;

            tap_elem.style.visibility = "visible";
            tap_elem.style.left = x - tap_elem_offset + "px";
            tap_elem.style.top  = y - tap_elem_offset + "px";

            control_elem.style.visibility = "visible";
            control_elem.style.left = x - ctrl_elem_offset + "px";
            control_elem.style.top  = y - ctrl_elem_offset + "px";
        }
    }

    function touch_jump_cb (event) {
        event.preventDefault();

        var touches = event.changedTouches;

        for (var i = 0; i < touches.length; i++) {
            var touch = touches[i];
            m_ctl.set_custom_sensor(jump, 1);
            jump_touch_idx = touch.identifier;
        }
    }

    function touch_move_cb(event) {
        event.preventDefault();

        m_ctl.set_custom_sensor(up_arrow, 0);
        m_ctl.set_custom_sensor(down_arrow, 0);
        m_ctl.set_custom_sensor(left_arrow, 0);
        m_ctl.set_custom_sensor(right_arrow, 0);

        var w = window.innerWidth;

        var touches = event.changedTouches;

        for (var i=0; i < touches.length; i++) {
            var touch = touches[i];
            var x = touch.clientX;
            var y = touch.clientY;

            if (x > w / 2) // right side of the screen
                break;

            tap_elem.style.left = x - tap_elem_offset + "px";
            tap_elem.style.top  = y - tap_elem_offset + "px";

            var d_x = x - touch_start_pos[0];
            var d_y = y - touch_start_pos[1];

            var r = Math.sqrt(d_x * d_x + d_y * d_y);

            if (r < 16) // don't move if control is too close to the center
                break;

            var cos = d_x / r;
            var sin = -d_y / r;

            if (cos > Math.cos(3 * Math.PI / 8))
                m_ctl.set_custom_sensor(right_arrow, 1);
            else if (cos < -Math.cos(3 * Math.PI / 8))
                m_ctl.set_custom_sensor(left_arrow, 1);

            if (sin > Math.sin(Math.PI / 8))
                m_ctl.set_custom_sensor(up_arrow, 1);
            else if (sin < -Math.sin(Math.PI / 8))
                m_ctl.set_custom_sensor(down_arrow, 1);
        }
    }

    function touch_end_cb(event) {
        event.preventDefault();

        var touches = event.changedTouches;

        for (var i=0; i < touches.length; i++) {

            if (touches[i].identifier == move_touch_idx) {
                m_ctl.set_custom_sensor(up_arrow, 0);
                m_ctl.set_custom_sensor(down_arrow, 0);
                m_ctl.set_custom_sensor(left_arrow, 0);
                m_ctl.set_custom_sensor(right_arrow, 0);
                tap_elem.style.visibility = "hidden";
                control_elem.style.visibility = "hidden";
                move_touch_idx = null;

            } else if (touches[i].identifier == jump_touch_idx) {
                m_ctl.set_custom_sensor(jump, 0);
                jump_touch_idx = null;
            }
        }
    }

    document.getElementById("canvas3d").addEventListener("touchstart", touch_start_cb, false);
    document.getElementById("control_jump").addEventListener("touchstart", touch_jump_cb, false);

    document.getElementById("canvas3d").addEventListener("touchmove", touch_move_cb, false);

    document.getElementById("canvas3d").addEventListener("touchend", touch_end_cb, false);
    document.getElementById("controls").addEventListener("touchend", touch_end_cb, false);

}

function detect_mobile() {
    if( navigator.userAgent.match(/Android/i)
     || navigator.userAgent.match(/webOS/i)
     || navigator.userAgent.match(/iPhone/i)
     || navigator.userAgent.match(/iPad/i)
     || navigator.userAgent.match(/iPod/i)
     || navigator.userAgent.match(/BlackBerry/i)
     || navigator.userAgent.match(/Windows Phone/i)) {
        return true;
    } else {
        return false;
    }
}

function setup_camera() {
    var camera = m_scs.get_active_camera();
    m_cons.append_semi_soft(camera, _character, CAM_OFFSET, CAM_SOFTNESS);
}

});

b4w.require("example2_main").init();
