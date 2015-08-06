/**
 * Used constants.
 * @name consts
 */

// Type qualifiers
exports.UNIFORM = "uniform";
exports.ATTRIBUTE = "attribute";
exports.VARYING = "varying";

// Property types
exports.ARRAY_DATA = 0;
exports.OBJECT_DATA = 1;
exports.OTHER_DATA = 2;

// Scope statuses
exports.SCOPE_START = 3;
exports.SCOPE_END = 4;

// Include statuses
exports.INCLUDE_START = 5;
exports.INCLUDE_END = 6;

// Shared ids types
exports.SHARED_INCLUDE = 7;
exports.SHARED_VARYING = 8;

// File types
exports.MAIN_SHADER_FILE = 9;
exports.INCLUDE_FILE = 10;

// Obfuscation automat states
exports.QUAL_OBFUSCATE = 11;
exports.QUAL_OBFUSCATE_VARYING = 12;
exports.QUAL_DONT_OBFUSCATE = 13;
exports.QUAL_ERROR = 14;

// Declaration types
exports.DECL_VAR = 15;
exports.DECL_PARM_VAR = 16;
exports.DECL_STRUCT_TYPE = 17;
exports.DECL_STRUCT_FIELD = 18;
exports.DECL_FUNC = 19;
exports.DEFINE_FUNC = 20;

// Usage types
exports.US_VAR = 21;
exports.US_STRUCT_TYPE = 22;
exports.US_FIELD = 23;
exports.US_INVARIANT_DECL = 24;
exports.US_FUNC_CALL = 25;

// Debug message levels
exports.LOG = 26;
exports.WARN = 27;
exports.ERROR = 28;

// Debug message types
exports.DECL_RESERVED = 29;
exports.UNDECLARED_ID = 30;
exports.BAD_QUAL_COLLISION = 31;
exports.EXP_DATA_VIOLATION = 32;
exports.IMP_DATA_VIOLATION = 33;
exports.POSSIBLE_IMPORT = 34;
exports.UNSUPPORTED_EXTENSION = 35;
exports.EXT_ALL_WRONG_BEHAVIOR = 36;
