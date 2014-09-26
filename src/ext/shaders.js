"use strict";

/**
 * Shaders API. Used mostly for debugging purposes.
 * @module shaders
 */
b4w.module["shaders"] = function(exports, require) {

var config     = require("__config");
var m_print    = require("__print");
var extensions = require("__extensions");
var m_scenes   = require("__scenes");
var shaders    = require("__shaders");
var util       = require("__util");

var SHADERS = [
    {
        vert: "depth.glslv",
        frag: "depth.glslf",
        directives: {
            bool: [
                "SKINNED",
                "FRAMES_BLENDING",
                "WIND_BEND",
                "DETAIL_BEND",
                "VERTEX_ANIM",
                "TEXTURE_COLOR",
                "VERTEX_COLOR",
                "DEPTH_RGBA",
                "ALPHA",
                "CSM_SECTION1",
                "CSM_SECTION2",
                "CSM_SECTION3"
            ],
            number: [
                ["MAX_BONES", [100]]
            ],
            enumerated: [
                ["SHADOW_SOURCE", ["SHADOW_SOURCE_NONE", "SHADOW_SOURCE_MAP", "SHADOW_SOURCE_MASK"]]
            ]
        }
    },
    {
        vert: "color_id.glslv",
        frag: "color_id.glslf",
        directives: {
            bool: [
                "SKINNED",
                "FRAMES_BLENDING",
                "WIND_BEND",
                "DETAIL_BEND",
                "VERTEX_ANIM",
                "TEXTURE_COLOR",
                "ALPHA_CLIP"
            ],
            number: [
                ["MAX_BONES", [100]]
            ],
            enumerated: []
        }
    },
    {
        vert: "postprocessing/postprocessing.glslv",
        frag: "postprocessing/anaglyph.glslf",
        directives: {
            bool: [],
            number: [],
            enumerated: []
        }
    },
    {
        vert: "postprocessing/postprocessing.glslv",
        frag: "postprocessing/antialiasing.glslf",
        directives: {
            bool: [],
            number: [],
            enumerated: [
                ["AA_METHOD", ["AA_METHOD_PASS", "AA_METHOD_LIGHT", "AA_METHOD_QUALITY"]]
            ]
        }
    },
    {
        vert: "postprocessing/postprocessing.glslv",
        frag: "postprocessing/compositing.glslf",
        directives: {
            bool: [],
            number: [],
            enumerated: []
        }
    },
    {
        vert: "postprocessing/postprocessing.glslv",
        frag: "postprocessing/depth_pack.glslf",
        directives: {
            bool: ["DEPTH_RGBA"],
            number: [],
            enumerated: []
        }
    },
    {
        vert: "postprocessing/postprocessing.glslv",
        frag: "postprocessing/dof.glslf",
        directives: {
            bool: ["DEPTH_RGBA"],
            number: [],
            enumerated: []
        }
    },
    {
        vert: "postprocessing/postprocessing.glslv",
        frag: "postprocessing/edge.glslf",
        directives: {
            bool: ["DEPTH_RGBA"],
            number: [],
            enumerated: []
        }
    },
    {
        vert: "postprocessing/postprocessing.glslv",
        frag: "postprocessing/bloom_combine.glslf",
        directives: {
            bool: [],
            number: [],
            enumerated: []
        }
    },
    {
        vert: "postprocessing/postprocessing.glslv",
        frag: "postprocessing/luminance.glslf",
        directives: {
            bool: [],
            number: [],
            enumerated: []
        }
    },
    {
        vert: "postprocessing/postprocessing.glslv",
        frag: "postprocessing/luminance_av.glslf",
        directives: {
            bool: [],
            number: [],
            enumerated: []
        }
    },
    {
        vert: "postprocessing/postprocessing.glslv",
        frag: "postprocessing/luminance_trunced.glslf",
        directives: {
            bool: [],
            number: [],
            enumerated: []
        }
    },
    {
        vert: "postprocessing/god_rays.glslv",
        frag: "postprocessing/god_rays.glslf",
        directives: {
            bool: ["DEPTH_RGBA", "WATER_EFFECTS"],
            number: [["NUM_LIGHTS", [1, 10, 100]]],
            enumerated: []
        }
    },
    {
        vert: "postprocessing/postprocessing.glslv",
        frag: "postprocessing/god_rays_combine.glslf",
        directives: {
            bool: [],
            number: [],
            enumerated: []
        }
    },
    {
        vert: "special_skydome.glslv",
        frag: "procedural_skydome.glslf",
        directives: {
            number: [["NUM_LIGHTS", [1, 10, 100]]],
            enumerated: []
        }
    },
    {
        vert: "postprocessing/postprocessing.glslv",
        frag: "postprocessing/motion_blur.glslf",
        directives: {
            bool: [],
            number: [["MAX_STEPS", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 100]]],
            enumerated: []
        }
    },
    {
        vert: "postprocessing/postprocessing.glslv",
        frag: "postprocessing/postprocessing.glslf",
        directives: {
            bool: [],
            number: [],
            enumerated: [
                ["POST_EFFECT", [
                    "POST_EFFECT_NONE",
                    "POST_EFFECT_GRAYSCALE",
                    "POST_EFFECT_X_BLUR",
                    "POST_EFFECT_Y_BLUR"
                ]]
            ]
        }
    },
    {
        vert: "postprocessing/postprocessing.glslv",
        frag: "postprocessing/ssao.glslf",
        directives: {
            bool: ["SSAO_WHITE"],
            number: [],
            enumerated: []
        }
    }
];

