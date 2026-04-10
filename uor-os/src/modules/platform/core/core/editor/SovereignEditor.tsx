/**
 * SovereignEditor — Lexical-powered text editor for the sovereign OS.
 *
 * Replaces raw <textarea> with Meta's Lexical engine:
 * - 3ms keystroke latency (immutable EditorState, no DOM reads on keypress)
 * - 9KB gzipped, fully offline, zero network dependencies
 * - Plugin architecture for wiki-links, hashtags, mentions, markdown
 */

import { useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getRoot,
  $createParagraphNode,
  $createTextNode,
  COMMAND_PRIORITY_LOW,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_TAB_COMMAND,
  $getSelection,
  $isRangeSelection,
  type EditorState,
  type LexicalEditor,
} from "lexical";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────

export interface SovereignEditorHandle {
  focus: () => void;
  clear: () => void;
  getText: () => string;
  setText: (text: string) => void;
  getEditor: () => LexicalEditor | null;
}

interface SovereignEditorProps {
  /** Initial / controlled value (plain text) */
  value?: string;
  /** Called on content change with plain text */
  onChange?: (text: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Auto focus on mount */
  autoFocus?: boolean;
  /** Additional class for the content editable */
  className?: string;
  /** Wrapper class */
  wrapperClassName?: string;
  /** Intercept key events before Lexical */
  onKeyDown?: (e: React.KeyboardEvent) => void;
  /** Called on Enter (without shift). Return true to prevent default newline */
  onEnter?: () => boolean | void;
  /** Called on Escape */
  onEscape?: () => void;
  /** Called on Tab. delta = 1 for tab, -1 for shift+tab */
  onTab?: (delta: number) => void;
  /** Single-line mode (Enter submits instead of newline) */
  singleLine?: boolean;
  /** Whether the editor is disabled */
  disabled?: boolean;
  /** Debounce interval for onChange in ms (0 = immediate) */
  debounceMs?: number;
  /** Monospace font */
  mono?: boolean;
  /** Min height CSS */
  minHeight?: string;
}

// ── Internal: Sync external value into editor ──────────────────

function ValueSyncPlugin({ value }: { value?: string }) {
  const [editor] = useLexicalComposerContext();
  const lastExternalValue = useRef(value);

  useEffect(() => {
    if (value === undefined || value === lastExternalValue.current) return;
    lastExternalValue.current = value;

    editor.update(() => {
      const root = $getRoot();
      const currentText = root.getTextContent();
      if (currentText === value) return;

      root.clear();
      const lines = value.split("\n");
      for (const line of lines) {
        const p = $createParagraphNode();
        if (line) p.append($createTextNode(line));
        root.append(p);
      }
    }, { tag: "external-sync" });
  }, [value, editor]);

  return null;
}

// ── Internal: Auto-focus plugin ────────────────────────────────

function AutoFocusPlugin() {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    editor.focus();
  }, [editor]);
  return null;
}

// ── Internal: Key command plugin ───────────────────────────────

function KeyCommandPlugin({
  onEnter,
  onEscape,
  onTab,
  singleLine,
  onKeyDown,
}: Pick<SovereignEditorProps, "onEnter" | "onEscape" | "onTab" | "singleLine" | "onKeyDown">) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const removers: (() => void)[] = [];

    removers.push(
      editor.registerCommand(
        KEY_ENTER_COMMAND,
        (event) => {
          if (event?.shiftKey) return false; // allow shift+enter newline
          if (onEnter) {
            const handled = onEnter();
            if (handled !== false) {
              event?.preventDefault();
              return true;
            }
          }
          if (singleLine) {
            event?.preventDefault();
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );

    removers.push(
      editor.registerCommand(
        KEY_ESCAPE_COMMAND,
        () => {
          onEscape?.();
          return !!onEscape;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );

    if (onTab) {
      removers.push(
        editor.registerCommand(
          KEY_TAB_COMMAND,
          (event) => {
            event?.preventDefault();
            onTab(event?.shiftKey ? -1 : 1);
            return true;
          },
          COMMAND_PRIORITY_LOW,
        ),
      );
    }

    return () => removers.forEach((r) => r());
  }, [editor, onEnter, onEscape, onTab, singleLine]);

  // Native keydown passthrough for external handlers
  useEffect(() => {
    if (!onKeyDown) return;
    const root = editor.getRootElement();
    if (!root) return;
    const handler = (e: KeyboardEvent) => {
      onKeyDown(e as unknown as React.KeyboardEvent);
    };
    root.addEventListener("keydown", handler, { capture: true });
    return () => root.removeEventListener("keydown", handler, { capture: true });
  }, [editor, onKeyDown]);

  return null;
}

// ── Internal: Imperative handle bridge ─────────────────────────

function EditorBridge({ editorRef }: { editorRef: React.MutableRefObject<LexicalEditor | null> }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    editorRef.current = editor;
    return () => { editorRef.current = null; };
  }, [editor, editorRef]);
  return null;
}

