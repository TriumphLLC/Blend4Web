"use strict";

/*
 * Copyright (c) 2012 Brandon Jones
 *
 * This software is provided 'as-is', without any express or implied
 * warranty. In no event will the authors be held liable for any damages
 * arising from the use of this software.
 *
 * Permission is granted to anyone to use this software for any purpose,
 * including commercial applications, and to alter it and redistribute it
 * freely, subject to the following restrictions:
 *
 *    1. The origin of this software must not be misrepresented; you must not
 *    claim that you wrote the original software. If you use this software
 *    in a product, an acknowledgment in the product documentation would be
 *    appreciated but is not required.
 *
 *    2. Altered source versions must be plainly marked as such, and must not
 *    be misrepresented as being the original software.
 *
 *    3. This notice may not be removed or altered from any source
 *    distribution.
 */

/**
 * Utilities for loading DDS texture files
 * @name dds
 * @namespace
 * @exports exports as dds
 */
b4w.module["__dds"] = function(exports, require) {

var m_print = require("__print");
   
// All values and structures referenced from:
// http://msdn.microsoft.com/en-us/library/bb943991.aspx/
var DDS_MAGIC = 0x20534444;

var DDSD_CAPS = 0x1,
    DDSD_HEIGHT = 0x2,
    DDSD_WIDTH = 0x4,
    DDSD_PITCH = 0x8,
    DDSD_PIXELFORMAT = 0x1000,
    DDSD_MIPMAPCOUNT = 0x20000,
    DDSD_LINEARSIZE = 0x80000,
    DDSD_DEPTH = 0x800000;

var DDSCAPS_COMPLEX = 0x8,
    DDSCAPS_MIPMAP = 0x400000,
    DDSCAPS_TEXTURE = 0x1000;
    
var DDSCAPS2_CUBEMAP = 0x200,
    DDSCAPS2_CUBEMAP_POSITIVEX = 0x400,
    DDSCAPS2_CUBEMAP_NEGATIVEX = 0x800,
    DDSCAPS2_CUBEMAP_POSITIVEY = 0x1000,
    DDSCAPS2_CUBEMAP_NEGATIVEY = 0x2000,
    DDSCAPS2_CUBEMAP_POSITIVEZ = 0x4000,
    DDSCAPS2_CUBEMAP_NEGATIVEZ = 0x8000,
    DDSCAPS2_VOLUME = 0x200000;

var DDPF_ALPHAPIXELS = 0x1,
    DDPF_ALPHA = 0x2,
    DDPF_FOURCC = 0x4,
    DDPF_RGB = 0x40,
    DDPF_YUV = 0x200,
    DDPF_LUMINANCE = 0x20000;

var FOURCC_DXT1 = fourcc_to_int32("DXT1");
var FOURCC_DXT3 = fourcc_to_int32("DXT3");
var FOURCC_DXT5 = fourcc_to_int32("DXT5");

 // The header length in 32 bit ints
var HEADER_LENGTH_INT = 31;

// Offsets into the header array
var OFFSET_MAGIC = 0;

var OFFSET_SIZE = 1;
var OFFSET_FLAGS = 2;
var OFFSET_HEIGHT = 3;
var OFFSET_WIDTH = 4;

var OFFSET_MIPMAPCOUNT = 7;

var OFFSET_PF_FLAGS = 20;
var OFFSET_PF_FOUR_CC = 21;

// Little reminder for myself where the above values come from
/*DDS_PIXELFORMAT {
    int32 dwSize; // offset: 19
    int32 dwFlags;
    char[4] dwFourCC;
    int32 dwRGBBitCount;
    int32 dwRBitMask;
    int32 dwGBitMask;
    int32 dwBBitMask;
    int32 dwABitMask; // offset: 26
};

DDS_HEADER {
    int32 dwSize; // 1
    int32 dwFlags;
    int32 dwHeight;
    int32 dwWidth;
    int32 dwPitchOrLinearSize;
    int32 dwDepth;
    int32 dwMipMapCount; // offset: 7
    int32[11] dwReserved1;
    DDS_PIXELFORMAT ddspf; // offset 19
    int32 dwCaps; // offset: 27
    int32 dwCaps2;
    int32 dwCaps3;
    int32 dwCaps4;
    int32 dwReserved2; // offset 31
};*/


/**
 * Transcodes DXT into RGB565.
 * Optimizations:
 * 1. Use integer math to compute c2 and c3 instead of floating point
 *    math.  Specifically:
 *      c2 = 5/8 * c0 + 3/8 * c1
 *      c3 = 3/8 * c0 + 5/8 * c1
 *    This is about a 40% performance improvement.  It also appears to
 *    match what hardware DXT decoders do, as the colors produced
 *    by this integer math match what hardware produces, while the
 *    floating point in dxtToRgb565Unoptimized() produce slightly
 *    different colors (for one GPU this was tested on).
 * 2. Unroll the inner loop.  Another ~10% improvement.
 * 3. Compute r0, g0, b0, r1, g1, b1 only once instead of twice.
 *    Another 10% improvement.
 * 4. Use a Uint16Array instead of a Uint8Array.  Another 10% improvement.
 * @author Evan Parker
 * @param {Uint16Array} src The src DXT bits as a Uint16Array.
 * @param {number} srcByteOffset
 * @param {number} width
 * @param {number} height
 * @return {Uint16Array} dst
 */
exports.dxt_to_rgb_565 = dxt_to_rgb_565;
function dxt_to_rgb_565(src, src16Offset, width, height) {
    var c = new Uint16Array(4);
    var dst = new Uint16Array(width * height);
    var nWords = (width * height) / 4;
    var m = 0;
    var dstI = 0;
    var i = 0;
    var r0 = 0, g0 = 0, b0 = 0, r1 = 0, g1 = 0, b1 = 0;

    var blockWidth = width / 4;
    var blockHeight = height / 4;
    for (var blockY = 0; blockY < blockHeight; blockY++) {
        for (var blockX = 0; blockX < blockWidth; blockX++) {
            i = src16Offset + 4 * (blockY * blockWidth + blockX);
            c[0] = src[i];
            c[1] = src[i + 1];
            r0 = c[0] & 0x1f;
            g0 = c[0] & 0x7e0;
            b0 = c[0] & 0xf800;
            r1 = c[1] & 0x1f;
            g1 = c[1] & 0x7e0;
            b1 = c[1] & 0xf800;
            // Interpolate between c0 and c1 to get c2 and c3.
            // Note that we approximate 1/3 as 3/8 and 2/3 as 5/8 for
            // speed.  This also appears to be what the hardware DXT
            // decoder in many GPUs does :)
            c[2] = ((5 * r0 + 3 * r1) >> 3)
                | (((5 * g0 + 3 * g1) >> 3) & 0x7e0)
                | (((5 * b0 + 3 * b1) >> 3) & 0xf800);
            c[3] = ((5 * r1 + 3 * r0) >> 3)
                | (((5 * g1 + 3 * g0) >> 3) & 0x7e0)
                | (((5 * b1 + 3 * b0) >> 3) & 0xf800);
            m = src[i + 2];
            dstI = (blockY * 4) * width + blockX * 4;
            dst[dstI] = c[m & 0x3];
            dst[dstI + 1] = c[(m >> 2) & 0x3];
            dst[dstI + 2] = c[(m >> 4) & 0x3];
            dst[dstI + 3] = c[(m >> 6) & 0x3];
            dstI += width;
            dst[dstI] = c[(m >> 8) & 0x3];
            dst[dstI + 1] = c[(m >> 10) & 0x3];
            dst[dstI + 2] = c[(m >> 12) & 0x3];
            dst[dstI + 3] = c[(m >> 14)];
            m = src[i + 3];
            dstI += width;
            dst[dstI] = c[m & 0x3];
            dst[dstI + 1] = c[(m >> 2) & 0x3];
            dst[dstI + 2] = c[(m >> 4) & 0x3];
            dst[dstI + 3] = c[(m >> 6) & 0x3];
            dstI += width;
            dst[dstI] = c[(m >> 8) & 0x3];
            dst[dstI + 1] = c[(m >> 10) & 0x3];
            dst[dstI + 2] = c[(m >> 12) & 0x3];
            dst[dstI + 3] = c[(m >> 14)];
        }
    }
    return dst;
}

/**
 * Parses a DDS file from the given arrayBuffer and uploads it into the currently bound texture
 *
 * @param {WebGLRenderingContext} gl WebGL rendering context
 * @param {WebGLCompressedTextureS3TC} ext WEBGL_compressed_texture_s3tc extension object
 * @param {TypedArray} arrayBuffer Array Buffer containing the DDS files data
 * @param {boolean} [loadMipmaps] If false only the top mipmap level will be loaded, otherwise all available mipmaps will be uploaded
 *
 * @returns {number} Number of mipmaps uploaded, 0 if there was an error
 */
exports.upload_dds_levels = upload_dds_levels;
function upload_dds_levels(gl, ext, arrayBuffer, loadMipmaps) {
    var header = new Int32Array(arrayBuffer, 0, HEADER_LENGTH_INT),
        fourCC, blockBytes, internalFormat,
        width, height, dataLength, dataOffset,
        rgb565Data, byteArray, mipmapCount, i;

    if(header[OFFSET_MAGIC] != DDS_MAGIC) {
        m_print.error("Invalid magic number in DDS header");
        return 0;
    }
    
    if(!header[OFFSET_PF_FLAGS] & DDPF_FOURCC) {
        m_print.error("Unsupported format, must contain a FourCC code");
        return 0;
    }

    fourCC = header[OFFSET_PF_FOUR_CC];
    switch(fourCC) {
        case FOURCC_DXT1:
            blockBytes = 8;
            internalFormat = ext ? ext.COMPRESSED_RGB_S3TC_DXT1_EXT : null;
            break;

        case FOURCC_DXT3:
            blockBytes = 16;
            internalFormat = ext ? ext.COMPRESSED_RGBA_S3TC_DXT3_EXT : null;
            break;

        case FOURCC_DXT5:
            blockBytes = 16;
            internalFormat = ext ? ext.COMPRESSED_RGBA_S3TC_DXT5_EXT : null;
            break;

        default:
            m_print.error("Unsupported FourCC code:", int32_to_fourcc(fourCC));
            return null;
    }

    mipmapCount = 1;
    if(header[OFFSET_FLAGS] & DDSD_MIPMAPCOUNT && loadMipmaps !== false) {
        mipmapCount = Math.max(1, header[OFFSET_MIPMAPCOUNT]);
    }

    width = header[OFFSET_WIDTH];
    height = header[OFFSET_HEIGHT];
    dataOffset = header[OFFSET_SIZE] + 4;

    if(ext) {
        for(i = 0; i < mipmapCount; ++i) {
            dataLength = Math.max( 4, width )/4 * Math.max( 4, height )/4 * blockBytes;
            byteArray = new Uint8Array(arrayBuffer, dataOffset, dataLength);
            gl.compressedTexImage2D(gl.TEXTURE_2D, i, internalFormat, width, height, 0, byteArray);
            dataOffset += dataLength;
            //width *= 0.5;
            //height *= 0.5;
            // fix issue with non-square textures
            width = Math.max(width * 0.5, 1);
            height = Math.max(height * 0.5, 1);
        }
    } else {
        if(fourCC == FOURCC_DXT1) {
            dataLength = Math.max( 4, width )/4 * Math.max( 4, height )/4 * blockBytes;
            byteArray = new Uint16Array(arrayBuffer);
            rgb565Data = dxt_to_rgb_565(byteArray, dataOffset / 2, width, height);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, width, height, 0, gl.RGB, gl.UNSIGNED_SHORT_5_6_5, rgb565Data);
            if(loadMipmaps) {
                gl.generateMipmap(gl.TEXTURE_2D);
            }
        } else {
            m_print.error("No manual decoder for", int32_to_fourcc(fourCC), "and no native support");
            return 0;
        }
    }

    return mipmapCount;
}

