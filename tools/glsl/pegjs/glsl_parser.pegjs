/**
 * GLSL parser.
 * Based on OpenGL ES Shading Language 1.00.17 Specification (May 12, 2009)
 * http://www.khronos.org/registry/gles/specs/2.0/GLSL_ES_Specification_1.0.17.pdf
 * and OpenGL ES Shading Language 3.00.3 Specification (July 11, 2012)
 * https://www.khronos.org/registry/gles/specs/3.0/GLSL_ES_Specification_3.00.3.pdf
 * with custom interjacent macros.
 *
 * The rules follow the GLSL ES 1.0 grammar except some additional changes to be 
 * compatible with the GLSL ES 3.0 version.
 */

{ 

  var _RESERVED = [
    // use keywords from GLSL ES 1.0 only
    "const", "uniform", "break", "continue", "do", "for", "while", "if", "else", 
    "in", "out", "inout", "float", "int", "void", "bool", "lowp", "mediump", 
    "highp", "precision", "invariant", "discard", "return", "mat2", "mat3", "mat4", 
    "vec2", "vec3", "vec4", "ivec2", "ivec3", "ivec4", "bvec2", "bvec3", "bvec4", 
    "sampler2D", "samplerCube", "struct", 

    // additional custom or GLSL ES 3.0 keywords
    "GLSL_IN", "GLSL_OUT",

    // reserved for future use in (union of the GLSL ES 1.0 and GLSL ES 3.0 keywords)
    "attribute", "varying", "coherent", "restrict", "readonly", "writeonly", "resource", 
    "atomic_uint", "noperspective", "patch", "sample", "subroutine", "common", 
    "partition", "active", "asm", "class", "union", "enum", "typedef", "template", 
    "this", "packed", "goto", "switch", "default", "flat", "inline", "noinline", 
    "volatile", "public", "static", "extern", "external", "interface", "long", 
    "short", "double", "half", "fixed", "unsigned", "superp", "input", "output", 
    "hvec2", "hvec3", "hvec4", "dvec2", "dvec3", "dvec4", "fvec2", "fvec3", "fvec4", 
    "sampler3DRect", "filter", "image1D", "image2D", "image3D", "imageCube", 
    "iimage1D", "iimage2D", "iimage3D", "iimageCube", "uimage1D", "uimage2D", 
    "uimage3D", "uimageCube", "image1DArray", "image2DArray", "iimage1DArray", 
    "iimage2DArray", "uimage1DArray", "uimage2DArray", "image1DShadow", 
    "image2DShadow", "image1DArrayShadow", "image2DArrayShadow", "imageBuffer", 
    "iimageBuffer", "uimageBuffer", "sampler1D", "sampler1DShadow", 
    "sampler1DArray", "sampler1DArrayShadow", "isampler1D", "isampler1DArray", 
    "usampler1D", "usampler1DArray", "sampler2DRect", "sampler2DRectShadow", 
    "isampler2DRect", "usampler2DRect", "samplerBuffer", "isamplerBuffer", 
    "usamplerBuffer", "sampler2DMS", "isampler2DMS", "usampler2DMS", 
    "sampler2DMSArray", "isampler2DMSArray", "usampler2DMSArray", "sampler3D", 
    "sampler2DShadow", "sizeof", "cast", "namespace", "using"
  ];

  function token_is_reserved(token) {
    return (token.indexOf("__") > -1) || (_RESERVED.indexOf(token) > -1);
  }

  // NOTE: buggy for nontrivial usage of #define directives, e.g. cycle or 
  // chain substitutions 
  function vardef_replace(units) {
    var repl_non_node = {};
    var repl_all = {};

    for (var i = 0; i < units.length; i++) {
      var unit = units[i][0];

      if (unit.node == "directive") {
        switch(unit.type) {
          case "var":
          case "define":
            repl_non_node[unit.repl.from] = unit.repl.to;
            repl_all[unit.repl.from] = unit.repl.to;
            break;
          case "undef":
            delete repl_non_node[unit.identifier];
            delete repl_all[unit.identifier];
            break;
        }
      } else if (unit.node == "node_directive") {
        switch (unit.type) {
          case "node_var":
            repl_all[unit.repl.from] = unit.repl.to;
            break;
          case "endnode":
            repl_all = JSON.parse(JSON.stringify(repl_non_node));
            break;
        }
      } else if (unit.node == "text")
        for (var j = 0; j < unit.result.length; j++) {
          var token = unit.result[j];
          for (var from in repl_all)
            if (token == from) {
              var to = vardef_recourse(repl_all[from], repl_all);
              units[i][0].result[j] = "/*%replace%from%" + from 
                  + "%to%" + to + "%*/" + to + "/*%replace_end%*/";
              break;
            }
      }
    }
    return units;
  }

  function vardef_recourse(text_to, repls) {
    for (var from in repls) {
      var to = repls[from];
      var expr_str = "(^|[^0-9a-zA-Z_])" + from + "([^0-9a-zA-Z_]|$)";
      var expr = new RegExp(expr_str, "g");
      text_to = text_to.replace(expr, "$1" + to + "$2");
    }

    return text_to;
  }

  function build_listing(units) {
    var listing = "";

    var nodes_collector = {
      current_node: null,
      nodes_structure: {},
    }

    for (var i = 0; i < units.length; i++) {
      var unit = units[i][0];

      // usual directives
      if (unit.node == "directive")
        listing += "/*%directive%" + unit.source_str + "%directive_end%*/\n";

      // includes
      else if (unit.node == "include")
        listing += "/*%" + unit.type + "%" + unit.name + "%*/\n";

      // simple textlines
      else if (unit.node == "text")
        listing += build_textline(unit, nodes_collector);

      // node directives
      else if (unit.node == "node_directive")
        listing += build_node_directive(unit, nodes_collector);
    }
    
    return listing;
  }



  function build_textline(unit, nodes_collector) {
    var listing = "";

    // collect textlines if they are inside a #node and append them 
    // later in #nodes_main
    if (nodes_collector.current_node != null)
      nodes_collector.nodes_structure[nodes_collector.current_node].push(unit);
    // append to lisitng immediately if textlines are outside a node
    else
      for (var i = 0; i < unit.result.length; i++)
        listing += unit.result[i];

    return listing;
  }

  function build_node_directive(unit, nodes_collector) {
    var listing = "";

    if (unit.type != "node" && unit.type != "endnode" && unit.type != "nodes_global" 
        && unit.type != "nodes_main" && nodes_collector.current_node == null) {
      console.error("Warning! Outlier directive #" + unit.type);
      return listing;
    }
    switch (unit.type) {
      case "node":
        listing += "/*%" + unit.type + "%" + unit.name + "%*/\n";
        nodes_collector.current_node = unit.name;
        nodes_collector.nodes_structure[nodes_collector.current_node] = [];
        break;
      case "endnode":
        listing += "/*%" + unit.type + "%*/\n";
        nodes_collector.current_node = null;
        break;

      case "node_in":
      case "node_out":
      case "node_param":
        nodes_collector.nodes_structure[nodes_collector.current_node].push(unit);
        break;
      case "node_var":
      case "node_condition":
        // do not move node_var/node_condition into nodes_main or nodes_global
        listing += "/*%" + unit.type + "%" + unit.source_str + "%" + 
            nodes_collector.current_node + "%" + unit.offset + "%*/\n";
        break;

      case "nodes_main":
        listing += build_nodes_main(nodes_collector.nodes_structure);
        break;
      case "nodes_global":
        listing += build_nodes_global(nodes_collector.nodes_structure);
        break;
    }
    return listing;
  }

  function build_nodes_main(nodes_structure) {
    var listing = "/*%nodes_main%*/\n";
    var new_scope = true;
    for (var node_name in nodes_structure) {
      var node = nodes_structure[node_name];
      for (var j = 0; j < node.length; j++)
        switch (node[j].type) {
          case "node_in":
          case "node_out":
            listing += build_node_in_out_param(node_name, node[j]);
            break;
          case "textline":
            if (new_scope) {
              listing += "{";
              new_scope = false;
            }
            listing += build_node_textline(node_name, node, node[j]);
            break;
        }

      if (!new_scope) {
        listing += "}";
        new_scope = true;
      }
    }
    listing += "/*%nodes_main_end%*/\n";

    return listing;
  }

  function build_nodes_global(nodes_structure) {
    var listing = "/*%nodes_global%*/\n";
    for (var node_name in nodes_structure) {
      var node = nodes_structure[node_name];

      for (var j = 0; j < node.length; j++)
        if (node[j].type == "node_param")
          listing += build_node_in_out_param(node_name, node[j]);
    }
    listing += "/*%nodes_global_end%*/\n";

    return listing;
  }

  function build_node_textline(node_name, node, ndir) {
    var listing = "/*%node_textline%" + node_name + "%*/";

    var text = "";
    for (var i = 0; i < ndir.result.length; i++)
      text += ndir.result[i];

    for (var i = 0; i < node.length; i++)
      if (node[i].type == "node_in" || node[i].type == "node_out" 
          || node[i].type == "node_param") {
        var name = "node_" + node_name + "_var_" + node[i].identifier.name;
        var expr_str = "([^0-9a-zA-Z_]|^)(" + node[i].identifier.name + ")(?![0-9a-zA-Z_])";
        var expr = new RegExp(expr_str, "gm");
        text = text.replace(expr, "$1" + name);
      }

    listing += text;
    listing += "/*%node_textline_end%" + ndir.offset + "%*/\n";
    return listing;
  }

  function build_node_in_out_param(node_name, ndir) {
    var listing = "/*%" + ndir.type + "%*/";

    if (ndir.decl_type.type_qualifier) {
      var value = ndir.decl_type.type_qualifier.value;
      if(value.constructor == Array)
        for (var i = 0; i < value.length; i++)
          listing += value[i].name + " ";
      else
        listing += value.name + " ";
    }

    if (ndir.decl_type.precision_qualifier)
      listing += ndir.decl_type.precision_qualifier.value.name + " ";
    listing += ndir.decl_type.type_specifier.name.name + " ";
    listing += "node_" + node_name + "_var_" + ndir.identifier.name + ";";
    listing += "/*%" + ndir.type + "_end%" + ndir.is_optional + "%";
    listing += node_name + "%" + ndir.offset + "%*/\n";

    return listing;
  }

  // GLSL parsing: read directives
  var _pp_node_with_node_condition = [];
  var _pp_vardef_identifiers = [];
  // {uid: node}
  var _uid_to_node = {};

  var _pp_insertions = {};
  var _pp_insertions_array = [];

  function check_directive_comment(symbols) {
    // check directive comment insertion
    var str = "";
    for (var i = 0; i < symbols.length; i++)
      str += symbols[i][1];
    str = str.trim();
    if (str.charAt(0) == "%") {
      check_directive(str) || check_replace(str) || check_node_insertion(str)
      || check_node_borders(str) || check_node_parameters(str) || check_node_condition(str)
      || check_node_var(str) || check_include(str);
    }
  }

  function check_directive(str) {
    var expr = /^%directive%(.*?)%directive_end%/i;
    var res = expr.exec(str);
    if (res) {
      _pp_insertions[offset()] = "\n/*" + str + "*/\n";
      return check_directive_vardef(res[1]);
    }
    return false;
  }

  function check_directive_vardef(str) {
    var expr = /^ *?# *?(define|var) *?([0-9a-z_]+)/i;
    var res = expr.exec(str);
    if (res) {
      if (_pp_vardef_identifiers.indexOf(res[2]) == -1)
        _pp_vardef_identifiers.push(res[2]);
      return true;
    }
    return false;
  }

  function check_replace(str) {
    var expr = /^%replace((_end)|(%from%.*?%to%.*?))%$/i;
    var res = expr.exec(str);
    if (res) {
      _pp_insertions[offset()] = " /*" + str + "*/ ";
      return true;
    }
    return false;
  }

  function check_node_insertion(str) {
    var expr = /^%(nodes_global|nodes_main)(_end)?%$/i;
    var res = expr.exec(str);
    if (res) {
      _pp_insertions[offset()] = "\n/*" + str + "*/\n";
      return true;
    }
    return false;
  }

  function check_node_borders(str) {
    var expr = /^%((node%.*?)|endnode)%$/i;
    var res = expr.exec(str);
    if (res) {
      _pp_insertions[offset()] = "\n/*" + str + "*/\n";
      return true;
    }
    return false; 
  }

  function check_node_parameters(str) {
    var expr = /^%(node_in|node_out|node_param|node_textline)(_end)?.*?%$/i;
    var res = expr.exec(str);

    if (res) {
      _pp_insertions[offset()] = "\n/*" + str + "*/\n";
      return true;
    }
    return false; 
  }

  function check_node_condition(str) {
    var expr = /^%node_condition.*?%$/i;
    var res = expr.exec(str);

    if (res) {
      _pp_insertions[offset()] = "\n/*" + str + "*/\n";
      return true;
    }
    return false; 
  }

  function check_node_var(str) {
    var expr = /^%node_var%#node_var *?([0-9a-z_]+)/i;
    var res = expr.exec(str);
    if (res) {
      _pp_insertions[offset()] = "\n/*" + str + "*/\n";
      if (_pp_vardef_identifiers.indexOf(res[1]) == -1)
        _pp_vardef_identifiers.push(res[1]);
      return true;
    }
    return false;
  }

  function check_include(str) {
    var expr = /^%(include|include_end)%(.*?)%$/;
    var res = expr.exec(str);
    if (res) {
      _pp_insertions[offset()] = "\n/*" + str + "*/\n";
      return true;
    }
    return false;
  }

 


  // GLSL parsing: generate special nodes
  if (options.init_node_uid)
    var _node_uid = options.init_node_uid;
  else
    var _node_uid = 0;

  function flat_array(data) {
    var flat = [];

    for (var prop in data)
      if (data[prop])
        if (data[prop].constructor == Array)
          flat.push.apply(flat, flat_array(data[prop]));
        else if (data[prop].constructor == Object)
          flat.push(data[prop]);
    return flat;
  }

  function get_children_with_uid(parent) {
    var result = [];
    var children = flat_array(parent);
    while (children.length > 0) {
      var child = children.pop();

      if ("uid" in child)
        result.push(child);
      else
        children.push.apply(children, flat_array(child));
    }
    return result;
  }

  function common_node(data) {
    data.offset = offset();
    data.uid = _node_uid++;
    data.before_comments = [];

    return data;
  }

  function punctuation_node(type, data) {
    return common_node({
      node: "punctuation_node",
      type: type,
      data: data
    });
  }

  function keyword_node(name) {
    return common_node({
      node: "keyword_node",
      name: name
    });
  }

  function operation_node(type, data) {
    return common_node({
      node: "operation_node",
      type: type,
      data: data
    });
  }

  function binary_chain_node(node_name, first, others) {
    var chain_node = common_node({
      node: node_name,
      left: first
    });

    for (var i = 0; i < others.length; i++) {
      chain_node.operator = others[i][0];
      chain_node.right = others[i][1];

      if (i != others.length - 1)
        chain_node = common_node({
          node: node_name,
          left: chain_node
        });

    }
    return common_node(chain_node);
  }

  function unary_chain_node(node_name, expression, operations) {
    var chain_node = common_node({
      node: node_name,
      expression: expression
    });

    for (var i = 0; i < operations.length; i++) {
      chain_node.operator = operations[i];

      if (i != operations.length - 1)
        chain_node = common_node({
          node: node_name,
          expression: chain_node
        });
    }
    return common_node(chain_node);
  }

  function parenting_unit(ast) {
    var nodes = [ast];
    // {offset: [nodes]}
    var offset_to_nodes = {};
    while (nodes.length > 0) {
      var node = nodes.pop();
      var children = get_children_with_uid(node);

      _uid_to_node[node.uid] = node;
      
      for (var l in children)
        children[l].parent_uid = node.uid;

      nodes.push.apply(nodes, children);

      if (!offset_to_nodes[node.offset])
        offset_to_nodes[node.offset] = [];
      offset_to_nodes[node.offset].push(node.uid);
    }

    // NOTE: _pp_insertions object is very slow in the following code, so using
    // the array instead
    for (var offset in _pp_insertions)
      _pp_insertions_array.push([offset, _pp_insertions[offset]]);

    for (var i in offset_to_nodes) {
      for (var j in offset_to_nodes[i]) {
        var node_uid = offset_to_nodes[i][j];
        if (node_uid in _uid_to_node) {
          var node = _uid_to_node[node_uid];
          // HACK: don't add before_comments to statement_list
          if (node.node != "statement_list") {
            var splice_count = 0;
            for (var k = 0; k < _pp_insertions_array.length; k++) {
              var offset = _pp_insertions_array[k][0];
              var insert_str = _pp_insertions_array[k][1];

              if (offset < node.offset) {
                node.before_comments.push(insert_str);

                var expr = /\/\*%node_condition.*?%\*\//i;
                var res = expr.exec(insert_str);
                if (res && 
                    (_pp_node_with_node_condition.indexOf(node_uid) == -1))
                  _pp_node_with_node_condition.push(node_uid);
                splice_count = k + 1;
              } else
                break;
            }

            _pp_insertions_array.splice(0, splice_count);

          }
        }
      }
    }
    return ast;
  }
}


