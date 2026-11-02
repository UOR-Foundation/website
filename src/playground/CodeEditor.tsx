import Editor, { loader, type OnMount } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker.js?worker";
import JsonWorker from "monaco-editor/esm/vs/language/json/json.worker.js?worker";
import TsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker.js?worker";

self.MonacoEnvironment = { getWorker(_id, label) { return label === "json" ? new JsonWorker() : label === "typescript" || label === "javascript" ? new TsWorker() : new EditorWorker(); } };
loader.config({ monaco });

export default function CodeEditor({ filename, value, onChange, onRun }: { filename: string; value: string; onChange: (value: string) => void; onRun: () => void }) {
  const mount: OnMount = (editor, api) => {
    const theme = getComputedStyle(document.querySelector(".playground") ?? document.documentElement);
    const color = (token: string) => theme.getPropertyValue(token).trim();
    api.editor.defineTheme("prism-graphite", {
      base: "vs-dark", inherit: true,
      rules: [{ token: "comment", foreground: color("--pg-syntax-comment").slice(1) }, { token: "keyword", foreground: color("--pg-syntax-keyword").slice(1) }, { token: "string", foreground: color("--pg-syntax-string").slice(1) }, { token: "number", foreground: color("--pg-syntax-number").slice(1) }],
      colors: { "editor.background": color("--pg-editor"), "editor.foreground": color("--pg-text"), "editorLineNumber.foreground": color("--pg-muted"), "editor.selectionBackground": color("--pg-selection"), "editor.lineHighlightBackground": color("--pg-surface"), "editorWidget.background": color("--pg-surface") },
    });
    api.editor.setTheme("prism-graphite");
    api.languages.typescript.typescriptDefaults.setCompilerOptions({ target: api.languages.typescript.ScriptTarget.ESNext, module: api.languages.typescript.ModuleKind.ESNext, moduleResolution: api.languages.typescript.ModuleResolutionKind.NodeJs, allowNonTsExtensions: true, strict: true });
    api.languages.typescript.typescriptDefaults.addExtraLib(`declare module 'prism-code' {
      export interface CanonicalizeOptions { eol?: '\\n' | '\\r\\n'; stripTrailingWhitespace?: boolean; finalNewline?: boolean; stripBom?: boolean; }
      export interface HashOptions extends CanonicalizeOptions { algorithm?: string; canonical?: boolean; prefix?: boolean; }
      export function canonicalize(source: string, options?: CanonicalizeOptions): string;
      export function codeHash(source: string, options?: HashOptions): string;
      export function describe(source: string, options?: HashOptions): { bytes: number; lines: number; eol: 'lf' | 'crlf' | 'mixed' | 'none'; hadBom: boolean; finalNewline: boolean; hash: string };
      export function differs(a: string, b: string, options?: CanonicalizeOptions): boolean;
    }`, "file:///node_modules/@types/prism-code/index.d.ts");
    editor.addCommand(api.KeyMod.CtrlCmd | api.KeyCode.Enter, onRun);
  };
  return <Editor path={filename} language={filename.endsWith(".json") ? "json" : filename.endsWith(".js") ? "javascript" : filename.endsWith(".md") ? "markdown" : "typescript"} value={value} onChange={(next) => onChange(next ?? "")} onMount={mount} loading={<span className="pg-loading">Loading editor…</span>} options={{ fontFamily: "JetBrains Mono, monospace", fontSize: 14, lineHeight: 25, minimap: { enabled: false }, padding: { top: 22, bottom: 22 }, scrollBeyondLastLine: false, automaticLayout: true, tabSize: 2, wordWrap: "on", renderLineHighlight: "line", overviewRulerLanes: 0, hideCursorInOverviewRuler: true, bracketPairColorization: { enabled: false }, stickyScroll: { enabled: false } }} />;
}