function analyze_shaders(vshader, fshader) {

    var ext_ds = extensions.get_debug_shaders();
    if (!ext_ds) {
        m_print.error("B4W Error: WEBGL_debug_shaders not found" +
            " (run Chrome with --enable-privileged-webgl-extensions)");
        return;
    }

    var vsrc = ext_ds.getTranslatedShaderSource(vshader);
    var fsrc = ext_ds.getTranslatedShaderSource(fshader);

    var vout = post_sync("/nvidia_vert", vsrc);
    var vstats = parse_shader_assembly(vout);

    var fout = post_sync("/nvidia_frag", fsrc);
    var fstats = parse_shader_assembly(fout);

    return {
        vsrc: vsrc,
        vout: vout,
        vstats: vstats,
        fsrc: fsrc,
        fout: fout,
        fstats: fstats
    };
}

function parse_shader_assembly(data) {
    var stats = {};

    if (!data)
        return stats;

    var lines = data.split("\n");

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];

        if (line.search(new RegExp(/^[A-Z.]+ /)) == -1)
            continue;

        var op = line.split(" ")[0];

        if (!(op in stats))
            stats[op] = 0;

        stats[op]++;
    }

    var alu_ops = 0;
    var tex_ops = 0;

    for (var op in stats) {
        switch(op) {
        case "KIL":
        case "TEX":
        case "TXB":
        case "TXP":
        case "KIL.F":
        case "TEX.F":
        case "TXB.F":
        case "TXD.F":
        case "TXL.F":
        case "TXQ.F":
        case "TXP.F":
            tex_ops += stats[op];
            break;
        default:
            alu_ops += stats[op];
            break;
        }
    }

    stats["ALU_OPS"] = alu_ops;
    stats["TEX_OPS"] = tex_ops;

    return stats;
}

function post_sync(path, data) {
    var req = new XMLHttpRequest();
    req.open("POST", path, false);
    req.send(data);

    if (req.status == 200)
        return req.responseText;
    else
        throw("Error POST XHR: " + req.status);
}

/**
 * Determine max bones by compiling shaders.
 * @method module:shaders.determine_max_bones
 */
exports.determine_max_bones = function() {
    return {
        "max_bones": determine_max_bones(1),
        "max_bones_no_blending": determine_max_bones(0)
    };
}

