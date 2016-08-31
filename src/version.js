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

if (typeof module == "object" && module.exports) GLOBAL.b4w = {module : {}};

b4w.module["__version"] = function(exports, require) {

var TYPE = "DEBUG";
var DATE = null;
var VERSION = null;

exports.version = version;
function version() {
    if (TYPE == "DEBUG") {
        var d = date();
        return [parseInt(String(d.getFullYear()).slice(-2)), d.getMonth() + 1];
    } else
        return VERSION;
}

exports.version_str = function() {
    var str = "";
    var ver = version();

    for (var i = 0; i < ver.length; i++) {
        if (i == 1)
            str += ver[i] < 10 ? "0" + ver[i] : ver[i];
        else
            str += ver[i];
        if (i != ver.length - 1)
            str += ".";
    }

    return str;
}

exports.type = function() {
    return TYPE;
}

/**
 * Return build date or current date for DEBUG version
 */
exports.date = date;
function date() {
    if (TYPE == "DEBUG")
        return new Date();
    else
        return DATE;
}

/**
 * Return build date or current date for DEBUG version represented as a string.
 */
exports.date_str = date_str;
function date_str() {
    var d = date();

    var day = d.getDate();
    day = day < 10 ? "0" + String(day) : String(day);

    var month = d.getMonth() + 1;
    month = month < 10 ? "0" + String(month) : String(month);

    var year = String(d.getFullYear());

    var hour = d.getHours();
    hour = hour < 10 ? "0" + String(hour) : String(hour);

    var minute = d.getMinutes();
    minute = minute < 10 ? "0" + String(minute) : String(minute);

    var second = d.getSeconds();
    second = second < 10 ? "0" + String(second) : String(second);

    // UNIX date +%d.%m.%Y\ %H:%M:%S    
    var date_str = day + "." + month + "." + year + " " + hour + ":" + 
        minute + ":" + second;
    return date_str;
}

exports.timestamp = function() {

    var ts = date_str();
    // remove special symbols
    ts = ts.split(" ").join("").split(":").join("").split(".").join("");
    ts = "?t=" + ts;
    return ts;
}

}

if (typeof module == "object" && module.exports) b4w.module["__version"](exports);
