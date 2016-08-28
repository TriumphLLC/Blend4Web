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

var EASEING_IN_QUAD         = 1;
var EASEING_OUT_QUAD        = 2;
var EASEING_IN_OUT_QUAD     = 3;
var EASEING_IN_CUBIC        = 4;
var EASEING_OUT_CUBIC       = 5;
var EASEING_IN_OUT_CUBIC    = 6;
var EASEING_IN_QUART        = 7;
var EASEING_OUT_QUART       = 8;
var EASEING_IN_OUT_QUART    = 9;
var EASEING_IN_QUINT        = 10;
var EASEING_OUT_QUINT       = 11;
var EASEING_IN_OUT_QUINT    = 12;
var EASEING_IN_SINE         = 13;
var EASEING_OUT_SINE        = 14;
var EASEING_IN_OUT_SINE     = 15;
var EASEING_IN_EXPO         = 16;
var EASEING_OUT_EXPO        = 17;
var EASEING_IN_OUT_EXPO     = 18;
var EASEING_IN_CIRC         = 19;
var EASEING_OUT_CIRC        = 20;
var EASEING_IN_OUT_CIRC     = 21;
var EASEING_IN_ELASIC       = 22;
var EASEING_OUT_ELASTIC     = 23;
var EASEING_IN_OUT_ELASTIC  = 24;
var EASEING_IN_BACK         = 25;
var EASEING_OUT_BACK        = 26;
var EASEING_IN_OUT_BACK     = 27;
var EASEING_IN_BOUNCE       = 28;
var EASEING_OUT_BOUNCE      = 29;
var EASEING_IN_OUT_BOUNCE   = 30;

exports.EASEING_IN_QUAD         = EASEING_IN_QUAD;
exports.EASEING_OUT_QUAD        = EASEING_OUT_QUAD;
exports.EASEING_IN_OUT_QUAD     = EASEING_IN_OUT_QUAD;
exports.EASEING_IN_CUBIC        = EASEING_IN_CUBIC;
exports.EASEING_OUT_CUBIC       = EASEING_OUT_CUBIC;
exports.EASEING_IN_OUT_CUBIC    = EASEING_IN_OUT_CUBIC;
exports.EASEING_IN_QUART        = EASEING_IN_QUART;
exports.EASEING_OUT_QUART       = EASEING_OUT_QUART;
exports.EASEING_IN_OUT_QUART    = EASEING_IN_OUT_QUART;
exports.EASEING_IN_QUINT        = EASEING_IN_QUINT;
exports.EASEING_OUT_QUINT       = EASEING_OUT_QUINT;
exports.EASEING_IN_OUT_QUINT    = EASEING_IN_OUT_QUINT;
exports.EASEING_IN_SINE         = EASEING_IN_SINE;
exports.EASEING_OUT_SINE        = EASEING_OUT_SINE;
exports.EASEING_IN_OUT_SINE     = EASEING_IN_OUT_SINE;
exports.EASEING_IN_EXPO         = EASEING_IN_EXPO;
exports.EASEING_OUT_EXPO        = EASEING_OUT_EXPO;
exports.EASEING_IN_OUT_EXPO     = EASEING_IN_OUT_EXPO;
exports.EASEING_IN_CIRC         = EASEING_IN_CIRC;
exports.EASEING_OUT_CIRC        = EASEING_OUT_CIRC;
exports.EASEING_IN_OUT_CIRC     = EASEING_IN_OUT_CIRC;
exports.EASEING_IN_ELASIC       = EASEING_IN_ELASIC;
exports.EASEING_OUT_ELASTIC     = EASEING_OUT_ELASTIC;
exports.EASEING_IN_OUT_ELASTIC  = EASEING_IN_OUT_ELASTIC;
exports.EASEING_IN_BACK         = EASEING_IN_BACK;
exports.EASEING_OUT_BACK        = EASEING_OUT_BACK;
exports.EASEING_IN_OUT_BACK     = EASEING_IN_OUT_BACK;
exports.EASEING_IN_BOUNCE       = EASEING_IN_BOUNCE;
exports.EASEING_OUT_BOUNCE      = EASEING_OUT_BOUNCE;
exports.EASEING_IN_OUT_BOUNCE   = EASEING_IN_OUT_BOUNCE;


