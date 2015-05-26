"use strict";

/** 
 * Sound effects API.
 * Uses Web Audio API for sound effects and HTML5 audio for background music.
 * @module sfx
 * @cc_externs AudioContext webkitAudioContext MediaElementAudioSourceNode
 */
b4w.module["sfx"] = function(exports, require) {

var m_scs = require("__scenes");
var m_sfx = require("__sfx");
var m_print = require("__print");

/**
 * Play sound through the speaker.
 * @method module:sfx.play
 * @param {Object} obj Object ID
 * @param {Number} [when=0] Delay after exec in seconds
 * @param {Number} [duration=0] Duration of the speaker's playback cycle (in
 * seconds). duration=0 - assign default value according to sound playback length.
 */
exports.play = function(obj, when, duration) {
    m_sfx.play(obj, when, duration);
}
/**
 * Play sound through the speaker using the default delay and duration params.
 * @method module:sfx.play_def
 * @param {Object} obj Object ID
 */
exports.play_def = function(obj) {
    m_sfx.play_def(obj);
}

/**
 * Check if sound is played through the speaker now.
 * @method module:sfx.is_play
 * @param {Object} obj Object ID
 * @returs {Boolean} Playing state
 */
exports.is_play = function(obj) {
    return m_sfx.is_play(obj);
}

/**
 * Play sound through the speaker.
 * <p>cyclic = true - loop forever, ignore required duration</p>
 *
 * <p>cyclic = false - use duration param:</p>
 * <ul>
 * <li> required duration >= sample duration: 
 *      expand sample by looping
 *
 * <li> required duration < sample duration: 
 *      allow to play whole sample duration (do not trim)
 * </ul>
 * @method module:sfx.speaker_play
 * @param {Object} obj Object ID
 * @param {Boolean} cyclic
 * @param {Number} [duration=0] Duration in float seconds
 * @param {Number} [playrate=1] Playback rate
 * @deprecated Use play() or play_def() instead
 */
exports.speaker_play = function(obj, cyclic, duration, playrate) {
    m_print.error("speaker_play() deprecated, use play() or play_def() instead");
    m_sfx.cyclic(obj, cyclic);
    if (playrate)
        m_sfx.playrate(obj, playrate);
    m_sfx.play(obj, 0, duration);
}

/**
 * Stop the speaker.
 * @method module:sfx.speaker_stop
 * @param {Object} obj Object ID
 * @deprecated Use stop() instead
 */
exports.speaker_stop = function(obj) {
    m_print.error("speaker_stop() deprecated, use stop() instead");
    m_sfx.stop(obj);
}

/**
 * Stop the speaker.
 * @method module:sfx.stop
 * @param {Object} obj Object ID
 */
exports.stop = function(obj) {
    m_sfx.stop(obj);
}

/**
 * Pause the speaker.
 * @method module:sfx.pause
 * @param {Object} obj Object ID
 */
exports.pause = function(obj) {
    m_sfx.speaker_pause(obj);
}

/**
 * Resume the paused speaker.
 * @method module:sfx.resume
 * @param {Object} obj Object ID
 */
exports.resume = function(obj) {
    m_sfx.speaker_resume(obj);
}

/**
 * Change the speaker playback rate value
 * @method module:sfx.speaker_playback_rate
 * @deprecated Use playrate() instead
 */
exports.speaker_playback_rate = function(obj, playrate) {
    m_print.error("speaker_playback_rate() deprecated, use playrate() instead");
    m_sfx.playrate(obj, playrate);
}
/**
 * Change the speaker playback rate value.
 * @method module:sfx.playrate
 * @param {Object} obj Object ID
 * @param {Number} playrate Playback rate (1.0 - normal speed).
 */
exports.playrate = function(obj, playrate) {
    m_sfx.playrate(obj, playrate);
}

/**
 * Get the speaker playback rate value.
 * @method module:sfx.playrate
 * @param {Object} obj Object ID
 * @returns {Number} Playback rate
 */
exports.get_playrate = function(obj) {
    return m_sfx.get_playrate(obj);
}

/**
 * Set cyclic flag.
 * @method module:sfx.cyclic
 * @param {Object} obj Speaker object ID
 * @param {Boolean} cyclic New cyclic flag value.
 */
exports.cyclic = function(obj, cyclic) {
    m_sfx.cyclic(obj, cyclic);
}

/**
 * Check if the cyclic flag is set.
 * @method module:sfx.is_cyclic
 * @param {Object} obj Speaker object ID
 * @returns {Boolean} Cyclic flag value.
 */
exports.is_cyclic = function(obj) {
    return m_sfx.is_cyclic(obj);
}

/**
 * Reset the listener speed.
 * Use after quick listener movements to neutralize undesirable doppler effect.
 * @method module:sfx.listener_reset_speed
 * @param {Number} speed The listener new speed
 * @param {?Float32Array} [dir=null] The listener new direction
 */
exports.listener_reset_speed = function(speed, dir) {
    m_sfx.listener_reset_speed(speed, dir);
}

/**
 * Reset the speaker speed.
 * It's necessary to nullify speed after the speaker has moved quickly in order
 * to neutralize the undesirable doppler effect.
 * @method module:sfx.speaker_reset_speed
 * @param {Object} obj Speaker object ID
 * @param {Number} speed The speaker's new speed
 * @param {?Float32Array} [dir=null] The speaker's new direction
 */
exports.speaker_reset_speed = function(obj, speed, dir) {
    m_sfx.speaker_reset_speed(obj, speed, dir);
}

/**
 * Get volume level.
 * @method module:sfx.get_volume
 * @param {?Object} obj Object ID or null for MASTER volume
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
 * @param {?Object} obj Object ID or null for MASTER volume
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
 * @param {?Object} obj Speaker object ID or null for all of them
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
 * @param {?Object} obj Speaker object ID or null for all of them.
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
 * @method module:sfx.get_speakers
 * @deprecated Use get_speaker_objects() instead
 */
exports.get_speakers = function() {
    m_print.error("get_speakers() deprecated, use get_speaker_objects() instead");
    return exports.get_speaker_objects();
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
 * @param {Object} params Params object
 * @cc_externs threshold knee ratio attack release
 */
exports.set_compressor_params = function(params) {
    m_sfx.set_compressor_params(m_scs.get_active(), params);
}
/**
 * Get compressor params.
 * @method module:sfx.get_compressor_params
 * @returns {Object} Params object
 */
exports.get_compressor_params = function() {
    return m_sfx.get_compressor_params(m_scs.get_active());
}

/**
 * Duck (reduce the volume).
 * works independently from the volume API and the volume randomization
 * @method module:sfx.duck
 * @param {?Object} obj Object ID or null for MASTER
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
 * @param {?Object} obj Object ID or null for MASTER
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
 * @param {Array} objs Array of object IDs
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
 * @param {Object} obj Object ID
 * @param {Object} params Params object
 * @cc_externs dist_ref dist_max attenuation
 */
exports.set_positional_params = m_sfx.set_positional_params;
/**
 * Get positional params.
 * @method module:sfx.get_positional_params
 * @param {Object} obj Object ID
 * @returns {Object} Params object
 */
exports.get_positional_params = m_sfx.get_positional_params;

/**
 * Set filter params.
 * @method module:sfx.set_filter_params
 * @param {Object} obj Object ID
 * @param {Object} params Params object
 * @cc_externs freq Q gain
 */
exports.set_filter_params = m_sfx.set_filter_params;
/**
 * Get filter params.
 * @method module:sfx.get_filter_params
 * @param {Object} obj Object ID
 * @returns {Object} Params object
 */
exports.get_filter_params = m_sfx.get_filter_params;

/**
 * Get filter frequency response.
 * @method module:sfx.get_filter_freq_response
 * @param {Object} obj Object ID
 * @param {Float32Array} freq_arr Input array with frequencies.
 * @param {Float32Array} mag_arr Ouput array with filter response magnitudes.
 * @param {Float32Array} phase_arr Output array with filter response phases.
 */
exports.get_filter_freq_response = m_sfx.get_filter_freq_response;

/**
 * Get duration of the speaker's playback cycle.
 * Zero duration means looped or non-ready speaker
 * @method module:sfx.get_volume
 * @param {?Object} obj Speaker object ID
 * @returns {Number} Duration
 */
exports.get_duration = function(obj) {
    if (!obj || !m_sfx.is_speaker(obj)) {
        m_print.error("Object \"" + (obj ? obj["name"]:undefined) +
                      "\" is not a valid speaker");
        return;
    }
    return m_sfx.get_duration(obj);
}

}

