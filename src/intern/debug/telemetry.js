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
import register from "../../util/register.js";

import m_print_fact from "../print.js";
import * as m_util from "../util.js";

function DebugTelemetry(ns, exports) {

var m_print = m_print_fact(ns);

var _telemetry_messages = [];

var _exec_counters = {};

var COLORS = ["color: #3366FF", "color: #CC33FF", "color: #FF3366", "color: #33FF66", "color: #FFCC33"];

/**
 * Flashback telemetry message prepended by precise time
 */
exports.fbmsg = function() {
    var msg = [performance.now()];

    for (var i = 0; i < arguments.length; i++) {
        var arg = arguments[i];

        if (m_util.is_vector(arg)) {
            for (var j = 0; j < arg.length; j++)
                msg.push(arg[j]);
        } else
            msg.push(arguments[i]);
    }

    _telemetry_messages.push(msg);
}

/**
 * Simple telemetry message prepended by id counter
 */
exports.msg = function() {

    var id_count = 1;
    for (var i = 0; i < _telemetry_messages.length; i++) {
        var msg = _telemetry_messages[i];
        if (msg[1] == arguments[0])
            id_count++;
    }

    var msg = [id_count];

    for (var i = 0; i < arguments.length; i++) {
        var arg = arguments[i];

        if (m_util.is_vector(arg)) {
            for (var j = 0; j < arg.length; j++)
                msg.push(arg[j]);
        } else
            msg.push(arguments[i]);
    }

    _telemetry_messages.push(msg);
}

exports.print_telemetry = function(time) {
    if (!time)
        time = 1.0;

    var color_counter = 0;
    var color_by_id = {};

    var start_time_ms = Math.max(0.0, performance.now() - time * 1000.0);
    for (var i = 0; i < _telemetry_messages.length; i++) {
        var msg = _telemetry_messages[i];

        time = msg[0];

        if (time < start_time_ms)
            continue;

        var id = String(msg[1]);

        if (!color_by_id[id])
            color_by_id[id] = COLORS[(color_counter++) % COLORS.length];

        var color = color_by_id[id];

        var console_args = ["%c" + (time / 1000).toFixed(6), color, id];
        for (var j = 2; j < msg.length; j++)
            console_args.push(msg[j]);

        m_print.log.apply(this, console_args);
    }

    // clear
    _telemetry_messages.splice(0);
}

exports.plot_telemetry = function(time) {
    if (!time)
        time = 1.0;

    var msg_by_id = {};

    var start_time_ms = Math.max(0.0, performance.now() - time * 1000.0);

    for (var i = 0; i < _telemetry_messages.length; i++) {
        var msg = _telemetry_messages[i];

        time = msg[0];

        if (time < start_time_ms)
            continue;

        for (var j = 2; j < msg.length; j++) {
            var id = String(msg[1]);
            if (msg.length > 3)
                id += "_" + String(j-2);
            
            if (!msg_by_id[id])
                msg_by_id[id] = id + "\n";

            msg_by_id[id] += String(time) + " " + msg[j] + "\n";
        }
    }

    var plot_str = "";

    for (var id in msg_by_id)
        plot_str += msg_by_id[id] + "\n\n";

    m_print.log(plot_str);

    // clear
    _telemetry_messages.splice(0);
}


/**
 * Print number of executions per frame.
 * @param {string} counter ID
 */
exports.exec_count = function(counter) {
    if (counter in _exec_counters)
        _exec_counters[counter] += 1;
    else
        _exec_counters[counter] = 1;
}

/**
 * Executed each frame.
 */
exports.update = function() {
    for (var i in _exec_counters) {
        m_print.log(i, _exec_counters[i]);
        _exec_counters[i] = 0;
    }
}

}

var debug_telemetry_fact = register("__debug_telemetry", DebugTelemetry);

export default debug_telemetry_fact;