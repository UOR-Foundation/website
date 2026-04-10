import { lazy, type ComponentType } from "react";
import {
  Search, Sparkles, BookOpen, MessageCircle, Shield, Activity, FolderOpen,
  Network, CalendarDays, LayoutGrid, Wallet, Play, PackageOpen,
} from "lucide-react";
import type { OsCategory } from "./os-taxonomy";

export interface DesktopApp {
  id: string;
  label: string;
  icon: ComponentType<any>;
  component: React.LazyExoticComponent<ComponentType<any>>;
  defaultSize?: { w: number; h: number };
  color: string;
  category: OsCategory;
  hidden?: boolean;
  /** Short description for App Hub cards. */
  description: string;
  /** Keywords for Spotlight search boosting. */
  keywords: string[];
}

export const DESKTOP_APPS: DesktopApp[] = [
  {
    id: "search",
    label: "Search",
    icon: Search,
    component: lazy(() => import("@/modules/oracle/pages/ResolvePage")),
    defaultSize: { w: 960, h: 620 },
    color: "hsl(210 80% 60%)",
    category: "RESOLVE",
    hidden: true,
    description: "Full-text and semantic search across your knowledge base",
    keywords: ["search", "find", "lookup", "query"],
  },
  {
    id: "oracle",
    label: "Oracle",
    icon: Sparkles,
    component: lazy(() => import("@/modules/oracle/pages/OraclePage")),
    defaultSize: { w: 780, h: 580 },
    color: "hsl(270 70% 65%)",
    category: "RESOLVE",
    description: "AI-powered knowledge assistant with reasoning proofs",
    keywords: ["ai", "ask", "chat", "assistant", "oracle", "gpt", "reasoning"],
  },
  {
    id: "library",
    label: "Library",
    icon: BookOpen,
    component: lazy(() => import("@/modules/oracle/pages/LibraryPage")),
    defaultSize: { w: 900, h: 600 },
    color: "hsl(35 90% 55%)",
    category: "RESOLVE",
    description: "Browse and manage your curated book summaries",
    keywords: ["books", "library", "reading", "summaries", "notes"],
  },
  {
    id: "messenger",
    label: "Messenger",
    icon: MessageCircle,
    component: lazy(() => import("@/modules/messenger/pages/MessengerPage")),
    defaultSize: { w: 700, h: 560 },
    color: "hsl(160 60% 50%)",
    category: "EXCHANGE",
    description: "Sovereign encrypted messaging with bridge support",
    keywords: ["chat", "message", "send", "messenger", "telegram", "whatsapp", "dm"],
  },
  {
    id: "vault",
    label: "Vault",
    icon: Shield,
    component: lazy(() => import("@/modules/identity/pages/ProjectUorIdentity")),
    defaultSize: { w: 720, h: 520 },
    color: "hsl(200 70% 55%)",
    category: "IDENTITY",
    description: "Manage your sovereign identity and cryptographic proofs",
    keywords: ["identity", "vault", "keys", "proof", "trust", "certificate"],
  },
  {
    id: "system-monitor",
    label: "System Monitor",
    icon: Activity,
    component: lazy(() => import("@/modules/boot/SystemMonitorApp")),
    defaultSize: { w: 1020, h: 680 },
    color: "hsl(142 60% 50%)",
    category: "OBSERVE",
    description: "Real-time metrics, traces, and system health",
    keywords: ["monitor", "system", "metrics", "performance", "health", "status"],
  },
  {
    id: "files",
    label: "Files",
    icon: FolderOpen,
    component: lazy(() => import("@/modules/sovereign-vault/components/VaultPanel")),
    defaultSize: { w: 800, h: 560 },
    color: "hsl(45 80% 55%)",
    category: "STRUCTURE",
    description: "Encrypted file storage and content-addressed vault",
    keywords: ["files", "documents", "upload", "storage", "folder", "vault"],
  },
  {
    id: "graph-explorer",
    label: "Graph Explorer",
    icon: Network,
    component: lazy(() => import("@/modules/knowledge-graph/components/SovereignGraphExplorer")),
    defaultSize: { w: 1100, h: 720 },
    color: "hsl(160 70% 45%)",
    category: "OBSERVE",
    description: "Visual knowledge graph with SPARQL and Cypher queries",
    keywords: ["graph", "knowledge", "network", "nodes", "edges", "sparql", "cypher", "explore"],
  },
  {
    id: "daily-notes",
    label: "Daily Notes",
    icon: CalendarDays,
    component: lazy(() => import("@/modules/oracle/pages/DailyNotesPage")),
    defaultSize: { w: 860, h: 640 },
    color: "hsl(24 85% 58%)",
    category: "STRUCTURE",
    description: "Journaling and daily reflection with auto-linking",
    keywords: ["notes", "journal", "daily", "diary", "write", "reflect", "calendar"],
  },
  {
    id: "app-hub",
    label: "Apps",
    icon: LayoutGrid,
    component: lazy(() => import("@/modules/desktop/components/AppHub")),
    defaultSize: { w: 720, h: 560 },
    color: "hsl(220 60% 55%)",
    category: "RESOLVE",
    description: "Browse and launch all available applications",
    keywords: ["apps", "hub", "all", "discover", "catalog", "launch"],
  },
  {
    id: "media",
    label: "Media",
    icon: Play,
    component: lazy(() => import("@/modules/media/components/MediaPlayer")),
    defaultSize: { w: 960, h: 640 },
    color: "hsl(350 75% 60%)",
    category: "RESOLVE",
    description: "Stream curated high-quality video content",
    keywords: ["video", "watch", "stream", "music", "youtube", "play", "media", "tv"],
  },
  {
    id: "takeout",
    label: "Takeout",
    icon: PackageOpen,
    component: lazy(() => import("@/modules/takeout/components/SovereignTakeout")),
    defaultSize: { w: 880, h: 640 },
    color: "hsl(35 80% 55%)",
    category: "STRUCTURE",
    description: "Export, import, and migrate your entire sovereign data set",
    keywords: ["takeout", "export", "import", "migrate", "backup", "portability", "data", "sovereignty"],
  },
];

export function getApp(id: string): DesktopApp | undefined {
  return DESKTOP_APPS.find(a => a.id === id);
}
