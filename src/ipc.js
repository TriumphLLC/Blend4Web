//"use strict";

/**
 * Physics worker Inter Process Communication API.
 * @name ipc
 * @namespace
 * @exports exports as ipc
 */
b4w.module["__ipc"] = function(exports, require) {

// MAIN <- PHYSICS
var IN_COLLISION                = 1;
var IN_COLLISION_IMPULSE        = 2;
var IN_ERROR                    = 3;
var IN_FBMSG                    = 4;
var IN_FLOATER_BOB_TRANSFORM    = 5;
var IN_FRAME_END                = 6;
var IN_LOG                      = 7;
var IN_PROP_OFFSET              = 8;
var IN_RAY_HIT                  = 9;
var IN_TRANSFORM                = 10;
var IN_VEHICLE_SPEED            = 11;

exports.IN_COLLISION                = IN_COLLISION;
exports.IN_COLLISION_IMPULSE        = IN_COLLISION_IMPULSE;
exports.IN_ERROR                    = IN_ERROR;
exports.IN_FBMSG                    = IN_FBMSG;
exports.IN_FLOATER_BOB_TRANSFORM    = IN_FLOATER_BOB_TRANSFORM;
exports.IN_FRAME_END                = IN_FRAME_END;
exports.IN_LOG                      = IN_LOG;
exports.IN_PROP_OFFSET              = IN_PROP_OFFSET;
exports.IN_RAY_HIT                  = IN_RAY_HIT;
exports.IN_TRANSFORM                = IN_TRANSFORM;
exports.IN_VEHICLE_SPEED            = IN_VEHICLE_SPEED;


// MAIN -> PHYSICS
exports.OUT_ACTIVATE                        = 1001;
exports.OUT_ADD_BOAT_BOB                    = 1002;
exports.OUT_ADD_CAR_WHEEL                   = 1003;
exports.OUT_ADD_FLOATER_BOB                 = 1004;
exports.OUT_APPEND_BOUNDING_BODY            = 1006;
exports.OUT_APPEND_BOAT                     = 1007;
exports.OUT_APPEND_CAR                      = 1008;
exports.OUT_APPEND_CHARACTER                = 1009;
exports.OUT_APPEND_COLLISION_TEST           = 1010;
exports.OUT_APPEND_CONSTRAINT               = 1011;
exports.OUT_APPEND_FLOATER                  = 1012;
exports.OUT_APPEND_GHOST_MESH_BODY          = 1013;
exports.OUT_APPEND_STATIC_MESH_BODY         = 1014;
exports.OUT_APPEND_WATER                    = 1015;
exports.OUT_APPEND_WORLD                    = 1016;
exports.OUT_APPLY_CENTRAL_FORCE             = 1017;
exports.OUT_APPLY_COLLISION_IMPULSE_TEST    = 1018;
exports.OUT_APPLY_TORQUE                    = 1019;
exports.OUT_CHARACTER_JUMP                  = 1020;
exports.OUT_CHARACTER_ROTATION_INCREMENT    = 1021;
exports.OUT_CLEANUP                         = 1022;
exports.OUT_CLEAR_COLLISION_IMPULSE_TEST    = 1023;
exports.OUT_DISABLE_SIMULATION              = 1024;
exports.OUT_ENABLE_SIMULATION               = 1025;
exports.OUT_FRAME_START                     = 1026;
exports.OUT_PAUSE                           = 1027;
exports.OUT_RAY_TEST                        = 1028;
exports.OUT_REMOVE_COLLISION_TEST           = 1029;
exports.OUT_REMOVE_CONSTRAINT               = 1030;
exports.OUT_RESUME                          = 1031;
exports.OUT_SET_ACTIVE_WORLD                = 1032;
exports.OUT_SET_CHARACTER_FLY_VELOCITY      = 1033;
exports.OUT_SET_CHARACTER_HOR_ROTATION      = 1034;
exports.OUT_SET_CHARACTER_MOVE_DIR          = 1035;
exports.OUT_SET_CHARACTER_MOVE_TYPE         = 1036;
exports.OUT_SET_CHARACTER_ROTATION          = 1037;
exports.OUT_SET_CHARACTER_RUN_VELOCITY      = 1038;
exports.OUT_SET_CHARACTER_VERT_ROTATION     = 1039;
exports.OUT_SET_CHARACTER_WALK_VELOCITY     = 1040;
exports.OUT_SET_GRAVITY                     = 1041;
exports.OUT_SET_LINEAR_VELOCITY             = 1042;
exports.OUT_SET_TRANSFORM                   = 1043;
exports.OUT_SET_WATER_TIME                  = 1044;
exports.OUT_ADD_WATER_WRAPPER               = 1045;
exports.OUT_UPDATE_BOAT_CONTROLS            = 1047;
exports.OUT_UPDATE_CAR_CONTROLS             = 1048;

var OUT_SET_TRANSFORM = exports.OUT_SET_TRANSFORM;

var _worker = null;
var _worker_msg_cache = {};

// message source data
var _msg_cache = {};

_msg_cache[IN_TRANSFORM] = {
        "msg_id":  null,
        "body_id": null,
        "time":    null,
        "trans":   new Float32Array(3),
        "quat":    new Float32Array(4),
        "linvel":  new Float32Array(3),
        "angvel":  new Float32Array(3)
};

_msg_cache[IN_PROP_OFFSET] = {
        "msg_id":               null,
        "chassis_hull_body_id": null,
        "prop_ind":             null,
        "trans":                new Float32Array(3),
        "quat":                 new Float32Array(4)
};

_msg_cache[IN_RAY_HIT] = {
        "msg_id":        null,
        "body_id":       null,
        "from":          new Float32Array(3),
        "to":            new Float32Array(3),
        "local":         null,
        "body_id_b_hit": null,
        "cur_result":    null
};

_msg_cache[OUT_SET_TRANSFORM] = {
        "msg_id":        null,
        "body_id":       null,
        "trans":         new Float32Array(3),
        "quat":          new Float32Array(4)
};

// message patterns
var _patterns = {};

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

_patterns[OUT_SET_TRANSFORM] = ["msg_id",        1,
                                "body_id",       1,
                                "trans",         3,
                                "quat",          4];

// arrays to send
var _cached_data = {};

exports.init = function(worker, process_message_cb) {
    worker.addEventListener("message", function(event) {

        var msg_id = event.data[0];

        if (msg_id in _patterns)
            var data = process_raw_data(event.data);
        else
            var data = event.data;

        process_message_cb(msg_id, data);
    }, false);

    _worker = worker;
}

exports.cleanup = function() {
    _worker = null;
    _worker_msg_cache = {};
}

/**
 * Cached message post.
 * messages with same id must have same length
 * @methodOf physics
 */
exports.post_msg = function() {

    var msg_id = arguments[0];

    if (msg_id in _patterns) {
        var data = zip_row_data(msg_id);

        if (!(msg_id in _worker_msg_cache))
            _worker_msg_cache[msg_id] = data;

        var msg = _worker_msg_cache[msg_id];

    } else {
        var msg_len = arguments.length;

        if (!(msg_id in _worker_msg_cache)) {
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

function process_raw_data(raw_data) {
    var msg_id    = raw_data[0];
    var msg_cache = _msg_cache[msg_id];
    var pattern   = _patterns[msg_id];
    var elem_pos  = 0;

    for (var i = 0; i < pattern.length; i += 2) {
        var prop         = pattern[i];
        var elem_length  = pattern[i + 1];
        var new_elem_pos = elem_pos + elem_length;

        if (elem_length == 1)
            msg_cache[prop] = raw_data[elem_pos];
        else {
            for (var j = 0; j < elem_length; j++)
                msg_cache[prop][j] = raw_data[elem_pos + j];
        }

        elem_pos = new_elem_pos;
    }

    return msg_cache;
}

function zip_row_data(msg_id) {

    var msg_cache = _msg_cache[msg_id];
    var pattern   = _patterns[msg_id];
    var elem_pos  = 0;

    if (!(msg_id in _cached_data)) {
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
