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

// MAIN <- PHYSICS
var IN_LOADED                        = exports.IN_LOADED                = 0;
var IN_COLLISION                     = exports.IN_COLLISION             = 1;
var IN_COLLISION_IMPULSE             = exports.IN_COLLISION_IMPULSE     = 2;
var IN_ERROR                         = exports.IN_ERROR                 = 3;
var IN_FBMSG                         = exports.IN_FBMSG                 = 4;
var IN_FLOATER_BOB_TRANSFORM         = exports.IN_FLOATER_BOB_TRANSFORM = 5;
var IN_LOG                           = exports.IN_LOG                   = 6;
var IN_PROP_OFFSET                   = exports.IN_PROP_OFFSET           = 7;
var IN_RAY_HIT                       = exports.IN_RAY_HIT               = 8;
var IN_TRANSFORM                     = exports.IN_TRANSFORM             = 9;
var IN_VEHICLE_SPEED                 = exports.IN_VEHICLE_SPEED         = 10;
var IN_PING                          = exports.IN_PING                  = 11;
var IN_FPS                           = exports.IN_FPS                   = 12;
var IN_DEBUG_STATS                   = exports.IN_DEBUG_STATS           = 13;

// MAIN -> PHYSICS
var OUT_INIT                         = exports.OUT_INIT                         = 100;
var OUT_ACTIVATE                     = exports.OUT_ACTIVATE                     = 101;
var OUT_ADD_BOAT_BOB                 = exports.OUT_ADD_BOAT_BOB                 = 102;
var OUT_ADD_CAR_WHEEL                = exports.OUT_ADD_CAR_WHEEL                = 103;
var OUT_ADD_FLOATER_BOB              = exports.OUT_ADD_FLOATER_BOB              = 104;
var OUT_APPEND_BOUNDING_BODY         = exports.OUT_APPEND_BOUNDING_BODY         = 105;
var OUT_APPEND_BOAT                  = exports.OUT_APPEND_BOAT                  = 106;
var OUT_APPEND_CAR                   = exports.OUT_APPEND_CAR                   = 107;
var OUT_APPEND_CHARACTER             = exports.OUT_APPEND_CHARACTER             = 108;
var OUT_APPEND_COLLISION_TEST        = exports.OUT_APPEND_COLLISION_TEST        = 109;
var OUT_APPEND_CONSTRAINT            = exports.OUT_APPEND_CONSTRAINT            = 110;
var OUT_APPEND_FLOATER               = exports.OUT_APPEND_FLOATER               = 111;
var OUT_APPEND_GHOST_MESH_BODY       = exports.OUT_APPEND_GHOST_MESH_BODY       = 112;
var OUT_APPEND_STATIC_MESH_BODY      = exports.OUT_APPEND_STATIC_MESH_BODY      = 113;
var OUT_APPEND_WATER                 = exports.OUT_APPEND_WATER                 = 114;
var OUT_APPLY_CENTRAL_FORCE          = exports.OUT_APPLY_CENTRAL_FORCE          = 115;
var OUT_APPLY_COLLISION_IMPULSE_TEST = exports.OUT_APPLY_COLLISION_IMPULSE_TEST = 116;
var OUT_APPLY_TORQUE                 = exports.OUT_APPLY_TORQUE                 = 117;
var OUT_CHARACTER_JUMP               = exports.OUT_CHARACTER_JUMP               = 118;
var OUT_CHARACTER_ROTATION_INCREMENT = exports.OUT_CHARACTER_ROTATION_INCREMENT = 119;
var OUT_CLEAR_COLLISION_IMPULSE_TEST = exports.OUT_CLEAR_COLLISION_IMPULSE_TEST = 120;
var OUT_DISABLE_SIMULATION           = exports.OUT_DISABLE_SIMULATION           = 121;
var OUT_ENABLE_SIMULATION            = exports.OUT_ENABLE_SIMULATION            = 122;
var OUT_PAUSE                        = exports.OUT_PAUSE                        = 123;
var OUT_RAY_TEST                     = exports.OUT_RAY_TEST                     = 124;
var OUT_REMOVE_COLLISION_TEST        = exports.OUT_REMOVE_COLLISION_TEST        = 125;
var OUT_REMOVE_CONSTRAINT            = exports.OUT_REMOVE_CONSTRAINT            = 126;
var OUT_RESUME                       = exports.OUT_RESUME                       = 127;
var OUT_SET_CHARACTER_FLY_VELOCITY   = exports.OUT_SET_CHARACTER_FLY_VELOCITY   = 128;
var OUT_SET_CHARACTER_HOR_ROTATION   = exports.OUT_SET_CHARACTER_HOR_ROTATION   = 129;
var OUT_SET_CHARACTER_MOVE_DIR       = exports.OUT_SET_CHARACTER_MOVE_DIR       = 130;
var OUT_SET_CHARACTER_MOVE_TYPE      = exports.OUT_SET_CHARACTER_MOVE_TYPE      = 131;
var OUT_SET_CHARACTER_ROTATION       = exports.OUT_SET_CHARACTER_ROTATION       = 132;
var OUT_SET_CHARACTER_RUN_VELOCITY   = exports.OUT_SET_CHARACTER_RUN_VELOCITY   = 133;
var OUT_SET_CHARACTER_VERT_ROTATION  = exports.OUT_SET_CHARACTER_VERT_ROTATION  = 134;
var OUT_SET_CHARACTER_WALK_VELOCITY  = exports.OUT_SET_CHARACTER_WALK_VELOCITY  = 135;
var OUT_SET_GRAVITY                  = exports.OUT_SET_GRAVITY                  = 136;
var OUT_SET_LINEAR_VELOCITY          = exports.OUT_SET_LINEAR_VELOCITY          = 137;
var OUT_SET_TRANSFORM                = exports.OUT_SET_TRANSFORM                = 138;
var OUT_SET_WATER_TIME               = exports.OUT_SET_WATER_TIME               = 139;
var OUT_ADD_WATER_WRAPPER            = exports.OUT_ADD_WATER_WRAPPER            = 140;
var OUT_UPDATE_BOAT_CONTROLS         = exports.OUT_UPDATE_BOAT_CONTROLS         = 141;
var OUT_UPDATE_CAR_CONTROLS          = exports.OUT_UPDATE_CAR_CONTROLS          = 142;
var OUT_PING                         = exports.OUT_PING                         = 143;
var OUT_DEBUG                        = exports.OUT_DEBUG                        = 144;

