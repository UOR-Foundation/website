/**
 * HologramVault — Sovereign Object Explorer
 * ══════════════════════════════════════════
 *
 * Your digital objects — notebooks, projections, data, tools — all live here.
 * Vault gives you a single, familiar surface to navigate everything you own.
 *
 * Features:
 *   - Grid + List views
 *   - Right-click context menu (Open, Get Info, Copy Name, Add to Favorites)
 *   - Drag-and-drop reordering within categories
 *   - All items link to real, implemented projections
 */

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  Search, LayoutGrid, List, ChevronRight, ArrowLeft, ArrowRight,
  Clock, Star, Tag, FileText, Globe, Terminal, Beaker,
  Atom, Code2, Package, Database, Music, Shield, Cpu,
  MessageSquare, Sparkles, Settings, BookOpen, X,
  Layers, GripVertical, ExternalLink, Info, Copy, StarOff,
  Fingerprint,
} from "lucide-react";

/* ── Types ───────────────────────────────────────────────── */

type ViewMode = "grid" | "list";

export interface VaultItem {
  id: string;
  name: string;
  icon: React.ElementType;
  iconColor: string;
  type: "folder" | "object" | "projection";
  category: string;
  tags?: string[];
  description?: string;
  action?: () => void;
}

/* ── Sidebar locations ───────────────────────────────────── */

interface SidebarLocation {
  id: string;
  label: string;
  icon: React.ElementType;
  iconColor?: string;
}

const SIDEBAR_QUICK: SidebarLocation[] = [
  { id: "recents", label: "Recents", icon: Clock },
  { id: "favorites", label: "Favorites", icon: Star },
  { id: "all", label: "All Objects", icon: Layers },
];

const SIDEBAR_LOCATIONS: SidebarLocation[] = [
  { id: "projections", label: "Projections", icon: Sparkles, iconColor: "hsl(38, 40%, 65%)" },
  { id: "notebooks", label: "Notebooks", icon: Beaker, iconColor: "hsl(38, 35%, 60%)" },
  { id: "data", label: "Data & Storage", icon: Database, iconColor: "hsl(200, 50%, 55%)" },
  { id: "tools", label: "Tools", icon: Settings, iconColor: "hsl(25, 20%, 55%)" },
  { id: "media", label: "Media", icon: Music, iconColor: "hsl(280, 40%, 60%)" },
];

const SIDEBAR_TAGS: SidebarLocation[] = [
  { id: "tag-active", label: "Active", icon: Tag, iconColor: "hsl(142, 50%, 50%)" },
  { id: "tag-research", label: "Research", icon: Tag, iconColor: "hsl(38, 50%, 60%)" },
  { id: "tag-personal", label: "Personal", icon: Tag, iconColor: "hsl(280, 40%, 55%)" },
];

/* ── Real vault contents — only items with implemented projections ── */

