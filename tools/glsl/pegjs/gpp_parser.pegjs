/**
 * GLSL preprocessor parser
 * see some doc here: http://www.nongnu.org/hcb/
 */

start
  = __ group:Group __ { return group; }

Group
  = parts:GroupParts? {
      return {
        TYPE: "grp",
        PARTS: parts !== null ? parts : []
      };
    }

GroupParts
  = head:GroupPart tail:(__ GroupPart)* {
      var result = [head];
      for (var i = 0; i < tail.length; i++) {
        result.push(tail[i][1]);
      }
      return result;
    }

GroupPart
  = IfSection
  / ControlLine
  / Nodes
  / TextLine

IfSection
  = ifgroup:IfGroup __ elifgroups:ElIfGroup* __ elsegroup:ElseGroup? __ EndIfLine {
      var parts = [ifgroup];

      for (var i = 0; i < elifgroups.length; i++)
        parts.push(elifgroups[i]);

      if (elsegroup !== null)
        parts.push(elsegroup)

      return {
        TYPE: "cond",
        PARTS:parts
      }
    }

IfGroup
  = "#" _ "if" MSS expression:PPExpression _ LineTerminatorSequence __ group:Group {
      return {
        TYPE: "if",
        EXPRESSION: expression,
        GROUP: group
      };
    }
  / "#" _ "ifdef" MSS name:Identifier _ LineTerminatorSequence __ group:Group {
      return {
        TYPE: "ifdef",
        NAME: name,
        GROUP: group
      };
    }
  / "#" _ "ifndef" MSS name:Identifier _ LineTerminatorSequence __ group:Group {
      return {
        TYPE: "ifndef",
        NAME: name,
        GROUP: group
      };
    }

ElIfGroup
  = "#" _ "elif" MSS expression:PPExpression _ LineTerminatorSequence __ group:Group __ {
      return {
        TYPE: "elif",
        EXPRESSION: expression,
        GROUP: group
      };
    }

ElseGroup
  = "#" _ "else" _ LineTerminatorSequence __ group:Group {
      return {
        TYPE: "else",
        GROUP: group
      };
    }

EndIfLine
  = "#" _ "endif" _ LineTerminatorSequenceEOF


ControlLine
  = "#" _ "include" _ file:HeaderFile _ LineTerminatorSequenceEOF {
      return {
        TYPE: "include",
        FILE: file
      };
    }
  / "#" _ type:("define" / "var") MSS name:Identifier toks:(MSS Tokens)? _ LineTerminatorSequenceEOF {
      var tokens = [];

      if (toks === null) 
        tokens.push("");
      else
        for (var i = 0; i < toks[1].length; i++)
          tokens.push(toks[1][i]);

      return {
        TYPE: type,
        NAME: name,
        TOKENS: tokens
      };
    }
  /* NOTE: isn't properly supported
    / "#" _ "define" MSS name:Identifier "(" _ params:DefineParamList? _ ")" _
        tokens:Tokens? _ LineTerminatorSequenceEOF {
      return {
        TYPE: "define",
        NAME: name,
        PARAMS: params !== null ? params : [],
        TOKENS: tokens !== null ? tokens : []
      };
    }*/
  / "#" _ "error" toks:(MSS Tokens)? _ LineTerminatorSequenceEOF {
      var tokens = [];

      if (toks !== null)
        for (var i = 0; i < toks[1].length; i++)
          tokens.push(toks[1][i]);

      return {
        TYPE: "error",
        TOKENS: tokens
      };
    }
  / "#" _ "line" MSS tokens:Tokens _ LineTerminatorSequenceEOF {
      return {
        TYPE: "line",
        TOKENS: tokens
      };
    }
  / "#" _ "pragma" MSS name:Identifier MSS tokens:Tokens _ LineTerminatorSequenceEOF {
      return {
        TYPE: "pragma",
        NAME: name,
        TOKENS: tokens
      };
    }
  / "#" _ "undef" MSS name:Identifier _ LineTerminatorSequenceEOF {
      return {
        TYPE: "undef",
        NAME: name
      };
    }
  / "#" _ "warning" toks:(MSS Tokens)? _ LineTerminatorSequenceEOF {
      var tokens = [];

      if (toks !== null)
        for (var i = 0; i < toks[1].length; i++)
          tokens.push(toks[1][i]);

      return {
        TYPE: "warning",
        TOKENS: tokens
      };
    }

  / "#" _ "extension" toks:(MSS Tokens)? _ LineTerminatorSequenceEOF {
      var tokens = [];

      if (toks !== null)
        for (var i = 0; i < toks[1].length; i++)
          tokens.push(toks[1][i]);

    return {
      TYPE: "extension",
      TOKENS: tokens
    }
  }

  / "#" _ "version" MSS version:Token _ LineTerminatorSequenceEOF {
      var tokens = [];
      if (version !== null)
        tokens.push(version);
    return {
      TYPE: "version",
      TOKENS: tokens
    }
  }

  / "#" _ LineTerminatorSequenceEOF {
      return {
        TYPE: "#"
      };
    }



