/**
 * Sovereign Compose — Static Blueprints.
 * ═════════════════════════════════════════════════════════════════
 *
 * The 12 existing desktop applications declared as AppBlueprints.
 * Each blueprint explicitly lists the bus operations it requires,
 * the namespace permissions it needs, and any morphisms it exposes.
 *
 * v2: annotated with fastPath, autoStart, and callBudget per the
 * Unikraft-inspired hardening plan.
 *
 * @version 2.0.0
 */

import type { AppBlueprint } from "./types";

const CTX = "https://uor.foundation/contexts/compose-v1.jsonld" as const;
const TYPE = "uor:AppBlueprint" as const;

export const STATIC_BLUEPRINTS: AppBlueprint[] = [
  // ── RESOLVE ─────────────────────────────────────────────────────────────

  {
    "@context": CTX,
    "@type": TYPE,
    name: "search",
    version: "1.0.0",
    requires: ["resolve/name", "graph/query", "kernel/derive"],
    permissions: ["resolve/", "graph/", "kernel/"],
    morphisms: [],
    fastPath: ["graph/query", "resolve/name"],
    autoStart: false, // lazy — started on first search
    ui: { component: "@/modules/oracle/pages/ResolvePage", lazy: true },
    defaultSize: { w: 960, h: 620 },
    color: "hsl(210 80% 60%)",
    category: "RESOLVE",
    description: "Full-text and semantic search across your knowledge base",
    keywords: ["search", "find", "lookup", "query"],
    iconName: "Search",
    resources: { callBudget: { maxPerSecond: 50 } },
    hidden: true,
  },
  {
    "@context": CTX,
    "@type": TYPE,
    name: "oracle",
    version: "1.0.0",
    requires: [
      "oracle/ask", "oracle/reason", "kernel/derive", "graph/query",
      "cert/issue", "store/put", "store/get",
    ],
    permissions: ["oracle/", "kernel/", "graph/", "cert/", "store/"],
    morphisms: [
      { method: "oracle/ask", description: "Ask the AI oracle a question" },
      { method: "oracle/reason", description: "Run a reasoning proof" },
    ],
    fastPath: ["graph/query", "store/get"],
    ui: { component: "@/modules/oracle/pages/OraclePage", lazy: true },
    defaultSize: { w: 780, h: 580 },
    color: "hsl(270 70% 65%)",
    category: "RESOLVE",
    description: "AI-powered knowledge assistant with reasoning proofs",
    keywords: ["ai", "ask", "chat", "assistant", "oracle", "gpt", "reasoning"],
    iconName: "Sparkles",
    resources: { workers: 1, callBudget: { maxPerSecond: 30 } },
  },
  {
    "@context": CTX,
    "@type": TYPE,
    name: "library",
    version: "1.0.0",
    requires: ["store/get", "store/list", "kernel/derive"],
    permissions: ["store/", "kernel/"],
    morphisms: [],
    fastPath: ["store/get", "store/list"],
    ui: { component: "@/modules/oracle/pages/LibraryPage", lazy: true },
    defaultSize: { w: 900, h: 600 },
    color: "hsl(35 90% 55%)",
    category: "RESOLVE",
    description: "Browse and manage your curated book summaries",
    keywords: ["books", "library", "reading", "summaries", "notes"],
    iconName: "BookOpen",
    resources: {},
  },
  {
    "@context": CTX,
    "@type": TYPE,
    name: "app-hub",
    version: "2.0.0",
    requires: [],
    permissions: [],
    morphisms: [],
    autoStart: false,
    ui: { component: "@/modules/desktop/components/AppHub", lazy: true },
    defaultSize: { w: 840, h: 620 },
    color: "hsl(220 60% 55%)",
    category: "RESOLVE",
    description: "Discover, build, and run applications — CNCF-compatible infrastructure",
    keywords: ["apps", "hub", "store", "discover", "catalog", "launch", "cncf", "developer", "infrastructure"],
    iconName: "LayoutGrid",
    resources: {},
  },
  {
    "@context": CTX,
    "@type": TYPE,
    name: "media",
    version: "1.0.0",
    requires: ["store/get", "stream/play"],
    permissions: ["store/", "stream/"],
    morphisms: [],
    autoStart: false, // lazy — heavy; only when user opens media
    ui: { component: "@/modules/media/components/MediaPlayer", lazy: true },
    defaultSize: { w: 960, h: 640 },
    color: "hsl(350 75% 60%)",
    category: "RESOLVE",
    description: "Stream curated high-quality video content",
    keywords: ["video", "watch", "stream", "music", "youtube", "play", "media", "tv"],
    iconName: "Play",
    resources: { workers: 1 },
  },

  // ── EXCHANGE ────────────────────────────────────────────────────────────

  {
    "@context": CTX,
    "@type": TYPE,
    name: "messenger",
    version: "1.0.0",
    requires: [
      "conduit/send", "conduit/receive", "cert/issue", "cert/verify",
      "vault/encrypt", "vault/decrypt", "store/put", "store/get",
    ],
    permissions: ["conduit/", "cert/", "vault/", "store/"],
    morphisms: [
      { method: "conduit/send", description: "Send an encrypted message" },
    ],
    fastPath: ["store/get", "cert/verify"],
    ui: { component: "@/modules/messenger/pages/MessengerPage", lazy: true },
    defaultSize: { w: 700, h: 560 },
    color: "hsl(160 60% 50%)",
    category: "EXCHANGE",
    description: "Sovereign encrypted messaging with bridge support",
    keywords: ["chat", "message", "send", "messenger", "telegram", "whatsapp", "dm"],
    iconName: "MessageCircle",
    resources: { workers: 1, callBudget: { maxPerSecond: 100 } },
  },

  // ── IDENTITY ────────────────────────────────────────────────────────────

  {
    "@context": CTX,
    "@type": TYPE,
    name: "vault",
    version: "1.0.0",
    requires: [
      "kernel/derive", "cert/issue", "cert/verify",
      "vault/encrypt", "vault/decrypt", "ring/neg",
    ],
    permissions: ["kernel/", "cert/", "vault/", "ring/"],
    morphisms: [
      { method: "cert/issue", description: "Issue a UOR certificate" },
      { method: "cert/verify", description: "Verify a UOR certificate" },
    ],
    fastPath: ["kernel/derive", "ring/neg"],
    ui: { component: "@/modules/identity/pages/ProjectUorIdentity", lazy: true },
    defaultSize: { w: 720, h: 520 },
    color: "hsl(200 70% 55%)",
    category: "IDENTITY",
    description: "Manage your sovereign identity and cryptographic proofs",
    keywords: ["identity", "vault", "keys", "proof", "trust", "certificate"],
    iconName: "Shield",
    resources: { callBudget: { maxPerSecond: 40 } },
  },

  // ── OBSERVE ─────────────────────────────────────────────────────────────

  {
    "@context": CTX,
    "@type": TYPE,
    name: "system-monitor",
    version: "1.0.0",
    requires: ["observable/health", "observable/metrics"],
    permissions: ["observable/", "kernel/", "graph/"],
    morphisms: [],
    autoStart: false, // lazy — diagnostic tool
    ui: { component: "@/modules/boot/SystemMonitorApp", lazy: true },
    defaultSize: { w: 1020, h: 680 },
    color: "hsl(142 60% 50%)",
    category: "OBSERVE",
    description: "Real-time metrics, traces, and system health",
    keywords: ["monitor", "system", "metrics", "performance", "health", "status"],
    iconName: "Activity",
    resources: {},
  },
  {
    "@context": CTX,
    "@type": TYPE,
    name: "graph-explorer",
    version: "1.0.0",
    requires: ["graph/query", "graph/insert", "graph/sparql", "graph/cypher"],
    permissions: ["graph/"],
    morphisms: [
      { method: "graph/query", description: "Query the knowledge graph" },
    ],
    fastPath: ["graph/query", "graph/sparql"],
    ui: { component: "@/modules/knowledge-graph/components/SovereignGraphExplorer", lazy: true },
    defaultSize: { w: 1100, h: 720 },
    color: "hsl(160 70% 45%)",
    category: "OBSERVE",
    description: "Visual knowledge graph with SPARQL and Cypher queries",
    keywords: ["graph", "knowledge", "network", "nodes", "edges", "sparql", "cypher", "explore"],
    iconName: "Network",
    resources: { workers: 1, requiresSAB: true, callBudget: { maxPerSecond: 200 } },
  },

  // ── STRUCTURE ───────────────────────────────────────────────────────────

  {
    "@context": CTX,
    "@type": TYPE,
    name: "files",
    version: "1.0.0",
    requires: [
      "store/put", "store/get", "store/list", "store/delete",
      "vault/encrypt", "vault/decrypt", "kernel/derive",
    ],
    permissions: ["store/", "vault/", "kernel/"],
    morphisms: [],
    fastPath: ["store/get", "store/list"],
    ui: { component: "@/modules/sovereign-vault/components/VaultPanel", lazy: true },
    defaultSize: { w: 800, h: 560 },
    color: "hsl(45 80% 55%)",
    category: "STRUCTURE",
    description: "Encrypted file storage and content-addressed vault",
    keywords: ["files", "documents", "upload", "storage", "folder", "vault"],
    iconName: "FolderOpen",
    resources: {},
  },
  {
    "@context": CTX,
    "@type": TYPE,
    name: "daily-notes",
    version: "1.0.0",
    requires: ["store/put", "store/get", "store/list", "kernel/derive", "graph/insert"],
    permissions: ["store/", "kernel/", "graph/"],
    morphisms: [],
    fastPath: ["store/get", "store/list"],
    ui: { component: "@/modules/oracle/pages/DailyNotesPage", lazy: true },
    defaultSize: { w: 860, h: 640 },
    color: "hsl(24 85% 58%)",
    category: "STRUCTURE",
    description: "Journaling and daily reflection with auto-linking",
    keywords: ["notes", "journal", "daily", "diary", "write", "reflect", "calendar"],
    iconName: "CalendarDays",
    resources: {},
  },
  {
    "@context": CTX,
    "@type": TYPE,
    name: "takeout",
    version: "1.0.0",
    requires: [
      "takeout/export", "takeout/import", "store/list", "store/get",
      "kernel/derive",
    ],
    permissions: ["takeout/", "store/", "kernel/"],
    morphisms: [
      { method: "takeout/export", description: "Export sovereign data" },
      { method: "takeout/import", description: "Import sovereign data" },
    ],
    autoStart: false, // lazy — infrequent operation
    ui: { component: "@/modules/takeout/components/SovereignTakeout", lazy: true },
    defaultSize: { w: 880, h: 640 },
    color: "hsl(35 80% 55%)",
    category: "STRUCTURE",
    description: "Export, import, and migrate your entire sovereign data set",
    keywords: ["takeout", "export", "import", "migrate", "backup", "portability", "data", "sovereignty"],
    iconName: "PackageOpen",
    resources: {},
  },

  // ── TIME MACHINE ───────────────────────────────────────────────────────

  {
    "@context": CTX,
    "@type": TYPE,
    name: "time-machine",
    version: "1.0.0",
    requires: [
      "store/get", "store/put", "store/list",
      "graph/query", "kernel/derive",
    ],
    permissions: ["store/", "graph/", "kernel/"],
    morphisms: [
      { method: "store/put", description: "Save system checkpoint" },
      { method: "store/get", description: "Restore system checkpoint" },
    ],
    autoStart: false,
    ui: { component: "@/modules/time-machine/pages/TimeMachinePage", lazy: true },
    defaultSize: { w: 920, h: 600 },
    color: "hsl(200 75% 55%)",
    category: "OBSERVE",
    description: "Continuous auto-save, rollback, and fork your entire system state",
    keywords: ["time", "machine", "checkpoint", "save", "restore", "rollback", "fork", "undo", "history", "backup"],
    iconName: "Clock",
    resources: {},
  },
];
