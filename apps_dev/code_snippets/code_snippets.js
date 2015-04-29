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
    if (param && param["scene"]) {
        for (var i = 0; i < _scripts.length; i++)
            if (_scripts[i].dataset.scene == param["scene"]) {
                _curr_index = i;
                break;
            }
    }
    if (_scripts[_curr_index].dataset.styles) {
        var head  = document.getElementsByTagName("head")[0];
        var link  = document.createElement("link");
        link.id   = _scripts[_curr_index].dataset.scene + ".css";
        link.rel  = "stylesheet";
        link.type = "text/css";
        link.href = "css/" + link.id;
        link.media = "all";
        head.appendChild(link);
    }
    b4w.require(_scripts[_curr_index].dataset.scene).init();
}

function init_it() {
    var schedule = document.getElementById("schedule");
    for (var i = 0; i < _scripts.length; i++) {
        var contaner = document.createElement("div");
        contaner.className = "contaner";
        var scenes_name = document.createElement("a");
        if (i == _curr_index)
            scenes_name.className = "inv_text";
        else
            scenes_name.className = "text";
        scenes_name.textContent = _scripts[i].dataset.name;
        scenes_name.id = _scripts[i].dataset.scene;

        contaner.appendChild(scenes_name);
        schedule.appendChild(contaner);
        scenes_name.href = window.location.href.split("?")[0] + "?scene="+ scenes_name.id;
    }
    var open_script = document.getElementById("open_script");
    open_script.onclick = function() {
        //window.open(_scripts[_curr_index].src, "_blank", "toolbar=0,location=0,menubar=0");
        var code_panel = document.getElementById("code_panel");
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
                        var text_js = document.getElementById("code_text_js");
                        text_html.value = gen_html_code(script.src);
                        text_js.value = req.response;
                        text_js.value += 'b4w.require("' + script.dataset.scene + '").init();';
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

    '<!DOCTYPE html>\n' +
    '<html>\n' +
    '<head>\n' +
    '<script src="b4w.full.min.js"></script>\n' +
    '<script src="' + file + '"></script>\n' +
    '</head>\n' +
    '\n' +
    '<body>\n' +
    '    <div id="canvas3d" style="width: 350px; height: 200px;"></div>\n' +
    '</body>\n' +
    '\n' +
    '</html>\n' +
    '\n';
}

function check_autoview() {
    var param = m_app.get_url_params();
    if (param && param["autoview"])
        if (m_data.is_primary_loaded()) {
            open_next_scene();
        } else
            setTimeout(function(){check_autoview(param)}, WAITING_TIME);
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
