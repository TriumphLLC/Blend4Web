"use strict";

b4w.module["__loader"] = function(exports, require) {

var m_graph  = require("__graph");
var m_print  = require("__print");
var m_util   = require("__util");

var SH_IDLE = 0;
var SH_LOADING = 1;
var SH_FINISHED = 2;

var SH_STAGE_BEFORE = 0;
var SH_STAGE_LOOP = 1;
var SH_STAGE_AFTER = 2;
var SH_STAGE_IDLE = 3;

var DEBUG_MODE = false;
var DEBUG_COLOR = "color: #f0f;";

var MAX_LOAD_TIME_MS = 16;

exports.SYNC_PRIORITY = 0;
exports.ASYNC_PRIORITY = 1;
exports.FINISH_PRIORITY = 2;

/**
 * Create scheduler.
 * @param {Object} stages Loading stages
 * @param {String} path Path to main .json file
 * @param {Function} loaded_callback Callback on all stages loading
 * @param {Function} stageload_cb Callback on stage loading
 * @param {Boolean} wait_complete_loading Perform callback on all or all non-background stages loading
 */
exports.create_scheduler = function(stages, path, loaded_callback, 
        stageload_cb, complete_load_cb, wait_complete_loading, 
        do_not_load_resources) {

    var scheduler = {
        filepath: path,
        binary_filepath: null,

        stageload_cb: stageload_cb || (function() {}),
        complete_load_cb: complete_load_cb || (function() {}),

        status: SH_IDLE,

        reset_time_cycle: false,

        time_load_start: 0,
        curr_percents: 0,
        stages_size_total: 0,
        wait_complete_loading: wait_complete_loading,
        is_loaded: false,

        make_idle_iteration: false
    }

    var loaded_cb = loaded_callback || (function() {});
    var graph = create_loading_graph(stages, wait_complete_loading, 
            do_not_load_resources, loaded_cb);
    scheduler.stage_graph = graph;

    var stages_queue = [];
    var init_nodes = m_graph.get_source_nodes(graph);
    for (var i = 0; i < init_nodes.length; i++)
        stages_queue.push(init_nodes[i]);
    scheduler.stages_queue = stages_queue;

    m_graph.traverse(graph, function(id, attr) {
        if (attr.cb_before || attr.cb_loop || attr.cb_after)
            if (stage_need_calc(scheduler, attr))
                scheduler.stages_size_total += attr.relative_size;
    });

    return scheduler;
}

function create_loading_graph(stages, wait_complete_loading, 
        do_not_load_resources, loaded_cb) {
    var graph = m_graph.create();

    for (var stage_name in stages) {
        var stage = init_stage(stages[stage_name]);
        if (do_not_load_resources && stage.is_resource)
            skip_stage(stage);
        m_graph.append_node_attr(graph, stage);
    }

    for (var stage_name in stages) {
        var stage = stages[stage_name];
        stage.name = stage_name;
        for (var i = 0; i < stage.inputs.length; i++)
            m_graph.append_edge_attr(graph, stages[stage.inputs[i]], stage, 
                    null);
    }

    // add finishing node
    var loaded_cb_wrapper = function(bpy_data, scheduler, stage, cb_param,
            cb_finish, cb_set_rate) {
        cb_finish(scheduler, stage);
        scheduler.is_loaded = true;
        loaded_cb(bpy_data);
        m_print.log("%cLOADED CALLBACK", DEBUG_COLOR);
    }
    var finish_node = init_stage({
        name: "out",
        priority: exports.FINISH_PRIORITY,
        cb_before: loaded_cb_wrapper
    });

    var prefinish_nodes = [];
    if (wait_complete_loading) {
        var ids = m_graph.get_sink_nodes(graph);
        for (var i = 0; i < ids.length; i++)
            prefinish_nodes.push(m_graph.get_node_attr(graph, ids[i]));
    } else
        m_graph.traverse(graph, function(id, attr) {
            if (!attr.background_loading)
                prefinish_nodes.push(attr);
        });

    m_graph.append_node_attr(graph, finish_node);
    for (var i = 0; i < prefinish_nodes.length; i++) {
        finish_node.inputs.push(prefinish_nodes[i].name);
        m_graph.append_edge_attr(graph, prefinish_nodes[i], finish_node, null);
    }

    return graph;
}

function init_stage(stage) {
    stage.background_loading = stage.background_loading || false;
    if (!(stage.priority || stage.priority === 0))
        stage.priority = stage.SYNC_PRIORITY;
    stage.inputs = stage.inputs || [];
    stage.is_finished = stage.is_finished || false;
    stage.skip = stage.skip || false;
    stage.relative_size = stage.relative_size || 0;
    stage.is_resource = stage.is_resource || false;
    
    stage.status = SH_STAGE_BEFORE;
    stage.loop_index = 0;
    stage.load_rate = 0;
    stage.cb_param = stage.cb_param || null;
    
    return stage;
}

exports.update_scheduler = function(scheduler, bpy_data) {
    if (!scheduler)
        return;

    if (scheduler.make_idle_iteration) {
        scheduler.make_idle_iteration = false;
        return;
    }

    var time_start = performance.now();

    do {
        if (check_finished(scheduler))
            return;

        if (scheduler.status == SH_IDLE) {
            scheduler.status = SH_LOADING;
            scheduler.time_load_start = performance.now();
            scheduler.stageload_cb(0, 0);
            if (DEBUG_MODE)
                m_print.log("%c0% LOADING START 0ms", DEBUG_COLOR);
        }

        if (update_stages_queue(scheduler))
            process_stages_queue(scheduler, bpy_data);
        else {
            scheduler.complete_load_cb(bpy_data, scheduler);
            scheduler.status = SH_FINISHED;
            if (DEBUG_MODE) {
                var ms = Math.round(performance.now() 
                        - scheduler.time_load_start);
                m_print.log("%c100% LOADING END " 
                        + ms + "ms", 
                        DEBUG_COLOR);
            }
            return;
        }

        // NOTE: reset time cycle for asynchronous stages
        if (scheduler.reset_time_cycle) {
            scheduler.reset_time_cycle = false;
            return;
        }

    } while(performance.now() - time_start < MAX_LOAD_TIME_MS);
}

function process_stages_queue(scheduler, bpy_data) {
    var iter_counter = scheduler.stages_queue.length;

    do {
        var stage_index = scheduler.stages_queue[0];
        var stage = m_graph.get_node_attr(scheduler.stage_graph, stage_index);
        var is_processed = process_stage(scheduler, stage, bpy_data);
        
        if (stage.priority == exports.ASYNC_PRIORITY)
            scheduler.reset_time_cycle = true;
        
        var first = scheduler.stages_queue.shift();
        scheduler.stages_queue.push(first);
        iter_counter--;
    } while (!(is_processed || iter_counter == 0));
}

function propagate_stages(scheduler, stage_indices) {
    var next_indices = [];
    var stages_to_remove = [];

    for (var i = 0; i < stage_indices.length; i++) {
        var stage_index = stage_indices[i];
        var stage = m_graph.get_node_attr(scheduler.stage_graph, stage_index);
        if (stage.is_finished) {
            m_graph.traverse_outputs(scheduler.stage_graph, stage_index, 
                    function(id_out, attr_out, edge_attr_out) {
                var can_execute = true;
                m_graph.traverse_inputs(scheduler.stage_graph, id_out, 
                        function(id_in, attr_in, edge_attr_in) {
                    if (!attr_in.is_finished) {
                        can_execute = false;
                        return 1;
                    }
                });
                if (can_execute && next_indices.indexOf(id_out) == -1 
                        && stage_indices.indexOf(id_out) == -1) {
                    next_indices.push(id_out);
                }
            });
            stages_to_remove.push(i);
        }
    }

    for (var i = stages_to_remove.length - 1; i >= 0; i--)
        stage_indices.splice(stages_to_remove[i], 1);

    return next_indices;
}

function update_stages_queue(scheduler) {
    var result_indices = [];
    var prev_indices = scheduler.stages_queue;
    var new_added = false;

    do {
        // prev_indices filtered here
        var next_indices = propagate_stages(scheduler, prev_indices);
        result_indices.push.apply(result_indices, prev_indices);
        if (next_indices.length > 0)
            new_added = true;
        prev_indices = next_indices;
    } while (next_indices.length > 0);


    var priority_stage_sort = function(a, b) {
        var stage_a = m_graph.get_node_attr(scheduler.stage_graph, a);
        var stage_b = m_graph.get_node_attr(scheduler.stage_graph, b);

        // handle priority
        var result = stage_b.priority - stage_a.priority;
        if (result == 0)
            // !background first
            result = stage_a.background_loading - stage_b.background_loading;
        return result;
    }

    if (new_added)
        result_indices.sort(priority_stage_sort);

    scheduler.stages_queue = result_indices;
    return scheduler.stages_queue.length;
}

/**
 * Returns true if stage callback is executed
 */
function process_stage(scheduler, stage, bpy_data) {
    // don't process skipped stages
    if (stage.skip) {
        stage.is_finished = true;
        if (DEBUG_MODE)
            m_print.log("%cSKIP STAGE: " + stage.name, DEBUG_COLOR);
        return false;
    }

    // debug message for start stage loading
    if (DEBUG_MODE && stage.status == SH_STAGE_BEFORE) {
        var percents = get_load_percents(scheduler);
        var message = "LOADING START: " +  stage.name;
        var ms = Math.round(performance.now() - scheduler.time_load_start);
        m_print.log("%c" + percents + "% " + message + " "
                + ms + "ms ", 
                DEBUG_COLOR);
    }

    // finish stages without any callbacks
    if (!stage.cb_before && !stage.cb_loop && !stage.cb_after) {
        stage_finish_cb(scheduler, stage);
        return false;
    }

    // process stage by status
    if (stage.status == SH_STAGE_BEFORE) {
        stage.status++;
        if (stage.cb_before) {
            stage.cb_before(bpy_data, scheduler, stage, stage.cb_param, 
                    stage_finish_cb, stage_part_finish_cb);
            return true;
        }
    }

    if (stage.status == SH_STAGE_LOOP) {
        if (stage.cb_loop) {
            stage.cb_loop(bpy_data, scheduler, stage, stage.cb_param, 
                    stage_finish_cb, stage_part_finish_cb);
            return true;
        } else
            stage.status++;
    }

    if (stage.status == SH_STAGE_AFTER) {
        stage.status++;
        if (stage.cb_after) {
            stage.cb_after(bpy_data, scheduler, stage, stage.cb_param, 
                    stage_finish_cb, stage_part_finish_cb);
            return true;
        }
    }

    return false;
}

function get_load_percents(scheduler) {
    if (scheduler.stages_size_total == 0)
        return 100;
    
    var loaded = 0;
    m_graph.traverse(scheduler.stage_graph, function(id, attr) {
        if (stage_need_calc(scheduler, attr))
            loaded += attr.load_rate * attr.relative_size;
    });
    return m_util.trunc(loaded * 100 / scheduler.stages_size_total);
}

function stage_need_calc(scheduler, stage) {
    // don't calc resource stages if they will not be loaded
    return !(scheduler.do_not_load_resources && stage.is_resource);
}

function stage_finish_cb(scheduler, stage) {
    stage.is_finished = true;
    stage.status = SH_STAGE_IDLE;
    stage_loading_action(scheduler, stage, 1);

    if (DEBUG_MODE) {
        var percents = get_load_percents(scheduler);
        var message = "LOADING END: " +  stage.name;
        var ms = Math.round(performance.now() - scheduler.time_load_start);
        m_print.log("%c" + percents + "% " + message + " "
                + ms + "ms ", 
                DEBUG_COLOR);
    }
}

/**
 * Perform callback for partially loading
 * @param {Object} scheduler Scheduler
 * @param {Object} stage Stage object
 * @param {Number} rate Stage load rate
 */
exports.stage_part_finish_cb = stage_part_finish_cb;
function stage_part_finish_cb(scheduler, stage, rate) {
    if (rate < 1)
        stage_loading_action(scheduler, stage, rate);
    else
        stage.status++;
}

function stage_loading_action(scheduler, stage, rate) {
    if (stage.cb_before || stage.cb_loop || stage.cb_after) {
        stage.load_rate = rate;
        var percents = get_load_percents(scheduler);

        if (scheduler.curr_percents != percents) {
            scheduler.stageload_cb(percents, performance.now() - scheduler.time_load_start);
            scheduler.curr_percents = percents;

            // NOTE: skip next scheduler iteration to liquidate loading bar 
            // freezes
            scheduler.make_idle_iteration = true;
        }
    }
}

function check_finished(scheduler) {
    return scheduler.status == SH_FINISHED;
}

/**
 * Get stage by name
 * @param {Object} scheduler Scheduler
 * @param {String} name Stage name
 */
exports.get_stage_by_name = get_stage_by_name;
function get_stage_by_name(scheduler, name) {
    var stage = null;

    m_graph.traverse(scheduler.stage_graph, function(id, attr) {
        if (attr.name == name) {
            stage = attr;
            return 1;
        }
    });

    return stage;
}

/**
 * Skip certain stage
 * @param {Object} scheduler Scheduler containing stage
 * @param {String} name Stage name
 */
exports.skip_stage_by_name = function(scheduler, name) {
    var stage = get_stage_by_name(scheduler, name);

    if (stage !== null)
        skip_stage(stage);
}

function skip_stage(stage) {
    stage.skip = true;
    // force stage to coincide with total amount of loading data;
    // (for stages that need to be calculated)
    stage.load_rate = 1;
}

/**
 * Get loaded status
 * @param {Object} scheduler Scheduler
 */
exports.is_loaded = function(scheduler) {
    if (!scheduler)
        return false;
    return scheduler.is_loaded;
}

}
