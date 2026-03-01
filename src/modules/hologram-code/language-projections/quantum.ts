/**
 * Quantum Language Projections
 * ═══════════════════════════════════════════════════
 *
 * Monarch grammars for quantum computing languages:
 *   • OpenQASM 3.0  — IBM quantum assembly
 *   • Q#            — Microsoft quantum language
 *   • Cirq          — Google quantum (Python-based DSL highlighting)
 *   • Quipper       — Haskell-embedded quantum language
 *   • Silq          — High-level quantum programming
 *
 * All run natively in the Monarch tokenizer — zero dependencies.
 *
 * @module hologram-code/language-projections/quantum
 */

import { registerProjection, type LanguageProjection } from "./registry";

// ── OpenQASM 3.0 ───────────────────────────────────────────────────────────

const qasm: LanguageProjection = {
  id: "qasm",
  name: "OpenQASM",
  category: "quantum",
  extensions: ["qasm", "qasm3"],
  mimeTypes: ["text/x-qasm"],
  aiPersona: "You are an expert in OpenQASM 3.0 (IBM Quantum). Suggest quantum gate operations, qubit declarations, measurements, and classical control flow. Use proper QASM syntax.",
  languageConfig: {
    comments: { lineComment: "//", blockComment: ["/*", "*/"] },
    brackets: [
      ["{", "}"], ["[", "]"], ["(", ")"],
    ],
    autoClosingPairs: [
      { open: "{", close: "}" }, { open: "[", close: "]" },
      { open: "(", close: ")" }, { open: '"', close: '"' },
    ],
    surroundingPairs: [
      ["{", "}"], ["[", "]"], ["(", ")"], ['"', '"'],
    ],
  },
  monarchTokens: {
    defaultToken: "",
    tokenPostfix: ".qasm",
    keywords: [
      "OPENQASM", "include", "qubit", "bit", "int", "uint", "float", "bool",
      "const", "let", "gate", "def", "defcal", "cal", "return",
      "if", "else", "while", "for", "in", "switch", "case", "default", "break",
      "continue", "end", "barrier", "reset", "measure", "delay", "box",
      "input", "output", "pragma", "annotation", "extern",
    ],
    typeKeywords: [
      "qubit", "bit", "int", "uint", "float", "bool", "angle", "duration",
      "stretch", "complex", "creg", "qreg",
    ],
    gates: [
      "x", "y", "z", "h", "s", "sdg", "t", "tdg", "rx", "ry", "rz",
      "cx", "cy", "cz", "ch", "ccx", "csx", "swap", "iswap",
      "rxx", "ryy", "rzz", "ecr", "u", "u1", "u2", "u3", "id", "p",
      "sx", "sxdg", "phase",
    ],
    operators: ["=", "==", "!=", "<", ">", "<=", ">=", "+", "-", "*", "/", "%", "**",
      "~", "&", "|", "^", "<<", ">>", "&&", "||", "!", "->"],
    symbols: /[=><!~?:&|+\-*/^%]+/,
    tokenizer: {
      root: [
        [/OPENQASM/, "keyword.openqasm"],
        [/[a-zA-Z_]\w*/, {
          cases: {
            "@keywords": "keyword",
            "@typeKeywords": "type",
            "@gates": "function.gate",
            "@default": "identifier",
          },
        }],
        [/\/\/.*$/, "comment"],
        [/\/\*/, "comment", "@comment"],
        [/"([^"\\]|\\.)*$/, "string.invalid"],
        [/"/, "string", "@string"],
        [/\d+(\.\d+)?([eE][-+]?\d+)?/, "number"],
        [/0[xX][0-9a-fA-F]+/, "number.hex"],
        [/[{}()[\]]/, "@brackets"],
        [/@symbols/, { cases: { "@operators": "operator", "@default": "" } }],
        [/[;,.]/, "delimiter"],
        [/π|pi|tau|euler/, "constant.math"],
      ],
      comment: [
        [/[^/*]+/, "comment"],
        [/\*\//, "comment", "@pop"],
        [/[/*]/, "comment"],
      ],
      string: [
        [/[^\\"]+/, "string"],
        [/\\./, "string.escape"],
        [/"/, "string", "@pop"],
      ],
    },
  },
  snippets: [
    { label: "qasm-header", insertText: 'OPENQASM 3.0;\ninclude "stdgates.inc";\n\n$0', detail: "QASM 3.0 header" },
    { label: "qubit-decl", insertText: "qubit[${1:n}] ${2:q};", detail: "Declare qubit register" },
    { label: "bell-pair", insertText: "h ${1:q}[0];\ncx ${1:q}[0], ${1:q}[1];\n$0", detail: "Bell pair circuit" },
    { label: "measure-all", insertText: "bit[${1:n}] ${2:c};\n${2:c} = measure ${3:q};", detail: "Measure all qubits" },
    { label: "gate-def", insertText: "gate ${1:name}(${2:params}) ${3:qubits} {\n  $0\n}", detail: "Custom gate definition" },
    { label: "qft", insertText: "// Quantum Fourier Transform\nfor int i in [0:${1:n}] {\n  h q[i];\n  for int j in [i+1:${1:n}] {\n    cp(pi / pow(2, j-i)) q[j], q[i];\n  }\n}", detail: "QFT circuit" },
  ],
};

// ── Q# (Microsoft Quantum) ─────────────────────────────────────────────────

const qsharp: LanguageProjection = {
  id: "qsharp",
  name: "Q#",
  category: "quantum",
  extensions: ["qs"],
  mimeTypes: ["text/x-qsharp"],
  aiPersona: "You are an expert in Q# (Microsoft Quantum Development Kit). Suggest quantum operations, type annotations, functors (Adj, Ctl), and proper Q# patterns. Use namespaces and callable signatures.",
  languageConfig: {
    comments: { lineComment: "//", blockComment: ["/*", "*/"] },
    brackets: [["{", "}"], ["[", "]"], ["(", ")"]],
    autoClosingPairs: [
      { open: "{", close: "}" }, { open: "[", close: "]" },
      { open: "(", close: ")" }, { open: '"', close: '"' },
    ],
    surroundingPairs: [["{", "}"], ["[", "]"], ["(", ")"], ['"', '"']],
  },
  monarchTokens: {
    defaultToken: "",
    tokenPostfix: ".qs",
    keywords: [
      "namespace", "open", "operation", "function", "newtype", "body",
      "adjoint", "controlled", "auto", "distribute", "invert", "intrinsic",
      "let", "mutable", "set", "use", "borrow", "return", "fail",
      "if", "elif", "else", "for", "in", "while", "repeat", "until",
      "fixup", "within", "apply", "using", "borrowing",
      "is", "not", "and", "or", "w/", "new", "internal",
    ],
    typeKeywords: [
      "Qubit", "Result", "Bool", "Int", "BigInt", "Double", "String", "Unit",
      "Pauli", "Range", "Array", "Tuple", "Ctl", "Adj",
      "Zero", "One", "PauliI", "PauliX", "PauliY", "PauliZ",
    ],
    gates: [
      "H", "X", "Y", "Z", "S", "T", "CNOT", "CCNOT", "SWAP",
      "Rx", "Ry", "Rz", "R", "R1", "Measure", "M", "MResetZ",
      "Reset", "ResetAll", "Message", "DumpMachine",
    ],
    operators: ["=", "==", "!=", "<", ">", "<=", ">=", "+", "-", "*", "/", "%", "^",
      "and", "or", "not", "w/", "<-", "->", "...", "..", "!"],
    symbols: /[=><!~?:&|+\-*/^%]+/,
    tokenizer: {
      root: [
        [/[a-zA-Z_]\w*/, {
          cases: {
            "@keywords": "keyword",
            "@typeKeywords": "type",
            "@gates": "function.gate",
            "@default": "identifier",
          },
        }],
        [/\/\/.*$/, "comment"],
        [/\/\*/, "comment", "@comment"],
        [/"([^"\\]|\\.)*$/, "string.invalid"],
        [/"/, "string", "@string"],
        [/\d+(\.\d+)?([eE][-+]?\d+)?/, "number"],
        [/0[xX][0-9a-fA-F]+/, "number.hex"],
        [/[{}()[\]]/, "@brackets"],
        [/@symbols/, "operator"],
        [/[;,.]/, "delimiter"],
      ],
      comment: [
        [/[^/*]+/, "comment"],
        [/\*\//, "comment", "@pop"],
        [/[/*]/, "comment"],
      ],
      string: [
        [/[^\\"]+/, "string"],
        [/\\./, "string.escape"],
        [/"/, "string", "@pop"],
      ],
    },
  },
  snippets: [
    { label: "qs-namespace", insertText: 'namespace ${1:Quantum.Sample} {\n  open Microsoft.Quantum.Canon;\n  open Microsoft.Quantum.Intrinsic;\n\n  $0\n}', detail: "Q# namespace" },
    { label: "qs-operation", insertText: "operation ${1:MyOp}(${2:q : Qubit}) : ${3:Unit} {\n  $0\n}", detail: "Q# operation" },
    { label: "qs-measure", insertText: "let ${1:result} = M(${2:q});\nif ${1:result} == One {\n  $0\n}", detail: "Measure and branch" },
    { label: "qs-bell", insertText: "use (q1, q2) = (Qubit(), Qubit());\nH(q1);\nCNOT(q1, q2);\nlet (r1, r2) = (M(q1), M(q2));\nResetAll([q1, q2]);", detail: "Bell state" },
  ],
};

// ── Cirq (Google Quantum) ───────────────────────────────────────────────────

const cirq: LanguageProjection = {
  id: "cirq",
  name: "Cirq",
  category: "quantum",
  extensions: ["cirq"],
  aiPersona: "You are an expert in Google Cirq quantum computing library. Suggest cirq operations, circuit construction patterns, simulators, and noise models. Use proper Python/Cirq idioms.",
  languageConfig: {
    comments: { lineComment: "#" },
    brackets: [["{", "}"], ["[", "]"], ["(", ")"]],
    autoClosingPairs: [
      { open: "{", close: "}" }, { open: "[", close: "]" },
      { open: "(", close: ")" }, { open: '"', close: '"' }, { open: "'", close: "'" },
    ],
    surroundingPairs: [["{", "}"], ["[", "]"], ["(", ")"], ['"', '"'], ["'", "'"]],
  },
  monarchTokens: {
    defaultToken: "",
    tokenPostfix: ".cirq",
    keywords: [
      "import", "from", "as", "def", "class", "return", "yield",
      "if", "elif", "else", "for", "while", "in", "try", "except",
      "finally", "with", "raise", "pass", "break", "continue",
      "lambda", "and", "or", "not", "is", "None", "True", "False",
      "print", "self", "async", "await",
    ],
    cirqKeywords: [
      "cirq", "Circuit", "LineQubit", "GridQubit", "NamedQubit",
      "Simulator", "DensityMatrixSimulator", "measure", "moment",
      "InsertStrategy", "EARLIEST", "NEW_THEN_INLINE",
      "H", "X", "Y", "Z", "S", "T", "CNOT", "CZ", "SWAP", "ISWAP",
      "rx", "ry", "rz", "ZZPowGate", "XXPowGate", "YYPowGate",
      "Moment", "GateOperation", "final_state_vector",
      "DepolarizingChannel", "AmplitudeDampingChannel",
    ],
    operators: ["=", "==", "!=", "<", ">", "<=", ">=", "+", "-", "*", "/", "//",
      "%", "**", "~", "&", "|", "^", "<<", ">>", "+=", "-=", "*=", "/=", "@"],
    symbols: /[=><!~?:&|+\-*/^%@]+/,
    tokenizer: {
      root: [
        [/#.*$/, "comment"],
        [/[a-zA-Z_]\w*/, {
          cases: {
            "@keywords": "keyword",
            "@cirqKeywords": "type.cirq",
            "@default": "identifier",
          },
        }],
        [/"""/, "string", "@mlstring"],
        [/"([^"\\]|\\.)*$/, "string.invalid"],
        [/"/, "string", "@string"],
        [/'([^'\\]|\\.)*$/, "string.invalid"],
        [/'/, "string", "@sstring"],
        [/\d+(\.\d+)?([eE][-+]?\d+)?j?/, "number"],
        [/0[xX][0-9a-fA-F]+/, "number.hex"],
        [/[{}()[\]]/, "@brackets"],
        [/@symbols/, "operator"],
        [/[;,.]/, "delimiter"],
        [/f"/, "string.interpolated", "@fstring"],
      ],
      string: [[/[^\\"]+/, "string"], [/\\./, "string.escape"], [/"/, "string", "@pop"]],
      sstring: [[/[^\\']+/, "string"], [/\\./, "string.escape"], [/'/, "string", "@pop"]],
      mlstring: [[/[^"]+/, "string"], [/"""/, "string", "@pop"], [/"/, "string"]],
      fstring: [[/\{/, "string.interpolated", "@fstringExpr"], [/[^"\\{]+/, "string.interpolated"], [/"/, "string.interpolated", "@pop"]],
      fstringExpr: [[/\}/, "string.interpolated", "@pop"], [/[^}]+/, "identifier"]],
    },
  },
  snippets: [
    { label: "cirq-circuit", insertText: "import cirq\n\nq = cirq.LineQubit.range(${1:2})\ncircuit = cirq.Circuit([\n  cirq.H(q[0]),\n  cirq.CNOT(q[0], q[1]),\n  cirq.measure(*q, key='result'),\n])\n$0", detail: "Cirq circuit" },
    { label: "cirq-simulate", insertText: "simulator = cirq.Simulator()\nresult = simulator.simulate(circuit)\nprint(result.final_state_vector)", detail: "Simulate circuit" },
  ],
};

// ── Silq ────────────────────────────────────────────────────────────────────

const silq: LanguageProjection = {
  id: "silq",
  name: "Silq",
  category: "quantum",
  extensions: ["slq"],
  aiPersona: "You are an expert in Silq, a high-level quantum programming language with automatic uncomputation. Suggest quantum operations with proper type annotations and automatic uncomputation patterns.",
  languageConfig: {
    comments: { lineComment: "//", blockComment: ["/*", "*/"] },
    brackets: [["{", "}"], ["[", "]"], ["(", ")"]],
    autoClosingPairs: [
      { open: "{", close: "}" }, { open: "[", close: "]" },
      { open: "(", close: ")" }, { open: '"', close: '"' },
    ],
    surroundingPairs: [["{", "}"], ["[", "]"], ["(", ")"], ['"', '"']],
  },
  monarchTokens: {
    defaultToken: "",
    tokenPostfix: ".slq",
    keywords: [
      "def", "return", "if", "else", "for", "while", "in", "const",
      "mutable", "import", "as", "measure", "forget", "dump",
      "classical", "quantum", "qfree", "mfree",
    ],
    typeKeywords: ["B", "N", "Z", "R", "𝔹", "ℕ", "ℤ", "ℝ", "!B", "!N"],
    operators: ["=", "==", "!=", "<", ">", "<=", ">=", "+", "-", "*", "/",
      "~", "&", "|", "^", "<<", ">>", "&&", "||", "!"],
    symbols: /[=><!~?:&|+\-*/^%]+/,
    tokenizer: {
      root: [
        [/[a-zA-Z_]\w*/, {
          cases: { "@keywords": "keyword", "@typeKeywords": "type", "@default": "identifier" },
        }],
        [/\/\/.*$/, "comment"],
        [/\/\*/, "comment", "@comment"],
        [/"([^"\\]|\\.)*"/, "string"],
        [/\d+(\.\d+)?/, "number"],
        [/[{}()[\]]/, "@brackets"],
        [/@symbols/, "operator"],
        [/[;,.]/, "delimiter"],
      ],
      comment: [[/[^/*]+/, "comment"], [/\*\//, "comment", "@pop"], [/[/*]/, "comment"]],
    },
  },
  snippets: [
    { label: "silq-def", insertText: "def ${1:grover}(${2:oracle}: const 𝔹^^${3:n} !-> B) {\n  $0\n}", detail: "Silq function" },
  ],
};

// ── Quipper ─────────────────────────────────────────────────────────────────

const quipper: LanguageProjection = {
  id: "quipper",
  name: "Quipper",
  category: "quantum",
  extensions: ["quip"],
  aiPersona: "You are an expert in Quipper, a Haskell-embedded quantum language. Suggest circuit construction, data types, and reversible computation patterns.",
  languageConfig: {
    comments: { lineComment: "--", blockComment: ["{-", "-}"] },
    brackets: [["{", "}"], ["[", "]"], ["(", ")"]],
    autoClosingPairs: [
      { open: "{", close: "}" }, { open: "[", close: "]" },
      { open: "(", close: ")" }, { open: '"', close: '"' },
    ],
    surroundingPairs: [["{", "}"], ["[", "]"], ["(", ")"], ['"', '"']],
  },
  monarchTokens: {
    defaultToken: "",
    tokenPostfix: ".quip",
    keywords: [
      "import", "module", "where", "let", "in", "do", "case", "of",
      "if", "then", "else", "data", "type", "class", "instance",
      "deriving", "qualified", "as", "hiding",
      "qinit", "qterm", "hadamard", "qnot", "cnot", "measure",
      "controlled", "with_computed", "classical_to_quantum",
    ],
    typeKeywords: ["Qubit", "Bit", "Circ", "QShape", "QData", "Bool", "Int"],
    operators: ["=", "::", "->", "<-", ">>", ">>=", ".", "$", "++", "\\"],
    symbols: /[=><!~?:&|+\-*/^%$@.\\]+/,
    tokenizer: {
      root: [
        [/--.*$/, "comment"],
        [/\{-/, "comment", "@comment"],
        [/[a-zA-Z_]\w*/, {
          cases: { "@keywords": "keyword", "@typeKeywords": "type", "@default": "identifier" },
        }],
        [/"([^"\\]|\\.)*"/, "string"],
        [/\d+(\.\d+)?/, "number"],
        [/[{}()[\]]/, "@brackets"],
        [/@symbols/, "operator"],
        [/[;,]/, "delimiter"],
      ],
      comment: [[/[^{}-]+/, "comment"], [/-\}/, "comment", "@pop"], [/[{}-]/, "comment"]],
    },
  },
};

// ── Register all quantum projections ────────────────────────────────────────

export function registerQuantumProjections(): void {
  registerProjection(qasm);
  registerProjection(qsharp);
  registerProjection(cirq);
  registerProjection(silq);
  registerProjection(quipper);
}
