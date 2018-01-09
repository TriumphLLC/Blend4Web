import b4w from "blend4web";

import * as bone_api from "./scripts/bone_api.js";
import * as camera_animation from "./scripts/camera_animation.js";
import * as camera_move_styles from "./scripts/camera_move_styles.js";
import * as canvas_texture from "./scripts/canvas_texture.js";
import * as change_image from "./scripts/change_image.js";
import * as custom_anchors from "./scripts/custom_anchors.js";
import * as dynamic_geometry from "./scripts/dynamic_geometry.js";
import * as gamepad from "./scripts/gamepad.js";
import * as gyro from "./scripts/gyro.js";
import * as instancing from "./scripts/instancing.js";
import * as leap from "./scripts/leap.js";
import * as lines from "./scripts/lines.js";
import * as material_api from "./scripts/material_api.js";
import * as morphing from "./scripts/morphing.js";
import * as multitouch from "./scripts/multitouch.js";
import * as pathfinding from "./scripts/pathfinding.js";
import * as raytest from "./scripts/raytest.js";
import * as vr from "./scripts/vr.js";
import * as webcam from "./scripts/webcam.js";
var snippets = [
    wrap(bone_api, "./scripts/bone_api.js", "Bone API", "bone_api"),
    wrap(camera_animation, "./scripts/camera_animation.js", "Camera Animation", "camera_animation"),
    wrap(camera_move_styles, "./scripts/camera_move_styles.js", "Camera Move Styles", "camera_move_styles", true),
    wrap(canvas_texture, "./scripts/canvas_texture.js", "Canvas Texture", "canvas_texture"),
    wrap(change_image, "./scripts/change_image.js", "Change Image", "change_image"),
    wrap(custom_anchors, "./scripts/custom_anchors.js", "Custom Anchors", "custom_anchors"),
    wrap(dynamic_geometry, "./scripts/dynamic_geometry.js", "Dynamic Geometry", "dynamic_geometry"),
    wrap(gamepad, "./scripts/gamepad.js", "Gamepad", "gamepad"),
    wrap(gyro, "./scripts/gyro.js", "Gyro", "gyro"),
    wrap(instancing, "./scripts/instancing.js", "Instancing", "instancing"),
    wrap(leap, "./scripts/leap.js", "Leap Motion", "leap", true),
    wrap(lines, "./scripts/lines.js", "Lines", "lines"),
    wrap(material_api, "./scripts/material_api.js", "Material API", "material_api"),
    wrap(morphing, "./scripts/morphing.js", "Morphing", "morphing", true),
    wrap(multitouch, "./scripts/multitouch.js", "Multitouch", "multitouch"),
    wrap(pathfinding, "./scripts/pathfinding.js", "Pathfinding", "pathfinding"),
    wrap(raytest, "./scripts/raytest.js", "Ray Test", "raytest"),
    wrap(vr, "./scripts/vr.js", "VR", "vr"),
    wrap(webcam, "./scripts/webcam.js", "Webcam", "webcam")
    
];
function wrap(module, path, name, scene, style) {
    return {
        module: module,
        path: path,
        name: name,
        scene: scene,
        style: style
    }
}

var m_app       = b4w.app;
var m_data      = b4w.data;

var WAITING_TIME = 3000;
var _scripts = null;
var _curr_index = 0;

var init = function() {
    _scripts = snippets;
    open_example();
    init_it();
    check_autoview();
}

function open_example() {
    var param = m_app.get_url_params();
    var snippet_name = document.getElementById("snippet_name");

    if (param && param["scene"])
        for (var i = 0; i < _scripts.length; i++)
            if (_scripts[i].scene == param["scene"]) {
                _curr_index = i;
                break;
            }

    if (_scripts[_curr_index].style) {
        var head = document.head;
        var link = document.createElement("link");

        link.id    = _scripts[_curr_index].scene + ".css";
        link.rel   = "stylesheet";
        link.type  = "text/css";
        link.href  = "css/" + link.id;
        link.media = "all";

        head.appendChild(link);
    }

    snippet_name.value = _scripts[_curr_index].scene;
    _scripts[_curr_index].module.init();
}