/*============================================================================
                                  COMPLEX RULES
============================================================================*/
// Start
start
  = tu:(translation_unit / EOF)
  { 
    var data = {
      node_with_node_condition: _pp_node_with_node_condition,
      vardef_ids: _pp_vardef_identifiers,
      uid_to_nodes: _uid_to_node,
    }
    
    if (!tu)
      tu = [];
    
    data.ast = parenting_unit(common_node({
      node: "root",
      parts: tu,
      after_comments: []
    }));

    for (var i = 0; i < _pp_insertions_array.length; i++) 
      data.ast.after_comments.push(_pp_insertions_array[i][1]);

    return data;
  }

translation_unit
  = __ left:external_declaration __ right:translation_unit*
  { 
    var parts = [left];
    parts.push.apply(parts, right[0]);

    return parts;
  }
  // file contains comments only
  / (comment line_terminator_sequence?)+
  { return [] }

// Declarations
external_declaration
  = decl:(function_definition / declaration)
  { 
    return common_node({
      node: "external_declaration",
      decl: decl
    });
  }

declaration
  = func:function_declarator __ s:SEMICOLON 
  {
    return common_node({
      node: "function_declaration",
      function: func,
      punctuation: {
        semicolon: s
      }
    });
  }
  / list:init_declarator_list __ s:SEMICOLON 
  { 
    return common_node({
      node: "init_declarator_list",
      list: list,
      punctuation: {
        semicolon: s
      }
    });
  }
  / key_precision:PRECISION MMS pq:precision_qualifier MMS type:type_specifier_no_prec __ s:SEMICOLON
  { 
    return common_node({
      node: "precision_declaration",
      precision: pq,
      type: type,
      punctuation: {
        semicolon: s
      },
      keywords: {
        key_precision: key_precision
      }
    });
  }

