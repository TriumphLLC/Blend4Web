/**
 * Copyright (C) 2014-2017 Triumph LLC
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
 * Low-level resource loader.
 *
 * NOTE: setup Nginx /etc/nginx/mime.types:
 * audio/ogg ogg;
 * to prevent 206 partial content response
 *
 * @name assets
 * @namespace
 * @exports exports as assets
 */
b4w.module["__assets"] = function(exports, require) {

var m_cfg     = require("__config");
var m_compat  = require("__compat");
var m_pako    = require("__pako_inflate");
var m_print   = require("__print");
var m_sfg     = require("__sfx");
var m_util    = require("__util");
var m_version = require("__version");

var cfg_def = m_cfg.defaults;
var cfg_ldr = m_cfg.assets;

// asset types
exports.AT_ARRAYBUFFER       = 10;
exports.AT_ARRAYBUFFER_ZIP   = 20;
exports.AT_JSON              = 30;
exports.AT_JSON_ZIP          = 40;
exports.AT_TEXT              = 50;
exports.AT_AUDIOBUFFER       = 60;
exports.AT_IMAGE_ELEMENT     = 70;
exports.AT_AUDIO_ELEMENT     = 80;
exports.AT_VIDEO_ELEMENT     = 90;
exports.AT_SEQ_VIDEO_ELEMENT = 100;

// asset states: enqueued -> requested -> received
var ASTATE_ENQUEUED = 10;
var ASTATE_REQUESTED = 20;
var ASTATE_RECEIVED = 30;
var ASTATE_HALTED = 40;

var _assets_queue = [];
var _assets_pack_index = 0;

// deprecated
var _loaded_assets = {};

var _arraybuffer_cache = {};
var _img_cache = {};
var _sound_cache = {};
var _arraybuffer_sound_cache = {};

function get_built_in_data() {
    if (m_cfg.is_built_in_data())
        return require(m_cfg.paths.built_in_data_module)["data"];
    else
        return null;
}

function FakeHttpRequest() {
    var req = {
        _source_url: null,
        _parse_response: function(source) {
            switch(req.responseType) {
            case "json":
            case "text":
                return source;
            case "arraybuffer":
                var bin_str = atob(source);
                var len = bin_str.length;

                var arr_buffer = new Int8Array(len);
                for (var i = 0; i < len; i++)
                    arr_buffer[i] = bin_str.charCodeAt(i);
                return arr_buffer.buffer;
            default:
                return source;
            }
        },

        status: 0,
        readyState: 0,
        response: "",
        responseType: "",
        onreadystatechange: null,

        overrideMimeType: function() {},
        addEventListener: function() {},
        open: function(method, url, async) {
            req._source_url = url;
            req.readyState = 1;
        },
        send: function() {
            req.status = 404;
            req.readyState = 4;
            var bd = get_built_in_data();
            if (bd && req._source_url in bd) {
                req.status = 200;
                if (bd[req._source_url])
                    req.response = req._parse_response(bd[req._source_url]);
            }
            var get_type = {};
            if (get_type.toString.call(req.onreadystatechange)
                    === '[object Function]')
                req.onreadystatechange();
        }
    }
    return req;
}

/**
 * Split path to head and extension: "123.txt" -> ["123", "txt"]
 */
exports.split_extension = function(path) {
    var dot_split = path.split(".");

    var head_ext = Array(2);

    head_ext[0] = dot_split.slice(0, -1).join(".");
    head_ext[1] = String(dot_split.slice(-1));

    return head_ext;
}

/**
 * Get text by sync request.
 * @deprecated Any usage is strongly discouraged
 */
exports.get_text_sync = function(asset_uri) {
    // check in cache
    if (_loaded_assets[asset_uri])
        return _loaded_assets[asset_uri];

    if (cfg_ldr.prevent_caching)
        var filepath = asset_uri + m_version.timestamp();
    else
        var filepath = asset_uri;

    var req = new XMLHttpRequest();
    req.overrideMimeType("text/plain"); // to prevent "not well formed" error
    req.open("GET", filepath, false);
    req.send(null);

    if (req.status == 200 || req.status == 0) {
        var resp_text = req.responseText;
        if (resp_text.length) {
            // save in cache
            _loaded_assets[asset_uri] = resp_text;
            return resp_text;
        } else
            m_util.panic("Error XHR: responce is empty, GET " + asset_uri);
    } else {
        m_util.panic("Error XHR: " + req.status + ", GET " + asset_uri);
    }
}

exports.cleanup = function() {
    for (var i = 0; i < _assets_queue.length; i++)
        _assets_queue[i].state = ASTATE_HALTED;
    _assets_queue = [];
    _assets_pack_index = 0;

    // deprecated
    _loaded_assets = {};
}

exports.enqueue = function(assets_pack, asset_cb, pack_cb, progress_cb, json_reviver) {
    for (var i = 0; i < assets_pack.length; i++) {
        var elem = assets_pack[i];

        var asset = {
            id: elem.id,
            type: elem.type,
            url: elem.url,
            is_fetch: elem.is_fetch,
            request_method: elem.request_method ? elem.request_method : "GET",
            overwrite_header: elem.overwrite_header ? elem.overwrite_header : null,
            post_data: elem.post_data ? elem.post_data : null,
            param: elem.param ? elem.param : null,

            state: ASTATE_ENQUEUED,

            asset_cb: asset_cb || (function() {}),
            pack_cb: pack_cb || (function() {}),
            progress_cb: progress_cb || (function() {}),
            json_reviver: json_reviver || null,

            pack_index: _assets_pack_index
        }

        if (cfg_ldr.prevent_caching) {
            var bd = get_built_in_data();
            if (!(bd && asset.url in bd))
                asset.url += m_version.timestamp();
        }

        _assets_queue.push(asset);
    }

    request_assets(_assets_queue);
    _assets_pack_index++;
}

/**
 * Executed every frame
 */
exports.update = function() {
    request_assets(_assets_queue);
    handle_packs(_assets_queue);
}

function request_assets(queue) {

    var req_cnt = 0;

    for (var i = 0; i < queue.length; i++) {
        var asset = queue[i];

        if (asset.state === ASTATE_REQUESTED)
            req_cnt++;

        // check requests limit
        if (req_cnt >= cfg_ldr.max_requests)
            break;

        // pass recently enqueued
        if (asset.state !== ASTATE_ENQUEUED)
            continue;

        asset.state = ASTATE_REQUESTED;
        req_cnt++;

        switch (asset.type) {
        case exports.AT_JSON_ZIP:
        case exports.AT_ARRAYBUFFER:
        case exports.AT_ARRAYBUFFER_ZIP:
            request_arraybuffer(asset, "arraybuffer");
            break;
        case exports.AT_JSON:
            request_arraybuffer(asset, "json");
            break;
        case exports.AT_TEXT:
            request_arraybuffer(asset, "text");
            break;
        case exports.AT_AUDIOBUFFER:
            request_audiobuffer(asset);
            break;
        case exports.AT_IMAGE_ELEMENT:
            request_image(asset);
            break;
        case exports.AT_AUDIO_ELEMENT:
            request_audio(asset);
            break;
        case exports.AT_VIDEO_ELEMENT:
            request_video(asset);
            break;
        case exports.AT_SEQ_VIDEO_ELEMENT:
            request_seq_video(asset);
            break;
        default:
            m_util.panic("Wrong asset type: " + asset.type);
            break;
        }
    }
}

function request_arraybuffer(asset, response_type) {
    var filepath = asset.url.split("?v=")[0];
    if (filepath in _arraybuffer_cache) {
        if (response_type == "json")
            asset.asset_cb(m_util.clone_object_r(_arraybuffer_cache[filepath]), asset.id, asset.type,
                    asset.url, asset.param);
        else
            asset.asset_cb(_arraybuffer_cache[filepath], asset.id, asset.type,
                    asset.url, asset.param);
        return;
    }
    var bd = get_built_in_data();
    if (bd && asset.url in bd)
        var req = new FakeHttpRequest();
    else
        var req = new XMLHttpRequest();

    var content_type = null;
    if (asset.request_method == "GET") {
        req.open("GET", asset.url, true);
    } else if (asset.request_method == "POST") {
        req.open("POST", asset.url, true);
        switch (asset.type) {
        case exports.AT_TEXT:
            content_type = 'text/plain';
            break;
        case exports.AT_JSON:
            content_type = 'application/json';
            break;
        }
    }

    if (asset.overwrite_header) {
        for (var key in asset.overwrite_header) {
            if (key == "Content-Type")
                content_type = asset.overwrite_header[key];
            else
                req.setRequestHeader(key, asset.overwrite_header[key]);
        }
    }

    if (content_type)
        req.setRequestHeader("Content-Type", content_type);

    if (response_type == "text") {
        // to prevent "not well formed" error (GLSL)
        req.overrideMimeType("text/plain");
        req.responseType = "text";
    } else if (response_type == "json") {
        // NOTE: workaround, json response type not implemented in some browsers
        //m_print.log("Apply json load workaround");
        req.overrideMimeType("application/json");
        req.responseType = "text";
    } else
        req.responseType = response_type;

    req.onreadystatechange = function() {
        if (asset.state != ASTATE_HALTED)
            if (req.readyState == 4) {
                if (req.status == 200 || req.status == 0) {
                    var response = req.response;
                    var empty_response = !response
                        || (response_type == "arraybuffer" && response["byteLength"] == 0)
                    if (!empty_response) {

                        switch (asset.type) {
                        case exports.AT_JSON_ZIP:
                            try {
                                response = m_pako.inflate(response, { to: "string" });
                            } catch(e) {
                                m_print.error(e + " (parsing gzipped file " + asset.url + ")");
                                asset.asset_cb(null, asset.id, asset.type, asset.url, asset.param);
                                return;
                            }
                        case exports.AT_JSON:
                            try {
                                response = JSON.parse(response, asset.json_reviver);
                            } catch(e) {
                                m_print.error(e + " (parsing JSON " + asset.url + ")");
                                asset.asset_cb(null, asset.id, asset.type, asset.url, asset.param);
                                return;
                            }
                            break;
                        case exports.AT_ARRAYBUFFER_ZIP:
                            try {
                                response = m_pako.inflate(response).buffer;
                            } catch(e) {
                                m_print.error(e + " (parsing gzipped file " + asset.url + ")");
                                asset.asset_cb(null, asset.id, asset.type, asset.url, asset.param);
                                return;
                            }
                            break;
                        }

                        if (asset.is_fetch)
                            if (asset.type == exports.AT_JSON || asset.type == exports.AT_JSON_ZIP)
                                _arraybuffer_cache[filepath] = m_util.clone_object_r(response);
                            else
                                _arraybuffer_cache[filepath] = response;

                        asset.asset_cb(response, asset.id, asset.type, asset.url, asset.param);
                    } else {
                        m_print.error("empty responce when trying to get " + asset.url);
                        asset.asset_cb(null, asset.id, asset.type, asset.url, asset.param);
                    }
                } else {
                    m_print.error(req.status + " when trying to get " + asset.url);
                    asset.asset_cb(null, asset.id, asset.type, asset.url, asset.param);
                }
                asset.state = ASTATE_RECEIVED;
            }
    };

    req.addEventListener("progress", function(e) {
        // compute progress information if total size is known
        if (e.lengthComputable)
            asset.progress_cb(e.loaded / e.total);
    }, false);

    req.send(asset.post_data);
}

function request_audiobuffer(asset) {
    var filepath = asset.url.split("?v=")[0];
    if (filepath in _arraybuffer_sound_cache) {
        asset.asset_cb(_arraybuffer_sound_cache[filepath], asset.id, asset.type,
                asset.url, asset.param);
        asset.state = ASTATE_RECEIVED;
        return;
    }
    if (asset.request_method != "GET") {
        m_util.panic("Unsupported request type for audio buffer");
    }
    var bd = get_built_in_data();
    if (bd && asset.url in bd)
        var req = new FakeHttpRequest();
    else
        var req = new XMLHttpRequest();

    req.open("GET", asset.url, true);

    req.responseType = "arraybuffer";

    req.onreadystatechange = function() {
        if (asset.state != ASTATE_HALTED)
            if (req.readyState == 4) {
                if (req.status == 200 || req.status == 0) {
                    var response = req.response;
                    if (response) {
                        var decode_cb = function(audio_buffer) {
                            asset.asset_cb(audio_buffer, asset.id, asset.type, asset.url, asset.param);
                            asset.state = ASTATE_RECEIVED;
                            if (asset.is_fetch) {
                                var filepath = asset.url.split("?v=")[0];
                                _arraybuffer_sound_cache[filepath] = audio_buffer;
                            }
                        }
                        var fail_cb = function() {
                            m_print.error("failed to decode " + asset.url);
                            asset.asset_cb(null, asset.id, asset.type, asset.url, asset.param);
                            asset.state = ASTATE_RECEIVED;
                        }

                        m_sfg.decode_audio_data(response, decode_cb, fail_cb);

                    } else {
                        m_print.error("empty responce when trying to get " + asset.url);
                        asset.asset_cb(null, asset.id, asset.type, asset.url, asset.param);
                        asset.state = ASTATE_RECEIVED;
                    }
                } else {
                    m_print.error(req.status + " when trying to get " + asset.url);
                    asset.asset_cb(null, asset.id, asset.type, asset.url, asset.param);
                    asset.state = ASTATE_RECEIVED;
                }
            }
    };

    req.send();
}

function request_image(asset) {
    var filepath = asset.url.split("?v=")[0];
    if (filepath in _img_cache) {
        asset.asset_cb(_img_cache[filepath], asset.id, asset.type, asset.url, asset.param);
        asset.state = ASTATE_RECEIVED;
        return;
    }
    if (asset.request_method != "GET") {
        m_util.panic("Unsupported request type for image element");
    }
    var image = document.createElement("img");
    if (cfg_def.allow_cors)
        image.crossOrigin = "Anonymous";
    image.onload = function() {
        if (asset.state != ASTATE_HALTED) {
            asset.asset_cb(image, asset.id, asset.type, asset.url, asset.param);
            asset.state = ASTATE_RECEIVED;
            if (asset.is_fetch) {
                var filepath = asset.url.split("?v=")[0];
                _img_cache[filepath] = image;
            }
        }
    };
    image.addEventListener("error", function() {
        if (asset.state != ASTATE_HALTED) {
            m_print.error("could not load image: " + asset.url);
            asset.asset_cb(null, asset.id, asset.type, asset.url, asset.param);
            asset.state = ASTATE_RECEIVED;
        }
    }, false);

    var bd = get_built_in_data();
    if (bd && asset.url in bd) {
        if (bd[asset.url]) {
            var img_mime_type = get_image_mime_type(asset.url);
            image.src = "data:" + img_mime_type + ";base64," + bd[asset.url];
        } else {
            if (m_compat.is_ie11()) {
                var e = document.createEvent("CustomEvent");
                e.initCustomEvent("error", false, false, null);
            } else
                var e = new CustomEvent("error");
            image.dispatchEvent(e);
        }
    } else
        image.src = asset.url;
}

function request_audio(asset) {
    var filepath = asset.url.split("?v=")[0];
    if (filepath in _sound_cache) {
        asset.asset_cb(_sound_cache[filepath], asset.id, asset.type,
                asset.url, asset.param);
        asset.state = ASTATE_RECEIVED;
        return;
    }
    if (asset.request_method != "GET") {
        m_util.panic("Unsupported request type for audio element");
    }
    var audio = document.createElement("audio");
    if (cfg_def.allow_cors)
        audio.crossOrigin = "Anonymous";

    audio.addEventListener("loadeddata", function() {
        if (asset.state != ASTATE_HALTED) {
            asset.asset_cb(audio, asset.id, asset.type, asset.url, asset.param);
            asset.state = ASTATE_RECEIVED;
            if (asset.is_fetch) {
                var filepath = asset.url.split("?v=")[0];
                _sound_cache[filepath] = audio;
            }
        }
    }, false);

    audio.addEventListener("error", function() {
        if (asset.state != ASTATE_HALTED) {
            m_print.error("could not load sound: " + asset.url);
            asset.asset_cb(null, asset.id, asset.type, asset.url, asset.param);
            asset.state = ASTATE_RECEIVED;
        }
    }, false);

    audio.addEventListener("stalled", function() {
        if (asset.state != ASTATE_HALTED) {
            m_print.error("could not load sound: " + asset.url);
            asset.asset_cb(null, asset.id, asset.type, asset.url, asset.param);
            asset.state = ASTATE_RECEIVED;
        }
    }, false);

    var bd = get_built_in_data();
    if (bd && asset.url in bd) {
        if (bd[asset.url]) {
            var snd_mime_type = get_sound_mime_type(asset.url);
            audio.src = "data:" + snd_mime_type + ";base64," + bd[asset.url];
            if (asset.state != ASTATE_HALTED) {
                asset.asset_cb(audio, asset.id, asset.type, asset.url, asset.param);
                asset.state = ASTATE_RECEIVED;
            }

        } else {
            if (m_compat.is_ie11()) {
                var e = document.createEvent("CustomEvent");
                e.initCustomEvent("error", false, false, null);
            } else
                var e = new CustomEvent("error");
            audio.dispatchEvent(e);
        }
    } else {
        audio.src = asset.url;
        if (cfg_def.is_mobile_device)
            audio.load();
    }

    if (cfg_def.mobile_firefox_media_hack) {
        audio.autoplay = true;
        audio.pause();
    }

    // HACK: workaround for some garbage collector bug
    setTimeout(function() {audio.some_prop_to_prevent_gc = 1}, 5000);
}

function request_video(asset) {
    var filepath = asset.url.split("?v=")[0];
    if (filepath in _img_cache) {
        asset.asset_cb(_img_cache[filepath], asset.id, asset.type, asset.url, asset.param);
        asset.state = ASTATE_RECEIVED;
        return;
    }
    if (asset.request_method != "GET") {
        m_util.panic("Unsupported request type for video element");
    }
    var video = document.createElement("video");
    video.muted = true;
    // HACK: allow crossOrigin for mobile devices (Android Chrome bug)
    if (cfg_def.allow_cors)
        video.crossOrigin = "Anonymous";
    video.addEventListener("loadeddata", function() {
        video.removeEventListener("error", video_error_event, false);
        if (asset.state != ASTATE_HALTED) {
            asset.asset_cb(video, asset.id, asset.type, asset.url, asset.param);
            asset.state = ASTATE_RECEIVED;
            if (asset.is_fetch) {
                var filepath = asset.url.split("?v=")[0];
                _img_cache[filepath] = video;
            }
        }
    }, false);

    function video_error_event(e) {
        if (asset.state != ASTATE_HALTED) {
            m_print.error("could not load video: " + asset.url, asset.param);
            asset.asset_cb(null, asset.id, asset.type, asset.url);
            asset.state = ASTATE_RECEIVED;
        }
    }
    video.addEventListener("error", video_error_event, false);

    var bd = get_built_in_data();
    if (bd && asset.url in bd) {
        if (bd[asset.url]) {
            var vid_mime_type = get_video_mime_type(asset.url);
            video.src = "data:" + vid_mime_type + ";base64," + bd[asset.url];
            if (asset.state != ASTATE_HALTED)
                video.addEventListener("loadeddata", function() {
                    asset.asset_cb(video, asset.id, asset.type, asset.url, asset.param);
                    asset.state = ASTATE_RECEIVED;
                }, false);
        } else {
            if (m_compat.is_ie11()) {
                var e = document.createEvent("CustomEvent");
                e.initCustomEvent("error", false, false, null);
            } else
                var e = new CustomEvent("error");
            video.dispatchEvent(e);
        }
    } else {
        video.src = asset.url;
        if (cfg_def.is_mobile_device)
            video.load();
    }

    if (cfg_def.mobile_firefox_media_hack) {
        video.autoplay = true;
        video.pause();
    }

    // HACK: workaround for some garbage collector bug
    setTimeout(function() {video.some_prop_to_prevent_gc = 1}, 10000);
}

function request_seq_video(asset) {
    var filepath = asset.url.split("?v=")[0];
    if (filepath in _img_cache) {
        asset.asset_cb(_img_cache[filepath], asset.id, asset.type, asset.url, asset.param);
        asset.state = ASTATE_RECEIVED;
        return;
    }
    if (asset.request_method != "GET") {
        m_util.panic("Unsupported request type for seq video element");
    }
    var bd = get_built_in_data();
    if (bd && asset.url in bd)
        var req = new FakeHttpRequest();
    else
        var req = new XMLHttpRequest();

    req.open("GET", asset.url, true);
    req.responseType = "arraybuffer";

    function load_cb(images) {
        asset.asset_cb(images, asset.id, asset.type, asset.url, asset.param);
        asset.state = ASTATE_RECEIVED;
        if (asset.is_fetch) {
            var filepath = asset.url.split("?v=")[0];
            _img_cache[filepath] = images;
        }
    }

    req.onreadystatechange = function() {
    if (asset.state != ASTATE_HALTED)
        if (req.readyState == 4) {
            if (req.status == 200 || req.status == 0) {
                var response = req.response;
                if (response)
                    parse_seq_video_file(response, load_cb);
                else {
                    m_print.error("empty responce when trying to get " + asset.url);
                    asset.asset_cb(null, asset.id, asset.type, asset.url, asset.param);
                    asset.state = ASTATE_RECEIVED;
                }
            } else {
                m_print.error(req.status + " when trying to get " + asset.url);
                asset.asset_cb(null, asset.id, asset.type, asset.url, asset.param);
                asset.state = ASTATE_RECEIVED;
            }
        }
    };
    req.addEventListener("progress", function(e) {
        // compute progress information if total size is known
        if (e.lengthComputable)
            asset.progress_cb(e.loaded / e.total);
    }, false);

    req.send();
}

function parse_seq_video_file(response, callback) {
    var buffer = new Int32Array(response);
    var seq_image_data = new Int8Array(response);
    var number = buffer[3];
    var data = {
        images: [],
        blobs: [],
        fps: buffer[4]
    };
    var offset = 20;
    for (var j = 0; j < number; j++) {
        var size = buffer[offset/4];
        var frame = seq_image_data.subarray(offset + 4, offset + 4 + size);
        var blob = new Blob([frame], {type: "image/jpg"});
        var image = document.createElement("img");
        image.src = window.URL.createObjectURL(blob);
        data.images.push(image);
        // NOTE: IE HTML7007 message hack
        data.blobs.push(blob);
        offset +=size + 8 - size % 4;
    }
    // NOTE: wait for loading last image
    image.onload = function() {
        for (var i = 0; i < data.images.length; i++)
            window.URL.revokeObjectURL(data.images[i].src);
        delete data.blobs;
        callback(data);
    }
}

function get_image_mime_type(file_path) {
    var ext = m_util.get_file_extension(file_path);
    var mime_type = "image";
    switch(ext.toLowerCase()) {
    case "jpeg":
    case "jpg":
        mime_type += "/jpeg";
        break;
    case "png":
        mime_type += "/png";
        break;
    }

    return mime_type;
}

function get_sound_mime_type(file_path) {
    var ext = m_util.get_file_extension(file_path);
    var mime_type = "audio";
    switch(ext.toLowerCase()) {
    case "ogv":
    case "ogg":
        mime_type += "/ogg";
        break;
    case "mp3":
        mime_type += "/mpeg";
        break;
    case "m4v":
    case "mp4":
        mime_type += "/mp4";
        break;
    case "webm":
        mime_type += "/webm";
        break;
    }

    return mime_type;
}

function get_video_mime_type(file_path) {
    var ext = m_util.get_file_extension(file_path);
    var mime_type = "video";
    switch(ext.toLowerCase()) {
    case "ogv":
        mime_type += "/ogg";
        break;
    case "webm":
        mime_type += "/webm";
        break;
    case "m4v":
        mime_type += "/mp4";
        break;
    }

    return mime_type;
}

exports.check_image_extension = function(ext) {
    if (ext == "png"
            || ext == "jpg"
            || ext == "jpeg"
            || ext == "gif"
            || ext == "bmp"
            || ext == "dds"
            || ext == "pvr")
        return true;

    return false;
}

/**
 * Find loaded packs, exec callback and remove from queue
 */
function handle_packs(queue) {

    var pack_first_index = 0;
    var pack_cb_exec = true;

    for (var i = 0; i < queue.length; i++) {
        var asset = queue[i];
        var asset_pack_first = queue[pack_first_index];

        if (asset.pack_index === asset_pack_first.pack_index) {
            if (asset.state !== ASTATE_RECEIVED)
                pack_cb_exec = false;
        } else {
            if (pack_cb_exec) {
                queue[i-1].pack_cb();
                var spliced_count = i-pack_first_index;
                queue.splice(pack_first_index, spliced_count);
                i-=spliced_count;
            }

            pack_first_index = i;
            pack_cb_exec = (queue[i].state === ASTATE_RECEIVED) ? true : false;
        }

        if ((i === (queue.length-1)) && pack_cb_exec) {
            var last_asset = queue[i];
            queue.splice(pack_first_index);
            // Should be executed after splice. Possible enqueue in pack_cb
            last_asset.pack_cb();
        }
    }
}

function debug_queue(queue, opt_log_prefix) {
    var state_str = "[";

    for (var i = 0; i < queue.length; i++)
        state_str += String(queue[i].state / 10);

    state_str += "]";

    if (opt_log_prefix || opt_log_prefix === 0)
        m_print.log(opt_log_prefix, state_str);
    else
        m_print.log(state_str);
}

exports.clear_cache = function() {
    _arraybuffer_cache = {};
    _img_cache = {};
    _sound_cache = {};
    _arraybuffer_sound_cache = {};
}

}
