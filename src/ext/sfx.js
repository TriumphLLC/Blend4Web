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
 * Sound effects API.
 * Uses Web Audio API for sound effects and HTML5 audio for background music.
 * @see https://www.blend4web.com/doc/en/audio.html
 * @module sfx
 * @cc_externs AudioContext webkitAudioContext MediaElementAudioSourceNode
 */
b4w.module["sfx"] = function(exports, require) {

var m_obj_util = require("__obj_util");
var m_scs      = require("__scenes");
var m_sfx      = require("__sfx");
var m_print    = require("__print");

/**
 * Play sound through the speaker.
 * @method module:sfx.play
 * @param {Object3D} obj Object 3D
 * @param {Number} [when=0] Delay after exec in seconds
 * @param {Number} [duration=0] Duration of the speaker's playback cycle (in
 * seconds). duration=0 - assign default value according to sound playback length.
 */
exports.play = function(obj, when, duration) {
    when = when || 0;
    duration = duration || 0;
    m_sfx.play(obj, when, duration);
}
/**
 * Play sound through the speaker using the default delay and duration params.
 * @method module:sfx.play_def
 * @param {Object3D} obj Object 3D
 */
exports.play_def = function(obj) {
    m_sfx.play_def(obj);
}

/**
 * Check if sound is played through the speaker now.
 * @method module:sfx.is_play
 * @param {Object3D} obj Object 3D
 * @returns {Boolean} Playing state
 * @deprecated Use {@link module:sfx.is_playing|sfx.is_playing} instead.
 */
exports.is_play = function(obj) {
    return m_sfx.is_playing(obj);
}

/**
 * Check if sound is played through the speaker now.
 * @method module:sfx.is_playing
 * @param {Object3D} obj Object 3D
 * @returns {Boolean} Playing state
 */
exports.is_playing = function(obj) {
    return m_sfx.is_playing(obj);
}

/**
 * Stop the speaker.
 * @method module:sfx.stop
 * @param {Object3D} obj Object 3D
 */
exports.stop = function(obj) {
    m_sfx.stop(obj);
}


/**
 * Pause the speaker.
 * @method module:sfx.pause
 * @param {Object3D} obj Object 3D
 */
exports.pause = function(obj) {
    m_sfx.speaker_pause(obj);
}

/**
 * Resume the paused speaker.
 * @method module:sfx.resume
 * @param {Object3D} obj Object 3D
 */
exports.resume = function(obj) {
    m_sfx.speaker_resume(obj);
}

/**
 * Stop the speaker's looping playback.
 * @method module:sfx.loop_stop
 * @param {Object3D} obj Speaker object
 * @param {Number} [when=0] Delay after exec in seconds
 * @param {Boolean} [wait=false] Wait loop until currently played cycle is
 * finished
 */
exports.loop_stop = function(obj, when, wait) {
    when = when || 0;
    wait = wait || false;
    m_sfx.loop_stop(obj, when, wait);
}


/**
 * Change the speaker playback rate value.
 * @method module:sfx.playrate
 * @param {Object3D} obj Object 3D
 * @param {Number} playrate Playback rate (1.0 - normal speed).
 */
exports.playrate = function(obj, playrate) {
    m_sfx.playrate(obj, playrate);
}

/**
 * Get the speaker playback rate value.
 * @method module:sfx.playrate
 * @param {Object3D} obj Object 3D
 * @returns {Number} Playback rate
 */
exports.get_playrate = function(obj) {
    return m_sfx.get_playrate(obj);
}

/**
 * Set cyclic flag.
 * @method module:sfx.cyclic
 * @param {Object3D} obj Speaker object.
 * @param {Boolean} cyclic New cyclic flag value.
 */
exports.cyclic = function(obj, cyclic) {
    m_sfx.cyclic(obj, cyclic);
}

/**
 * Check if the cyclic flag is set.
 * @method module:sfx.is_cyclic
 * @param {Object3D} obj Speaker object.
 * @returns {Boolean} Cyclic flag value.
 */
exports.is_cyclic = function(obj) {
    return m_sfx.is_cyclic(obj);
}

/**
 * Reset the listener speed.
 * Use before rapid listener movements to neutralize undesirable doppler effect.
 * @method module:sfx.listener_reset_speed
 * @param {Number} speed The listener new speed
 * @param {?Float32Array} [dir=null] The listener new direction
 * @deprecated Use {@link module:sfx.listener_stride|sfx.listener_stride} instead
 */
exports.listener_reset_speed = function(speed, dir) {
    m_sfx.listener_stride();
}

/**
 * Make a listener stride.
 * Use before quick listener movements to neutralize undesirable doppler effect.
 * @method module:sfx.listener_stride
 */
exports.listener_stride = function() {
    m_sfx.listener_stride();
}

/**
 * Reset the speaker speed.
 * It's necessary to nullify speed before the speaker has moved quickly in order
 * to neutralize the undesirable doppler effect.
 * @method module:sfx.speaker_reset_speed
 * @param {Object3D} obj Speaker object.
 * @param {Number} speed The speaker's new speed
 * @param {?Float32Array} [dir=null] The speaker's new direction
 * @deprecated Use {@link module:sfx.speaker_stride|sfx.speaker_stride} instead
 */
exports.speaker_reset_speed = function(obj, speed, dir) {
    m_sfx.speaker_stride(obj);
}

/**
 * Make a speaker stride.
 * Use before rapid speaker movements to neutralize undesirable doppler effect.
 * @method module:sfx.speaker_reset_speed
 * @param {Object3D} obj Speaker object.
 */
exports.speaker_stride = function(obj) {
    m_sfx.speaker_stride(obj);
}

/**
 * Get volume level.
 * @method module:sfx.get_volume
 * @param {?Object3D} obj Object 3D or null for MASTER volume
 * @returns {Number} Volume (0..1)
 */
exports.get_volume = function(obj) {
    if (obj && typeof obj === "object")
        return m_sfx.get_volume(obj);
    else
        return m_sfx.get_master_volume();
}
/**
 * Set volume level.
 * @method module:sfx.set_volume
 * @param {?Object3D} obj Object 3D or null for MASTER volume
 * @param {Number} volume Volume (0..1)
 */
exports.set_volume = function(obj, volume) {
    if (obj && typeof obj === "object")
        m_sfx.set_volume(obj, volume);
    else
        m_sfx.set_master_volume(volume);
}

/**
 * Mute/unmute.
 * @method module:sfx.mute
 * @param {?Object3D} obj Speaker object or null for all of them
 * @param {Boolean} muted New state
 */
exports.mute = function(obj, muted) {
    if (obj && typeof obj === "object")
        m_sfx.mute(obj, muted);
    else
        m_sfx.mute_master(muted);
}

/**
 * Check if the speaker is muted.
 * @method module:sfx.is_muted
 * @param {?Object3D} obj Speaker object or null for all of them.
 * @returns {Boolean} Muted state.
 */
exports.is_muted = function(obj) {
    if (obj && typeof obj === "object")
        return m_sfx.is_muted(obj);
    else
        return m_sfx.is_master_muted();
}

/**
 * Get the speaker objects which are used by the module.
 * @returns {Array} Speaker object array
 */
exports.get_speaker_objects = function() {
    return m_sfx.get_speaker_objects().slice(0);
}

/**
 * Check if there are some active speakers in use or not.
 * @method module:sfx.check_active_speakers
 * @returns {Boolean} Check result
 */
exports.check_active_speakers = m_sfx.check_active_speakers;

/**
 * Set compressor params.
 * @method module:sfx.set_compressor_params
 * @param {CompressorParams} params Params object
 * @cc_externs threshold knee ratio attack release
 */
exports.set_compressor_params = function(params) {
    m_sfx.set_compressor_params(m_scs.get_active(), params);
}
/**
 * Get compressor params.
 * @method module:sfx.get_compressor_params
 * @returns {CompressorParams} Params object
 */
exports.get_compressor_params = function() {
    return m_sfx.get_compressor_params(m_scs.get_active());
}

/**
 * Duck (reduce the volume).
 * works independently from the volume API and the volume randomization
 * @method module:sfx.duck
 * @param {?Object3D} obj Object 3D or null for MASTER
 * @param {Number} value Duck amount.
 * @param {Number} time Time to change volume.
 */
exports.duck = function(obj, value, time) {
    if (obj && typeof obj === "object")
        m_sfx.duck(obj, value, time);
    else
        m_sfx.duck_master(value, time);
}

/**
 * Unduck (restore the volume).
 * @method module:sfx.unduck
 * @param {?Object3D} obj Object 3D or null for MASTER
 */
exports.unduck = function(obj) {
    if (obj && typeof obj === "object")
        m_sfx.unduck(obj);
    else
        m_sfx.unduck_master();
}

/**
 * Apply the new playlist from the given set of speakers.
 * The new playlist starts playing immediately.
 * @method module:sfx.apply_playlist
 * @param {Object3D[]} objs Array of objects.
 * @param {Number} delay Number of seconds between tracks
 * @param {Boolean} random Randomize playback sequence
 */
exports.apply_playlist = m_sfx.apply_playlist;
/**
 * Stop playback and clear the playlist.
 * @method module:sfx.clear_playlist
 */
exports.clear_playlist = m_sfx.clear_playlist;

/**
 * Detect supported audio containter.
 * Containers have same meaning as file extension here, for each one possible
 * fallback exists:
 * <ul>
 * <li>ogg -> mp4
 * <li>mp3 -> ogg
 * <li>mp4 -> ogg
 * </ul>
 * @method module:sfx.detect_audio_container
 * @param {String} [hint="ogg"] Required container
 * @returns {String} Supported containter or ""
 */
exports.detect_audio_container = m_sfx.detect_audio_container;
/**
 * Detect supported video containter.
 * Containers have same meaning as file extension here, for each one possible
 * fallback exists:
 * <ul>
 * <li>ogv -> m4v
 * <li>m4v -> webm
 * <li>webm -> m4v
 * </ul>
 * @method module:sfx.detect_video_container
 * @param {String} [hint="webm"] Required container
 * @returns {String} Supported containter or ""
 */
exports.detect_video_container = m_sfx.detect_video_container;
/**
 * Set positional params.
 * @method module:sfx.set_positional_params
 * @param {Object3D} obj Object 3D
 * @param {PositionalParams} params Params object
 * @cc_externs dist_ref dist_max attenuation
 */
exports.set_positional_params = m_sfx.set_positional_params;
/**
 * Get positional params.
 * @method module:sfx.get_positional_params
 * @param {Object3D} obj Object 3D
 * @returns {PositionalParams} Params object
 */
exports.get_positional_params = m_sfx.get_positional_params;

/**
 * Set filter params.
 * @method module:sfx.set_filter_params
 * @param {Object3D} obj Object 3D
 * @param {FilterParams} params Params object
 * @cc_externs freq Q gain
 */
exports.set_filter_params = m_sfx.set_filter_params;
/**
 * Get filter params.
 * @method module:sfx.get_filter_params
 * @param {Object3D} obj Object 3D
 * @returns {FilterParams} Params object
 */
exports.get_filter_params = m_sfx.get_filter_params;

/**
 * Get filter frequency response.
 * @method module:sfx.get_filter_freq_response
 * @param {Object3D} obj Object 3D
 * @param {Float32Array} freq_arr Input array with frequencies.
 * @param {Float32Array} mag_arr Ouput array with filter response magnitudes.
 * @param {Float32Array} phase_arr Output array with filter response phases.
 */
exports.get_filter_freq_response = m_sfx.get_filter_freq_response;

/**
 * Get duration of the speaker's playback cycle.
 * Zero duration means looped or non-ready speaker
 * @method module:sfx.get_volume
 * @param {?Object3D} obj Speaker object.
 * @returns {Number} Duration
 */
exports.get_duration = function(obj) {
    if (!obj || !m_obj_util.is_speaker(obj)) {
        m_print.error("Object \"" + (obj ? obj.name : undefined) +
                      "\" is not a valid speaker");
        return;
    }
    return m_sfx.get_duration(obj);
}

}

