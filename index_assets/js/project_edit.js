"use strict";

;(function() {

var _xhr = new XMLHttpRequest();
var _editor;
var _edit_files = [];
var _save_file = null;
var _save_file_as = null;
var _new_file = null;
var _body_opacity = null;
var _new_file_box = null;
var _close_new_file_box = null;
var _create_new_file = null;
var _body = null;
var _opened_file;
var _is_file_changed = false;
var _cursor_pos = {"line": 0, "ch": 0};
var _scroll_info = {"left": 0, "top": 0};
var _config_file = ".b4w_project";

function onload() {
    cache_dom_elems();

    _editor = CodeMirror.fromTextArea(cm_editor, {
        lineNumbers: true,
        indentUnit: 4,
        tabSize: 4,
        tabindex: 4,
        lineWrapping: true,
        lineSeparator: null,
        keyMap: "sublime",
        fixedGutter: true,
        indentWithTabs: false,
        mode: "properties",
        autofocus: true,
        viewportMargin: 100
    })

    _editor.setOption("extraKeys", {
      Tab: function(cm) {
        var spaces = Array(cm.getOption("indentUnit") + 1).join(" ");
        cm.replaceSelection(spaces);
      }
    })

    reset_editor();
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
    _save_file_as = document.querySelector("#save_file_as");
    _new_file = document.querySelector("#new_file");
    _body_opacity = document.querySelector("#body_opacity");
    _new_file_box = document.querySelector("#new_file_box");
    _close_new_file_box = document.querySelector("#close_new_file_box");
    _create_new_file = document.querySelector("#create_new_file");
    _body = document.body;
}

function onkedown(e) {
    if (e.keyCode == 13) {
        confirm_creating();

        return;
    }

    if (e.keyCode == 27) {
        hide_new_file_box();

        return;
    }
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
            document.removeEventListener("keydown", onkeydownsave);
            _save_file.classList.remove("active");

            CodeMirror.off(_editor, "change", onchange);
            CodeMirror.on(_editor, "change", onchange);

            var active_file = document.querySelector(".edit_file.active");

            if (active_file)
                active_file.classList.remove("active");

            var cur_file = document.querySelector('[data-path="' + _opened_file + '"]');
            cur_file.classList.add("active");
        }
    }
}

function onchange() {
    if (!_is_file_changed) {
        _is_file_changed = true;
        _save_file.removeEventListener("click", save_file);
        _save_file.addEventListener("click", save_file);
        document.removeEventListener("keydown", onkeydownsave);
        document.addEventListener("keydown", onkeydownsave);

        _save_file.classList.add("active");
    }
}

function add_listeners() {
    for (var i = _edit_files.length; i--;)
        _edit_files[i].addEventListener("click", onclick);

    _new_file.addEventListener("click", create_new_file);
    _close_new_file_box.addEventListener("click", hide_new_file_box);
    _create_new_file.addEventListener("click", confirm_creating);
    _save_file_as.addEventListener("click", save_file_as);
}

function save_file_as() {
    show_new_file_box();
}

function confirm_creating() {
    var file_name = document.querySelector("#new_file_name");

    _xhr.open("POST", '/create_file/');
    _xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    _xhr.send("&file_name=" + encodeURIComponent(file_name.value) +
              "&proj_path=" + encodeURIComponent(proj_path.value) +
              "&body=" + encodeURIComponent(_editor.doc.getValue()));

    _xhr.onreadystatechange = function(e) {
        if (this.readyState != 4)
            return;

        if (this.status == 200) {
            _is_file_changed = false;
            hide_new_file_box();

            var last_file = document.querySelector("[data-path]:last-of-type");
            var div = document.createElement("div");
            var sdk_path = document.querySelector("#sdk_path");

            div.className = "edit_file";
            div.setAttribute("data-path", sdk_path.value + "%2F" + this.responseText);
            div.innerText = decodeURIComponent(this.responseText);

            last_file.parentElement.appendChild(div);
            div.addEventListener("click", onclick);
            onclick.call(div);
        }

        if (this.status == 400) {
            var file_name_error = document.querySelector("#file_name_error");

            file_name_error.innerText = this.responseText;
        }
    }
}

function create_new_file() {
    var active_file = document.querySelector(".edit_file.active");

    if (active_file)
        active_file.classList.remove("active");

    reset_editor();

    _editor.setOption("mode", "properties");
}

function reset_editor() {
    CodeMirror.off(_editor, "change", onchange);
    _opened_file = null;
    _save_file.classList.remove("active");
    _editor.doc.clearHistory();
    _editor.doc.setValue("");
    _is_file_changed = false;
    _editor.doc.markClean()
    _editor.doc.setCursor({"line": 0, "ch": 0});
    _editor.refresh();
    _editor.focus();
    CodeMirror.on(_editor, "change", onchange);
}

function show_body_opacity() {
    _body_opacity.style.display = "initial";
    _body.style.overflow = "hidden";
    _body_opacity.style.marginTop = window.pageYOffset + "px";
    _body_opacity.style.marginRight = -window.pageXOffset + "px";
    _body_opacity.style.bottom = -window.pageYOffset + "px";
}

function hide_body_opacity() {
    _body.style.overflow = "initial";
    _body_opacity.style.display = "none";
}

function show_new_file_box() {
    show_body_opacity();

    var file_name = document.querySelector("#new_file_name");

    _new_file_box.style.display = "initial";
    _new_file_box.style.marginTop = window.pageYOffset - 100 + "px";
    _new_file_box.style.marginLeft = window.pageXOffset - 200 + "px";

    window.addEventListener("keydown", onkedown);

    file_name.setAttribute("autofocus", true);

    file_name.focus();
}

function onkeydownsave(e) {
    if (e.ctrlKey && e.keyCode == 83) {
        e.preventDefault();
        e.stopPropagation();

        save_file();
    }
}

function hide_new_file_box() {
    window.removeEventListener("keydown", onkedown);

    _new_file_box.style.display = "none";

    hide_body_opacity();

    var file_name = document.querySelector("#new_file_name");

    file_name.value = "";
}

function save_file() {
    if (!_opened_file) {
        save_file_as();

        return;
    }

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