/**
 * Extract DDS width and height from the given arrayBuffer
 * @param {TypedArray} arrayBuffer Array Buffer containing the DDS files data
 * @returns {Object3D} Width and height of DDS image
 */
exports.get_width_height = function(arrayBuffer) {
    var header = new Int32Array(arrayBuffer, 0, HEADER_LENGTH_INT);    
    return {
        width: header[OFFSET_WIDTH],
        height: header[OFFSET_HEIGHT]
    }
}

/**
 * Calculate compress ratio for DDS from the given arrayBuffer
 * @param {TypedArray} arrayBuffer Array Buffer containing the DDS files data
 * @returns {number} Compress ratio according to DDS compression variant
 */
exports.get_compress_ratio = function(arrayBuffer) {
    var comp_ratio = 1;

    var header = new Int32Array(arrayBuffer, 0, HEADER_LENGTH_INT);
    var fourCC = header[OFFSET_PF_FOUR_CC];
    switch(fourCC) {
    case FOURCC_DXT1:
        var comp_ratio = 6;
        break;
    case FOURCC_DXT3:
    case FOURCC_DXT5:
        var comp_ratio = 4;
        break;
    default:
        m_print.error("Unsupported FourCC code:", int32_to_fourcc(fourCC));
        break;
    }
    return comp_ratio;
}

