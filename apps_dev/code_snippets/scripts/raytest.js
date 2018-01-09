import b4w from "blend4web";

var m_anim    = b4w.animation;
var m_app     = b4w.app;
var m_cam     = b4w.camera;
var m_cfg     = b4w.config;
var m_cont    = b4w.container;
var m_cons    = b4w.constraints;
var m_ctl     = b4w.controls;
var m_data    = b4w.data;
var m_math    = b4w.math;
var m_obj     = b4w.objects;
var m_phy     = b4w.physics;
var m_quat    = b4w.quat;
var m_scenes  = b4w.scenes;
var m_trans   = b4w.transform;
var m_tsr     = b4w.tsr;
var m_util    = b4w.util;
var m_vec3    = b4w.vec3;
var m_version = b4w.version;

var DEBUG = (m_version.type() === "DEBUG");

var APP_ASSETS_PATH = m_cfg.get_std_assets_path() + "code_snippets/raytest/";

export function init() {
    m_app.init({
        autoresize: true,
        callback: init_cb,
        canvas_container_id: "main_canvas_container",
        physics_enabled: true,
        show_fps: true,
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
    m_data.load(APP_ASSETS_PATH + "raytest.json", load_cb);
}

function load_cb(data_id) {
    init_logic();
}

function init_logic() {

    var from = new Float32Array(3);
    var pline = m_math.create_pline();
    var to = new Float32Array(3);

    var decal_num = 0;
    var decal_src = m_scenes.get_object_by_name("Decal");

    var decal_tsr = m_tsr.create();
    var obj_tsr = m_tsr.create();
    var decal_rot = m_quat.create();

    var ray_test_cb = function(id, hit_fract, obj_hit, hit_time, hit_pos, hit_norm) {

        var decal = m_obj.copy(decal_src, "decal" + String(++decal_num), false);
        m_scenes.append_object(decal);

        m_tsr.set_trans(hit_pos, decal_tsr);

        m_quat.rotationTo(m_util.AXIS_Z, hit_norm, decal_rot);
        m_trans.set_rotation_v(decal, decal_rot);
        m_tsr.set_quat(decal_rot, decal_tsr);

        if (obj_hit && m_anim.is_animated(obj_hit)) {
            m_trans.get_tsr(obj_hit, obj_tsr);

            m_tsr.invert(obj_tsr, obj_tsr);
            m_tsr.multiply(obj_tsr, decal_tsr, decal_tsr);

            var offset = m_tsr.get_trans_view(decal_tsr);
            var rot_offset = m_tsr.get_quat_view(decal_tsr);
            m_cons.append_stiff(decal, obj_hit, offset, rot_offset);
        }

        m_trans.set_tsr(decal, decal_tsr);
    }

    var mouse_cb = function(e) {
        var x = e.clientX;
        var y = e.clientY;
        m_cam.calc_ray(m_scenes.get_active_camera(), x, y, pline);
        m_math.get_pline_directional_vec(pline, to);

        m_vec3.scale(to, 100, to);
        var obj_src = m_scenes.get_active_camera();
        var id = m_phy.append_ray_test_ext(obj_src, from, to, "ANY",
                ray_test_cb, true, false, true, true);
    }

    var cont = m_cont.get_container();
    cont.addEventListener("mousedown", mouse_cb, false);
}
