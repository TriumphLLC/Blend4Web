if (b4w.module_check("obelisks"))
    throw "Failed to register module: obelisks";

b4w.register("obelisks", function(exports, require) {

var m_ctl = require("controls");
var m_scs = require("scenes");
var m_anim = require("animation");
var m_sfx = require("sfx");
var m_trans = require("transform");

var m_conf = require("game_config");
var m_char = require("character");
var m_golems = require("golems");
var m_env = require("environment");
var m_interface = require("interface");

var _obelisk_stones_num = new Uint16Array([0,0,0,0,0]);
var _obelisk_stones_health = new Uint16Array(5);

var _gem_mount_spk = null;

var _vec3_tmp = new Float32Array(3);
var _quat4_tmp = new Float32Array(4);

exports.init = function() {
    reset();
    var char_wrapper = m_char.get_wrapper();
    var obelisk_cb = function(obj, id, pulse) {
        if (pulse == 1) {
            if (char_wrapper.gem_slot
                   && !is_filled(char_wrapper.island)
                   && (char_wrapper.gem_slot.id == char_wrapper.island
                       || char_wrapper.gem_slot.id == 5)) { // multi gem
                m_char.remove_gem();
                change_gems_num(char_wrapper.island, 1);
            }
        }
    }

    stop_islands_anim();

    var coll_sens_char = m_ctl.create_collision_sensor(char_wrapper.phys_body, "OBELISK");
    m_ctl.create_sensor_manifold(char_wrapper.phys_body, "FILL_OBELISK", m_ctl.CT_TRIGGER,
        [coll_sens_char], null, obelisk_cb);

    for (var i = 0; i < _obelisk_stones_health.length; i++)
        _obelisk_stones_health[i] = m_conf.OBELISK_GEM_HEALTH;

    _gem_mount_spk = m_scs.get_object_by_dupli_name("character",
                                                     m_conf.GEM_MOUNT_SPEAKER);
}

function stop_islands_anim() {
    for (var i = 0; i < m_conf.NUM_ISLANDS; i++) {
        var isl_dupli_names = m_conf.ISLES_SHIELD_DUPLI_NAME_LIST;
        isl_dupli_names[2] = "island_shield_" + i;
        var isl_shield = m_scs.get_object_by_dupli_name_list(isl_dupli_names);
        m_anim.stop(isl_shield);
        m_anim.set_behavior(isl_shield, m_anim.AB_FINISH_STOP);
    }
}

exports.change_gems_num = change_gems_num;
function change_gems_num(id, num) {

    var obelisk_name = "obelisk_" + id;

    if (num > 0) {
        var gem_name = m_conf.OBELISKS_GEMS_NAME[id] + "_0"
                            + (_obelisk_stones_num[id] + 1);
        var ob_gem = m_scs.get_object_by_dupli_name(obelisk_name, gem_name)
        m_scs.show_object(ob_gem);
        m_sfx.play_def(_gem_mount_spk);
        _obelisk_stones_health[id] = m_conf.OBELISK_GEM_HEALTH;
    } else if (num < 0) {
        var gem_name = m_conf.OBELISKS_GEMS_NAME[id] + "_0"
                            + (_obelisk_stones_num[id]);
        var ob_gem = m_scs.get_object_by_dupli_name(obelisk_name, gem_name)
        m_scs.hide_object(ob_gem);

        var gem_trans = _vec3_tmp; var gem_quat = _quat4_tmp;
        m_trans.get_translation(ob_gem, gem_trans);
        m_trans.get_rotation(ob_gem, gem_quat);

        emitt_shutters(gem_trans, gem_quat);
    }
    _obelisk_stones_num[id] += num;
    check_capture(id);
}

exports.check_capture = check_capture;
function check_capture(id) {
    if (is_filled(id) && !m_golems.island_has_golems(id)) {
        var isl_dupli_names = m_conf.ISLES_SHIELD_DUPLI_NAME_LIST;
        isl_dupli_names[2] = "island_shield_" + id;
        var isl_shield = m_scs.get_object_by_dupli_name_list(isl_dupli_names);
        m_anim.play(isl_shield);

        var isl_spk = m_scs.get_object_by_dupli_name("obelisk_" + id,
                                                     m_conf.ISLAND_SPEAKER);
        m_sfx.play_def(isl_spk);

        if (check_victory())
            perform_victory();
    }
}

function emitt_shutters(trans, quat) {
    var shutter_emitter = m_scs.get_object_by_dupli_name(
            m_conf.SHUTTER_EMITTER_EMPTY, m_conf.SHUTTER_EMITTER_NAME);
    m_trans.set_translation_v(shutter_emitter, trans);
    m_trans.set_rotation_v(shutter_emitter, quat);
    m_scs.show_object(shutter_emitter);
    m_anim.play(shutter_emitter,
                function(){
                    m_scs.hide_object(shutter_emitter)}
               );
    var gem_destroy_spk = m_scs.get_object_by_dupli_name(m_conf.SHUTTER_EMITTER_EMPTY,
                                                         m_conf.GEM_DESTR_SPEAKER);
    m_sfx.play_def(gem_destroy_spk);
}

function check_victory() {
    for (var i = 0; i < m_conf.NUM_ISLANDS; i++) {
        if (!is_filled(i))
            return false;
    }
    return true;
}

function perform_victory() {
    m_char.disable_controls();
    m_env.disable_environment();
    m_sfx.clear_playlist();

    // music
    var win_spk = m_scs.get_object_by_name(m_conf.WIN_SPEAKER);
    m_sfx.play_def(win_spk);

    var char_wrapper = m_char.get_wrapper();
    m_anim.apply(char_wrapper.rig, "character_idle_01");
    m_anim.set_behavior(char_wrapper.rig, m_anim.AB_CYCLIC);
    m_anim.play(char_wrapper.rig);

    update_victory_interface();
}

function update_victory_interface() {
    m_interface.show_victory_element(1);

    function interface_cb(obj, id, pulse){
        m_interface.hide_victory_element(1);
        m_interface.show_replay_button(1);
    }

    if (m_ctl.check_sensor_manifold(null, "UPDATE_VIC_INTERFACE"))
        m_ctl.remove_sensor_manifold(null, "UPDATE_VIC_INTERFACE");
    m_ctl.create_sensor_manifold(null, "UPDATE_VIC_INTERFACE", m_ctl.CT_SHOT,
        [m_ctl.create_timer_sensor(3)], null, interface_cb);
}

exports.is_filled = is_filled;
function is_filled(id) {
    return _obelisk_stones_num[id] == m_conf.OBELISK_NUM_GEMS;
}

exports.num_gems = function(id) {
    return _obelisk_stones_num[id];
}

exports.damage_obelisk = function(id){
    if (!--_obelisk_stones_health[id]) {
        _obelisk_stones_health[id] = m_conf.OBELISK_GEM_HEALTH;
        change_gems_num(id, -1);
    }
}

function reset() {
    for (var i = 0; i < m_conf.NUM_ISLANDS; i++) {
        _obelisk_stones_num[i] = 0;
        for (var j = 1; j <= m_conf.OBELISK_NUM_GEMS; j++) {
            var gem_name = m_conf.OBELISKS_GEMS_NAME[i]+ "_0" + j;
            var ob_gem = m_scs.get_object_by_dupli_name("obelisk_" + i, gem_name);
            m_scs.hide_object(ob_gem);
        }
        var isl_dupli_names = m_conf.ISLES_SHIELD_DUPLI_NAME_LIST;
        isl_dupli_names[2] = "island_shield_" + i;
        var isl_shield = m_scs.get_object_by_dupli_name_list(isl_dupli_names);
        m_anim.set_frame(isl_shield, 0);
    }
}

})