function determine_max_bones(frames_blending) {

    var MAX = 999;

    for (var i = 1; i <= MAX; i++) {

        var shaders_info = {
            vert: "main.glslv",
            frag: "main.glslf",
            directives: [
                ["MAX_BONES", i],
                ["SKINNED", 1],
                ["FRAMES_BLENDING", frames_blending],
                ["WIND_BEND", 0],
                ["DETAIL_BEND", 0],
                ["DYNAMIC_GRASS", 0],
                ["VERTEX_ANIM", 0],
                ["TEXTURE_COLOR", 1],
                ["TEXTURE_SPEC", 1],
                ["TEXTURE_NORM", 1],
                ["TEXTURE_MIRROR", 1],
                ["VERTEX_COLOR", 1],
                ["WATER_EFFECTS", 1],
                ["REFLECTIVE", 0],
                ["REFLECTION_PASS", 0],
                ["SHADOW_SRC_NONE", 10],
                ["SHADOW_SRC_DEPTH", 20],
                ["SHADOW_SRC_MASK", 30],
                ["SHADOW_SRC", "SHADOW_SRC_DEPTH"],
                ["CSM_SECTION1", 1],
                ["CSM_SECTION2", 1],
                ["CSM_SECTION3", 0],
                ["NUM_LIGHTS", 4],
                ["DOUBLE_SIDED_LIGHTING", 1],
                ["NUM_CAUSTS", 3],
                ["TEXTURE_COORDS_UV", 10],
                ["TEXTURE_COORDS_NORMAL", 20],
                ["TEXTURE_COORDS", "TEXTURE_COORDS_NORMAL"],
                ["DISABLE_FOG", 0],
                ["ALPHA_AS_SPEC", 0],
                ["TEXTURE_STENCIL_ALPHA_MASK", 0],
                ["PARALLAX", 0],
                ["PARALLAX_STEPS", 0],
                ["TEXTURE_BLEND_TYPE_MIX", 10],
                ["TEXTURE_BLEND_TYPE_MULTIPLY", 20],
                ["TEXTURE_BLEND_TYPE", "TEXTURE_BLEND_TYPE_MIX"],
                ["ALPHA", 1],
                ["ALPHA_CLIP", 0],
                ["SSAO_ONLY", 0]
            ]
        }

        try {
            shaders.get_compiled_shader(shaders_info, null);
        } catch(e) {
            m_print.log("vertex uniforms limit exceeded, max bones =", i - 1);
            return i - 1;
        }

        m_print.log("shaders successfully compiled and linked");
    }

    return MAX;
}

/**
 * Report cases of repeatitive compilation of shaders (used for debugging)
 * @method module:shaders.report_repeatful_compilation
 */
exports.report_repeatful_compilation = function() {

    var debug_hash_codes = shaders.debug_get_compilation_stats();

    var total = 0;

    for (var i in debug_hash_codes) {

        var info = debug_hash_codes[i];
        var count = info.count;

        if (count > 1)
            m_print.log(count - 1, info.shader_filename, info.hc);

        total += (count - 1);
    }

    m_print.log("TOTAL OVERHEAD:", total);

    return "OK";
}

/**
 * Get compiled shaders's stats for debugging purpuses.
 * @method module:shaders.get_compiled
 */
exports.analyze = function(opt_shader_id_part) {

    var compiled_shaders = shaders.get_compiled_shaders();

    var count = 0;
    for (var shader_id in compiled_shaders) {
        if (opt_shader_id_part && shader_id.indexOf(opt_shader_id_part) === -1)
            continue;
        count++;
    }
    var msg = "of " + count + " analyzing...";

    var rslts = {};

    for (var shader_id in compiled_shaders) {

        if (opt_shader_id_part && shader_id.indexOf(opt_shader_id_part) === -1)
            continue;

        var cshader = compiled_shaders[shader_id];
        var stat = analyze_shaders(cshader.vshader, cshader.fshader);

        var shaders_info = cshader.shaders_info;
        var title = shaders_info.vert + " + " + shaders_info.frag;

        // NOTE: cshader.shaders_info
        stat.cshader = cshader;
        stat.shaders_info = shaders_info;

        var stats = rslts[title] = rslts[title] || [];

        stats.push(stat);
        m_print.log(msg);
    }

    for (var title in rslts) {

        m_print.group("%c" + title, "color: #800");
        var stats = rslts[title];
        print_shader_stats_nvidia(stats);
        m_print.groupEnd();
    }
}

function find_material_names_by_comp_shader(cshader) {

    var scenes = m_scenes.get_all_scenes();

    for (var i = 0; i < scenes.length; i++) {
        var objects = m_scenes.get_scene_objs(scenes[i], "MESH",
                m_scenes.DATA_ID_ALL);

        for (var j = 0; j < objects.length; j++) {
            var obj = objects[j];

            if (!obj._batches)
                continue;

            for (var k = 0; k < obj._batches.length; k++) {
                var batch = obj._batches[k];

                if (batch.shader == cshader &&
                        batch.material_names.length) {
                    return batch.material_names;
                }
            }
        }
    }

    return null;
}

