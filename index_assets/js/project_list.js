"use strict";

;(function() {

var _form = null;
var _req_input = null;
var _body_opacity = null;
var _confirm_box = null;
var _deny_remove = null;
var _allow_remove = null;
var _allow_clone = null;
var _deny_clone = null;
var _confirm_clone_box = null;
var _proj_name_input = null;

function onload() {
    cache_dom_elems();
    add_listeners();
}

function cache_dom_elems() {
    _form = document.querySelector("form");
    _req_input = _form.querySelector("input[name=zip_file]");
    _body_opacity = document.querySelector("#body_opacity");
    _confirm_box = document.querySelector("#confirm_box");
    _confirm_clone_box = document.querySelector("#confirm_clone_box");
    _deny_remove = document.querySelector("#deny_remove");
    _allow_remove = document.querySelector("#allow_remove");
    _deny_clone = document.querySelector("#deny_clone");
    _allow_clone = document.querySelector("#allow_clone");
    _proj_name_input = document.querySelector("#proj_name");
}

function add_listeners() {
    _req_input.addEventListener("change", onsubmit);
    _deny_remove.removeEventListener("click", hide_confirm_window);
    _deny_remove.addEventListener("click", hide_confirm_window);
    _deny_clone.removeEventListener("click", hide_clone_confirm_window);
    _deny_clone.addEventListener("click", hide_clone_confirm_window);
    window.addEventListener("keydown", onkedown);
}

function onsubmit() {
    _form.submit();
}

function hide_confirm_window() {
    window.onwheel = null;
    document.body.style.overflow = "";
    _body_opacity.style.display = "";
    _confirm_box.style.display = "";
}

function hide_clone_confirm_window() {
    window.onwheel = null;
    document.body.style.overflow = "";
    _body_opacity.style.display = "";
    _confirm_clone_box.style.display = "";
}

function onkedown(e) {
    if (e.keyCode == 27) {
        hide_confirm_window();
        hide_clone_confirm_window();

        return;
    }
}

window.addEventListener("load", onload);

window.show_confirm_window = function(e) {
    window.onwheel = function(e) {
        e.preventDefault();
    }

    _allow_remove.href = e.href;
    _body_opacity.style.display = "block";
    _body_opacity.style.marginTop = window.pageYOffset + "px";
    _body_opacity.style.marginRight = -window.pageXOffset + "px";
    _body_opacity.style.bottom = -window.pageYOffset + "px";
    _confirm_box.style.display = "block";
    _confirm_box.style.marginTop = window.pageYOffset - 100 + "px";
    _confirm_box.style.marginLeft = window.window.pageXOffset - 200 + "px";
}

window.show_clone_confirm_window = function(e) {
    window.onwheel = function(e) {
        e.preventDefault();
    }

    var href = e.href;

    _allow_clone.href = href;
    _proj_name_input.addEventListener("input", function() {_allow_clone.href = href + this.value});
    _body_opacity.style.display = "block";
    _body_opacity.style.marginTop = window.pageYOffset + "px";
    _body_opacity.style.marginRight = -window.pageXOffset + "px";
    _body_opacity.style.bottom = -window.pageYOffset + "px";
    _confirm_clone_box.style.display = "block";
    _confirm_clone_box.style.marginTop = window.pageYOffset - 100 + "px";
    _confirm_clone_box.style.marginLeft = window.window.pageXOffset - 200 + "px";
}

})();