Nodes
  = nodegroup:NodeGroup __ EndNodeLine {
      return nodegroup;
    }
  / NodesGlobalLine
  / NodesMainLine

NodeGroup
  = "#" _ "node" MSS name:Identifier _ LineTerminatorSequence __ 
    vars:(NodeVar __)* 
    decl:(NodeDeclarationLine __)* 
    stat:(NodeStatement __)* {

      var node_vars = [];
      for (var i = 0; i < vars.length; i++)
        node_vars.push(vars[i][0]);

      var declarations = [];
      for (var i = 0; i < decl.length; i++)
        declarations.push(decl[i][0]);

      var statements = [];
      for (var i = 0; i < stat.length; i++)
        statements.push(stat[i][0]);

      return {
        TYPE: "node",
        NAME: name,
        NODE_VARS: node_vars,
        DECLARATIONS: declarations,
        STATEMENTS: statements
      };
    }

EndNodeLine
  // concerning ? sign see EndIfLine
  = "#" _ "endnode" _ LineTerminatorSequenceEOF?

NodeVar
  = "#" _ "node_var" MSS name:Identifier toks:(MSS Tokens)? _ LineTerminatorSequence {
      var tokens = [];

      if (toks === null) 
        tokens.push("");
      else
        for (var i = 0; i < toks[1].length; i++)
          tokens.push(toks[1][i]);

      return {
        TYPE: "node_var",
        NAME: name,
        TOKENS: tokens
      };
    }

NodeDeclarationLine
  = NodeInLine
  / NodeOutLine
  / NodeParamLine

NodeStatement
  = NodeIfSection
  / TextLine

NodeIfSection
  = ifgroup:NodeIfGroup __ elifgroups:NodeElIfGroup* __ elsegroup:NodeElseGroup? __ NodeEndIfLine {
      var parts = [ifgroup];

      for (var i = 0; i < elifgroups.length; i++)
        parts.push(elifgroups[i]);

      if (elsegroup !== null)
        parts.push(elsegroup)

      return {
        TYPE: "node_cond",
        PARTS: parts
      }
    }

NodeIfGroup
  = "#" _ "node_if" MSS expression:PPExpression _ LineTerminatorSequence __ stat:(NodeStatement __)* {
      var statements = [];
      for (var i = 0; i < stat.length; i++)
        statements.push(stat[i][0]);

      return {
        TYPE: "node_if",
        EXPRESSION: expression,
        STATEMENTS: statements
      };
    }
  / "#" _ "node_ifdef" MSS name:Identifier _ LineTerminatorSequence __ stat:(NodeStatement __)* {
      var statements = [];
      for (var i = 0; i < stat.length; i++)
        statements.push(stat[i][0]);

      return {
        TYPE: "node_ifdef",
        NAME: name,
        STATEMENTS: statements
      };
    }
  / "#" _ "node_ifndef" MSS name:Identifier _ LineTerminatorSequence __ stat:(NodeStatement __)* {
      var statements = [];
      for (var i = 0; i < stat.length; i++)
        statements.push(stat[i][0]);

      return {
        TYPE: "node_ifndef",
        NAME: name,
        STATEMENTS: statements
      };
    }

