import b4w from "blend4web";

var m_trans = b4w.transform;
var m_vec3  = b4w.vec3;

import * as m_conf from "./game_config.js";

var _vec3_tmp = new Float32Array(3);

var _enemies = null;

export function set_enemies(enemies) {
    _enemies = enemies;
}

export function process_attack_on_enemies(at_pt, at_dst) {
    for (var i = 0; i < _enemies.length; i++) {

        var en = _enemies[i];
        if (en.hp <= 0)
            continue;

        var golem = en.empty;
        if(check_attack(at_pt, golem, at_dst)) {
            en.hp -= m_conf.CHAR_ATTACK_STR;
            return true;
        }
    }
    return false;
}

export function check_attack(at_pt, targ, dist) {
    var targ_trans = _vec3_tmp;
    m_trans.get_translation(targ, targ_trans);
    var targ_dist_to_at_pt = m_vec3.distance(targ_trans, at_pt);

    if (targ_dist_to_at_pt < dist)
        return true;

    return false;
}
