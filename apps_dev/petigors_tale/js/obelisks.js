if (b4w.module_check("obelisks"))
    throw "Failed to register module: obelisks";

b4w.register("obelisks", function(exports, require) {

var m_ctl = require("controls");
var m_scs = require("scenes");
var m_anim = require("animation");
var m_sfx = require("sfx");
var m_trans = require("transform");
var m_mat = require("material");

var m_conf = require("game_config");
var m_char = require("character");
var m_enemies = require("enemies");
var m_interface = require("interface");

var _level_conf = null; // specified during initialization

var _gem_mount_spk = null;

var _vec3_tmp = new Float32Array(3);
var _quat4_tmp = new Float32Array(4);

var _obelisk_wrappers = [];

exports.init = function(elapsed_sensor, level_conf) {
    _level_conf = level_conf;

    var char_wrapper = m_char.get_wrapper();
    _obelisk_wrappers.length = 0;

    var obelisk_cb = function(ob_wrapper, id, pulse) {
        if (pulse != 1 || !char_wrapper.gem_slot)
            return;

        if (ob_wrapper.num_gems == _level_conf.OBELISK_NUM_GEMS)
            return;

        var gem_color = char_wrapper.gem_slot.color;

        if (gem_color == ob_wrapper.color || gem_color == m_conf.CL_MULTI) {
            m_char.remove_gem();
            var ob_id = get_id_by_color(ob_wrapper.color);
            change_gems_num(ob_id, 1);
        }
    }

    if (_level_conf.ISLES_SHIELD_DUPLI_NAME_LIST)
        stop_islands_anim();

    if (_level_conf.FLOOR_MAGIC_NAME) {
        var floor_magic = m_scs.get_object_by_dupli_name("level_02_enviroment",
                                                 _level_conf.FLOOR_MAGIC_NAME);
        var floor_magic_cb = function(obj, id, pulse, obelisk_wrapper) {
            var target_val = obelisk_wrapper.num_gems / _level_conf.OBELISK_NUM_GEMS;
            var val = obelisk_wrapper.magic_val;
            var elapsed = m_ctl.get_sensor_value(obj, id, 0);
            var val_diff = val - target_val;

            if (Math.abs(val_diff) <= 0.25 * elapsed) {
                obelisk_wrapper.magic_val = target_val;
                return;
            } else if (val < target_val)
                obelisk_wrapper.magic_val += 0.25 * elapsed;
            else if (val > target_val)
                obelisk_wrapper.magic_val -= 0.25 * elapsed;

            m_mat.set_nodemat_value(floor_magic,
                ["floor_magic_0"+(obelisk_wrapper.id+1), "Value"],
                obelisk_wrapper.magic_val);
        }
    }

    for (var i = 0; i < _level_conf.NUM_OBELISKS; i++) {
        var obelisk_name = "obelisk_" + i;
        var obelisk = m_scs.get_object_by_dupli_name(obelisk_name, "obelisk_collision")
        var gem_name = _level_conf.OBELISKS_GEMS_NAME[i];
        var color = get_color_by_gem_name(gem_name);

        var obelisk_wrapper = init_obelisk_wrapper(color, i)
        var coll_sens_char = m_ctl.create_collision_sensor(obelisk, "CHARACTER");
        m_ctl.create_sensor_manifold(obelisk_wrapper, "FILL_OBELISK_" + gem_name,
                            m_ctl.CT_TRIGGER, [coll_sens_char], null, obelisk_cb);

        if (_level_conf.FLOOR_MAGIC_NAME) {
            m_mat.set_nodemat_value(floor_magic, ["floor_magic_0"+(i+1), "Value"], 0.0);
            m_ctl.create_sensor_manifold(floor_magic, "FLOOR_MAGIC"+i, m_ctl.CT_CONTINUOUS,
                [elapsed_sensor], null, floor_magic_cb, obelisk_wrapper);
        }

        if (_level_conf.OBELISK_SHINE) {
            var shine_obj = m_scs.get_object_by_dupli_name(obelisk_name,
                                           _level_conf.OBELISK_SHINE + "_0" + (i + 1))
            obelisk_wrapper.shine_obj = shine_obj;
            m_anim.apply_def(shine_obj);
        }

        _obelisk_wrappers.push(obelisk_wrapper);
    }

    _gem_mount_spk = m_scs.get_object_by_dupli_name(m_conf.CHAR_EMPTY,
                                                     m_conf.GEM_MOUNT_SPEAKER);
    reset();
}

function init_obelisk_wrapper(color, id) {
    return {
        num_gems: 0,
        gem_health: 0,
        color: color,
        id: id,
        magic_val: 0,
        shine_obj: null
    }
}

function get_color_by_gem_name(name) {
    switch(name) {
    case "BG":
        return m_conf.CL_BLUE;
    case "RG":
        return m_conf.CL_RED;
    case "GG":
        return m_conf.CL_GREEN;
    case "YG":
        return m_conf.CL_YELLOW;
    case "PG":
        return m_conf.CL_PURPLE;
    }
}

function stop_islands_anim() {
    for (var i = 0; i < _level_conf.NUM_OBELISKS; i++) {
        var isl_dupli_names = _level_conf.ISLES_SHIELD_DUPLI_NAME_LIST;
        isl_dupli_names[2] = "island_shield_" + i;
        var isl_shield = m_scs.get_object_by_dupli_name_list(isl_dupli_names);
        m_anim.stop(isl_shield);
        m_anim.set_behavior(isl_shield, m_anim.AB_FINISH_STOP);
    }
}

function change_gems_num(id, num) {

    var obelisk_name = "obelisk_" + id;
    var ob_wrapper = _obelisk_wrappers[id];

    if (num > 0) {
        var gem_name = _level_conf.OBELISKS_GEMS_NAME[id] + "_0"
                            + (ob_wrapper.num_gems + 1);
        var ob_gem = m_scs.get_object_by_dupli_name(obelisk_name, gem_name)
        m_scs.show_object(ob_gem);
        m_sfx.play_def(_gem_mount_spk);
        ob_wrapper.gem_health = _level_conf.OBELISK_GEM_HEALTH;
    } else if (num < 0) {
        var gem_name = _level_conf.OBELISKS_GEMS_NAME[id] + "_0"
                            + (ob_wrapper.num_gems);
        var ob_gem = m_scs.get_object_by_dupli_name(obelisk_name, gem_name)
        m_scs.hide_object(ob_gem);

        var gem_trans = _vec3_tmp; var gem_quat = _quat4_tmp;
        m_trans.get_translation(ob_gem, gem_trans);
        m_trans.get_rotation(ob_gem, gem_quat);

        emitt_shutters(gem_trans, gem_quat);
    }
    ob_wrapper.num_gems += num;
    try_to_capture(id);
}

exports.try_to_capture = try_to_capture;
function try_to_capture(id) {
    if (!is_filled(id))
        return;
    if (_level_conf.LEVEL_NAME == "volcano" && m_enemies.island_has_enemies(id))
        return;
    capture_obelisk(id);
}

function capture_obelisk(id) {

    var obelisk_wrapper = _obelisk_wrappers[id];

    if (_level_conf.ISLES_SHIELD_DUPLI_NAME_LIST) {
        var isl_dupli_names = _level_conf.ISLES_SHIELD_DUPLI_NAME_LIST;
        isl_dupli_names[2] = "island_shield_" + id;
        var isl_shield = m_scs.get_object_by_dupli_name_list(isl_dupli_names);
        m_anim.play(isl_shield);

        var isl_spk = m_scs.get_object_by_dupli_name("obelisk_" + id,
                                                     _level_conf.ISLAND_SPEAKER);
        m_sfx.play_def(isl_spk);
    }

    if (obelisk_wrapper.shine_obj) {
        m_anim.set_behavior(obelisk_wrapper.shine_obj, m_anim.AB_FINISH_STOP);
        m_anim.play(obelisk_wrapper.shine_obj);
    }

    if (check_victory())
        perform_victory();
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
    for (var i = 0; i < _level_conf.NUM_OBELISKS; i++) {
        if (!is_filled(i))
            return false;
    }
    return true;
}

function perform_victory() {

    // music
    var win_spk = m_scs.get_object_by_name(m_conf.WIN_SPEAKER);
    m_sfx.play_def(win_spk);
    m_sfx.clear_playlist();

    update_victory_interface();

    if (_level_conf.STAIRS_OBJ) {
        var stairs_obj = m_scs.get_object_by_name(_level_conf.STAIRS_OBJ,
                                                  _level_conf.STAIRS_OBJ);
        var stairs_emitter = m_scs.get_object_by_dupli_name(_level_conf.STAIRS_OBJ,
                                                            _level_conf.STAIRS_EMITTER);
        var stairs_magic = m_scs.get_object_by_dupli_name(_level_conf.STAIRS_OBJ,
                                                            _level_conf.STAIRS_MAGIC);
        var door_obj = m_scs.get_object_by_dupli_name_list(_level_conf.ISLANDS_DOOR);

        m_scs.show_object(stairs_emitter);
        m_anim.apply(stairs_emitter, "dust");
        m_anim.play(stairs_emitter);

        m_scs.show_object(stairs_magic);
        m_anim.apply_def(stairs_magic);
        m_anim.set_behavior(stairs_magic, m_anim.AB_FINISH_STOP);
        m_anim.play(stairs_magic);

        setTimeout(function() {
                        m_scs.show_object(stairs_obj);
                        m_scs.hide_object(door_obj);
                   },
                   1000);
    } else if (_level_conf.LEVEL_NAME == "dungeon") {
        var lava_death_ctrl = m_scs.get_object_by_dupli_name("lava_death_controller",
                                                             "lava_death_controller");
        m_anim.set_behavior(lava_death_ctrl, m_anim.AB_FINISH_STOP);
        m_anim.play(lava_death_ctrl);
    }
    m_char.run_victory();
}

function update_victory_interface() {
    m_interface.show_victory_element(1);
}

exports.is_filled = is_filled;
function is_filled(id) {
    return _obelisk_wrappers[id].num_gems == _level_conf.OBELISK_NUM_GEMS;
}

exports.num_gems = function(id) {
    return _obelisk_wrappers[id].num_gems;
}

exports.damage_obelisk = function(id){
    if (!--_obelisk_wrappers[id].gem_health) {
        _obelisk_wrappers[id].gem_health = _level_conf.OBELISK_GEM_HEALTH;
        change_gems_num(id, -1);
    }
}

exports.reset = reset;
function reset() {
    for (var i = 0; i < _level_conf.NUM_OBELISKS; i++) {
        _obelisk_wrappers[i].num_gems = 0;
        for (var j = 1; j <= _level_conf.OBELISK_NUM_GEMS; j++) {
            var gem_name = _level_conf.OBELISKS_GEMS_NAME[i]+ "_0" + j;
            var ob_gem = m_scs.get_object_by_dupli_name("obelisk_" + i, gem_name);
            if (ob_gem)
                m_scs.hide_object(ob_gem);
        }

        switch (_level_conf.LEVEL_NAME) {
        case "volcano":

            var isl_dupli_names = _level_conf.ISLES_SHIELD_DUPLI_NAME_LIST;
            isl_dupli_names[2] = "island_shield_" + i;
            var isl_shield = m_scs.get_object_by_dupli_name_list(isl_dupli_names);
            m_anim.set_frame(isl_shield, 0);

            var stairs_empty = m_scs.get_object_by_name(_level_conf.STAIRS_OBJ);
            var door_obj = m_scs.get_object_by_dupli_name_list(_level_conf.ISLANDS_DOOR);

            m_scs.show_object(door_obj);
            m_scs.hide_object(stairs_empty);

            break;
        case "dungeon":
            var floor_magic = m_scs.get_object_by_dupli_name("level_02_enviroment",
                                                             _level_conf.FLOOR_MAGIC_NAME);
            m_mat.set_nodemat_value(floor_magic, ["floor_magic_0"+(i+1), "Value"], 0.0);
            break;
        }
    }

}

exports.get_id_by_color = get_id_by_color;
function get_id_by_color(color) {
    for (var i = 0; i < _level_conf.NUM_OBELISKS; i++) {
        if (_obelisk_wrappers[i].color == color)
            return i;
    }
    return -1;
}

})