init_declarator_list
  = first:single_declaration others:(
      __ COMMA __ IDENTIFIER (
        __ lb:LEFT_BRACKET __ exp:constant_expression __ rb:RIGHT_BRACKET 
        { return [0, exp, { left_bracket: lb, right_bracket: rb }] }
        / __ op:EQUAL __ init:initializer { return [1, init, op] }
      )?
    )*
  { 
    var decl_list = {
      node: "declarator_list"
    }
    var vars = []
    vars.push(first);

    for (var i = 0; i < others.length; i++) {
      var v = {};
      v.node = "single_declaration_line";
      v.punctuation = { comma: others[i][1] };
      v.identifier = others[i][3];
      v.identifier.is_declaration = true;
      if (others[i][4]) {
        var s_case = others[i][4][0];
        var s_node = others[i][4][1];

        switch (s_case) {
        case 0:
          v.identifier.type = "array";
          v.identifier.array_size = s_node;
          v.identifier.punctuation = others[i][4][2];
          break;
        case 1:
          v.initializer = s_node;
          v.operation = others[i][4][2];
          break;
        }
      }
      vars.push(common_node(v));
    }
    decl_list.vars = vars;
    return common_node(decl_list);
  }

single_declaration
  = key_invariant:INVARIANT MMS id:IDENTIFIER
  {
    return common_node({
      node: "single_declaration",
      keywords: {
        key_invariant: key_invariant
      },
      subtype: "invariant",
      identifier: id
    });
  }
  / type:fully_specified_type id:(
      MMS IDENTIFIER (
        __ lb:LEFT_BRACKET __ exp:constant_expression __ rb:RIGHT_BRACKET 
        { return [0, exp, { left_bracket: lb, right_bracket: rb }] }
        / __ op:EQUAL __ init:initializer { return [1, init, op] }
      )?
    )?
  { 
    var decl = {
      node: "single_declaration",
      subtype: "simple",
      type: type
    }
    if (id) {
      decl.identifier = id[1];
      decl.identifier.is_declaration = true;
      if (id[2]) {
        var s_case = id[2][0];
        var s_node = id[2][1];
        switch (s_case) {
        case 0:
          decl.identifier.type = "array";
          decl.identifier.array_size = s_node;
          decl.identifier.punctuation = id[2][2];
          break;
        case 1:
          decl.initializer = s_node;
          decl.operation = id[2][2];
          break;
        }
      }
    }

    return common_node(decl);
  }

initializer
  = assignment_expression


// Function declarations and definitions
function_definition
  = head:function_head __ scope:function_scope
  {
    return common_node({
      node: "function_definition",
      head: head,
      scope: scope
    });
  }

