"use strict";

/**
 * Local Storage add-on.
 * @name storage
 * @namespace
 * @exports exports as storage
 */
b4w.module["storage"] = function(exports, require) {

var m_print = require("__print");

/**
 * Save value in local storage.
 * @param {String} key Key
 * @param {String} value Value
 */
exports.set = function(key, value) {
    var b4w_st = get_b4w_storage();
    b4w_st[key] = String(value);
    set_b4w_storage(b4w_st);
}

function get_b4w_storage() {
    if (!localStorage)
        throw "Local storage is not supported";

    if (localStorage.b4w)
        return JSON.parse(localStorage.b4w);
    else
        return {};
}

function set_b4w_storage(b4w_storage) {
    if (!localStorage)
        throw "Local storage is not supported";

    localStorage.b4w = JSON.stringify(b4w_storage);
}

/**
 * Perform local storage cleanup.
 */
exports.cleanup = function() {
    if (!localStorage)
        throw "Local storage is not supported";

    delete localStorage.b4w;
}

/**
 * Get value from local storage.
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

}

if (window["b4w"])
    window["b4w"]["storage"] = b4w.require("storage");
else
    throw "Failed to register storage, load b4w first";