// engine's global timeline (time since initialization)
var _timeline = 0;

var _timeline_epoch = 0;

var _timeouts = [];
var _timeout_counter = 0;
var _animator_counter = 0;

var _animators = [];

var _framerate = -1;

var _easing_animations = {
    // t: current time, b: begInnIng value, c: change In value, d: duration

    [EASEING_IN_QUAD]: function (t, b, c, d) {
        return c*(t/=d)*t + b;
    },
    [EASEING_OUT_QUAD]: function (t, b, c, d) {
        return -c *(t/=d)*(t-2) + b;
    },
    [EASEING_IN_OUT_QUAD]: function (t, b, c, d) {
        if ((t/=d/2) < 1) return c/2*t*t + b;
        return -c/2 * ((--t)*(t-2) - 1) + b;
    },
    [EASEING_IN_CUBIC]: function (t, b, c, d) {
        return c*(t/=d)*t*t + b;
    },
    [EASEING_OUT_CUBIC]: function (t, b, c, d) {
        return c*((t=t/d-1)*t*t + 1) + b;
    },
    [EASEING_IN_OUT_CUBIC]: function (t, b, c, d) {
        if ((t/=d/2) < 1) return c/2*t*t*t + b;
        return c/2*((t-=2)*t*t + 2) + b;
    },
    [EASEING_IN_QUART]: function (t, b, c, d) {
        return c*(t/=d)*t*t*t + b;
    },
    [EASEING_OUT_QUART]: function (t, b, c, d) {
        return -c * ((t=t/d-1)*t*t*t - 1) + b;
    },
    [EASEING_IN_OUT_QUART]: function (t, b, c, d) {
        if ((t/=d/2) < 1) return c/2*t*t*t*t + b;
        return -c/2 * ((t-=2)*t*t*t - 2) + b;
    },
    [EASEING_IN_QUINT]: function (t, b, c, d) {
        return c*(t/=d)*t*t*t*t + b;
    },
    [EASEING_OUT_QUINT]: function (t, b, c, d) {
        return c*((t=t/d-1)*t*t*t*t + 1) + b;
    },
    [EASEING_IN_OUT_QUINT]: function (t, b, c, d) {
        if ((t/=d/2) < 1) return c/2*t*t*t*t*t + b;
        return c/2*((t-=2)*t*t*t*t + 2) + b;
    },
    [EASEING_IN_SINE]: function (t, b, c, d) {
        return -c * Math.cos(t/d * (Math.PI/2)) + c + b;
    },
    [EASEING_OUT_SINE]: function (t, b, c, d) {
        return c * Math.sin(t/d * (Math.PI/2)) + b;
    },
    [EASEING_IN_OUT_SINE]: function (t, b, c, d) {
        return -c/2 * (Math.cos(Math.PI*t/d) - 1) + b;
    },
    [EASEING_IN_EXPO]: function (t, b, c, d) {
        return (t==0) ? b : c * Math.pow(2, 10 * (t/d - 1)) + b;
    },
    [EASEING_OUT_EXPO]: function (t, b, c, d) {
        return (t==d) ? b+c : c * (-Math.pow(2, -10 * t/d) + 1) + b;
    },
    [EASEING_IN_OUT_EXPO]: function (t, b, c, d) {
        if (t==0) return b;
        if (t==d) return b+c;
        if ((t/=d/2) < 1) return c/2 * Math.pow(2, 10 * (t - 1)) + b;
        return c/2 * (-Math.pow(2, -10 * --t) + 2) + b;
    },
    [EASEING_IN_CIRC]: function (t, b, c, d) {
        return -c * (Math.sqrt(1 - (t/=d)*t) - 1) + b;
    },
    [EASEING_OUT_CIRC]: function (t, b, c, d) {
        return c * Math.sqrt(1 - (t=t/d-1)*t) + b;
    },
    [EASEING_IN_OUT_CIRC]: function (t, b, c, d) {
        if ((t/=d/2) < 1) return -c/2 * (Math.sqrt(1 - t*t) - 1) + b;
        return c/2 * (Math.sqrt(1 - (t-=2)*t) + 1) + b;
    },
    [EASEING_IN_ELASIC]: function (t, b, c, d) {

        var s=1.70158;var p=0;var a=c;
        if (t==0) return b;  if ((t/=d)==1) return b+c;  if (!p) p=d*.3;
        if (a < Math.abs(c)) { a=c; var s=p/4; }
        else var s = p/(2*Math.PI) * Math.asin (c/a);
        return -(a*Math.pow(2,10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )) + b;
    },
    [EASEING_OUT_ELASTIC]: function (t, b, c, d) {
        var s=1.70158;var p=0;var a=c;
        if (t==0) return b;  if ((t/=d)==1) return b+c;  if (!p) p=d*.3;
        if (a < Math.abs(c)) { a=c; var s=p/4; }
        else var s = p/(2*Math.PI) * Math.asin (c/a);
        return a*Math.pow(2,-10*t) * Math.sin( (t*d-s)*(2*Math.PI)/p ) + c + b;
    },
    [EASEING_IN_OUT_ELASTIC]: function (t, b, c, d) {
        var s=1.70158;var p=0;var a=c;
        if (t==0) return b;  if ((t/=d/2)==2) return b+c;  if (!p) p=d*(.3*1.5);
        if (a < Math.abs(c)) { a=c; var s=p/4; }
        else var s = p/(2*Math.PI) * Math.asin (c/a);
        if (t < 1) return -.5*(a*Math.pow(2,10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )) + b;
        return a*Math.pow(2,-10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )*.5 + c + b;
    },
    [EASEING_IN_BACK]: function (t, b, c, d, s) {
        if (s == undefined) s = 1.70158;
        return c*(t/=d)*t*((s+1)*t - s) + b;
    },
    [EASEING_OUT_BACK]: function (t, b, c, d, s) {
        if (s == undefined) s = 1.70158;
        return c*((t=t/d-1)*t*((s+1)*t + s) + 1) + b;
    },
    [EASEING_IN_OUT_BACK]: function (t, b, c, d, s) {
        if (s == undefined) s = 1.70158; 
        if ((t/=d/2) < 1) return c/2*(t*t*(((s*=(1.525))+1)*t - s)) + b;
        return c/2*((t-=2)*t*(((s*=(1.525))+1)*t + s) + 2) + b;
    },
    [EASEING_IN_BOUNCE]: function (t, b, c, d) {
        return c - this[EASEING_OUT_BOUNCE] (d-t, 0, c, d) + b;
    },
    [EASEING_OUT_BOUNCE]: function (t, b, c, d) {
        if ((t/=d) < (1/2.75)) {
            return c*(7.5625*t*t) + b;
        } else if (t < (2/2.75)) {
            return c*(7.5625*(t-=(1.5/2.75))*t + .75) + b;
        } else if (t < (2.5/2.75)) {
            return c*(7.5625*(t-=(2.25/2.75))*t + .9375) + b;
        } else {
            return c*(7.5625*(t-=(2.625/2.75))*t + .984375) + b;
        }
    },
    [EASEING_IN_OUT_BOUNCE]: function (t, b, c, d) {
        if (t < d/2) return this[EASEING_IN_BOUNCE] (t*2, 0, c, d) * .5 + b;
        return this[EASEING_OUT_BOUNCE] (t*2-d, 0, c, d) * .5 + c*.5 + b;
    }
}

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

        if(animator.easing){
            value = animator.from + _easing_animations[animator.easing](time_amount, 0, 1, 1) * (animator.to - animator.from);
        }
        else{
            var value = animator.from + time_amount * (animator.to - animator.from);
        }
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

exports.animate = function(from, to, timeout, anim_cb, easing) {

    var duration = timeout / 1000;
    var id = get_animation_id();

    var animator = {
        id: id,
        callback: anim_cb,
        from: from,
        to: to,
        expire_time: _timeline + duration,
        duration: duration,
        easing: easing
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