function_head
  = type:fully_specified_type MMS id:IDENTIFIER
  {
    id.is_declaration = true;
    return common_node({
      node: "function_head",
      type: type,
      identifier: id
    });
  }

function_scope
  = parms:function_parameters __ body:compound_statement_no_new_scope
  {
    return common_node({
      node: "function_scope",
      parameters: parms,
      body: body,
      new_scope: true
    });
  }

function_parameters
  = lp:LEFT_PAREN __
    parms:(
        VOID / 
        (
          first:parameter_declaration others:(__ COMMA __ parameter_declaration)*
          { return { first: first, others: others } }
        ) /
        ""
    )
    __ 
    rp:RIGHT_PAREN
  {
    parm_node = {
      node: "function_parameters",
      parameters: [],
      punctuation: {
        left_paren: lp,
        right_paren: rp,
      }
    };
    if (parms.first) {
      parm_node.parameters = [parms.first];
      for (var i = 0; i < parms.others.length; i++) {
        var parm = parms.others[i][3];
        parm.punctuation = { comma: parms.others[i][1] };
        parm_node.parameters.push(parm);
      }
    }

    return common_node(parm_node);
  }

function_declarator
  = head:function_head __ parms:function_parameters
  {
    parms.new_scope = true;
    return common_node({
      node: "function_declarator",
      head: head,
      parameters: parms
    });
  }

parameter_declaration
  = tq:(type_qualifier MMS)? pq:(parameter_qualifier MMS)? 
    parm:(parameter_declarator / parameter_type_specifier)
  {
    var parm_node = {
      node: "parameter_declaration",
      parameter: parm
    }
    if (tq)
      parm_node.type_qualifier = tq[0];
    if (pq)
      parm_node.parameter_qualifier = pq[0];

    return common_node(parm_node);
  }

parameter_declarator
  = type:type_specifier MMS id:IDENTIFIER 
    arr:(__ LEFT_BRACKET __ constant_expression __ RIGHT_BRACKET)?
  {
    id.is_declaration = true;
    var parm_node = {
      node: "parameter_declarator",
      type: type,
      identifier: id
    }
    if (arr) {
      parm_node.identifier.type = "array";
      parm_node.identifier.array_size = arr[3];
      parm_node.identifier.punctuation = {
        left_bracket: arr[1],
        right_bracket: arr[5]
      };
    }
    return common_node(parm_node);
  }


// Function calling
function_call
  = func:(function_call_header_no_parameters / function_call_header_with_parameters)
  { 
    return common_node({
      node: "function_call",
      identifier: func.identifier,
      parameters: func.parameters,
      punctuation: func.punctuation
    });
  }

function_call_header_no_parameters
  = id:function_call_header (__ VOID)? __ rp:RIGHT_PAREN
  {
    return {
      identifier: id,
      parameters: [],
      punctuation: {
        right_paren: rp
      }
    }
  }

function_call_header_with_parameters
  = id:function_call_header __ 
    parms:(assignment_expression (__ COMMA __ assignment_expression)*) 
    __ rp:RIGHT_PAREN
  {
    var parameters = [parms[0]];
    for (var i = 0; i < parms[1].length; i++) {
      var parm = parms[1][i][3];
      if (!parm.punctuation)
        parm.punctuation = {};
      parm.punctuation.comma = parms[1][i][1];
      parameters.push(parm);
    }

    return {
      identifier: id,
      parameters: parameters,
      punctuation: {
        right_paren: rp
      }
    }
  }

function_call_header
  = id:function_identifier __ lp:LEFT_PAREN
  { 
    id.punctuation = {
      left_paren: lp
    };
    return id;
  }

function_identifier
  // Grammar Note: Constructors look like functions, but lexical analysis 
  // recognized most of them as keywords.
  = identifier:(constructor_identifier / IDENTIFIER)
  { return identifier }


// Structs
struct_specifier
  = key_struct:STRUCT id:(MMS TYPE_NAME)? __ lb:LEFT_BRACE __ 
    list:struct_declaration_list __ rb:RIGHT_BRACE 
  {
    var struct_node = {
      node: "struct_specifier",
      declaration_list: list,
      punctuation: {
        left_brace: lb,
        right_brace: rb
      },
      keywords: {
        key_struct: key_struct
      }
    }
    if (id) {
      id.is_declaration = true;
      struct_node.struct_type = id[1];
    }

    return common_node(struct_node);
  }

struct_declaration_list
  = list:((decl:struct_declaration __) { return decl } )+
  {
    return common_node({
      node: "struct_declaration_list",
      list: list,
      new_scope: true
    });
  }

struct_declaration
  = type:type_specifier MMS list:struct_declarator_list __ s:SEMICOLON 
  {
    var st_node = {
      node: "struct_declaration",
      type: type,
      declarator_list: list,
      punctuation: {
        semicolon: s
      }
    };

    for (var i = 0; i < st_node.declarator_list.list.length; i++)
      st_node.declarator_list.list[i].type = type;

    return common_node(st_node);
  }

struct_declarator_list
  = first:struct_declarator others:(__ COMMA __ struct_declarator)*
  {
    var declarations = [first];
    if (others.length > 0) {
      for (var i = 0; i < others.length; i++) {
        var decl = others[i][3];
        if (!decl.punctuation)
          decl.punctuation = {};
        decl.punctuation.comma = others[i][1];
        declarations.push(decl);
      }
    }

    return common_node({
      node: "struct_declarator_list",
      list: declarations,
    });
  }

struct_declarator
  = id:IDENTIFIER exp:(__ LEFT_BRACKET __ constant_expression __ RIGHT_BRACKET)?
  {
    id.is_declaration = true;
    if (exp) {
      id.type = "array";
      id.array_size = exp[3];
      id.punctuation = {
        left_bracket: exp[1],
        right_bracket: exp[5]
      }
    }
    return common_node({
      node: "struct_declarator",
      identifier: id
    });
  }


// Expressions
expression
  = left:assignment_expression 
    right:((__ c:COMMA __ e:assignment_expression) { e.punctuation = { comma: c }; return e })*
  {
    var exp_list = [left];

    if (right.length > 0)
      exp_list.push.apply(exp_list, right);
    return common_node({
      node: "expression",
      list: exp_list
    });
  }

assignment_expression
  = left:unary_expression __ op:assignment_operator __ 
    right:assignment_expression
  { 
    return common_node({
      node: "assignment_expression",
      left: left,
      operator: op,
      right: right
    });
  }
  / left:conditional_expression
  { 
    return common_node({
      node: "assignment_expression",
      left: left,
      operator: null,
      right: null
    });
  }

constant_expression
  = conditional_expression

conditional_expression
  = left:logical_or_expression 
    right:(__ QUESTION __ expression __ COLON __ assignment_expression)?
  {
    if (right)
      return common_node({
        node: "conditional_expression",
        condition: left,
        if_true: right[3],
        if_false: right[7],
        punctuation: {
          question: right[1],
          colon: right[5]
        }
      });
    else
      return common_node({
        node: "conditional_expression",
        condition: left,
        if_true: null,
        if_false: null,
        punctuation: {
          question: null,
          colon: null
        }
      });
  }

logical_or_expression
  = (
    left:logical_xor_expression 
    right:(
      (__ op:OR_OP __ exp:logical_xor_expression) { return [op,exp] } 
    )* 
  )
  {
    if (right.length > 0)
      return binary_chain_node("logical_or_expression", left, right);
    else
      return left;
  }
  