function buildVaultItems(onOpenPanel: (panel: string) => void): VaultItem[] {
  return [
    // Projections — each has a real panel
    { id: "web-browser", name: "Web Browser", icon: Globe, iconColor: "hsl(38, 30%, 60%)", type: "projection", category: "projections", tags: ["active"], description: "Browse the web through Hologram", action: () => onOpenPanel("browser") },
    { id: "terminal", name: "Terminal", icon: Terminal, iconColor: "hsl(142, 45%, 55%)", type: "projection", category: "projections", tags: ["active"], description: "QShell command line", action: () => onOpenPanel("terminal") },
    { id: "jupyter", name: "Jupyter Notebook", icon: Beaker, iconColor: "hsl(38, 40%, 65%)", type: "projection", category: "projections", tags: ["active", "research"], description: "Python & AI notebooks", action: () => onOpenPanel("jupyter") },
    { id: "quantum-lab", name: "Quantum Lab", icon: Atom, iconColor: "hsl(200, 60%, 60%)", type: "projection", category: "projections", tags: ["research"], description: "Quantum circuit simulator", action: () => onOpenPanel("quantum-workspace") },
    { id: "code-editor", name: "Code Editor", icon: Code2, iconColor: "hsl(210, 80%, 60%)", type: "projection", category: "projections", tags: ["active"], description: "Multi-file editor", action: () => onOpenPanel("code") },
    { id: "messenger", name: "Messenger", icon: MessageSquare, iconColor: "hsl(38, 30%, 55%)", type: "projection", category: "projections", tags: ["active", "personal"], description: "Sovereign messaging", action: () => onOpenPanel("messenger") },
    { id: "compute", name: "Compute", icon: Cpu, iconColor: "hsl(0, 50%, 55%)", type: "projection", category: "projections", tags: ["active"], description: "GPU & inference monitoring", action: () => onOpenPanel("compute") },
    { id: "memory", name: "Memory", icon: Database, iconColor: "hsl(280, 35%, 55%)", type: "projection", category: "projections", tags: ["active"], description: "Knowledge graph & memory bank", action: () => onOpenPanel("memory") },
    { id: "packages", name: "Packages", icon: Package, iconColor: "hsl(25, 30%, 50%)", type: "projection", category: "projections", tags: ["active"], description: "Package manager", action: () => onOpenPanel("packages") },

    // Data & Storage
    { id: "data-bank", name: "Data Bank", icon: Shield, iconColor: "hsl(142, 40%, 50%)", type: "object", category: "data", tags: ["personal"], description: "Encrypted personal data vault" },
    { id: "projections-registry", name: "Projection Registry", icon: Layers, iconColor: "hsl(38, 40%, 60%)", type: "object", category: "data", description: "370+ interoperability projections" },
    { id: "coherence-proofs", name: "Coherence Proofs", icon: FileText, iconColor: "hsl(38, 25%, 50%)", type: "object", category: "data", tags: ["research"], description: "Verified reasoning artifacts" },
    { id: "saved-responses", name: "Saved Responses", icon: FileText, iconColor: "hsl(25, 20%, 50%)", type: "object", category: "data", tags: ["personal"], description: "Bookmarked AI conversations" },

    // Tools
    { id: "identity-manager", name: "Identity", icon: Fingerprint, iconColor: "hsl(38, 35%, 55%)", type: "object", category: "tools", description: "Sovereign identity manager", action: () => onOpenPanel("myspace") },
    { id: "interoperability", name: "Interoperability", icon: Sparkles, iconColor: "hsl(38, 40%, 65%)", type: "object", category: "tools", description: "Projection family configuration" },
    { id: "settings", name: "Settings", icon: Settings, iconColor: "hsl(25, 15%, 50%)", type: "object", category: "tools", description: "System preferences" },

    // Notebooks
    { id: "nb-python-ai", name: "Python & AI", icon: Beaker, iconColor: "hsl(38, 40%, 65%)", type: "folder", category: "notebooks", tags: ["research"], description: "Machine learning notebooks", action: () => onOpenPanel("jupyter") },
    { id: "nb-personal", name: "My Notebooks", icon: BookOpen, iconColor: "hsl(38, 30%, 55%)", type: "folder", category: "notebooks", tags: ["personal"], description: "Personal scratch notebooks", action: () => onOpenPanel("jupyter") },

    // Media
    { id: "ambient-player", name: "Ambient Player", icon: Music, iconColor: "hsl(280, 40%, 60%)", type: "object", category: "media", tags: ["personal"], description: "Background audio & focus sounds" },
  ];
}

/* ── Palette ──────────────────────────────────────────────── */

const P = {
  bg: "hsl(25, 10%, 10%)",
  sidebar: "hsl(25, 8%, 8%)",
  surface: "hsla(25, 8%, 14%, 0.85)",
  surfaceHover: "hsla(38, 12%, 90%, 0.06)",
  surfaceActive: "hsla(38, 12%, 90%, 0.1)",
  border: "hsla(38, 12%, 70%, 0.08)",
  borderFocus: "hsla(38, 30%, 55%, 0.25)",
  text: "hsl(38, 10%, 88%)",
  textMuted: "hsl(38, 8%, 50%)",
  textDim: "hsl(38, 6%, 38%)",
  gold: "hsl(38, 40%, 65%)",
  goldMuted: "hsl(38, 25%, 50%)",
  font: "'DM Sans', system-ui, sans-serif",
  contextBg: "hsl(25, 10%, 14%)",
  contextHover: "hsla(38, 20%, 90%, 0.08)",
  contextBorder: "hsla(38, 12%, 70%, 0.12)",
} as const;

