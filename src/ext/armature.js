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

/**
 * API methods to control armature objects.
 * @module armature
 */
b4w.module["armature"] = function(exports, require) {
var m_armat    = require("__armature");
var m_obj_util = require("__obj_util");
var m_trans    = require("__transform");
var m_print    = require("__print");

/**
 * Get translation, scale and rotation quaternion of the armature's bone,
 * defined in armature space.
 * @method module:armature.get_bone_tsr
 * @param {Object3D} armobj Armature object
 * @param {String} bone_name Bone name
 * @param {TSR} [dest] Destination vector
 * @returns {?TSR} Destination vector
 */
exports.get_bone_tsr = function(armobj, bone_name, dest) {
    if (!m_obj_util.is_armature(armobj))
        return null;

    if (!m_armat.check_bone(armobj, bone_name)) {
        m_print.error("There is no bone: \"", bone_name, "\" in \"", armobj.name, "\".");
        return null;
    }

    if (!dest)
        var dest = new Float32Array(8);

    m_armat.get_bone_tsr(armobj, bone_name, false, false, dest);
    return dest;
}

/**
 * Get translation, scale and rotation quaternion of the armature's bone,
 * defined in parent bone space.
 * @method module:armature.get_bone_tsr_rel
 * @param {Object3D} armobj Armature object
 * @param {String} bone_name Bone name
 * @param {TSR} [dest] Destination vector
 * @returns {?TSR} Destination vector
 */
exports.get_bone_tsr_rel = function(armobj, bone_name, dest) {
    if (!m_obj_util.is_armature(armobj))
        return null;

    if (!m_armat.check_bone(armobj, bone_name)) {
        m_print.error("There is no bone: \"", bone_name, "\" in \"", armobj.name, "\".");
        return null;
    }

    if (!dest)
        var dest = new Float32Array(8);

    m_armat.get_bone_tsr(armobj, bone_name, false, true, dest);
    return dest;
}

/**
 * Set translation, scale and rotation quaternion of the armature's bone,
 * defined in armature space.
 * @method module:armature.set_bone_tsr
 * @param {Object3D} armobj Armature object
 * @param {String} bone_name Bone name
 * @param {TSR} tsr Translation, scale and rotation quaternion
 */
exports.set_bone_tsr = function(armobj, bone_name, tsr) {
    if (!m_obj_util.is_armature(armobj))
        return;

    if (!m_armat.check_bone(armobj, bone_name)) {
        m_print.error("There is no bone: \"", bone_name, "\" in \"", armobj.name, "\".");
        return;
    }

    m_armat.set_bone_tsr(armobj, bone_name, tsr, false);
    m_trans.update_transform(armobj);
}

/**
 * Set translation, scale and rotation quaternion of the armature's bone,
 * defined in parent bone space.
 * @method module:armature.set_bone_tsr_rel
 * @param {Object3D} armobj Armature object
 * @param {String} bone_name Bone name
 * @param {TSR} tsr Translation, scale and rotation quaternion
 */
exports.set_bone_tsr_rel = function(armobj, bone_name, tsr) {
    if (!m_obj_util.is_armature(armobj))
        return;

    if (!m_armat.check_bone(armobj, bone_name)) {
        m_print.error("There is no bone: \"", bone_name, "\" in \"", armobj.name, "\".");
        return;
    }

    m_armat.set_bone_tsr(armobj, bone_name, tsr, true);
    m_trans.update_transform(armobj);
}

}
