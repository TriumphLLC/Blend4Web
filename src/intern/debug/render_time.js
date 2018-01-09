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

import m_cfg_fact from "../config.js";
import m_debug_subscene_fact from "./subscene.js";
import m_ext_fact from "../extensions.js";
import m_subs_fact from "../subscene.js";
import * as m_util from "../util.js";

function DebugRenderTime(ns, exports) {

var m_cfg    = m_cfg_fact(ns);
var m_debug_subscene = m_debug_subscene_fact(ns);
var m_ext    = m_ext_fact(ns);
var m_subs   = m_subs_fact(ns);

var cfg_def = m_cfg.defaults;

var RENDER_TIME_SMOOTH_INTERVALS = 10;

exports.start_subs = function(subs) {
    if (!(cfg_def.show_hud_debug_info || subs.type == m_subs.PERFORMANCE))
        return;

    if (subs.do_not_debug)
        return;

    subs.debug_render_time_queries.push(create_render_time_query());
}

exports.start_batch = function(batch) {
    if (!(batch.type == "MAIN" && is_debug_view_render_time_mode()))
        return;

    batch.debug_render_time_queries.push(create_render_time_query());
}

function create_render_time_query() {
    var ext = m_ext.get_disjoint_timer_query();

    if (ext) {
        var query = ext.createQuery();
        ext.beginQuery(query);
    } else
        var query = performance.now();

    return query;
}

exports.stop_subs = function(subs) {
    if (!(cfg_def.show_hud_debug_info || subs.type == m_subs.PERFORMANCE))
        return;

    if (subs.do_not_debug)
        return;

    var render_time = calc_render_time(subs.debug_render_time_queries, 
            subs.debug_render_time, true);
    if (render_time)
        subs.debug_render_time = render_time;
}

exports.stop_batch = function(batch) {
    if (!(batch.type == "MAIN" && is_debug_view_render_time_mode()))
        return;

    var render_time = calc_render_time(batch.debug_render_time_queries, 
            batch.debug_render_time, true);
    if (render_time)
        batch.debug_render_time = render_time;
}

exports.is_debug_view_render_time_mode = is_debug_view_render_time_mode;
function is_debug_view_render_time_mode() {
    var subs_debug_view = m_debug_subscene.get_debug_view_subs();
    return subs_debug_view && subs_debug_view.debug_view_mode == m_debug_subscene.DV_RENDER_TIME;
}

/**
 * External method for debugging purposes
 */
exports.process_timer_queries = function(subs) {
    var render_time = calc_render_time(subs.debug_render_time_queries, 
            subs.debug_render_time, false);
    if (render_time)
        subs.debug_render_time = render_time;
}

function calc_render_time(queries, prev_render_time, end_query) {
    var ext = m_ext.get_disjoint_timer_query();
    var render_time = 0;

    if (ext) {
        if (end_query)
            ext.endQuery();

        for (var i = 0; i < queries.length; i++) {
            var query = queries[i];

            var available = ext.getQueryAvailable(query);

            var disjoint = ext.getDisjoint();

            if (available && !disjoint) {
                var elapsed = ext.getQueryObject(query);
                render_time = elapsed / 1000000;
                if (prev_render_time)
                    render_time = m_util.smooth(render_time,
                            prev_render_time, 1, RENDER_TIME_SMOOTH_INTERVALS);

                queries.splice(i, 1);
                i--;
            }
        }
    } else {
        render_time = performance.now() - queries.pop();
        if (prev_render_time)
            render_time = m_util.smooth(render_time,
                    prev_render_time, 1, RENDER_TIME_SMOOTH_INTERVALS);
    }

    return render_time;
}

}

var debug_rendertime_fact = register("__debug_rendertime", DebugRenderTime);

export default debug_rendertime_fact;