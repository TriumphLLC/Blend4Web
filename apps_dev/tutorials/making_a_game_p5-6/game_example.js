"use strict"

// check if module exists
if (b4w.module_check("game_example_main"))
    throw "Failed to register module: game_example_main";

b4w.register("game_example_main", function(exports, require) {

var m_anim  = require("animation");
var m_app   = require("app");
var m_cfg   = require("config");
var m_data  = require("data");
var m_ctl   = require("controls");
var m_phy   = require("physics");
var m_cons  = require("constraints");
var m_scs   = require("scenes");
var m_trans = require("transform");
var m_vec3  = require("vec3");

var ROT_SPEED = 1.5;
var CAM_SOFTNESS = 0.2;
var CAM_OFFSET = new Float32Array([0, 4, 1.5]);

var ROCK_SPEED = 2;
var ROCK_DAMAGE = 20;
var ROCK_DAMAGE_RADIUS = 0.75;
var ROCK_RAY_LENGTH = 10;
var ROCK_FALL_DELAY = 0.5;

var LAVA_DAMAGE_INTERVAL = 0.01;

var MAX_CHAR_HP = 100;

var _character = null;
var _character_rig = null;
var _character_hp;

var _vec3_tmp = new Float32Array(3);

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
            "tutorials/making_a_game_p5-6/game_example.json";
    m_data.load(load_path, load_cb);
}

function load_cb(data_id) {
    _character = m_scs.get_first_character();
    _character_rig = m_scs.get_object_by_dupli_name("character",
                                                    "character_rig");
    _character_hp = MAX_CHAR_HP;

    var right_arrow = m_ctl.create_custom_sensor(0);
    var left_arrow  = m_ctl.create_custom_sensor(0);
    var up_arrow    = m_ctl.create_custom_sensor(0);
    var down_arrow  = m_ctl.create_custom_sensor(0);
    var touch_jump  = m_ctl.create_custom_sensor(0);

    var elapsed_sensor = m_ctl.create_elapsed_sensor();

    if(detect_mobile()) {
        setup_control_events(right_arrow, up_arrow,
                             left_arrow, down_arrow, touch_jump);
        document.getElementById("control_jump").style.visibility = "visible";
    }

    setup_movement(up_arrow, down_arrow);
    setup_rotation(right_arrow, left_arrow, elapsed_sensor);
    setup_jumping(touch_jump);

    setup_falling_rocks(elapsed_sensor);
    setup_lava(elapsed_sensor);

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
                m_anim.apply(_character_rig, "character_run");
                break;
            case "BACKWARD":
                var move_dir = -1;
                m_anim.apply(_character_rig, "character_run");
                break;
            }
        } else {
            var move_dir = 0;
            m_anim.apply(_character_rig, "character_idle_01");
        }

        m_phy.set_character_move_dir(obj, move_dir, 0);

        m_anim.play(_character_rig);
        m_anim.set_behavior(_character_rig, m_anim.AB_CYCLIC);
    };

    m_ctl.create_sensor_manifold(_character, "FORWARD", m_ctl.CT_TRIGGER,
        move_array, forward_logic, move_cb);
    m_ctl.create_sensor_manifold(_character, "BACKWARD", m_ctl.CT_TRIGGER,
        move_array, backward_logic, move_cb);

    m_anim.apply(_character_rig, "character_idle_01");
    m_anim.play(_character_rig);
    m_anim.set_behavior(_character_rig, m_anim.AB_CYCLIC);
}