logical_xor_expression
  = (
    left:logical_and_expression 
    right:(
      (__ op:XOR_OP __ exp:logical_and_expression) { return [op,exp] } 
    )* 
  )
  {
    if (right.length > 0)
      return binary_chain_node("logical_xor_expression", left, right);
    else
      return left;
  }

logical_and_expression
  = (
    left:inclusive_or_expression 
    right:(
      (__ op:AND_OP __ exp:inclusive_or_expression) { return [op,exp] } 
    )* 
  )
  {
    if (right.length > 0)
      return binary_chain_node("logical_and_expression", left, right);
    else
      return left;
  }

inclusive_or_expression
  = exclusive_or_expression
  //= exclusive_or_expression (__ VERTICAL_BAR __ exclusive_or_expression)*
  // VERTICAL_BAR reserved

exclusive_or_expression
  = and_expression
  //= and_expression (__ CARET __ and_expression)*
  // CARET reserved

and_expression
  = equality_expression
  //= equality_expression (__ AMPERSAND __ equality_expression)*
  // AMPERSAND reserved

equality_expression
  = (
    left:relational_expression 
    right:(
      (__ op:(EQ_OP / NE_OP) __ exp:relational_expression) { return [op,exp] } 
    )* 
  )
  {
    if (right.length > 0)
      return binary_chain_node("equality_expression", left, right);
    else
      return left;
  }

relational_expression
  = (
    left:shift_expression 
    right:(
      (__ op:(LE_OP / GE_OP / LEFT_ANGLE / RIGHT_ANGLE) __ exp:shift_expression)  
      { return [op,exp] } 
    )* 
  )
  {
    if (right.length > 0)
      return binary_chain_node("relational_expression", left, right);
    else
      return left;
  }

shift_expression
  = additive_expression
  //= additive_expression (__ (LEFT_OP / RIGHT_OP) __ additive_expression)*
  // LEFT_OP, RIGHT_OP reserved

additive_expression
  = (
    left:multiplicative_expression 
    right:(
      (__ op:(PLUS / DASH) __ exp:multiplicative_expression) { return [op,exp] } 
    )* 
  )
  {
    if (right.length > 0)
      return binary_chain_node("additive_expression", left, right);
    else
      return left;
  }

multiplicative_expression
  = (
    left:unary_expression 
    right:(
      (__ op:(STAR / SLASH) __ exp:unary_expression) { return [op,exp] } 
    )* 
  )
  //= unary_expression (__ (STAR / SLASH / PERCENT) __ unary_expression)*
  // PERCENT is reserved
  {
    if (right.length > 0)
      return binary_chain_node("multiplicative_expression", left, right);
    else
      return left;
  }

unary_expression
  = postfix_expression 
  / op:(INC_OP / DEC_OP / unary_operator) __ exp:unary_expression
  { 
    return common_node({
      node: "prefix_expression",
      operator: op,
      expression: exp
    });
  }

postfix_expression
  = left:(function_call / primary_expression)
    right:(__ 
      op:(
        lb:LEFT_BRACKET __ token:expression __ rb:RIGHT_BRACKET 
        { 
          return common_node({
            node: "index_accessor",
            index: token,
            punctuation: {
              left_bracket: lb,
              right_bracket: rb
            }
          });
        } 
        / token:FIELD_SELECTION
        / INC_OP / DEC_OP
      )
      { return op }
    )*
  { 
    if (right.length > 0)
      return unary_chain_node("postfix_expression", left, right);
    else
      return left;
  }

primary_expression
  = exp:(FLOATCONSTANT / INTCONSTANT / BOOLCONSTANT / IDENTIFIER / paren_expression)
  {
    var p_node = {
      
    }

    if (exp.node == "identifier")
      p_node.identifier = exp;
    else
      p_node.exp = exp;
    
    return common_node({
      node: "primary_expression",
      expression: exp
    });
  }

paren_expression
  = lp:LEFT_PAREN __ exp:expression __ rp:RIGHT_PAREN
  {
    return common_node({
      node: "paren_expression",
      expression: exp,
      punctuation: {
        left_paren: lp,
        right_paren: rp
      }
    });
  }


// Statements
compound_statement_no_new_scope
  = lb:LEFT_BRACE __ list:statement_list __ rb:RIGHT_BRACE 
  {
    return common_node({
      node: "compound_statement_no_new_scope",
      list: list,
      punctuation: {
        left_brace: lb,
        right_brace: rb
      }
    });
  }

statement_list
  = list:((s:statement_no_new_scope __) { return s; } )*
  { 
    var node = common_node({
      node: "statement_list",
      list: list
    });
    return node;
  }

statement_no_new_scope
  = stat:(compound_statement_with_scope  / simple_statement)
  {
    return common_node({
      node: "statement_no_new_scope",
      statement: stat
    });
  }

compound_statement_with_scope
  = lb:LEFT_BRACE __ list:statement_list __ rb:RIGHT_BRACE 
  {
    return common_node({
      node: "compound_statement_with_scope",
      list: list,
      punctuation: {
        left_brace: lb,
        right_brace: rb
      },
      new_scope: true,
      without_braces: false
    });
  }

simple_statement
  // NOTE: declaration_statement / expression_statement --- order of the rule in GLSL ES 1.0
  = stat:(expression_statement / declaration_statement / selection_statement 
  / iteration_statement  / jump_statement)
  {
    return common_node({
      node: "simple_statement",
      statement: stat
    });
  }

declaration_statement
  = decl:declaration 
  {
    return common_node({
      node: "declaration_statement",
      statement: decl
    });
  }

expression_statement
  = exp:(expression __)? s:SEMICOLON 
  { 
    var e_node = {
      node: "expression_statement",
      punctuation: {
        semicolon: s
      }
    }

    e_node.statement = (exp) ? exp[0] : null;
    return common_node(e_node);
  }

selection_statement
  = key_if:IF __ lp:LEFT_PAREN __ exp:expression __ rp:RIGHT_PAREN __ 
    srs:selection_rest_statement
  {
    var sel_node = {
      node: "selection_statement",
      expression: exp,
      if_actions: srs.if_actions,
      punctuation: {
        left_paren: lp,
        right_paren: rp
      },
      keywords: {
        key_if: key_if
      }
    }

    if (srs.else_actions) {
      sel_node.else_actions = srs.else_actions;
      sel_node.keywords.key_else = srs.keywords.key_else;
    }

    return common_node(sel_node);
  }

selection_rest_statement
  = if_act:statement_with_scope else_act:(__ ELSE __ statement_with_scope)?
  {
    var sel_node = {
      node: "selection_rest_statement",
      if_actions: if_act
    };

    if (else_act) {
      sel_node.else_actions = else_act[3];
      sel_node.keywords = { key_else: else_act[1] };
    }

    return common_node(sel_node);
  }

statement_with_scope
  = stat:(compound_statement_no_new_scope  / simple_statement)
  {
    return common_node({
      node: "statement_with_scope",
      statement: stat,
      new_scope: true
    });
  }

