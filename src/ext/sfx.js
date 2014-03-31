"use strict";

/** 
 * Sound effects API.
 * Uses Web Audio API for sound effects and HTML5 audio for background music.
 * @module sfx
 */
b4w.module["sfx"] = function(exports, require) {

var m_scenes = require("__scenes");
var sfx      = require("__sfx");

/**
 * Play speaker.
 * @method module:sfx.play
 * @param obj Object ID
 * @param {Number} [when=0] Delay after exec in seconds
 * @param {Number} [duration=0] Duration in seconds.
 */
exports["play"] = function(obj, when, duration) {
    sfx.play(obj, when, duration);
}
/**
 * Play speaker using default params.
 * @method module:sfx.play_def
 * @param obj Object ID
 */
exports["play_def"] = function(obj) {
    sfx.play_def(obj);
}

/**
 * Check if speaker is playing now.
 * @method module:sfx.is_play
 * @param obj Object ID
 * @returs {Boolean} Playing state
 */
exports["is_play"] = function(obj) {
    return sfx.is_play(obj);
}

/**
 * Play speaker.
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
 * @param obj Object ID
 * @param {Boolean} cyclic
 * @param {Number} [duration=0] Duration in float seconds
 * @param {Number} [playrate=1] Playback rate
 * @deprecated Use play() or play_def()
 */
exports["speaker_play"] = function(obj, cyclic, duration, playrate) {
    sfx.cyclic(obj, cyclic);
    if (playrate)
        sfx.playrate(obj, playrate);
    sfx.play(obj, 0, duration);
}

/**
 * Stop speaker
 * @method module:sfx.speaker_stop
 * @param obj Object ID
 * @deprecated Use stop()
 */
exports["speaker_stop"] = function(obj) {
    sfx.stop(obj);
}

/**
 * Stop speaker.
 * @method module:sfx.stop
 * @param obj Object ID
 */
exports["stop"] = function(obj) {
    sfx.stop(obj);
}

/**
 * Change speaker playback rate value
 * @method module:sfx.speaker_playback_rate
 * @deprecated Use playrate()
 */
exports["speaker_playback_rate"] = function(obj, playrate) {
    sfx.playrate(obj, playrate);
}
/**
 * Change speaker playback rate value
 * @method module:sfx.playrate
 * @param obj Object ID
 * @param playrate Playback rate (1.0 - normal speed).
 */
exports["playrate"] = function(obj, playrate) {
    sfx.playrate(obj, playrate);
}

/**
 * Set cyclic flag.
 * @method module:sfx.cyclic
 * @param obj Speaker object ID
 * @param {Boolean} cyclic New cyclic flag value.
 */
exports["cyclic"] = function(obj, cyclic) {
    sfx.cyclic(obj, cyclic);
}
/**
 * Set cyclic flag.
 * @method module:sfx.is_cyclic
 * @param obj Speaker object ID
 * @returns {Boolean} Cyclic flag value.
 */
exports["is_cyclic"] = function(obj) {
    return sfx.is_cyclic(obj);
}

/**
 * Reset listener speed.
 * Use after quick listener movements to neutralize undesirable doppler effect.
 * @method module:sfx.listener_reset_speed
 */
exports["listener_reset_speed"] = function() {
    sfx.listener_reset_speed();
}

/**
 * Reset speaker speed.
 * Use after quick speaker movements to neutralize undesirable doppler effect.
 * @method module:sfx.speaker_reset_speed
 * @param obj Speaker object ID
 */
exports["speaker_reset_speed"] = function(obj) {
    sfx.speaker_reset_speed(obj);
}

/**
 * Get volume level.
 * @method module:sfx.get_volume
 * @param obj Object ID or null for MASTER volume
 * @returns {Number} Volume (0..1)
 */
exports["get_volume"] = function(obj) {
    if (obj && typeof obj === "object")
        return sfx.get_volume(obj);
    else
        return sfx.get_master_volume();
}
/**
 * Set volume level.
 * @method module:sfx.set_volume
 * @param obj Object ID or null for MASTER volume
 * @param {Number} volume Volume (0..1)
 */
exports["set_volume"] = function(obj, volume) {
    if (obj && typeof obj === "object")
        sfx.set_volume(obj, volume);
    else
        sfx.set_master_volume(volume);
}

/**
 * Mute/unmute.
 * @method module:sfx.mute
 * @param obj Speaker object ID or null for all of them
 * @param {Boolean} muted New state
 */
exports["mute"] = function(obj, muted) {
    if (obj && typeof obj === "object")
        sfx.mute(obj, muted);
    else
        sfx.mute_master(muted);
}

/**
 * Check if speaker is muted
 * @method module:sfx.is_muted
 * @param obj Speaker object ID or null for all of them.
 * @returns {Boolean} Muted state.
 */
exports["is_muted"] = function(obj) {
    if (obj && typeof obj === "object")
        return sfx.is_muted(obj);
    else
        return sfx.is_master_muted();
}

/**
 * Get speaker objects used by module.
 * @returns {Array} Speaker object array
 */
exports["get_speaker_objects"] = function() {
    return sfx.get_speaker_objects().slice(0);
}

/**
 * @method module:sfx.get_speakers
 * @deprecated Use get_speaker_objects()
 */
exports["get_speakers"] = function() {
    return exports["get_speaker_objects"]();
}

/**
 * Set compressor params.
 * @method module:sfx.set_compressor_params
 */
exports["set_compressor_params"] = function(params) {
    sfx.set_compressor_params(m_scenes.get_active(), params);
}
/**
 * Get compressor params.
 * @method module:sfx.get_compressor_params
 */
exports["get_compressor_params"] = function() {
    return sfx.get_compressor_params(m_scenes.get_active());
}

/**
 * Duck (reduce the volume).
 * works independently from volume API and volume randomization
 * @method module:sfx.duck
 * @param obj Object ID
 * @param {Number} value Duck amount.
 * @param {Number} time Time to change volume.
 */
exports["duck"] = function(obj, value, time) {
    if (obj && typeof obj === "object")
        sfx.duck(obj, value, time);
    else
        sfx.duck_master(value, time);
}

/**
 * Unduck (restore the volume).
 * @method module:sfx.unduck
 * @param obj Object ID
 */
exports["unduck"] = function(obj) {
    if (obj && typeof obj === "object")
        sfx.unduck(obj);
    else
        sfx.unduck_master();
}

/**
 * Apply new playlist from given set of speakers.
 * The new playlist starts play immediately.
 * @method module:sfx.apply_playlist
 * @param {Array} objs Array of object IDs
 * @param {Number} delay Number of seconds between tracks
 * @param {Boolean} random Randomize playback sequence
 */
exports["apply_playlist"] = sfx.apply_playlist;
/**
 * Stop playback and clear playlist.
 * @method module:sfx.clear_playlist
 */
exports["clear_playlist"] = sfx.clear_playlist;

/**
 * Set positional params.
 * @method module:sfx.set_positional_params
 * @param obj Object ID
 * @param params Params object
 */
exports["set_positional_params"] = sfx.set_positional_params;
/**
 * Get positional params.
 * @method module:sfx.get_positional_params
 * @param obj Object ID
 * @returns Params object
 */
exports["get_positional_params"] = sfx.get_positional_params;

/**
 * Set filter params.
 * @method module:sfx.set_filter_params
 * @param obj Object ID
 * @param params Params object
 */
exports["set_filter_params"] = sfx.set_filter_params;
/**
 * Get filter params.
 * @method module:sfx.get_filter_params
 * @param obj Object ID
 * @returns Params object
 */
exports["get_filter_params"] = sfx.get_filter_params;

/**
 * Get filter frequency response.
 * @method module:sfx.get_filter_freq_response
 * @param obj Object ID
 * @param {Float32Array} freq_arr Input array with frequencies.
 * @param {Float32Array} mag_arr Ouput array with filter response magnitudes.
 * @param {Float32Array} phase_arr Output array with filter response phases.
 */
exports["get_filter_freq_response"] = sfx.get_filter_freq_response;

}

