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
//"use strict";

/**
 * Physics worker Inter Process Communication API.
 * @name ipc
 * @namespace
 * @exports exports as ipc
 */
b4w.module["__ipc"] = function(exports, require) {
/*
 * Use Visual Incrementing script to simplify assignment of such numbers in VIM
 * http://www.drchip.org/astronaut/vim/index.html#VISINCR
 */
var _wait_for_loading = true;
// MAIN <- PHYSICS
exports.IN_LOADED                = 0 ;
exports.IN_COLLISION             = 1 ;
exports.IN_COLLISION_POS_NORM    = 2 ;
exports.IN_COLLISION_IMPULSE     = 3 ;
exports.IN_ERROR                 = 4 ;
exports.IN_FBMSG                 = 5 ;
exports.IN_FLOATER_BOB_TRANSFORM = 6 ;
exports.IN_LOG                   = 7 ;
exports.IN_PROP_OFFSET           = 8 ;
exports.IN_RAY_HIT               = 9 ;
exports.IN_RAY_HIT_POS_NORM      = 10;
exports.IN_REMOVE_RAY_TEST       = 11;
exports.IN_TRANSFORM             = 12;
exports.IN_VEHICLE_SPEED         = 13;
exports.IN_PING                  = 14;
exports.IN_FPS                   = 15;
exports.IN_DEBUG_STATS           = 16;

var IN_COLLISION          = exports.IN_COLLISION;
var IN_COLLISION_POS_NORM = exports.IN_COLLISION_POS_NORM;
var IN_PROP_OFFSET        = exports.IN_PROP_OFFSET;
var IN_RAY_HIT            = exports.IN_RAY_HIT;
var IN_RAY_HIT_POS_NORM   = exports.IN_RAY_HIT_POS_NORM;
var IN_TRANSFORM          = exports.IN_TRANSFORM;

// MAIN -> PHYSICS
exports.OUT_INIT                         = 100;
exports.OUT_ACTIVATE                     = 101;
exports.OUT_ADD_BOAT_BOB                 = 102;
exports.OUT_ADD_CAR_WHEEL                = 103;
exports.OUT_ADD_FLOATER_BOB              = 104;
exports.OUT_APPEND_BOUNDING_BODY         = 105;
exports.OUT_APPEND_BOAT                  = 106;
exports.OUT_APPEND_CAR                   = 107;
exports.OUT_APPEND_CHARACTER             = 108;
exports.OUT_APPEND_COLLISION_TEST        = 109;
exports.OUT_APPEND_CONSTRAINT            = 110;
exports.OUT_APPEND_FLOATER               = 111;
exports.OUT_APPEND_GHOST_MESH_BODY       = 112;
exports.OUT_APPEND_STATIC_MESH_BODY      = 113;
exports.OUT_APPEND_WATER                 = 114;
exports.OUT_REMOVE_BODY                  = 115;
exports.OUT_APPLY_CENTRAL_FORCE          = 116;
exports.OUT_APPLY_COLLISION_IMPULSE_TEST = 117;
exports.OUT_APPLY_TORQUE                 = 118;
exports.OUT_CHARACTER_JUMP               = 119;
exports.OUT_CHARACTER_ROTATION_INCREMENT = 120;
exports.OUT_CLEAR_COLLISION_IMPULSE_TEST = 121;
exports.OUT_DISABLE_SIMULATION           = 122;
exports.OUT_ENABLE_SIMULATION            = 123;
exports.OUT_PAUSE                        = 124;
exports.OUT_APPEND_RAY_TEST              = 125;
exports.OUT_REMOVE_RAY_TEST              = 126;
exports.OUT_CHANGE_RAY_TEST_FROM_TO      = 127;
exports.OUT_REMOVE_COLLISION_TEST        = 128;
exports.OUT_REMOVE_CONSTRAINT            = 129;
exports.OUT_RESUME                       = 130;
exports.OUT_SET_CHARACTER_FLY_VELOCITY   = 131;
exports.OUT_SET_CHARACTER_HOR_ROTATION   = 132;
exports.OUT_SET_CHARACTER_MOVE_DIR       = 133;
exports.OUT_SET_CHARACTER_MOVE_TYPE      = 134;
exports.OUT_SET_CHARACTER_ROTATION       = 135;
exports.OUT_SET_CHARACTER_RUN_VELOCITY   = 136;
exports.OUT_SET_CHARACTER_VERT_ROTATION  = 137;
exports.OUT_SET_CHARACTER_WALK_VELOCITY  = 138;
exports.OUT_SET_GRAVITY                  = 139;
exports.OUT_SET_LINEAR_VELOCITY          = 140;
exports.OUT_SET_TRANSFORM                = 141;
exports.OUT_SET_WATER_TIME               = 142;
exports.OUT_ADD_WATER_WRAPPER            = 143;
exports.OUT_UPDATE_BOAT_CONTROLS         = 144;
exports.OUT_UPDATE_CAR_CONTROLS          = 145;
exports.OUT_PING                         = 146;
exports.OUT_DEBUG                        = 147;
exports.OUT_UPDATE_WORLD                 = 148;
exports.OUT_SET_ANGULAR_VELOCITY         = 149;

var OUT_SET_TRANSFORM = exports.OUT_SET_TRANSFORM;

var _worker_listeners = b4w.worker_listeners;
var _worker_namespaces = b4w.worker_namespaces;

var _msg_cache_IN_TRANSFORM = {
    msg_id:   IN_TRANSFORM,

    body_id:  0,
    time:     0,
    trans:    new Float32Array(3),
    quat:     new Float32Array(4),
    linvel:   new Float32Array(3),
    angvel:   new Float32Array(3),

    len:      0
};

var _msg_cache_IN_PROP_OFFSET = {
    msg_id:               IN_PROP_OFFSET,

    chassis_hull_body_id: 0,
    prop_ind:             0,
    trans:                new Float32Array(3),
    quat:                 new Float32Array(4),

    len:                  0
};

var _msg_cache_IN_RAY_HIT = {
    msg_id:      IN_RAY_HIT,

    id:          0,
    body_id_hit: 0,
    hit_fract:   0,
    hit_time:    0,

    len:         0
};

var _msg_cache_IN_RAY_HIT_POS_NORM = {
    msg_id:      IN_RAY_HIT_POS_NORM,

    id:          0,
    body_id_hit: 0,
    hit_fract:   0,
    hit_time:    0,
    hit_pos:     new Float32Array(3),
    hit_norm:    new Float32Array(3),

    len:         0
};

var _msg_cache_IN_COLLISION = {
    msg_id:     IN_COLLISION,

    body_id_a:  0,
    body_id_b:  0,
    result:     0,

    len:        0
};

var _msg_cache_IN_COLLISION_POS_NORM = {
    msg_id:     IN_COLLISION_POS_NORM,

    body_id_a:  0,
    body_id_b:  0,
    result:     0,
    coll_point: new Float32Array(3),
    coll_norm:  new Float32Array(3),
    coll_dist:  0,

    len:        0
};

var _msg_cache_OUT_SET_TRANSFORM = {
    msg_id:  OUT_SET_TRANSFORM,

    body_id: 0,
    trans:   new Float32Array(3),
    quat:    new Float32Array(4),

    len:     0
};

var _msg_cache_list = [
    _msg_cache_IN_TRANSFORM,
    _msg_cache_IN_PROP_OFFSET,
    _msg_cache_IN_RAY_HIT,
    _msg_cache_IN_RAY_HIT_POS_NORM,
    _msg_cache_IN_COLLISION,
    _msg_cache_IN_COLLISION_POS_NORM,
    _msg_cache_OUT_SET_TRANSFORM
];


exports.create_worker = function(path, fallback) {
    var worker = {
        is_main: path ? true : false,
        web_worker: null,
        buf_arr: [],
        fb_worker_ns: ""
    }

    if (fallback) {
        // require here because it's not availabe in workers
        // (e.g. due to obfuscation)
        var m_util = require("__util");
        var m_cont = require("__container");


        var web_worker_fallback = {
            addEventListener: function(type, listener, useCapture) {
                if (type != "message")
                    m_util.panic("Wrong web worker event");

                set_fallback_listener(worker.fb_worker_ns, worker.is_main,
                        listener);
            },

            removeEventListener: function(type, listener, useCapture) {
                if (type != "message")
                    m_util.panic("Wrong web worker event");

                set_fallback_listener(worker.fb_worker_ns, worker.is_main, null);
            },

            postMessage: function(msg, msg2) {
                var listener = find_fallback_listener(worker.fb_worker_ns,
                        !worker.is_main);
                listener({"data": msg});
            },

            terminate: function() {
                for (var i = 0; i < _worker_namespaces.length; i+=2)
                    if (_worker_namespaces[i+1] == worker.fb_worker_ns) {
                        _worker_listeners.splice(i, 2);
                        _worker_namespaces.splice(i, 2);
                        return;
                    }
            }
        }

        worker.web_worker = web_worker_fallback;

        if (worker.is_main) {
            var main_ns = b4w.get_namespace(require);
            var worker_ns = m_util.unique_name(main_ns + "_worker");

            _worker_namespaces.push(main_ns);
            _worker_namespaces.push(worker_ns);

            _worker_listeners.push(null);
            _worker_listeners.push(null);

            worker.fb_worker_ns = worker_ns;

            var uranium_js = m_cont.find_script(path);
            if (uranium_js) {
                // just register in the new namespace
                if (_wait_for_loading)
                    uranium_js.addEventListener("load", function() {
                        b4w.require("__bindings", worker.fb_worker_ns);
                    }, false);
                else {
                    b4w.cleanup("__bindings", worker.fb_worker_ns);
                    b4w.cleanup("__ipc", worker.fb_worker_ns);
                    b4w.require("__bindings", worker.fb_worker_ns);
                }
            } else {
                // load and register
                uranium_js = document.createElement("script");

                uranium_js.src = path;
                uranium_js.defer = "defer";
                uranium_js.async = "async";
                uranium_js.addEventListener("load", function() {
                    _wait_for_loading = false;
                    b4w.require("__bindings", worker.fb_worker_ns);
                }, false);

                document.head.appendChild(uranium_js);
            }
        } else {
            worker.fb_worker_ns = b4w.get_namespace(require);
        }
    } else {
        if (path)
            worker.web_worker = new Worker(path);
        else
            worker.web_worker = self;
    }

    return worker;
}

function set_fallback_listener(worker_ns, is_main, listener) {
    for (var i = 0; i < _worker_namespaces.length; i+=2)
        if (_worker_namespaces[i+1] == worker_ns)
            _worker_listeners[i + Number(!is_main)] = listener;
}

function find_fallback_listener(worker_ns, is_main) {
    for (var i = 0; i < _worker_namespaces.length; i+=2)
        if (_worker_namespaces[i+1] == worker_ns)
            return _worker_listeners[i + Number(!is_main)];

    return null;
}

exports.attach_handler = function(worker, process_message_cb) {

    assign_msg_cache_length(_msg_cache_list);

    var preprocess_message_cb = function(event_data) {

        if (event_data.constructor == ArrayBuffer) {
            event_data = new Float32Array(event_data);
        } else if (event_data[0].constructor == ArrayBuffer) {
            for (var i = 0; i < event_data.length; i++)
                preprocess_message_cb(event_data[i]);
            return;
        }

        var msg_id = event_data[0] | 0;

        switch (msg_id) {
        case IN_TRANSFORM:
            var data = _msg_cache_IN_TRANSFORM;

            data.body_id   = event_data[1 ] | 0;
            data.time      = event_data[2 ];
            data.trans[0]  = event_data[3 ];
            data.trans[1]  = event_data[4 ];
            data.trans[2]  = event_data[5 ];
            data.quat[0]   = event_data[6 ];
            data.quat[1]   = event_data[7 ];
            data.quat[2]   = event_data[8 ];
            data.quat[3]   = event_data[9 ];
            data.linvel[0] = event_data[10];
            data.linvel[1] = event_data[11];
            data.linvel[2] = event_data[12];
            data.angvel[0] = event_data[13];
            data.angvel[1] = event_data[14];
            data.angvel[2] = event_data[15];
            break;
        case IN_PROP_OFFSET:
            var data = _msg_cache_IN_PROP_OFFSET;

            data.chassis_hull_body_id = event_data[1] | 0;
            data.prop_ind             = event_data[2] | 0;
            data.trans[0]             = event_data[3];
            data.trans[1]             = event_data[4];
            data.trans[2]             = event_data[5];
            data.quat[0]              = event_data[6];
            data.quat[1]              = event_data[7];
            data.quat[2]              = event_data[8];
            data.quat[3]              = event_data[9];
            break;
        case IN_RAY_HIT:
            var data = _msg_cache_IN_RAY_HIT;

            data.id          = event_data[1] | 0;
            data.body_id_hit = event_data[2] | 0;
            data.hit_fract   = event_data[3];
            data.hit_time    = event_data[4];

            break;
        case IN_RAY_HIT_POS_NORM:
            var data = _msg_cache_IN_RAY_HIT_POS_NORM;

            data.id          = event_data[ 1] | 0;
            data.body_id_hit = event_data[ 2] | 0;
            data.hit_fract   = event_data[ 3];
            data.hit_time    = event_data[ 4];
            data.hit_pos[0]  = event_data[ 5];
            data.hit_pos[1]  = event_data[ 6];
            data.hit_pos[2]  = event_data[ 7];
            data.hit_norm[0] = event_data[ 8];
            data.hit_norm[1] = event_data[ 9];
            data.hit_norm[2] = event_data[10];

            break;
        case IN_COLLISION:
            var data = _msg_cache_IN_COLLISION;

            data.body_id_a     =   event_data[1] | 0;
            data.body_id_b     =   event_data[2] | 0;
            data.result        = !!event_data[3];
            break;
        case IN_COLLISION_POS_NORM:
            var data = _msg_cache_IN_COLLISION_POS_NORM;

            data.body_id_a     =   event_data[ 1] | 0;
            data.body_id_b     =   event_data[ 2] | 0;
            data.result        = !!event_data[ 3];
            data.coll_point[0] =   event_data[ 4];
            data.coll_point[1] =   event_data[ 5];
            data.coll_point[2] =   event_data[ 6];
            data.coll_norm[0]  =   event_data[ 7];
            data.coll_norm[1]  =   event_data[ 8];
            data.coll_norm[2]  =   event_data[ 9];
            data.coll_dist     =   event_data[10];
            break;
        case OUT_SET_TRANSFORM:
            var data = _msg_cache_OUT_SET_TRANSFORM;

            data.body_id  = event_data[1] | 0;
            data.trans[0] = event_data[2];
            data.trans[1] = event_data[3];
            data.trans[2] = event_data[4];
            data.quat[0]  = event_data[5];
            data.quat[1]  = event_data[6];
            data.quat[2]  = event_data[7];
            data.quat[3]  = event_data[8];
            break;
        default:
            var data = event_data;
            break;
        }

        process_message_cb(worker, msg_id, data);
    }

    worker.web_worker.addEventListener("message", function(event) {
        preprocess_message_cb(event.data);
    }, false);
}

function assign_msg_cache_length(msg_cache_list) {

    for (var i = 0; i < msg_cache_list.length; i++) {
        var cache = msg_cache_list[i];
        var len = 0;

        for (var j in cache) {
            var prop = cache[j];

            switch (prop.constructor) {
            case Float32Array:
                len += prop.length;
                break;
            case Number:
                len += 1;
                break;
            default:
                break;
            }
        }

        // exclude "len" itself
        len -= 1;

        cache.len = len;
    }
}

exports.cleanup = function() {
}

/**
 * Cached message post.
 * messages with same id must have same length
 * @methodOf physics
 */
exports.post_msg = function(worker, msg_id) {

    // not initialized for worker warm-up
    if (!worker)
        return;

    switch (msg_id) {
    case IN_TRANSFORM:
        var data = _msg_cache_IN_TRANSFORM;
        var msg = new Float32Array(data.len);

        msg[0 ] = data.msg_id;
        msg[1 ] = data.body_id;
        msg[2 ] = data.time;
        msg[3 ] = data.trans[0];
        msg[4 ] = data.trans[1];
        msg[5 ] = data.trans[2];
        msg[6 ] = data.quat[0];
        msg[7 ] = data.quat[1];
        msg[8 ] = data.quat[2];
        msg[9 ] = data.quat[3];
        msg[10] = data.linvel[0];
        msg[11] = data.linvel[1];
        msg[12] = data.linvel[2];
        msg[13] = data.angvel[0];
        msg[14] = data.angvel[1];
        msg[15] = data.angvel[2];

        worker.buf_arr.push(msg.buffer);
        break;
    case IN_PROP_OFFSET:
        var data = _msg_cache_IN_PROP_OFFSET;
        var msg = new Float32Array(data.len);

        msg[0] = data.msg_id;
        msg[1] = data.chassis_hull_body_id;
        msg[2] = data.prop_ind;
        msg[3] = data.trans[0];
        msg[4] = data.trans[1];
        msg[5] = data.trans[2];
        msg[6] = data.quat[0];
        msg[7] = data.quat[1];
        msg[8] = data.quat[2];
        msg[9] = data.quat[3];

        worker.buf_arr.push(msg.buffer);
        break;
    case IN_RAY_HIT:
        var data = _msg_cache_IN_RAY_HIT;
        var msg = new Float32Array(data.len);

        msg[0] = data.msg_id;
        msg[1] = data.id;
        msg[2] = data.body_id_hit;
        msg[3] = data.hit_fract;
        msg[4] = data.hit_time;

        worker.buf_arr.push(msg.buffer);
        break;
    case IN_RAY_HIT_POS_NORM:
        var data = _msg_cache_IN_RAY_HIT_POS_NORM;
        var msg = new Float32Array(data.len);

        msg[ 0] = data.msg_id;
        msg[ 1] = data.id;
        msg[ 2] = data.body_id_hit;
        msg[ 3] = data.hit_fract;
        msg[ 4] = data.hit_time;
        msg[ 5] = data.hit_pos[0];
        msg[ 6] = data.hit_pos[1];
        msg[ 7] = data.hit_pos[2];
        msg[ 8] = data.hit_norm[0];
        msg[ 9] = data.hit_norm[1];
        msg[10] = data.hit_norm[2];

        worker.buf_arr.push(msg.buffer);
        break;
    case IN_COLLISION:
        var data = _msg_cache_IN_COLLISION;
        var msg = new Float32Array(data.len);

        msg[0] = data.msg_id;
        msg[1] = data.body_id_a;
        msg[2] = data.body_id_b;
        msg[3] = data.result;

        worker.buf_arr.push(msg.buffer);
        break;
    case IN_COLLISION_POS_NORM:
        var data = _msg_cache_IN_COLLISION_POS_NORM;
        var msg = new Float32Array(data.len);

        msg[ 0] = data.msg_id;
        msg[ 1] = data.body_id_a;
        msg[ 2] = data.body_id_b;
        msg[ 3] = data.result;
        msg[ 4] = data.coll_point[0];
        msg[ 5] = data.coll_point[1];
        msg[ 6] = data.coll_point[2];
        msg[ 7] = data.coll_norm[0];
        msg[ 8] = data.coll_norm[1];
        msg[ 9] = data.coll_norm[2];
        msg[10] = data.coll_dist;

        worker.buf_arr.push(msg.buffer);
        break;
    case OUT_SET_TRANSFORM:
        var data = _msg_cache_OUT_SET_TRANSFORM;
        var msg = new Float32Array(data.len);

        msg[0] = data.msg_id;
        msg[1] = data.body_id;
        msg[2] = data.trans[0];
        msg[3] = data.trans[1];
        msg[4] = data.trans[2];
        msg[5] = data.quat[0];
        msg[6] = data.quat[1];
        msg[7] = data.quat[2];
        msg[8] = data.quat[3];

        worker.buf_arr.push(msg.buffer);
        break;
    default:
        var msg = [];
        for (var i = 1; i < arguments.length; i++)
            msg.push(arguments[i]);
        worker.web_worker.postMessage(msg);
        break;
    }
}

exports.post_msg_arr = function(worker) {
    if (!worker || !worker.buf_arr.length)
        return;

    worker.web_worker.postMessage(worker.buf_arr);

    worker.buf_arr.length = 0;
}

exports.get_msg_cache = function(msg_id) {
    switch (msg_id) {
    case IN_TRANSFORM:
        return _msg_cache_IN_TRANSFORM;
    case IN_PROP_OFFSET:
        return _msg_cache_IN_PROP_OFFSET;
    case IN_RAY_HIT:
        return _msg_cache_IN_RAY_HIT;
    case IN_RAY_HIT_POS_NORM:
        return _msg_cache_IN_RAY_HIT_POS_NORM;
    case IN_COLLISION:
        return _msg_cache_IN_COLLISION;
    case IN_COLLISION_POS_NORM:
        return _msg_cache_IN_COLLISION_POS_NORM;
    case OUT_SET_TRANSFORM:
        return _msg_cache_OUT_SET_TRANSFORM;
    default:
        return null;
    }
}

exports.terminate = function(worker) {
    worker.web_worker.terminate();
    worker.web_worker = null;
}

exports.is_active = function(worker) {
    return !!worker.web_worker;
}

exports.is_fallback = function(worker) {
    return !!worker.fb_worker_ns;
}

}

