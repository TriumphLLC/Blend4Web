//"use strict";

/**
 * Physics worker Inter Process Communication API.
 * @name ipc
 * @namespace
 * @exports exports as ipc
 */
b4w.module["__ipc"] = function(exports, require) {

// MAIN <- PHYSICS
var IN_COLLISION                     = 0;
var IN_COLLISION_IMPULSE             = 1;
var IN_ERROR                         = 2;
var IN_FBMSG                         = 3;
var IN_FLOATER_BOB_TRANSFORM         = 4;
var IN_FRAME_END                     = 5;
var IN_LOG                           = 6;
var IN_PROP_OFFSET                   = 7;
var IN_RAY_HIT                       = 8;
var IN_TRANSFORM                     = 9;
var IN_VEHICLE_SPEED                 = 10;
var IN_PING                          = 11;
// MAIN -> PHYSICS
var OUT_ACTIVATE                     = 12;
var OUT_ADD_BOAT_BOB                 = 13;
var OUT_ADD_CAR_WHEEL                = 14;
var OUT_ADD_FLOATER_BOB              = 15;
var OUT_APPEND_BOUNDING_BODY         = 16;
var OUT_APPEND_BOAT                  = 17;
var OUT_APPEND_CAR                   = 18;
var OUT_APPEND_CHARACTER             = 19;
var OUT_APPEND_COLLISION_TEST        = 20;
var OUT_APPEND_CONSTRAINT            = 21;
var OUT_APPEND_FLOATER               = 22;
var OUT_APPEND_GHOST_MESH_BODY       = 23;
var OUT_APPEND_STATIC_MESH_BODY      = 24;
var OUT_APPEND_WATER                 = 25;
var OUT_APPEND_WORLD                 = 26;
var OUT_APPLY_CENTRAL_FORCE          = 27;
var OUT_APPLY_COLLISION_IMPULSE_TEST = 28;
var OUT_APPLY_TORQUE                 = 29;
var OUT_CHARACTER_JUMP               = 30;
var OUT_CHARACTER_ROTATION_INCREMENT = 31;
var OUT_CLEANUP                      = 32;
var OUT_CLEAR_COLLISION_IMPULSE_TEST = 33;
var OUT_DISABLE_SIMULATION           = 34;
var OUT_ENABLE_SIMULATION            = 35;
var OUT_FRAME_START                  = 36;
var OUT_PAUSE                        = 37;
var OUT_RAY_TEST                     = 38;
var OUT_REMOVE_COLLISION_TEST        = 39;
var OUT_REMOVE_CONSTRAINT            = 40;
var OUT_RESUME                       = 41;
var OUT_SET_ACTIVE_WORLD             = 42;
var OUT_SET_CHARACTER_FLY_VELOCITY   = 43;
var OUT_SET_CHARACTER_HOR_ROTATION   = 44;
var OUT_SET_CHARACTER_MOVE_DIR       = 45;
var OUT_SET_CHARACTER_MOVE_TYPE      = 46;
var OUT_SET_CHARACTER_ROTATION       = 47;
var OUT_SET_CHARACTER_RUN_VELOCITY   = 48;
var OUT_SET_CHARACTER_VERT_ROTATION  = 49;
var OUT_SET_CHARACTER_WALK_VELOCITY  = 50;
var OUT_SET_GRAVITY                  = 51;
var OUT_SET_LINEAR_VELOCITY          = 52;
var OUT_SET_TRANSFORM                = 53;
var OUT_SET_WATER_TIME               = 54;
var OUT_ADD_WATER_WRAPPER            = 55;
var OUT_UPDATE_BOAT_CONTROLS         = 56;
var OUT_UPDATE_CAR_CONTROLS          = 57;
var OUT_PING                         = 58;
var OUT_DEBUG                        = 59;
var LAST_MESSAGE                     = 60;

exports.IN_COLLISION             = IN_COLLISION;
exports.IN_COLLISION_IMPULSE     = IN_COLLISION_IMPULSE;
exports.IN_ERROR                 = IN_ERROR;
exports.IN_FBMSG                 = IN_FBMSG;
exports.IN_FLOATER_BOB_TRANSFORM = IN_FLOATER_BOB_TRANSFORM;
exports.IN_FRAME_END             = IN_FRAME_END;
exports.IN_LOG                   = IN_LOG;
exports.IN_PROP_OFFSET           = IN_PROP_OFFSET;
exports.IN_RAY_HIT               = IN_RAY_HIT;
exports.IN_TRANSFORM             = IN_TRANSFORM;
exports.IN_VEHICLE_SPEED         = IN_VEHICLE_SPEED;
exports.IN_PING                  = IN_PING;

exports.OUT_ACTIVATE                     = OUT_ACTIVATE;
exports.OUT_ADD_BOAT_BOB                 = OUT_ADD_BOAT_BOB;
exports.OUT_ADD_CAR_WHEEL                = OUT_ADD_CAR_WHEEL;
exports.OUT_ADD_FLOATER_BOB              = OUT_ADD_FLOATER_BOB;
exports.OUT_APPEND_BOUNDING_BODY         = OUT_APPEND_BOUNDING_BODY;
exports.OUT_APPEND_BOAT                  = OUT_APPEND_BOAT;
exports.OUT_APPEND_CAR                   = OUT_APPEND_CAR;
exports.OUT_APPEND_CHARACTER             = OUT_APPEND_CHARACTER;
exports.OUT_APPEND_COLLISION_TEST        = OUT_APPEND_COLLISION_TEST;
exports.OUT_APPEND_CONSTRAINT            = OUT_APPEND_CONSTRAINT;
exports.OUT_APPEND_FLOATER               = OUT_APPEND_FLOATER;
exports.OUT_APPEND_GHOST_MESH_BODY       = OUT_APPEND_GHOST_MESH_BODY;
exports.OUT_APPEND_STATIC_MESH_BODY      = OUT_APPEND_STATIC_MESH_BODY;
exports.OUT_APPEND_WATER                 = OUT_APPEND_WATER;
exports.OUT_APPEND_WORLD                 = OUT_APPEND_WORLD;
exports.OUT_APPLY_CENTRAL_FORCE          = OUT_APPLY_CENTRAL_FORCE;
exports.OUT_APPLY_COLLISION_IMPULSE_TEST = OUT_APPLY_COLLISION_IMPULSE_TEST;
exports.OUT_APPLY_TORQUE                 = OUT_APPLY_TORQUE;
exports.OUT_CHARACTER_JUMP               = OUT_CHARACTER_JUMP;
exports.OUT_CHARACTER_ROTATION_INCREMENT = OUT_CHARACTER_ROTATION_INCREMENT;
exports.OUT_CLEANUP                      = OUT_CLEANUP;
exports.OUT_CLEAR_COLLISION_IMPULSE_TEST = OUT_CLEAR_COLLISION_IMPULSE_TEST;
exports.OUT_DISABLE_SIMULATION           = OUT_DISABLE_SIMULATION;
exports.OUT_ENABLE_SIMULATION            = OUT_ENABLE_SIMULATION;
exports.OUT_FRAME_START                  = OUT_FRAME_START;
exports.OUT_PAUSE                        = OUT_PAUSE;
exports.OUT_RAY_TEST                     = OUT_RAY_TEST;
exports.OUT_REMOVE_COLLISION_TEST        = OUT_REMOVE_COLLISION_TEST;
exports.OUT_REMOVE_CONSTRAINT            = OUT_REMOVE_CONSTRAINT;
exports.OUT_RESUME                       = OUT_RESUME;
exports.OUT_SET_ACTIVE_WORLD             = OUT_SET_ACTIVE_WORLD;
exports.OUT_SET_CHARACTER_FLY_VELOCITY   = OUT_SET_CHARACTER_FLY_VELOCITY;
exports.OUT_SET_CHARACTER_HOR_ROTATION   = OUT_SET_CHARACTER_HOR_ROTATION;
exports.OUT_SET_CHARACTER_MOVE_DIR       = OUT_SET_CHARACTER_MOVE_DIR;
exports.OUT_SET_CHARACTER_MOVE_TYPE      = OUT_SET_CHARACTER_MOVE_TYPE;
exports.OUT_SET_CHARACTER_ROTATION       = OUT_SET_CHARACTER_ROTATION;
exports.OUT_SET_CHARACTER_RUN_VELOCITY   = OUT_SET_CHARACTER_RUN_VELOCITY;
exports.OUT_SET_CHARACTER_VERT_ROTATION  = OUT_SET_CHARACTER_VERT_ROTATION;
exports.OUT_SET_CHARACTER_WALK_VELOCITY  = OUT_SET_CHARACTER_WALK_VELOCITY;
exports.OUT_SET_GRAVITY                  = OUT_SET_GRAVITY;
exports.OUT_SET_LINEAR_VELOCITY          = OUT_SET_LINEAR_VELOCITY;
exports.OUT_SET_TRANSFORM                = OUT_SET_TRANSFORM;
exports.OUT_SET_WATER_TIME               = OUT_SET_WATER_TIME;
exports.OUT_ADD_WATER_WRAPPER            = OUT_ADD_WATER_WRAPPER;
exports.OUT_UPDATE_BOAT_CONTROLS         = OUT_UPDATE_BOAT_CONTROLS;
exports.OUT_UPDATE_CAR_CONTROLS          = OUT_UPDATE_CAR_CONTROLS;
exports.OUT_PING                         = OUT_PING;
exports.OUT_DEBUG                        = OUT_DEBUG;

var _worker = null;

var _worker_msg_cache = [];

// message source data
var _msg_cache = [];

// arrays to send (TODO: check it)
var _cached_data = [];

// message patterns
var _patterns = [];

// initialize message arrays
for (var i = 0; i < LAST_MESSAGE; i++) {
    _worker_msg_cache.push(null);
    _msg_cache.push(null);
    _cached_data.push(null);
    _patterns.push(null);
}

_msg_cache[IN_TRANSFORM] = {
        "msg_id":  0,
        "body_id": 0,
        "time":    0,
        "trans":   new Float32Array(3),
        "quat":    new Float32Array(4),
        "linvel":  new Float32Array(3),
        "angvel":  new Float32Array(3)
};

_msg_cache[IN_PROP_OFFSET] = {
        "msg_id":               0,
        "chassis_hull_body_id": 0,
        "prop_ind":             0,
        "trans":                new Float32Array(3),
        "quat":                 new Float32Array(4)
};

_msg_cache[IN_RAY_HIT] = {
        "msg_id":        0,
        "body_id":       0,
        "from":          new Float32Array(3),
        "to":            new Float32Array(3),
        "local":         0,
        "body_id_b_hit": 0,
        "cur_result":    0
};

_msg_cache[IN_COLLISION] = {
        "msg_id":        0,
        "body_id_a":     0,
        "body_id_b":     0,
        "result":        0,
        "coll_point":    new Float32Array(3)
};

_msg_cache[OUT_SET_TRANSFORM] = {
        "msg_id":        0,
        "body_id":       0,
        "trans":         new Float32Array(3),
        "quat":          new Float32Array(4)
};

_patterns[IN_TRANSFORM]   = ["msg_id",  1,
                             "body_id", 1,
                             "time",    1,
                             "trans",   3,
                             "quat",    4,
                             "linvel",  3,
                             "angvel",  3];

_patterns[IN_PROP_OFFSET] = ["msg_id",               1,
                             "chassis_hull_body_id", 1,
                             "prop_ind",             1,
                             "trans",                3,
                             "quat",                 4];

_patterns[IN_RAY_HIT]     = ["msg_id",        1,
                             "body_id",       1,
                             "from",          3,
                             "to",            3,
                             "local",         1,
                             "body_id_b_hit", 1,
                             "cur_result",    1];

_patterns[IN_COLLISION]     = ["msg_id",        1,
                               "body_id_a",     1,
                               "body_id_b",     1,
                               "result",        1,
                               "coll_point",    3];

_patterns[OUT_SET_TRANSFORM] = ["msg_id",        1,
                                "body_id",       1,
                                "trans",         3,
                                "quat",          4];

exports.init = function(worker, process_message_cb) {
    worker.addEventListener("message", function(event) {

        var event_data = event.data;
        var msg_id = event_data[0] | 0;

        if (_patterns[msg_id])
            var data = process_raw_data(msg_id, event_data);
        else
            var data = event_data;

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

    var msg_id = arguments[0] | 0;

    if (_patterns[msg_id]) {
        var data = zip_row_data(msg_id);

        if (!_worker_msg_cache[msg_id])
            _worker_msg_cache[msg_id] = data;

        var msg = _worker_msg_cache[msg_id];

    } else {
        var msg_len = arguments.length;

        if (!_worker_msg_cache[msg_id]) {
            _worker_msg_cache[msg_id]    = Array(msg_len);
            _worker_msg_cache[msg_id][0] = msg_id;
        }

        var msg = _worker_msg_cache[msg_id];

        for (var i = 1; i < msg_len; i++)
            msg[i] = arguments[i];
    }

    _worker.postMessage(msg);
}

exports.get_msg_cache = function(msg_id) {
    return _msg_cache[msg_id];
}

function process_raw_data(msg_id, raw_data) {
    var msg_cache = _msg_cache[msg_id];
    var pattern   = _patterns[msg_id];
    var elem_pos  = 0;

    for (var i = 0; i < pattern.length; i+=2) {
        var prop         = pattern[i];
        var elem_length  = pattern[i + 1];

        if (elem_length == 1) {
            // optimization: coerce type for some message fields
            if (prop == "msg_id" || prop == "body_id" || prop == "body_id_a" ||
                    prop == "body_id_b")
                msg_cache[prop] = raw_data[elem_pos] | 0;
            else
                msg_cache[prop] = raw_data[elem_pos];
        } else {
            for (var j = 0; j < elem_length; j++)
                msg_cache[prop][j] = raw_data[elem_pos + j];
        }

        elem_pos += elem_length;
    }

    return msg_cache;
}

function zip_row_data(msg_id) {

    var msg_cache = _msg_cache[msg_id];
    var pattern   = _patterns[msg_id];
    var elem_pos  = 0;

    if (!_cached_data[msg_id]) {
        var raw_data_length = 0;

        for (var i = 1; i < pattern.length; i += 2)
            raw_data_length += pattern[i];

        _cached_data[msg_id] = new Float32Array(raw_data_length);
    }

    var raw_data = _cached_data[msg_id];

    for (var i = 0; i < pattern.length; i += 2) {
        var cur_elem    = msg_cache[pattern[i]];
        var elem_length = pattern[i + 1];

        if (elem_length == 1)
            raw_data[elem_pos] = cur_elem;
        else
            raw_data.set(cur_elem, elem_pos);

        elem_pos += elem_length;
    }

    return raw_data;
}

}