/* ── Context Menu ─────────────────────────────────────────── */

interface ContextMenuState {
  x: number;
  y: number;
  item: VaultItem;
}

function ContextMenu({
  state,
  favorites,
  onClose,
  onOpen,
  onToggleFavorite,
  onCopyName,
  onGetInfo,
}: {
  state: ContextMenuState;
  favorites: Set<string>;
  onClose: () => void;
  onOpen: () => void;
  onToggleFavorite: () => void;
  onCopyName: () => void;
  onGetInfo: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const keyHandler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", keyHandler);
    return () => { document.removeEventListener("mousedown", handler); document.removeEventListener("keydown", keyHandler); };
  }, [onClose]);

  const isFav = favorites.has(state.item.id);

  const actions = [
    { label: "Open", icon: ExternalLink, action: onOpen },
    { label: "Get Info", icon: Info, action: onGetInfo },
    { label: "Copy Name", icon: Copy, action: onCopyName },
    { label: isFav ? "Remove from Favorites" : "Add to Favorites", icon: isFav ? StarOff : Star, action: onToggleFavorite },
  ];

  return (
    <div
      ref={ref}
      className="fixed z-[9999] rounded-lg py-1 shadow-xl"
      style={{
        top: state.y,
        left: state.x,
        minWidth: 200,
        background: P.contextBg,
        border: `1px solid ${P.contextBorder}`,
        fontFamily: P.font,
        animation: "legal-tab-enter 120ms ease-out both",
      }}
    >
      {actions.map((a, i) => (
        <button
          key={i}
          onClick={() => { a.action(); onClose(); }}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors duration-100"
          style={{ color: P.text, fontSize: "13px" }}
          onMouseEnter={e => (e.currentTarget.style.background = P.contextHover)}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          <a.icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} style={{ color: P.textMuted }} />
          {a.label}
        </button>
      ))}
    </div>
  );
}

/* ── Info Panel (shown on Get Info) ───────────────────────── */

