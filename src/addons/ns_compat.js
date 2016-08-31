/**
 * Copyright (C) 2014-2016 Triumph LLC
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
"use strict";

if (!window["b4w"])
    throw "Failed to register module ns_compat, load b4w first";

/**
 * Namespace compatibility add-on. Enables access to engine modules by
 * <code>b4w.MODULE</code>. Provides no external methods.
 * @module ns_compat
 *
 * @cc_externs animation armature assets camera config controls constraints container
 * @cc_externs data debug geometry hud lights main material math particles physics
 * @cc_externs rgb rgba scenes sfx textures transform util version nla input
 *
 * @cc_externs vec3 vec4 quat mat3 mat4
 *
 * @cc_externs app camera_anim gp_conf gyroscope hmd_conf hmd mixer mouse npc_ai ns_compat preloader storage
 */
b4w.module["ns_compat"] = function(exports, require) {

for (var mod_id in b4w.module)
    b4w[mod_id] = b4w.require(mod_id);
}

b4w.require("ns_compat");

