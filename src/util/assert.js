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

// TODO: add context-dependent m_print
import register from "./register.js";

import * as m_util from "../intern/util.js";
import m_print_fact from "../intern/print.js";

function Assert(ns, exports) {
var m_print = m_print_fact(ns);

var _equal_last_obj = null;
var _equal_init = false;

exports.panic = panic;
function panic(s) {
    if (s)
        m_print.error.apply(m_print, arguments);
    throw "engine panic:\n" +
            "The engine tried to perform an invalid operation and halted.\n" +
            "Please copy the console contents above and submit it to the Blend4Web forum at\n" +
            "https://www.blend4web.com/en/forums/forum/17/";
}

exports.assert = function(cond) {
    if (!cond)
        panic("Assertion failed");
}

exports.is_constructor = function(value, constructor) {
    if (value.constructor != constructor)
        panic("Type assertion failed: value <" + value + "> has type <"
                + value.constructor + ">, required <" + constructor + ">");
}

/**
 * Check whether the two objects have the same structure with proper values.
 * Renamed: assert_struct => equal
 */
exports.equal = equal;
function equal(obj1, obj2) {

    if (!is_valid(obj1))
        panic("Structure assertion failed: invalid first object value");

    if (!is_valid(obj2))
        panic("Structure assertion failed: invalid second object value");

    if (!cmp_type(obj1, obj2))
        panic("Structure assertion failed: incompatible types");

    // continue with objects
    if (!(obj1 != null && obj2 != null && typeof obj1 == "object" &&
                !m_util.is_arr_buf_view(obj1) && !(obj1 instanceof Array)))
        return;

    for (var i in obj1) {
        if (!is_valid(obj1[i]))
            panic("Structure assertion failed: invalid value for key " +
                    "in the first object: " + i);
        if (!(i in obj2))
            panic("Structure assertion failed: missing key in the first object: " + i);
    }

    for (var i in obj2) {
        if (!is_valid(obj2[i]))
            panic("Structure assertion failed: invalid value for key " +
                    "in the second object: " + i);
        if (!(i in obj1))
            panic("Structure assertion failed: missing key in the second object: " + i);
        if (!cmp_type(obj1[i], obj2[i]))
            panic("Structure assertion failed: incompatible types for key " + i);
    }
}

function is_valid(obj) {
    if (typeof obj == "undefined")
        return false;
    else if (typeof obj == "number" && isNaN(obj))
        return false;
    else
        return true;
}

function cmp_type(obj1, obj2) {
    var type1 = typeof obj1;
    var type2 = typeof obj2;

    if (type1 != type2)
        return false;

    // additional checks for js arrays or array buffers
    if (obj1 != null && obj2 != null && typeof obj1 == "object") {
        var is_arr1 = obj1 instanceof Array;
        var is_arr2 = obj2 instanceof Array;

        if ((is_arr1 && !is_arr2) || (!is_arr1 && is_arr2))
            return false;

        var is_abv1 = m_util.is_arr_buf_view(obj1);
        var is_abv2 = m_util.is_arr_buf_view(obj2);

        if ((is_abv1 && !is_abv2) || (!is_abv1 && is_abv2))
            return false;
    }

    return true;
}

/**
 * Assert object stucture - sequential form.
 * There is no cleanup, so always reload the page.
 */
exports.equal_seq = function(obj) {
    if (!_equal_init)
        _equal_init = true;
    else
        equal(obj, _equal_last_obj);

    if (obj != null && typeof obj == "object")
        _equal_last_obj = m_util.clone_object_nr(obj);
    else
        _equal_last_obj = obj;
}

}

var assert_fact = register("assert", Assert);
export default assert_fact;
