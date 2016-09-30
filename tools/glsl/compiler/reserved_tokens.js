/**
 * Reserved identifiers and character sequences.
 * @name reserved_tokens
 */

// TODO: support GLSL macros related to extensions?

var _reserved_tokens = {
    keywords: [
        // GLSL ES 1.0, excluding "varying" and "uniform"
        "const", "uniform", "break", "continue", "do", "for", "while", 
        "if", "else", "in", "out", "inout", "float", "int", "void", "bool", 
        "true", "false", "lowp", "mediump", "highp", "precision", "invariant", 
        "discard", "return", "mat2", "mat3", "mat4", "vec2", "vec3", "vec4", 
        "ivec2", "ivec3", "ivec4", "bvec2", "bvec3", "bvec4", "sampler2D", 
        "samplerCube", "struct",

        // compatibility tokens
        "GLSL_IN", "GLSL_OUT"
    ],
    future_use_keywords: [
        // combined from GLSL ES 1.0 и GLSL ES 3.0
        "attribute", "varying", "coherent", "restrict", "readonly", "writeonly", 
        "resource", "atomic_uint", "noperspective", "patch", "sample", 
        "subroutine", "common", "partition", "active", "asm", "class", "union", 
        "enum", "typedef", "template", "this", "packed", "goto", "switch", 
        "default", "flat", "inline", "noinline", "volatile", "public", 
        "static", "extern", "external", "interface", "long", "short", "double", 
        "half", "fixed", "unsigned", "superp", "input", "output", "hvec2", 
        "hvec3", "hvec4", "dvec2", "dvec3", "dvec4", "fvec2", "fvec3", 
        "fvec4", "sampler3DRect", "filter", "image1D", "image2D", "image3D", 
        "imageCube", "iimage1D", "iimage2D", "iimage3D", "iimageCube", 
        "uimage1D", "uimage2D", "uimage3D", "uimageCube", "image1DArray", 
        "image2DArray", "iimage1DArray", "iimage2DArray", "uimage1DArray", 
        "uimage2DArray", "image1DShadow", "image2DShadow", "image1DArrayShadow", 
        "image2DArrayShadow", "imageBuffer", "iimageBuffer", "uimageBuffer", 
        "sampler1D", "sampler1DShadow", "sampler1DArray", "sampler1DArrayShadow", 
        "isampler1D", "isampler1DArray", "usampler1D", "usampler1DArray", 
        "sampler2DRect", "sampler2DRectShadow", "isampler2DRect", 
        "usampler2DRect", "samplerBuffer", "isamplerBuffer", "usamplerBuffer", 
        "sampler2DMS", "isampler2DMS", "usampler2DMS", "sampler2DMSArray", 
        "isampler2DMSArray", "usampler2DMSArray", "sampler3D", "sampler2DShadow", 
        "sizeof", "cast", "namespace", "using"
    ],
    vector_components: ["xyzw", "rgba", "stpq"],
    
    built_in: [
        // GLSL ES 1.0
        "radians", "degrees", "sin", "cos", "tan", "asin", "acos",
        "atan", "pow", "exp", "log", "exp2", "log2", "sqrt", "inversesqrt",
        "abs", "sign", "floor", "ceil", "fract", "mod", "min", "max", "clamp",
        "mix", "step", "smoothstep", "length", "distance", "dot", "cross",
        "normalize", "faceforward", "reflect", "refract", "matrixCompMult",
        "lessThan", "lessThanEqual", "greaterThan", "greaterThanEqual",
        "equal", "notEqual", "any", "all", "not", "texture2DLod",
        "texture2DProjLod", "textureCubeLod", "texture2D", "texture2DProj",
        "textureCube",

        // added in GLSL ES 3.0
        "sinh", "cosh", "tanh", "asinh", "acosh", "atanh", "trunc", "round", 
        "roundEven", "isnan", "isinf", "floatBitsToInt", "floatBitsToUint", 
        "intBitsToFloat", "uintBitsToFloat", "packSnorm2x16", "packUnorm2x16", 
        "unpackSnorm2x16", "unpackUnorm2x16", "packHalf2x16", "unpackHalf2x16", 
        "outerProduct", "transpose", "determinant", "inverse", "textureSize", 
        "texture", "textureProj", "textureLod", "textureOffset", "texelFetch", 
        "texelFetchOffset", "textureProjOffset", "textureLodOffset", 
        "textureProjLod", "textureProjLodOffset", "textureGrad", 
        "textureGradOffset", "textureProjGrad", "textureProjGradOffset",
        "sampler2DShadow",

        // GL_OES_standard_derivatives or built-in in GLSL ES 3.0
        "dFdx", "dFdy", "fwidth",

        // compatibility tokens
        "GLSL_TEXTURE", "GLSL_TEXTURE_CUBE", "GLSL_TEXTURE_PROJ", "GLSL_SMPLR2D_SHDW"
    ],

    extensions: ["GL_OES_standard_derivatives"],
    prefixes: [
        // GLSL ES 1.0/3.0
        "gl_", 

        // WebGL specific
        "webgl_", "_webgl_",

        // custom for compatibility
        "GLSL_"
    ],
    infixes: ["__"],

    // "reserved", but allowed
    special: ["main", "GLSL_OUT_FRAG_COLOR"],

    vardef_additional: [],

    // specific b4w identifiers coming from engine
    b4w_disable_obfuscation: ["_0_0", "_1_0"]
}

exports.set_vardef_tokens = function(vardef_tokens) {
    if (vardef_tokens)
        _reserved_tokens.vardef_additional = vardef_tokens;
}

exports.is_reserved = function(token) {
    if (_reserved_tokens.keywords.indexOf(token) > -1)
        return true;
    if (_reserved_tokens.future_use_keywords.indexOf(token) > -1)
        return true;
    if (_reserved_tokens.built_in.indexOf(token) > -1)
        return true;
    for (var i = 0; i < _reserved_tokens.prefixes.length; i++) {
        var prefix = _reserved_tokens.prefixes[i];
        if (token.indexOf(prefix) == 0)
            return true;
    }
    for (var i = 0; i < _reserved_tokens.infixes.length; i++) {
        var infix = _reserved_tokens.infixes[i];
        if (token.indexOf(infix) > -1)
            return true;
    }

    if (_reserved_tokens.special.indexOf(token) > -1)
        return true;

    return false;
}

exports.is_vardef = function(token) {
    return _reserved_tokens.vardef_additional.indexOf(token) > -1;
}

exports.is_b4w_specific = function(token) {
    return _reserved_tokens.b4w_disable_obfuscation.indexOf(token) > -1;
}

exports.is_special = function(token) {
    return _reserved_tokens.special.indexOf(token) > -1;
}

exports.extension_is_supported = function(ext_name) {
    return _reserved_tokens.extensions.indexOf(ext_name) >= 0;
}

exports.is_vector_accessor = function(name) {
    if (name.length >= 1 && name.length <= 4) {
        var vec_comp = _reserved_tokens.vector_components;
        for (var i = 0; i < vec_comp.length; i++) {
            var expr = new RegExp("[" + vec_comp[i] + "]", "g");
            if (name.replace(expr, "").length == 0)
                return true;
        }
    }

    return false;
}
