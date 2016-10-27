"use strict";


b4w.register("code_snippets", function(exports, require) {

var m_app       = require("app");
var m_data      = require("data");

var WAITING_TIME = 3000;
var _scripts = null;
var _curr_index = 0;

exports.init = function() {
    _scripts = document.querySelectorAll("[data-name]");
    open_example();
    init_it();
    check_autoview();
}

function open_example() {
    var param = m_app.get_url_params();

    if (param && param["scene"])
        for (var i = 0; i < _scripts.length; i++)
            if (_scripts[i].dataset.scene == param["scene"]) {
                _curr_index = i;
                break;
            }

    if (_scripts[_curr_index].dataset.styles) {
        var head = document.head;
        var link = document.createElement("link");

        link.id    = _scripts[_curr_index].dataset.scene + ".css";
        link.rel   = "stylesheet";
        link.type  = "text/css";
        link.href  = "css/" + link.id;
        link.media = "all";

        head.appendChild(link);
    }

    b4w.require(_scripts[_curr_index].dataset.scene).init();
}

function init_it() {
    var schedule = document.getElementById("schedule");

    for (var i = 0; i < _scripts.length; i++) {
        var container = document.createElement("div");

        container.className = "container";

        var scenes_name = document.createElement("a");

        if (i == _curr_index)
            scenes_name.className = "inv_text";
        else
            scenes_name.className = "text";

        scenes_name.textContent = _scripts[i].dataset.name;
        scenes_name.id = _scripts[i].dataset.scene;

        container.appendChild(scenes_name);
        schedule.appendChild(container);
        scenes_name.href = window.location.href.split("?")[0] + "?scene="+ scenes_name.id;
    }

    var open_script = document.getElementById("open_script");

    open_script.onclick = function() {
        //window.open(_scripts[_curr_index].src, "_blank", "toolbar=0,location=0,menubar=0");

        var code_panel = document.getElementById("code_panel");

        if (code_panel.style.visibility == "visible")
            return;

        code_panel.style.visibility = "visible";

        document.getElementById("code_close").onclick = function(e) {
            var text_html = document.getElementById("code_text_html");
            var text_js   = document.getElementById("code_text_js");

            code_panel.style.visibility = "hidden";
        }

        var script = _scripts[_curr_index];
        var req = new XMLHttpRequest();

        req.overrideMimeType("text/plain");
        req.open("GET", script.src, true);
        req.onreadystatechange = function() {
            if (req.readyState == 4) {
                if (req.status == 200 || req.status == 0) {
                    var response = req.response;

                    if (response) {
                        var text_html = document.getElementById("code_text_html");
                        var text_js   = document.getElementById("code_text_js");

                        var text_html_parent = text_html.parentNode;
                        var text_js_parent   = text_js.parentNode;

                        var raw_html = gen_html_code(script.src);
                        var raw_js   = response + 'b4w.require("' + script.dataset.scene + '").init();';

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
    '            #canvas_cont {\n' +
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
    '        <div id="canvas_cont"></div>\n' +
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
                    + "?scene="+ _scripts[_curr_index + 1].dataset.scene + "&autoview=true";
}

});

var module = b4w.require("code_snippets");

document.addEventListener("DOMContentLoaded", function(){
    module.init();}, false);
