/**
 * Language Projection Registry
 * ════════════════════════════════════════════════════════════════
 *
 * A universal language registry for Hologram Code that enables
 * every programming language — from mainstream to quantum to
 * niche — to be "projected" into the Monaco editor.
 *
 * Architecture:
 *   ┌─────────────────────────────────────────────────┐
 *   │  Language Projection Registry                   │
 *   │  ┌───────────┐  ┌───────────┐  ┌───────────┐   │
 *   │  │  Monarch   │  │  Language  │  │    AI     │   │
 *   │  │  Tokenizer │  │  Config   │  │  Persona  │   │
 *   │  └───────────┘  └───────────┘  └───────────┘   │
 *   │  ┌───────────┐  ┌───────────┐                   │
 *   │  │  Snippets  │  │  File Ext │                   │
 *   │  │  Library   │  │  Mapping  │                   │
 *   │  └───────────┘  └───────────┘                   │
 *   └─────────────────────────────────────────────────┘
 *
 * Each language projection is a self-contained unit:
 *   - Monarch grammar (syntax highlighting via state machine)
 *   - Language configuration (brackets, comments, auto-close)
 *   - Snippet library (common patterns + tab stops)
 *   - AI persona (language-specific system prompt for AI completions)
 *   - File extensions → language ID mapping
 *
 * All projections run on Q-Linux with zero external dependencies.
 * The Monarch tokenizer engine runs entirely in the browser's
 * Monaco worker thread — no server roundtrips for highlighting.
 *
 * @module hologram-code/language-projections
 */

// ── Core Types ──────────────────────────────────────────────────────────────

export interface LanguageProjection {
  /** Unique language identifier (e.g., "qasm", "solidity") */
  id: string;
  /** Human-readable name */
  name: string;
  /** Category for organization */
  category: LanguageCategory;
  /** File extensions this language handles (without dots) */
  extensions: string[];
  /** Monarch tokenizer rules */
  monarchTokens: MonarchTokensProvider;
  /** Language configuration (brackets, comments, etc.) */
  languageConfig: LanguageConfiguration;
  /** Common snippets */
  snippets?: SnippetDefinition[];
  /** AI completion persona */
  aiPersona?: string;
  /** MIME types */
  mimeTypes?: string[];
}

export type LanguageCategory =
  | "quantum"      // QASM, Q#, Cirq, Quipper
  | "systems"      // Zig, Nim, Verilog, VHDL, Assembly
  | "functional"   // Elixir, Erlang, OCaml, Haskell, Clojure
  | "web3"         // Solidity, Move, Cairo, Vyper
  | "legacy"       // COBOL, Fortran, Ada, Pascal
  | "scientific"   // Julia, R, MATLAB, Wolfram
  | "scripting"    // Tcl, AWK, Sed
  | "data"         // TOML, HCL, Protocol Buffers, GraphQL
  | "esoteric"     // Brainfuck, Whitespace
  | "general";     // Catch-all

export interface MonarchTokensProvider {
  defaultToken?: string;
  tokenPostfix?: string;
  ignoreCase?: boolean;
  keywords?: string[];
  typeKeywords?: string[];
  operators?: string[];
  symbols?: RegExp;
  escapes?: RegExp;
  tokenizer: Record<string, any[]>;
  [key: string]: any;
}

export interface LanguageConfiguration {
  comments?: {
    lineComment?: string;
    blockComment?: [string, string];
  };
  brackets?: [string, string][];
  autoClosingPairs?: { open: string; close: string; notIn?: string[] }[];
  surroundingPairs?: [string, string][];
  folding?: {
    markers?: {
      start?: RegExp;
      end?: RegExp;
    };
  };
  indentationRules?: {
    increaseIndentPattern?: RegExp;
    decreaseIndentPattern?: RegExp;
  };
  wordPattern?: RegExp;
}

export interface SnippetDefinition {
  label: string;
  insertText: string;
  detail?: string;
  documentation?: string;
}

// ── Registry ────────────────────────────────────────────────────────────────

const _projections = new Map<string, LanguageProjection>();
const _extensionMap = new Map<string, string>(); // ext → languageId

/**
 * Register a language projection into the registry.
 * Idempotent — re-registering updates the projection.
 */
export function registerProjection(projection: LanguageProjection): void {
  _projections.set(projection.id, projection);
  for (const ext of projection.extensions) {
    _extensionMap.set(ext, projection.id);
  }
}

/**
 * Get a projection by language ID
 */
export function getProjection(id: string): LanguageProjection | undefined {
  return _projections.get(id);
}

/**
 * Look up language ID from a file extension
 */
export function getLanguageForExtension(ext: string): string | undefined {
  return _extensionMap.get(ext.toLowerCase());
}

/**
 * Get all registered projections
 */
export function getAllProjections(): LanguageProjection[] {
  return Array.from(_projections.values());
}

/**
 * Get projections filtered by category
 */
export function getProjectionsByCategory(category: LanguageCategory): LanguageProjection[] {
  return getAllProjections().filter(p => p.category === category);
}

/**
 * Resolve language from a filename, checking custom projections first,
 * then falling back to Monaco built-in languages.
 */
export function resolveLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const custom = _extensionMap.get(ext);
  if (custom) return custom;

  // Fall back to Monaco's built-in language detection
  const builtInMap: Record<string, string> = {
    ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
    py: "python", rs: "rust", go: "go", c: "c", cpp: "cpp", h: "c",
    cs: "csharp", java: "java", rb: "ruby", php: "php", swift: "swift",
    kt: "kotlin", scala: "scala", r: "r", lua: "lua", dart: "dart",
    sql: "sql", html: "html", css: "css", scss: "scss", less: "less",
    json: "json", xml: "xml", yaml: "yaml", yml: "yaml", md: "markdown",
    sh: "shell", bash: "shell", ps1: "powershell", bat: "bat",
    pl: "perl", m: "objective-c", mm: "objective-c", fs: "fsharp",
    clj: "clojure", coffee: "coffeescript", dockerfile: "dockerfile",
    graphql: "graphql", ini: "ini", toml: "ini", tex: "latex",
    makefile: "makefile", diff: "diff", gitignore: "plaintext",
  };
  return builtInMap[ext] ?? "plaintext";
}

/**
 * Register all language projections into Monaco.
 * Called once during editor initialization.
 */
export function registerAllInMonaco(monaco: any): void {
  for (const proj of _projections.values()) {
    // Register the language
    monaco.languages.register({
      id: proj.id,
      extensions: proj.extensions.map(e => `.${e}`),
      mimeTypes: proj.mimeTypes,
    });

    // Set language configuration
    monaco.languages.setLanguageConfiguration(proj.id, proj.languageConfig);

    // Set Monarch tokenizer
    monaco.languages.setMonarchTokensProvider(proj.id, proj.monarchTokens);

    // Register snippets as completion items
    if (proj.snippets?.length) {
      monaco.languages.registerCompletionItemProvider(proj.id, {
        provideCompletionItems: (_model: any, _position: any) => ({
          suggestions: proj.snippets!.map((s) => ({
            label: s.label,
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: s.insertText,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: s.detail ?? `${proj.name} snippet`,
            documentation: s.documentation,
          })),
        }),
      });
    }
  }
}

/**
 * Get language count summary for the status bar
 */
export function getRegistrySummary(): { total: number; custom: number; categories: string[] } {
  const categories = new Set<string>();
  for (const p of _projections.values()) categories.add(p.category);
  return {
    total: _projections.size + 70, // ~70 Monaco built-in
    custom: _projections.size,
    categories: Array.from(categories),
  };
}
