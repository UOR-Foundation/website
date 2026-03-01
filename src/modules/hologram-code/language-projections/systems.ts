/**
 * Systems Language Projections
 * ═══════════════════════════════════════════════════
 *
 * Monarch grammars for systems programming languages:
 *   • Zig          — Modern systems language
 *   • Nim          — Efficient, expressive, elegant
 *   • Verilog      — Hardware description language
 *   • VHDL         — VHSIC HDL
 *   • RISC-V ASM   — RISC-V assembly language
 *
 * @module hologram-code/language-projections/systems
 */

import { registerProjection, type LanguageProjection } from "./registry";

const zig: LanguageProjection = {
  id: "zig",
  name: "Zig",
  category: "systems",
  extensions: ["zig"],
  aiPersona: "You are an expert in Zig. Suggest idiomatic Zig code with proper error handling, comptime, and allocator patterns.",
  languageConfig: {
    comments: { lineComment: "//" },
    brackets: [["{", "}"], ["[", "]"], ["(", ")"]],
    autoClosingPairs: [
      { open: "{", close: "}" }, { open: "[", close: "]" },
      { open: "(", close: ")" }, { open: '"', close: '"' },
      { open: "'", close: "'" },
    ],
    surroundingPairs: [["{", "}"], ["[", "]"], ["(", ")"], ['"', '"']],
  },
  monarchTokens: {
    defaultToken: "",
    tokenPostfix: ".zig",
    keywords: [
      "align", "allowzero", "and", "anyframe", "anytype", "asm",
      "async", "await", "break", "callconv", "catch", "comptime",
      "const", "continue", "defer", "else", "enum", "errdefer",
      "error", "export", "extern", "fn", "for", "if", "inline",
      "linksection", "noalias", "nosuspend", "orelse", "or",
      "packed", "pub", "resume", "return", "struct", "suspend",
      "switch", "test", "threadlocal", "try", "union", "unreachable",
      "usingnamespace", "var", "volatile", "while",
    ],
    typeKeywords: [
      "bool", "f16", "f32", "f64", "f80", "f128", "i8", "i16", "i32", "i64", "i128",
      "isize", "u8", "u16", "u32", "u64", "u128", "usize", "c_int", "c_long",
      "comptime_int", "comptime_float", "void", "noreturn", "type",
    ],
    constants: ["true", "false", "null", "undefined"],
    operators: ["=", "==", "!=", "<", ">", "<=", ">=", "+", "-", "*", "/", "%",
      "++", "+%", "-%", "*%", "<<", ">>", "&", "|", "^", "~",
      "orelse", "catch", "and", "or"],
    symbols: /[=><!~?:&|+\-*/^%]+/,
    tokenizer: {
      root: [
        [/\/\/.*$/, "comment"],
        [/@[a-zA-Z_]\w*/, "annotation"],
        [/[a-z_]\w*/, { cases: { "@keywords": "keyword", "@typeKeywords": "type", "@constants": "constant", "@default": "identifier" } }],
        [/[A-Z]\w*/, "type"],
        [/"([^"\\]|\\.)*"/, "string"],
        [/'[^']*'/, "string.char"],
        [/0[xX][0-9a-fA-F_]+/, "number.hex"],
        [/0[bB][01_]+/, "number.binary"],
        [/0[oO][0-7_]+/, "number.octal"],
        [/\d[\d_]*(\.\d[\d_]*)?([eE][-+]?\d+)?/, "number"],
        [/[{}()[\]]/, "@brackets"],
        [/@symbols/, "operator"],
        [/[;,.]/, "delimiter"],
      ],
    },
  },
  snippets: [
    { label: "zig-fn", insertText: "pub fn ${1:name}(${2:args}) ${3:!void} {\n    $0\n}", detail: "Public function" },
    { label: "zig-struct", insertText: "const ${1:Name} = struct {\n    ${2:field}: ${3:type},\n\n    pub fn ${4:init}(self: *${1:Name}) void {\n        $0\n    }\n};", detail: "Struct with method" },
    { label: "zig-test", insertText: 'test "${1:description}" {\n    $0\n}', detail: "Test block" },
  ],
};

