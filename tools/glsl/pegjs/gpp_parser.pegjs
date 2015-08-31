/**
 * GLSL preprocessor parser
 * see some doc here: http://www.nongnu.org/hcb/
 */

start
  = __ group:Group __ { return group; }

Group
  = parts:GroupParts? {
      return {
        type: "group",
        parts: parts !== null ? parts : []
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
        type: "condition",
        parts:parts
      }
    }

IfGroup
  = "#" _ "if" MSS expression:PPExpression _ LineTerminatorSequence __ group:Group {
      return {
        type: "if",
        expression: expression,
        group: group
      };
    }
  / "#" _ "ifdef" MSS name:Identifier _ LineTerminatorSequence __ group:Group {
      return {
        type: "ifdef",
        name: name,
        group: group
      };
    }
  / "#" _ "ifndef" MSS name:Identifier _ LineTerminatorSequence __ group:Group {
      return {
        type: "ifndef",
        name: name,
        group: group
      };
    }

ElIfGroup
  = "#" _ "elif" MSS expression:PPExpression _ LineTerminatorSequence __ group:Group __ {
      return {
        type: "elif",
        expression: expression,
        group: group
      };
    }

ElseGroup
  = "#" _ "else" _ LineTerminatorSequence __ group:Group {
      return {
        type: "else",
        group: group
      };
    }

EndIfLine
  = "#" _ "endif" _ LineTerminatorSequenceEOF


ControlLine
  = "#" _ "include" _ file:HeaderFile _ LineTerminatorSequenceEOF {
      return {
        type: "include",
        file: file
      };
    }
  / "#" _ type:("import" / "export") (MSS Tokens)? _ LineTerminatorSequenceEOF {
      return {
        type: type
      }
    }
  / "#" _ type:("define" / "var") MSS name:Identifier toks:(MSS Tokens)? _ LineTerminatorSequenceEOF {
      var tokens = [];

      if (toks !== null)
        for (var i = 0; i < toks[1].length; i++)
          tokens.push(toks[1][i]);

      return {
        type: type,
        name: name,
        tokens: tokens
      };
    }
  / "#" _ "define" MSS name:Identifier "(" _ params:DefineParamList? _ ")" _
        tokens:Tokens? _ LineTerminatorSequenceEOF {
      return {
        type: "define",
        name: name,
        params: params !== null ? params : [],
        tokens: tokens !== null ? tokens : []
      };
    }
  / "#" _ "error" toks:(MSS Tokens)? _ LineTerminatorSequenceEOF {
      var tokens = [];

      if (toks !== null)
        for (var i = 0; i < toks[1].length; i++)
          tokens.push(toks[1][i]);

      return {
        type: "error",
        tokens: tokens
      };
    }
  / "#" _ "line" MSS tokens:Tokens _ LineTerminatorSequenceEOF {
      return {
        type: "line",
        tokens: tokens
      };
    }
  / "#" _ "pragma" MSS name:Identifier MSS tokens:Tokens _ LineTerminatorSequenceEOF {
      return {
        type: "pragma",
        name: name,
        tokens: tokens
      };
    }
  / "#" _ "undef" MSS name:Identifier _ LineTerminatorSequenceEOF {
      return {
        type: "undef",
        name: name
      };
    }
  / "#" _ "warning" toks:(MSS Tokens)? _ LineTerminatorSequenceEOF {
      var tokens = [];

      if (toks !== null)
        for (var i = 0; i < toks[1].length; i++)
          tokens.push(toks[1][i]);

      return {
        type: "warning",
        tokens: tokens
      };
    }

  / "#" _ "extension" toks:(MSS Tokens)? _ LineTerminatorSequenceEOF {
      var tokens = [];

      if (toks !== null)
        for (var i = 0; i < toks[1].length; i++)
          tokens.push(toks[1][i]);

    return {
      type: "extension",
      tokens: tokens
    }
  }


  / "#" _ LineTerminatorSequenceEOF {
      return {
        type: "#"
      };
    }



Nodes
  = nodegroup:NodeGroup __ EndNodeLine {
      return nodegroup;
    }
  / NodesGlobalLine
  / NodesMainLine

NodeGroup
  = "#" _ "node" MSS name:Identifier _ LineTerminatorSequence __ decl:(NodeDeclarationLine __)* stat:(NodeStatement __)* {
      var declarations = [];
      for (var i = 0; i < decl.length; i++)
        declarations.push(decl[i][0]);

      var statements = [];
      for (var i = 0; i < stat.length; i++)
        statements.push(stat[i][0]);

      return {
        type: "node",
        name: name,
        declarations: declarations,
        statements: statements
      };
    }

EndNodeLine
  // conserning ? sign see EndIfLine
  = "#" _ "endnode" _ LineTerminatorSequenceEOF?

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
        type: "node_condition",
        parts: parts
      }
    }

NodeIfGroup
  = "#" _ "node_if" MSS expression:PPExpression _ LineTerminatorSequence __ stat:(NodeStatement __)* {
      var statements = [];
      for (var i = 0; i < stat.length; i++)
        statements.push(stat[i][0]);

      return {
        type: "node_if",
        expression: expression,
        statements: statements
      };
    }
  / "#" _ "node_ifdef" MSS name:Identifier _ LineTerminatorSequence __ stat:(NodeStatement __)* {
      var statements = [];
      for (var i = 0; i < stat.length; i++)
        statements.push(stat[i][0]);

      return {
        type: "node_ifdef",
        name: name,
        statements: statements
      };
    }
  / "#" _ "node_ifndef" MSS name:Identifier _ LineTerminatorSequence __ stat:(NodeStatement __)* {
      var statements = [];
      for (var i = 0; i < stat.length; i++)
        statements.push(stat[i][0]);

      return {
        type: "node_ifndef",
        name: name,
        statements: statements
      };
    }