function init_it() {
    var schedule = document.getElementById("schedule");
    var clone_panel = document.getElementById("clone_panel");
    var close_clone = document.getElementById("close_clone");
    var clone_snippet = document.getElementById("clone_snippet");
    var top_switcher = document.getElementById("top_switcher");
    var wrapper = document.getElementById("wrapper");

    for (var i = 0; i < _scripts.length; i++) {
        var btn = document.createElement("a");

        if (i == _curr_index)
            btn.className = "btn active";
        else
            btn.className = "btn";

        btn.textContent = _scripts[i].name;
        btn.id = _scripts[i].scene;

        btn.href = window.location.href.split("?")[0] + "?scene=" + btn.id;

        schedule.appendChild(btn);
    }

    clone_snippet.addEventListener("click", function() {
        clone_panel.classList.toggle("active");
    })

    close_clone.addEventListener("click", function() {
        clone_panel.classList.toggle("active");
    })

    top_switcher.addEventListener("click", function() {
        this.classList.toggle("active");
        wrapper.classList.toggle("active");
    })

    var open_script = document.getElementById("open_script");

    open_script.onclick = function() {
        //window.open(_scripts[_curr_index].src, "_blank", "toolbar=0,location=0,menubar=0");

        var code_panel = document.getElementById("code_panel");

        if (code_panel.style.visibility == "visible")
            return;

        code_panel.style.visibility = "visible";

        document.getElementById("code_close").onclick = function(e) {
            code_panel.style.visibility = "hidden";
        }

        var script = _scripts[_curr_index];
        var req = new XMLHttpRequest();

        req.overrideMimeType("text/plain");
        req.open("GET", script.path, true);
        req.onreadystatechange = function() {
            if (req.readyState == 4) {
                if (req.status == 200 || req.status == 0) {
                    var response = req.response;

                    if (response) {
                        var text_html = document.getElementById("code_text_html");
                        var text_js   = document.getElementById("code_text_js");

                        var text_html_parent = text_html.parentNode;
                        var text_js_parent   = text_js.parentNode;

                        var raw_html = gen_html_code(script.path);

                        var re = new RegExp("get_std_assets_path\\(\\)[\\s\\S]*?\\+[\\s\\S]*?\"code_snippets\\/" 
                                + script.scene + "\\/?\"");
                        response = response.replace(re, "get_assets_path(\"" + script.scene + "\")");

                        var re = new RegExp("\.\./node_modules");
                        response = response.replace(re, "\./node_modules");

                        var raw_js   = response + '\n\ninit();';

                        var highlighted_html = hljs.highlight('html', raw_html).value;
                        var highlighted_js   = hljs.highlight('javascript', raw_js).value;

                        text_html.innerHTML = highlighted_html;
                        text_js.innerHTML   = highlighted_js;

                        text_html_parent.onmousedown = function() {
                            text_html_parent.className = "active";

                            text_js_parent.className = "";
                        };

                        text_js_parent.onmousedown = function() {
                            text_js_parent.className = "active";

                            text_html_parent.className = "";
                        };
                    }
                }
            }
        }
        req.send(null);
    };

    var auto_view = document.getElementById("auto_view");

    auto_view.onclick = function() {
        var param = m_app.get_url_params();

        if (param && param["autoview"])
            window.history.pushState("", "", window.location.href.split("&")[0]);
        else
            open_next_scene();
    };
}

function gen_html_code(js) {
    var file = js.split("/").slice(-1);

    return '' +
    '<!DOCTYPE html>\n\n' +
    '<html>\n' +
    '    <head>\n' +
    '        <style type="text/css">\n' +
    '            #main_canvas_container {\n' +
    '                position: absolute;\n' +
    '                width: 100%;\n' +
    '                height: 100%;\n' +
    '                top: 0;\n' +
    '                left: 0;\n' +
    '            }\n' +
    '        </style>\n' +
    '\n' +
    '        <script src="b4w.min.js"></script>\n' +
    '        <script src="' + file + '"></script>\n' +
    '    </head>\n' +
    '\n' +
    '    <body>\n' +
    '        <div id="main_canvas_container"></div>\n' +
    '    </body>\n' +
    '\n' +
    '</html>\n' +
    '\n';
}

function check_autoview() {
    var param = m_app.get_url_params();

    if (param && param["autoview"])
        if (m_data.is_primary_loaded())
            open_next_scene();
        else
            setTimeout(function() {
                check_autoview(param)
            }, WAITING_TIME);
}

function open_next_scene() {
    if (_curr_index >= _scripts.length - 1)
        return;

    window.location.href = window.location.href.split("?")[0]
                    + "?scene="+ _scripts[_curr_index + 1].scene + "&autoview=true";
}

document.addEventListener("DOMContentLoaded", init, false);