NodeElIfGroup
  = "#" _ "node_elif" MSS expression:PPExpression _ LineTerminatorSequence __ stat:(NodeStatement __)* __ {
      var statements = [];
      for (var i = 0; i < stat.length; i++)
        statements.push(stat[i][0]);

      return {
        TYPE: "node_elif",
        EXPRESSION: expression,
        STATEMENTS: statements
      };
    }

NodeElseGroup
  = "#" _ "node_else" _ LineTerminatorSequence __ stat:(NodeStatement __)* {
      var statements = [];
      for (var i = 0; i < stat.length; i++)
        statements.push(stat[i][0]);

      return {
        TYPE: "node_else",
        STATEMENTS: statements
      };
    }

NodeEndIfLine
  = "#" _ "node_endif" _ LineTerminatorSequenceEOF

NodeInLine
  = "#" _ "node_in" opt:(MSS "optional")? toks:(MSS Tokens)? _ LineTerminatorSequence {
      var tokens = [];

      if (toks !== null)
        for (var i = 0; i < toks[1].length; i++)
          tokens.push(toks[1][i]);

      var last = tokens.pop();

      return {
        TYPE: "node_in",
        NAME: last,
        QUALIFIER:tokens,
        IS_OPTIONAL: Boolean(opt)
      };
    }

NodeOutLine
  = "#" _ "node_out" opt:(MSS "optional")? toks:(MSS Tokens)? _ LineTerminatorSequence {
      var tokens = [];

      if (toks !== null)
        for (var i = 0; i < toks[1].length; i++)
          tokens.push(toks[1][i]);

      var last = tokens.pop();

      return {
        TYPE: "node_out",
        NAME: last,
        QUALIFIER:tokens,
        IS_OPTIONAL: Boolean(opt)
      };
    }

NodeParamLine
  = "#" _ "node_param" opt:(MSS "optional")? toks:(MSS Tokens)? _ LineTerminatorSequence {
      var tokens = [];

      if (toks !== null)
        for (var i = 0; i < toks[1].length; i++)
          tokens.push(toks[1][i]);

      var last = tokens.pop();

      return {
        TYPE: "node_param",
        NAME: last,
        QUALIFIER: tokens,
        IS_OPTIONAL: Boolean(opt)
      };
    }

NodesGlobalLine
  = "#" _ "nodes_global" _ LineTerminatorSequenceEOF {
      return {
        TYPE: "nodes_global"
      }
    }

NodesMainLine
  = "#" _ "nodes_main" _ LineTerminatorSequenceEOF {
      return {
        TYPE: "nodes_main"
      }
    }

TextLine
  = tokens:Tokens {
      return {
        TYPE: "txt",
        TOKENS: tokens
      }
    }

Tokens
  = head:Token tail:(_ Token)* {
      var result = [head];
      for (var i = 0; i < tail.length; i++) {
        result.push(tail[i][1]);
      }
      return result;
    }

PPExpression
  = head:ConditionalExpression
    tail:(_ "," _ ConditionalExpression)* {
      if (tail.length == 0)
        return head;
      else
        return tail[tail.length-1];
    }

ConditionalExpression
  = condition:LogicalORExpression _
    "?" _ trueExpression:PPExpression _
    ":" _ falseExpression:PPExpression {
      var result = condition;
      var op = {
        TYPE: "conditional_expr",
        PLACES: 3
      }
      result.push.apply(result, trueExpression);
      result.push.apply(result, falseExpression);
      result.push(op);
      return result;
    }
  / LogicalORExpression

LogicalORExpression
  = head:LogicalANDExpression
    tail:(_ LogicalOROperator _ LogicalANDExpression)* {
      var result = head;
      if (tail.length) {
        var op = {
          TYPE: "logical_or_expr",
          PLACES: tail.length + 1
        }
        for (var i = 0; i < tail.length; i++)
          result.push.apply(result, tail[i][3]);
        result.push(op);
      }
      return result;
    }

