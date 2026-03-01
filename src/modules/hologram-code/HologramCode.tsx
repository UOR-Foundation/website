/**
 * Hologram Code — VS Code-class Editor Projection
 * ═════════════════════════════════════════════════
 *
 * A pixel-perfect VS Code experience running natively on Q-Linux.
 * Built on Monaco Editor (the actual VS Code editor engine).
 *
 * Architecture:
 *   ┌─────────┬────────────────────────────────┐
 *   │Activity │  Tab Bar                       │
 *   │  Bar    ├────────────────────────────────┤
 *   │  48px   │  Monaco Editor                 │
 *   │         │  (syntax, intellisense, mini)  │
 *   │         ├────────────────────────────────┤
 *   │         │  Terminal Panel (collapsible)   │
 *   ├─────────┴────────────────────────────────┤
 *   │  Status Bar                              │
 *   └─────────────────────────────────────────-┘
 *
 * @module hologram-code/HologramCode
 */

import React, { useState, useCallback, useEffect, useRef, useMemo, memo } from "react";
import Editor, { type OnMount, type BeforeMount } from "@monaco-editor/react";
// Monaco editor type - use any for the editor instance to avoid type resolution issues
type MonacoEditor = any;
import {
  Files, Search, GitBranch, Bug, Blocks, Settings,
  ChevronRight, ChevronDown, X, Plus, MoreHorizontal,
  Terminal as TerminalIcon, PanelBottom, Bell,
  FileText, FileCode, FileJson, FileType, Image as ImageIcon,
  Folder, FolderOpen, SplitSquareVertical, Play, RotateCcw,
  Command, HardDrive, FilePlus, FolderPlus, Trash2,
} from "lucide-react";
import { useQFs, type FSNode } from "./useQFs";
import { useMonacoLsp } from "./useMonacoLsp";
import { resolveLanguage, getRegistrySummary } from "./language-projections";

// ── VS Code Dark+ Color Tokens ──────────────────────────────────────────────
const C = {
  bg:           "#1e1e1e",
  editorBg:     "#1e1e1e",
  sidebarBg:    "#252526",
  activityBg:   "#333333",
  activityIcon: "#858585",
  activityActive:"#ffffff",
  activityBorder:"#007acc",
  tabBg:        "#2d2d2d",
  tabActiveBg:  "#1e1e1e",
  tabBorder:    "#252526",
  statusBg:     "#007acc",
  statusText:   "#ffffff",
  titleBg:      "#323233",
  text:         "#cccccc",
  textMuted:    "#858585",
  textDim:      "#6a6a6a",
  border:       "#3c3c3c",
  scrollbar:    "#424242",
  selection:    "#264f78",
  findMatch:    "#515c6a",
  accent:       "#007acc",
  error:        "#f14c4c",
  warning:      "#cca700",
  info:         "#3794ff",
  success:      "#89d185",
  lineNumber:   "#858585",
  panelBg:      "#1e1e1e",
  panelBorder:  "#2b2b2b",
  inputBg:      "#3c3c3c",
  inputBorder:  "#3c3c3c",
  listHover:    "#2a2d2e",
  listActive:   "#37373d",
  breadcrumb:   "#a9a9a9",
} as const;

// ── File icon mapping ───────────────────────────────────────────────────────
function getFileIcon(name: string) {
  if (name.endsWith(".ts") || name.endsWith(".tsx")) return <FileCode size={14} style={{ color: "#519aba" }} />;
  if (name.endsWith(".js") || name.endsWith(".jsx")) return <FileCode size={14} style={{ color: "#cbcb41" }} />;
  if (name.endsWith(".json")) return <FileJson size={14} style={{ color: "#cbcb41" }} />;
  if (name.endsWith(".css") || name.endsWith(".scss")) return <FileType size={14} style={{ color: "#519aba" }} />;
  if (name.endsWith(".md")) return <FileText size={14} style={{ color: "#519aba" }} />;
  if (name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".svg")) return <ImageIcon size={14} style={{ color: "#a074c4" }} />;
  return <FileText size={14} style={{ color: C.textMuted }} />;
}

function getLanguage(name: string): string {
  return resolveLanguage(name);
}

// FSNode type is now imported from useQFs

// ── Activity Bar ────────────────────────────────────────────────────────────

type ActivityItem = "explorer" | "search" | "git" | "debug" | "extensions";

const ACTIVITY_ITEMS: { id: ActivityItem; icon: React.ElementType; label: string }[] = [
  { id: "explorer",   icon: Files,     label: "Explorer" },
  { id: "search",     icon: Search,    label: "Search" },
  { id: "git",        icon: GitBranch, label: "Source Control" },
  { id: "debug",      icon: Bug,       label: "Run & Debug" },
  { id: "extensions", icon: Blocks,    label: "Extensions" },
];

const ActivityBar = memo(function ActivityBar({
  active,
  onSelect,
}: {
  active: ActivityItem | null;
  onSelect: (id: ActivityItem) => void;
}) {
  return (
    <div
      className="flex flex-col items-center shrink-0"
      style={{
        width: 48,
        background: C.activityBg,
        borderRight: `1px solid ${C.border}`,
      }}
    >
      {ACTIVITY_ITEMS.map(({ id, icon: Icon, label }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            onClick={() => onSelect(id)}
            title={label}
            className="relative w-12 h-12 flex items-center justify-center transition-colors"
            style={{
              color: isActive ? C.activityActive : C.activityIcon,
            }}
            onMouseEnter={(e) => {
              if (!isActive) e.currentTarget.style.color = C.text;
            }}
            onMouseLeave={(e) => {
              if (!isActive) e.currentTarget.style.color = C.activityIcon;
            }}
          >
            {isActive && (
              <div
                className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-6 rounded-r"
                style={{ background: C.activityBorder }}
              />
            )}
            <Icon size={22} strokeWidth={1.4} />
          </button>
        );
      })}

      <div className="flex-1" />

      <button
        className="w-12 h-12 flex items-center justify-center"
        style={{ color: C.activityIcon }}
        title="Settings"
        onMouseEnter={(e) => { e.currentTarget.style.color = C.text; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = C.activityIcon; }}
      >
        <Settings size={22} strokeWidth={1.4} />
      </button>
    </div>
  );
});

// ── Context Menu ────────────────────────────────────────────────────────────

interface ContextMenuState {
  x: number;
  y: number;
  targetPath: string;
  targetIsFolder: boolean;
}