var _worker = null;

var _msg_cache_IN_TRANSFORM = {
    "msg_id":   IN_TRANSFORM,

    "body_id":  0,
    "time":     0,
    "trans":    new Float32Array(3),
    "quat":     new Float32Array(4),
    "linvel":   new Float32Array(3),
    "angvel":   new Float32Array(3),

    raw_data:   new Float32Array(1+1+1+3+4+3+3)
};
_msg_cache_IN_TRANSFORM.raw_data[0] = IN_TRANSFORM;

var _msg_cache_IN_PROP_OFFSET = {
    "msg_id":               IN_PROP_OFFSET,

    "chassis_hull_body_id": 0,
    "prop_ind":             0,
    "trans":                new Float32Array(3),
    "quat":                 new Float32Array(4),

    raw_data:               new Float32Array(1+1+1+3+4)
};
_msg_cache_IN_PROP_OFFSET.raw_data[0] = IN_PROP_OFFSET;

var _msg_cache_IN_RAY_HIT = {
    "msg_id":        IN_RAY_HIT,

    "body_id":       0,
    "from":          new Float32Array(3),
    "to":            new Float32Array(3),
    "local":         0,
    "body_id_b_hit": 0,
    "cur_result":    0,

    raw_data:        new Float32Array(1+1+3+3+1+1+1)
};
_msg_cache_IN_RAY_HIT.raw_data[0] = IN_RAY_HIT;

