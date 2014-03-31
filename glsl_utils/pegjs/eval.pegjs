/** 
 * Preprocessor expression calculator
 * see some doc here: http://www.nongnu.org/hcb/
 */

start
  = _ expression:PPExpression _ LineTerminatorSequence? { return expression; }

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
      if (condition)
        return trueExpression;
      else
        return falseExpression;
    }
  / LogicalORExpression

LogicalORExpression
  = head:LogicalANDExpression
    tail:(_ LogicalOROperator _ LogicalANDExpression)* {
      var result = head;
      for (var i = 0; i < tail.length; i++)
        result = result || tail[i][3];
      return result;
    }

LogicalANDExpression
  = head:BitwiseORExpression
    tail:(_ LogicalANDOperator _ BitwiseORExpression)* {
      var result = head;
      for (var i = 0; i < tail.length; i++)
        result = result && tail[i][3];
      return result;
    }

BitwiseORExpression
  = head:BitwiseXORExpression
    tail:(_ BitwiseOROperator _ BitwiseXORExpression)* {
      var result = head;
      for (var i = 0; i < tail.length; i++)
        result |= tail[i][3];
      return result;
    }

BitwiseXORExpression
  = head:BitwiseANDExpression
    tail:(_ BitwiseXOROperator _ BitwiseANDExpression)* {
      var result = head;
      for (var i = 0; i < tail.length; i++)
        result ^= tail[i][3];
      return result;
    }

BitwiseANDExpression
  = head:EqualityExpression
    tail:(_ BitwiseANDOperator _ EqualityExpression)* {
      var result = head;
      for (var i = 0; i < tail.length; i++)
        result &= tail[i][3];
      return result;
    }

EqualityExpression
  = head:RelationalExpression
    tail:(_ EqualityOperator _ RelationalExpression)* {
      var result = head;
      for (var i = 0; i < tail.length; i++) {
        switch (tail[i][1]) {
        case "==":
          result = (result == tail[i][3]);
          break;
        case "!=":
          result = (result != tail[i][3]);
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
          result = (result <= tail[i][3]);
          break;
        case ">=":
          result = (result >= tail[i][3]);
          break;
        case "<":
          result = (result < tail[i][3]);
          break;
        case ">":
          result = (result > tail[i][3]);
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
          result = (result << tail[i][3]);
          break;
        case ">>":
          result = (result >> tail[i][3]);
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
          result += tail[i][3];
          break;
        case "-":
          result -= tail[i][3];
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
          result *= tail[i][3];
          break;
        case "/":
          result = Math.floor(result / tail[i][3]);
          break;
        case "%":
          result %= tail[i][3];
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
      switch (operator) {
        case "++":
          return (++expression);
        case "--":
          return (--expression);
        case "+":
          return (+expression);
        case "-":
          return (-expression);
        case "~":
          return (~expression);
        case "!":
          return (!expression);
      }
    }

PostfixExpression
  = expression:PrimaryExpression _ operator:PostfixOperator {
      switch (operator) {
        case "++":
          return (++expression);
        case "--":
          return (--expression);
      }
    }
  / PrimaryExpression

PrimaryExpression
  = NumericLiteral
  / Identifier { return 0; }  // undefined identifier always treated as 0
  / "(" _ expression:PPExpression _ ")" { return expression; }

DefinedExpression
  = Identifier { return 0; }
  // NOTE: hack
  / (!("(" / ")") SourceCharacter)+  { return 1; }
  / "(" _ expression:DefinedExpression _ ")" { return expression; }

NumericLiteral "number"
  = literal:(HexIntegerLiteral / IntegerLiteral) {
      return literal;
    }

IntegerLiteral
  = parts:$(DecimalIntegerLiteral) { return parseInt(parts); }

DecimalIntegerLiteral
  = "0" / NonZeroDigit DecimalDigits?

DecimalDigits
  = DecimalDigit+

DecimalDigit
  = [0-9]

NonZeroDigit
  = [1-9]


ExponentIndicator
  = [eE]

SignedInteger
  = [-+]? DecimalDigits

HexIntegerLiteral
  = "0" [xX] digits:$HexDigit+ { return parseInt("0x" + digits); }

HexDigit
  = [0-9a-fA-F]

Identifier "identifier"
  = !ReservedWord name:IdentifierName { return name; }

ReservedWord
  = "defined" !IdentifierPart

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


_
  = WhiteSpace*


WhiteSpace "whitespace"
  = [\t\v\f ]

LineTerminatorSequence "end of line"
  = "\n"
  / "\r\n"
  / "\r"

SourceCharacter
  = .


/* vim: set et si ts=2 sw=2: */

