"use strict";

/**
 * Bounding internal API.
 * @name boundings
 * @namespace
 * @exports exports as boundings
 */
b4w.module["__boundings"] = function(exports, require) {

var m_util = require("__util");
var m_tsr  = require("__tsr");

var m_vec3 = require("vec3");

var _bb_corners_cache = new Float32Array(3 * 8);

exports.copy_bb = function(bb_from, bb_to) {
    bb_to.min_x = bb_from.min_x;
    bb_to.max_x = bb_from.max_x;
    bb_to.min_y = bb_from.min_y;
    bb_to.max_y = bb_from.max_y;
    bb_to.min_z = bb_from.min_z;
    bb_to.max_z = bb_from.max_z;
}

/**
 * NOTE: definitely not the best style of programming
 */
exports.big_bounding_box = function() {
    return {
        max_x: 1e12,
        min_x:-1e12,
        max_y: 1e12,
        min_y:-1e12,
        max_z: 1e12,
        min_z:-1e12
    };
}

/**
 * Create the new bounding box with zero volume.
 * Improper use may lead to ugly bugs.
 */
exports.zero_bounding_box = function(dest) {
    if (!dest)
        dest = {};

    dest.max_x = 0;
    dest.min_x = 0;
    dest.max_y = 0;
    dest.min_y = 0;
    dest.max_z = 0;
    dest.min_z = 0;

    return dest;
}

/**
 * bb - bounding box to expand
 * bb_exp - expanding bounding box
 */
exports.expand_bounding_box = function(bb, bb_exp) {
    
    var max_x = bb.max_x;
    var max_y = bb.max_y;
    var max_z = bb.max_z;
    var min_x = bb.min_x;
    var min_y = bb.min_y;
    var min_z = bb.min_z;

    bb.max_x = Math.max(bb_exp.max_x, max_x);
    bb.max_y = Math.max(bb_exp.max_y, max_y);
    bb.max_z = Math.max(bb_exp.max_z, max_z);
    bb.min_x = Math.min(bb_exp.min_x, min_x);
    bb.min_y = Math.min(bb_exp.min_y, min_y);
    bb.min_z = Math.min(bb_exp.min_z, min_z);

    return bb;
}

exports.bb_from_coords = bb_from_coords;
/**
 * Create bounding box embracing given set of coords
 * @methodOf boundings
 * @param coords Flat array of coords
 * @param bb Destination bounding box
 */
function bb_from_coords(coords, bb) {

    var max_x = coords[0];
    var max_y = coords[1];
    var max_z = coords[2];
    var min_x = coords[0];
    var min_y = coords[1];
    var min_z = coords[2];

    for (var i = 3; i < coords.length; i+=3) {
        var x = coords[i];
        var y = coords[i+1];
        var z = coords[i+2];

        max_x = Math.max(max_x, x);
        max_y = Math.max(max_y, y);
        max_z = Math.max(max_z, z);

        min_x = Math.min(min_x, x);
        min_y = Math.min(min_y, y);
        min_z = Math.min(min_z, z);
    }

    bb.max_x = max_x;
    bb.max_y = max_y;
    bb.max_z = max_z;
    bb.min_x = min_x;
    bb.min_y = min_y;
    bb.min_z = min_z;

    return bb;
}

/**
 * Translate shadow object bounding box corners to shadow scene view space
 */
exports.bounding_box_transform = function(bb, matrix, bb_new) {

    if (!bb_new)
        var bb_new = exports.zero_bounding_box();

    var bb_corners = extract_bb_corners(bb, _bb_corners_cache);

    m_util.positions_multiply_matrix(bb_corners, matrix, bb_corners);

    return bb_from_coords(bb_corners, bb_new);
}
/**
 * Extract 8 corner coords from bounding box
 */
function extract_bb_corners(bb, dest) {

    if (!dest)
        var dest = new Float32Array(3 * 8);

    var max_x = bb.max_x;
    var max_y = bb.max_y;
    var max_z = bb.max_z;
    var min_x = bb.min_x;
    var min_y = bb.min_y;
    var min_z = bb.min_z;

    // ugly but fast
    dest[0] = min_x; dest[1] = min_y; dest[2] = min_z;
    dest[3] = max_x; dest[4] = min_y; dest[5] = min_z;
    dest[6] = max_x; dest[7] = max_y; dest[8] = min_z;
    dest[9] = min_x; dest[10]= max_y; dest[11]= min_z;
    dest[12]= min_x; dest[13]= min_y; dest[14]= max_z;
    dest[15]= max_x; dest[16]= min_y; dest[17]= max_z;
    dest[18]= max_x; dest[19]= max_y; dest[20]= max_z;
    dest[21]= min_x; dest[22]= max_y; dest[23]= max_z;

    return dest;
}


/**
 * Shrink given bounding box by another
 * return very small bounding box if shrink contstraints do not affect it
 */
exports.shrink_bounding_box = function(bb, bb_shrink, bb_new) {
    if (!bb_new)
        var bb_new = exports.zero_bounding_box();

    var s_min_x = bb_shrink.min_x;
    var s_max_x = bb_shrink.max_x;
    var s_min_y = bb_shrink.min_y;
    var s_max_y = bb_shrink.max_y;
    var s_min_z = bb_shrink.min_z;
    var s_max_z = bb_shrink.max_z;

    if (s_min_x >= bb.max_x || s_max_x <= bb.min_x ||
            s_min_y >= bb.max_y || s_max_y <= bb.min_y ||
            s_min_z >= bb.max_z || s_max_z <= bb.min_z) {

        // NOTE: do not shrink to zero for proper projection construction
        bb_new.min_x = -0.1;
        bb_new.max_x = 0.1;

        bb_new.min_y = -0.1;
        bb_new.max_y = 0.1;

        bb_new.min_z = -0.2;
        bb_new.max_z = -0.1;

        return bb_new;
    }

    bb_new.min_x = Math.max(bb.min_x, s_min_x);
    bb_new.max_x = Math.min(bb.max_x, s_max_x);

    bb_new.min_y = Math.max(bb.min_y, s_min_y);
    bb_new.max_y = Math.min(bb.max_y, s_max_y);

    bb_new.min_z = Math.max(bb.min_z, s_min_z);
    bb_new.max_z = Math.min(bb.max_z, s_max_z);

    return bb_new;
}

/**
 * Stretch bounding box by factor
 */
exports.stretch_bounding_box = function(bb, factor, bb_new) {
    if (!bb_new)
        var bb_new = exports.zero_bounding_box();

    var size_x = bb.max_x - bb.min_x;
    var size_y = bb.max_y - bb.min_y;
    var size_z = bb.max_z - bb.min_z;

    bb_new.min_x = bb.min_x - 0.5 * (factor - 1) * size_x;
    bb_new.max_x = bb.max_x + 0.5 * (factor - 1) * size_x;

    bb_new.min_y = bb.min_y - 0.5 * (factor - 1) * size_y;
    bb_new.max_y = bb.max_y + 0.5 * (factor - 1) * size_y;

    bb_new.min_z = bb.min_z - 0.5 * (factor - 1) * size_z;
    bb_new.max_z = bb.max_z + 0.5 * (factor - 1) * size_z;

    return bb_new;
}


exports.bounding_sphere_transform = function(bs, matrix, bs_new) {

    if (!bs_new)
        var bs_new = exports.zero_bounding_sphere();

    m_vec3.transformMat4(bs.center, matrix, bs_new.center);

    bs_new.radius = bs.radius * m_util.matrix_to_scale(matrix);

    return bs_new;
}

exports.bounding_ellipsoid_transform = function(be, tsr, be_new) {

    if (!be_new)
        var be_new = exports.zero_bounding_ellipsoid();

    m_tsr.transform_vec3(tsr, be.center, be_new.center)

    m_vec3.copy(be.axis_x, be_new.axis_x);
    m_vec3.copy(be.axis_y, be_new.axis_y);
    m_vec3.copy(be.axis_z, be_new.axis_z);

    m_tsr.transform_dir_vec3(be_new.axis_x, tsr, be_new.axis_x);
    m_tsr.transform_dir_vec3(be_new.axis_y, tsr, be_new.axis_y);
    m_tsr.transform_dir_vec3(be_new.axis_z, tsr, be_new.axis_z);

    return be_new;
}

/**
 * Improper use may lead to ugly bugs
 */
exports.zero_bounding_sphere = function() {
    return {
        center: [0, 0, 0],
        radius: 0
    };
}

exports.zero_bounding_ellipsoid = function() {
    return {
        axis_x: new Float32Array(3),
        axis_y: new Float32Array(3),
        axis_z: new Float32Array(3),
        center: [0, 0, 0]
    };
}

/**
 * NOTE: definitely not the best style of programming
 */
exports.big_bounding_sphere = function() {
    return {
        center: [0, 0, 0],
        radius: 1e12
    };
}

exports.expand_bounding_sphere = function(bs, bs_exp) {
    // GARBAGE

    // vector between 2 centers 
    var v = m_vec3.subtract(bs_exp.center, bs.center, m_vec3.create());

    // set explicit direction for concentric spheres
    if (m_vec3.length(v) == 0)
        m_vec3.set(1, 0, 0, v);

    var vn = m_vec3.normalize(v, m_vec3.create());

    // positive/negative extends
    var e1p = m_vec3.scale(vn, bs.radius, m_vec3.create());
    m_vec3.add(e1p, bs.center, e1p);

    var e1n = m_vec3.scale(vn, -bs.radius, m_vec3.create());
    m_vec3.add(e1n, bs.center, e1n);

    var e2p = m_vec3.scale(vn, bs_exp.radius, m_vec3.create());
    m_vec3.add(e2p, bs_exp.center, e2p);

    var e2n = m_vec3.scale(vn, -bs_exp.radius, m_vec3.create());
    m_vec3.add(e2n, bs_exp.center, e2n);

    var min_max = find_min_max_extent([e1p, e1n, e2p, e2n], vn);

    var min = min_max[0];
    var max = min_max[1];

    bs.center = m_vec3.scale(m_vec3.add(min, max, m_vec3.create()), 0.5,
            m_vec3.create());
    bs.radius = m_vec3.length(m_vec3.subtract(max, min, m_vec3.create())) / 2;
}

/**
 * Find minimum/maximum extent in direction dir
 */
function find_min_max_extent(exts, dir) {
    var dir_n = m_vec3.normalize(dir, m_vec3.create());

    var min = exts[0];
    var max = exts[0];
    for (var i = 1; i < exts.length; i++) {
        var proj = m_vec3.dot(exts[i], dir_n);

        if (proj < m_vec3.dot(min, dir_n))
            min = exts[i];

        if (proj > m_vec3.dot(max, dir_n))
            max = exts[i];
    }

    return [min, max];
}


/**
 * Create local bounding cylinder
 */
exports.create_bounding_capsule = function(radius, bounding_box) {

    var max_y = bounding_box.max_y;
    var min_y = bounding_box.min_y;

    var height = Math.max(0, (max_y - min_y) - 2*radius);

    var bcap_local = {
        radius: radius,
        height: height,
        center: [0, (max_y + min_y)/2, 0]
    };

    return bcap_local;
}

/**
 * Create local bounding capsule
 */
exports.create_bounding_cylinder = function(radius, bounding_box) {

    var max_y = bounding_box.max_y;
    var min_y = bounding_box.min_y;

    var height = Math.max(0, max_y - min_y);

    var bcyl_local = {
        radius: radius,
        height: height,
        center: [0, (max_y + min_y)/2, 0]
    };

    return bcyl_local;
}

/**
 * Create local bounding cone
 */
exports.create_bounding_cone = function(radius, bounding_box) {

    var max_y = bounding_box.max_y;
    var min_y = bounding_box.min_y;

    var height = Math.max(0, max_y - min_y);

    var bcon_local = {
        radius: radius,
        height: height,
        center: [0, (max_y + min_y)/2, 0]
    };

    return bcon_local;
}

exports.check_bb_intersection = function(bb1, bb2) {
    if (bb1.min_x > bb2.max_x || bb1.max_x < bb2.min_x)
        return false;
    else if (bb1.min_y > bb2.max_y || bb1.max_y < bb2.min_y)
        return false;
    else if (bb1.min_z > bb2.max_z || bb1.max_z < bb2.min_z)
        return false;
    else
        return true;
}

/**
 * Recalculate bpy mesh boundings
 */
exports.recalculate_mesh_boundings = function(mesh) {

    var max_x = 0, max_y = 0, max_z = 0, min_x = 0, min_y = 0, min_z = 0;
    var srad = 0;
    var crad = 0;

    // init values
    for (var i = 0; i < mesh["submeshes"].length; i++) {
        var submesh = mesh["submeshes"][i];
        if (submesh["position"].length) {
            max_x = min_x = submesh["position"][0];
            max_y = min_y = submesh["position"][1];
            max_z = min_z = submesh["position"][2];
            break;
        }
    }

    for (var i = 0; i < mesh["submeshes"].length; i++) {
        var submesh = mesh["submeshes"][i];

        var positions = submesh["position"];

        for (var j = 0; j < positions.length / 3; j++) {
            var x = positions[3*j];
            var y = positions[3*j + 1];
            var z = positions[3*j + 2];

            max_x = Math.max(x, max_x);
            max_y = Math.max(y, max_y);
            max_z = Math.max(z, max_z);

            min_x = Math.min(x, min_x);
            min_y = Math.min(y, min_y);
            min_z = Math.min(z, min_z);
            
            srad = Math.max(Math.sqrt(x * x + y * y + z * z), srad);
            crad = Math.max(Math.sqrt(x * x + z * z), crad);
        }
    }

    mesh["b4w_bounding_box"]["max_x"] = max_x;
    mesh["b4w_bounding_box"]["min_x"] = min_x;
    mesh["b4w_bounding_box"]["max_y"] = max_y;
    mesh["b4w_bounding_box"]["min_y"] = min_y;
    mesh["b4w_bounding_box"]["max_z"] = max_z;
    mesh["b4w_bounding_box"]["min_z"] = min_z;

    mesh["b4w_bounding_sphere_radius"]  = srad;
    mesh["b4w_bounding_cylinder_radius"] = crad;
}

}