var _msg_cache_IN_COLLISION = {
    "msg_id":     IN_COLLISION,

    "body_id_a":  0,
    "body_id_b":  0,
    "result":     0,
    "coll_point": new Float32Array(3),

    raw_data:     new Float32Array(1+1+1+1+3)
};
_msg_cache_IN_COLLISION.raw_data[0] = IN_COLLISION;

var _msg_cache_OUT_SET_TRANSFORM = {
    "msg_id":  OUT_SET_TRANSFORM,

    "body_id": 0,
    "trans":   new Float32Array(3),
    "quat":    new Float32Array(4),

    raw_data:  new Float32Array(1+1+3+4)
};
_msg_cache_OUT_SET_TRANSFORM.raw_data[0] = OUT_SET_TRANSFORM;


exports.init = function(worker, process_message_cb) {
    worker.addEventListener("message", function(event) {

        var event_data = event.data;

        var msg_id = event_data[0] | 0;

        switch (msg_id) {
        case IN_TRANSFORM:
            var data = _msg_cache_IN_TRANSFORM;

            data["body_id"]   = event_data[1 ];
            data["time"]      = event_data[2 ];
            data["trans"][0]  = event_data[3 ];
            data["trans"][1]  = event_data[4 ];
            data["trans"][2]  = event_data[5 ];
            data["quat"][0]   = event_data[6 ];
            data["quat"][1]   = event_data[7 ];
            data["quat"][2]   = event_data[8 ];
            data["quat"][3]   = event_data[9 ];
            data["linvel"][0] = event_data[10];
            data["linvel"][1] = event_data[11];
            data["linvel"][2] = event_data[12];
            data["angvel"][0] = event_data[13];
            data["angvel"][1] = event_data[14];
            data["angvel"][2] = event_data[15];
            break;
        case IN_PROP_OFFSET:
            var data = _msg_cache_IN_PROP_OFFSET;

            data["chassis_hull_body_id"] = event_data[1];
            data["prop_ind"]             = event_data[2];
            data["trans"][0]             = event_data[3];
            data["trans"][1]             = event_data[4];
            data["trans"][2]             = event_data[5];
            data["quat"][0]              = event_data[6];
            data["quat"][1]              = event_data[7];
            data["quat"][2]              = event_data[8];
            data["quat"][3]              = event_data[9];
            break;
        case IN_RAY_HIT:
            var data = _msg_cache_IN_RAY_HIT;

            data["body_id"]       = event_data[1 ];
            data["from"][0]       = event_data[2 ];
            data["from"][1]       = event_data[3 ];
            data["from"][2]       = event_data[4 ];
            data["to"][0]         = event_data[5 ];
            data["to"][1]         = event_data[6 ];
            data["to"][2]         = event_data[7 ];
            data["local"]         = event_data[8 ];
            data["body_id_b_hit"] = event_data[9 ];
            data["cur_result"]    = event_data[10];

            break;
        case IN_COLLISION:
            var data = _msg_cache_IN_COLLISION;

            data["body_id_a"]     = event_data[1];
            data["body_id_b"]     = event_data[2];
            data["result"]        = event_data[3];
            data["coll_point"][0] = event_data[4];
            data["coll_point"][1] = event_data[5];
            data["coll_point"][2] = event_data[6];
            break;
        case OUT_SET_TRANSFORM:
            var data = _msg_cache_OUT_SET_TRANSFORM;

            data["body_id"]  = event_data[1];
            data["trans"][0] = event_data[2];
            data["trans"][1] = event_data[3];
            data["trans"][2] = event_data[4];
            data["quat"][0]  = event_data[5];
            data["quat"][1]  = event_data[6];
            data["quat"][2]  = event_data[7];
            data["quat"][3]  = event_data[8];
            break;
        default:
            var data = event_data;
            break;
        }

        process_message_cb(msg_id, data);
    }, false);

    _worker = worker;
}

