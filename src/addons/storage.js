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
 * Local storage add-on.
 * @see http://www.w3.org/TR/webstorage/
 * @name storage
 * @namespace
 * @exports exports as storage
 */
b4w.module["storage"] = function(exports, require) {

var m_print = require("__print");

var _prefix = "b4w";
var _storage = null;

/**
 * Initialize the application storage.
 * @method module:storage.init
 * @param {String} prefix Storage prefix
 */
exports.init = init;
function init(prefix) {
    if (prefix)
        if (prefix !== "b4w")
            _prefix = prefix;
        else
            m_print.error("b4w prefix denied");
    else
        m_print.warn("Prefix should be a string. " +
                "Last declared storage prefix will be used.");
}

function init_storage() {
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
 * @param {?String} prefix Storage prefix.
 */
exports.set = function(key, value, prefix) {
    var b4w_st = get_b4w_storage(prefix);
    b4w_st[key] = String(value);
    set_b4w_storage(b4w_st, prefix);
}

function get_b4w_storage(prefix) {
    if (_storage[prefix? prefix: _prefix])
        return JSON.parse(_storage[prefix? prefix: _prefix]);
    else
        return {};
}

function set_b4w_storage(b4w_storage, prefix) {
    _storage[prefix? prefix: _prefix] = JSON.stringify(b4w_storage);
}

/**
 * Perform local storage cleanup.
 * @param {?String} prefix Storage prefix.
 */
exports.cleanup = function(prefix) {
    delete _storage[prefix? prefix: _prefix];
}

/**
 * Get the value from the local storage.
 * @param {String} key Key
 * @param {?String} prefix Storage prefix.
 * @returns {String} Value
 */
exports.get = function(key, prefix) {
    var b4w_st = get_b4w_storage(prefix);
    if (b4w_st[key])
        return b4w_st[key];
    else
        return "";
}

/**
 * Print the local storage.
 * @param {?String} prefix Storage prefix.
 */
exports.debug = function(prefix) {
    m_print.log(get_b4w_storage(prefix? prefix: _prefix));
}

// NOTE: initialize with default prefix for compatibility reasons
init_storage();

}
