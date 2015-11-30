"use strict"

if (b4w.module_check("combat"))
    throw "Failed to register module: combat";

b4w.register("combat", function(exports, require) {

var m_trans = require("transform");
var m_vec3  = require("vec3");

var m_conf  = require("game_config");

var _vec3_tmp = new Float32Array(3);
var _vec3_tmp_2 = new Float32Array(3);

var _enemies = [];

exports.append_enemy = function(enemy) {
    _enemies.push(enemy);
}

exports.process_attack_on_enemies = function(at_pt, at_dst) {
    for (var i = 0; i < _enemies.length; i++) {

        var en = _enemies[i];
        if (en.hp <= 0 || en.state == m_conf.GS_NONE)
            continue;

        if(check_attack(at_pt, en.empty, at_dst)) {
            en.hp -= m_conf.CHAR_ATTACK_STR;
            return true;
        }
    }
    return false;
}

exports.check_attack = check_attack;
function check_attack(at_pt, targ, dist) {
    var targ_trans = _vec3_tmp;
    m_trans.get_translation(targ, targ_trans);
    var targ_dist_to_at_pt = m_vec3.distance(targ_trans, at_pt);

    if (targ_dist_to_at_pt < dist)
        return true;

    return false;
}

exports.check_visibility = check_visibility;
function check_visibility(unit1, unit2) {
    var trans_1 = m_trans.get_translation(unit1.body, _vec3_tmp);
    var trans_2 = m_trans.get_translation(unit2.body, _vec3_tmp_2);
    var dist = m_vec3.distance(trans_1, trans_2);
    if (dist > unit1.view_distance)
        return false;
    return true;
}

})