LogicalANDExpression
  = head:BitwiseORExpression
    tail:(_ LogicalANDOperator _ BitwiseORExpression)* {
      var result = head;
      if (tail.length) {
        var op = {
          TYPE: "logical_and_expr",
          PLACES: tail.length + 1
        }
        for (var i = 0; i < tail.length; i++)
          result.push.apply(result, tail[i][3]);
        result.push(op);
      }
      return result;
    }

BitwiseORExpression
  = head:BitwiseXORExpression
    tail:(_ BitwiseOROperator _ BitwiseXORExpression)* {
      var result = head;
      if (tail.length) {
        var op = {
          TYPE: "logical_bitor_expr",
          PLACES: tail.length + 1
        }
        for (var i = 0; i < tail.length; i++)
          result.push.apply(result, tail[i][3]);
        result.push(op);
      }
      return result;
    }

BitwiseXORExpression
  = head:BitwiseANDExpression
    tail:(_ BitwiseXOROperator _ BitwiseANDExpression)* {
      var result = head;
      if (tail.length) {
        var op = {
          TYPE: "logical_bitxor_expr",
          PLACES: tail.length + 1
        }
        for (var i = 0; i < tail.length; i++)
          result.push.apply(result, tail[i][3]);
        result.push(op);
      }
      return result;
    }

BitwiseANDExpression
  = head:EqualityExpression
    tail:(_ BitwiseANDOperator _ EqualityExpression)* {
      var result = head;
      if (tail.length) {
        var op = {
          TYPE: "logical_bitand_expr",
          PLACES: tail.length + 1
        }
        for (var i = 0; i < tail.length; i++)
          result.push.apply(result, tail[i][3]);
        result.push(op);
      }
      return result;
    }

EqualityExpression
  = head:RelationalExpression
    tail:(_ EqualityOperator _ RelationalExpression)* {
      var result = head;
      for (var i = 0; i < tail.length; i++) {
        switch (tail[i][1]) {
        case "==":
          var op = {
            TYPE: "equal_expr",
            PLACES: 2
          }
          result.push.apply(result, tail[i][3]);
          result.push(op);
          break;
        case "!=":
          var op = {
            TYPE: "non_equal_expr",
            PLACES: 2
          }
          result.push.apply(result, tail[i][3]);
          result.push(op);
          break;
        }
      }
      return result;
    }

RelationalExpression
  = head:ShiftExpression
    tail:(_ RelationalOperator _ ShiftExpression)* {
      var result = head;
      for (var i = 0; i < tail.length; i++) {
        switch (tail[i][1]) {
        case "<=":
          var op = {
            TYPE: "le_expr",
            PLACES: 2
          }
          result.push.apply(result, tail[i][3]);
          result.push(op);
          break;
        case ">=":
          var op = {
            TYPE: "ge_expr",
            PLACES: 2
          }
          result.push.apply(result, tail[i][3]);
          result.push(op);
          break;
        case "<":
          var op = {
            TYPE: "l_expr",
            PLACES: 2
          }
          result.push.apply(result, tail[i][3]);
          result.push(op);
          break;
        case ">":
          var op = {
            TYPE: "g_expr",
            PLACES: 2
          }
          result.push.apply(result, tail[i][3]);
          result.push(op);
          break;
        }
      }
      return result;
    }

ShiftExpression
  = head:AdditiveExpression
    tail:(_ ShiftOperator _ AdditiveExpression)* {
      var result = head;
      for (var i = 0; i < tail.length; i++) {
        switch (tail[i][1]) {
        case "<<":
          var op = {
            TYPE: "left_shift_expr",
            PLACES: 2
          }
          result.push.apply(result, tail[i][3]);
          result.push(op);
          break;
        case ">>":
          var op = {
            TYPE: "right_shift_expr",
            PLACES: 2
          }
          result.push.apply(result, tail[i][3]);
          result.push(op);
          break;
        }
      }
      return result;
    }

