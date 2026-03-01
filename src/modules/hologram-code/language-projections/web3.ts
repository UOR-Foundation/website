/**
 * Web3 Language Projections
 * ═══════════════════════════════════════════════════
 *
 *   • Solidity       — Ethereum smart contracts
 *   • Move           — Aptos/Sui smart contracts
 *   • Cairo          — StarkNet smart contracts
 *   • Vyper          — Pythonic Ethereum contracts
 *
 * @module hologram-code/language-projections/web3
 */

import { registerProjection, type LanguageProjection } from "./registry";

const solidity: LanguageProjection = {
  id: "solidity",
  name: "Solidity",
  category: "web3",
  extensions: ["sol"],
  aiPersona: "You are an expert in Solidity. Suggest secure smart contract patterns, gas-optimal code, OpenZeppelin imports, and proper modifier/event usage.",
  languageConfig: {
    comments: { lineComment: "//", blockComment: ["/*", "*/"] },
    brackets: [["{", "}"], ["[", "]"], ["(", ")"]],
    autoClosingPairs: [
      { open: "{", close: "}" }, { open: "[", close: "]" },
      { open: "(", close: ")" }, { open: '"', close: '"' }, { open: "'", close: "'" },
    ],
    surroundingPairs: [["{", "}"], ["[", "]"], ["(", ")"], ['"', '"'], ["'", "'"]],
  },
  monarchTokens: {
    defaultToken: "",
    tokenPostfix: ".sol",
    keywords: [
      "pragma", "solidity", "import", "contract", "interface", "library",
      "abstract", "is", "using", "for", "struct", "enum", "event", "error",
      "modifier", "function", "constructor", "fallback", "receive",
      "public", "private", "internal", "external", "pure", "view", "payable",
      "virtual", "override", "immutable", "constant", "indexed",
      "memory", "storage", "calldata", "returns", "return",
      "if", "else", "for", "while", "do", "break", "continue",
      "try", "catch", "revert", "require", "assert", "emit",
      "new", "delete", "type", "mapping", "assembly",
    ],
    typeKeywords: [
      "address", "bool", "string", "bytes", "byte",
      "int", "int8", "int16", "int32", "int64", "int128", "int256",
      "uint", "uint8", "uint16", "uint32", "uint64", "uint128", "uint256",
      "bytes1", "bytes2", "bytes4", "bytes8", "bytes16", "bytes32",
      "fixed", "ufixed",
    ],
    constants: ["true", "false", "wei", "gwei", "ether", "seconds", "minutes", "hours", "days", "weeks"],
    operators: ["=", "==", "!=", "<", ">", "<=", ">=", "+", "-", "*", "/", "%", "**",
      "&&", "||", "!", "&", "|", "^", "~", "<<", ">>", "+=", "-=", "*=", "/="],
    symbols: /[=><!~?:&|+\-*/^%]+/,
    tokenizer: {
      root: [
        [/\/\/.*$/, "comment"],
        [/\/\*/, "comment", "@comment"],
        [/msg\.\w+|block\.\w+|tx\.\w+/, "variable.predefined"],
        [/[a-zA-Z_$]\w*/, { cases: { "@keywords": "keyword", "@typeKeywords": "type", "@constants": "constant", "@default": "identifier" } }],
        [/"([^"\\]|\\.)*"/, "string"],
        [/'([^'\\]|\\.)*'/, "string"],
        [/0[xX][0-9a-fA-F]+/, "number.hex"],
        [/\d+(\.\d+)?([eE][-+]?\d+)?/, "number"],
        [/[{}()[\]]/, "@brackets"],
        [/@symbols/, "operator"],
        [/[;,.]/, "delimiter"],
      ],
      comment: [[/[^/*]+/, "comment"], [/\*\//, "comment", "@pop"], [/[/*]/, "comment"]],
    },
  },
  snippets: [
    { label: "sol-contract", insertText: '// SPDX-License-Identifier: MIT\npragma solidity ^0.8.20;\n\ncontract ${1:MyContract} {\n    $0\n}', detail: "Solidity contract" },
    { label: "sol-erc20", insertText: 'import "@openzeppelin/contracts/token/ERC20/ERC20.sol";\n\ncontract ${1:MyToken} is ERC20 {\n    constructor() ERC20("${2:Name}", "${3:SYM}") {\n        _mint(msg.sender, ${4:1000000} * 10 ** decimals());\n    }\n}', detail: "ERC-20 token" },
    { label: "sol-function", insertText: "function ${1:name}(${2:params}) ${3:public} ${4:view} returns (${5:type}) {\n    $0\n}", detail: "Function" },
    { label: "sol-event", insertText: "event ${1:Transfer}(address indexed ${2:from}, address indexed ${3:to}, uint256 ${4:value});", detail: "Event declaration" },
  ],
};

const move: LanguageProjection = {
  id: "move",
  name: "Move",
  category: "web3",
  extensions: ["move"],
  aiPersona: "You are an expert in Move (Aptos/Sui). Suggest resource-oriented patterns, ability constraints, and module design.",
  languageConfig: {
    comments: { lineComment: "//", blockComment: ["/*", "*/"] },
    brackets: [["{", "}"], ["[", "]"], ["(", ")"], ["<", ">"]],
    autoClosingPairs: [
      { open: "{", close: "}" }, { open: "(", close: ")" },
      { open: "<", close: ">" }, { open: '"', close: '"' },
    ],
    surroundingPairs: [["{", "}"], ["(", ")"], ["<", ">"], ['"', '"']],
  },
  monarchTokens: {
    defaultToken: "",
    tokenPostfix: ".move",
    keywords: [
      "module", "script", "use", "as", "public", "friend", "native",
      "fun", "struct", "has", "let", "const", "mut", "return", "abort",
      "if", "else", "while", "loop", "break", "continue",
      "move", "copy", "drop", "store", "key", "acquires",
      "address", "spec", "schema", "pragma", "assert", "assume",
      "entry", "inline", "phantom",
    ],
    typeKeywords: [
      "u8", "u16", "u32", "u64", "u128", "u256", "bool", "address",
      "vector", "signer", "string", "option", "Table", "Coin",
    ],
    constants: ["true", "false"],
    operators: ["=", "==", "!=", "<", ">", "<=", ">=", "+", "-", "*", "/", "%",
      "&&", "||", "!", "&", "&mut", "::", "=>"],
    symbols: /[=><!~?:&|+\-*/^%]+/,
    tokenizer: {
      root: [
        [/\/\/.*$/, "comment"],
        [/\/\*/, "comment", "@comment"],
        [/@[a-zA-Z_]\w*/, "annotation"],
        [/[a-z_]\w*/, { cases: { "@keywords": "keyword", "@typeKeywords": "type", "@constants": "constant", "@default": "identifier" } }],
        [/[A-Z]\w*/, "type"],
        [/"([^"\\]|\\.)*"/, "string"],
        [/0[xX][0-9a-fA-F]+/, "number.hex"],
        [/\d+/, "number"],
        [/[{}()[\]<>]/, "@brackets"],
        [/@symbols/, "operator"],
        [/[;,.]/, "delimiter"],
      ],
      comment: [[/[^/*]+/, "comment"], [/\*\//, "comment", "@pop"], [/[/*]/, "comment"]],
    },
  },
  snippets: [
    { label: "move-module", insertText: "module ${1:addr}::${2:module_name} {\n    use std::signer;\n\n    struct ${3:Resource} has key, store {\n        ${4:field}: u64,\n    }\n\n    public entry fun ${5:init}(account: &signer) {\n        $0\n    }\n}", detail: "Move module" },
  ],
};

const cairo: LanguageProjection = {
  id: "cairo",
  name: "Cairo",
  category: "web3",
  extensions: ["cairo"],
  aiPersona: "You are an expert in Cairo (StarkNet). Suggest provable computation patterns, felt252 usage, and proper contract interfaces.",
  languageConfig: {
    comments: { lineComment: "//" },
    brackets: [["{", "}"], ["[", "]"], ["(", ")"]],
    autoClosingPairs: [
      { open: "{", close: "}" }, { open: "[", close: "]" },
      { open: "(", close: ")" }, { open: "'", close: "'" },
    ],
    surroundingPairs: [["{", "}"], ["[", "]"], ["(", ")"], ["'", "'"]],
  },
  monarchTokens: {
    defaultToken: "",
    tokenPostfix: ".cairo",
    keywords: [
      "fn", "mod", "use", "struct", "enum", "trait", "impl", "of", "ref",
      "let", "mut", "const", "return", "if", "else", "match", "loop",
      "break", "continue", "type", "extern", "nopanic", "implicits",
      "self", "super", "true", "false",
      "#[contract]", "#[external]", "#[view]", "#[event]", "#[storage]",
    ],
    typeKeywords: [
      "felt252", "u8", "u16", "u32", "u64", "u128", "u256",
      "bool", "Array", "Span", "Option", "Result", "ContractAddress",
      "ClassHash", "StorageAccess", "Serde",
    ],
    operators: ["=", "==", "!=", "<", ">", "<=", ">=", "+", "-", "*", "/",
      "&&", "||", "!", "=>", "->", "::"],
    symbols: /[=><!~?:&|+\-*/^%]+/,
    tokenizer: {
      root: [
        [/\/\/.*$/, "comment"],
        [/#\[[^\]]*\]/, "annotation"],
        [/[a-z_]\w*/, { cases: { "@keywords": "keyword", "@typeKeywords": "type", "@default": "identifier" } }],
        [/[A-Z]\w*/, "type"],
        [/'([^'\\]|\\.)*'/, "string"],
        [/0[xX][0-9a-fA-F]+/, "number.hex"],
        [/\d+/, "number"],
        [/[{}()[\]]/, "@brackets"],
        [/@symbols/, "operator"],
        [/[;,.]/, "delimiter"],
      ],
    },
  },
  snippets: [
    { label: "cairo-contract", insertText: "#[starknet::contract]\nmod ${1:MyContract} {\n    #[storage]\n    struct Storage {\n        ${2:value}: felt252,\n    }\n\n    #[external(v0)]\n    fn ${3:set}(ref self: ContractState, ${4:new_value}: felt252) {\n        self.${2:value}.write(${4:new_value});\n    }\n\n    #[external(v0)]\n    fn ${5:get}(self: @ContractState) -> felt252 {\n        self.${2:value}.read()\n    }\n}", detail: "StarkNet contract" },
  ],
};

const vyper: LanguageProjection = {
  id: "vyper",
  name: "Vyper",
  category: "web3",
  extensions: ["vy"],
  aiPersona: "You are an expert in Vyper. Suggest Pythonic smart contract patterns with proper decorators and security considerations.",
  languageConfig: {
    comments: { lineComment: "#" },
    brackets: [["[", "]"], ["(", ")"]],
    autoClosingPairs: [
      { open: "[", close: "]" }, { open: "(", close: ")" },
      { open: '"', close: '"' }, { open: "'", close: "'" },
    ],
    surroundingPairs: [["[", "]"], ["(", ")"], ['"', '"'], ["'", "'"]],
    indentationRules: {
      increaseIndentPattern: /:\s*$/,
      decreaseIndentPattern: /^\s*(else|elif)\b/,
    },
  },
  monarchTokens: {
    defaultToken: "",
    tokenPostfix: ".vy",
    keywords: [
      "def", "event", "struct", "interface", "implements",
      "from", "import", "pass", "return", "raise", "assert",
      "if", "elif", "else", "for", "in", "range", "log",
      "send", "selfdestruct", "create_forwarder_to",
      "public", "private", "internal", "external", "payable",
      "nonpayable", "view", "pure", "nonreentrant", "constant",
      "self", "msg", "block", "tx",
    ],
    typeKeywords: [
      "address", "bool", "bytes32", "bytes", "String", "decimal",
      "int128", "int256", "uint256", "uint128", "uint8",
      "HashMap", "DynArray", "Bytes",
    ],
    decorators: ["@external", "@internal", "@view", "@pure", "@payable", "@nonreentrant", "@deploy"],
    constants: ["True", "False", "ZERO_ADDRESS", "MAX_UINT256", "empty"],
    symbols: /[=><!~?:&|+\-*/^%]+/,
    tokenizer: {
      root: [
        [/#.*$/, "comment"],
        [/@\w+/, "annotation"],
        [/[a-zA-Z_]\w*/, { cases: { "@keywords": "keyword", "@typeKeywords": "type", "@constants": "constant", "@default": "identifier" } }],
        [/"""/, "string", "@mlstring"],
        [/"([^"\\]|\\.)*"/, "string"],
        [/'([^'\\]|\\.)*'/, "string"],
        [/\d+(\.\d+)?/, "number"],
        [/[()[\]]/, "@brackets"],
        [/@symbols/, "operator"],
        [/[;,:]/, "delimiter"],
      ],
      mlstring: [[/[^"]+/, "string"], [/"""/, "string", "@pop"], [/"/, "string"]],
    },
  },
  snippets: [
    { label: "vyper-contract", insertText: '# @version ^0.3.10\n\n${1:owner}: public(address)\n${2:value}: public(uint256)\n\n@deploy\ndef __init__():\n    self.${1:owner} = msg.sender\n\n@external\ndef ${3:set}(${4:new_value}: uint256):\n    assert msg.sender == self.${1:owner}, "Not owner"\n    self.${2:value} = ${4:new_value}\n$0', detail: "Vyper contract" },
  ],
};

export function registerWeb3Projections(): void {
  registerProjection(solidity);
  registerProjection(move);
  registerProjection(cairo);
  registerProjection(vyper);
}
