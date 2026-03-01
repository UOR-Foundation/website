/**
 * Legacy & Data Language Projections
 * ═══════════════════════════════════════════════════
 *
 *   • COBOL         — Business computing
 *   • Fortran       — Scientific/HPC computing
 *   • Ada           — Safety-critical systems
 *   • Pascal        — Educational/structured
 *   • HCL           — HashiCorp Configuration
 *   • Protocol Buffers — Google's serialization
 *   • GraphQL       — API query language
 *
 * @module hologram-code/language-projections/legacy-data
 */

import { registerProjection, type LanguageProjection } from "./registry";

const cobol: LanguageProjection = {
  id: "cobol",
  name: "COBOL",
  category: "legacy",
  extensions: ["cbl", "cob", "cpy"],
  aiPersona: "You are an expert in COBOL. Suggest proper division structure, paragraphs, PERFORM patterns, and WORKING-STORAGE declarations.",
  languageConfig: {
    comments: { lineComment: "*>" },
    brackets: [["(", ")"]],
    autoClosingPairs: [{ open: "(", close: ")" }, { open: '"', close: '"' }],
    surroundingPairs: [["(", ")"], ['"', '"']],
  },
  monarchTokens: {
    defaultToken: "",
    tokenPostfix: ".cbl",
    ignoreCase: true,
    keywords: [
      "IDENTIFICATION", "DIVISION", "PROGRAM-ID", "ENVIRONMENT", "DATA",
      "PROCEDURE", "WORKING-STORAGE", "SECTION", "FILE", "FD", "SD",
      "COPY", "REPLACE", "PICTURE", "PIC", "VALUE", "OCCURS", "TIMES",
      "REDEFINES", "COMP", "COMP-3", "DISPLAY", "ACCEPT",
      "MOVE", "ADD", "SUBTRACT", "MULTIPLY", "DIVIDE", "COMPUTE",
      "IF", "ELSE", "END-IF", "EVALUATE", "WHEN", "END-EVALUATE",
      "PERFORM", "UNTIL", "VARYING", "END-PERFORM", "THRU", "THROUGH",
      "GO", "TO", "STOP", "RUN", "EXIT", "GOBACK",
      "READ", "WRITE", "OPEN", "CLOSE", "INPUT", "OUTPUT", "EXTEND",
      "STRING", "UNSTRING", "INSPECT", "TALLYING", "REPLACING",
      "CALL", "USING", "RETURNING", "BY", "REFERENCE", "CONTENT",
      "NOT", "AND", "OR", "EQUAL", "GREATER", "LESS", "THAN",
      "SPACES", "ZEROS", "ZEROES", "HIGH-VALUES", "LOW-VALUES",
      "ALSO", "FROM", "INTO", "GIVING", "WITH", "ON", "SIZE", "ERROR",
      "AT", "END", "OF", "TO", "IS", "ARE", "THE", "A", "AN",
    ],
    operators: ["=", ">", "<", ">=", "<=", "NOT ="],
    tokenizer: {
      root: [
        [/\*>.*$/, "comment"],
        [/^.{6}\*.*$/, "comment"], // Column 7 comment
        [/[a-zA-Z][\w-]*/, { cases: { "@keywords": "keyword", "@default": "identifier" } }],
        [/"([^"]*)"/, "string"],
        [/'([^']*)'/, "string"],
        [/\d+(\.\d+)?/, "number"],
        [/[()]/, "@brackets"],
        [/[.,;]/, "delimiter"],
      ],
    },
  },
  snippets: [
    { label: "cobol-hello", insertText: "       IDENTIFICATION DIVISION.\n       PROGRAM-ID. ${1:HELLO}.\n       DATA DIVISION.\n       WORKING-STORAGE SECTION.\n       01 WS-MSG PIC X(30) VALUE '${2:Hello World}'.\n       PROCEDURE DIVISION.\n           DISPLAY WS-MSG.\n           STOP RUN.", detail: "COBOL program" },
  ],
};

