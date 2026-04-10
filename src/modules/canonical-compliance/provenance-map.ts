/**
 * Canonical Compliance — Provenance Map
 * ═════════════════════════════════════════════════════════════════
 *
 * Machine-readable registry mapping every module's exports
 * to their UOR atom lineage. This is the single source of truth
 * for categorical provenance across the entire system.
 *
 * @version 1.0.0
 */

export interface ProvenanceEntry {
  module: string;
  export: string;
  atoms: string[];          // references to UorAtom.id
  pipeline: string;         // human-readable derivation chain
  grounded: boolean;        // computed at audit time
}

export interface ModuleProvenance {
  module: string;
  description: string;
  exports: Omit<ProvenanceEntry, "module" | "grounded">[];
}

/**
 * PROVENANCE_REGISTRY — complete mapping of all system modules
 * to their UOR atom provenance chains.
 */
export const PROVENANCE_REGISTRY: ModuleProvenance[] = [
  // ── Layer 0: Engine ──────────────────────────────────────────
  {
    module: "ring-core",
    description: "Z/(2^n)Z algebraic foundation",
    exports: [
      { export: "UORRing",              atoms: ["alg:ring", "op:add", "op:mul", "op:neg", "op:xor"],   pipeline: "ring-init → op-table → verify-identities" },
      { export: "Q0/Q1/Q2/Q3",         atoms: ["alg:ring", "op:add", "op:mul"],                       pipeline: "quantum-level → ring-projection" },
      { export: "verifyQ0Exhaustive",   atoms: ["alg:ring", "type:proof"],                             pipeline: "enumerate → compute → assert-closure" },
      { export: "canonicalize",         atoms: ["pipe:urdna2015", "pipe:sha256"],                      pipeline: "normalize → hash → derive-id" },
    ],
  },
  {
    module: "uns/core/address",
    description: "Content-addressed identity generation",
    exports: [
      { export: "buildIdentity",        atoms: ["type:address", "pipe:urdna2015", "pipe:sha256", "pipe:cid", "pipe:ipv6", "pipe:braille"], pipeline: "canonicalize → sha256 → cid → ipv6 → braille" },
      { export: "computeCid",           atoms: ["type:address", "pipe:sha256", "pipe:cid"],           pipeline: "hash → multihash-wrap" },
      { export: "sha256",               atoms: ["pipe:sha256"],                                        pipeline: "bytes → digest" },
      { export: "formatIpv6",           atoms: ["pipe:ipv6", "type:address"],                          pipeline: "bytes → colon-hex" },
      { export: "encodeGlyph",          atoms: ["pipe:braille", "type:address"],                       pipeline: "bytes → braille-string" },
    ],
  },
  {
    module: "uns/core/ring",
    description: "R₈ ring operations",
    exports: [
      { export: "neg",                  atoms: ["op:neg", "alg:ring"],                                 pipeline: "byte → additive-inverse" },
      { export: "bnot",                 atoms: ["op:bnot", "alg:ring"],                                pipeline: "byte → bitwise-complement" },
      { export: "succ",                 atoms: ["op:succ", "alg:ring"],                                pipeline: "byte → +1-mod-256" },
      { export: "pred",                 atoms: ["op:pred", "alg:ring"],                                pipeline: "byte → -1-mod-256" },
    ],
  },
  {
    module: "uns/core/identity",
    description: "Canonical identity verification",
    exports: [
      { export: "singleProofHash",      atoms: ["pipe:urdna2015", "pipe:sha256", "type:proof"],        pipeline: "urdna2015 → sha256 → proof-witness" },
      { export: "verifyCanonical",       atoms: ["type:proof", "type:address", "pipe:sha256"],          pipeline: "recompute → compare → assert" },
    ],
  },
  {
    module: "uns/core/keypair",
    description: "PQC keypair and signing",
    exports: [
      { export: "generateKeypair",      atoms: ["type:address", "type:certificate", "pipe:sha256"],    pipeline: "dilithium-keygen → derive-address" },
      { export: "signRecord",           atoms: ["type:certificate", "type:proof"],                     pipeline: "serialize → sign → attach-proof" },
      { export: "verifyRecord",         atoms: ["type:proof", "type:certificate"],                     pipeline: "extract-sig → verify → assert" },
    ],
  },
  // ── Layer 1: Name System ─────────────────────────────────────
  {
    module: "uns/core/record",
    description: "Name records",
    exports: [
      { export: "createRecord",         atoms: ["type:datum", "type:address", "type:triad"],           pipeline: "schema → canonicalize → address" },
      { export: "publishRecord",        atoms: ["type:datum", "type:certificate", "type:effect"],      pipeline: "sign → store → emit-effect" },
      { export: "resolveByName",        atoms: ["type:query", "type:resolver", "type:address"],        pipeline: "query → dht-lookup → verify → return" },
    ],
  },
  {
    module: "uns/core/resolver",
    description: "Full resolution engine",
    exports: [
      { export: "UnsResolver",          atoms: ["type:resolver", "type:query", "type:proof", "type:address", "type:observable"], pipeline: "accept-query → resolve → verify-proof → stream-result" },
    ],
  },
  {
    module: "uns/core/dht",
    description: "Kademlia DHT",
    exports: [
      { export: "UnsDht",               atoms: ["type:address", "type:region", "type:stream", "type:effect"], pipeline: "xor-distance → k-bucket → store/retrieve" },
    ],
  },
  // ── Layer 2: Build System ────────────────────────────────────
  {
    module: "uns/build/container",
    description: "Container runtime",
    exports: [
      { export: "createContainer",      atoms: ["type:context", "type:session", "type:effect", "type:envelope"], pipeline: "image → isolate → bind-context → start" },
      { export: "execContainer",        atoms: ["type:operation", "type:effect", "type:stream"],       pipeline: "inject-op → execute → capture-stream" },
      { export: "inspectContainer",     atoms: ["type:observable", "type:context"],                    pipeline: "read-state → serialize-context" },
    ],
  },
  {
    module: "uns/build/uorfile",
    description: "Image build (Dockerfile equivalent)",
    exports: [
      { export: "parseUorfile",         atoms: ["type:datum", "type:operation", "morph:transform"],    pipeline: "lex → parse → validate-directives" },
      { export: "buildImage",           atoms: ["type:derivation", "type:address", "type:effect"],     pipeline: "parse → layer-stack → hash → address" },
    ],
  },
  {
    module: "uns/build/registry",
    description: "Image registry",
    exports: [
      { export: "pushImage",            atoms: ["type:address", "type:certificate", "type:effect"],    pipeline: "serialize → sign → store" },
      { export: "pullImage",            atoms: ["type:query", "type:resolver", "type:address"],        pipeline: "resolve-tag → fetch → verify" },
      { export: "tagImage",             atoms: ["type:triad", "type:address"],                         pipeline: "bind-name → address" },
    ],
  },
  {
    module: "uns/build/compose",
    description: "Multi-container orchestration",
    exports: [
      { export: "composeUp",            atoms: ["type:context", "type:effect", "type:stream", "type:transition"], pipeline: "parse-spec → create-containers → start-all → monitor" },
      { export: "composeDown",          atoms: ["type:effect", "type:transition"],                     pipeline: "stop-all → cleanup-resources" },
    ],
  },
  {
    module: "uns/build/secrets",
    description: "Secrets management",
    exports: [
      { export: "createSecret",         atoms: ["type:envelope", "type:certificate", "pipe:sha256"],   pipeline: "encrypt → seal-envelope → store" },
      { export: "getSecretValue",       atoms: ["type:proof", "type:envelope"],                        pipeline: "authenticate → unseal → decrypt" },
    ],
  },
  {
    module: "uns/build/snapshot",
    description: "Deployment snapshots",
    exports: [
      { export: "createSnapshot",       atoms: ["type:derivation", "type:address", "pipe:sha256"],     pipeline: "collect-state → hash-components → chain" },
      { export: "verifySnapshot",        atoms: ["type:proof", "type:address"],                         pipeline: "recompute-hash → compare → assert" },
    ],
  },
  // ── Layer 3: Services ────────────────────────────────────────
  {
    module: "compose/orchestrator",
    description: "Sovereign reconciler (K8s equivalent)",
    exports: [
      { export: "SovereignReconciler",  atoms: ["type:context", "type:transition", "type:effect", "type:observable", "type:predicate"], pipeline: "observe → predicate-dispatch → effect-chain → reduce" },
    ],
  },
  {
    module: "compose/app-kernel",
    description: "Container isolation kernel",
    exports: [
      { export: "AppKernel",            atoms: ["type:context", "type:session", "type:effect", "type:predicate", "type:region"], pipeline: "sandbox → permission-check → execute → audit" },
    ],
  },
  {
    module: "oracle",
    description: "Knowledge graph & AI reasoning",
    exports: [
      { export: "OraclePage",           atoms: ["type:query", "type:resolver", "type:observable", "type:derivation", "type:triad"], pipeline: "user-query → resolve → reason → derive → present" },
    ],
  },
  {
    module: "identity",
    description: "UOR identity management",
    exports: [
      { export: "ProjectUorIdentity",   atoms: ["type:address", "type:certificate", "type:session", "pipe:urdna2015", "pipe:sha256", "pipe:cid"], pipeline: "generate-keypair → derive-identity → certify → bind-session" },
    ],
  },
  {
    module: "messenger",
    description: "Encrypted messaging",
    exports: [
      { export: "MessengerPage",        atoms: ["type:envelope", "type:session", "type:certificate", "type:stream", "type:effect"], pipeline: "establish-session → encrypt → seal-envelope → transmit" },
    ],
  },
  {
    module: "donate",
    description: "Donation & wallet",
    exports: [
      { export: "DonatePage",           atoms: ["type:address", "type:certificate", "type:effect"],    pipeline: "verify-address → certify-tx → emit-effect" },
    ],
  },
  {
    module: "landing",
    description: "Landing page",
    exports: [
      { export: "IndexPage",            atoms: ["type:context", "type:observable"],                    pipeline: "render-context → observe-interactions" },
    ],
  },
  {
    module: "desktop",
    description: "Desktop shell / OS surface",
    exports: [
      { export: "DesktopShell",         atoms: ["type:context", "type:session", "type:effect", "type:stream"], pipeline: "boot-context → bind-session → dispatch-effects" },
    ],
  },
  {
    module: "app-store",
    description: "Application catalog",
    exports: [
      { export: "AppStorePage",         atoms: ["type:query", "type:resolver", "type:context"],        pipeline: "browse-catalog → resolve-app → render" },
    ],
  },
];

/**
 * Flatten all entries into a single list for audit traversal.
 */
export function flattenProvenance(): ProvenanceEntry[] {
  return PROVENANCE_REGISTRY.flatMap((m) =>
    m.exports.map((e) => ({
      module: m.module,
      export: e.export,
      atoms: e.atoms,
      pipeline: e.pipeline,
      grounded: false, // set by audit
    })),
  );
}
