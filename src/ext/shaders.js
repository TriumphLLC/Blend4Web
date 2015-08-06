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

function analyze_shaders(vshader, fshader) {

    var ext_ds = extensions.get_debug_shaders();
    if (!ext_ds) {
        m_print.error("WEBGL_debug_shaders not found" +
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

}