/**
 * Creates a texture from the DDS file at the given URL. Simple shortcut for the most common use case
 *
 * @param {WebGLRenderingContext} gl WebGL rendering context
 * @param {WebGLCompressedTextureS3TC} ext WEBGL_compressed_texture_s3tc extension object
 * @param {string} src URL to DDS file to be loaded
 * @param {function} [callback] callback to be fired when the texture has finished loading
 *
 * @returns {WebGLTexture} New texture that will receive the DDS image data
 */
exports.load_dds_texture_ex = load_dds_texture_ex;
function load_dds_texture_ex(gl, ext, src, texture, loadMipmaps, callback) {
    var xhr = new XMLHttpRequest();
    
    xhr.open('GET', src, true);
    xhr.responseType = "arraybuffer";
    xhr.onload = function() {
        if(xhr.status == 200) {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            var mipmaps = upload_dds_levels(gl, ext, xhr.response, loadMipmaps);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mipmaps > 1 ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
        }

        if(callback) {
            callback(texture);
        }
    };
    xhr.send(null);

    return texture;
}

/**
 * Creates a texture from the DDS file at the given URL. Simple shortcut for the most common use case
 *
 * @param {WebGLRenderingContext} gl WebGL rendering context
 * @param {WebGLCompressedTextureS3TC} ext WEBGL_compressed_texture_s3tc extension object
 * @param {string} src URL to DDS file to be loaded
 * @param {function} [callback] callback to be fired when the texture has finished loading
 *
 * @returns {WebGLTexture} New texture that will receive the DDS image data
 */
exports.load_dds_texture = function(gl, ext, src, callback) {
    var texture = gl.createTexture();
    load_dds_texture_ex(gl, ext, src, texture, true, callback);
    return texture;
}

function fourcc_to_int32(value) {
    return value.charCodeAt(0) +
        (value.charCodeAt(1) << 8) +
        (value.charCodeAt(2) << 16) +
        (value.charCodeAt(3) << 24);
}

function int32_to_fourcc(value) {
    return String.fromCharCode(
        value & 0xff,
        (value >> 8) & 0xff,
        (value >> 16) & 0xff,
        (value >> 24) & 0xff
    );
}

}
