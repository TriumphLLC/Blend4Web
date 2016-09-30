"use strict"

if (b4w.module_check("bonuses"))
    throw "Failed to register module: bonuses";

b4w.register("bonuses", function(exports, require) {

var m_conf = require("game_config");
var m_trans = require("transform");
var m_ctl = require("controls");
var m_scs = require("scenes");
var m_sfx = require("sfx");

var m_char = require("character");

var _bonus_wrappers = [];

var _char_heal_spk = null;
var _char_lava_spk = null;
var _char_shield_spk = null;

var _shield_time_left = 0;
var _lava_protect_time_left = 0;

exports.init = function(elapsed_sensor, level_config) {

    _char_heal_spk = m_scs.get_object_by_dupli_name(m_conf.CHAR_EMPTY,
                                                    m_conf.CHAR_HEAL_SPEAKER);
    _char_lava_spk = m_scs.get_object_by_dupli_name(m_conf.CHAR_EMPTY,
                                                    m_conf.CHAR_LAVA_SPEAKER);
    _char_shield_spk = m_scs.get_object_by_dupli_name(m_conf.CHAR_EMPTY,
                                                      m_conf.CHAR_SHIELD_SPEAKER);
    _bonus_wrappers.length = 0;
    process_bonuses(m_conf.HP_BONUSES_EMPTIES, m_conf.BTYPE_HP,
                    "potion_HP");
    process_bonuses(m_conf.LAVA_BONUSES_EMPTIES, m_conf.BTYPE_LAVA,
                    "potion_LAVA");
    process_bonuses(m_conf.SHIELD_BONUSES_EMPTIES, m_conf.BTYPE_SHIELD,
                    "potion_SHIELD");

    init_bonus_cb(elapsed_sensor);

    // shiled and lava protect effects
    function bonus_timer_cb(obj, id) {
        var elapsed = m_ctl.get_sensor_value(obj, id, 0);
        if (_shield_time_left > 0) {
            if (_shield_time_left - elapsed < m_conf.SHIELD_FLASH_LENGTH)
                m_char.remove_shield();
            _shield_time_left -= elapsed;
        }
        if (_lava_protect_time_left > 0) {
            if (_lava_protect_time_left - elapsed < m_conf.LAVA_FALL_LENGTH)
                m_char.remove_lava_protect();
            _lava_protect_time_left -= elapsed;
        }
    }
    m_ctl.create_sensor_manifold(null, "BONUS_TIMER", m_ctl.CT_CONTINUOUS,
                                 [elapsed_sensor], null, bonus_timer_cb);
}

function init_bonus_wrapper(empty_name, type, bonus_name) {
    var bonus_wrapper = {
        empty: m_scs.get_object_by_name(empty_name),
        body: m_scs.get_object_by_dupli_name(empty_name, bonus_name),
        lifetime: m_conf.BONUS_LIFETIME,
        type: type,
        is_spawned: false
    }
    return bonus_wrapper;
}

function init_bonus_cb(elapsed_sensor) {
    function bonus_cb(obj, id, pulse, bonus_wrapper) {
        if (pulse == 1) {
            m_trans.set_translation_v(bonus_wrapper.empty, m_conf.DEFAULT_POS)
            switch(bonus_wrapper.type) {
            case m_conf.BTYPE_HP:
                m_char.apply_hp_potion();
                m_sfx.play_def(_char_heal_spk);
                break;
            case m_conf.BTYPE_LAVA:
                if (_lava_protect_time_left <= m_conf.LAVA_FALL_LENGTH)
                    m_char.apply_lava_protect();

                _lava_protect_time_left = m_conf.BONUS_LAVA_PROT_TIME;
                m_sfx.play_def(_char_lava_spk);
                break;
            case m_conf.BTYPE_SHIELD:
                if (_shield_time_left <= m_conf.SHIELD_FLASH_LENGTH)
                    m_char.apply_shield();

                _shield_time_left = m_conf.BONUS_SHIELD_TIME;
                m_sfx.play_def(_char_shield_spk);
                break;
            }
        }
    }

    function bonus_lifetime_cb(obj, id, pulse, bonus_wrapper) {
        var elapsed = m_ctl.get_sensor_value(obj, id, 0); 
        bonus_wrapper.lifetime -= elapsed;
        if (bonus_wrapper.lifetime > 0)
            process_bonus_flashing(bonus_wrapper);
        else {
            m_trans.set_translation_v(bonus_wrapper.empty, m_conf.DEFAULT_POS)
            bonus_wrapper.is_spawned = false;
        }
    }

    for (var i = 0; i < _bonus_wrappers.length; i++) {
        var bw = _bonus_wrappers[i];
        var bonus = bw.body;

        var coll_sens_hp_bonus = m_ctl.create_collision_sensor(bonus, "CHARACTER");
        m_ctl.create_sensor_manifold(bonus, "BONUS", m_ctl.CT_TRIGGER,
            [coll_sens_hp_bonus], null, bonus_cb, bw);
        m_ctl.create_sensor_manifold(bonus, "BONUS_LIFETIME", m_ctl.CT_CONTINUOUS,
            [elapsed_sensor], null, bonus_lifetime_cb, bw);
    }
}

function process_bonus_flashing(bonus_wrapper) {
    var time_left = bonus_wrapper.lifetime;
    if (time_left > 4)
        return;
    var bonus = bonus_wrapper.body;
    time_left *= m_conf.BONUS_FLASH_SPEED;
    var fract = time_left < 1? time_left: time_left % Math.floor(time_left);
    if (fract > 0.5)
        m_scs.hide_object(bonus);
    else
        m_scs.show_object(bonus);
}

function process_bonuses(bonus_array, type, name) {
    for (var i = 0; i < bonus_array.length; i++) {
        var empty_name = bonus_array[i];
        var bonus_wrapper = init_bonus_wrapper(empty_name, type, name);
        if (bonus_wrapper)
            _bonus_wrappers.push(bonus_wrapper);
    }
}

exports.spawn = function(position) {

    var bonus_type = Math.floor(3 * Math.random());

    for (var i = 0; i < _bonus_wrappers.length; i++) {
        var bonus_wrapper = _bonus_wrappers[i];
        if (!bonus_wrapper.is_spawned && bonus_wrapper.type == bonus_type) {
            position[2] += 0.05;
            m_trans.set_translation_v(bonus_wrapper.empty, position);
            bonus_wrapper.lifetime = m_conf.BONUS_LIFETIME;
            bonus_wrapper.is_spawned = true;
            m_scs.show_object(bonus_wrapper.body);
            return true;
        }
    }
    return false;
}

exports.reset = function() {
    for (var i = 0; i < _bonus_wrappers.length; i++) {
        m_trans.set_translation_v(_bonus_wrappers[i].empty, m_conf.DEFAULT_POS);
    }
}

exports.set_shield_time = function(val) {
    _shield_time_left = val;
}
exports.set_lava_protect_time = function(val) {
    _lava_protect_time_left = val;
}
exports.lava_protect_time_left = function() {
    return _lava_protect_time_left;
}
exports.shield_time_left = function() {
    return _shield_time_left;
}

})