function print_shader_stats_amd(stats) {
    // sort in descending order by fragment shader cycles_avg
    // this number is bigger for more compicated shaders
    stats.sort(function(a, b) {
        return b.fstats.cycles_avg - a.fstats.cycles_avg;
    })

    for (var j = 0; j < stats.length; j++) {
        var stat = stats[j];
        var fstats = stat.fstats;
        var vstats = stat.vstats;

        var mat_names = find_material_names_by_comp_shader(stat.cshader);
        mat_names = mat_names ? "\t\t(" + mat_names.join(", ") + ")" : "\t\t(NA)";

        // NOTE some not changing params are commented out
        m_print.groupCollapsed(
            "FRAG -->",
            "AVG", fstats.cycles_avg,
            "ALU", fstats.instr_alu,
            "TEX", fstats.instr_tex,
            //"VTX", fstats.instr_vtx,
            //"EMIT", fstats.instr_emit,
            "INTERP", fstats.instr_interp,
            "CF", fstats.instr_ctrlflw,
            //"EXP", fstats.instr_export,
            //"TEX_DEP_LVL", fstats.tex_dep_level,
            //"TEMP_REG_USED", fstats.temp_reg_used,
            //"MAX_REG", fstats.max_registers,
            //"EST_CYC", fstats.est_cycles_an,
            //"ITMCLC", fstats.item_clock_an,
            "ALU_TEX", fstats.alu_tex_an,
            "BTLNCK", "\"" + fstats.bottleneck_an + "\"",

            "\t\tVERT -->",
            "AVG", vstats.cycles_avg,
            "ALU", vstats.instr_alu,
            "TEX", vstats.instr_tex,
            //"VTX", vstats.instr_vtx,
            //"EMIT", vstats.instr_emit,
            //"INTERP", vstats.instr_interp,
            "CF", vstats.instr_ctrlflw,
            "EXP", vstats.instr_export,
            //"TEX_DEP_LVL", vstats.tex_dep_level,
            //"TEMP_REG_USED", vstats.temp_reg_used,
            //"MAX_REG", vstats.max_registers,
            //"EST_CYC", vstats.est_cycles_an,
            //"ITMCLC", vstats.item_clock_an,
            "ALU_TEX", vstats.alu_tex_an,
            "BTLNCK", "\"" + vstats.bottleneck_an + "\"",
            mat_names
        );

        m_print.groupCollapsed("directives");
        var dirs = stat.shaders_info.directives;
        for (var i = 0; i < dirs.length; i++) {
            var dir = dirs[i];
            m_print.log(dir[0], dir[1]);
        }
        m_print.groupEnd();

        m_print.groupCollapsed("vert src");
        m_print.log(stat.vsrc);
        m_print.groupEnd();

        m_print.groupCollapsed("vert stats");
        m_print.log(stat.vout);
        m_print.groupEnd();

        m_print.groupCollapsed("frag src");
        m_print.log(stat.fsrc);
        m_print.groupEnd();

        m_print.groupCollapsed("frag stats");
        m_print.log(stat.fout);
        m_print.groupEnd();

        m_print.groupEnd();
    }
}

function print_shader_stats_nvidia(stats) {
    // sort in descending order by fragment shader ALU operations
    stats.sort(function(a, b) {
        return b.fstats["ALU_OPS"] - a.fstats["ALU_OPS"];
    })

    for (var j = 0; j < stats.length; j++) {
        var stat = stats[j];

        var fstats = stat.fstats;
        var vstats = stat.vstats;

        var mat_names = find_material_names_by_comp_shader(stat.cshader);
        mat_names = mat_names ? "\t\t(" + mat_names.join(", ") + ")" : "\t\t(NA)";

        // NOTE some not changing params are commented out
        m_print.groupCollapsed(
            "FRAG -->",
            "ALU", fstats["ALU_OPS"],
            "TEX", fstats["TEX_OPS"],

            "\t\tVERT -->",
            "ALU", vstats["ALU_OPS"],
            "TEX", vstats["TEX_OPS"],
            mat_names
        );

        m_print.groupCollapsed("directives");
        var dirs = stat.shaders_info.directives;
        for (var i = 0; i < dirs.length; i++) {
            var dir = dirs[i];
            m_print.log(dir[0], dir[1]);
        }
        m_print.groupEnd();

        m_print.groupCollapsed("vert src");
        m_print.log(stat.vsrc);
        m_print.groupEnd();

        m_print.groupCollapsed("vert stats");
        for (var op in vstats)
            if (op != "ALU_OPS" && op != "TEX_OPS")
                m_print.log(op, vstats[op]);
        m_print.groupEnd();

        m_print.groupCollapsed("frag src");
        m_print.log(stat.fsrc);
        m_print.groupEnd();

        m_print.groupCollapsed("frag stats");
        for (var op in fstats)
            if (op != "ALU_OPS" && op != "TEX_OPS")
                m_print.log(op, fstats[op]);
        m_print.groupEnd();

        m_print.groupEnd();
    }
}

