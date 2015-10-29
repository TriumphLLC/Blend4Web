/**
 * Copyright (C) 2014-2015 Triumph LLC
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
 * Local storage add-on.
 * @see http://www.w3.org/TR/webstorage/
 * @name storage
 * @namespace
 * @exports exports as storage
 */
b4w.module["storage"] = function(exports, require) {

var m_print = require("__print");

var _prefix = "";
var _storage = null;

/**
 * Initialize the application storage.
 * @method module:storage.init
 * @param {String} prefix Storage prefix
 */
exports.init = init;
function init(prefix) {
    _prefix = prefix;

    if (_storage) // storage was initialized previously
        return;

    try {
        _storage = window.localStorage;
        try {
            _storage["tmp"] = null;
            delete _storage["tmp"];
        } catch (e) {
            m_print.warn("localStorage quota is limited. Disabling localStorage");
            _storage = null;
        }
    } catch (e) {
        m_print.warn("Applying chrome localStorage bug workaround");
        _storage = null;
    }

    if (!_storage) {
        m_print.warn("localStorage is not available, initializing temporary storage");
        _storage = {};
    }
}

/**
 * Save the value in the local storage.
 * @param {String} key Key
 * @param {String} value Value
 */
exports.set = function(key, value) {
    var b4w_st = get_b4w_storage();
    b4w_st[key] = String(value);
    set_b4w_storage(b4w_st);
}

function get_b4w_storage() {

    if (_storage[_prefix])
        return JSON.parse(_storage[_prefix]);
    else
        return {};
}

function set_b4w_storage(b4w_storage) {
    _storage[_prefix] = JSON.stringify(b4w_storage);
}

/**
 * Perform local storage cleanup.
 */
exports.cleanup = function() {
    delete _storage[_prefix];
}

/**
 * Get the value from the local storage.
 * @param {String} key Key
 * @returns {String} Value
 */
exports.get = function(key) {
    var b4w_st = get_b4w_storage();
    if (b4w_st[key])
        return b4w_st[key];
    else
        return "";
}

exports.debug = function() {
    m_print.log(get_b4w_storage());
}

// NOTE: initialize with default prefix for compatibility reasons
init("b4w");

}