AdditiveExpression
  = head:MultiplicativeExpression
    tail:(_ AdditiveOperator _ MultiplicativeExpression)* {
      var result = head;
      for (var i = 0; i < tail.length; i++) {
        switch (tail[i][1]) {
        case "+":
          var op = {
            TYPE: "add_expr",
            PLACES: 2
          }
          result.push.apply(result, tail[i][3]);
          result.push(op);
          break;
        case "-":
          var op = {
            TYPE: "sub_expr",
            PLACES: 2
          }
          result.push.apply(result, tail[i][3]);
          result.push(op);
          break;
        }
      }
      return result;
    }

MultiplicativeExpression
  = head:UnaryExpression
    tail:(_ MultiplicativeOperator _ UnaryExpression)* {
      var result = head;
      for (var i = 0; i < tail.length; i++) {
        switch (tail[i][1]) {
        case "*":
          var op = {
            TYPE: "mul_expr",
            PLACES: 2
          }
          result.push.apply(result, tail[i][3]);
          result.push(op);
          break;
        case "/":
          var op = {
            TYPE: "div_expr",
            PLACES: 2
          }
          result.push.apply(result, tail[i][3]);
          result.push(op);
          break;
        case "%":
          var op = {
            TYPE: "mod_expr",
            PLACES: 2
          }
          result.push.apply(result, tail[i][3]);
          result.push(op);
          break;
        }
      }
      return result;
    }

UnaryExpression
  = "defined" _ expression:DefinedExpression {
      return expression;
    }
  / PostfixExpression
  / operator:UnaryOperator _ expression:UnaryExpression {
      var result = expression;
      switch (operator) {
        case "++":
          var op = {
            TYPE: "pre_inc_expr",
            PLACES: 1
          }
          result.push(op);
          break;
        case "--":
          var op = {
            TYPE: "pre_dec_expr",
            PLACES: 1
          }
          result.push(op);
          break;
        case "+":
          var op = {
            TYPE: "positive_expr",
            PLACES: 1
          }
          result.push(op);
          break;
        case "-":
          var op = {
            TYPE: "negative_expr",
            PLACES: 1
          }
          result.push(op);
          break;
        case "~":
          var op = {
            TYPE: "one_compl_expr",
            PLACES: 1
          }
          result.push(op);
          break;
        case "!":
          var op = {
            TYPE: "logic_negative_expr",
            PLACES: 1
          }
          result.push(op);
          break;
      }
      return result;
    }

PostfixExpression
  = expression:PrimaryExpression _ operator:PostfixOperator {
      var result = expression;
      switch (operator) {
        case "++":
          var op = {
            TYPE: "post_inc_expr",
            PLACES: 1
          }
          result.push(op);
          break;
        case "--":
          var op = {
            TYPE: "post_dec_expr",
            PLACES: 1
          }
          result.push(op);
          break;
      }
      return result;
    }
  / PrimaryExpression

PrimaryExpression
  = number:NumericLiteral { return [number]; }
  / identifier:Identifier { return [identifier]; }
  / "(" _ expression:PPExpression _ ")" { return expression; }

DefinedExpression
  = identifier:Identifier { return [identifier]; }
  // NOTE: hack
  / (!("(" / ")") SourceCharacter)+  { return 1; }
  / "(" _ expression:DefinedExpression _ ")" { return expression; }

NumericLiteral "number"
  = literal:(HexIntegerLiteral / IntegerLiteral) {
      return literal;
    }

IntegerLiteral
  = parts:$(DecimalIntegerLiteral) { return parseInt(parts); }

Identifier "identifier"
  = !ReservedWord name:IdentifierName { return name; }

ReservedWord
  = "defined" !IdentifierPart

PostfixOperator
  = "++"
  / "--"

UnaryOperator
  = "++"
  / "--"
  / "+"
  / "-"
  / "~"
  /  "!"

MultiplicativeOperator
  = operator:("*" / "/" / "%") !"=" { return operator; }

