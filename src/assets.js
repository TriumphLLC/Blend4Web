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

var config  = require("__config");
var m_print = require("__print");
var sfx     = require("__sfx");
var m_util  = require("__util");
var version = require("__version");
var m_compat = require("__compat");

var cfg_ldr = config.assets;
var cfg_def = config.defaults;

// asset types
exports.AT_ARRAYBUFFER   = 10;
exports.AT_JSON          = 20;
exports.AT_TEXT          = 30;
exports.AT_AUDIOBUFFER   = 40;
exports.AT_IMAGE_ELEMENT = 50;
exports.AT_AUDIO_ELEMENT = 60;
exports.AT_VIDEO_ELEMENT = 70;
exports.AT_SEQ_VIDEO_ELEMENT = 80;

// asset states: enqueued -> requested -> received
var ASTATE_ENQUEUED = 10;
var ASTATE_REQUESTED = 20;
var ASTATE_RECEIVED = 30;
var ASTATE_HALTED = 40;

var _assets_queue = [];
var _assets_pack_index = 0;

// deprecated
var _loaded_assets = {};


function get_built_in_data() {
    if (config.is_built_in_data())
        return require(config.paths.built_in_data_module)["data"];
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
        var filepath = asset_uri + version.timestamp();
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

exports.enqueue = function(assets_pack, asset_cb, pack_cb, progress_cb) {
    for (var i = 0; i < assets_pack.length; i++) {
        var pack_elem = assets_pack[i];

        var asset = {
            uri: pack_elem[0],
            type: pack_elem[1],
            filepath: pack_elem[2],
            opt_param: pack_elem[3],

            state: ASTATE_ENQUEUED,

            asset_cb: asset_cb || (function() {}),
            pack_cb: pack_cb || (function() {}),
            progress_cb: progress_cb || (function() {}),

            pack_index: _assets_pack_index
        }

        if (cfg_ldr.prevent_caching) {
            var bd = get_built_in_data();
            if (!(bd && asset.filepath in bd))
                asset.filepath += version.timestamp();
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
        case exports.AT_ARRAYBUFFER:
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
    var bd = get_built_in_data();
    if (bd && asset.filepath in bd)
        var req = new FakeHttpRequest();
    else
        var req = new XMLHttpRequest();

    req.open("GET", asset.filepath, true);

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
                    if (response) {

                        // NOTE: json workaround, see above
                        if (response_type == "json" && typeof response == "string") {
                            try {
                                response = JSON.parse(response);
                            } catch(e) {
                                asset.asset_cb(null, asset.uri, asset.type, asset.filepath, asset.opt_param);
                                m_print.error(e + " (parsing JSON " + asset.filepath + ")");
                                return;
                            }
                        }

                        asset.asset_cb(response, asset.uri, asset.type, asset.filepath, asset.opt_param);
                    } else {
                        asset.asset_cb(null, asset.uri, asset.type, asset.filepath, asset.opt_param);
                        m_print.error("empty responce when trying to get " + asset.filepath);
                    }
                } else {
                    asset.asset_cb(null, asset.uri, asset.type, asset.filepath, asset.opt_param);
                    m_print.error(req.status + " when trying to get " + asset.filepath);
                }
                asset.state = ASTATE_RECEIVED;
            }
    };

    req.addEventListener("progress", function(e) {
        // compute progress information if total size is known
        if (e.lengthComputable)
            asset.progress_cb(e.loaded / e.total);
    }, false);

    req.send(null);
}

function request_audiobuffer(asset) {
    var bd = get_built_in_data();
    if (bd && asset.filepath in bd)
        var req = new FakeHttpRequest();
    else
        var req = new XMLHttpRequest();

    req.open("GET", asset.filepath, true);

    req.responseType = "arraybuffer";

    req.onreadystatechange = function() {
        if (asset.state != ASTATE_HALTED)
            if (req.readyState == 4) {
                if (req.status == 200 || req.status == 0) {
                    var response = req.response;
                    if (response) {
                        var decode_cb = function(audio_buffer) {
                            asset.asset_cb(audio_buffer, asset.uri, asset.type, asset.filepath, asset.opt_param);
                            asset.state = ASTATE_RECEIVED;
                        }
                        var fail_cb = function() {
                            asset.asset_cb(null, asset.uri, asset.type, asset.filepath, asset.opt_param);
                            m_print.error("failed to decode " + asset.filepath);
                            asset.state = ASTATE_RECEIVED;
                        }

                        sfx.decode_audio_data(response, decode_cb, fail_cb);

                    } else {
                        asset.asset_cb(null, asset.uri, asset.type, asset.filepath, asset.opt_param);
                        m_print.error("empty responce when trying to get " + asset.filepath);
                        asset.state = ASTATE_RECEIVED;
                    }
                } else {
                    asset.asset_cb(null, asset.uri, asset.type, asset.filepath, asset.opt_param);
                    m_print.error(req.status + " when trying to get " + asset.filepath);
                    asset.state = ASTATE_RECEIVED;
                }
            }
    };

    req.send(null);
}