// ── Main component ─────────────────────────────────────────────

const SovereignEditor = forwardRef<SovereignEditorHandle, SovereignEditorProps>(
  (
    {
      value,
      onChange,
      placeholder = "Type here…",
      autoFocus = false,
      className,
      wrapperClassName,
      onKeyDown,
      onEnter,
      onEscape,
      onTab,
      singleLine = false,
      disabled = false,
      debounceMs = 0,
      mono = false,
      minHeight,
    },
    ref,
  ) => {
    const editorRef = useRef<LexicalEditor | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastEmittedRef = useRef(value);

    useImperativeHandle(ref, () => ({
      focus: () => editorRef.current?.focus(),
      clear: () => {
        editorRef.current?.update(() => {
          const root = $getRoot();
          root.clear();
          root.append($createParagraphNode());
        });
      },
      getText: () => {
        let text = "";
        editorRef.current?.getEditorState().read(() => {
          text = $getRoot().getTextContent();
        });
        return text;
      },
      setText: (text: string) => {
        editorRef.current?.update(() => {
          const root = $getRoot();
          root.clear();
          const lines = text.split("\n");
          for (const line of lines) {
            const p = $createParagraphNode();
            if (line) p.append($createTextNode(line));
            root.append(p);
          }
        });
      },
      getEditor: () => editorRef.current,
    }));

    const handleChange = useCallback(
      (editorState: EditorState) => {
        if (!onChange) return;
        editorState.read(() => {
          const text = $getRoot().getTextContent();
          if (text === lastEmittedRef.current) return;
          lastEmittedRef.current = text;

          if (debounceMs > 0) {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => onChange(text), debounceMs);
          } else {
            onChange(text);
          }
        });
      },
      [onChange, debounceMs],
    );

    useEffect(() => {
      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
      };
    }, []);

    const initialConfig = {
      namespace: "SovereignEditor",
      onError: (error: Error) => console.error("[SovereignEditor]", error),
      editable: !disabled,
      editorState: () => {
        const root = $getRoot();
        if (value) {
          const lines = value.split("\n");
          for (const line of lines) {
            const p = $createParagraphNode();
            if (line) p.append($createTextNode(line));
            root.append(p);
          }
        }
      },
    };

    return (
      <LexicalComposer initialConfig={initialConfig}>
        <div className={cn("relative", wrapperClassName)}>
          <PlainTextPlugin
            contentEditable={
              <ContentEditable
                className={cn(
                  "outline-none resize-none w-full text-sm leading-relaxed",
                  mono && "font-mono",
                  disabled && "opacity-40 pointer-events-none",
                  className,
                )}
                style={minHeight ? { minHeight } : undefined}
                spellCheck={!mono}
              />
            }
            placeholder={
              <div
                className={cn(
                  "absolute top-0 left-0 pointer-events-none select-none text-sm leading-relaxed",
                  "text-muted-foreground/30",
                  mono && "font-mono",
                )}
                style={minHeight ? { minHeight } : undefined}
              >
                {placeholder}
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <OnChangePlugin onChange={handleChange} ignoreSelectionChange />
          <HistoryPlugin />
          <ValueSyncPlugin value={value} />
          <EditorBridge editorRef={editorRef} />
          <KeyCommandPlugin
            onEnter={onEnter}
            onEscape={onEscape}
            onTab={onTab}
            singleLine={singleLine}
            onKeyDown={onKeyDown}
          />
          {autoFocus && <AutoFocusPlugin />}
        </div>
      </LexicalComposer>
    );
  },
);

SovereignEditor.displayName = "SovereignEditor";

export default SovereignEditor;
