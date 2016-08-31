/**
 * Copyright (C) 2014-2016 Triumph LLC
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
"use strict";

b4w.module["__loader"] = function(exports, require) {

var m_graph  = require("__graph");
var m_print  = require("__print");
var m_util   = require("__util");

var THREAD_IDLE = 0;
var THREAD_LOADING = 1;
var THREAD_FINISHED_NO_RESOURCES = 2;
var THREAD_FINISHED = 3;
var THREAD_ABORTED = 4;

var THREAD_STAGE_BEFORE = 0;
var THREAD_STAGE_LOOP = 1;
var THREAD_STAGE_AFTER = 2;
var THREAD_STAGE_IDLE = 3;

var DEBUG_MODE = false;
var DEBUG_COLOR = "color: #f0f;";

var MAX_LOAD_TIME_MS = 16;

exports.SYNC_PRIORITY = 0;
exports.ASYNC_PRIORITY = 1;
exports.FINISH_PRIORITY = 2;

var _scheduler = null;

exports.get_scheduler = get_scheduler;
function get_scheduler() {
    return _scheduler;
}

function set_scheduler(scheduler) {
    _scheduler = scheduler;
}

/**
 * Create scheduler.
 */
exports.create_scheduler = function() {
    var scheduler = {
        threads: [],
        current_thread_index: 0,
        active_threads: 0,

        start_secondary_threads: false,
        make_idle_iteration: false
    }

    set_scheduler(scheduler);

    return scheduler;
}

/**
 * Create scheduler thread.
 * @param {Object3D} stages Loading stages
 * @param {String} path Path to main .json file
 * @param {Function} loaded_callback Callback on all/non-background stages loading
 * @param {Function} stageload_cb Callback on stage loading
 * @param {Function} complete_load_cb Callback on all stages loading (currently it's a low-level service callback)
 * @param {Boolean} wait_complete_loading Perform callback on all or all non-background stages loading
 * @param {Boolean} do_not_load_resources To load or not to load application resources
 * @param {Boolean} load_hidden Hide loaded and disable physics objects
 * @returns {Number} Id of loaded data.
 */
exports.create_thread = function(stages, path, loaded_callback, 
        stageload_cb, complete_load_cb, wait_complete_loading, 
        do_not_load_resources, load_hidden) {

    var scheduler = get_scheduler();

    var id = scheduler.threads.length;
    var thread = {
        id: id,
        is_primary: id == 0,
        status: THREAD_IDLE,

        filepath: path,
        binary_name: "",

        loaded_cb: loaded_callback || (function() {}),

        load_hidden: load_hidden || false,
        wait_complete_loading: wait_complete_loading,

        time_load_start: 0,
        curr_percents: 0,
        stages_size_total: 0,
        reset_time_cycle: false,
        
        stageload_cb: stageload_cb || (function() {}),
        complete_load_cb: complete_load_cb || (function() {}),
        
        stage_graph: null,
        stages_queue: null,
        has_video_textures: false,
        has_background_music: false,
        init_wa_context: false
    }

    var graph = create_loading_graph(thread.is_primary, stages, 
            wait_complete_loading, do_not_load_resources);
    thread.stage_graph = graph;

    var stages_queue = [];
    var init_nodes = m_graph.get_source_nodes(graph);
    for (var i = 0; i < init_nodes.length; i++)
        stages_queue.push(init_nodes[i]);
    thread.stages_queue = stages_queue;

    m_graph.traverse(graph, function(id, attr) {
        if (attr.cb_before || attr.cb_loop || attr.cb_after)
            if (stage_need_calc(thread, attr))
                thread.stages_size_total += attr.relative_size;
    });

    scheduler.threads.push(thread);
    scheduler.active_threads++;

    return thread.id;
}