function request_image(asset) {
    var image = document.createElement("img");
    if (cfg_def.allow_cors)
        image.crossOrigin = "Anonymous";
    image.onload = function() {
        if (asset.state != ASTATE_HALTED) {
            asset.asset_cb(image, asset.uri, asset.type, asset.filepath, asset.opt_param);
            asset.state = ASTATE_RECEIVED;
        }
    };
    image.addEventListener("error", function() {
        if (asset.state != ASTATE_HALTED) {
            asset.asset_cb(null, asset.uri, asset.type, asset.filepath, asset.opt_param);
            m_print.error("could not load image: " + asset.filepath);
            asset.state = ASTATE_RECEIVED;
        }
    }, false);

    var bd = get_built_in_data();
    if (bd && asset.filepath in bd) {
        if (bd[asset.filepath]) {
            var img_mime_type = get_image_mime_type(asset.filepath);
            image.src = "data:" + img_mime_type + ";base64," + bd[asset.filepath];
        } else {
            if (m_compat.is_ie11()) {
                var e = document.createEvent("CustomEvent");
                e.initCustomEvent("error", false, false, null);
            } else
                var e = new CustomEvent("error");
            image.dispatchEvent(e);
        }
    } else
        image.src = asset.filepath;
}

function request_audio(asset) {
    var audio = document.createElement("audio");
    if (cfg_def.allow_cors || cfg_def.cors_chrome_hack)
        audio.crossOrigin = "Anonymous";
    
    audio.addEventListener("loadeddata", function() {
        if (asset.state != ASTATE_HALTED) {
            asset.asset_cb(audio, asset.uri, asset.type, asset.filepath, asset.opt_param);
            asset.state = ASTATE_RECEIVED;
        }
    }, false);

    audio.addEventListener("error", function() {
        if (asset.state != ASTATE_HALTED) {
            asset.asset_cb(null, asset.uri, asset.type, asset.filepath, asset.opt_param);
            m_print.error("could not load sound: " + asset.filepath);
            asset.state = ASTATE_RECEIVED;
        }
    }, false);

    var bd = get_built_in_data();
    if (bd && asset.filepath in bd) {
        if (bd[asset.filepath]) {
            var snd_mime_type = get_sound_mime_type(asset.filepath);
            audio.src = "data:" + snd_mime_type + ";base64," + bd[asset.filepath];
            if (asset.state != ASTATE_HALTED) {
                asset.asset_cb(audio, asset.uri, asset.type, asset.filepath, asset.opt_param);
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
        audio.src = asset.filepath;
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
    var video = document.createElement("video");
    video.muted = true;
    // HACK: allow crossOrigin for mobile devices (Android Chrome bug)
    if (cfg_def.allow_cors || cfg_def.is_mobile_device)
        video.crossOrigin = "Anonymous";
    video.addEventListener("loadeddata", function() {
        video.removeEventListener("error", video_error_event, false);
        if (asset.state != ASTATE_HALTED) {
            asset.asset_cb(video, asset.uri, asset.type, asset.filepath, asset.opt_param);
            asset.state = ASTATE_RECEIVED;
        }
    }, false);

    function video_error_event(e) {
        if (asset.state != ASTATE_HALTED) {
            asset.asset_cb(null, asset.uri, asset.type, asset.filepath);
            m_print.error("could not load video: " + asset.filepath, asset.opt_param);
            asset.state = ASTATE_RECEIVED;
        }
    }
    video.addEventListener("error", video_error_event, false);

    var bd = get_built_in_data();
    if (bd && asset.filepath in bd) {
        if (bd[asset.filepath]) {
            var vid_mime_type = get_video_mime_type(asset.filepath);
            video.src = "data:" + vid_mime_type + ";base64," + bd[asset.filepath];
            if (asset.state != ASTATE_HALTED)
                video.addEventListener("loadeddata", function() {
                    asset.asset_cb(video, asset.uri, asset.type, asset.filepath, asset.opt_param);
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
        video.src = asset.filepath;
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
    var bd = get_built_in_data();
    if (bd && asset.filepath in bd)
        var req = new FakeHttpRequest();
    else
        var req = new XMLHttpRequest();
    req.open("GET", asset.filepath, true);
    req.responseType = "arraybuffer";

    function load_cb(images) { 
        asset.asset_cb(images, asset.uri, asset.type, asset.filepath, asset.opt_param);
    }

    req.onreadystatechange = function() {
    if (asset.state != ASTATE_HALTED)
        if (req.readyState == 4) {
            if (req.status == 200 || req.status == 0) {
                var response = req.response;
                if (response) {
                    parse_seq_video_file(response, load_cb);                    
                }
                else {
                    asset.asset_cb(null, asset.uri, asset.type, asset.filepath, asset.opt_param);
                    m_print.error("empty responce when trying to get " + asset.filepath);
                }
            } else {
                asset.asset_cb(null, asset.uri, asset.type, asset.filepath, asset.opt_param);
                m_print.error(req.status + " when trying to get " + asset.filepath);
            }
            asset.state = ASTATE_RECEIVED;
        }
    };
    req.addEventListener("progress", function(e) {
        // compute progress information if total size is known
        if (e.lengthComputable)
            asset.progress_cb(e.loaded / e.total);
    }, false);

    req.send(null);
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
            queue[i].pack_cb();
            queue.splice(pack_first_index);
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

}