exports.cleanup = function() {
    _worker = null;
}

/**
 * Cached message post.
 * messages with same id must have same length
 * @methodOf physics
 */
exports.post_msg = function() {

    // not initialized for worker warm-up
    if (!_worker)
        return;

    var msg_id = arguments[0] | 0;

    switch (msg_id) {
    case IN_TRANSFORM:
        var data = _msg_cache_IN_TRANSFORM;
        var msg = data.raw_data;

        msg[1 ] = data["body_id"];
        msg[2 ] = data["time"];
        msg[3 ] = data["trans"][0];
        msg[4 ] = data["trans"][1];
        msg[5 ] = data["trans"][2];
        msg[6 ] = data["quat"][0];
        msg[7 ] = data["quat"][1];
        msg[8 ] = data["quat"][2];
        msg[9 ] = data["quat"][3];
        msg[10] = data["linvel"][0];
        msg[11] = data["linvel"][1];
        msg[12] = data["linvel"][2];
        msg[13] = data["angvel"][0];
        msg[14] = data["angvel"][1];
        msg[15] = data["angvel"][2];
        break;
    case IN_PROP_OFFSET:
        var data = _msg_cache_IN_PROP_OFFSET;
        var msg = data.raw_data;

        msg[1] = data["chassis_hull_body_id"];
        msg[2] = data["prop_ind"];
        msg[3] = data["trans"][0];
        msg[4] = data["trans"][1];
        msg[5] = data["trans"][2];
        msg[6] = data["quat"][0];
        msg[7] = data["quat"][1];
        msg[8] = data["quat"][2];
        msg[9] = data["quat"][3];
        break;
    case IN_RAY_HIT:
        var data = _msg_cache_IN_RAY_HIT;
        var msg = data.raw_data;

        msg[1 ] = data["body_id"];
        msg[2 ] = data["from"][0];
        msg[3 ] = data["from"][1];
        msg[4 ] = data["from"][2];
        msg[5 ] = data["to"][0];
        msg[6 ] = data["to"][1];
        msg[7 ] = data["to"][2];
        msg[8 ] = data["local"];
        msg[9 ] = data["body_id_b_hit"];
        msg[10] = data["cur_result"];

        break;
    case IN_COLLISION:
        var data = _msg_cache_IN_COLLISION;
        var msg = data.raw_data;

        msg[1] = data["body_id_a"];
        msg[2] = data["body_id_b"];
        msg[3] = data["result"];
        msg[4] = data["coll_point"][0];
        msg[5] = data["coll_point"][1];
        msg[6] = data["coll_point"][2];
        break;
    case OUT_SET_TRANSFORM:
        var data = _msg_cache_OUT_SET_TRANSFORM;
        var msg = data.raw_data;

        msg[1] = data["body_id"];
        msg[2] = data["trans"][0];
        msg[3] = data["trans"][1];
        msg[4] = data["trans"][2];
        msg[5] = data["quat"][0];
        msg[6] = data["quat"][1];
        msg[7] = data["quat"][2];
        msg[8] = data["quat"][3];
        break;
    default:
        var msg = [];
        for (var i = 0; i < arguments.length; i++)
            msg.push(arguments[i]);
        break;
    }

    _worker.postMessage(msg);
}

exports.get_msg_cache = function(msg_id) {
    switch (msg_id) {
    case IN_TRANSFORM:
        return _msg_cache_IN_TRANSFORM;
    case IN_PROP_OFFSET:
        return _msg_cache_IN_PROP_OFFSET;
    case IN_RAY_HIT:
        return _msg_cache_IN_RAY_HIT;
    case IN_COLLISION:
        return _msg_cache_IN_COLLISION;
    case OUT_SET_TRANSFORM:
        return _msg_cache_OUT_SET_TRANSFORM;
    default:
        return null;
    }
}

}
