/**
 * Sovereign Bus — Shared Method Manifest.
 * ═════════════════════════════════════════════════════════════════
 *
 * Single source of truth for every ns/op registered on the bus.
 * Both the client-side bus registrations and the gateway edge function
 * reference this manifest, ensuring they can never drift apart.
 *
 * @version 1.0.0
 */

export interface ManifestEntry {
  /** Full method key: "ns/op" */
  method: string;
  /** Architecture layer 0–3 */
  layer: 0 | 1 | 2 | 3;
  /** If true, must go through remote gateway */
  remote: boolean;
  /** Human-readable description */
  description: string;
}

export interface ManifestModule {
  ns: string;
  label: string;
  layer: 0 | 1 | 2 | 3;
  remote: boolean;
  /** Kernel function this module traces to (null = presentation/meta) */
  kernelFunction: string | null;
  operations: ManifestEntry[];
}

/**
 * The canonical bus manifest — every method the system supports.
 */
export const BUS_MANIFEST: {
  version: string;
  protocol: string;
  engine: string;
  modules: ManifestModule[];
  totalMethods: number;
} = (() => {
  const modules: ManifestModule[] = [
    // ── Layer 0: Engine (pure computation, zero deps) ─────────────
    {
      ns: "kernel",
      label: "UOR Engine",
      layer: 0,
      remote: false,
      kernelFunction: "encode",
      operations: [
        { method: "kernel/encode", layer: 0, remote: false, description: "Content-address any object via URDNA2015 → SHA-256 → IPv6 ULA" },
        { method: "kernel/decode", layer: 0, remote: false, description: "Verify a content-addressed object against its expected derivation ID" },
        { method: "kernel/verify", layer: 0, remote: false, description: "Alias for decode — verify integrity of content-addressed data" },
        { method: "kernel/derive", layer: 0, remote: false, description: "Derive canonical identity (derivation ID, CID, IPv6) from content" },
        { method: "kernel/project", layer: 0, remote: false, description: "Atomic engine→graph bridge: encode + project into knowledge graph" },
        { method: "kernel/ring", layer: 0, remote: false, description: "WASM-accelerated ring arithmetic in Z/(2^n)Z" },
        { method: "kernel/manifest", layer: 0, remote: false, description: "Return the full bus manifest" },
      ],
    },
    {
      ns: "identity",
      label: "UOR Identity",
      layer: 0,
      remote: false,
      kernelFunction: "encode",
      operations: [
        { method: "identity/derive", layer: 0, remote: false, description: "Derive a full UOR identity from content" },
        { method: "identity/verify", layer: 0, remote: false, description: "Verify an identity against content" },
        { method: "identity/buildFull", layer: 0, remote: false, description: "Build complete identity with all four forms (hex, CID, braille, IPv6)" },
      ],
    },
    {
      ns: "morphism",
      label: "Morphisms",
      layer: 0,
      remote: false,
      kernelFunction: "compose",
      operations: [
        { method: "morphism/apply", layer: 0, remote: false, description: "Apply a morphism transformation to content" },
        { method: "morphism/compose", layer: 0, remote: false, description: "Compose two morphisms into a single transformation" },
        { method: "morphism/verify", layer: 0, remote: false, description: "Verify that a morphism preserves required properties" },
      ],
    },
    {
      ns: "verify",
      label: "Verification",
      layer: 0,
      remote: false,
      kernelFunction: "decode",
      operations: [
        { method: "verify/proof", layer: 0, remote: false, description: "Generate a verification proof for content" },
        { method: "verify/check", layer: 0, remote: false, description: "Check a verification proof" },
        { method: "verify/receipt", layer: 0, remote: false, description: "Generate a verification receipt" },
      ],
    },

    // ── Layer 1: Knowledge Graph (pluggable storage) ──────────────
    {
      ns: "graph",
      label: "Knowledge Graph",
      layer: 1,
      remote: false,
      kernelFunction: "store",
      operations: [
        { method: "graph/put", layer: 1, remote: false, description: "Insert or update a node or edge" },
        { method: "graph/get", layer: 1, remote: false, description: "Retrieve a node by UOR address or edge by ID" },
        { method: "graph/query", layer: 1, remote: false, description: "Query nodes/edges by pattern" },
        { method: "graph/similar", layer: 1, remote: false, description: "Find semantically similar nodes" },
        { method: "graph/stats", layer: 1, remote: false, description: "Get graph statistics" },
        { method: "graph/verify", layer: 1, remote: false, description: "Verify self-consistency of the graph" },
        { method: "graph/compress", layer: 1, remote: false, description: "Deduplicate nodes with identical canonical forms" },
        { method: "graph/summary", layer: 1, remote: false, description: "Human-readable graph summary" },
      ],
    },
    {
      ns: "uns",
      label: "Name Service",
      layer: 1,
      remote: false,
      kernelFunction: "resolve",
      operations: [
        { method: "uns/resolve", layer: 1, remote: false, description: "Resolve a UNS name to its canonical identity" },
        { method: "uns/publish", layer: 1, remote: false, description: "Publish a name binding to the name service" },
        { method: "uns/computeId", layer: 1, remote: false, description: "Compute the UOR identity for a name" },
      ],
    },
    {
      ns: "resolver",
      label: "Resolver",
      layer: 1,
      remote: false,
      kernelFunction: "resolve",
      operations: [
        { method: "resolver/resolve", layer: 1, remote: false, description: "Resolve a UOR address to its content" },
        { method: "resolver/reverse", layer: 1, remote: false, description: "Reverse-resolve content to its UOR address" },
      ],
    },
    {
      ns: "observable",
      label: "Observable",
      layer: 1,
      remote: false,
      kernelFunction: "observe",
      operations: [
        { method: "observable/emit", layer: 1, remote: false, description: "Emit an event on the observable bus" },
        { method: "observable/subscribe", layer: 1, remote: false, description: "Subscribe to events on the observable bus" },
        { method: "observable/snapshot", layer: 1, remote: false, description: "Get a snapshot of current observable state" },
      ],
    },
    {
      ns: "trace",
      label: "Trace",
      layer: 1,
      remote: false,
      kernelFunction: "seal",
      operations: [
        { method: "trace/record", layer: 1, remote: false, description: "Record a trace entry" },
        { method: "trace/verify", layer: 1, remote: false, description: "Verify a trace chain" },
        { method: "trace/replay", layer: 1, remote: false, description: "Replay a recorded trace" },
      ],
    },
    {
      ns: "vault",
      label: "Sovereign Vault",
      layer: 1,
      remote: false,
      kernelFunction: "encode",
      operations: [
        { method: "vault/encrypt", layer: 1, remote: false, description: "Encrypt content with sovereign key" },
        { method: "vault/decrypt", layer: 1, remote: false, description: "Decrypt content with sovereign key" },
        { method: "vault/store", layer: 1, remote: false, description: "Store encrypted content in the vault" },
      ],
    },
    {
      ns: "continuity",
      label: "Continuity",
      layer: 1,
      remote: true,
      kernelFunction: "seal",
      operations: [
        { method: "continuity/save", layer: 1, remote: true, description: "Save session state for continuity" },
        { method: "continuity/restore", layer: 1, remote: true, description: "Restore session state" },
        { method: "continuity/chain", layer: 1, remote: true, description: "Chain session states" },
      ],
    },
    {
      ns: "cert",
      label: "Certificates",
      layer: 1,
      remote: false,
      kernelFunction: "seal",
      operations: [
        { method: "cert/issue", layer: 1, remote: false, description: "Issue a UOR certificate" },
        { method: "cert/verify", layer: 1, remote: false, description: "Verify a UOR certificate" },
        { method: "cert/chain", layer: 1, remote: false, description: "Build a certificate chain" },
        { method: "cert/revoke", layer: 1, remote: false, description: "Revoke a certificate" },
      ],
    },

    // ── Layer 2: Bus / API Surface (remote-capable) ───────────────
    {
      ns: "oracle",
      label: "Oracle",
      layer: 2,
      remote: true,
      kernelFunction: "resolve",
      operations: [
        { method: "oracle/ask", layer: 2, remote: true, description: "Ask the oracle a question" },
      ],
    },
    {
      ns: "store",
      label: "Content Store",
      layer: 2,
      remote: true,
      kernelFunction: "store",
      operations: [
        { method: "store/write", layer: 2, remote: true, description: "Write content to decentralized storage" },
        { method: "store/read", layer: 2, remote: true, description: "Read content from decentralized storage" },
      ],
    },
    {
      ns: "scrape",
      label: "Web Scraper",
      layer: 2,
      remote: true,
      kernelFunction: "resolve",
      operations: [
        { method: "scrape/url", layer: 2, remote: true, description: "Scrape a URL for content" },
        { method: "scrape/search", layer: 2, remote: true, description: "Search the web" },
      ],
    },
    {
      ns: "wolfram",
      label: "Wolfram Alpha",
      layer: 2,
      remote: true,
      kernelFunction: "compose",
      operations: [
        { method: "wolfram/compute", layer: 2, remote: true, description: "Compute via Wolfram Alpha" },
      ],
    },
    {
      ns: "audio",
      label: "Audio",
      layer: 2,
      remote: true,
      kernelFunction: "encode",
      operations: [
        { method: "audio/tts", layer: 2, remote: true, description: "Text-to-speech synthesis" },
        { method: "audio/transcribe", layer: 2, remote: true, description: "Transcribe audio to text" },
        { method: "audio/stream", layer: 2, remote: true, description: "Stream audio content" },
      ],
    },
    {
      ns: "social",
      label: "Social",
      layer: 2,
      remote: true,
      kernelFunction: "observe",
      operations: [
        { method: "social/send", layer: 2, remote: true, description: "Send a social message" },
        { method: "social/webhook", layer: 2, remote: true, description: "Handle incoming social webhook" },
      ],
    },
    {
      ns: "sparql",
      label: "SPARQL",
      layer: 1,
      remote: true,
      kernelFunction: "store",
      operations: [
        { method: "sparql/query", layer: 1, remote: true, description: "Execute a SPARQL query" },
        { method: "sparql/update", layer: 1, remote: true, description: "Execute a SPARQL update" },
      ],
    },
    {
      ns: "mcp",
      label: "MCP Gateway",
      layer: 2,
      remote: true,
      kernelFunction: "compose",
      operations: [
        { method: "mcp/connect", layer: 2, remote: true, description: "Connect to an MCP server" },
        { method: "mcp/call", layer: 2, remote: true, description: "Call an MCP tool" },
        { method: "mcp/discover", layer: 2, remote: true, description: "Discover available MCP tools" },
      ],
    },

    // ── Layer 2 local modules ─────────────────────────────────────
    {
      ns: "data",
      label: "Data Engine",
      layer: 2,
      remote: false,
      kernelFunction: "compose",
      operations: [
        { method: "data/ingest", layer: 2, remote: false, description: "Ingest data into the data engine" },
        { method: "data/transform", layer: 2, remote: false, description: "Transform data" },
        { method: "data/export", layer: 2, remote: false, description: "Export data" },
      ],
    },
    {
      ns: "blueprint",
      label: "Blueprint",
      layer: 2,
      remote: false,
      kernelFunction: "compose",
      operations: [
        { method: "blueprint/create", layer: 2, remote: false, description: "Create a lens blueprint" },
        { method: "blueprint/apply", layer: 2, remote: false, description: "Apply a lens blueprint" },
        { method: "blueprint/list", layer: 2, remote: false, description: "List available blueprints" },
      ],
    },

    // ── Introspection (meta) ──────────────────────────────────────
    {
      ns: "rpc",
      label: "Introspection",
      layer: 2,
      remote: false,
      kernelFunction: null,
      operations: [
        { method: "rpc/discover", layer: 2, remote: false, description: "Discover all registered methods" },
        { method: "rpc/manifest", layer: 2, remote: false, description: "Return the full typed bus manifest" },
      ],
    },
  ];

  const totalMethods = modules.reduce((sum, m) => sum + m.operations.length, 0);

  return {
    version: "2.0.0",
    protocol: "JSON-RPC 2.0",
    engine: "UOR Foundation v2.0.0 (WASM + TypeScript)",
    modules,
    totalMethods,
  };
})();

