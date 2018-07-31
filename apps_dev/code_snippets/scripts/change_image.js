import b4w from "blend4web";

var m_data    = b4w.data;
var m_app     = b4w.app;
var m_cfg     = b4w.config;
var m_cont    = b4w.container;
var m_mouse   = b4w.mouse;
var m_tex     = b4w.textures;
var m_scenes  = b4w.scenes;
var m_version = b4w.version;

var DEBUG = (m_version.type() === "DEBUG");

var APP_ASSETS_PATH = m_cfg.get_assets_path() + "code_snippets/change_image/";
var TEX_ASSETS_PATH = APP_ASSETS_PATH + "textures/";

var _textures = [];
var _world = null;
var _wait_for_image_loading = false;
var _napkin_flag = false;
var _stand_1 = null;
var _stand_2 = null;

export function init() {
    m_app.init({
        canvas_container_id: "main_canvas_container",
        callback: init_cb,
        physics_enabled: false,
        alpha: true,
        show_fps: true,
        autoresize: true,
        assets_dds_available: !DEBUG,
        assets_min50_available: !DEBUG,
        console_verbose: true
    });
}

function init_cb(canvas_elem, success) {

    if (!success) {
        console.log("b4w init failure");
        return;
    }
    load();
}

function load() {
    m_data.load(APP_ASSETS_PATH + "change_image.json", load_cb);
}

function load_cb(data_id) {
    m_app.enable_camera_controls(false, false, false, null, true);
    var container = m_cont.get_canvas();
    _world = m_scenes.get_world_by_name("World");
    _stand_1 = m_scenes.get_object_by_name("stand");
    _stand_2 = m_scenes.get_object_by_name("stand_2");
    container.addEventListener("mousedown", main_canvas_clicked_cb, false);
    
    // Create images
    var tex_names = ["1_b.png",
                     "2_b.png",
                     "table_napkin_1.png",
                     "table_napkin_1_normal.png",
                     "table_napkin_2.png",
                     "table_napkin_2_normal.png"];
    for (var i = 0; i < tex_names.length; i++) {
        var tex = new Image();
        tex.src = TEX_ASSETS_PATH + tex_names[i];
        _textures.push(tex)
    }
}

function main_canvas_clicked_cb(e) {

    var x = m_mouse.get_coords_x(e);
    var y = m_mouse.get_coords_y(e);

    var obj = m_scenes.pick_object(x, y);
    if (obj) {
        switch(m_scenes.get_object_name(obj)) {
        case "Sphere_button_1":
            m_tex.replace_image(_world, "lightmap", _textures[0])
            m_tex.replace_image(_stand_1, "cubemap_slot", _textures[0]);
            break;
        case "Sphere_button_2":
            m_tex.replace_image(_world, "lightmap", _textures[1])
            m_tex.replace_image(_stand_1, "cubemap_slot", _textures[1]);
            break;
        case "table_napkin":
            if (_napkin_flag) {
                m_tex.replace_image(obj, "table_napkin", _textures[2]);
                m_tex.replace_image(obj, "table_napkin_normal", _textures[3]);
            } else {
                m_tex.replace_image(obj, "table_napkin", _textures[4]);
                m_tex.replace_image(obj, "table_napkin_normal", _textures[5]);
            }
            _napkin_flag = !_napkin_flag;
            break;
        default:
            return;
        }
    }
}