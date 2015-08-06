/**
 * Reserved identifiers and character sequences.
 * @name reserved_tokens
 */

// TODO: support GLSL macros related to extensions?

var _reserved_tokens = {
    keywords: ["attribute", "const", "uniform", "varying", "break",
        "continue", "do", "for", "while", "if", "else", "in", "out", "inout",
        "float", "int", "void", "bool", "true", "false", "lowp", "mediump",
        "highp", "precision", "invariant", "discard", "return", "mat2",
        "mat3", "mat4", "vec2", "vec3", "vec4", "ivec2", "ivec3", "ivec4",
        "bvec2", "bvec3", "bvec4", "sampler2D", "samplerCube", "struct"
    ],
    future_use_keywords: ["asm", "class", "union", "enum", "typedef",
        "template", "this", "packed", "goto", "switch", "default", "inline",
        "noinline", "volatile", "public", "static", "extern", "external",
        "interface", "flat", "long", "short", "double", "half", "fixed",
        "unsigned", "superp", "input", "output", "hvec2", "hvec3", "hvec4",
        "dvec2", "dvec3", "dvec4", "fvec2", "fvec3", "fvec4", "sampler1D",
        "sampler3D", "sampler1DShadow", "sampler2DShadow", "sampler2DRect",
        "sampler3DRect", "sampler2DRectShadow", "sizeof", "cast", "namespace",
        "using"
    ],
    vector_components: ["xyzw", "rgba", "stpq"],
    built_in: ["radians", "degrees", "sin", "cos", "tan", "asin", "acos",
        "atan", "pow", "exp", "log", "exp2", "log2", "sqrt", "inversesqrt",
        "abs", "sign", "floor", "ceil", "fract", "mod", "min", "max", "clamp",
        "mix", "step", "smoothstep", "length", "distance", "dot", "cross",
        "normalize", "faceforward", "reflect", "refract", "matrixCompMult",
        "lessThan", "lessThanEqual", "greaterThan", "greaterThanEqual",
        "equal", "notEqual", "any", "all", "not", "texture2DLod",
        "texture2DProjLod", "textureCubeLod", "texture2D", "texture2DProj",
        "textureCube"
    ],
    extensions: {
        GL_OES_standard_derivatives: ["dFdx", "dFdy", "fwidth"]
    },
    prefixes: ["gl_", "webgl_"],
    infixes: ["__"],
    special: ["main"],

    vardef_additional: [],

    // specific b4w identifiers coming from engine
    b4w_disable_obfuscation: ["ZERO_VALUE_NODES", "UNITY_VALUE_NODES"]
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

    // NOTE: disallow names from all extensions even disabled
    for (var ext_name in _reserved_tokens.extensions)    
        if (_reserved_tokens.extensions[ext_name].indexOf(token) > -1)
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
    return ext_name in _reserved_tokens.extensions;
}
