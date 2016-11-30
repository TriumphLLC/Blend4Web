"use strict";

;(function() {

var _xhr = new XMLHttpRequest();
var _editor;
var _edit_files = [];
var _save_file = null;
var _opened_file;
var _is_file_changed = false;
var _cursor_pos = {"line": 0, "ch": 0};
var _scroll_info = {"left": 0, "top": 0};

function onload() {
    cache_dom_elems();

    _editor = CodeMirror.fromTextArea(cm_editor, {
        lineNumbers: true,
        indentUnit: 4,
        tabSize: 4,
        lineWrapping: true,
        lineSeparator: null,
        keyMap: "sublime",
        fixedGutter: true,
        indentWithTabs: false,
        mode: "css",
        autofocus: true,
        viewportMargin: 100
    });

    add_listeners();

    window.onbeforeunload = function(e) {
        var message = "";

        if (_is_file_changed) {
            e.returnValue = message;

            return message;
        }
    }
}

function cache_dom_elems() {
    _edit_files = document.querySelectorAll(".edit_file");
    _save_file = document.querySelector("#save_file");
}

function onclick() {
    if (_is_file_changed) {
        var result = confirm("Do you want to leave this file?")

        if (!result)
            return;
    }

    _opened_file = this.getAttribute("data-path");
    _xhr.open("POST", '/get_file_body/');
    _xhr.send(_opened_file);

    var ext = this.getAttribute("data-path").split(".")[this.getAttribute("data-path").split(".").length - 1];
    var mode = "properties";

    switch (ext) {
    case "js":
        mode = "javascript";

        break;
    case "css":
        mode = "css";

        break;
    case "html":
        mode = "htmlmixed";

        break;
    }

    _xhr.onreadystatechange = function() {
        if (this.readyState != 4)
            return;

        if (this.status == 200) {
            _editor.setOption("mode", mode);
            _editor.doc.setValue(this.responseText);
            _editor.doc.setCursor(_cursor_pos);
            _editor.scrollTo(_scroll_info["left"], _scroll_info["top"]);
            _editor.doc.clearHistory();
            _cursor_pos = {"line": 0, "ch": 0};
            _scroll_info = {"left": 0, "top": 0};
            _is_file_changed = false;
            _save_file.removeEventListener("click", save_file);
            _save_file.classList.remove("active");

            CodeMirror.off(_editor, "change", onchange);
            CodeMirror.on(_editor, "change", onchange);
        }
    }
}

function onchange() {
    if (!_is_file_changed) {
        _is_file_changed = true;
        _save_file.removeEventListener("click", save_file);
        _save_file.addEventListener("click", save_file);
        _save_file.classList.add("active");
    }
}

function add_listeners() {
    for (var i = _edit_files.length; i--;)
        _edit_files[i].addEventListener("click", onclick);
}

function save_file() {
    _xhr.open("POST", '/save_file/');
    _xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    _xhr.send("body=" + encodeURIComponent(_editor.doc.getValue()) +
              "&file_name=" + encodeURIComponent(_opened_file));

    _xhr.onreadystatechange = function() {

        if (this.readyState != 4)
            return;

        if (this.status == 200) {
            var reloaded_file = document.querySelector('[data-path="' + _opened_file + '"]');

            if (reloaded_file) {
                _is_file_changed = false;
                _cursor_pos["line"] = _editor.doc.getCursor()["line"];
                _cursor_pos["ch"] = _editor.doc.getCursor()["ch"];
                _scroll_info["left"] = _editor.getScrollInfo()["left"];
                _scroll_info["top"] = _editor.getScrollInfo()["top"];

                onclick.call(reloaded_file);
            }
        }
    }
}

window.addEventListener("load", onload);

})();