function setup_rotation(right_arrow, left_arrow, elapsed_sensor) {
    var key_a     = m_ctl.create_keyboard_sensor(m_ctl.KEY_A);
    var key_d     = m_ctl.create_keyboard_sensor(m_ctl.KEY_D);
    var key_left  = m_ctl.create_keyboard_sensor(m_ctl.KEY_LEFT);
    var key_right = m_ctl.create_keyboard_sensor(m_ctl.KEY_RIGHT);

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

function setup_falling_rocks(elapsed_sensor) {

    var ROCK_EMPTIES = ["lava_rock","lava_rock.001"];
    var ROCK_NAMES = ["rock_01", "rock_02", "rock_03"];

    var BURST_EMITTER_NAMES = ["burst_emitter_01", "burst_emitter_02",
                               "burst_emitter_03"];

    var MARK_NAMES = ["mark_01", "mark_02", "mark_03"];

    var falling_time = {};

    function rock_fall_cb(obj, id, pulse) {
        var elapsed = m_ctl.get_sensor_value(obj, id, 0);
        var obj_name = m_scs.get_object_name(obj);
        falling_time[obj_name] += elapsed;

        if (falling_time[obj_name] <= ROCK_FALL_DELAY)
            return;

        var rock_pos = _vec3_tmp;
        m_trans.get_translation(obj, rock_pos);
        rock_pos[2] -= ROCK_SPEED * elapsed;
        m_trans.set_translation_v(obj, rock_pos);
    }

    function rock_crush_cb(obj, id, pulse, burst_emitter) {
        var char_pos = _vec3_tmp;

        m_trans.get_translation(_character, char_pos);

        var sensor_id = m_ctl.get_sensor_value(obj, id, 0)? 0: 1;

        var collision_pt = m_ctl.get_sensor_payload(obj, id, sensor_id).coll_pos;
        var dist_to_rock = m_vec3.distance(char_pos, collision_pt);

        m_trans.set_translation_v(burst_emitter, collision_pt);
        m_anim.set_frame(burst_emitter, 0);
        m_anim.play(burst_emitter);

        set_random_position(obj);

        if (dist_to_rock < ROCK_DAMAGE_RADIUS)
            reduce_char_hp(ROCK_DAMAGE);

        var obj_name = m_scs.get_object_name(obj);
        falling_time[obj_name] = 0;
    }

    function mark_pos_cb(obj, id, pulse, mark) {
        var mark_pos = _vec3_tmp;
        var ray_dist = m_ctl.get_sensor_payload(obj, id, 0).hit_fract;
        var obj_name = m_scs.get_object_name(obj);

        if (falling_time[obj_name] <= ROCK_FALL_DELAY) {
            m_trans.get_translation(obj, mark_pos);
            mark_pos[2] -= ray_dist * ROCK_RAY_LENGTH - 0.01;
            m_trans.set_translation_v(mark, mark_pos);
        }

        m_trans.set_scale(mark, 1 - ray_dist);
    }

    function set_random_position(obj) {
        var pos = _vec3_tmp;
        pos[0] = 8 * Math.random() - 4;
        pos[1] = 8 * Math.random() - 4;
        pos[2] = 4 * Math.random() + 2;
        m_trans.set_translation_v(obj, pos);
    }

    for (var i = 0; i < ROCK_EMPTIES.length; i++) {

        var dupli_name = ROCK_EMPTIES[i];

        for (var j = 0; j < ROCK_NAMES.length; j++) {
            
            var rock_name  = ROCK_NAMES[j];
            var burst_name = BURST_EMITTER_NAMES[j];
            var mark_name  = MARK_NAMES[j];

            var rock  = m_scs.get_object_by_dupli_name(dupli_name, rock_name);
            var burst = m_scs.get_object_by_dupli_name(dupli_name, burst_name);
            var mark  = m_scs.get_object_by_dupli_name(dupli_name, mark_name);

            var coll_sens_lava = m_ctl.create_collision_sensor(rock, "LAVA", true);
            var coll_sens_island = m_ctl.create_collision_sensor(rock, "ISLAND", true);

            var ray_sens = m_ctl.create_ray_sensor(rock, [0, 0, 0],
                                        [0, 0, -ROCK_RAY_LENGTH], "ANY", true);

            m_ctl.create_sensor_manifold(rock, "ROCK_FALL", m_ctl.CT_CONTINUOUS,
                                         [elapsed_sensor], null, rock_fall_cb);

            m_ctl.create_sensor_manifold(rock, "ROCK_CRASH", m_ctl.CT_SHOT,
                                         [coll_sens_island, coll_sens_lava],
                    function(s){return s[0] || s[1]}, rock_crush_cb, burst);

            m_ctl.create_sensor_manifold(rock, "MARK_POS", m_ctl.CT_CONTINUOUS,
                                        [ray_sens], null, mark_pos_cb, mark);

            set_random_position(rock);
            rock_name = m_scs.get_object_name(rock);
            falling_time[rock_name] = 0;
        }
    }
}

function setup_lava(elapsed_sensor) {
    var time_in_lava = 0;

    function lava_cb(obj, id, pulse, param) {
        if (pulse == 1) {

            var elapsed = m_ctl.get_sensor_value(obj, id, 1);
            time_in_lava += elapsed;

            if (time_in_lava >= LAVA_DAMAGE_INTERVAL) {

                if (elapsed < LAVA_DAMAGE_INTERVAL)
                    var damage = 1;
                else
                    var damage = Math.floor(elapsed/LAVA_DAMAGE_INTERVAL);

                reduce_char_hp(damage);
                time_in_lava = 0;
            }
        } else {
            time_in_lava = 0;
        }
    }

    var lava_ray = m_ctl.create_ray_sensor(_character, [0, 0, 0], [0, 0, -0.30],
                                           "LAVA", true);

    m_ctl.create_sensor_manifold(_character, "LAVA_COLLISION",
        m_ctl.CT_CONTINUOUS, [lava_ray, elapsed_sensor],
        function(s) {return s[0]}, lava_cb);

}

function reduce_char_hp(amount) {

    if (_character_hp <= 0)
        return;

    _character_hp -= amount;

    var green_elem = document.getElementById("life_bar_green");
    var red_elem = document.getElementById("life_bar_red");
    var mid_elem = document.getElementById("life_bar_mid");

    var hp_px_ratio = 192 / MAX_CHAR_HP;
    var green_width = Math.max(_character_hp * hp_px_ratio, 0);
    var red_width = Math.min((MAX_CHAR_HP - _character_hp) * hp_px_ratio, 192);

    green_elem.style.width =  green_width + "px";
    red_elem.style.width =  red_width + "px";
    mid_elem.style.left = green_width + 19 + "px";

    if (_character_hp <= 0)
        kill_character();
}

function kill_character() {
    m_anim.apply(_character_rig, "character_death");
    m_anim.play(_character_rig);
    m_anim.set_behavior(_character_rig, m_anim.AB_FINISH_STOP);
    m_phy.set_character_move_dir(_character, 0, 0);
    m_ctl.remove_sensor_manifold(_character);
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

b4w.require("game_example_main").init();