/**
 * Compile and check all shaders' combinations for debugging purposes.
 * @method module:shaders.compile_all
 */
exports.compile_all = function(arg_from, arg_to) {

    var queue = [];

    for (var i = 0; i < SHADERS.length; i++) {

        var vert = SHADERS[i].vert,
            frag = SHADERS[i].frag;

        var dir_combos = generate_directives_combos(SHADERS[i].directives);

        var len = dir_combos.length;

        var msg = "of " + len + " " + vert + " + " + frag;

        var from = arg_from || 0;
        var to = arg_to || len;
        if (to > len)
            to = len;

        for (var j = from; j < to; j++) {

            var shaders_info = {
                vert: vert,
                frag: frag,
                directives: dir_combos[j]
            }

            queue.push({shaders_info: shaders_info, msg: msg});
        }
    }

    // execute taking pauses
    var MAX_TASKS = 100;
    var INTERVAL = 50;

    function compile_shaders() {

        cleanup();

        var tasks = MAX_TASKS;
        while(queue.length && tasks--) {
            var item = queue.shift();
            m_print.log(item.msg);
            shaders.get_compiled_shader(item.shaders_info, null);
        }

        setTimeout(compile_shaders, INTERVAL);
    }

    setTimeout(compile_shaders, 0);
}

// generate directives' combinations
function generate_directives_combos(DIRECTIVES) {

    // prepare values
    var directives = [];

    for (var i = 0; i < DIRECTIVES.bool.length; i++) {
        directives.push({
            name: DIRECTIVES.bool[i],
            values: [0, 1]
        });
    }

    for (var i = 0; i < DIRECTIVES.number.length; i++) {
        var name = DIRECTIVES.number[i][0];
        var values = DIRECTIVES.number[i][1];
        directives.push({
            name: name,
            values: values
        });
    }

    for (var i = 0; i < DIRECTIVES.enumerated.length; i++) {
        var name = DIRECTIVES.enumerated[i][0];
        var enumerators = DIRECTIVES.enumerated[i][1];
        for (var j = 0; j < enumerators.length; j++) {
            directives.push({
                name: enumerators[j],
                values: [10 + j * 10]
            });
        }
        directives.push({
            name: name,
            values: enumerators
        });
    }

    // helpers
    var clone_array = function(src) {
        var dest = new Array(src.length);
        for (var i = 0; i < src.length; i++)
            dest[i] = src[i];
        return dest;
    }

    var num_digits = directives.length;

    var increment = function(combo) {
        for (var i = num_digits - 1; i >= 0; i--) {
            var max_value = directives[i].values.length - 1;
            if (combo[i] + 1 > max_value) {
                combo[i] = 0;
                continue;
            } else {
                combo[i]++;
                return;
            }
        }
    }

    // first generate numeric combinations: e.g. 0000, 0001, 0010 etc
    var combos = [];
    var last_combo;

    // how many combinations
    var num_combos = 1;
    for (var i = 0; i < directives.length; i++)
        num_combos *= directives[i].values.length;

    // do it
    for (var i = 0; i < num_combos; i++) {
        if (!last_combo) {
            // init first combo, filled with zeroes
            var zeroes = new Array(num_digits);
            for (var j = 0; j < num_digits; j++)
                zeroes[j] = 0;
            combos.push(zeroes);
            last_combo = zeroes;
            continue;
        }
        var combo = clone_array(last_combo);
        increment(combo);
        combos.push(combo);
        last_combo = combo;
    }

    // convert digits to directives' values
    var dir_combos = [];
    for (var i = 0; i < combos.length; i++) {
        var combo = combos[i];
        var dir_combo = [];
        for (var j = 0; j < combo.length; j++) {
            var dir = directives[j];
            var value = dir.values[combo[j]];
            dir_combo.push([dir.name, value]);
        }
        dir_combos.push(dir_combo);
        //m_print.log(dir_combo);
    }

    return dir_combos;
}

}
