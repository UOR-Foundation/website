/**
 * Functional & Scientific Language Projections
 * ═══════════════════════════════════════════════════
 *
 *   • Elixir       — Erlang VM, functional
 *   • OCaml        — ML family, pattern matching
 *   • Haskell      — Pure functional (extends Monaco built-in)
 *   • Julia        — Scientific computing
 *   • Prolog       — Logic programming
 *   • Clojure      — Lisp on JVM
 *
 * @module hologram-code/language-projections/functional
 */

import { registerProjection, type LanguageProjection } from "./registry";

const elixir: LanguageProjection = {
  id: "elixir",
  name: "Elixir",
  category: "functional",
  extensions: ["ex", "exs"],
  aiPersona: "You are an expert in Elixir. Suggest idiomatic Elixir with pattern matching, pipe operators, GenServer patterns, and OTP supervision trees.",
  languageConfig: {
    comments: { lineComment: "#" },
    brackets: [["{", "}"], ["[", "]"], ["(", ")"], ["do", "end"]],
    autoClosingPairs: [
      { open: "{", close: "}" }, { open: "[", close: "]" },
      { open: "(", close: ")" }, { open: '"', close: '"' },
    ],
    surroundingPairs: [["{", "}"], ["[", "]"], ["(", ")"], ['"', '"']],
    indentationRules: {
      increaseIndentPattern: /\b(do|fn|->)\s*$/,
      decreaseIndentPattern: /^\s*(end|else|catch|rescue|after)\b/,
    },
  },
  monarchTokens: {
    defaultToken: "",
    tokenPostfix: ".ex",
    keywords: [
      "def", "defp", "defmodule", "defstruct", "defprotocol", "defimpl",
      "defmacro", "defmacrop", "defguard", "defdelegate", "defexception",
      "do", "end", "fn", "case", "cond", "when", "with",
      "if", "else", "unless", "for", "in", "quote", "unquote",
      "receive", "after", "try", "catch", "rescue", "raise",
      "import", "require", "use", "alias", "and", "or", "not",
      "true", "false", "nil", "self",
    ],
    typeKeywords: [
      "String", "Integer", "Float", "Atom", "List", "Map", "Tuple",
      "Keyword", "Boolean", "PID", "Port", "Reference", "Function",
      "GenServer", "Supervisor", "Agent", "Task", "Stream", "Enum",
    ],
    operators: ["=", "==", "===", "!=", "!==", "<", ">", "<=", ">=",
      "+", "-", "*", "/", "++", "--", "<>", "|>", "->", "<-", "\\\\",
      "::", "..", "&", "&&", "||", "!", "^", "~", "=>", "|"],
    symbols: /[=><!~?:&|+\-*/^%\\]+/,
    tokenizer: {
      root: [
        [/#.*$/, "comment"],
        [/@\w+/, "annotation"],
        [/:[a-zA-Z_]\w*[!?]?/, "constant.atom"],
        [/[A-Z]\w*/, "type.module"],
        [/[a-z_]\w*[!?]?/, { cases: { "@keywords": "keyword", "@default": "identifier" } }],
        [/~[rRsSwWcC]\//, "regexp", "@sigil"],
        [/"""/, "string", "@mlstring"],
        [/"/, "string", "@string"],
        [/'[^']*'/, "string.char"],
        [/\d[\d_]*(\.\d[\d_]*)?([eE][-+]?\d+)?/, "number"],
        [/0[xX][0-9a-fA-F_]+/, "number.hex"],
        [/0[bB][01_]+/, "number.binary"],
        [/[{}()[\]]/, "@brackets"],
        [/@symbols/, "operator"],
        [/[;,]/, "delimiter"],
      ],
      string: [[/[^\\"#]+/, "string"], [/#\{/, "string.interpolated", "@interpolation"], [/\\./, "string.escape"], [/"/, "string", "@pop"]],
      mlstring: [[/[^"#]+/, "string"], [/#\{/, "string.interpolated", "@interpolation"], [/"""/, "string", "@pop"], [/"/, "string"]],
      interpolation: [[/\}/, "string.interpolated", "@pop"], [/[^}]+/, "identifier"]],
      sigil: [[/\//, "regexp", "@pop"], [/[^/]+/, "regexp"]],
    },
  },
  snippets: [
    { label: "ex-module", insertText: "defmodule ${1:MyModule} do\n  $0\nend", detail: "Module definition" },
    { label: "ex-genserver", insertText: "defmodule ${1:MyServer} do\n  use GenServer\n\n  def start_link(init_arg) do\n    GenServer.start_link(__MODULE__, init_arg, name: __MODULE__)\n  end\n\n  @impl true\n  def init(state) do\n    {:ok, state}\n  end\n\n  @impl true\n  def handle_call(${2:request}, _from, state) do\n    {:reply, :ok, state}\n  end\nend", detail: "GenServer template" },
    { label: "ex-pipe", insertText: "${1:data}\n|> ${2:Enum.map}(fn ${3:x} -> ${4:x * 2} end)\n|> ${5:Enum.filter}(fn ${6:x} -> ${7:x > 0} end)", detail: "Pipe chain" },
  ],
};

const ocaml: LanguageProjection = {
  id: "ocaml",
  name: "OCaml",
  category: "functional",
  extensions: ["ml", "mli"],
  aiPersona: "You are an expert in OCaml. Suggest idiomatic ML code with pattern matching, algebraic data types, modules, and functors.",
  languageConfig: {
    comments: { blockComment: ["(*", "*)"] },
    brackets: [["(", ")"], ["[", "]"], ["{", "}"], ["begin", "end"]],
    autoClosingPairs: [
      { open: "(", close: ")" }, { open: "[", close: "]" },
      { open: "{", close: "}" }, { open: '"', close: '"' },
    ],
    surroundingPairs: [["(", ")"], ["[", "]"], ["{", "}"], ['"', '"']],
  },
  monarchTokens: {
    defaultToken: "",
    tokenPostfix: ".ml",
    keywords: [
      "and", "as", "assert", "begin", "class", "constraint", "do", "done",
      "downto", "else", "end", "exception", "external", "false", "for",
      "fun", "function", "functor", "if", "in", "include", "inherit",
      "initializer", "lazy", "let", "match", "method", "module", "mutable",
      "new", "object", "of", "open", "or", "private", "rec", "sig",
      "struct", "then", "to", "true", "try", "type", "val", "virtual",
      "when", "while", "with", "land", "lor", "lxor", "lsl", "lsr", "asr",
      "mod",
    ],
    typeKeywords: [
      "int", "float", "bool", "char", "string", "unit", "list", "array",
      "option", "ref", "exn", "bytes",
    ],
    operators: ["=", "<>", "<", ">", "<=", ">=", "+", "-", "*", "/",
      "::", "@", "^", "|>", "->", "<-", ";", ";;", "|", "&&", "||",
      "!", "~", "?", ":=", "**", "mod"],
    symbols: /[=><!~?:&|+\-*/^%@;]+/,
    tokenizer: {
      root: [
        [/\(\*/, "comment", "@comment"],
        [/[a-z_]\w*'?/, { cases: { "@keywords": "keyword", "@typeKeywords": "type", "@default": "identifier" } }],
        [/[A-Z]\w*/, "type.module"],
        [/'[a-z]\w*/, "type.parameter"],
        [/"([^"\\]|\\.)*"/, "string"],
        [/'[^']*'/, "string.char"],
        [/\d+(\.\d+)?([eE][-+]?\d+)?/, "number"],
        [/0[xX][0-9a-fA-F]+/, "number.hex"],
        [/[{}()[\]]/, "@brackets"],
        [/@symbols/, "operator"],
        [/[,]/, "delimiter"],
      ],
      comment: [[/[^(*]+/, "comment"], [/\*\)/, "comment", "@pop"], [/[(*]/, "comment"]],
    },
  },
  snippets: [
    { label: "ml-let", insertText: "let ${1:name} ${2:args} =\n  $0", detail: "Let binding" },
    { label: "ml-match", insertText: "match ${1:expr} with\n| ${2:pattern} -> ${3:result}\n| _ -> $0", detail: "Pattern match" },
    { label: "ml-type", insertText: "type ${1:name} =\n  | ${2:Variant1} of ${3:int}\n  | ${4:Variant2} of ${5:string}", detail: "Algebraic type" },
  ],
};

const julia: LanguageProjection = {
  id: "julia",
  name: "Julia",
  category: "scientific",
  extensions: ["jl"],
  aiPersona: "You are an expert in Julia. Suggest idiomatic Julia with multiple dispatch, broadcasting, type annotations, and performant numerical code.",
  languageConfig: {
    comments: { lineComment: "#", blockComment: ["#=", "=#"] },
    brackets: [["{", "}"], ["[", "]"], ["(", ")"]],
    autoClosingPairs: [
      { open: "{", close: "}" }, { open: "[", close: "]" },
      { open: "(", close: ")" }, { open: '"', close: '"' },
    ],
    surroundingPairs: [["{", "}"], ["[", "]"], ["(", ")"], ['"', '"']],
    indentationRules: {
      increaseIndentPattern: /\b(function|for|while|if|else|elseif|begin|let|do|module|struct|mutable|macro|try|catch|finally)\b/,
      decreaseIndentPattern: /^\s*(end|else|elseif|catch|finally)\b/,
    },
  },
  monarchTokens: {
    defaultToken: "",
    tokenPostfix: ".jl",
    keywords: [
      "function", "end", "return", "if", "elseif", "else", "for", "while",
      "in", "do", "begin", "let", "local", "global", "const",
      "struct", "mutable", "abstract", "primitive", "type", "module",
      "baremodule", "using", "import", "export", "macro",
      "try", "catch", "finally", "throw", "break", "continue",
      "true", "false", "nothing", "missing", "where", "isa",
    ],
    typeKeywords: [
      "Int", "Int8", "Int16", "Int32", "Int64", "Int128",
      "UInt", "UInt8", "UInt16", "UInt32", "UInt64", "UInt128",
      "Float16", "Float32", "Float64", "BigFloat", "BigInt",
      "Bool", "Char", "String", "Symbol", "Array", "Vector", "Matrix",
      "Tuple", "Dict", "Set", "Complex", "Rational", "Nothing", "Any",
    ],
    operators: ["=", "==", "!=", "≠", "<", ">", "<=", "≤", ">=", "≥",
      "+", "-", "*", "/", "÷", "%", "^", ".", "\\",
      "&&", "||", "!", "&", "|", "⊻", "~", "<<", ">>",
      "=>", "->", "::", "...", ".+", ".-", ".*", "./", ".^",
      "∈", "∉", "∋", "⊆", "⊂", "∩", "∪", "≈"],
    symbols: /[=><!~?:&|+\-*/^%÷∈∉∋⊆⊂∩∪≈≠≤≥⊻]+/,
    tokenizer: {
      root: [
        [/#=/, "comment", "@comment"],
        [/#.*$/, "comment"],
        [/@\w+/, "annotation"],
        [/[a-z_]\w*/, { cases: { "@keywords": "keyword", "@default": "identifier" } }],
        [/[A-Z]\w*/, { cases: { "@typeKeywords": "type", "@default": "type" } }],
        [/"""/, "string", "@mlstring"],
        [/"/, "string", "@string"],
        [/'\\.?'/, "string.char"],
        [/\d[\d_]*(\.\d[\d_]*)?([eE][-+]?\d+)?/, "number"],
        [/0[xX][0-9a-fA-F_]+/, "number.hex"],
        [/0[bB][01_]+/, "number.binary"],
        [/[{}()[\]]/, "@brackets"],
        [/@symbols/, "operator"],
        [/[;,]/, "delimiter"],
      ],
      comment: [[/[^#=]+/, "comment"], [/=#/, "comment", "@pop"], [/[#=]/, "comment"]],
      string: [[/[^\\"$]+/, "string"], [/\$\(/, "string.interpolated", "@interpolation"], [/\$\w+/, "string.interpolated"], [/\\./, "string.escape"], [/"/, "string", "@pop"]],
      mlstring: [[/[^"$]+/, "string"], [/\$\(/, "string.interpolated", "@interpolation"], [/"""/, "string", "@pop"], [/"/, "string"]],
      interpolation: [[/\)/, "string.interpolated", "@pop"], [/[^)]+/, "identifier"]],
    },
  },
  snippets: [
    { label: "jl-function", insertText: "function ${1:name}(${2:x}::${3:Int})\n    $0\nend", detail: "Typed function" },
    { label: "jl-struct", insertText: "struct ${1:Name}\n    ${2:field}::${3:Float64}\nend", detail: "Struct definition" },
  ],
};

const prolog: LanguageProjection = {
  id: "prolog",
  name: "Prolog",
  category: "functional",
  extensions: ["pl", "pro"],
  aiPersona: "You are an expert in Prolog. Suggest logic programming patterns, DCG rules, meta-interpreters, and constraint solving.",
  languageConfig: {
    comments: { lineComment: "%", blockComment: ["/*", "*/"] },
    brackets: [["(", ")"], ["[", "]"], ["{", "}"]],
    autoClosingPairs: [
      { open: "(", close: ")" }, { open: "[", close: "]" },
      { open: '"', close: '"' }, { open: "'", close: "'" },
    ],
    surroundingPairs: [["(", ")"], ["[", "]"], ['"', '"'], ["'", "'"]],
  },
  monarchTokens: {
    defaultToken: "",
    tokenPostfix: ".pl",
    keywords: [
      "is", "mod", "rem", "not", "true", "fail", "false",
      "assert", "asserta", "assertz", "retract", "abolish",
      "findall", "bagof", "setof", "forall",
      "write", "writeln", "read", "nl", "tab",
      "atom", "number", "integer", "float", "compound", "var", "nonvar",
      "functor", "arg", "copy_term", "length", "append", "member",
      "msort", "sort", "between", "succ", "plus",
      "module", "use_module", "ensure_loaded", "dynamic", "discontiguous",
    ],
    operators: [":-", "-->", "->", ";", ",", ".", "\\+", "=", "\\=",
      "==", "\\==", "=:=", "=\\=", "<", ">", "=<", ">=",
      "is", "+", "-", "*", "/", "//", "mod", "rem", "**",
      "|", "!"],
    symbols: /[=<>!+\-*/\\:;,.?|&^~]+/,
    tokenizer: {
      root: [
        [/%.*$/, "comment"],
        [/\/\*/, "comment", "@comment"],
        [/[A-Z_]\w*/, "variable"],
        [/[a-z]\w*/, { cases: { "@keywords": "keyword", "@default": "identifier" } }],
        [/'[^']*'/, "identifier.quoted"],
        [/"([^"\\]|\\.)*"/, "string"],
        [/\d+(\.\d+)?([eE][-+]?\d+)?/, "number"],
        [/[()[\]{}]/, "@brackets"],
        [/@symbols/, "operator"],
      ],
      comment: [[/[^/*]+/, "comment"], [/\*\//, "comment", "@pop"], [/[/*]/, "comment"]],
    },
  },
  snippets: [
    { label: "pl-rule", insertText: "${1:head}(${2:X}) :-\n    ${3:body}(${2:X}).", detail: "Prolog rule" },
    { label: "pl-dcg", insertText: "${1:sentence} --> ${2:noun_phrase}, ${3:verb_phrase}.", detail: "DCG rule" },
  ],
};

const clojure: LanguageProjection = {
  id: "clojure",
  name: "Clojure",
  category: "functional",
  extensions: ["clj", "cljs", "cljc", "edn"],
  aiPersona: "You are an expert in Clojure. Suggest idiomatic Clojure with persistent data structures, threading macros, transducers, and spec.",
  languageConfig: {
    comments: { lineComment: ";" },
    brackets: [["(", ")"], ["[", "]"], ["{", "}"]],
    autoClosingPairs: [
      { open: "(", close: ")" }, { open: "[", close: "]" },
      { open: "{", close: "}" }, { open: '"', close: '"' },
    ],
    surroundingPairs: [["(", ")"], ["[", "]"], ["{", "}"], ['"', '"']],
  },
  monarchTokens: {
    defaultToken: "",
    tokenPostfix: ".clj",
    keywords: [
      "def", "defn", "defn-", "defmacro", "defmethod", "defmulti",
      "defonce", "defprotocol", "defrecord", "defstruct", "deftype",
      "fn", "let", "loop", "recur", "do", "if", "if-let", "if-not",
      "when", "when-let", "when-not", "when-first", "cond", "condp",
      "case", "try", "catch", "finally", "throw",
      "for", "doseq", "dotimes", "while",
      "ns", "require", "use", "import", "refer", "in-ns",
      "quote", "unquote", "deref", "atom", "swap!", "reset!",
      "and", "or", "not", "nil", "true", "false",
      "map", "filter", "reduce", "apply", "partial", "comp",
      "first", "rest", "cons", "conj", "assoc", "dissoc", "get",
      "into", "merge", "keys", "vals", "count", "empty?",
      "str", "println", "prn", "pr-str",
    ],
    operators: ["->", "->>", "=>"],
    symbols: /[=><!+\-*/&|^~?:]+/,
    tokenizer: {
      root: [
        [/;.*$/, "comment"],
        [/:[a-zA-Z_][\w-]*/, "constant.keyword"],
        [/#"/, "regexp", "@regexp"],
        [/[a-zA-Z_][\w\-!?*/.<>=]*/, { cases: { "@keywords": "keyword", "@default": "identifier" } }],
        [/"([^"\\]|\\.)*"/, "string"],
        [/\\[a-zA-Z]+/, "string.char"],
        [/\d+(\.\d+)?([eE][-+]?\d+)?[MN]?/, "number"],
        [/0[xX][0-9a-fA-F]+/, "number.hex"],
        [/[()[\]{}]/, "@brackets"],
        [/@symbols/, "operator"],
        [/[,@^`'~]/, "delimiter"],
      ],
      regexp: [[/[^"\\]+/, "regexp"], [/\\./, "regexp.escape"], [/"/, "regexp", "@pop"]],
    },
  },
  snippets: [
    { label: "clj-defn", insertText: "(defn ${1:name}\n  \"${2:docstring}\"\n  [${3:args}]\n  $0)", detail: "Function definition" },
    { label: "clj-let", insertText: "(let [${1:x} ${2:value}]\n  $0)", detail: "Let binding" },
    { label: "clj-thread", insertText: "(->> ${1:data}\n     (${2:map} ${3:f})\n     (${4:filter} ${5:pred}))", detail: "Thread-last macro" },
  ],
};

export function registerFunctionalProjections(): void {
  registerProjection(elixir);
  registerProjection(ocaml);
  registerProjection(julia);
  registerProjection(prolog);
  registerProjection(clojure);
}