const ExplorerContextMenu = memo(function ExplorerContextMenu({
  menu,
  onNewFile,
  onNewFolder,
  onDelete,
  onClose,
}: {
  menu: ContextMenuState;
  onNewFile: (parentPath: string) => void;
  onNewFolder: (parentPath: string) => void;
  onDelete: (path: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const parentPath = menu.targetIsFolder ? menu.targetPath : menu.targetPath.replace(/\/[^/]+$/, "") || "/";

  const items = [
    { label: "New File…", icon: FilePlus, action: () => { onNewFile(parentPath); onClose(); } },
    { label: "New Folder…", icon: FolderPlus, action: () => { onNewFolder(parentPath); onClose(); } },
    null, // separator
    { label: "Delete", icon: Trash2, action: () => { onDelete(menu.targetPath); onClose(); }, danger: true },
  ];

  return (
    <div
      ref={ref}
      className="fixed z-[9999] min-w-[160px] rounded-md py-1 shadow-xl"
      style={{
        left: menu.x,
        top: menu.y,
        background: "#2d2d30",
        border: `1px solid ${C.border}`,
      }}
    >
      {items.map((item, i) =>
        item === null ? (
          <div key={`sep-${i}`} className="my-1 mx-2" style={{ height: 1, background: C.border }} />
        ) : (
          <button
            key={item.label}
            className="w-full flex items-center gap-2 px-3 py-[5px] text-[13px] text-left transition-colors"
            style={{ color: (item as any).danger ? C.error : C.text }}
            onClick={item.action}
            onMouseEnter={(e) => (e.currentTarget.style.background = C.listHover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <item.icon size={14} />
            {item.label}
          </button>
        ),
      )}
    </div>
  );
});

// ── Inline Name Input ──────────────────────────────────────────────────────

const InlineNameInput = memo(function InlineNameInput({
  depth,
  type,
  onSubmit,
  onCancel,
}: {
  depth: number;
  type: "file" | "folder";
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const commit = () => {
    const name = value.trim();
    if (name) onSubmit(name);
    else onCancel();
  };

  return (
    <div
      className="flex items-center gap-1 text-[13px] leading-[22px]"
      style={{ paddingLeft: depth * 12 + 8, paddingRight: 8 }}
    >
      <span style={{ width: 14 }} />
      {type === "folder" ? (
        <Folder size={14} style={{ color: "#dcb67a" }} />
      ) : (
        <FileText size={14} style={{ color: C.textMuted }} />
      )}
      <input
        ref={inputRef}
        className="flex-1 ml-1 bg-transparent outline-none text-[13px]"
        style={{
          color: C.text,
          border: `1px solid ${C.accent}`,
          borderRadius: 2,
          padding: "0 4px",
          lineHeight: "20px",
        }}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") onCancel();
        }}
        onBlur={commit}
        placeholder={type === "folder" ? "folder name" : "filename.ext"}
      />
    </div>
  );
});

// ── File Explorer ───────────────────────────────────────────────────────────

const FileTreeNode = memo(function FileTreeNode({
  node,
  depth,
  onSelect,
  activeFile,
  onContextMenu,
  inlineCreate,
  onInlineSubmit,
  onInlineCancel,
}: {
  node: FSNode;
  depth: number;
  onSelect: (node: FSNode) => void;
  activeFile: string | null;
  onContextMenu: (e: React.MouseEvent, node: FSNode) => void;
  inlineCreate: { parentPath: string; type: "file" | "folder" } | null;
  onInlineSubmit: (name: string) => void;
  onInlineCancel: () => void;
}) {
  const [expanded, setExpanded] = useState(depth === 0);
  const isFolder = node.type === "folder";
  const isActive = activeFile === node.path;

  // Auto-expand folder when creating inside it
  useEffect(() => {
    if (inlineCreate && isFolder && inlineCreate.parentPath === node.path) {
      setExpanded(true);
    }
  }, [inlineCreate, isFolder, node.path]);

  return (
    <div>
      <button
        className="w-full flex items-center gap-1 text-left text-[13px] leading-[22px] select-none"
        style={{
          paddingLeft: depth * 12 + 8,
          paddingRight: 8,
          color: isActive ? C.text : C.textMuted,
          background: isActive ? C.listActive : "transparent",
        }}
        onClick={() => {
          if (isFolder) setExpanded(!expanded);
          else onSelect(node);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          onContextMenu(e, node);
        }}
        onMouseEnter={(e) => {
          if (!isActive) e.currentTarget.style.background = C.listHover;
        }}
        onMouseLeave={(e) => {
          if (!isActive) e.currentTarget.style.background = isActive ? C.listActive : "transparent";
        }}
      >
        {isFolder ? (
          expanded ? <ChevronDown size={14} style={{ color: C.textDim }} /> : <ChevronRight size={14} style={{ color: C.textDim }} />
        ) : (
          <span style={{ width: 14 }} />
        )}
        {isFolder ? (
          expanded ? <FolderOpen size={14} style={{ color: "#dcb67a" }} /> : <Folder size={14} style={{ color: "#dcb67a" }} />
        ) : (
          getFileIcon(node.name)
        )}
        <span className="ml-1 truncate">{node.name}</span>
      </button>
      {isFolder && expanded && (
        <>
          {inlineCreate && inlineCreate.parentPath === node.path && (
            <InlineNameInput
              depth={depth + 1}
              type={inlineCreate.type}
              onSubmit={onInlineSubmit}
              onCancel={onInlineCancel}
            />
          )}
          {node.children?.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              onSelect={onSelect}
              activeFile={activeFile}
              onContextMenu={onContextMenu}
              inlineCreate={inlineCreate}
              onInlineSubmit={onInlineSubmit}
              onInlineCancel={onInlineCancel}
            />
          ))}
        </>
      )}
    </div>
  );
});

// ── Tab Bar ─────────────────────────────────────────────────────────────────

interface OpenFile {
  path: string;
  name: string;
  content: string;
  language: string;
  modified: boolean;
}

const TabBar = memo(function TabBar({
  files,
  activeFile,
  onSelect,
  onClose,
}: {
  files: OpenFile[];
  activeFile: string | null;
  onSelect: (path: string) => void;
  onClose: (path: string) => void;
}) {
  if (files.length === 0) return null;

  return (
    <div
      className="flex items-end overflow-x-auto shrink-0"
      style={{
        background: C.tabBorder,
        height: 35,
        scrollbarWidth: "none",
      }}
    >
      {files.map((f) => {
        const isActive = f.path === activeFile;
        return (
          <div
            key={f.path}
            className="flex items-center gap-1.5 shrink-0 cursor-pointer group/tab select-none"
            style={{
              height: 35,
              padding: "0 12px",
              background: isActive ? C.tabActiveBg : C.tabBg,
              borderRight: `1px solid ${C.tabBorder}`,
              borderTop: isActive ? `1px solid ${C.accent}` : "1px solid transparent",
              color: isActive ? C.text : C.textMuted,
              fontSize: 13,
            }}
            onClick={() => onSelect(f.path)}
          >
            {getFileIcon(f.name)}
            <span>{f.name}</span>
            {f.modified && (
              <span style={{ color: C.text, fontSize: 18, lineHeight: 1 }}>●</span>
            )}
            <button
              className="ml-1 rounded opacity-0 group-hover/tab:opacity-100 hover:bg-white/10 p-0.5 transition-opacity"
              onClick={(e) => { e.stopPropagation(); onClose(f.path); }}
              style={{ color: C.textMuted }}
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
});

// ── Status Bar ──────────────────────────────────────────────────────────────

const StatusBar = memo(function StatusBar({
  line,
  col,
  language,
  encoding,
  fsStats,
  errorCount = 0,
  warningCount = 0,
  onProblemsClick,
}: {
  line: number;
  col: number;
  language: string;
  encoding: string;
  fsStats?: { totalFiles: number; totalBytes: number; journalLength: number };
  errorCount?: number;
  warningCount?: number;
  onProblemsClick?: () => void;
}) {
  return (
    <div
      className="flex items-center justify-between shrink-0 select-none"
      style={{
        height: 22,
        background: C.statusBg,
        color: C.statusText,
        fontSize: 12,
        padding: "0 8px",
      }}
    >
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1">
          <GitBranch size={12} />
          <span>main</span>
        </span>
        <span className="flex items-center gap-1">
          <RotateCcw size={11} />
          <span>0</span>
        </span>
        <button
          className="flex items-center gap-2 hover:bg-white/10 px-1 rounded cursor-pointer"
          onClick={onProblemsClick}
          title="Toggle Problems"
        >
          <span className="flex items-center gap-0.5" style={{ color: errorCount > 0 ? "#f14c4c" : C.statusText }}>
            <span style={{ fontSize: 13 }}>✕</span>
            <span>{errorCount}</span>
          </span>
          <span className="flex items-center gap-0.5" style={{ color: warningCount > 0 ? "#cca700" : C.statusText }}>
            <span>⚠</span>
            <span>{warningCount}</span>
          </span>
        </button>
        {fsStats && (
          <span className="flex items-center gap-1 opacity-80" title="Q-FS Merkle DAG">
            <HardDrive size={11} />
            <span>{fsStats.totalFiles} files · {(fsStats.totalBytes / 1024).toFixed(1)}KB · {fsStats.journalLength} ops</span>
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span>Ln {line}, Col {col}</span>
        <span>Spaces: 2</span>
        <span>{encoding}</span>
        <span>{language}</span>
        <span className="flex items-center gap-1">
          <Bell size={11} />
        </span>
      </div>
    </div>
  );
});

// ── Breadcrumbs ─────────────────────────────────────────────────────────────

const Breadcrumbs = memo(function Breadcrumbs({ path }: { path: string }) {
  const parts = path.split("/");
  return (
    <div
      className="flex items-center gap-0.5 shrink-0 overflow-x-auto select-none"
      style={{
        height: 22,
        padding: "0 12px",
        background: C.editorBg,
        fontSize: 12,
        color: C.breadcrumb,
        scrollbarWidth: "none",
      }}
    >
      {parts.map((p, i) => (
        <React.Fragment key={i}>
          {i > 0 && <ChevronRight size={12} style={{ color: C.textDim, flexShrink: 0 }} />}
          <span className="hover:underline cursor-pointer whitespace-nowrap">{p}</span>
        </React.Fragment>
      ))}
    </div>
  );
});

// ── Command Palette ─────────────────────────────────────────────────────────

const CommandPalette = memo(function CommandPalette({
  open,
  onClose,
  onAction,
}: {
  open: boolean;
  onClose: () => void;
  onAction: (action: string) => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const commands = useMemo(() => [
    { id: "format", label: "Format Document", shortcut: "Shift+Alt+F" },
    { id: "palette", label: "Show All Commands", shortcut: "" },
    { id: "toggleMinimap", label: "Toggle Minimap", shortcut: "" },
    { id: "toggleWordWrap", label: "Toggle Word Wrap", shortcut: "Alt+Z" },
    { id: "goToLine", label: "Go to Line...", shortcut: "Ctrl+G" },
    { id: "find", label: "Find", shortcut: "Ctrl+F" },
    { id: "replace", label: "Find and Replace", shortcut: "Ctrl+H" },
    { id: "toggleTerminal", label: "Toggle Terminal", shortcut: "Ctrl+`" },
    { id: "splitEditor", label: "Split Editor Right", shortcut: "Ctrl+\\" },
    { id: "closeTab", label: "Close Editor", shortcut: "Ctrl+W" },
    { id: "newFile", label: "New File", shortcut: "Ctrl+N" },
    { id: "selectAll", label: "Select All", shortcut: "Ctrl+A" },
    { id: "undo", label: "Undo", shortcut: "Ctrl+Z" },
    { id: "redo", label: "Redo", shortcut: "Ctrl+Shift+Z" },
    { id: "zoomIn", label: "Zoom In", shortcut: "Ctrl+=" },
    { id: "zoomOut", label: "Zoom Out", shortcut: "Ctrl+-" },
  ], []);

  const filtered = query
    ? commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()))
    : commands;

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-[9998]" onClick={onClose} />
      <div
        className="absolute left-1/2 -translate-x-1/2 z-[9999] rounded-md overflow-hidden"
        style={{
          top: 0,
          width: "min(600px, 80%)",
          background: C.sidebarBg,
          border: `1px solid ${C.border}`,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}
      >
        <div className="flex items-center gap-2 px-3" style={{ borderBottom: `1px solid ${C.border}` }}>
          <ChevronRight size={14} style={{ color: C.textMuted }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "Enter" && filtered.length > 0) {
                onAction(filtered[0].id);
                onClose();
              }
            }}
            placeholder="Type a command..."
            className="flex-1 bg-transparent border-none outline-none text-[13px] py-2.5"
            style={{ color: C.text }}
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
          {filtered.map((cmd) => (
            <button
              key={cmd.id}
              className="w-full flex items-center justify-between px-3 py-1.5 text-[13px] text-left"
              style={{ color: C.text }}
              onClick={() => { onAction(cmd.id); onClose(); }}
              onMouseEnter={(e) => { e.currentTarget.style.background = C.listHover; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <span>{cmd.label}</span>
              {cmd.shortcut && (
                <span className="text-[11px] opacity-50">{cmd.shortcut}</span>
              )}
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="px-3 py-4 text-[13px] text-center" style={{ color: C.textMuted }}>
              No commands found
            </div>
          )}
        </div>
      </div>
    </>
  );
});

// ── Sidebar Panels ──────────────────────────────────────────────────────────

const SearchPanel = memo(function SearchPanel() {
  const [query, setQuery] = useState("");
  return (
    <div className="p-2">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search"
        className="w-full px-2.5 py-1.5 rounded text-[13px] outline-none"
        style={{
          background: C.inputBg,
          border: `1px solid ${C.inputBorder}`,
          color: C.text,
        }}
      />
      {query && (
        <div className="mt-2 text-[12px]" style={{ color: C.textMuted }}>
          Search results will appear here
        </div>
      )}
    </div>
  );
});

const GitPanel = memo(function GitPanel() {
  return (
    <div className="p-3 text-[13px]" style={{ color: C.textMuted }}>
      <div className="flex items-center gap-2 mb-3">
        <GitBranch size={14} style={{ color: C.text }} />
        <span style={{ color: C.text }}>SOURCE CONTROL</span>
      </div>
      <div className="text-[12px] space-y-2 px-1">
        <div className="flex items-center gap-2">
          <span style={{ color: C.success }}>✓</span>
          <span>No changes detected</span>
        </div>
        <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${C.border}` }}>
          <span>Branch: </span>
          <span style={{ color: C.text }}>main</span>
        </div>
      </div>
    </div>
  );
});

// ── Diagnostic Types ────────────────────────────────────────────────────────

interface DiagnosticEntry {
  severity: "error" | "warning" | "info" | "hint";
  message: string;
  source: string;
  startLine: number;
  startCol: number;
  endLine: number;
  endCol: number;
  code?: string;
}

// ── Problems Panel ──────────────────────────────────────────────────────────

const ProblemsPanel = memo(function ProblemsPanel({
  diagnostics,
  onGoTo,
}: {
  diagnostics: Map<string, DiagnosticEntry[]>;
  onGoTo?: (file: string, line: number, col: number) => void;
}) {
  const totalErrors = useMemo(() => {
    let count = 0;
    diagnostics.forEach(d => { count += d.filter(e => e.severity === "error").length; });
    return count;
  }, [diagnostics]);

  const totalWarnings = useMemo(() => {
    let count = 0;
    diagnostics.forEach(d => { count += d.filter(e => e.severity === "warning").length; });
    return count;
  }, [diagnostics]);

  const totalInfos = useMemo(() => {
    let count = 0;
    diagnostics.forEach(d => { count += d.filter(e => e.severity === "info" || e.severity === "hint").length; });
    return count;
  }, [diagnostics]);

  const severityIcon = (sev: DiagnosticEntry["severity"]) => {
    switch (sev) {
      case "error": return <span style={{ color: C.error, fontSize: 13, fontWeight: 700 }}>✕</span>;
      case "warning": return <span style={{ color: C.warning, fontSize: 12 }}>⚠</span>;
      case "info": return <span style={{ color: C.info, fontSize: 13 }}>ℹ</span>;
      case "hint": return <span style={{ color: C.textMuted, fontSize: 13 }}>💡</span>;
    }
  };

  const severityColor = (sev: DiagnosticEntry["severity"]) => {
    switch (sev) {
      case "error": return C.error;
      case "warning": return C.warning;
      case "info": return C.info;
      case "hint": return C.textMuted;
    }
  };

  const filesWithDiags = useMemo(() => {
    const entries: [string, DiagnosticEntry[]][] = [];
    diagnostics.forEach((diags, file) => {
      if (diags.length > 0) entries.push([file, diags]);
    });
    entries.sort((a, b) => {
      const ae = a[1].filter(d => d.severity === "error").length;
      const be = b[1].filter(d => d.severity === "error").length;
      return be - ae;
    });
    return entries;
  }, [diagnostics]);

  return (
    <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
      {/* Filter bar */}
      <div className="flex items-center gap-3 px-3 py-1.5" style={{ borderBottom: `1px solid ${C.panelBorder}`, fontSize: 12 }}>
        <span className="flex items-center gap-1" style={{ color: totalErrors > 0 ? C.error : C.textDim }}>
          <span style={{ fontWeight: 700 }}>✕</span> {totalErrors} Errors
        </span>
        <span className="flex items-center gap-1" style={{ color: totalWarnings > 0 ? C.warning : C.textDim }}>
          ⚠ {totalWarnings} Warnings
        </span>
        <span className="flex items-center gap-1" style={{ color: totalInfos > 0 ? C.info : C.textDim }}>
          ℹ {totalInfos} Info
        </span>
      </div>

      {filesWithDiags.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-[13px]" style={{ color: C.textDim }}>
          No problems detected in workspace.
        </div>
      ) : (
        filesWithDiags.map(([file, diags]) => (
          <FileProblems
            key={file}
            file={file}
            diags={diags}
            severityIcon={severityIcon}
            severityColor={severityColor}
            onGoTo={onGoTo}
          />
        ))
      )}
    </div>
  );
});

const FileProblems = memo(function FileProblems({
  file,
  diags,
  severityIcon,
  severityColor,
  onGoTo,
}: {
  file: string;
  diags: DiagnosticEntry[];
  severityIcon: (sev: DiagnosticEntry["severity"]) => React.ReactNode;
  severityColor: (sev: DiagnosticEntry["severity"]) => string;
  onGoTo?: (file: string, line: number, col: number) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const fileName = file.split("/").pop() || file;
  const dirPath = file.split("/").slice(0, -1).join("/");

  return (
    <div>
      <button
        className="flex items-center gap-1.5 w-full text-left px-2 py-1 text-[13px] hover:bg-white/[0.04]"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown size={12} style={{ color: C.textDim }} /> : <ChevronRight size={12} style={{ color: C.textDim }} />}
        {getFileIcon(fileName)}
        <span style={{ color: C.text }}>{fileName}</span>
        {dirPath && <span className="ml-1 text-[11px]" style={{ color: C.textDim }}>{dirPath}</span>}
        <span className="ml-auto text-[11px] tabular-nums" style={{ color: C.textMuted }}>{diags.length}</span>
      </button>
      {expanded && diags.map((d, i) => (
        <button
          key={i}
          className="flex items-start gap-2 w-full text-left pl-8 pr-3 py-1 text-[13px] hover:bg-white/[0.04] cursor-pointer"
          onClick={() => onGoTo?.(file, d.startLine, d.startCol)}
        >
          <span className="shrink-0 mt-0.5">{severityIcon(d.severity)}</span>
          <span className="flex-1 min-w-0">
            <span style={{ color: severityColor(d.severity) }}>{d.message}</span>
            {d.code && <span className="ml-2 text-[11px]" style={{ color: C.textDim }}>ts({d.code})</span>}
          </span>
          <span className="shrink-0 text-[11px] tabular-nums" style={{ color: C.textDim }}>
            [{d.startLine},{d.startCol}]
          </span>
        </button>
      ))}
    </div>
  );
});

// ── Bottom Panel (Problems + Terminal) ──────────────────────────────────────

type BottomPanelTab = "problems" | "output" | "terminal";

const BottomPanel = memo(function BottomPanel({
  visible,
  onToggle,
  activeTab,
  onTabChange,
  diagnostics,
  onGoToDiagnostic,
}: {
  visible: boolean;
  onToggle: () => void;
  activeTab: BottomPanelTab;
  onTabChange: (tab: BottomPanelTab) => void;
  diagnostics: Map<string, DiagnosticEntry[]>;
  onGoToDiagnostic?: (file: string, line: number, col: number) => void;
}) {
  const [lines, setLines] = useState<string[]>([
    "\x1b[32m➜\x1b[0m hologram-workspace \x1b[36mgit:(main)\x1b[0m",
    "$ hologram-code --version",
    "Hologram Code v1.0.0 (Q-Linux kernel)",
    "$ █",
  ]);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleSubmit = useCallback(() => {
    if (!input.trim()) return;
    const newLines = [...lines.slice(0, -1), `$ ${input}`, `Command: ${input}`, "$ █"];
    setLines(newLines);
    setInput("");
    setTimeout(() => scrollRef.current?.scrollTo({ top: 99999 }), 16);
  }, [input, lines]);

  // Count diagnostics for tab badge
  const errorCount = useMemo(() => {
    let c = 0;
    diagnostics.forEach(d => { c += d.filter(e => e.severity === "error").length; });
    return c;
  }, [diagnostics]);
  const warningCount = useMemo(() => {
    let c = 0;
    diagnostics.forEach(d => { c += d.filter(e => e.severity === "warning").length; });
    return c;
  }, [diagnostics]);

  if (!visible) return null;

  const tabs: { id: BottomPanelTab; label: string; badge?: number; badgeColor?: string }[] = [
    {
      id: "problems",
      label: "Problems",
      badge: errorCount + warningCount,
      badgeColor: errorCount > 0 ? C.error : warningCount > 0 ? C.warning : undefined,
    },
    { id: "output", label: "Output" },
    { id: "terminal", label: "Terminal" },
  ];

  return (
    <div
      className="flex flex-col shrink-0"
      style={{
        height: 220,
        background: C.panelBg,
        borderTop: `1px solid ${C.panelBorder}`,
      }}
    >
      {/* Tab bar */}
      <div
        className="flex items-center justify-between shrink-0"
        style={{
          height: 30,
          padding: "0 8px",
          background: C.sidebarBg,
          borderBottom: `1px solid ${C.panelBorder}`,
        }}
      >
        <div className="flex items-center gap-0">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              className="flex items-center gap-1.5 px-3 text-[11px] uppercase tracking-wide h-full"
              style={{
                color: activeTab === t.id ? C.text : C.textMuted,
                borderBottom: activeTab === t.id ? `1px solid ${C.accent}` : "1px solid transparent",
                paddingBottom: activeTab === t.id ? 0 : 0,
              }}
            >
              {t.label}
              {t.badge !== undefined && t.badge > 0 && (
                <span
                  className="text-[10px] px-1.5 py-0 rounded-full tabular-nums"
                  style={{
                    background: t.badgeColor ? `${t.badgeColor}25` : "hsla(0,0%,100%,0.1)",
                    color: t.badgeColor || C.textMuted,
                    minWidth: 16,
                    textAlign: "center",
                  }}
                >
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {activeTab === "terminal" && (
            <button
              className="p-1 rounded hover:bg-white/10"
              style={{ color: C.textMuted }}
              title="New Terminal"
            >
              <Plus size={13} />
            </button>
          )}
          <button
            onClick={onToggle}
            className="p-1 rounded hover:bg-white/10"
            style={{ color: C.textMuted }}
            title="Close Panel"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Panel content */}
      {activeTab === "problems" && (
        <ProblemsPanel diagnostics={diagnostics} onGoTo={onGoToDiagnostic} />
      )}

      {activeTab === "output" && (
        <div className="flex-1 flex items-center justify-center text-[13px]" style={{ color: C.textDim }}>
          No output available.
        </div>
      )}

      {activeTab === "terminal" && (
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-2 font-mono text-[13px] cursor-text"
          style={{ color: C.text, scrollbarWidth: "thin" }}
          onClick={() => inputRef.current?.focus()}
        >
          {lines.slice(0, -1).map((line, i) => (
            <div key={i} className="leading-[20px] whitespace-pre-wrap">
              {line.replace(/\x1b\[[0-9;]*m/g, "")}
            </div>
          ))}
          <div className="flex leading-[20px]">
            <span>$ </span>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
              className="flex-1 bg-transparent outline-none font-mono text-[13px]"
              style={{ color: C.text }}
              spellCheck={false}
            />
          </div>
        </div>
      )}
    </div>
  );
});

// ── Welcome Tab ─────────────────────────────────────────────────────────────

const WelcomeTab = memo(function WelcomeTab() {
  return (
    <div
      className="flex-1 flex items-center justify-center"
      style={{ background: C.editorBg }}
    >
      <div className="text-center" style={{ maxWidth: 480 }}>
        <div className="text-[42px] font-light mb-2" style={{ color: C.text }}>
          Hologram Code
        </div>
        <div className="text-[14px] mb-8" style={{ color: C.textMuted }}>
          Native code editor on Q-Linux
        </div>

        <div className="space-y-2 text-left" style={{ color: C.textMuted, fontSize: 13 }}>
          <div className="font-medium mb-3" style={{ color: C.text }}>Start</div>
          <div className="flex items-center gap-2 cursor-pointer hover:underline" style={{ color: C.accent }}>
            <FileText size={14} />
            New File…
          </div>
          <div className="flex items-center gap-2 cursor-pointer hover:underline" style={{ color: C.accent }}>
            <FolderOpen size={14} />
            Open Folder…
          </div>

          <div className="font-medium mt-6 mb-3" style={{ color: C.text }}>Help</div>
          <div className="flex items-center gap-2 cursor-pointer hover:underline" style={{ color: C.accent }}>
            <Command size={14} />
            Show All Commands
            <span className="text-[11px] ml-auto" style={{ color: C.textDim }}>Ctrl+Shift+P</span>
          </div>
          <div className="flex items-center gap-2 cursor-pointer hover:underline" style={{ color: C.accent }}>
            <TerminalIcon size={14} />
            Toggle Terminal
            <span className="text-[11px] ml-auto" style={{ color: C.textDim }}>Ctrl+`</span>
          </div>
        </div>
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface HologramCodeProps {
  onClose: () => void;
}

export default function HologramCode({ onClose }: HologramCodeProps) {
  // ── Q-FS — Merkle DAG filesystem (single source of truth) ───────────────
  const qfs = useQFs();

  // ── State ───────────────────────────────────────────────────────────────
  const [activityItem, setActivityItem] = useState<ActivityItem | null>("explorer");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [terminalVisible, setTerminalVisible] = useState(false);
  const [bottomTab, setBottomTab] = useState<BottomPanelTab>("problems");
  const [diagnostics, setDiagnostics] = useState<Map<string, DiagnosticEntry[]>>(new Map());
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [cursorLine, setCursorLine] = useState(1);
  const [cursorCol, setCursorCol] = useState(1);
  const editorRef = useRef<MonacoEditor>(null);
  const monacoInstanceRef = useRef<any>(null);

  // ── Explorer context menu + inline creation state ───────────────────────
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [inlineCreate, setInlineCreate] = useState<{ parentPath: string; type: "file" | "folder" } | null>(null);

  const handleExplorerContextMenu = useCallback((e: React.MouseEvent, node: FSNode) => {
    setContextMenu({ x: e.clientX, y: e.clientY, targetPath: node.path, targetIsFolder: node.type === "folder" });
  }, []);

  const handleNewFile = useCallback((parentPath: string) => {
    setInlineCreate({ parentPath, type: "file" });
  }, []);

  const handleNewFolder = useCallback((parentPath: string) => {
    setInlineCreate({ parentPath, type: "folder" });
  }, []);

  const handleInlineSubmit = useCallback((name: string) => {
    if (!inlineCreate) return;
    if (inlineCreate.type === "folder") {
      qfs.mkdir(inlineCreate.parentPath, name);
    } else {
      qfs.createFile(inlineCreate.parentPath, name, "");
    }
    setInlineCreate(null);
  }, [inlineCreate, qfs]);

  const handleInlineCancel = useCallback(() => setInlineCreate(null), []);

  const handleDeleteNode = useCallback((path: string) => {
    qfs.rm(path);
    setOpenFiles(prev => prev.filter(f => !f.path.startsWith(path)));
    if (activeFilePath?.startsWith(path)) {
      setActiveFilePath(null);
    }
  }, [qfs, activeFilePath]);

  // ── LSP: Monaco TypeScript worker + AI completions ─────────────────────
  useMonacoLsp(monacoInstanceRef, qfs, editorRef);

  const activeFile = useMemo(
    () => openFiles.find(f => f.path === activeFilePath) ?? null,
    [openFiles, activeFilePath],
  );

  // ── Activity bar toggle ─────────────────────────────────────────────────
  const handleActivitySelect = useCallback((id: ActivityItem) => {
    if (activityItem === id) {
      setSidebarOpen(!sidebarOpen);
    } else {
      setActivityItem(id);
      setSidebarOpen(true);
    }
  }, [activityItem, sidebarOpen]);

  // ── File operations ─────────────────────────────────────────────────────
  const openFile = useCallback((node: FSNode) => {
    if (node.type !== "file") return;
    // Read content from Q-FS (Merkle DAG)
    const content = qfs.readFile(node.path) ?? node.content ?? "";
    const exists = openFiles.find(f => f.path === node.path);
    if (!exists) {
      setOpenFiles(prev => [...prev, {
        path: node.path,
        name: node.name,
        content,
        language: getLanguage(node.name),
        modified: false,
      }]);
    }
    setActiveFilePath(node.path);
  }, [openFiles, qfs]);

  // ── Save file to Q-FS (Ctrl+S) ─────────────────────────────────────────
  const saveFile = useCallback((path: string) => {
    const file = openFiles.find(f => f.path === path);
    if (!file || !file.modified) return;
    const success = qfs.writeFile(path, file.content);
    if (success) {
      setOpenFiles(prev =>
        prev.map(f => f.path === path ? { ...f, modified: false } : f)
      );
    }
  }, [openFiles, qfs]);

  const closeFile = useCallback((path: string) => {
    setOpenFiles(prev => {
      const next = prev.filter(f => f.path !== path);
      if (activeFilePath === path) {
        setActiveFilePath(next.length > 0 ? next[next.length - 1].path : null);
      }
      return next;
    });
  }, [activeFilePath]);

  // ── Monaco setup ────────────────────────────────────────────────────────
  const handleBeforeMount: BeforeMount = useCallback((monaco) => {
    monaco.editor.defineTheme("hologram-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "6A9955" },
        { token: "keyword", foreground: "569cd6" },
        { token: "string", foreground: "ce9178" },
        { token: "number", foreground: "b5cea8" },
        { token: "type", foreground: "4ec9b0" },
        { token: "function", foreground: "dcdcaa" },
        { token: "variable", foreground: "9cdcfe" },
        { token: "constant", foreground: "4fc1ff" },
        { token: "interface", foreground: "4ec9b0" },
      ],
      colors: {
        "editor.background": C.editorBg,
        "editor.foreground": C.text,
        "editor.lineHighlightBackground": "#2a2d2e",
        "editor.selectionBackground": C.selection,
        "editor.findMatchBackground": C.findMatch,
        "editorLineNumber.foreground": C.lineNumber,
        "editorLineNumber.activeForeground": "#c6c6c6",
        "editorCursor.foreground": "#aeafad",
        "editorIndentGuide.background1": "#404040",
        "scrollbar.shadow": "#000000",
        "scrollbarSlider.background": "#79797966",
        "scrollbarSlider.hoverBackground": "#646464b3",
        "scrollbarSlider.activeBackground": "#bfbfbf66",
        "minimap.background": C.editorBg,
      },
    });
  }, []);

  const handleEditorMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoInstanceRef.current = monaco;

    // Cursor tracking
    editor.onDidChangeCursorPosition((e: any) => {
      setCursorLine(e.position.lineNumber);
      setCursorCol(e.position.column);
    });

    // Poll Monaco markers for diagnostics (errors/warnings)
    const markerInterval = setInterval(() => {
      if (!monaco) return;
      const allMarkers = monaco.editor.getModelMarkers({});
      const grouped = new Map<string, DiagnosticEntry[]>();
      for (const m of allMarkers) {
        const uri = m.resource.toString();
        const fileName = uri.split("/").pop() || uri;
        const sev = m.severity === 8 ? "error" : m.severity === 4 ? "warning" : m.severity === 2 ? "info" : "hint";
        const entry: DiagnosticEntry = {
          severity: sev,
          message: m.message,
          source: m.source || "ts",
          startLine: m.startLineNumber,
          startCol: m.startColumn,
          endLine: m.endLineNumber,
          endCol: m.endColumn,
          code: typeof m.code === "object" ? String((m.code as any).value) : m.code ? String(m.code) : undefined,
        };
        if (!grouped.has(fileName)) grouped.set(fileName, []);
        grouped.get(fileName)!.push(entry);
      }
      setDiagnostics(grouped);
    }, 1500);

    editor.onDidDispose(() => clearInterval(markerInterval));

    // Enable quick suggestions and parameter hints
    editor.updateOptions({
      quickSuggestions: { other: true, comments: false, strings: true },
      suggestOnTriggerCharacters: true,
      parameterHints: { enabled: true },
      wordBasedSuggestions: "currentDocument",
      suggest: {
        showMethods: true,
        showFunctions: true,
        showVariables: true,
        showInterfaces: true,
        showProperties: true,
        showClasses: true,
        showModules: true,
        showKeywords: true,
        showSnippets: true,
        preview: true,
        insertMode: "replace",
      },
    });

    // Focus the editor immediately
    editor.focus();
  }, []);

  // ── Global keyboard shortcuts ───────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      // Command Palette
      if (mod && e.shiftKey && e.key === "P") {
        e.preventDefault();
        e.stopPropagation();
        setPaletteOpen(true);
        return;
      }

      // Toggle Terminal
      if (mod && e.key === "`") {
        e.preventDefault();
        e.stopPropagation();
        setTerminalVisible(v => !v);
        return;
      }

      // Toggle Sidebar
      if (mod && e.key === "b") {
        e.preventDefault();
        e.stopPropagation();
        setSidebarOpen(v => !v);
        return;
      }

      // Close tab
      if (mod && e.key === "w") {
        e.preventDefault();
        e.stopPropagation();
        if (activeFilePath) closeFile(activeFilePath);
        return;
      }

      // Save file to Q-FS
      if (mod && e.key === "s") {
        e.preventDefault();
        e.stopPropagation();
        if (activeFilePath) saveFile(activeFilePath);
        return;
      }
    };

    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [activeFilePath, closeFile, saveFile]);

  // ── Command palette actions ─────────────────────────────────────────────
  const handleCommand = useCallback((action: string) => {
    const ed = editorRef.current;
    if (!ed) return;
    switch (action) {
      case "format": ed.getAction("editor.action.formatDocument")?.run(); break;
      case "find": ed.getAction("actions.find")?.run(); break;
      case "replace": ed.getAction("editor.action.startFindReplaceAction")?.run(); break;
      case "toggleTerminal": setTerminalVisible(v => !v); break;
      case "toggleMinimap": {
        const current = ed.getOption(72 /* EditorOption.minimap */);
        ed.updateOptions({ minimap: { enabled: !(current as any)?.enabled } });
        break;
      }
      case "toggleWordWrap": {
        const w = ed.getOption(144 /* EditorOption.wordWrap */);
        ed.updateOptions({ wordWrap: w === "on" ? "off" : "on" });
        break;
      }
      case "goToLine": ed.getAction("editor.action.gotoLine")?.run(); break;
      case "closeTab": if (activeFilePath) closeFile(activeFilePath); break;
    }
  }, [activeFilePath, closeFile]);

  // ── Sidebar content ─────────────────────────────────────────────────────
  const sidebarContent = useMemo(() => {
    switch (activityItem) {
      case "explorer":
        return (
          <div
            className="flex-1 overflow-y-auto"
            style={{ scrollbarWidth: "thin" }}
            onContextMenu={(e) => {
              // Right-click on empty space → create at root
              if (e.target === e.currentTarget || (e.target as HTMLElement).closest("[data-explorer-bg]")) {
                e.preventDefault();
                setContextMenu({ x: e.clientX, y: e.clientY, targetPath: "/", targetIsFolder: true });
              }
            }}
          >
            <div
              className="flex items-center justify-between px-3 py-2 text-[11px] uppercase tracking-wider select-none"
              style={{ color: C.textMuted }}
            >
              <span>Explorer</span>
              <div className="flex items-center gap-1">
                <button
                  title="New File"
                  onClick={() => handleNewFile("/")}
                  className="p-0.5 rounded transition-colors"
                  onMouseEnter={(e) => (e.currentTarget.style.background = C.listHover)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <FilePlus size={14} style={{ color: C.textDim }} />
                </button>
                <button
                  title="New Folder"
                  onClick={() => handleNewFolder("/")}
                  className="p-0.5 rounded transition-colors"
                  onMouseEnter={(e) => (e.currentTarget.style.background = C.listHover)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <FolderPlus size={14} style={{ color: C.textDim }} />
                </button>
              </div>
            </div>
            <div
              className="flex items-center gap-1 px-3 py-1 text-[11px] uppercase tracking-wider font-semibold select-none"
              style={{ color: C.text }}
            >
              <ChevronDown size={12} />
              <span>hologram-workspace</span>
            </div>
            {inlineCreate && inlineCreate.parentPath === "/" && (
              <InlineNameInput
                depth={1}
                type={inlineCreate.type}
                onSubmit={handleInlineSubmit}
                onCancel={handleInlineCancel}
              />
            )}
            {qfs.tree.map((node) => (
              <FileTreeNode
                key={node.path}
                node={node}
                depth={1}
                onSelect={openFile}
                activeFile={activeFilePath}
                onContextMenu={handleExplorerContextMenu}
                inlineCreate={inlineCreate}
                onInlineSubmit={handleInlineSubmit}
                onInlineCancel={handleInlineCancel}
              />
            ))}
          </div>
        );
      case "search":
        return <SearchPanel />;
      case "git":
        return <GitPanel />;
      case "debug":
        return (
          <div className="p-3 text-[13px]" style={{ color: C.textMuted }}>
            <div className="flex items-center gap-2 mb-3">
              <Play size={14} style={{ color: C.success }} />
              <span style={{ color: C.text }}>RUN AND DEBUG</span>
            </div>
            <div className="text-[12px]">
              To customize Run and Debug, open a launch.json file.
            </div>
          </div>
        );
      case "extensions":
        return (
          <div className="p-3 text-[13px]" style={{ color: C.textMuted }}>
            <div className="text-[11px] uppercase tracking-wider mb-3" style={{ color: C.text }}>
              Extensions
            </div>
            <input
              placeholder="Search Extensions..."
              className="w-full px-2.5 py-1.5 rounded text-[13px] outline-none mb-3"
              style={{
                background: C.inputBg,
                border: `1px solid ${C.inputBorder}`,
                color: C.text,
              }}
            />
            <div className="text-[12px]">
              Extensions marketplace coming soon via Q-Linux package manager.
            </div>
          </div>
        );
      default:
        return null;
    }
  }, [activityItem, activeFilePath, openFile]);

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col h-full w-full overflow-hidden select-none"
      style={{
        background: C.bg,
        color: C.text,
        fontFamily: "'Segoe WPC', 'Segoe UI', system-ui, -apple-system, sans-serif",
        fontSize: 13,
        contain: "strict",
      }}
    >
      {/* ── Title Bar ─────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between shrink-0"
        style={{
          height: 30,
          background: C.titleBg,
          padding: "0 8px",
          borderBottom: `1px solid ${C.border}`,
          WebkitAppRegion: "drag",
        } as React.CSSProperties}
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 mr-3">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#f14c4c" }} onClick={onClose} />
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#cca700" }} />
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#89d185" }} />
          </div>
          <span className="text-[12px]" style={{ color: C.textMuted }}>
            {activeFile ? `${activeFile.name} — ` : ""}Hologram Code
          </span>
        </div>
      </div>

      {/* ── Main Layout ───────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Activity Bar */}
        <ActivityBar active={sidebarOpen ? activityItem : null} onSelect={handleActivitySelect} />

        {/* Sidebar */}
        {sidebarOpen && (
          <div
            className="flex flex-col shrink-0 overflow-hidden"
            style={{
              width: 240,
              background: C.sidebarBg,
              borderRight: `1px solid ${C.border}`,
            }}
          >
            {sidebarContent}
          </div>
        )}

        {/* Editor Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <TabBar
            files={openFiles}
            activeFile={activeFilePath}
            onSelect={setActiveFilePath}
            onClose={closeFile}
          />

          {activeFile ? (
            <>
              <Breadcrumbs path={activeFile.path} />
              <div className="flex-1 overflow-hidden">
                <Editor
                  key={activeFile.path}
                  defaultValue={activeFile.content}
                  language={activeFile.language}
                  theme="hologram-dark"
                  beforeMount={handleBeforeMount}
                  onMount={handleEditorMount}
                  options={{
                    fontSize: 14,
                    fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace",
                    fontLigatures: true,
                    lineHeight: 22,
                    letterSpacing: 0.3,
                    minimap: { enabled: true, maxColumn: 80 },
                    scrollbar: {
                      verticalScrollbarSize: 10,
                      horizontalScrollbarSize: 10,
                    },
                    padding: { top: 8 },
                    smoothScrolling: true,
                    cursorBlinking: "smooth",
                    cursorSmoothCaretAnimation: "on",
                    renderLineHighlight: "all",
                    bracketPairColorization: { enabled: true },
                    guides: { bracketPairs: true, indentation: true },
                    suggest: { preview: true },
                    parameterHints: { enabled: true },
                    folding: true,
                    links: true,
                    renderWhitespace: "selection",
                    tabSize: 2,
                    wordWrap: "off",
                    automaticLayout: true,
                  }}
                  onChange={(value) => {
                    if (value !== undefined) {
                      setOpenFiles(prev =>
                        prev.map(f =>
                          f.path === activeFilePath
                            ? { ...f, content: value, modified: true }
                            : f
                        )
                      );
                    }
                  }}
                />
              </div>
            </>
          ) : (
            <WelcomeTab />
          )}

          {/* Bottom Panel (Problems + Terminal) */}
          <BottomPanel
            visible={terminalVisible}
            onToggle={() => setTerminalVisible(false)}
            activeTab={bottomTab}
            onTabChange={setBottomTab}
            diagnostics={diagnostics}
            onGoToDiagnostic={(file, line, col) => {
              const ed = editorRef.current;
              if (ed) {
                ed.revealLineInCenter(line);
                ed.setPosition({ lineNumber: line, column: col });
                ed.focus();
              }
            }}
          />
        </div>
      </div>

      {/* ── Status Bar ────────────────────────────────────────────── */}
      <StatusBar
        line={cursorLine}
        col={cursorCol}
        language={activeFile?.language ?? "Plain Text"}
        encoding="UTF-8"
        fsStats={qfs.stats}
        errorCount={(() => { let c = 0; diagnostics.forEach(d => { c += d.filter(e => e.severity === "error").length; }); return c; })()}
        warningCount={(() => { let c = 0; diagnostics.forEach(d => { c += d.filter(e => e.severity === "warning").length; }); return c; })()}
        onProblemsClick={() => { setTerminalVisible(true); setBottomTab("problems"); }}
      />

      {/* ── Command Palette Overlay ───────────────────────────────── */}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onAction={handleCommand}
      />

      {/* ── Explorer Context Menu ─────────────────────────────────── */}
      {contextMenu && (
        <ExplorerContextMenu
          menu={contextMenu}
          onNewFile={handleNewFile}
          onNewFolder={handleNewFolder}
          onDelete={handleDeleteNode}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