iteration_statement
  = key_while:WHILE __ lp:LEFT_PAREN __ cond:condition __ rp:RIGHT_PAREN __ 
    // not statement_with_scope, because scope begins with the whole iteration statement
    body:(compound_statement_no_new_scope / simple_statement) 
  {
    return common_node({
      node: "iteration_statement",
      type: "while",
      condition: cond,
      body: body,
      punctuation: {
        left_paren: lp,
        right_paren: rp
      },
      keywords: {
        key_while: key_while
      },
      new_scope: true
    });
  }
  // not statement_with_scope, because scope begins with the whole iteration statement
  / key_do:DO __ body:(compound_statement_no_new_scope / simple_statement) __ 
    key_while:WHILE __ lp:LEFT_PAREN __ 
    cond:expression __ rp:RIGHT_PAREN __ s:SEMICOLON 
  {
    return common_node({
      node: "iteration_statement",
      type: "do_while",
      body: (body) ? body : null,
      condition: cond,
      punctuation: {
        left_paren: lp,
        right_paren: rp,
        semicolon: s
      },
      keywords: {
        key_do: key_do,
        key_while: key_while
      },
      new_scope: true
    });
  }
  / key_for:FOR __ lp:LEFT_PAREN __ fis:for_init_statement __ 
    frs:for_rest_statement __ rp:RIGHT_PAREN __ 
    // not statement_with_scope, because scope begins with the whole iteration statement
    body:(compound_statement_no_new_scope / simple_statement) 
  {
    return common_node({
      node: "iteration_statement",
      type: "for_loop",
      for_init_statement: (fis) ? fis : null,
      for_rest_statement: (frs) ? frs : null,
      body: body,
      punctuation: {
        left_paren: lp,
        right_paren: rp
      },
      keywords: {
        key_for: key_for
      },
      new_scope: true
    });
  }

condition
  = cond:(
      (type:fully_specified_type MMS id:IDENTIFIER __ op:EQUAL __ init:initializer) 
      {
        id.is_declaration = true;
        return common_node({
          node: "condition_initializer",
          identifier: id,
          id_type: type,
          initializer: init,
          operation: op
        });
      } 
  / expression
  )
  {
    return common_node({
      node: "condition",
      condition: cond
    });
  }

for_init_statement
  = stat:(expression_statement / declaration_statement)
  {
    if (stat)
      return common_node({
        node: "for_init_statement",
        statement: stat
      });
    else
      return stat;
  }

for_rest_statement
  = cond:conditionopt? __ s:SEMICOLON __ exp:expression?
  {
    var condition = (cond) ? cond: null;
    var expression = (exp) ? exp: null;

    return common_node({
      node: "for_rest_statement",
      condition: condition,
      expression: expression,
      punctuation: {
        semicolon: s
      }
    });
  }

conditionopt
  = condition 

jump_statement
  = jump:(CONTINUE / BREAK / RETURN / DISCARD) __ s:SEMICOLON
  { 
    return  common_node({
      node: "jump_statement",
      type: jump,
      punctuation: {
        semicolon: s
      }
    });
  }
  / jump:RETURN __ exp:expression __ s:SEMICOLON
  { 
    return common_node({
      node: "jump_statement",
      type: jump,
      returned_exp: exp,
      punctuation: {
        semicolon: s
      }
    });
  }


// Types
type_specifier
  = prec:(precision_qualifier MMS)? spec:type_specifier_no_prec
  {
    var type_spec = {
      node: "type_specifier",
      type_specifier: spec
    }
    if (prec)
      type_spec.precision = prec[0];

    return common_node(type_spec);
  }

parameter_type_specifier
  = type:type_specifier 
    ext:(__ LEFT_BRACKET __ constant_expression __ RIGHT_BRACKET)?
  {
    var type_node =  {
      node: "parameter_type_specifier",
      type: type
    };
    if (ext) {
      type_node.array_size = ext[3];
      type_node.punctuation = {
        left_bracket: ext[1],
        right_bracket: ext[5]        
      }
    }

    return common_node(type_node);
  }

fully_specified_type
  = qual:(type_qualifier MMS)? spec:type_specifier
  { 
    var type_node = {
      node: "fully_specified_type",
      type_specifier: spec.type_specifier,
    };

    if (spec.precision)
      type_node.precision_qualifier = spec.precision;
    if (qual)
      type_node.type_qualifier = qual[0];

    return common_node(type_node);
  }


// Keywords rules
type_qualifier = value:(
    CONST / GLSL_IN / GLSL_OUT / UNIFORM
    / value:(INVARIANT MMS GLSL_OUT) { return [value[0], value[2]] }
  )
{ 
  return common_node({
    node: "type_qualifier",
    value: value
  });
}
parameter_qualifier = value:(INOUT / IN / OUT)
{ 
  return common_node({
    node: "parameter_qualifier",
    value: value
  });
}
precision_qualifier = value:(LOW_PRECISION / MEDIUM_PRECISION / HIGH_PRECISION)
{ 
  return common_node({
    node: "precision_qualifier",
    value: value
  });
}

assignment_operator = EQUAL / MUL_ASSIGN / DIV_ASSIGN / ADD_ASSIGN / SUB_ASSIGN 
  // / MOD_ASSIGN / LEFT_ASSIGN / RIGHT_ASSIGN / AND_ASSIGN reserved
  // / XOR_ASSIGN / OR_ASSIGN reserved

unary_operator = PLUS / DASH / BANG 
  // / TILDE reserved 

type_specifier_no_prec 
  = name:(VOID  / FLOAT  / INT  / BOOL 
  / VEC2  / VEC3  / VEC4  / BVEC2  / BVEC3 / BVEC4 / IVEC2 / IVEC3 / IVEC4 
  / MAT2 / MAT3 / MAT4
  / SAMPLER2D / SAMPLERCUBE
  / struct_specifier
  / TYPE_NAME)
{ 
  return common_node({
    node: "type_specifier_no_prec",
    name: name
  });
}

constructor_identifier
  = name:(
    FLOAT / INT / BOOL 
    / VEC2 / VEC3 / VEC4 / BVEC2 / BVEC3 / BVEC4 / IVEC2 / IVEC3 / IVEC4
    / MAT2 / MAT3 / MAT4
    // NOTE: Every function calling recognised as constructor-function calling
    // (like vec3(...);)
    / TYPE_NAME
  ) !(IDENTIFIER)
  {
    return common_node({
      node: "identifier",
      name: name
    });
  }

/*============================================================================
                                  CUSTOM TOKEN RULES
============================================================================*/
IDENTIFIER
  = !RESERVED id:(nondigit+ (nondigit / digit)*)
  { 
    var chars = [];
    chars.push.apply(chars, id[0]);
    chars.push.apply(chars, id[1]);
    var name = chars.join("");

    return common_node({
      node: "identifier",
      name: name
    });
  }

TYPE_NAME
  = id:IDENTIFIER
    { 
      return common_node({
        node: "struct_type",
        identifier: id
      });
    }

FLOATCONSTANT
  = token:(
    fractional_float (exponent_part)? 
    / digit_sequence_nonzero_lead exponent_part
  ) 
  { 
    var value = token.join("");
    return common_node({
      node: "float_constant",
      value: value
    });
  }

INTCONSTANT
  = value:(decimal_int / hexadecimal_int / octal_int) 
  { 
    return common_node({
      node: "integer_constant",
      value: value
    });
  }

BOOLCONSTANT
  = value:("true" / "false") 
  { 
    return common_node({
      node: "bool_constant",
      value: value == "true"
    });
  }

