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
import register from "./register.js";

import m_assert_fact from "./assert.js";
import m_print_fact from "../intern/print.js";

function Generator(ns, exports) {

var m_assert = m_assert_fact(ns);
var m_print = m_print_fact(ns);

var _next = 1;
var _unique_counter = 0;
var _unique_name_counters = {};

var _hash_buffer_in = new Float64Array(1);
var _hash_buffer_out = new Uint32Array(_hash_buffer_in.buffer);

/**
 * Compose unique name based on given name.
 */
exports.unique_name = function(name_base) {
    if (!_unique_name_counters[name_base])
        _unique_name_counters[name_base] = 0;

    var name = name_base + _unique_name_counters[name_base];
    _unique_name_counters[name_base]++;
    return name;
}

exports.cleanup = function() {
    _unique_counter = 0;
    _unique_name_counters = {};
}

/**
 * Compose unique string ID.
 */
exports.unique_id = function() {
    _unique_counter++;
    return _unique_counter.toString(10);
}

exports.gen_color_id = function(counter) {

    // black reserved for background
    counter++;

    if (counter > 51 * 51 * 51)
        m_print.error("Color ID pool depleted");

    // 255 / 5 = 51
    var r = Math.floor(counter / (51 * 51));
    counter %= (51 * 51);
    var g = Math.floor(counter / 51);
    counter %= 51;
    var b = counter;

    var color_id = new Float32Array([r/51, g/51, b/51]);

    return color_id;
}

/** get random number */
exports.rand = function() {
    _next = (_next * 69069 + 5) % Math.pow(2, 32);
    return (Math.round(_next/65536) % 32768)/32767;
}

/** store seed */
exports.srand = function(seed) {
    _next = seed;
}

/**
 * Calculate id for strongly typed variables (batch, render, slink, ...).
 * init_val parameter is a sort of seed.
 */
exports.calc_variable_id = function(a, init_val) {
    return hash_code(a, init_val);
}

exports.hash_code = hash_code;
function hash_code(a, init_val) {
    var hash = init_val;

    switch (typeof a) {
    case "object":
        if (a) {
            // NOTE: some additional props could be added to GL-type objs
            // so don't build hash code for them
            switch (a.constructor) {
            case Object:
                for (var prop in a)
                    hash = hash_code(a[prop], hash);
                break;
            case Int8Array:
            case Uint8Array:
            case Uint8ClampedArray:
            case Int16Array:
            case Uint16Array:
            case Int32Array:
            case Uint32Array:
            case Float32Array:
            case Float64Array:
                for (var i = 0; i < a.length; i++)
                    hash = hash_code_number(a[i], hash);
                break;
            case Array:
                for (var i = 0; i < a.length; i++)
                    hash = hash_code(a[i], hash);
                break;
            case WebGLUniformLocation:
            case WebGLProgram:
            case WebGLShader:
            case WebGLFramebuffer:
            case WebGLRenderbuffer:
            case WebGLTexture:
            case WebGLBuffer:
                hash = hash_code_number(0, hash);
                break;
            default:
                m_assert.panic("Wrong object constructor:", a.constructor);
                break;
            }
        } else
            hash = hash_code_number(0, hash);

        return hash;
    case "number":
        return hash_code_number(a, hash);
    case "boolean":
        return hash_code_number(a | 0, hash);
    case "string":
        return hash_code_string(a, hash);
    case "function":
    case "undefined":
        return hash_code_number(0, hash);
    }
}

function hash_code_number(num, init_val) {
    var hash = init_val;
    _hash_buffer_in[0] = num;

    hash = (hash<<5) - hash + _hash_buffer_out[0];
    hash = hash & hash;
    hash = (hash<<5) - hash + _hash_buffer_out[1];
    hash = hash & hash;

    return hash;
}

/**
 * Implementation of Java's String.hashCode().
 */
function hash_code_string(str, init_val) {
    var hash = init_val;

    for (var i = 0; i < str.length; i++) {
        var symbol = str.charCodeAt(i);
        hash = ((hash<<5) - hash) + symbol;
        hash = hash & hash; // convert to 32 bit integer
    }
    return hash;
}

}

var generator_fact = register("generator", Generator);

export default generator_fact;