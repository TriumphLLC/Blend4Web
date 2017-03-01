"use strict";

;(function() {

var _conf_project_apps = null;
var _conf_project_engine_type = null;
var _conf_project_opt_level = null;
var _conf_use_physics = null;
var _conf_js_ignore = null;
var _conf_css_ignore = null;
var _conf_build_ignore = null;

var _conf_title = null;
var _conf_author = null;

var _conf_assets_path_dest = null;
var _conf_assets_path_prefix = null;
var _conf_ignore = null;

var _conf_dev_proj_path = null;
var _conf_blender_exec = null;

var _conf_url_params = null

var _blender_exec = null;

var _save_config = null;

var _apps = null;
var _build_ignore = null;
var _css_ignore = null;
var _js_ignore = null;
var _use_physics = null;

var _author = null;
var _title = null;

var _assets_path_dest = null
var _assets_path_prefix = null
var _ignore = null

var _url_params = null

var CONF_PARAMS = {};
var WARNINGS = {};
var ERRORS = {};

function onload() {
    cache_dom();
    cache_conf_params();
    check_conf_params();

    define_engine_type();
    define_opt_level();
    define_checkbox();

    add_listeners();
}

function is_changed() {
    return !!_use_physics.checked != (CONF_PARAMS["use_physics"] == "True" || !CONF_PARAMS["use_physics"]) ||
           _build_ignore.value != CONF_PARAMS["build_ignore"] ||
           _apps.value != CONF_PARAMS["apps"] ||
           _assets_path_dest.value != CONF_PARAMS["assets_path_dest"] ||
           _assets_path_prefix.value != CONF_PARAMS["assets_path_prefix"] ||
           _ignore.value != CONF_PARAMS["ignore"] ||
           _author.value != CONF_PARAMS["author"] ||
           _title.value != CONF_PARAMS["title"] ||
           _url_params.value != CONF_PARAMS["url_params"] ||
           _blender_exec.value != CONF_PARAMS["blender_exec"] ||
           document.querySelector("[name=project_opt_level]:checked").value != CONF_PARAMS["opt_level"] ||
           _css_ignore.value != CONF_PARAMS["css_ignore"] ||
           _js_ignore.value != CONF_PARAMS["js_ignore"] ||
           _js_ignore.value != CONF_PARAMS["js_ignore"] ||
           _js_ignore.value != CONF_PARAMS["js_ignore"] ||
           _build_ignore.value != CONF_PARAMS["build_ignore"];
}

function check_conf_params() {
}

function cache_conf_params() {
    if (_conf_project_engine_type)
        CONF_PARAMS["engine_type"] = _conf_project_engine_type.value;

    if (_conf_project_opt_level)
        CONF_PARAMS["opt_level"] = _conf_project_opt_level.value;

    if (_conf_use_physics)
        CONF_PARAMS["use_physics"] = _conf_use_physics.value;

    if (_conf_project_apps)
        CONF_PARAMS["apps"] = _conf_project_apps.value;

    if (_conf_js_ignore)
        CONF_PARAMS["js_ignore"] = _conf_js_ignore.value;

    if (_conf_css_ignore)
        CONF_PARAMS["css_ignore"] = _conf_css_ignore.value;

    if (_conf_build_ignore)
        CONF_PARAMS["build_ignore"] = _conf_build_ignore.value;

    if (_conf_author)
        CONF_PARAMS["author"] = _conf_author.value;

    if (_conf_title)
        CONF_PARAMS["title"] = _conf_title.value;

    if (_conf_blender_exec)
        CONF_PARAMS["blender_exec"] = _conf_blender_exec.value;

    if (_conf_assets_path_dest)
        CONF_PARAMS["assets_path_dest"] = _conf_assets_path_dest.value;

    if (_conf_assets_path_prefix)
        CONF_PARAMS["assets_path_prefix"] = _conf_assets_path_prefix.value;

    if (_conf_ignore)
        CONF_PARAMS["ignore"] = _conf_ignore.value;

    if (_conf_url_params)
        CONF_PARAMS["url_params"] = _conf_url_params.value;
}

function define_checkbox() {
    if (_conf_use_physics.value == "True" || !_conf_use_physics.value)
        use_physics.setAttribute("checked", "");
}

function add_listeners() {
    _blender_exec.addEventListener("input", blender_exec_oninput);

    _apps.addEventListener("input", apps_oninput);
    _build_ignore.addEventListener("input", build_ignore_oninput);
    _css_ignore.addEventListener("input", css_ignore_oninput);
    _js_ignore.addEventListener("input", js_ignore_oninput);

    sim_lev.addEventListener("change", opt_level_oninput);
    adv_lev.addEventListener("change", opt_level_oninput);
    white_lev.addEventListener("change", opt_level_oninput);

    _use_physics.addEventListener("change", use_physics_oninput);

    _title.addEventListener("input", title_oninput);
    _author.addEventListener("input", author_oninput);

    _assets_path_dest.addEventListener("input", assets_path_dest_oninput);
    _assets_path_prefix.addEventListener("input", assets_path_prefix_oninput);
    _ignore.addEventListener("input", ignore_oninput);

    _url_params.addEventListener("input", url_params_oninput);
}

function assets_path_dest_oninput() {
    if (_assets_path_dest.value != CONF_PARAMS["assets_path_dest"])
        _assets_path_dest.style.outlineColor = "#cac729";
    else
        _assets_path_dest.style.outlineColor = "";

    check_save_btn();
}

function assets_path_prefix_oninput() {
    if (_assets_path_prefix.value != CONF_PARAMS["assets_path_prefix"])
        _assets_path_prefix.style.outlineColor = "#cac729";
    else
        _assets_path_prefix.style.outlineColor = "";

    check_save_btn();
}

function ignore_oninput() {
    if (_ignore.value != CONF_PARAMS["ignore"])
        _ignore.style.outlineColor = "#cac729";
    else
        _ignore.style.outlineColor = "";

    check_save_btn();
}

function url_params_oninput() {
    if (_url_params.value != CONF_PARAMS["url_params"])
        _url_params.style.outlineColor = "#cac729";
    else
        _url_params.style.outlineColor = "";

    check_save_btn();
}

function title_oninput() {
    if (_title.value != CONF_PARAMS["title"])
        _title.style.outlineColor = "#cac729";
    else
        _title.style.outlineColor = "";

    check_save_btn();
}

function author_oninput() {
    if (_author.value != CONF_PARAMS["author"])
        _author.style.outlineColor = "#cac729";
    else
        _author.style.outlineColor = "";

    check_save_btn();
}

function opt_level_oninput() {
    if (document.querySelector("[name=project_opt_level]:checked").value != CONF_PARAMS["opt_level"]) {
        sim_lev.nextElementSibling.classList.remove("changed");
        adv_lev.nextElementSibling.classList.remove("changed");
        white_lev.nextElementSibling.classList.remove("changed");

        document.querySelector("[name=project_opt_level]:checked").nextElementSibling.classList.add("changed");
    } else {
        sim_lev.nextElementSibling.classList.remove("changed");
        adv_lev.nextElementSibling.classList.remove("changed");
        white_lev.nextElementSibling.classList.remove("changed");

        document.querySelector("[name=project_opt_level]:checked").nextElementSibling.classList.remove("changed");
    }

    check_save_btn();
}

function check_save_btn() {
    if (is_changed()) {
        _save_config.classList.add("active");
        _save_config.removeEventListener("click", onsaveconfig);
        _save_config.addEventListener("click", onsaveconfig);
    } else {
        _save_config.classList.remove("active");
        _save_config.removeEventListener("click", onsaveconfig);
    }
}

function use_physics_oninput() {
    if (!!_use_physics.checked != (CONF_PARAMS["use_physics"] == "True" || !CONF_PARAMS["use_physics"]))
        _use_physics.nextElementSibling.classList.add("changed");
    else
        _use_physics.nextElementSibling.classList.remove("changed");

    check_save_btn();
}

function css_ignore_oninput() {
    if (_css_ignore.value != CONF_PARAMS["css_ignore"])
        _css_ignore.style.outlineColor = "#cac729";
    else
        _css_ignore.style.outlineColor = "";

    check_save_btn();
}

function js_ignore_oninput() {
    if (_js_ignore.value != CONF_PARAMS["js_ignore"])
        _js_ignore.style.outlineColor = "#cac729";
    else
        _js_ignore.style.outlineColor = "";

    check_save_btn();
}

function build_ignore_oninput() {
    if (_build_ignore.value != CONF_PARAMS["build_ignore"])
        _build_ignore.style.outlineColor = "#cac729";
    else
        _build_ignore.style.outlineColor = "";

    check_save_btn();
}

function apps_oninput() {
    if (_apps.value != CONF_PARAMS["apps"])
        _apps.style.outlineColor = "#cac729";
    else
        _apps.style.outlineColor = "";

    check_save_btn();
}

function blender_exec_oninput() {
    if (_blender_exec.value != CONF_PARAMS["blender_exec"])
        _blender_exec.style.outlineColor = "#cac729";
    else
        _blender_exec.style.outlineColor = "";

    check_save_btn();
}

function onsaveconfig() {
    var xhr = new XMLHttpRequest();

    xhr.open("POST", '/save_config/');
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.send("&opt_level=" + encodeURIComponent(document.querySelector("[name=project_opt_level]:checked").value) +
             "&use_physics=" + encodeURIComponent(_use_physics.checked || "") +
             "&author=" + encodeURIComponent(_author.value || "") +
             "&apps=" + encodeURIComponent(_apps.value || "") +
             "&css_ignore=" + encodeURIComponent(_css_ignore.value || "") +
             "&js_ignore=" + encodeURIComponent(_js_ignore.value || "") +
             "&build_ignore=" + encodeURIComponent(_build_ignore.value || "") +
             "&url_params=" + encodeURIComponent(_url_params.value || "") +
             "&title=" + encodeURIComponent(_title.value || "") +
             "&proj_path=" + encodeURIComponent(_conf_dev_proj_path.value) +
             "&blender_exec=" + encodeURIComponent(_blender_exec.value) +
             "&assets_path_dest=" + encodeURIComponent(_assets_path_dest.value) +
             "&assets_path_prefix=" + encodeURIComponent(_assets_path_prefix.value) +
             "&ignore=" + encodeURIComponent(_ignore.value));

    xhr.onreadystatechange = function() {
        if (this.readyState != 4)
            return;

        if (this.status == 200)
            location.reload();
    }
}

function define_engine_type() {
    var engine_type = _conf_project_engine_type.value;

    switch(engine_type) {
    case "external":
    case "copy":
        proj_copy.setAttribute("checked", "");

        break;
    case "compile":
        proj_compile.setAttribute("checked", "");

        break;
    case "none":
        proj_none.setAttribute("checked", "");
        _apps.setAttribute("disabled", "");
        _js_ignore.setAttribute("disabled", "");
        _css_ignore.setAttribute("disabled", "");
        _build_ignore.setAttribute("disabled", "");
        _use_physics.setAttribute("disabled", "");
        _assets_path_dest.setAttribute("disabled", "");
        _assets_path_prefix.setAttribute("disabled", "");
        _ignore.setAttribute("disabled", "");
        _url_params.setAttribute("disabled", "");
        sim_lev.setAttribute("disabled", "");
        adv_lev.setAttribute("disabled", "");
        white_lev.setAttribute("disabled", "");

        break;
    case "webplayer_html":
        proj_html.setAttribute("checked", "");
        sim_lev.setAttribute("disabled", "");
        adv_lev.setAttribute("disabled", "");
        white_lev.setAttribute("disabled", "");
        _use_physics.setAttribute("disabled", "");
        _apps.setAttribute("disabled", "");
        _js_ignore.setAttribute("disabled", "");
        _css_ignore.setAttribute("disabled", "");
        _build_ignore.setAttribute("disabled", "");

        break;
    case "webplayer_json":
        proj_json.setAttribute("checked", "");
        sim_lev.setAttribute("disabled", "");
        adv_lev.setAttribute("disabled", "");
        white_lev.setAttribute("disabled", "");
        _use_physics.setAttribute("disabled", "");
        _apps.setAttribute("disabled", "");
        _js_ignore.setAttribute("disabled", "");
        _css_ignore.setAttribute("disabled", "");
        _build_ignore.setAttribute("disabled", "");

        break;
    }
}

function define_opt_level() {
    var opt_level = _conf_project_opt_level.value;
    var engine_type = _conf_project_engine_type.value;

    switch(opt_level) {
    case "simple":
        sim_lev.setAttribute("checked", "");
        break;
    case "advanced":
        adv_lev.setAttribute("checked", "");
        break;
    case "whitespace":
        white_lev.setAttribute("checked", "");
        break;
    default:
        sim_lev.setAttribute("checked", "");
        break;
    }
}

function cache_dom() {
    _conf_project_apps = document.querySelector("#conf_project_apps");
    _conf_project_engine_type = document.querySelector("#conf_project_engine_type");
    _conf_project_opt_level = document.querySelector("#conf_project_opt_level");
    _conf_use_physics = document.querySelector("#conf_use_physics");
    _conf_js_ignore = document.querySelector("#conf_js_ignore");
    _conf_css_ignore = document.querySelector("#conf_css_ignore");
    _conf_build_ignore = document.querySelector("#conf_build_ignore");

    _conf_assets_path_dest = document.querySelector("#conf_assets_path_dest");
    _conf_assets_path_prefix = document.querySelector("#conf_assets_path_prefix");
    _conf_ignore = document.querySelector("#conf_ignore");
    _conf_dev_proj_path = document.querySelector("#conf_dev_proj_path");
    _conf_blender_exec = document.querySelector("#blender_exec");
    _conf_url_params = document.querySelector("#conf_url_params");

    _blender_exec = document.querySelector("#blender_exec");

    _save_config = document.querySelector("#save_config");

    _conf_title = document.querySelector("#conf_title");
    _conf_author = document.querySelector("#conf_author");

    _apps = document.querySelector("#apps");
    _title = document.querySelector("#title");
    _author = document.querySelector("#author");
    _build_ignore = document.querySelector("#build_ignore");
    _css_ignore = document.querySelector("#css_ignore");
    _js_ignore = document.querySelector("#js_ignore");
    _use_physics = document.querySelector("#use_physics");

    _assets_path_dest = document.querySelector("#assets_path_dest");
    _assets_path_prefix = document.querySelector("#assets_path_prefix");
    _ignore = document.querySelector("#ignore");

    _url_params = document.querySelector("#url_params");
}

window.addEventListener("load", onload);

})();