FIELD_SELECTION 
  = d:DOT __ id:IDENTIFIER 
  { 
    return common_node({
      node: "field_selection",
      identifier: id,
      punctuation: {
        dot: d
      }
    });
  }

RESERVED
  // NOTE: it's faster to check with a predicate(&) than to create additional rules 
  // for every reserved string literal
  = id:(nondigit+ (nondigit / digit)*)
  &{ var name = id[0].concat(id[1]).join(""); return token_is_reserved(name); }
  
  { 
    var chars = [];
    chars.push.apply(chars, id[0]);
    chars.push.apply(chars, id[1]);
    return chars.join("");
  }

/*============================================================================
                                  OPERATION RULES
============================================================================*/
// Binary and unary operations
PLUS = token:("+") { return operation_node("addition", token) }
DASH = token:("-") { return operation_node("subtraction", token) }
STAR = token:("*") { return operation_node("multiply", token) }
SLASH = token:("/") { return operation_node("division", token) }
INC_OP = token:("++") { return operation_node("increment", token) }
DEC_OP = token:("--") { return operation_node("decrement", token) }

// Assignment operations
EQUAL = token:("=") { return operation_node("equal", token) }
MUL_ASSIGN = token:("*=") { return operation_node("mul_assign", token) }
DIV_ASSIGN = token:("/=") { return operation_node("div_assign", token) }
ADD_ASSIGN = token:("+=") { return operation_node("add_assign", token) }
SUB_ASSIGN = token:("-=") { return operation_node("sub_assign", token) }

// Logical condition symbols
LEFT_ANGLE = token:("<") { return operation_node("less", token) }
RIGHT_ANGLE = token:(">") { return operation_node("greater", token) }
EQ_OP = token:("==") { return operation_node("equal", token) }
LE_OP = token:("<=") { return operation_node("less_equal", token) }
GE_OP = token:(">=") { return operation_node("greater_equal", token) }
BANG = token:("!") { return operation_node("not", token) }
NE_OP = token:("!=") { return operation_node("not_equal", token) }
AND_OP = token:("&&") { return operation_node("and", token) }
OR_OP = token:("||") { return operation_node("or", token) }
XOR_OP = token:("^^") { return operation_node("xor", token) }

// Symbols that are reserved and illegal in GLSL ES 1.0 but legal in GLSL ES 3.0.
// Anyway they aren't used in parsing.
TILDE = token:("~") { return operation_node("tilde", token) }
PERCENT = token:("%") { return operation_node("percent", token) }
LEFT_OP = token:("<<") { return operation_node("left_shift", token) }
RIGHT_OP = token:(">>") { return operation_node("right_shift", token) }
AMPERSAND = token:("&") { return operation_node("ampersand", token) }
CARET = token:("^") { return operation_node("caret", token) }
VERTICAL_BAR = token:("|") { return operation_node("vertical_bar", token) }
MOD_ASSIGN = token:("%=") { return operation_node("mod_assign", token) }
LEFT_ASSIGN = token:("<<=") { return operation_node("left_shift_assign", token) }
RIGHT_ASSIGN = token:(">>=") { return operation_node("right_shift_assign", token) }
AND_ASSIGN = token:("&=") { return operation_node("and_assign", token) }
XOR_ASSIGN = token:("^=") { return operation_node("xor_assign", token) }
OR_ASSIGN = token:("|=") { return operation_node("or_assign", token) }


 /*============================================================================
                                  SIMPLE RULES
============================================================================*/
/**
 * Based on normals strings, return unformatted value
 */

// Reserved keywords
CONST = data:"const" { return keyword_node(data) }
UNIFORM = data:"uniform" { return keyword_node(data) }

BREAK = data:"break" { return keyword_node(data) }
CONTINUE = data:"continue" { return keyword_node(data) }
DO = data:"do" { return keyword_node(data) }
FOR = data:"for" { return keyword_node(data) }
WHILE = data:"while" { return keyword_node(data) }

IF = data:"if" { return keyword_node(data) }
ELSE = data:"else" { return keyword_node(data) }

IN = data:"in" { return keyword_node(data) }
OUT = data:"out" { return keyword_node(data) }
INOUT = data:"inout" { return keyword_node(data) }

FLOAT = data:"float" { return keyword_node(data) }
INT = data:"int" { return keyword_node(data) }
VOID = data:"void" { return keyword_node(data) }
BOOL = data:"bool" { return keyword_node(data) }

LOW_PRECISION = data:"lowp" { return keyword_node(data) }
MEDIUM_PRECISION = data:"mediump" { return keyword_node(data) }
HIGH_PRECISION = data:"highp" { return keyword_node(data) }
PRECISION = data:"precision" { return keyword_node(data) }
INVARIANT = data:"invariant" { return keyword_node(data) }

DISCARD = data:"discard" { return keyword_node(data) }
RETURN = data:"return" { return keyword_node(data) }

MAT2 = data:"mat2" { return keyword_node(data) }
MAT3 = data:"mat3" { return keyword_node(data) }
MAT4 = data:"mat4" { return keyword_node(data) }

VEC2 = data:"vec2" { return keyword_node(data) }
VEC3 = data:"vec3" { return keyword_node(data) }
VEC4 = data:"vec4" { return keyword_node(data) }
IVEC2 = data:"ivec2" { return keyword_node(data) }
IVEC3 = data:"ivec3" { return keyword_node(data) }
IVEC4 = data:"ivec4" { return keyword_node(data) }
BVEC2 = data:"bvec2" { return keyword_node(data) }
BVEC3 = data:"bvec3" { return keyword_node(data) }
BVEC4 = data:"bvec4" { return keyword_node(data) }

SAMPLER2D = data:"sampler2D" { return keyword_node(data) }
SAMPLERCUBE = data:"samplerCube" { return keyword_node(data) }

STRUCT = data:"struct" { return keyword_node(data) }

GLSL_IN = data:"GLSL_IN" { return keyword_node(data) }
GLSL_OUT = data:"GLSL_OUT" { return keyword_node(data) }

// Common symbols
LEFT_PAREN = data:"(" { return punctuation_node("left_paren", data) }
RIGHT_PAREN = data:")" { return punctuation_node("right_paren", data) }
LEFT_BRACKET = data:"[" { return punctuation_node("left_bracket", data) }
RIGHT_BRACKET = data:"]" { return punctuation_node("right_bracket", data) }
LEFT_BRACE = data:"{" { return punctuation_node("left_brace", data) }
RIGHT_BRACE = data:"}" { return punctuation_node("right_brace", data) }
DOT = data:"." { return punctuation_node("dot", data) }
COMMA = data:"," { return punctuation_node("comma", data) }
COLON = data:":" { return punctuation_node("colon", data) }
SEMICOLON = data:";" { return punctuation_node("semicolon", data) }
QUESTION = data:"?" { return punctuation_node("question", data) }


/*============================================================================
                                  SERVICE RULES
============================================================================*/
/**
 * Not a part of a grammar, return specifically formatted values
 */

// Digits
nondigit = [a-zA-Z_]
digit = [0-9]
oct_digit = [0-7]
hex_digit = [0-9a-fA-F]

digit_sequence = token:(digit+) { return token.join("") }
digit_sequence_nonzero_lead = token:([1-9] digit_sequence*) { return token.join("") }
oct_digit_sequence = token:(oct_digit+) { return token.join("") }
hex_digit_sequence = token:(hex_digit+) { return token.join("") }

