;(function() {

    var CHECK_ELEMS = {
        "bundled_app": {
            "hide": ["proj_ext", "proj_copy", "proj_compile"],
            "show": ["proj_upd"],
            "check": ["proj_upd"]
        },
        "json_wp_app": {
            "hide": ["adv_lev", "white_lev", "sim_lev", "project_copy_app_templates"],
            "show": [],
            "check": []
        },
        "html_wp_app": {
            "hide": ["adv_lev", "white_lev", "sim_lev", "project_copy_app_templates"],
            "show": [],
            "check": []
        }
    }

    var form   = null;
    var inputs = [];

    function submit_cb() {
        var project_name = "";
        var url_params = [];

        for (var i = inputs.length; i--;) {
            var input = inputs[i];
            var val   = input.value;

            switch (input.name) {
            case "project_name":
                if (!val) {
                    input.style.cssText += "border:1px solid red;";

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
            case "project_bundle":
                if (input.checked)
                    form.action += "-B/";
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

    function bundle_change_cb(e) {
        check_target(e.target.checked, "bundled_app");
    }

    function wp_json_app_change_cb(e) {
        check_target(e.target.checked, "json_wp_app");
    }

    function wp_html_app_change_cb(e) {
        check_target(e.target.checked, "html_wp_app");
    }

    function check_inputs(e) {
        var type = e.target.type;

        if (type != "radio" && type != "checkbox")
            return;

        if (type == "checkbox" && e.target.id != "project_bundle")
            return;

        if (type == "radio" && (e.target.id == "sim_lev" || e.target.id == "adv_lev" || e.target.id == "white_lev"))
            return;

        for (var i = inputs.length; i--;)
            inputs[i].disabled = false;

        var is_checked = e.target.checked;

        switch (e.target.id) {
        case "project_bundle":
            proj_upd.disabled = !is_checked;

            if (!is_checked && proj_upd.checked) {
                proj_upd.checked = is_checked;
                proj_ext.checked = !is_checked;
            } else {
                proj_ext.disabled = is_checked;
                proj_compile.disabled = is_checked;
                proj_copy.disabled = is_checked;

                if (!(proj_html.checked || proj_json.checked))
                    proj_upd.checked = is_checked;
            }

            if (is_checked && !sim_lev.checked && !adv_lev.checked && !white_lev.checked)
                sim_lev.checked = true;

            disable_webplayer_params();

            break;
        case "proj_html":
            project_copy_app_templates.disabled = is_checked;
            project_copy_app_templates.checked = !is_checked;
            sim_lev.disabled = is_checked;
            sim_lev.checked = !is_checked;
            adv_lev.disabled = is_checked;
            adv_lev.checked = !is_checked;
            white_lev.disabled = is_checked;
            white_lev.checked = !is_checked;

            if (project_bundle.checked) {
                proj_ext.disabled = is_checked;
                proj_compile.disabled = is_checked;
                proj_copy.disabled = is_checked;
            } else
                proj_upd.disabled = true;

            break;
        case "proj_json":
            project_copy_app_templates.disabled = is_checked;
            project_copy_app_templates.checked = !is_checked;
            sim_lev.disabled = is_checked;
            sim_lev.checked = !is_checked;
            adv_lev.disabled = is_checked;
            adv_lev.checked = !is_checked;
            white_lev.disabled = is_checked;
            white_lev.checked = !is_checked;

            if (project_bundle.checked) {
                proj_ext.disabled = is_checked;
                proj_compile.disabled = is_checked;
                proj_copy.disabled = is_checked;
            } else
                proj_upd.disabled = true;

            break;
        case "proj_copy":
        case "proj_upd":
        case "proj_ext":
        case "proj_compile":
            if (!sim_lev.checked && !adv_lev.checked && !white_lev.checked)
                sim_lev.checked = true;

            if (project_bundle.checked) {
                proj_ext.disabled = is_checked;
                proj_compile.disabled = is_checked;
                proj_copy.disabled = is_checked;
            } else
                proj_upd.disabled = true;

            disable_webplayer_params();

            break;
        }
    }

    function disable_webplayer_params() {
        wpp_show_fps.disabled = true;
        wpp_autorotate.disabled = true;
        wpp_no_social.disabled = true;
        wpp_alpha.disabled = true;
        wpp_compressed_textures.disabled = true;

        wpp_show_fps.checked = false;
        wpp_autorotate.checked = false;
        wpp_no_social.checked = false;
        wpp_alpha.checked = false;
        wpp_compressed_textures.checked = false;
    }

    function check_target(is_checked, name) {
        var elems_array = CHECK_ELEMS[name];

        for (var i = inputs.length; i--;) {
            var input = inputs[i];

            if (elems_array["hide"].indexOf(input.id) != -1) {
                input.disabled = is_checked;
            }

            if (is_checked && elems_array["show"].indexOf(input.id) != -1) {
                input.disabled = !is_checked;
            }

            if (!is_checked && elems_array["show"].indexOf(input.id) != -1) {
                input.disabled = !is_checked;
            }
        }
    }

    function define_inputs() {
        form = document.forms[0];

        if (!form)
            return;

        disable_webplayer_params();

        form.addEventListener("change", check_inputs, true);

        inputs = form.querySelectorAll('input');

        var button = form.querySelector('button');

        button.addEventListener("click", submit_cb);
    }

    window.addEventListener("load", define_inputs);

}());