AdditiveOperator
  = "+" !("+" / "=") { return "+"; }
  / "-" !("-" / "=") { return "-"; }

ShiftOperator
  = "<<"
  / ">>"

RelationalOperator
  = "<="
  / ">="
  / "<"
  / ">"

EqualityOperator
  = "=="
  / "!="

BitwiseANDOperator
  = "&" !"&" { return "&"; }

BitwiseXOROperator
  = "^" !"^" { return "^"; }

BitwiseOROperator
  = "|" !"|" { return "|"; }

LogicalANDOperator
  = "&&" { return "&&"; }

LogicalOROperator
  = "||" { return "||"; }



HeaderFile
  = "<" _ name:HCharSequence _ ">" { return name; }
  / '"' _ name:QCharSequence _ '"' { return name; }

HCharSequence
  = chars:(!(LineTerminatorSequenceEOF / ">") SourceCharacter)* {
      var line = "";
      for (var i = 0; i < chars.length; i++) {
        line += chars[i][1];
      }
      return line;
    }

QCharSequence
  = chars:(!(LineTerminatorSequenceEOF / '"') SourceCharacter)* {
      var line = "";
      for (var i = 0; i < chars.length; i++) {
        line += chars[i][1];
      }
      return line;
    }

Token
  = Identifier
  / Number
  / StringLiteral
  / OpOrPunc

Identifier "identifier"
  = !Keyword name:IdentifierName { return name; }

IdentifierName "identifier"
  = start:IdentifierStart parts:IdentifierPart* {
      return start + parts.join("");
    }

IdentifierStart
  = Letter
  / "$" // valid letter
  / "_"

IdentifierPart
  = IdentifierStart
  / DecimalDigit

Letter
  = [a-zA-Z]


Keyword
  = (
        "#define"
      / "#elif"
      / "#else"
      / "#endif"
      / "#error"
      / "#if"
      / "#ifdef"
      / "#ifndef"
      / "#include"
      / "#line"
      / "#pragma"
      / "#warning"
      / "#version"
      / "var"
    )
    !IdentifierPart

PPNumber "number"
  = literal:(PPHexIntegerLiteral / PPDecimalLiteral) !IdentifierStart {
      return literal;
    }

PPDecimalLiteral
  = parts:$(DecimalIntegerLiteral "." DecimalDigits? ExponentPart?) {
      return {
        TYPE: "float",
        VAL: parseFloat(parts)
      }
    }
  / parts:$("." DecimalDigits ExponentPart?) {
      return {
        TYPE: "float",
        VAL: parseFloat(parts)
      };
    }
  / parts:$(DecimalIntegerLiteral ExponentPart?) {
      return {
        TYPE: "int",
        VAL: parseInt(parts)
      };
    }
PPHexIntegerLiteral
  = "0" [xX] digits:$HexDigit+ {
      return {
        TYPE: "int",
        VAL: parseInt("0x" + digits)
      };
    }

// NOTE: do not parse anything here, leave intact

Number "number"
  = literal:(HexIntegerLiteral / DecimalLiteral) !IdentifierStart {
      return literal;
    }
DecimalLiteral
  = parts:$(DecimalIntegerLiteral "." DecimalDigits? ExponentPart?) {
      return parts;
    }
  / parts:$("." DecimalDigits ExponentPart?)     { return parts; }
  / parts:$(DecimalIntegerLiteral ExponentPart?) { return parts; }
HexIntegerLiteral
  = "0" [xX] digits:$HexDigit+ { return String(parseInt("0x" + digits)); }



DecimalIntegerLiteral
  = "0" / NonZeroDigit DecimalDigits?

DecimalDigits
  = DecimalDigit+

DecimalDigit
  = [0-9]

NonZeroDigit
  = [1-9]

ExponentPart
  = ExponentIndicator SignedInteger

ExponentIndicator
  = [eE]

SignedInteger
  = [-+]? DecimalDigits

HexDigit
  = [0-9a-fA-F]

