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
 * Time internal API.
 * @name time
 * @namespace
 * @exports exports as time
 */
b4w.module["__time"] = function(exports, require) {

var m_cfg   = require("__config");
var m_print = require("__print");

// engine's global timeline (time since initialization)
var _timeline = 0;

var _timeline_epoch = 0;

var _timeouts = [];
var _timeout_counter = 0;
var _animator_counter = 0;

var _animators = [];

var _framerate = -1;

exports.set_timeline = function(timeline) {
    _timeline = timeline;                   // s
    _timeline_epoch = performance.now();    // ms

    for (var i = 0; i < _timeouts.length; i++) {
        var timeout = _timeouts[i];

        if (_timeline > timeout.expire_time) {
            // removing first to prevent race conditions in callback
            _timeouts.splice(i, 1);
            i--;
            timeout.callback();
        }
    }

    for (var i = 0; i < _animators.length; i++) {
        var animator = _animators[i];

        var time_amount = 1 - (animator.expire_time - _timeline) / animator.duration;
        time_amount = Math.min(time_amount, 1);

        var value = animator.from + time_amount * (animator.to - animator.from);
        animator.callback(value);

        if (time_amount == 1) {
            _animators.splice(i, 1);
            i--;
        }
    }
}

exports.get_timeline = get_timeline;
function get_timeline() {
    return _timeline;
}

function get_timeout_id() {
    _timeout_counter++;
    return _timeout_counter;
}

function get_animation_id() {
    _animator_counter++;
    return _animator_counter;
}

/**
 * Same behavior as window.setTimeout()
 */
exports.set_timeout = function(callback, time) {
    var id = get_timeout_id();

    var timeout = {
        id: id,
        callback: callback,
        expire_time: _timeline + ((performance.now() - _timeline_epoch) + time) / 1000
    }

    _timeouts.push(timeout);

    return id;
}

/**
 * Same behavior as window.clearTimeout()
 */
exports.clear_timeout = function(id) {
    for (var i = 0; i < _timeouts.length; i++) {
        var timeout = _timeouts[i];

        if (timeout.id == id) {
            _timeouts.splice(i, 1);
            break;
        }
    }
}

exports.clear_animation = function(id) {
    for (var i = _animators.length; i--;) {
        var animator = _animators[i];

        if (animator.id == id) {
            _animators.splice(i, 1);
            break;
        }
    }
}

exports.animate = function(from, to, timeout, anim_cb) {

    var duration = timeout / 1000;
    var id = get_animation_id();

    var animator = {
        id: id,
        callback: anim_cb,
        from: from,
        to: to,
        expire_time: _timeline + duration,
        duration: duration
    }

    _animators.push(animator);

    anim_cb(from);

    return id;
}

exports.reset = function(id) {
    _timeline = 0;
    _timeline_epoch = 0;

    _timeouts.length = 0;
    _animators.length = 0;
    _timeout_counter = 0;
    _animator_counter = 0;
}

exports.get_framerate = get_framerate;
function get_framerate() {
    if (m_cfg.animation.framerate !== -1)
        return m_cfg.animation.framerate;
    else
        return _framerate;
}

exports.set_framerate = function(value) {
    _framerate = value;
}

exports.get_frame = function(timeline) {
    return timeline*get_framerate();
}

}