// Integer/float utils
decimal_int
  = dec:digit_sequence_nonzero_lead 
  { return parseInt(dec); }
hexadecimal_int
  = token:("0" [xX] hex_digit_sequence) 
  { 
    var hex = token.join("");
    return parseInt(hex, 16);
  }
octal_int
  = token:("0" oct_digit_sequence*) 
  { 
    var oct = token.join("");
    return parseInt(oct, 8);
  }

fractional_float
  = token:(
    ([0] / digit_sequence_nonzero_lead) "." (digit_sequence)?
    / "." digit_sequence
  )
  { return token.join("") }
exponent_part
  = token:([Ee] [+-]? digit_sequence) 
  { return token.join("") }

// Comments
comment = multiline_comment / singleline_comment
singleline_comment = "//" (!line_terminator .)*
multiline_comment = "/*" symbols:(!"*/" .)* "*/"
  { check_directive_comment(symbols); }

multiline_comment_no_line_terminator 
  = "/*" symbols:(!("*/" / line_terminator) .)* "*/"
  { check_directive_comment(symbols); }

// Spaces
whitespace = [\t\f ] / "\x0B" // IE does not recognize "\v".
line_terminator = [\n\r]
line_terminator_sequence = "\r\n" / "\n\r" / "\n" / "\r"
line_continuation = "\\" ((!(line_terminator_sequence)_)+ / "") line_terminator_sequence

// Optional and mandatory space (single-line and multi-line)
__ = (whitespace / line_continuation / line_terminator_sequence / comment)*
MMS = (whitespace / line_continuation / line_terminator_sequence / comment)+

// Optional and mandatory single-line space
_ = (whitespace / line_continuation / singleline_comment 
  / multiline_comment_no_line_terminator)*
MSS = (whitespace / line_continuation / singleline_comment 
  / multiline_comment_no_line_terminator)+

// For preprocessor directives
till_string_end
  = first:(continued_line)* second:line_no_term_count 
    singleline_comment? (line_terminator_sequence / EOF)
  { 
    var res_str = "";
    for (var i = 0; i < first.length; i++)
      res_str += first[i];
    res_str += second;
    return res_str;
  }

continued_line
  = line:line_no_term_count singleline_comment? line_continuation
  { return line }

line_no_term_count
  = str:(!(line_terminator_sequence / "\\" / "//").)*
  { 
    var res_str = "";
    for (var i = 0; i < str.length; i++)
      res_str += str[i][1];
    return res_str;
  }

EOF
  = !.

/*============================================================================
                  PREPROCESSING "#VAR" AND OTHER DIRECTIVES PASS
============================================================================*/

pp_start
  = __ units:(pp_unit __)*
  {
    return {
      units: units,
      text: build_listing(vardef_replace(units))
    }
  }

pp_unit
  = pp_replace
  / pp_undef
  / pp_extension
  / pp_directives
  / pp_node_dir
  / include_dir_comment
  / tokens:(!("#" / "//" / "/*") (IDENTIFIER / RESERVED / . ))+
  {
    var result = [];
    for (var i = 0; i < tokens.length; i++) {
      if (tokens[i][1].name)
        result.push(tokens[i][1].name);
      else
        result.push(tokens[i][1]);
    }
    return common_node({
      node: "text",
      type: "textline",
      result: result
    });
  }

pp_replace
  = dir_string:("#" _ ("var"/"define") MSS IDENTIFIER till_string_end)
  { 
    var source_str = "#" + dir_string[2] + " ";
    source_str += dir_string[4].name + dir_string[5];
    source_str = source_str.trim();

    var result = {
      node: "directive",
      type: dir_string[2],
      source_str: source_str,
      repl: {
        from: dir_string[4].name,
        to: dir_string[5].trim()
      }
    }
    return common_node(result);
  }

pp_undef
  = dir_string: ("#" _ "undef" MSS IDENTIFIER till_string_end)
  {
    return common_node({
      node: "directive",
      type: "undef",
      source_str: "#undef" + " " + dir_string[4].name,
      identifier: dir_string[4].name
    });
  }

pp_extension
  = "#" _ "extension" MSS ext:IDENTIFIER _ ":" _ 
    behavior:("require" / "enable" / "warn" / "disable") till_string_end
  {
    return common_node({
      node: "directive",
      type: "extension",
      source_str: "#extension " + ext.name + ":" + behavior,
      extension: ext.name,
      behavior: behavior
    });
  }

pp_directives
  = dir:("#" _ 
      (
        "ifdef" / "ifndef" / "if" / "elif" / "else" / "endif"
        / "error" / "line" / "pragma" / "warning" / "version"
      ) 
      (
        line_terminator_sequence { return "" }
        / (MSS? str:till_string_end) { return " " + str }
      )
    )
  { 
    var source_str = "#" + dir[2] + " " + dir[3];
    return common_node({
      node: "directive",
      type: dir[2],
      contents: dir[3],
      source_str: source_str
    });
  }

pp_node_dir
  = nodes_insertion
  / nodes_condition
  / nodes_parameters
  / node
  / endnode
  / node_var

nodes_condition
  = dir:("#" _ 
      (
        "node_ifdef" / "node_ifndef" / "node_if" / "node_elif" / "node_else" / "node_endif"
      ) 
      (
        line_terminator_sequence { return "" }
        / (MSS str:till_string_end) { return " " + str }
      )
    )
  { 
    var source_str = "#" + dir[2] + " " + dir[3];
    return common_node({
      node: "node_directive",
      type: "node_condition",
      subtype: dir[2],
      contents: dir[3],
      source_str: source_str
    });
  }

nodes_insertion
  = _ "#" _ type:("nodes_global" / "nodes_main") till_string_end
  {
    return common_node({
      node: "node_directive",
      type: type
    });
  }

node
  = _ "#" _ "node" MSS id:IDENTIFIER till_string_end
  {
    return common_node({
      node: "node_directive",
      type: "node",
      name: id.name
    });
  }

endnode
  = _ "#" _ "endnode" till_string_end
  {
    return common_node({
      node: "node_directive",
      type: "endnode",
    });
  }

nodes_parameters
  = _ "#" _ type:("node_in" / "node_out" / "node_param") 
    opt:(MSS "optional")? MSS
    decl_type:fully_specified_type MSS 
    id:IDENTIFIER
  {
    return common_node({
      node: "node_directive",
      type: type,
      decl_type: decl_type,
      identifier: id,
      is_optional: Boolean(opt)
    });
  }

node_var
  = dir_string:("#" _ "node_var" MSS IDENTIFIER till_string_end)
  { 
    var source_str = "#node_var ";
    source_str += dir_string[4].name + dir_string[5];
    source_str = source_str.trim();

    var result = {
      node: "node_directive",
      type: "node_var",
      source_str: source_str,
      repl: {
        from: dir_string[4].name,
        to: dir_string[5].trim()
      }
    }
    return common_node(result);
  }


include_dir_comment
  = _ "#" _ type:("include_end" / "include") "%" name_symbols:(!("%").)+ "%"
  {
    var name = name_symbols.map(function(el) { return el[1] }).join("");
    return common_node({
      node: "include",
      type: type,
      name: name
    });
  }

