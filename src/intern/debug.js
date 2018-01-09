/**
 * Copyright (C) 2014-2017 Triumph LLC
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
import register from "../util/register.js";

import m_print_fact from "./print.js";

/**
 * Debug routines for internal usage.
 * Don't forget to register GL context by setup_context() function.
 * @name debug
 * @namespace
 * @exports exports as debug
 */
function Int_debug(ns, exports) {

var m_print  = m_print_fact(ns);

var _vbo_garbage_info = {};

exports.fill_vbo_garbage_info = function(vbo_id, sh_pair_str, attr_name, 
        byte_size, is_in_usage) {
    if (!_vbo_garbage_info[vbo_id])
        _vbo_garbage_info[vbo_id] = { shaders: sh_pair_str, attrs: {} };

    if (!(attr_name in _vbo_garbage_info[vbo_id].attrs))
        _vbo_garbage_info[vbo_id].attrs[attr_name] = byte_size;

    if (is_in_usage)
        _vbo_garbage_info[vbo_id].attrs[attr_name] = 0;
}

exports.calc_vbo_garbage_byte_size = function() {
    var size = 0;
    for (var vbo_id in _vbo_garbage_info)
        for (var name in _vbo_garbage_info[vbo_id].attrs)
            size += _vbo_garbage_info[vbo_id].attrs[name];
    return size;
}

exports.show_vbo_garbage_info = function() {
    var info_obj = {}
    for (var vbo_id in _vbo_garbage_info)
        for (var name in _vbo_garbage_info[vbo_id].attrs) {
            var byte_size = _vbo_garbage_info[vbo_id].attrs[name];
            if (byte_size) {
                var sh_str = _vbo_garbage_info[vbo_id].shaders;
                if (!(sh_str in info_obj))
                    info_obj[sh_str] = { total_size: 0, attrs: {} };

                if (!(name in info_obj[sh_str].attrs))
                    info_obj[sh_str].attrs[name] = 0;
                info_obj[sh_str].attrs[name] += byte_size;
                info_obj[sh_str].total_size += byte_size;
            }
        }

    for (var sh_str in info_obj) {
        m_print.groupCollapsed(sh_str, info_obj[sh_str].total_size);
        for (var name in info_obj[sh_str].attrs)
            m_print.log_raw(name, info_obj[sh_str].attrs[name]);

        m_print.groupEnd();
    }
}

exports.cleanup = function() {
    _vbo_garbage_info = {};
}

}

var int_debug_factory = register("__debug", Int_debug);

export default int_debug_factory;