const fortran: LanguageProjection = {
  id: "fortran",
  name: "Fortran",
  category: "legacy",
  extensions: ["f90", "f95", "f03", "f08", "f", "for"],
  aiPersona: "You are an expert in modern Fortran (F90+). Suggest idiomatic Fortran with modules, derived types, array operations, and parallel constructs.",
  languageConfig: {
    comments: { lineComment: "!" },
    brackets: [["(", ")"]],
    autoClosingPairs: [{ open: "(", close: ")" }, { open: '"', close: '"' }, { open: "'", close: "'" }],
    surroundingPairs: [["(", ")"], ['"', '"'], ["'", "'"]],
    indentationRules: {
      increaseIndentPattern: /\b(program|module|subroutine|function|do|if|select|type|interface|block)\b/i,
      decreaseIndentPattern: /\b(end\s+\w+|end|else|elseif|case|contains)\b/i,
    },
  },
  monarchTokens: {
    defaultToken: "",
    tokenPostfix: ".f90",
    ignoreCase: true,
    keywords: [
      "program", "end", "module", "use", "implicit", "none", "only",
      "subroutine", "function", "call", "return", "contains",
      "integer", "real", "double", "precision", "complex", "logical",
      "character", "type", "class", "dimension", "allocatable",
      "intent", "in", "out", "inout", "parameter", "save",
      "if", "then", "else", "elseif", "endif", "select", "case",
      "do", "while", "enddo", "cycle", "exit", "forall", "where",
      "allocate", "deallocate", "nullify", "associated",
      "print", "write", "read", "open", "close", "format",
      "interface", "abstract", "extends", "procedure", "generic",
      "public", "private", "protected", "block", "associate",
      "concurrent", "pure", "elemental", "recursive", "result",
    ],
    operators: ["+", "-", "*", "/", "**", "=", "==", "/=", "<", ">",
      "<=", ">=", ".and.", ".or.", ".not.", ".true.", ".false.",
      ".eq.", ".ne.", ".lt.", ".gt.", ".le.", ".ge.", "::"],
    symbols: /[=><!~?:&|+\-*/^%.]+/,
    tokenizer: {
      root: [
        [/!.*$/, "comment"],
        [/[a-zA-Z_]\w*/, { cases: { "@keywords": "keyword", "@default": "identifier" } }],
        [/"([^"]*)"/, "string"],
        [/'([^']*)'/, "string"],
        [/\d+(\.\d+)?([dDeE][-+]?\d+)?/, "number"],
        [/[()]/, "@brackets"],
        [/@symbols/, "operator"],
        [/[;,]/, "delimiter"],
      ],
    },
  },
  snippets: [
    { label: "f90-program", insertText: "program ${1:main}\n  implicit none\n  $0\nend program ${1:main}", detail: "Fortran program" },
    { label: "f90-subroutine", insertText: "subroutine ${1:name}(${2:args})\n  implicit none\n  ${3:integer, intent(in) :: args}\n  $0\nend subroutine ${1:name}", detail: "Subroutine" },
  ],
};