const nim: LanguageProjection = {
  id: "nim",
  name: "Nim",
  category: "systems",
  extensions: ["nim", "nims", "nimble"],
  aiPersona: "You are an expert in Nim. Suggest idiomatic Nim code with proper type annotations, pragmas, macros, and templates.",
  languageConfig: {
    comments: { lineComment: "#", blockComment: ["#[", "]#"] },
    brackets: [["{", "}"], ["[", "]"], ["(", ")"]],
    autoClosingPairs: [
      { open: "{", close: "}" }, { open: "[", close: "]" },
      { open: "(", close: ")" }, { open: '"', close: '"' },
    ],
    surroundingPairs: [["{", "}"], ["[", "]"], ["(", ")"], ['"', '"']],
    indentationRules: {
      increaseIndentPattern: /:\s*$/,
      decreaseIndentPattern: /^\s*(else|elif|except|finally|of)\b/,
    },
  },
  monarchTokens: {
    defaultToken: "",
    tokenPostfix: ".nim",
    keywords: [
      "addr", "and", "as", "asm", "bind", "block", "break", "case",
      "cast", "concept", "const", "continue", "converter", "defer",
      "discard", "distinct", "div", "do", "elif", "else", "end",
      "enum", "except", "export", "finally", "for", "from", "func",
      "if", "import", "in", "include", "interface", "is", "isnot",
      "iterator", "let", "macro", "method", "mixin", "mod", "nil",
      "not", "notin", "object", "of", "or", "out", "proc", "ptr",
      "raise", "ref", "return", "shl", "shr", "static", "template",
      "try", "tuple", "type", "using", "var", "when", "while",
      "xor", "yield",
    ],
    typeKeywords: [
      "int", "int8", "int16", "int32", "int64", "uint", "uint8", "uint16",
      "uint32", "uint64", "float", "float32", "float64", "bool", "char",
      "string", "seq", "array", "openArray", "set", "Table", "void",
    ],
    constants: ["true", "false", "nil"],
    operators: ["=", "==", "!=", "<", ">", "<=", ">=", "+", "-", "*", "/",
      "div", "mod", "and", "or", "not", "xor", "shl", "shr", "&", "..", "@"],
    symbols: /[=><!~?:&|+\-*/^%@.]+/,
    tokenizer: {
      root: [
        [/#\[/, "comment", "@comment"],
        [/#.*$/, "comment"],
        [/\{\..*\.\}/, "annotation"],
        [/[a-zA-Z_]\w*/, { cases: { "@keywords": "keyword", "@typeKeywords": "type", "@constants": "constant", "@default": "identifier" } }],
        [/"""/, "string", "@mlstring"],
        [/"([^"\\]|\\.)*"/, "string"],
        [/'[^']*'/, "string.char"],
        [/\d[\d_]*(\.\d[\d_]*)?([eE][-+]?\d+)?/, "number"],
        [/0[xX][0-9a-fA-F_]+/, "number.hex"],
        [/[{}()[\]]/, "@brackets"],
        [/@symbols/, "operator"],
        [/[;,]/, "delimiter"],
      ],
      comment: [[/[^\]#]+/, "comment"], [/\]#/, "comment", "@pop"], [/[\]#]/, "comment"]],
      mlstring: [[/[^"]+/, "string"], [/"""/, "string", "@pop"], [/"/, "string"]],
    },
  },
  snippets: [
    { label: "nim-proc", insertText: "proc ${1:name}(${2:args}): ${3:type} =\n  $0", detail: "Procedure" },
    { label: "nim-type", insertText: "type\n  ${1:Name} = object\n    ${2:field}: ${3:int}\n$0", detail: "Type definition" },
  ],
};

const verilog: LanguageProjection = {
  id: "verilog",
  name: "Verilog",
  category: "systems",
  extensions: ["v", "sv", "svh"],
  aiPersona: "You are an expert in Verilog/SystemVerilog. Suggest RTL design patterns, testbench code, and proper synthesis-friendly constructs.",
  languageConfig: {
    comments: { lineComment: "//", blockComment: ["/*", "*/"] },
    brackets: [["begin", "end"], ["(", ")"], ["[", "]"]],
    autoClosingPairs: [
      { open: "(", close: ")" }, { open: "[", close: "]" },
      { open: '"', close: '"' },
    ],
    surroundingPairs: [["(", ")"], ["[", "]"], ['"', '"']],
  },
  monarchTokens: {
    defaultToken: "",
    tokenPostfix: ".v",
    keywords: [
      "module", "endmodule", "input", "output", "inout", "wire", "reg",
      "logic", "integer", "real", "parameter", "localparam", "assign",
      "always", "always_comb", "always_ff", "always_latch",
      "initial", "begin", "end", "if", "else", "case", "endcase",
      "for", "while", "forever", "repeat", "generate", "endgenerate",
      "function", "endfunction", "task", "endtask", "posedge", "negedge",
      "or", "and", "not", "nand", "nor", "xor", "xnor", "buf",
      "interface", "endinterface", "class", "endclass", "package", "endpackage",
      "import", "typedef", "enum", "struct", "union", "bit", "byte",
      "shortint", "int", "longint", "string", "void",
    ],
    operators: ["=", "==", "===", "!=", "!==", "<", ">", "<=", ">=",
      "+", "-", "*", "/", "%", "&", "|", "^", "~", "<<", ">>", "<<<", ">>>"],
    symbols: /[=><!~?:&|+\-*/^%]+/,
    tokenizer: {
      root: [
        [/\/\/.*$/, "comment"],
        [/\/\*/, "comment", "@comment"],
        [/`\w+/, "annotation"],
        [/\$\w+/, "function.system"],
        [/[a-zA-Z_]\w*/, { cases: { "@keywords": "keyword", "@default": "identifier" } }],
        [/"([^"\\]|\\.)*"/, "string"],
        [/\d+'[bBoOdDhH][0-9a-fA-FxXzZ_]+/, "number.sized"],
        [/\d+(\.\d+)?([eE][-+]?\d+)?/, "number"],
        [/[{}()[\]]/, "@brackets"],
        [/@symbols/, "operator"],
        [/[;,.]/, "delimiter"],
      ],
      comment: [[/[^/*]+/, "comment"], [/\*\//, "comment", "@pop"], [/[/*]/, "comment"]],
    },
  },
  snippets: [
    { label: "verilog-module", insertText: "module ${1:name} (\n  input  wire ${2:clk},\n  input  wire ${3:rst_n},\n  output reg  ${4:out}\n);\n\n  $0\n\nendmodule", detail: "Module definition" },
    { label: "verilog-always-ff", insertText: "always_ff @(posedge ${1:clk} or negedge ${2:rst_n}) begin\n  if (!${2:rst_n})\n    ${3:q} <= '0;\n  else\n    $0\nend", detail: "Sequential always block" },
  ],
};

const vhdl: LanguageProjection = {
  id: "vhdl",
  name: "VHDL",
  category: "systems",
  extensions: ["vhd", "vhdl"],
  aiPersona: "You are an expert in VHDL. Suggest RTL design patterns with proper entity/architecture structure and signal declarations.",
  languageConfig: {
    comments: { lineComment: "--" },
    brackets: [["(", ")"]],
    autoClosingPairs: [{ open: "(", close: ")" }, { open: '"', close: '"' }],
    surroundingPairs: [["(", ")"], ['"', '"']],
  },
  monarchTokens: {
    defaultToken: "",
    tokenPostfix: ".vhdl",
    ignoreCase: true,
    keywords: [
      "library", "use", "all", "entity", "is", "port", "in", "out", "inout",
      "buffer", "end", "architecture", "of", "begin", "signal", "variable",
      "constant", "type", "subtype", "component", "generic", "map",
      "process", "if", "then", "elsif", "else", "case", "when", "others",
      "for", "while", "loop", "generate", "function", "procedure",
      "return", "package", "body", "with", "select", "after", "wait",
      "until", "rising_edge", "falling_edge", "event", "not", "and",
      "or", "nand", "nor", "xor", "xnor", "downto", "to", "range",
      "std_logic", "std_logic_vector", "unsigned", "signed", "integer",
      "natural", "positive", "boolean", "bit", "bit_vector", "real",
    ],
    operators: [":=", "<=", "=>", "=", "/=", "<", ">", "+", "-", "*", "/", "&", "**"],
    symbols: /[=><!~?:&|+\-*/^%]+/,
    tokenizer: {
      root: [
        [/--.*$/, "comment"],
        [/[a-zA-Z_]\w*/, { cases: { "@keywords": "keyword", "@default": "identifier" } }],
        [/"([^"\\]|\\.)*"/, "string"],
        [/'[01xXzZuUwWlLhH-]'/, "string.char"],
        [/\d+(\.\d+)?([eE][-+]?\d+)?/, "number"],
        [/[()]/, "@brackets"],
        [/@symbols/, "operator"],
        [/[;,.]/, "delimiter"],
      ],
    },
  },
  snippets: [
    { label: "vhdl-entity", insertText: "entity ${1:name} is\n  port (\n    ${2:clk}  : in  std_logic;\n    ${3:rst}  : in  std_logic;\n    ${4:dout} : out std_logic_vector(${5:7} downto 0)\n  );\nend entity ${1:name};\n\narchitecture rtl of ${1:name} is\nbegin\n  $0\nend architecture rtl;", detail: "Entity + Architecture" },
  ],
};

const riscv: LanguageProjection = {
  id: "riscv",
  name: "RISC-V Assembly",
  category: "systems",
  extensions: ["s", "S", "asm"],
  aiPersona: "You are an expert in RISC-V assembly language. Suggest proper instructions, register usage conventions, and ABI-compliant code.",
  languageConfig: {
    comments: { lineComment: "#" },
    brackets: [["(", ")"]],
    autoClosingPairs: [{ open: "(", close: ")" }, { open: '"', close: '"' }],
    surroundingPairs: [["(", ")"], ['"', '"']],
  },
  monarchTokens: {
    defaultToken: "",
    tokenPostfix: ".s",
    instructions: [
      "add", "addi", "sub", "and", "andi", "or", "ori", "xor", "xori",
      "sll", "slli", "srl", "srli", "sra", "srai", "slt", "slti", "sltu", "sltiu",
      "lb", "lh", "lw", "ld", "lbu", "lhu", "lwu",
      "sb", "sh", "sw", "sd",
      "beq", "bne", "blt", "bge", "bltu", "bgeu",
      "jal", "jalr", "lui", "auipc",
      "ecall", "ebreak", "fence", "nop", "li", "la", "mv", "j", "jr",
      "call", "ret", "not", "neg", "seqz", "snez",
      "mul", "mulh", "div", "divu", "rem", "remu",
      "fadd.s", "fsub.s", "fmul.s", "fdiv.s", "flw", "fsw",
      "csrr", "csrw", "csrrs", "csrrc",
    ],
    registers: [
      "x0", "x1", "x2", "x3", "x4", "x5", "x6", "x7", "x8", "x9",
      "x10", "x11", "x12", "x13", "x14", "x15", "x16", "x17",
      "x18", "x19", "x20", "x21", "x22", "x23", "x24", "x25",
      "x26", "x27", "x28", "x29", "x30", "x31",
      "zero", "ra", "sp", "gp", "tp", "t0", "t1", "t2",
      "s0", "fp", "s1", "a0", "a1", "a2", "a3", "a4", "a5", "a6", "a7",
      "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10", "s11",
      "t3", "t4", "t5", "t6",
    ],
    directives: [".text", ".data", ".bss", ".section", ".global", ".globl",
      ".word", ".half", ".byte", ".string", ".asciz", ".align", ".space",
      ".equ", ".macro", ".endm", ".include", ".ifdef", ".endif"],
    tokenizer: {
      root: [
        [/#.*$/, "comment"],
        [/\.[a-z_]+/, { cases: { "@directives": "keyword.directive", "@default": "keyword.directive" } }],
        [/[a-z_]\w*:/, "type.label"],
        [/[a-z_][\w.]*/, { cases: { "@instructions": "keyword.instruction", "@registers": "variable.register", "@default": "identifier" } }],
        [/"([^"\\]|\\.)*"/, "string"],
        [/0[xX][0-9a-fA-F]+/, "number.hex"],
        [/0[bB][01]+/, "number.binary"],
        [/-?\d+/, "number"],
        [/[(),]/, "@brackets"],
      ],
    },
  },
  snippets: [
    { label: "riscv-main", insertText: '.global _start\n\n.text\n_start:\n    ${1:li a0, 0}\n    $0\n    li a7, 93\n    ecall', detail: "Entry point" },
  ],
};

export function registerSystemsProjections(): void {
  registerProjection(zig);
  registerProjection(nim);
  registerProjection(verilog);
  registerProjection(vhdl);
  registerProjection(riscv);
}
