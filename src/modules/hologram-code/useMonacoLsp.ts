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
import { initializeAllProjections, registerAllInMonaco, getRegistrySummary } from "./language-projections";

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

/**
 * Register AI Code Action Provider (lightbulb menu)
 * Shows refactor, explain, and docstring actions when code is selected.
 */
function registerAICodeActionProvider(
  monaco: Monaco,
): IDisposable {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  return monaco.languages.registerCodeActionProvider("typescript", {
    provideCodeActions(model: any, range: any) {
      // Only show when there's a non-empty selection
      const selectedText = model.getValueInRange(range);
      if (!selectedText || selectedText.trim().length < 3) {
        return { actions: [], dispose() {} };
      }

      const filePath = model.uri.path;
      const language = model.getLanguageId?.() || "typescript";

      const makeAction = (
        title: string,
        actionId: string,
        kind: string,
      ) => ({
        title,
        kind,
        diagnostics: [],
        isPreferred: actionId === "refactor",
        command: {
          id: `hologram.ai.${actionId}`,
          title,
          arguments: [{ selectedCode: selectedText, filePath, language, range, model }],
        },
      });

      return {
        actions: [
          makeAction("✨ AI: Refactor Selection", "refactor", "refactor.rewrite"),
          makeAction("💡 AI: Explain Code", "explain", "source.explain"),
          makeAction("📝 AI: Generate Docstring", "docstring", "source.docstring"),
        ],
        dispose() {},
      };
    },
  });
}

/**
 * Register editor commands for AI code actions
 */
function registerAICommands(monaco: Monaco, editorGetter: () => any): IDisposable[] {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const disposables: IDisposable[] = [];

  const callAI = async (action: string, args: any) => {
    const { selectedCode, filePath, language, range } = args;
    const editor = editorGetter();

    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/hologram-code-ai`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({ action, selectedCode, filePath, language }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Request failed" }));
        showInlineMessage(editor, monaco, range, `⚠ ${err.error || "AI request failed"}`, "warning");
        return;
      }

      const data = await resp.json();

      if (action === "refactor" && data.refactored) {
        // Apply refactored code as an edit
        editor.executeEdits("ai-refactor", [{
          range,
          text: data.refactored,
        }]);
        if (data.explanation) {
          showInlineMessage(editor, monaco, range, `✨ ${data.explanation}`, "info");
        }
      } else if (action === "explain" && data.explanation) {
        showInlineMessage(editor, monaco, range, data.explanation, "info");
      } else if (action === "docstring" && data.docstring) {
        // Insert docstring above the selection
        const insertLine = range.startLineNumber;
        const indent = editor.getModel().getLineContent(insertLine).match(/^(\s*)/)?.[1] || "";
        const docLines = data.docstring.split("\n").map((l: string) => indent + l).join("\n");
        editor.executeEdits("ai-docstring", [{
          range: {
            startLineNumber: insertLine,
            startColumn: 1,
            endLineNumber: insertLine,
            endColumn: 1,
          },
          text: docLines + "\n",
        }]);
      }
    } catch (err) {
      console.error(`AI ${action} error:`, err);
      showInlineMessage(editor, monaco, range, "⚠ AI request failed. Try again.", "warning");
    }
  };

  // Register commands that the code actions invoke
  for (const action of ["refactor", "explain", "docstring"]) {
    const d = monaco.editor.registerCommand(
      `hologram.ai.${action}`,
      (_: any, args: any) => callAI(action, args),
    );
    disposables.push(d);
  }

  return disposables;
}

/**
 * Show an inline message widget in the editor (for explain results, errors, etc.)
 */
function showInlineMessage(
  editor: any,
  monaco: any,
  range: any,
  message: string,
  type: "info" | "warning" = "info",
) {
  // Use Monaco's built-in "zone widget" pattern via content widgets
  const id = `ai-msg-${Date.now()}`;
  const bgColor = type === "warning" ? "#3d2b00" : "#1a2a3a";
  const borderColor = type === "warning" ? "#cca700" : "#3794ff";
  const textColor = type === "warning" ? "#cca700" : "#9cdcfe";

  const domNode = document.createElement("div");
  domNode.id = id;
  domNode.style.cssText = `
    background: ${bgColor};
    border: 1px solid ${borderColor};
    border-radius: 4px;
    padding: 8px 12px;
    color: ${textColor};
    font-size: 13px;
    line-height: 1.5;
    max-width: 600px;
    white-space: pre-wrap;
    word-wrap: break-word;
    font-family: 'Cascadia Code', 'Fira Code', monospace;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 100;
    position: relative;
  `;

  // Close button
  const closeBtn = document.createElement("span");
  closeBtn.textContent = "✕";
  closeBtn.style.cssText = `
    position: absolute; top: 4px; right: 8px; cursor: pointer;
    color: #858585; font-size: 12px;
  `;
  closeBtn.onclick = () => editor.removeContentWidget(widget);
  domNode.appendChild(closeBtn);

  // Message text
  const textNode = document.createElement("div");
  textNode.style.cssText = "padding-right: 16px;";
  textNode.textContent = message;
  domNode.appendChild(textNode);

  const widget = {
    getId: () => id,
    getDomNode: () => domNode,
    getPosition: () => ({
      position: { lineNumber: range.endLineNumber + 1, column: 1 },
      preference: [monaco.editor.ContentWidgetPositionPreference.BELOW],
    }),
  };

  editor.addContentWidget(widget);

  // Auto-dismiss after 12 seconds
  setTimeout(() => {
    try { editor.removeContentWidget(widget); } catch {}
  }, 12000);
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
  editorRef?: React.MutableRefObject<any>,
) {
  const disposablesRef = useRef<IDisposable[]>([]);
  const configuredRef = useRef(false);

  // Initial configuration (runs once when Monaco is available)
  const configure = useCallback((monaco: Monaco) => {
    if (configuredRef.current) return;
    configuredRef.current = true;

    configureTypeScriptDefaults(monaco);

    // Register all 24+ custom language projections (quantum, systems, web3, etc.)
    initializeAllProjections();
    registerAllInMonaco(monaco);

    const summary = getRegistrySummary();
    console.log(`⬡ Language Projection Registry: ${summary.total} languages (${summary.custom} custom across ${summary.categories.join(", ")})`);

    // Register AI completion provider for TypeScript
    const aiDisposable = registerAICompletionProvider(monaco, qfs);
    disposablesRef.current.push(aiDisposable);

    // Register AI code action provider (lightbulb menu)
    const codeActionDisposable = registerAICodeActionProvider(monaco);
    disposablesRef.current.push(codeActionDisposable);

    // Register AI commands (refactor, explain, docstring)
    const editorGetter = () => editorRef?.current;
    const cmdDisposables = registerAICommands(monaco, editorGetter);
    disposablesRef.current.push(...cmdDisposables);
  }, [qfs, editorRef]);

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
