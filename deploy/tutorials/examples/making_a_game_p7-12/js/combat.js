"use strict"

// check if module exists
if (b4w.module_check("combat"))
    throw "Failed to register module: combat";

b4w.register("combat", function(exports, require) {

var m_trans = require("transform");
var m_vec3  = require("vec3");

var m_conf  = require("game_config");

var _vec3_tmp = new Float32Array(3);

var _char = null;
var _enemies = null;

exports.set_enemies = function(enemies) {
    _enemies = enemies;
}

exports.set_player_char = function(char) {
    _char = char;
}

exports.process_atack_on_enemies = function(at_pt, at_dst) {
    for (var i = 0; i < _enemies.length; i++) {

        var en = _enemies[i];
        if (en.hp <= 0)
            continue;

        var golem = en.empty;
        if(check_atack(at_pt, golem, at_dst)) {
            en.hp -= m_conf.CHAR_ATACK_STR;
            return true;
        }
    }
    return false;
}

exports.check_atack = check_atack;
function check_atack(at_pt, targ, dist) {
    var targ_trans = _vec3_tmp;
    m_trans.get_translation(targ, targ_trans);
    var targ_dist_to_at_pt = m_vec3.distance(targ_trans, at_pt);

    if (targ_dist_to_at_pt < dist)
        return true;

    return false;
}

})

