/**
 * Debug messages.
 * @name debug
 */

var m_consts = require("./consts.js");

// Identical messages, duplications won't be displayed
var _db_ident_messages = [];

exports.debug_message = function(message_type, file_name) {
    var message = null;
    var message_level = m_consts.LOG;

    switch (message_type) {
    case m_consts.DECL_RESERVED:
        var identifier_name = arguments[2];
        var declaration_type = arguments[3];
        message_level = m_consts.ERROR;
        message = "Using reserved word in "
                + decl_type_to_description(declaration_type) + " '"
                + identifier_name + "'. ";
        break;

    case m_consts.UNDECLARED_ID:
        var identifier_name = arguments[2];
        var usage_type = arguments[3];
        message_level = m_consts.ERROR;
        message = "Undeclared "
                + usage_type_to_description(usage_type) + ": '"
                + identifier_name + "'. ";
        break;

    case m_consts.BAD_QUAL_COLLISION:
        var identifier_name = arguments[2];
        message_level = m_consts.ERROR;
        message = "Bad preprocessing collision while obfuscation identifier: '"
                + identifier_name + "'. Varying/uniform or varying/attribute "
                + "qualifiers combination. ";
        break;

    case m_consts.EXP_DATA_VIOLATION:
        var identifier_name = arguments[2];
        var usage_type = arguments[3];
        var incl_name = arguments[4];
        message_level = m_consts.ERROR;

        message = "Undeclared "
                + usage_type_to_description(usage_type) + ": '"
                + identifier_name + "'. Possibly exporting needed in include file '" + incl_name + "'. ";
        break;

    case m_consts.IMP_DATA_VIOLATION:
        var identifier_name = arguments[2];
        var usage_type = arguments[3];
        message_level = m_consts.ERROR;

        message = "Undeclared "
                + usage_type_to_description(usage_type) + ": '"
                + identifier_name + "'. Importing data missed. ";
        break;

    case m_consts.POSSIBLE_IMPORT:
        var identifier_name = arguments[2];
        var usage_type = arguments[3];
        message_level = m_consts.ERROR;

        message = "Undeclared "
                + usage_type_to_description(usage_type) + ": '"
                + identifier_name + "'. Possibly importing needed. ";
        break;

    case m_consts.UNSUPPORTED_EXTENSION:
        var extension_name = arguments[2];
        message_level = m_consts.ERROR;

        message = "Extension " + extension_name + " is unsupported in obfuscator. "
        break;

    case m_consts.EXT_ALL_WRONG_BEHAVIOR:
        var behavior = arguments[2];
        message_level = m_consts.ERROR;

        message = "The 'all' extension cannot have '" + behavior + "' behavior. "
        break;
    }

    if (message !== null) {
        message += "File: '" + file_name + "'";
        if (_db_ident_messages.indexOf(message) == -1) {
            _db_ident_messages.push(message);
            switch (message_level) {
            case m_consts.LOG:
                console.log("Log: " + message);
                break;
            case m_consts.WARN:
                console.warn("Warning! " + message);
                break;
            case m_consts.ERROR:
                fail("Error! " + message);
                break;
            }
        }
    }
}

function decl_type_to_description(decl_type) {
    var desc = null;

    switch (decl_type) {
    case m_consts.DECL_VAR:
        desc = "variable declaration";
        break;
    case m_consts.DECL_PARM_VAR:
        desc = "function parameter declaration";
        break;
    case m_consts.DECL_STRUCT_TYPE:
        desc = "struct declaration";
        break;
    case m_consts.DECL_STRUCT_FIELD:
        desc = "struct field declaration";
        break;
    case m_consts.DECL_FUNC:
        desc = "function declaration";
        break;
    case m_consts.DEFINE_FUNC:
        desc = "function definition";
        break;
    default:
        desc = "declaration";
        break;
    }

    return desc;
}

function usage_type_to_description(usage_type) {
    var desc = null;

    switch (usage_type) {
    case m_consts.US_VAR:
        desc = "variable";
        break;
    case m_consts.US_STRUCT_TYPE:
        desc = "structure type";
        break;
    case m_consts.US_FIELD:
        desc = "structure field";
        break;
    case m_consts.US_INVARIANT_DECL:
        desc = "variable and invariant qualifying";
        break;
    case m_consts.US_FUNC_CALL:
        desc = "function";
        break;
    default:
        desc = "identifier";
        break;
    }

    return desc;
}

exports.fail = fail;
function fail(message) {
    console.error(message);
    process.exit(1);
}

/**
 * Log data in a readable format.
 */
exports.log = log;
function log(data) {
    console.log(JSON.stringify(data, null, 4));
}

exports.cleanup = cleanup;
function cleanup() {
    _db_ident_messages.length = 0;
}