NodeElIfGroup
  = "#" _ "node_elif" MSS expression:PPExpression _ LineTerminatorSequence __ stat:(NodeStatement __)* __ {
      var statements = [];
      for (var i = 0; i < stat.length; i++)
        statements.push(stat[i][0]);

      return {
        type: "node_elif",
        expression: expression,
        statements: statements
      };
    }

NodeElseGroup
  = "#" _ "node_else" _ LineTerminatorSequence __ stat:(NodeStatement __)* {
      var statements = [];
      for (var i = 0; i < stat.length; i++)
        statements.push(stat[i][0]);

      return {
        type: "node_else",
        statements: statements
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
        type: "node_in",
        name: last,
        qualifier:tokens,
        is_optional: Boolean(opt)
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
        type: "node_out",
        name: last,
        qualifier:tokens,
        is_optional: Boolean(opt)
      };
    }

NodeParamLine
  = "#" _ "node_param" toks:(MSS Tokens)? _ LineTerminatorSequence {
      var tokens = [];

      if (toks !== null)
        for (var i = 0; i < toks[1].length; i++)
          tokens.push(toks[1][i]);

      var last = tokens.pop();

      return {
        type: "node_param",
        name: last,
        qualifier:tokens
      };
    }

NodesGlobalLine
  = "#" _ "nodes_global" _ LineTerminatorSequenceEOF {
      return {
        type: "nodes_global"
      }
    }

NodesMainLine
  = "#" _ "nodes_main" _ LineTerminatorSequenceEOF {
      return {
        type: "nodes_main"
      }
    }

TextLine
  = tokens:Tokens {
       return {
         type: "textline",
         tokens: tokens
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
        type: "conditional_expr",
        places: 3
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
          type: "logical_or_expr",
          places: tail.length + 1
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
          type: "logical_and_expr",
          places: tail.length + 1
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
          type: "logical_bitor_expr",
          places: tail.length + 1
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
          type: "logical_bitxor_expr",
          places: tail.length + 1
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
          type: "logical_bitand_expr",
          places: tail.length + 1
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
            type: "equal_expr",
            places: 2
          }
          result.push.apply(result, tail[i][3]);
          result.push(op);
          break;
        case "!=":
          var op = {
            type: "non_equal_expr",
            places: 2
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
            type: "le_expr",
            places: 2
          }
          result.push.apply(result, tail[i][3]);
          result.push(op);
          break;
        case ">=":
          var op = {
            type: "ge_expr",
            places: 2
          }
          result.push.apply(result, tail[i][3]);
          result.push(op);
          break;
        case "<":
          var op = {
            type: "l_expr",
            places: 2
          }
          result.push.apply(result, tail[i][3]);
          result.push(op);
          break;
        case ">":
          var op = {
            type: "g_expr",
            places: 2
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
            type: "left_shift_expr",
            places: 2
          }
          result.push.apply(result, tail[i][3]);
          result.push(op);
          break;
        case ">>":
          var op = {
            type: "right_shift_expr",
            places: 2
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
            type: "add_expr",
            places: 2
          }
          result.push.apply(result, tail[i][3]);
          result.push(op);
          break;
        case "-":
          var op = {
            type: "sub_expr",
            places: 2
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
            type: "mul_expr",
            places: 2
          }
          result.push.apply(result, tail[i][3]);
          result.push(op);
          break;
        case "/":
          var op = {
            type: "div_expr",
            places: 2
          }
          result.push.apply(result, tail[i][3]);
          result.push(op);
          break;
        case "%":
          var op = {
            type: "mod_expr",
            places: 2
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
            type: "pre_inc_expr",
            places: 1
          }
          result.push(op);
          break;
        case "--":
          var op = {
            type: "pre_dec_expr",
            places: 1
          }
          result.push(op);
          break;
        case "+":
          var op = {
            type: "positive_expr",
            places: 1
          }
          result.push(op);
          break;
        case "-":
          var op = {
            type: "negative_expr",
            places: 1
          }
          result.push(op);
          break;
        case "~":
          var op = {
            type: "one_compl_expr",
            places: 1
          }
          result.push(op);
          break;
        case "!":
          var op = {
            type: "logic_negative_expr",
            places: 1
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
            type: "post_inc_expr",
            places: 1
          }
          result.push(op);
          break;
        case "--":
          var op = {
            type: "post_dec_expr",
            places: 1
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
      / "var"
      / "import"
      / "export"
    )
    !IdentifierPart

PPNumber "number"
  = literal:(PPHexIntegerLiteral / PPDecimalLiteral) !IdentifierStart {
      return literal;
    }

PPDecimalLiteral
  = parts:$(DecimalIntegerLiteral "." DecimalDigits? ExponentPart?) {
      return {
        type: "float",
        val: parseFloat(parts)
      }
    }
  / parts:$("." DecimalDigits ExponentPart?) {
      return {
        type: "float",
        val: parseFloat(parts)
      };
    }
  / parts:$(DecimalIntegerLiteral ExponentPart?) {
      return {
        type: "int",
        val: parseInt(parts)
      };
    }
PPHexIntegerLiteral
  = "0" [xX] digits:$HexDigit+ {
      return {
        type: "int",
        val: parseInt("0x" + digits)
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
