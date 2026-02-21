/**
 * UOR Agent Term Parser — parses human-readable term strings into Term ASTs.
 *
 * Supports:
 *   - Decimal literals: 42, 255
 *   - Hex literals: 0x55, 0xAA
 *   - Unary operations: neg(x), bnot(x), succ(x), pred(x)
 *   - Binary operations: xor(a, b), and(a, b), or(a, b)
 *   - Nested expressions: neg(bnot(42)), xor(0x55, neg(0xAA))
 *
 * Delegates to ring-core/canonicalization.ts for the Term type.
 * Zero duplication — this is a pure parser only.
 */

import type { Term } from "@/modules/ring-core/canonicalization";

// ── Token types ─────────────────────────────────────────────────────────────

type Token =
  | { type: "number"; value: number }
  | { type: "ident"; value: string }
  | { type: "lparen" }
  | { type: "rparen" }
  | { type: "comma" };

// ── Tokenizer ───────────────────────────────────────────────────────────────

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const s = input.trim();

  while (i < s.length) {
    // Skip whitespace
    if (/\s/.test(s[i])) { i++; continue; }

    // Hex literal
    if (s[i] === "0" && i + 1 < s.length && (s[i + 1] === "x" || s[i + 1] === "X")) {
      let hex = "";
      i += 2;
      while (i < s.length && /[0-9a-fA-F]/.test(s[i])) { hex += s[i++]; }
      tokens.push({ type: "number", value: parseInt(hex, 16) });
      continue;
    }

    // Decimal literal
    if (/[0-9]/.test(s[i])) {
      let num = "";
      while (i < s.length && /[0-9]/.test(s[i])) { num += s[i++]; }
      tokens.push({ type: "number", value: parseInt(num, 10) });
      continue;
    }

    // Identifier
    if (/[a-zA-Z_]/.test(s[i])) {
      let id = "";
      while (i < s.length && /[a-zA-Z0-9_]/.test(s[i])) { id += s[i++]; }
      tokens.push({ type: "ident", value: id });
      continue;
    }

    if (s[i] === "(") { tokens.push({ type: "lparen" }); i++; continue; }
    if (s[i] === ")") { tokens.push({ type: "rparen" }); i++; continue; }
    if (s[i] === ",") { tokens.push({ type: "comma" }); i++; continue; }

    throw new Error(`Unexpected character '${s[i]}' at position ${i}`);
  }

  return tokens;
}

// ── Recursive descent parser ────────────────────────────────────────────────

const UNARY_OPS = new Set(["neg", "bnot", "succ", "pred"]);
const BINARY_OPS = new Set(["xor", "and", "or"]);

function parseExpr(tokens: Token[], pos: { i: number }): Term {
  const token = tokens[pos.i];

  if (!token) throw new Error("Unexpected end of input");

  // Number literal
  if (token.type === "number") {
    pos.i++;
    return { kind: "const", value: token.value };
  }

  // Identifier — either an operation or a variable
  if (token.type === "ident") {
    const name = token.value;

    // Check if followed by '(' → function call
    if (pos.i + 1 < tokens.length && tokens[pos.i + 1].type === "lparen") {
      pos.i += 2; // skip ident and '('

      if (UNARY_OPS.has(name)) {
        const arg = parseExpr(tokens, pos);
        expect(tokens, pos, "rparen");
        return { kind: "unary", op: name as "neg" | "bnot" | "succ" | "pred", arg };
      }

      if (BINARY_OPS.has(name)) {
        const args: Term[] = [];
        args.push(parseExpr(tokens, pos));
        while (pos.i < tokens.length && tokens[pos.i].type === "comma") {
          pos.i++; // skip comma
          args.push(parseExpr(tokens, pos));
        }
        expect(tokens, pos, "rparen");
        return { kind: "binary", op: name as "xor" | "and" | "or", args };
      }

      throw new Error(`Unknown function: ${name}`);
    }

    // Variable
    pos.i++;
    return { kind: "var", name };
  }

  throw new Error(`Unexpected token: ${JSON.stringify(token)}`);
}

function expect(tokens: Token[], pos: { i: number }, type: string) {
  if (pos.i >= tokens.length || tokens[pos.i].type !== type) {
    throw new Error(`Expected '${type}' at position ${pos.i}`);
  }
  pos.i++;
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Parse a human-readable term string into a Term AST.
 *
 * Examples:
 *   parseTerm("42")              → { kind: "const", value: 42 }
 *   parseTerm("neg(bnot(42))")   → { kind: "unary", op: "neg", arg: { kind: "unary", op: "bnot", arg: { kind: "const", value: 42 } } }
 *   parseTerm("xor(0x55, 0xAA)") → { kind: "binary", op: "xor", args: [{ kind: "const", value: 85 }, { kind: "const", value: 170 }] }
 */
export function parseTerm(input: string): Term {
  const tokens = tokenize(input);
  if (tokens.length === 0) throw new Error("Empty term");
  const pos = { i: 0 };
  const result = parseExpr(tokens, pos);
  if (pos.i < tokens.length) {
    throw new Error(`Unexpected token at position ${pos.i}: ${JSON.stringify(tokens[pos.i])}`);
  }
  return result;
}
