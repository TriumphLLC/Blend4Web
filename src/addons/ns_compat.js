"use strict";

if (!window["b4w"])
    throw "Failed to register module ns_compat, load b4w first";

/**
 * Namespace compatibility add-on. Enables access to engine modules by
 * <code>b4w.MODULE</code>. Provides no external methods.
 * @module ns_compat
 *
 * @cc_externs animation assets camera config controls constraints
 * @cc_externs data debug geometry hud lights main material particles physics
 * @cc_externs scenes sfx shaders transform util version 
 *
 * @cc_externs vec3 vec4 quat mat3 mat4
 *
 * @cc_externs app camera_anim mixer npc_ai ns_compat pointerlock preloader storage
 */
b4w.module["ns_compat"] = function(exports, require) {

for (var mod_id in b4w.module)
    b4w[mod_id] = b4w.require(mod_id);
}

b4w.require("ns_compat");

