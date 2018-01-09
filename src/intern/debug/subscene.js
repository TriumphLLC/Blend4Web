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

function DebugSubscene(ns, exports) {

// TODO: find place for this contant
exports.DV_NONE = 0;
exports.DV_OPAQUE_WIREFRAME = 1;
exports.DV_TRANSPARENT_WIREFRAME = 2;
exports.DV_FRONT_BACK_VIEW = 3;
exports.DV_BOUNDINGS = 4;
exports.DV_CLUSTERS_VIEW = 5;
exports.DV_BATCHES_VIEW = 6;
exports.DV_RENDER_TIME = 7;


var _debug_view_subs = null;

exports.set_debug_view_subs = set_debug_view_subs;
function set_debug_view_subs(subs) {
    _debug_view_subs = subs;
}

exports.get_debug_view_subs = get_debug_view_subs;
function get_debug_view_subs() {
    return _debug_view_subs;
}


exports.cleanup = function() {
    _debug_view_subs = null;
}

}

var debug_subscene_fact = register("__debug_subscene", DebugSubscene);

export default debug_subscene_fact;