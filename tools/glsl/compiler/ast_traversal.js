/**
 * Does ast traversal and performs desired actions through the "cb_before" and the 
 * "cb_after" callbacks.
 * @name ast_traversal
 */

exports.traverse_data = traverse_data;
function traverse_data(data, cb_before, cb_after) {
    if (data instanceof Array)
        traverse_array(data, cb_before, cb_after);
    else if (data instanceof Object && data)
        traverse_object(data, cb_before, cb_after);
}

function traverse_array(array_data, cb_before, cb_after) {
    for (var i = 0; i < array_data.length; i++)
        traverse_data(array_data[i], cb_before, cb_after);
}

function traverse_object(object_data, cb_before, cb_after) {
    if (cb_before)
        cb_before(object_data);
    for (var prop in object_data)
        traverse_data(object_data[prop], cb_before, cb_after);
    if (cb_after)
        cb_after(object_data);
}