/** Get all remote methods from the manifest */
export function getRemoteMethods(): ManifestEntry[] {
  return BUS_MANIFEST.modules.flatMap((m) => m.operations.filter((o) => o.remote));
}

/** Get all local methods from the manifest */
export function getLocalMethods(): ManifestEntry[] {
  return BUS_MANIFEST.modules.flatMap((m) => m.operations.filter((o) => !o.remote));
}

/** Check if a method is in the manifest */
export function isInManifest(method: string): boolean {
  return BUS_MANIFEST.modules.some((m) => m.operations.some((o) => o.method === method));
}

// ── Manifest Traceability Validation ────────────────────────────────────

export interface ManifestTraceabilityResult {
  /** All modules trace to valid kernel functions or are explicitly null (meta). */
  readonly isTraceable: boolean;
  /** Modules whose kernelFunction is not one of the 7 Fano primitives and not null. */
  readonly orphans: { ns: string; label: string; invalidKernelFunction: string }[];
  /** Per-kernel-function module count. */
  readonly coverage: { kernelFunction: string; moduleCount: number }[];
  /** Modules explicitly tagged as meta (kernelFunction=null). */
  readonly metaModules: string[];
}

/**
 * Validate that every bus module traces to one of the 7 kernel primitives.
 * Modules with kernelFunction=null are meta/introspection (exempt).
 * Any module with a non-null kernelFunction that isn't one of the 7 is an orphan.
 */
export function validateManifestTraceability(): ManifestTraceabilityResult {
  const VALID = new Set(["encode", "decode", "compose", "store", "resolve", "observe", "seal"]);
  const coverageMap = new Map<string, number>();
  const orphans: ManifestTraceabilityResult["orphans"] = [];
  const metaModules: string[] = [];

  for (const mod of BUS_MANIFEST.modules) {
    if (mod.kernelFunction === null) {
      metaModules.push(mod.ns);
      continue;
    }
    if (!VALID.has(mod.kernelFunction)) {
      orphans.push({ ns: mod.ns, label: mod.label, invalidKernelFunction: mod.kernelFunction });
      continue;
    }
    coverageMap.set(mod.kernelFunction, (coverageMap.get(mod.kernelFunction) ?? 0) + 1);
  }

  const coverage = Array.from(coverageMap.entries()).map(([kernelFunction, moduleCount]) => ({
    kernelFunction,
    moduleCount,
  }));

  return {
    isTraceable: orphans.length === 0,
    orphans,
    coverage,
    metaModules,
  };
}
