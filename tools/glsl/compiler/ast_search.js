/**
 * AST searching utilities.
 * @name ast_search
 */

var m_trav = require("./ast_traversal.js");

var _uid_to_nodes = {};

exports.set_uids = function(uid_to_nodes) {
    _uid_to_nodes = uid_to_nodes;
}

exports.get_node_by_uid = get_node_by_uid;
function get_node_by_uid(uid) {
    return _uid_to_nodes[uid];
}

exports.get_nearest_parent_by_uid = function(uid, parent_types) {
    return get_nearest_parent_by_node(_uid_to_nodes[uid], parent_types);
}

exports.get_nearest_parent_by_node = get_nearest_parent_by_node;
function get_nearest_parent_by_node(node, parent_types) {
    if (!parent_types)
        return get_node_by_uid(node.parent_uid);
    else {
        var curr_node = get_node_by_uid(node.parent_uid);
        while (parent_types.indexOf(curr_node.node) == -1) {
            if (curr_node.parent_uid)
                curr_node = get_node_by_uid(curr_node.parent_uid);
            else {
                curr_node = null;
                break;
            }
        }
        return curr_node;
    }
}

exports.get_nearest_parent_child_by_uid = function(uid, parent_types) {
    return get_nearest_parent_child_by_node(get_node_by_uid(uid), parent_types);
}

exports.get_nearest_parent_child_by_node = get_nearest_parent_child_by_node;
function get_nearest_parent_child_by_node(node, parent_types) {
    if (!parent_types)
        return node;
    else if (node.parent_uid){
        var child = node;
        var curr_node = get_node_by_uid(node.parent_uid);

        while (parent_types.indexOf(curr_node.node) == -1) {
            if (curr_node.parent_uid) {
                child = curr_node;
                curr_node = get_node_by_uid(curr_node.parent_uid);
            }
            else {
                child = null;
                break;
            }
        }
        return child;
    } else
        return null;
}

exports.recalc_ast_uids = function(ast_data) {
    var uid_counter = 0;
    _uid_to_nodes = {};

    var node_with_node_condition = [];

    // using cb_after, so the parent would have a larger AST uid than the child
    var cb_uid_after = function(ast_node) {
        if ("uid" in ast_node) {
            var old_uid = ast_node.uid;
            var new_uid = uid_counter++;

            ast_node.uid = new_uid;
            _uid_to_nodes[new_uid] = ast_node;

            if (ast_data.node_with_node_condition.indexOf(old_uid) > -1)
                node_with_node_condition.push(new_uid);
        }
    }
    m_trav.traverse_data(ast_data.ast, null, cb_uid_after);    

    ast_data.node_with_node_condition = node_with_node_condition;

    // recalc parent uid
    var parent_uids_stack = [];
    var cb_parent_uid_before = function(ast_node) {
        if ("uid" in ast_node) {
            if (parent_uids_stack.length)
                ast_node.parent_uid = parent_uids_stack[parent_uids_stack.length - 1];

            parent_uids_stack.push(ast_node.uid);
        }
    }
    var cb_parent_uid_after = function(ast_node) {
        if ("uid" in ast_node)
            parent_uids_stack.pop();
    }
    m_trav.traverse_data(ast_data.ast, cb_parent_uid_before, cb_parent_uid_after);

    // update ast_data, because this dict is used during the subsequent searching/collecting
    ast_data.uid_to_nodes = _uid_to_nodes;
}