const ada: LanguageProjection = {
  id: "ada",
  name: "Ada",
  category: "legacy",
  extensions: ["adb", "ads", "ada"],
  aiPersona: "You are an expert in Ada. Suggest safety-critical patterns with strong typing, tasking, protected objects, and SPARK annotations.",
  languageConfig: {
    comments: { lineComment: "--" },
    brackets: [["(", ")"]],
    autoClosingPairs: [{ open: "(", close: ")" }, { open: '"', close: '"' }],
    surroundingPairs: [["(", ")"], ['"', '"']],
    indentationRules: {
      increaseIndentPattern: /\b(begin|then|loop|is|record|do)\s*$/i,
      decreaseIndentPattern: /\b(end|else|elsif|exception|when)\b/i,
    },
  },
  monarchTokens: {
    defaultToken: "",
    tokenPostfix: ".ada",
    ignoreCase: true,
    keywords: [
      "abort", "abs", "abstract", "accept", "access", "aliased", "all",
      "and", "array", "at", "begin", "body", "case", "constant",
      "declare", "delay", "delta", "digits", "do", "else", "elsif",
      "end", "entry", "exception", "exit", "for", "function",
      "generic", "goto", "if", "in", "interface", "is", "limited",
      "loop", "mod", "new", "not", "null", "of", "or", "others",
      "out", "overriding", "package", "pragma", "private", "procedure",
      "protected", "raise", "range", "record", "rem", "renames",
      "requeue", "return", "reverse", "select", "separate", "some",
      "subtype", "synchronized", "tagged", "task", "terminate", "then",
      "type", "until", "use", "when", "while", "with", "xor",
    ],
    typeKeywords: [
      "Integer", "Natural", "Positive", "Float", "Long_Float",
      "Boolean", "Character", "String", "Duration", "Wide_String",
    ],
    constants: ["True", "False"],
    operators: [":=", "=>", "..", "=", "/=", "<", ">", "<=", ">=",
      "+", "-", "*", "/", "**", "&", "and", "or", "not", "xor", "mod", "rem"],
    symbols: /[=><!+\-*/&|:]+/,
    tokenizer: {
      root: [
        [/--.*$/, "comment"],
        [/[a-zA-Z_]\w*/, { cases: { "@keywords": "keyword", "@typeKeywords": "type", "@constants": "constant", "@default": "identifier" } }],
        [/"([^"]*)"/, "string"],
        [/'.'/, "string.char"],
        [/\d[\d_]*(\.\d[\d_]*)?([eE][-+]?\d+)?/, "number"],
        [/[()]/, "@brackets"],
        [/@symbols/, "operator"],
        [/[;,.]/, "delimiter"],
      ],
    },
  },
  snippets: [
    { label: "ada-procedure", insertText: "procedure ${1:Main} is\nbegin\n   $0\nend ${1:Main};", detail: "Ada procedure" },
    { label: "ada-task", insertText: "task type ${1:Worker} is\n   entry ${2:Start};\nend ${1:Worker};\n\ntask body ${1:Worker} is\nbegin\n   accept ${2:Start} do\n      $0\n   end ${2:Start};\nend ${1:Worker};", detail: "Ada task" },
  ],
};