StringLiteral "string"
  = parts:('"' DoubleStringCharacters? '"' / "'" SingleStringCharacters? "'") {
      return "\"" + parts[1] + "\"";
    }

DoubleStringCharacters
  = chars:DoubleStringCharacter+ { return chars.join(""); }

SingleStringCharacters
  = chars:SingleStringCharacter+ { return chars.join(""); }

DoubleStringCharacter
  = !('"' / "\\" / LineTerminator) char_:SourceCharacter { return char_;     }
  / "\\" sequence:EscapeSequence                         { return sequence;  }
  / LineContinuation

SingleStringCharacter
  = !("'" / "\\" / LineTerminator) char_:SourceCharacter { return char_;     }
  / "\\" sequence:EscapeSequence                         { return sequence;  }
  / LineContinuation

LineContinuation
  = "\\" sequence:LineTerminatorSequenceEOF { return sequence; }

EscapeSequence
  = CharacterEscapeSequence
  / "0" !DecimalDigit { return "\0"; }
  / HexEscapeSequence

CharacterEscapeSequence
  = SingleEscapeCharacter
  / NonEscapeCharacter

SingleEscapeCharacter
  = char_:['"\\bfnrtv] {
      return char_
        .replace("b", "\b")
        .replace("f", "\f")
        .replace("n", "\n")
        .replace("r", "\r")
        .replace("t", "\t")
        .replace("v", "\x0B") // IE does not recognize "\v".
    }

NonEscapeCharacter
  = (!EscapeCharacter / LineTerminator) char_:SourceCharacter { return char_; }

EscapeCharacter
  = SingleEscapeCharacter
  / DecimalDigit
  / "x"
  / "u"

HexEscapeSequence
  = "x" digits:$(HexDigit HexDigit) {
      return String.fromCharCode(parseInt("0x" + digits));
    }

OpOrPunc "punctuation"
  = punc:(
        "+="
      / "-="
      / "*="
      / "/="
      / "%="
      / "^="
      / "&="
      / "|="
      / "<<"
      / ">>"
      / "<<="
      / ">>="
      / "=="
      / "!="
      / "<="
      / ">="
      / "&&"
      / "||"
      / "++"
      / "--"

      / "{"
      / "}"
      / "["
      / "]"
      / "("
      / ")"
      / ";"
      / ":"
      / "?"
      / "."
      / "+"
      / "-"
      / "*"
      / "/"
      / "%"
      / "^"
      / "&"
      / "|"
      / "~"
      / "!"
      / "="
      / "<"
      / ">"
      / ","
    )

DefineParamList
  = head:Identifier tail:(_ "," _ Identifier)* {
      var result = [head];
      for (var i = 0; i < tail.length; i++) {
        result.push(tail[i][3]);
      }
      return result;
    }

// Optional and mandatory single-line space
_
  = (WhiteSpace / LineContinuation / MultiLineCommentNoLineTerminator / SingleLineComment)*
MSS
  = (WhiteSpace / LineContinuation / MultiLineCommentNoLineTerminator / SingleLineComment)+


// Optional and mandatory multi-line space
__
  = (WhiteSpace / LineContinuation / LineTerminatorSequence / Comment)*
MMS
  = (WhiteSpace / LineContinuation / LineTerminatorSequence / Comment)+


WhiteSpace "whitespace"
  = [\t\v\f ]

LineTerminator
  = [\n\r]

LineTerminatorSequence "end of line"
  = "\n"
  / "\r\n"
  / "\r"

LineTerminatorSequenceEOF
  = LineTerminatorSequence
  / EOF

Comment "comment"
  = MultiLineComment
  / SingleLineComment

MultiLineComment
  = "/*" (!"*/" SourceCharacter)* "*/"

MultiLineCommentNoLineTerminator
  = "/*" (!("*/" / LineTerminator) SourceCharacter)* "*/"

SingleLineComment
  = "//" (!LineTerminator SourceCharacter)*

SourceCharacter
  = .

EOF
  = !.

/* vim: set et si ts=2 sw=2: */