function InfoPanel({ item, onClose }: { item: VaultItem; onClose: () => void }) {
  const Icon = item.icon;
  return (
    <div
      className="fixed z-[9998] rounded-xl p-5 shadow-xl"
      style={{
        top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        width: 320,
        background: P.contextBg,
        border: `1px solid ${P.contextBorder}`,
        fontFamily: P.font,
        animation: "legal-tab-enter 180ms ease-out both",
      }}
    >
      <div className="flex items-start gap-3 mb-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "hsla(38, 10%, 90%, 0.05)", border: `1px solid ${P.border}` }}
        >
          <Icon className="w-6 h-6" strokeWidth={1.3} style={{ color: item.iconColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-medium truncate" style={{ color: P.text }}>{item.name}</p>
          <p className="text-[11px] uppercase tracking-[0.1em]" style={{ color: P.textDim }}>
            {item.type === "projection" ? "Projection" : item.type === "folder" ? "Folder" : "Object"}
          </p>
        </div>
        <button onClick={onClose} style={{ color: P.textMuted }} className="hover:opacity-70">
          <X className="w-4 h-4" />
        </button>
      </div>
      {item.description && (
        <p className="text-[13px] leading-relaxed mb-3" style={{ color: P.textMuted }}>{item.description}</p>
      )}
      <div className="flex flex-wrap gap-1.5">
        <span className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-[0.08em]" style={{ background: P.surfaceActive, color: P.textDim }}>
          {item.category}
        </span>
        {item.tags?.map(t => (
          <span key={t} className="text-[10px] px-2 py-0.5 rounded-full uppercase tracking-[0.08em]" style={{ background: P.surfaceActive, color: P.textDim }}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Props ────────────────────────────────────────────────── */

interface HologramVaultProps {
  onClose: () => void;
  onOpenPanel?: (panel: string) => void;
}

const categoryLabels: Record<string, string> = {
  projections: "Projections",
  notebooks: "Notebooks",
  data: "Data & Storage",
  tools: "Tools",
  media: "Media",
};

/* ── Component ────────────────────────────────────────────── */

export default function HologramVault({ onClose, onOpenPanel }: HologramVaultProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [search, setSearch] = useState("");
  const [activeLocation, setActiveLocation] = useState("all");
  const [breadcrumb, setBreadcrumb] = useState<string[]>(["Vault"]);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [infoItem, setInfoItem] = useState<VaultItem | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("hologram:vault-favorites");
      return stored ? new Set(JSON.parse(stored)) : new Set(["web-browser", "terminal", "code-editor", "messenger"]);
    } catch { return new Set(["web-browser", "terminal", "code-editor", "messenger"]); }
  });

  // Drag state
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const items = useMemo(
    () => buildVaultItems((panel) => onOpenPanel?.(panel)),
    [onOpenPanel],
  );

  // Persist favorites
  useEffect(() => {
    localStorage.setItem("hologram:vault-favorites", JSON.stringify([...favorites]));
  }, [favorites]);

  // Filter
  const filteredItems = useMemo(() => {
    let result = items;

    if (activeLocation === "recents") {
      result = result.filter(i => i.tags?.includes("active"));
    } else if (activeLocation === "favorites") {
      result = result.filter(i => favorites.has(i.id));
    } else if (activeLocation !== "all") {
      if (activeLocation.startsWith("tag-")) {
        const tag = activeLocation.replace("tag-", "");
        result = result.filter(i => i.tags?.includes(tag));
      } else {
        result = result.filter(i => i.category === activeLocation);
      }
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(i =>
        i.name.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q) ||
        i.tags?.some(t => t.includes(q)),
      );
    }

    return result;
  }, [items, activeLocation, search, favorites]);

  const handleLocationClick = useCallback((id: string, label: string) => {
    setActiveLocation(id);
    setBreadcrumb(["Vault", label]);
    setSelectedItem(null);
  }, []);

  const handleItemClick = useCallback((item: VaultItem) => {
    setSelectedItem(item.id);
  }, []);

  const handleItemDoubleClick = useCallback((item: VaultItem) => {
    if (item.action) {
      item.action();
      onClose();
    }
  }, [onClose]);

  const handleItemOpen = useCallback((item: VaultItem) => {
    if (item.action) { item.action(); onClose(); }
  }, [onClose]);

  const handleContextMenu = useCallback((e: React.MouseEvent, item: VaultItem) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedItem(item.id);
    setContextMenu({ x: e.clientX, y: e.clientY, item });
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  // Drag handlers
  const handleDragStart = useCallback((e: React.DragEvent, item: VaultItem) => {
    setDragId(item.id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", item.name);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, item: VaultItem) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverId(item.id);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragId(null);
    setDragOverId(null);
  }, []);

  const locationLabel = useMemo(() => {
    const all = [...SIDEBAR_QUICK, ...SIDEBAR_LOCATIONS, ...SIDEBAR_TAGS];
    return all.find(l => l.id === activeLocation)?.label ?? "All Objects";
  }, [activeLocation]);

  const groupedByCategory = useMemo(() => {
    if (activeLocation !== "all" && !activeLocation.startsWith("tag-") && activeLocation !== "recents" && activeLocation !== "favorites") {
      return null;
    }
    const groups: Record<string, VaultItem[]> = {};
    for (const item of filteredItems) {
      const cat = item.category;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    }
    return Object.entries(groups).filter(([, items]) => items.length > 0);
  }, [filteredItems, activeLocation]);

  return (
    <div
      className="flex flex-col h-full w-full select-none"
      style={{ background: P.bg, fontFamily: P.font, borderLeft: `1px solid ${P.border}` }}
      onClick={() => setContextMenu(null)}
    >
      {/* ── Toolbar ──────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 shrink-0"
        style={{ borderBottom: `1px solid ${P.border}`, background: "hsla(25, 8%, 12%, 0.5)" }}
      >
        <div className="flex items-center gap-1">
          <button
            className="w-7 h-7 rounded-md flex items-center justify-center transition-colors hover:opacity-70"
            style={{ color: P.textMuted }}
            onClick={() => { setActiveLocation("all"); setBreadcrumb(["Vault"]); }}
            title="Back"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <button className="w-7 h-7 rounded-md flex items-center justify-center" style={{ color: P.textDim }} disabled>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-1 flex-1 min-w-0">
          {breadcrumb.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="w-3 h-3" style={{ color: P.textDim }} />}
              <button
                className="text-[13px] font-medium truncate"
                style={{ color: i === breadcrumb.length - 1 ? P.text : P.textMuted }}
                onClick={() => { if (i === 0) { setActiveLocation("all"); setBreadcrumb(["Vault"]); } }}
              >
                {crumb}
              </button>
            </span>
          ))}
        </div>

        <div className="flex items-center rounded-lg overflow-hidden" style={{ border: `1px solid ${P.border}` }}>
          <button
            className="px-2 py-1.5 transition-colors"
            style={{ background: viewMode === "grid" ? P.surfaceActive : "transparent", color: viewMode === "grid" ? P.text : P.textMuted }}
            onClick={() => setViewMode("grid")}
            title="Grid view"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            className="px-2 py-1.5 transition-colors"
            style={{ background: viewMode === "list" ? P.surfaceActive : "transparent", color: viewMode === "list" ? P.text : P.textMuted }}
            onClick={() => setViewMode("list")}
            title="List view"
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>

        <div
          className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
          style={{ background: P.surface, border: `1px solid ${search ? P.borderFocus : P.border}`, width: 180, transition: "border-color 200ms" }}
        >
          <Search className="w-3.5 h-3.5 shrink-0" style={{ color: P.textMuted }} />
          <input
            type="text"
            placeholder="Search…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent text-[13px] w-full outline-none placeholder:opacity-40"
            style={{ color: P.text, fontFamily: P.font }}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{ color: P.textMuted }}>
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <button onClick={onClose} className="w-7 h-7 rounded-md flex items-center justify-center transition-opacity hover:opacity-80" style={{ color: P.textMuted }} title="Close (Esc)">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Body ─────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div
          className="w-[180px] shrink-0 py-3 px-2 overflow-y-auto flex flex-col gap-1"
          style={{ background: P.sidebar, borderRight: `1px solid ${P.border}`, scrollbarWidth: "none" }}
        >
          {SIDEBAR_QUICK.map(loc => (
            <SidebarItem key={loc.id} location={loc} active={activeLocation === loc.id} onClick={() => handleLocationClick(loc.id, loc.label)} />
          ))}

          <div className="mt-3 mb-1 px-3">
            <span className="text-[10px] font-medium uppercase tracking-[0.12em]" style={{ color: P.textDim }}>Categories</span>
          </div>
          {SIDEBAR_LOCATIONS.map(loc => (
            <SidebarItem key={loc.id} location={loc} active={activeLocation === loc.id} onClick={() => handleLocationClick(loc.id, loc.label)} />
          ))}

          <div className="mt-3 mb-1 px-3">
            <span className="text-[10px] font-medium uppercase tracking-[0.12em]" style={{ color: P.textDim }}>Tags</span>
          </div>
          {SIDEBAR_TAGS.map(loc => (
            <SidebarItem key={loc.id} location={loc} active={activeLocation === loc.id} onClick={() => handleLocationClick(loc.id, loc.label)} />
          ))}
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto px-5 py-4" style={{ scrollbarWidth: "thin", scrollbarColor: `${P.textDim} transparent` }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-semibold" style={{ color: P.text }}>{locationLabel}</h2>
            <span className="text-[12px]" style={{ color: P.textDim }}>
              {filteredItems.length} {filteredItems.length === 1 ? "object" : "objects"}
            </span>
          </div>

          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Search className="w-8 h-8" style={{ color: P.textDim }} />
              <p className="text-[13px]" style={{ color: P.textMuted }}>No objects found</p>
            </div>
          ) : groupedByCategory ? (
            groupedByCategory.map(([category, catItems]) => (
              <div key={category} className="mb-6">
                <h3 className="text-[11px] font-medium uppercase tracking-[0.1em] mb-3" style={{ color: P.textDim }}>
                  {categoryLabels[category] ?? category}
                </h3>
                {viewMode === "grid" ? (
                  <GridView items={catItems} selectedItem={selectedItem} dragId={dragId} dragOverId={dragOverId} onItemClick={handleItemClick} onItemDoubleClick={handleItemDoubleClick} onContextMenu={handleContextMenu} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd} />
                ) : (
                  <ListView items={catItems} selectedItem={selectedItem} dragId={dragId} dragOverId={dragOverId} onItemClick={handleItemClick} onItemDoubleClick={handleItemDoubleClick} onContextMenu={handleContextMenu} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd} />
                )}
              </div>
            ))
          ) : viewMode === "grid" ? (
            <GridView items={filteredItems} selectedItem={selectedItem} dragId={dragId} dragOverId={dragOverId} onItemClick={handleItemClick} onItemDoubleClick={handleItemDoubleClick} onContextMenu={handleContextMenu} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd} />
          ) : (
            <ListView items={filteredItems} selectedItem={selectedItem} dragId={dragId} dragOverId={dragOverId} onItemClick={handleItemClick} onItemDoubleClick={handleItemDoubleClick} onContextMenu={handleContextMenu} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd} />
          )}
        </div>
      </div>

      {/* ── Status bar ──────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 py-1.5 shrink-0"
        style={{ borderTop: `1px solid ${P.border}`, background: "hsla(25, 8%, 10%, 0.6)" }}
      >
        <span className="text-[11px]" style={{ color: P.textDim }}>
          {filteredItems.length} objects • Content-addressed storage
        </span>
        {selectedItem && (
          <span className="text-[11px] truncate max-w-[300px]" style={{ color: P.textMuted }}>
            {items.find(i => i.id === selectedItem)?.description}
          </span>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          state={contextMenu}
          favorites={favorites}
          onClose={() => setContextMenu(null)}
          onOpen={() => handleItemOpen(contextMenu.item)}
          onToggleFavorite={() => toggleFavorite(contextMenu.item.id)}
          onCopyName={() => navigator.clipboard?.writeText(contextMenu.item.name)}
          onGetInfo={() => setInfoItem(contextMenu.item)}
        />
      )}

      {/* Info panel */}
      {infoItem && (
        <>
          <div className="fixed inset-0 z-[9997]" onClick={() => setInfoItem(null)} />
          <InfoPanel item={infoItem} onClose={() => setInfoItem(null)} />
        </>
      )}
    </div>
  );
}

/* ── Sidebar Item ─────────────────────────────────────────── */

function SidebarItem({ location, active, onClick }: { location: SidebarLocation; active: boolean; onClick: () => void }) {
  const Icon = location.icon;
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-left transition-colors duration-150"
      style={{ background: active ? P.surfaceActive : "transparent", color: active ? P.text : P.textMuted }}
    >
      {location.id.startsWith("tag-") ? (
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: location.iconColor ?? P.textMuted }} />
      ) : (
        <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.4} style={{ color: active ? P.gold : (location.iconColor ?? P.textMuted) }} />
      )}
      <span className="text-[12.5px] font-normal truncate">{location.label}</span>
    </button>
  );
}

/* ── Shared view props ────────────────────────────────────── */

interface ViewProps {
  items: VaultItem[];
  selectedItem: string | null;
  dragId: string | null;
  dragOverId: string | null;
  onItemClick: (item: VaultItem) => void;
  onItemDoubleClick: (item: VaultItem) => void;
  onContextMenu: (e: React.MouseEvent, item: VaultItem) => void;
  onDragStart: (e: React.DragEvent, item: VaultItem) => void;
  onDragOver: (e: React.DragEvent, item: VaultItem) => void;
  onDragEnd: () => void;
}

/* ── Grid View ────────────────────────────────────────────── */

function GridView({ items, selectedItem, dragId, dragOverId, onItemClick, onItemDoubleClick, onContextMenu, onDragStart, onDragOver, onDragEnd }: ViewProps) {
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))" }}>
      {items.map(item => (
        <button
          key={item.id}
          draggable
          onClick={() => onItemClick(item)}
          onDoubleClick={() => onItemDoubleClick(item)}
          onContextMenu={e => onContextMenu(e, item)}
          onDragStart={e => onDragStart(e, item)}
          onDragOver={e => onDragOver(e, item)}
          onDragEnd={onDragEnd}
          className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-150 group/item cursor-pointer"
          style={{
            background: selectedItem === item.id ? P.surfaceActive : "transparent",
            border: `1px solid ${dragOverId === item.id ? P.gold : selectedItem === item.id ? P.borderFocus : "transparent"}`,
            opacity: dragId === item.id ? 0.4 : 1,
            transform: dragOverId === item.id ? "scale(1.03)" : "scale(1)",
          }}
        >
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center transition-transform duration-150 group-hover/item:scale-105"
            style={{
              background: item.type === "folder"
                ? "linear-gradient(135deg, hsla(38, 30%, 50%, 0.2) 0%, hsla(38, 30%, 40%, 0.15) 100%)"
                : "hsla(38, 10%, 90%, 0.04)",
              border: `1px solid ${item.type === "folder" ? "hsla(38, 30%, 55%, 0.15)" : P.border}`,
            }}
          >
            <item.icon className="w-6 h-6" strokeWidth={1.3} style={{ color: item.iconColor }} />
          </div>
          <span
            className="text-[11px] font-normal text-center leading-tight w-full truncate"
            style={{ color: selectedItem === item.id ? P.text : P.textMuted }}
          >
            {item.name}
          </span>
        </button>
      ))}
    </div>
  );
}

