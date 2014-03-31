"use strict";

if (typeof module == "object" && module.exports) GLOBAL.b4w = {module : {}};

b4w.module["__version"] = function(exports, require) {

var VERSION = "";
var TYPE = "DEBUG";
var DATE = "";

exports.version = function() {
    return VERSION;
}
exports.type = function() {
    return TYPE;
}
/**
 * Return build date or current date for DEBUG version
 */
exports.date = date;

function date() {
    if (TYPE == "DEBUG") {
        var d = new Date();

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
    } else
        return DATE;
}

exports.timestamp = function() {

    var ts = date();
    // remove special symbols
    ts = ts.split(" ").join("").split(":").join("").split(".").join("");
    ts = "?t=" + ts;
    return ts;
}

}

if (typeof module == "object" && module.exports) b4w.module["__version"](exports);
