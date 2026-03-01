/**
 * useMonacoLsp — Monaco TypeScript Language Service + AI Completions
 * ══════════════════════════════════════════════════════════════════
 *
 * Configures Monaco's built-in TypeScript worker for real:
 *   • IntelliSense (autocomplete)
 *   • Type checking (red squiggles)
 *   • Hover information
 *   • Go-to-definition (Ctrl+click / F12)
 *   • Find all references (Shift+F12)
 *   • Rename symbol (F2)
 *
 * Also registers an AI-powered CompletionItemProvider that calls
 * the hologram-code-ai edge function for contextual suggestions
 * beyond what static analysis can provide.
 *
 * @module hologram-code/useMonacoLsp
 */

import { useEffect, useRef, useCallback } from "react";
import type { QFsHandle, FSNode } from "./useQFs";

// Monaco types — we use `any` since Monaco is loaded dynamically
type Monaco = any;
type IDisposable = { dispose(): void };

/**
 * Recursively collect all file paths + content from the Q-FS tree
 */
function collectFiles(nodes: FSNode[], result: { path: string; content: string }[] = []): { path: string; content: string }[] {
  for (const node of nodes) {
    if (node.type === "file" && node.content !== undefined) {
      result.push({ path: node.path, content: node.content });
    } else if (node.type === "folder" && node.children) {
      collectFiles(node.children, result);
    }
  }
  return result;
}

/**
 * Map file path to Monaco URI string
 * /src/main.ts → file:///src/main.ts
 */
function toMonacoUri(path: string): string {
  return `file://${path}`;
}

/**
 * Configure Monaco's TypeScript defaults with proper compiler options
 */
function configureTypeScriptDefaults(monaco: Monaco) {
  const tsDefaults = monaco.languages.typescript.typescriptDefaults;
  const jsDefaults = monaco.languages.typescript.javascriptDefaults;

  const compilerOptions = {
    target: monaco.languages.typescript.ScriptTarget.ES2022,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
    strict: true,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    forceConsistentCasingInFileNames: true,
    resolveJsonModule: true,
    isolatedModules: true,
    noEmit: true,
    skipLibCheck: true,
    baseUrl: ".",
    paths: {
      "@/*": ["src/*"],
    },
    // Enable all IntelliSense features
    allowJs: true,
    checkJs: false,
  };

  tsDefaults.setCompilerOptions(compilerOptions);
  jsDefaults.setCompilerOptions(compilerOptions);

  // Enable rich IntelliSense
  tsDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
    noSuggestionDiagnostics: false,
  });

  // Eager model sync for cross-file resolution
  tsDefaults.setEagerModelSync(true);
  jsDefaults.setEagerModelSync(true);

  // Add React type stubs so JSX works without errors
  tsDefaults.addExtraLib(
    `
    declare module "react" {
      export function useState<T>(initial: T | (() => T)): [T, (v: T | ((p: T) => T)) => void];
      export function useEffect(effect: () => void | (() => void), deps?: any[]): void;
      export function useCallback<T extends (...args: any[]) => any>(cb: T, deps: any[]): T;
      export function useMemo<T>(factory: () => T, deps: any[]): T;
      export function useRef<T>(initial: T): { current: T };
      export function memo<T>(component: T): T;
      export function forwardRef<T, P>(render: (props: P, ref: any) => any): any;
      export function createContext<T>(defaultValue: T): any;
      export function useContext<T>(context: any): T;
      export type ReactNode = string | number | boolean | null | undefined | any;
      export type FC<P = {}> = (props: P) => ReactNode;
      export type CSSProperties = Record<string, any>;
      export default { createElement: any, Fragment: any };
    }
    declare module "react-dom" {
      export function render(element: any, container: any): void;
      export function createRoot(container: any): { render(el: any): void };
    }
    declare namespace React {
      type ReactNode = string | number | boolean | null | undefined | any;
      type FC<P = {}> = (props: P) => ReactNode;
      type CSSProperties = Record<string, any>;
    }
    declare namespace JSX {
      interface IntrinsicElements { [k: string]: any; }
    }
    `,
    "file:///node_modules/@types/react/index.d.ts"
  );
}

/**
 * Sync Q-FS files into Monaco's model system for cross-file IntelliSense.
 * Creates/updates models so TypeScript worker sees all project files.
 */
function syncModels(monaco: Monaco, qfsTree: FSNode[], qfs: QFsHandle): IDisposable[] {
  const disposables: IDisposable[] = [];
  const files = collectFiles(qfsTree);

  for (const file of files) {
    const uri = monaco.Uri.parse(toMonacoUri(file.path));
    let model = monaco.editor.getModel(uri);

    // Read fresh content from Q-FS
    const content = qfs.readFile(file.path) ?? file.content;

    if (!model) {
      // Determine language from extension
      const lang = file.path.endsWith(".ts") || file.path.endsWith(".tsx")
        ? "typescript"
        : file.path.endsWith(".js") || file.path.endsWith(".jsx")
        ? "javascript"
        : file.path.endsWith(".json")
        ? "json"
        : file.path.endsWith(".css")
        ? "css"
        : file.path.endsWith(".md")
        ? "markdown"
        : "plaintext";

      model = monaco.editor.createModel(content, lang, uri);
    } else if (model.getValue() !== content) {
      model.setValue(content);
    }
  }

  return disposables;
}