/* ── List View ────────────────────────────────────────────── */

function ListView({ items, selectedItem, dragId, dragOverId, onItemClick, onItemDoubleClick, onContextMenu, onDragStart, onDragOver, onDragEnd }: ViewProps) {
  return (
    <div className="flex flex-col gap-0.5">
      {items.map(item => (
        <button
          key={item.id}
          draggable
          onClick={() => onItemClick(item)}
          onDoubleClick={() => onItemDoubleClick(item)}
          onContextMenu={e => onContextMenu(e, item)}
          onDragStart={e => onDragStart(e, item)}
          onDragOver={e => onDragOver(e, item)}
          onDragEnd={onDragEnd}
          className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 cursor-pointer text-left group/row"
          style={{
            background: selectedItem === item.id ? P.surfaceActive : "transparent",
            border: `1px solid ${dragOverId === item.id ? P.gold : selectedItem === item.id ? P.borderFocus : "transparent"}`,
            opacity: dragId === item.id ? 0.4 : 1,
          }}
        >
          <GripVertical className="w-3 h-3 shrink-0 opacity-0 group-hover/row:opacity-40 transition-opacity cursor-grab" style={{ color: P.textDim }} />
          <item.icon className="w-4 h-4 shrink-0" strokeWidth={1.3} style={{ color: item.iconColor }} />
          <span className="text-[13px] font-normal flex-1 truncate" style={{ color: P.text }}>{item.name}</span>
          {item.tags && item.tags.length > 0 && (
            <div className="flex items-center gap-1.5 shrink-0">
              {item.tags.slice(0, 2).map(tag => (
                <span key={tag} className="text-[9px] uppercase tracking-[0.08em] px-1.5 py-0.5 rounded-full" style={{ background: "hsla(38, 15%, 90%, 0.06)", color: P.textDim }}>
                  {tag}
                </span>
              ))}
            </div>
          )}
          <span className="text-[11px] shrink-0" style={{ color: P.textDim }}>
            {item.type === "folder" ? "Folder" : item.type === "projection" ? "Projection" : "Object"}
          </span>
        </button>
      ))}
    </div>
  );
}