const hcl: LanguageProjection = {
  id: "hcl",
  name: "HCL",
  category: "data",
  extensions: ["hcl", "tf", "tfvars"],
  aiPersona: "You are an expert in HCL/Terraform. Suggest proper resource blocks, data sources, variables, outputs, and module patterns.",
  languageConfig: {
    comments: { lineComment: "#", blockComment: ["/*", "*/"] },
    brackets: [["{", "}"], ["[", "]"], ["(", ")"]],
    autoClosingPairs: [
      { open: "{", close: "}" }, { open: "[", close: "]" },
      { open: "(", close: ")" }, { open: '"', close: '"' },
    ],
    surroundingPairs: [["{", "}"], ["[", "]"], ["(", ")"], ['"', '"']],
  },
  monarchTokens: {
    defaultToken: "",
    tokenPostfix: ".hcl",
    keywords: [
      "resource", "data", "variable", "output", "locals", "module",
      "provider", "terraform", "backend", "required_providers",
      "for_each", "count", "depends_on", "lifecycle",
      "create_before_destroy", "prevent_destroy", "ignore_changes",
      "dynamic", "content", "for", "in", "if", "true", "false", "null",
    ],
    operators: ["=", "==", "!=", "<", ">", "<=", ">=", "&&", "||", "!",
      "+", "-", "*", "/", "%", "?", ":", "=>"],
    symbols: /[=><!~?:&|+\-*/^%]+/,
    tokenizer: {
      root: [
        [/#.*$/, "comment"],
        [/\/\/.*$/, "comment"],
        [/\/\*/, "comment", "@comment"],
        [/\$\{/, "string.interpolated", "@interpolation"],
        [/[a-zA-Z_]\w*/, { cases: { "@keywords": "keyword", "@default": "identifier" } }],
        [/"/, "string", "@string"],
        [/<<-?\w+/, "string.heredoc"],
        [/\d+(\.\d+)?/, "number"],
        [/[{}()[\]]/, "@brackets"],
        [/@symbols/, "operator"],
        [/[,.]/, "delimiter"],
      ],
      comment: [[/[^/*]+/, "comment"], [/\*\//, "comment", "@pop"], [/[/*]/, "comment"]],
      string: [[/\$\{/, "string.interpolated", "@interpolation"], [/[^\\"$]+/, "string"], [/\\./, "string.escape"], [/"/, "string", "@pop"]],
      interpolation: [[/\}/, "string.interpolated", "@pop"], [/[^}]+/, "identifier"]],
    },
  },
  snippets: [
    { label: "tf-resource", insertText: 'resource "${1:aws_instance}" "${2:example}" {\n  ${3:ami}           = "${4:ami-12345}"\n  ${5:instance_type} = "${6:t2.micro}"\n\n  tags = {\n    Name = "${7:example}"\n  }\n}', detail: "Terraform resource" },
    { label: "tf-variable", insertText: 'variable "${1:name}" {\n  description = "${2:Description}"\n  type        = ${3:string}\n  default     = "${4:value}"\n}', detail: "Variable" },
  ],
};

const protobuf: LanguageProjection = {
  id: "protobuf",
  name: "Protocol Buffers",
  category: "data",
  extensions: ["proto"],
  aiPersona: "You are an expert in Protocol Buffers. Suggest proper message definitions, service declarations, and field numbering.",
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
    tokenPostfix: ".proto",
    keywords: [
      "syntax", "import", "package", "option", "message", "enum",
      "service", "rpc", "returns", "stream", "oneof", "map",
      "reserved", "extensions", "extend", "repeated", "optional",
      "required", "public", "weak",
    ],
    typeKeywords: [
      "double", "float", "int32", "int64", "uint32", "uint64",
      "sint32", "sint64", "fixed32", "fixed64", "sfixed32", "sfixed64",
      "bool", "string", "bytes", "Any", "Timestamp", "Duration",
    ],
    constants: ["true", "false"],
    operators: ["="],
    symbols: /[=]+/,
    tokenizer: {
      root: [
        [/\/\/.*$/, "comment"],
        [/\/\*/, "comment", "@comment"],
        [/[a-zA-Z_]\w*/, { cases: { "@keywords": "keyword", "@typeKeywords": "type", "@constants": "constant", "@default": "identifier" } }],
        [/"([^"\\]|\\.)*"/, "string"],
        [/\d+/, "number"],
        [/[{}()[\]]/, "@brackets"],
        [/[=;,.]/, "delimiter"],
      ],
      comment: [[/[^/*]+/, "comment"], [/\*\//, "comment", "@pop"], [/[/*]/, "comment"]],
    },
  },
  snippets: [
    { label: "proto-message", insertText: 'syntax = "proto3";\n\nmessage ${1:MyMessage} {\n  ${2:string} ${3:name} = 1;\n  ${4:int32} ${5:id} = 2;\n  $0\n}', detail: "Proto3 message" },
    { label: "proto-service", insertText: "service ${1:MyService} {\n  rpc ${2:GetItem} (${3:GetItemRequest}) returns (${4:GetItemResponse});\n}", detail: "gRPC service" },
  ],
};

export function registerLegacyDataProjections(): void {
  registerProjection(cobol);
  registerProjection(fortran);
  registerProjection(ada);
  registerProjection(hcl);
  registerProjection(protobuf);
}