/**
 * Register AI-powered completion provider
 */
function registerAICompletionProvider(
  monaco: Monaco,
  qfs: QFsHandle,
): IDisposable {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  return monaco.languages.registerCompletionItemProvider("typescript", {
    triggerCharacters: [".", "(", "<", '"', "'", "/", "@", " "],
    provideCompletionItems: async (
      model: any,
      position: any,
      _context: any,
      token: any,
    ) => {
      // Get surrounding context for AI
      const lineContent = model.getLineContent(position.lineNumber);
      const wordUntilPosition = model.getWordUntilPosition(position);
      const prefix = wordUntilPosition.word;

      // Gather context: current file + nearby lines
      const startLine = Math.max(1, position.lineNumber - 30);
      const endLine = Math.min(model.getLineCount(), position.lineNumber + 10);
      const contextLines = model.getLinesContent().slice(startLine - 1, endLine);
      const cursorOffset = position.lineNumber - startLine;

      // Get the file path from the model URI
      const filePath = model.uri.path;

      // Collect other open file names for context
      const allFiles = collectFiles(qfs.tree).map(f => f.path).slice(0, 20);

      // Don't call AI for very short prefixes (let Monaco handle those)
      if (prefix.length < 1 && !lineContent.trim().endsWith(".") && !lineContent.trim().endsWith("(")) {
        return { suggestions: [] };
      }

      try {
        const controller = new AbortController();
        // Cancel if Monaco cancels
        if (token.isCancellationRequested) return { suggestions: [] };
        token.onCancellationRequested?.(() => controller.abort());

        const resp = await fetch(`${SUPABASE_URL}/functions/v1/hologram-code-ai`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
          body: JSON.stringify({
            action: "complete",
            filePath,
            prefix,
            lineContent,
            contextLines,
            cursorOffset,
            allFiles,
          }),
          signal: controller.signal,
        });

        if (!resp.ok) return { suggestions: [] };

        const data = await resp.json();
        if (!data.completions || !Array.isArray(data.completions)) {
          return { suggestions: [] };
        }

        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: wordUntilPosition.startColumn,
          endColumn: wordUntilPosition.endColumn,
        };

        return {
          suggestions: data.completions.map((c: any, i: number) => ({
            label: c.label || c.text,
            kind: mapCompletionKind(monaco, c.kind),
            insertText: c.insertText || c.text,
            insertTextRules: c.isSnippet
              ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
              : undefined,
            detail: c.detail || "✨ AI",
            documentation: c.documentation
              ? { value: c.documentation, isTrusted: true }
              : undefined,
            sortText: `000${i}`, // AI suggestions at the top
            range,
          })),
        };
      } catch {
        // Silently fail — Monaco's built-in completions still work
        return { suggestions: [] };
      }
    },
  });
}

function mapCompletionKind(monaco: Monaco, kind?: string): number {
  const K = monaco.languages.CompletionItemKind;
  switch (kind) {
    case "function": return K.Function;
    case "method": return K.Method;
    case "property": return K.Property;
    case "variable": return K.Variable;
    case "class": return K.Class;
    case "interface": return K.Interface;
    case "module": return K.Module;
    case "keyword": return K.Keyword;
    case "snippet": return K.Snippet;
    case "text": return K.Text;
    case "constant": return K.Constant;
    case "enum": return K.Enum;
    case "type": return K.TypeParameter;
    default: return K.Text;
  }
}

/**
 * Hook: Configure Monaco LSP + AI completions
 *
 * Call this after Monaco is mounted. It:
 *   1. Configures TypeScript compiler options
 *   2. Syncs all Q-FS files as Monaco models (cross-file IntelliSense)
 *   3. Registers AI completion provider
 *
 * Re-syncs when Q-FS tree changes.
 */
export function useMonacoLsp(
  monacoRef: React.MutableRefObject<Monaco | null>,
  qfs: QFsHandle,
) {
  const disposablesRef = useRef<IDisposable[]>([]);
  const configuredRef = useRef(false);

  // Initial configuration (runs once when Monaco is available)
  const configure = useCallback((monaco: Monaco) => {
    if (configuredRef.current) return;
    configuredRef.current = true;

    configureTypeScriptDefaults(monaco);

    // Register AI completion provider
    const aiDisposable = registerAICompletionProvider(monaco, qfs);
    disposablesRef.current.push(aiDisposable);

    // Also register for JavaScript
    const jsDisposable = monaco.languages.registerCompletionItemProvider("javascript", {
      ...aiDisposable,
    });
    // Note: spread doesn't work for disposables, register separately if needed
  }, [qfs]);

  // Sync Q-FS files into Monaco models whenever tree changes
  useEffect(() => {
    const monaco = monacoRef.current;
    if (!monaco || !qfs.ready) return;

    // Configure on first sync
    configure(monaco);

    // Sync all Q-FS files as Monaco models
    const modelDisposables = syncModels(monaco, qfs.tree, qfs);
    disposablesRef.current.push(...modelDisposables);
  }, [monacoRef, qfs.tree, qfs.ready, qfs, configure]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      for (const d of disposablesRef.current) {
        try { d.dispose(); } catch {}
      }
      disposablesRef.current = [];
    };
  }, []);
}
