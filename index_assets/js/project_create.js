;(function() {

var INPUTS = {
    "json_wp_app": {
        "hide": ["adv_lev",
                 "sim_lev",
                 "project_copy_app_templates",
                 "white_lev"],
        "check": []
    },
    "html_wp_app": {
        "hide": ["adv_lev",
                 "sim_lev",
                 "project_copy_app_templates",
                 "white_lev"],
        "check": []
    }
}

var form = null;
var _inputs = [];

var _exists_names = [];


function is_proj_exists(proj_name) {
    return _exists_names.indexOf(proj_name) != -1;
}

function get_proj_names() {
    var xhr = new XMLHttpRequest();

    xhr.open("GET", '/get_proj_names/');
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.send(null)

    xhr.onreadystatechange = function() {
        if (this.readyState != 4)
            return;

        if (this.status == 200)
            _exists_names = JSON.parse(this.responseText);
    }
}


function submit_cb() {
    var project_name = "";
    var url_params = [];

    for (var i = _inputs.length; i--;) {
        var input = _inputs[i];
        var val   = input.value;

        switch (input.name) {
        case "project_name":
            if (!val) {
                input.style.cssText += "border:1px solid red;";
                input.scrollIntoView();

                var empty_error = document.querySelector("#empty_error");
                var exist_error = document.querySelector("#exist_error");

                exist_error.style.display = "none";
                empty_error.style.display = "block";

                return;
            }

            if (is_proj_exists(val)) {
                input.style.cssText += "border:1px solid red;";
                input.scrollIntoView();

                var empty_error = document.querySelector("#empty_error");
                var exist_error = document.querySelector("#exist_error");

                empty_error.style.display = "none";
                exist_error.style.display = "block";

                return;
            }

            project_name = val;
            break;
        case "project_title":
            if (val)
                form.action += "-T/" + val + "/";
            break;
        case "project_author":
            if (val)
                form.action += "-C/" + val + "/";
            break;
        case "project_copy_app_templates":
            if (input.checked && !input.disabled)
                form.action += "-A/";
            break;
        case "project_copy_mat_library":
            if (input.checked && !input.disabled)
                form.action += "-m/";
            break;
        case "project_copy_scene_templates":
            if (input.checked)
                form.action += "-S/";
            break;
        case "project_copy_project_script":
            if (input.checked)
                form.action += "-P/";
            break;
        case "project_engine_type":
            if (input.checked)
                form.action += "-t/" + val + "/";
            break;
        case "project_opt_level":
            if (input.checked)
                form.action += "-o/" + val + "/";
            break;

        case "show_fps":
        case "autorotate":
        case "no_social":
        case "alpha":
        case "compressed_textures":
        case "compressed_textures_pvr":
        case "min_capabilities":
        case "compressed_gzip":
            if (input.checked)
                url_params.push(input.name);
            break;
        }
    }

    form.innerHTML = "";

    if (url_params.length)
        form.action += "-U/" + url_params.join(",") + "/";

    form.action += project_name + "/";

    window.open(form.action,"_self")
}

function set_wp_cb(is_checked) {
    check_input(is_checked, "json_wp_app");

    if (is_checked)
        change_wp_params(is_checked);
}

function set_html_cb(is_checked) {
    check_input(is_checked, "html_wp_app");

    if (is_checked)
        change_wp_params(is_checked);

    wpp_compressed_gzip.disabled = true;
}

function change_inputs(e) {
    var input_type = e.target.type;

    // check radio inputs only
    if (input_type != "radio")
        return;

    var input_id = e.target.id;

    // optimization levels have no deps
    if (input_id == "sim_lev" || input_id == "adv_lev" || input_id == "white_lev")
        return;

    var is_checked = e.target.checked;

    for (var i = _inputs.length; i--;)
        _inputs[i].disabled = false;

    switch (input_id) {
    case "proj_html":
        set_html_cb(is_checked);
        break;
    case "proj_json":
        set_wp_cb(is_checked);
        break;
    case "proj_none":
        sim_lev.disabled = is_checked;
        sim_lev.checked = !is_checked;
        adv_lev.disabled = is_checked;
        adv_lev.checked = !is_checked;
        white_lev.disabled = is_checked;
        white_lev.checked = !is_checked;
        project_copy_app_templates.disabled = is_checked;

        change_wp_params();

        break;
    case "proj_copy":
    case "proj_compile":
        if (!sim_lev.checked && !adv_lev.checked && !white_lev.checked)
            sim_lev.checked = true;

        change_wp_params();

        break;
    }
}

function change_wp_params(enabled) {
    enabled = enabled || false;

    wpp_show_fps.disabled = !enabled;
    wpp_autorotate.disabled = !enabled;
    wpp_no_social.disabled = !enabled;
    wpp_alpha.disabled = !enabled;
    wpp_compressed_textures.disabled = !enabled;
    wpp_compressed_textures_pvr.disabled = !enabled;
    wpp_compressed_gzip.disabled = !enabled;
    wpp_min_capabilities.disabled = !enabled;

    if (!enabled) {
        wpp_show_fps.checked = false;
        wpp_autorotate.checked = false;
        wpp_no_social.checked = false;
        wpp_alpha.checked = false;
        wpp_compressed_textures.checked = false;
        wpp_compressed_textures_pvr.checked = false;
        wpp_compressed_gzip.checked = false;
        wpp_min_capabilities.checked = false;
    }
}

function check_input(is_checked, name) {
    var elems_array = INPUTS[name];

    for (var i = _inputs.length; i--;) {
        var input = _inputs[i];

        if (is_checked && elems_array["hide"].indexOf(input.id) != -1)
            input.disabled = true;

        if (is_checked && elems_array["check"].indexOf(input.id) != -1)
            input.checked = true;
    }
}

function define_inputs() {
    get_proj_names();

    form = document.forms[0];

    if (!form)
        return;

    change_wp_params();

    form.addEventListener("change", change_inputs, true);

    _inputs = form.querySelectorAll('input');

    var button = form.querySelector('button');

    button.addEventListener("click", submit_cb);
}

window.addEventListener("load", define_inputs);

}());