function create_loading_graph(is_primary, stages, wait_complete_loading, 
        do_not_load_resources) {
    var scheduler = get_scheduler();

    var graph = m_graph.create();

    for (var stage_name in stages) {
        var stage = init_stage(stages[stage_name]);
        // skip "resource" or "primary_only" threads if necessary
        if (do_not_load_resources && stage.is_resource 
                || !is_primary && stage.primary_only)
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

    // add finishing node (may be performed before resource nodes 
    // if "do_not_load_resources" is true)
    var loaded_cb_wrapper = function(bpy_data, thread, stage, cb_param,
            cb_finish, cb_set_rate) {
        
        // primary thread loaded, allow to load secondary threads
        if (thread.is_primary)
            scheduler.start_secondary_threads = true;

        if (!thread_is_finished(thread))
            thread.status = THREAD_FINISHED_NO_RESOURCES;

        thread.loaded_cb(thread.id, true);
        cb_finish(thread, stage);
        m_print.log("%cTHREAD " + thread.id + ": LOADED CALLBACK", DEBUG_COLOR);
    }

    var finish_node = init_stage({
        name: "out",
        priority: exports.FINISH_PRIORITY,
        cb_before: loaded_cb_wrapper,
        relative_size: 5
    });

    if (wait_complete_loading)
        var sink_ids = m_graph.get_sink_nodes(graph);
    else {
        var tmp_graph = m_graph.clone(graph);
        var sink_ids;
        var bkg_sink_ids;

        do {
            sink_ids = m_graph.get_sink_nodes(tmp_graph);
            bkg_sink_ids = [];            

            for (var i = 0; i < sink_ids.length; i++) {
                var id = sink_ids[i];
                var sink_node = m_graph.get_node_attr(tmp_graph, id);
                if (sink_node.background_loading)
                    bkg_sink_ids.push(id);
            }

            for (var i = 0; i < bkg_sink_ids.length; i++)
                m_graph.remove_node(tmp_graph, bkg_sink_ids[i]);
            if (bkg_sink_ids.length)
                m_graph.cleanup_loose_edges(tmp_graph);
        } while (bkg_sink_ids.length);
    }

    m_graph.append_node_attr(graph, finish_node);

    for (var i = 0; i < sink_ids.length; i++) {
        var id = sink_ids[i];
        var sink_node = m_graph.get_node_attr(graph, id);
        finish_node.inputs.push(sink_node.name);
        m_graph.append_edge_attr(graph, sink_node, finish_node, null);
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
    stage.primary_only = stage.primary_only || false;
    
    stage.status = THREAD_STAGE_BEFORE;
    stage.loop_index = 0;
    stage.load_rate = 0;
    stage.cb_param = stage.cb_param || null;
    
    return stage;
}

exports.update_scheduler = function(bpy_data_array) {
    var scheduler = get_scheduler();

    if (!scheduler || is_finished(scheduler))
        return;

    if (scheduler.make_idle_iteration) {
        scheduler.make_idle_iteration = false;
        return;
    }

    var time_start = performance.now();
    do {
        var thread = scheduler.threads[scheduler.current_thread_index];
        var bpy_data = bpy_data_array[thread.id];

        if (!thread_is_finished(thread)) {

            // start new thread
            if (thread.status == THREAD_IDLE) {
                thread.status = THREAD_LOADING;
                thread.time_load_start = performance.now();
                thread.stageload_cb(0, 0);
                if (DEBUG_MODE)
                    m_print.log("%cTHREAD " + thread.id 
                            + ": 0% LOADING START 0ms", DEBUG_COLOR);
            }

            if (update_stages_queue(thread))
                process_stages_queue(thread, bpy_data);
            else
                finish_thread(scheduler, thread, bpy_data);
        }

        // process secondary threads after main is loaded
        if (scheduler.start_secondary_threads)
            scheduler.current_thread_index = (scheduler.current_thread_index + 1) 
                    % scheduler.threads.length;

        // NOTE: reset time cycle for asynchronous stages
        if (thread.reset_time_cycle) {
            thread.reset_time_cycle = false;
            return;
        }

    } while(performance.now() - time_start < MAX_LOAD_TIME_MS);
}

exports.abort_thread = function(thread) {
    var scheduler = get_scheduler();
    finish_thread(scheduler, thread, null);
    thread.status = THREAD_ABORTED;

    // primary thread finished, allow to load secondary threads
    if (thread.is_primary)
        scheduler.start_secondary_threads = true;

    thread.loaded_cb(thread.id, false);
}

function finish_thread(scheduler, thread, bpy_data) {
    // finish thread totally (including all resources)
    thread.complete_load_cb(bpy_data, thread);
    thread.status = THREAD_FINISHED;
    scheduler.active_threads--;
    if (DEBUG_MODE) {
        var ms = Math.round(performance.now() 
                - thread.time_load_start);
        m_print.log("%cTHREAD " + thread.id + ": 100% LOADING END " 
                + ms + "ms", 
                DEBUG_COLOR);
    }
    release_thread(thread);
}

function process_stages_queue(thread, bpy_data) {
    var iter_counter = thread.stages_queue.length;

    do {
        var stage_index = thread.stages_queue[0];
        var stage = m_graph.get_node_attr(thread.stage_graph, stage_index);
        var is_processed = process_stage(thread, stage, bpy_data);
        
        if (stage.priority == exports.ASYNC_PRIORITY)
            thread.reset_time_cycle = true;
        
        var first = thread.stages_queue.shift();
        thread.stages_queue.push(first);
        iter_counter--;
    } while (!(is_processed || iter_counter == 0));
}

function propagate_stages(thread, stage_indices) {
    var next_indices = [];
    var stages_to_remove = [];

    for (var i = 0; i < stage_indices.length; i++) {
        var stage_index = stage_indices[i];
        var stage = m_graph.get_node_attr(thread.stage_graph, stage_index);
        if (stage.is_finished) {
            m_graph.traverse_outputs(thread.stage_graph, stage_index, 
                    function(id_out, attr_out, edge_attr_out) {
                var can_execute = true;
                m_graph.traverse_inputs(thread.stage_graph, id_out, 
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

function update_stages_queue(thread) {
    var result_indices = [];
    var prev_indices = thread.stages_queue;
    var new_added = false;

    do {
        // prev_indices filtered here
        var next_indices = propagate_stages(thread, prev_indices);
        result_indices.push.apply(result_indices, prev_indices);
        if (next_indices.length > 0)
            new_added = true;
        prev_indices = next_indices;
    } while (next_indices.length > 0);


    var priority_stage_sort = function(a, b) {
        var stage_a = m_graph.get_node_attr(thread.stage_graph, a);
        var stage_b = m_graph.get_node_attr(thread.stage_graph, b);

        // handle priority
        var result = stage_b.priority - stage_a.priority;
        if (result == 0)
            // !background first
            result = stage_a.background_loading - stage_b.background_loading;
        return result;
    }

    if (new_added)
        result_indices.sort(priority_stage_sort);

    thread.stages_queue = result_indices;
    return thread.stages_queue.length;
}

/**
 * Returns true if stage callback is executed
 */
function process_stage(thread, stage, bpy_data) {
    // don't process skipped stages
    if (stage.skip) {
        stage.is_finished = true;
        if (DEBUG_MODE)
            m_print.log("%cTHREAD " + thread.id + ": SKIP STAGE " + stage.name, 
                    DEBUG_COLOR);

        stage_finish_cb(thread, stage);
        return false;
    }

    // debug message for start stage loading
    if (DEBUG_MODE && stage.status == THREAD_STAGE_BEFORE) {
        var percents = get_load_percents(thread);
        var message = "LOADING START " +  stage.name;
        var ms = Math.round(performance.now() - thread.time_load_start);
        m_print.log("%cTHREAD " + thread.id + ": " + percents + "% " + message 
                + " " + ms + "ms ", DEBUG_COLOR);
    }

    // finish stages without any callbacks
    if (!stage.cb_before && !stage.cb_loop && !stage.cb_after) {
        stage_finish_cb(thread, stage);
        return false;
    }

    // process stage by status
    if (stage.status == THREAD_STAGE_BEFORE) {
        stage.status++;
        if (stage.cb_before) {
            stage.cb_before(bpy_data, thread, stage, stage.cb_param, 
                    stage_finish_cb, stage_part_finish_cb);
            return true;
        }
    }

    if (stage.status == THREAD_STAGE_LOOP) {
        if (stage.cb_loop) {
            stage.cb_loop(bpy_data, thread, stage, stage.cb_param, 
                    stage_finish_cb, stage_part_finish_cb);
            return true;
        } else
            stage.status++;
    }

    if (stage.status == THREAD_STAGE_AFTER) {
        stage.status++;
        if (stage.cb_after) {
            stage.cb_after(bpy_data, thread, stage, stage.cb_param, 
                    stage_finish_cb, stage_part_finish_cb);
            return true;
        }
    }

    return false;
}

function get_load_percents(thread) {
    if (thread.stages_size_total == 0)
        return 100;
    
    var loaded = 0;
    m_graph.traverse(thread.stage_graph, function(id, attr) {
        if (stage_need_calc(thread, attr))
            loaded += attr.load_rate * attr.relative_size;
    });
    return m_util.trunc(loaded * 100 / thread.stages_size_total);
}

function stage_need_calc(thread, stage) {
    // don't calc resource stages if they will not be loaded
    return !(thread.do_not_load_resources && stage.is_resource);
}

function stage_finish_cb(thread, stage) {
    stage.is_finished = true;
    stage.status = THREAD_STAGE_IDLE;
    stage_loading_action(thread, stage, 1);

    if (DEBUG_MODE) {
        var percents = get_load_percents(thread);
        var message = "LOADING END " +  stage.name;
        var ms = Math.round(performance.now() - thread.time_load_start);
        m_print.log("%cTHREAD " + thread.id + ": " + percents + "% " + message 
                + " " + ms + "ms ", DEBUG_COLOR);
    }
}

/**
 * Perform callback for partially loading
 * @param {Object3D} thread Scheduler
 * @param {Object3D} stage Stage object
 * @param {Number} rate Stage load rate
 */
exports.stage_part_finish_cb = stage_part_finish_cb;
function stage_part_finish_cb(thread, stage, rate) {
    if (rate < 1)
        stage_loading_action(thread, stage, rate);
    else
        stage.status++;
}

function stage_loading_action(thread, stage, rate) {
    var scheduler = get_scheduler();

    if (stage.cb_before || stage.cb_loop || stage.cb_after) {
        stage.load_rate = rate;
        var percents = get_load_percents(thread);

        if (thread.curr_percents != percents || rate == 1) {
            thread.stageload_cb(percents, performance.now() - thread.time_load_start);
            thread.curr_percents = percents;

            // NOTE: skip next thread iteration to liquidate loading bar 
            // freezes
            scheduler.make_idle_iteration = true;
        }
    }
}

/**
 * Skip certain stage
 * @param {Object3D} thread Scheduler thread
 * @param {String} name Stage name
 */
exports.skip_stage_by_name = function(thread, name) {
    var stage = get_stage_by_name(thread, name);

    if (stage !== null)
        skip_stage(stage);
}

function get_stage_by_name(thread, name) {
    var stage = null;

    m_graph.traverse(thread.stage_graph, function(id, attr) {
        if (attr.name == name) {
            stage = attr;
            return 1;
        }
    });

    return stage;
}

function skip_stage(stage) {
    stage.skip = true;
    // force stage to coincide with total amount of loading data;
    // (for stages that need to be calculated)
    stage.load_rate = 1;
}

// release some thread properties not needed after thread is over; 
// for garbage collecting
function release_thread(thread) {
    thread.stageload_cb = null;
    thread.complete_load_cb = null;
    if (!DEBUG_MODE)
        thread.stage_graph = null;
    thread.stages_queue = null;
    // NOTE: thread.loaded_cb needed for aborted threads
}

exports.is_finished = is_finished;
function is_finished() {
    var scheduler = get_scheduler();
    return scheduler.active_threads == 0;
}

exports.thread_is_finished = thread_is_finished;
function thread_is_finished(thread) {
    return thread && (thread.status == THREAD_FINISHED 
            || thread.status == THREAD_ABORTED);
}

/**
 * Get primary thread/scene loaded status
 * @param {Object3D} scheduler Scheduler
 * @param {Number} thread_id Thread/scene id
 */
exports.is_primary_loaded = function(data_id) {
    var scheduler = get_scheduler();

    if (!scheduler)
        return false;

    data_id = data_id | 0;

    return scheduler.threads[data_id] 
            && (scheduler.threads[data_id].status == THREAD_FINISHED ||
                scheduler.threads[data_id].status == THREAD_FINISHED_NO_RESOURCES);
}

exports.graph_to_dot = function(data_id) {
    if (!DEBUG_MODE) {
        m_print.error("Debug mode isn't enabled. Can not retrieve the graph.");
        return;
    }

    var scheduler = get_scheduler();
    if (scheduler && scheduler.threads[data_id] 
            && scheduler.threads[data_id].stage_graph)
        return m_graph.debug_dot(scheduler.threads[data_id].stage_graph, 
                function(node, attr) {
                    if (attr.skip)
                        return "SKIPPED\n(" + attr.name + ")";
                    else {
                        var node_label = attr.name + "\n";
                        var props = [];
                        props.push(attr.priority == exports.ASYNC_PRIORITY ? "ASYNC" : "SYNC");

                        if (attr.background_loading)
                            props.push("BKG");
                        if (attr.is_resource)
                            props.push("RES");
                        return node_label + props.join(" | ");
                    }
                }, null);
    else
        return null;
}

exports.cleanup = function() {
    set_scheduler(null);
}

}
