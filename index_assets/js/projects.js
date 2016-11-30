"use strict";

;(function() {

var _form = null;
var _req_input = null;
var _body_opacity = null;
var _confirm_box = null;
var _deny_remove = null;
var _allow_remove = null;

function onload() {
    cache_dom_elems();
    add_listeners();
}

function cache_dom_elems() {
    _form = document.querySelector("form");
    _req_input = _form.querySelector("input[name=zip_file]");
    _body_opacity = document.querySelector("#body_opacity");
    _confirm_box = document.querySelector("#confirm_box");
    _deny_remove = document.querySelector("#deny_remove");
    _allow_remove = document.querySelector("#allow_remove");
}

function add_listeners() {
    _req_input.addEventListener("change", onsubmit);
    _deny_remove.removeEventListener("click", hide_confirm_window);
    _deny_remove.addEventListener("click", hide_confirm_window);
}

function onsubmit() {
    _form.submit();
}

function hide_confirm_window() {
    document.body.style.overflow = "";
    _body_opacity.style.display = "";
    _confirm_box.style.display = "";
}

window.addEventListener("load", onload);

window.show_confirm_window = function(e) {
    _allow_remove.href = e.href;
    document.body.style.overflow = "hidden";
    _body_opacity.style.display = "block";
    _body_opacity.style.marginTop = window.pageYOffset + "px";
    _body_opacity.style.marginRight = -window.pageXOffset + "px";
    _body_opacity.style.bottom = -window.pageYOffset + "px";
    _confirm_box.style.display = "block";
    _confirm_box.style.marginTop = window.pageYOffset - 100 + "px";
    _confirm_box.style.marginLeft = window.window.pageXOffset - 200 + "px";
}

})();
