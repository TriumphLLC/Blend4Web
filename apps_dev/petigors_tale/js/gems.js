if (b4w.module_check("gems"))
    throw "Failed to register module: gems";

b4w.register("gems", function(exports, require) {

var m_ctl = require("controls");
var m_scs = require("scenes");
var m_trans = require("transform");
var m_cons  = require("constraints");

var m_conf = require("game_config");
var m_obelisks = require("obelisks");
var m_char = require("character");

var _gem_wrappers = null;
var _level_conf = null;

exports.init = function(level_conf) {
    _level_conf = level_conf;
    _gem_wrappers = [];
    var gem_cb = function(gem, id, pulse, gem_wrapper) {
        if (pulse == 1) {
            m_char.add_gem(gem_wrapper);
        }
    }
    for (var i = 0; i < _level_conf.GEMS_EMPTIES.length; i++) {
        var gem_empty_name = _level_conf.GEMS_EMPTIES[i];
        var gem_name = _level_conf.GEMS_NAMES[i];
        var gem_empty = m_scs.get_object_by_name(gem_empty_name);
        var gem = m_scs.get_object_by_dupli_name(gem_empty_name, gem_name);

        if (!gem_empty || !gem)
            continue;

        switch(m_scs.get_object_name(gem)) {
        case "gem_B":
            var color = m_conf.CL_BLUE; 
            break;
        case "gem_R":
            var color = m_conf.CL_RED; 
            break;
        case "gem_G":
            var color = m_conf.CL_GREEN; 
            break;
        case "gem_Y":
            var color = m_conf.CL_YELLOW; 
            break;
        case "gem_P":
            var color = m_conf.CL_PURPLE; 
            break;
        case "gem_M":
            var color = m_conf.CL_MULTI; 
            break;
        }

        var gem_wrapper = init_gem_wrapper(gem_empty, gem, color);
        _gem_wrappers.push(gem_wrapper);

        var coll_sens_char = m_ctl.create_collision_sensor(gem, "CHARACTER");
        m_ctl.create_sensor_manifold(gem, "PICK_GEM", m_ctl.CT_TRIGGER,
            [coll_sens_char], null, gem_cb, gem_wrapper);
    }
}

function init_gem_wrapper(empty, gem, color) {
    var gem_wrapper = {
        empty: empty,
        color: color,
        state: m_conf.GM_SPARE
    }
    return gem_wrapper;
}

exports.spawn = function(trans) {
    var num_spare = 0;
    for (var i = 0; i < _gem_wrappers.length; i++) {
        if (can_spawn(_gem_wrappers[i]))
            num_spare++;
    }

    if (!num_spare)
        return;

    var rand = Math.floor(num_spare * Math.random());
    for (var i = 0; i < _gem_wrappers.length; i++) {
        var gem_wrapper = _gem_wrappers[i];
        if (can_spawn(gem_wrapper) && rand-- == 0) {
            var gem_empty = gem_wrapper.empty;
            m_trans.set_translation_v(gem_empty, trans);
            gem_wrapper.state = m_conf.GM_LAYING;
            break;
        }
    }
}

exports.reset = function() {
    for (var i = 0; i < _gem_wrappers.length; i++) {
        var gem_wrapper = _gem_wrappers[i];
        var gem_empty = gem_wrapper.empty;
        m_cons.remove(gem_empty)
        m_trans.set_translation_v(gem_empty, m_conf.DEFAULT_POS);
        gem_wrapper.state = m_conf.GM_SPARE;
    }
}

function can_spawn(gem_wrapper) {
    if (gem_wrapper.state != m_conf.GM_SPARE)
        return false;

    if (gem_wrapper.color == m_conf.CL_MULTI)
        return true;

    var obelisk_id = m_obelisks.get_id_by_color(gem_wrapper.color);
    return !m_obelisks.is_filled(obelisk_id);
}

})
