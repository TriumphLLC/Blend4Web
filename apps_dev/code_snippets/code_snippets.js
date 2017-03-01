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
    var snippet_name = document.getElementById("snippet_name");

    if (param && param["scene"])
        for (var i = 0; i < _scripts.length; i++)
            if (_scripts[i].dataset["scene"] == param["scene"]) {
                _curr_index = i;
                break;
            }

    if (_scripts[_curr_index].dataset["styles"]) {
        var head = document.head;
        var link = document.createElement("link");

        link.id    = _scripts[_curr_index].dataset["scene"] + ".css";
        link.rel   = "stylesheet";
        link.type  = "text/css";
        link.href  = "css/" + link.id;
        link.media = "all";

        head.appendChild(link);
    }

    snippet_name.value = _scripts[_curr_index].dataset["scene"];
    b4w.require(_scripts[_curr_index].dataset["scene"]).init();
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

        btn.textContent = _scripts[i].dataset.name;
        btn.id = _scripts[i].dataset["scene"];

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

                        var re = new RegExp("get_std_assets_path\\(\\)[\\s\\S]*?\\+[\\s\\S]*?\"code_snippets\\/" 
                                + script.dataset["scene"] + "\\/?\"");
                        response = response.replace(re, "get_assets_path(\"" + script.dataset["scene"] + "\")");
                        var raw_js   = response + 'b4w.require("' + script.dataset["scene"] + '").init();';

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
                    + "?scene="+ _scripts[_curr_index + 1].dataset["scene"] + "&autoview=true";
}

});

var module = b4w.require("code_snippets");

document.addEventListener("DOMContentLoaded", function(){
    module.init();}, false);
