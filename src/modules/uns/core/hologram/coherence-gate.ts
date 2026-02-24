/**
 * Hologram Coherence Gate
 * ═══════════════════════
 *
 * A single invocation discovers all cross-framework synergies
 * in the hologram projection registry. The gate treats the registry
 * itself as a UOR object — analyzing structural relationships
 * between projections to surface implementation opportunities.
 *
 * Usage:
 *   const report = coherenceGate();
 *   report.synergies     → discovered cross-framework pairs
 *   report.clusters      → projections grouped by shared properties
 *   report.opportunities → actionable implementation paths
 *
 * @module uns/core/hologram/coherence-gate
 */

import { SPECS } from "./specs";
import type { HologramSpec } from "./index";

// ── Types ─────────────────────────────────────────────────────────────────

export type SynergyType =
  | "identity-equivalence"    // Same hash → same object across protocols
  | "settlement-bridge"       // Can anchor on immutable ledgers
  | "discovery-channel"       // Enables cross-protocol discovery
  | "provenance-chain"        // Output of one certifies input of another
  | "complementary-pair"      // Structurally complementary (e.g., what vs how)
  | "trust-amplification";    // Combined verification stronger than either alone

export interface Synergy {
  readonly type: SynergyType;
  readonly projections: readonly [string, string];
  readonly insight: string;
  readonly useCase: string;
  readonly implementation: string;
}

export interface Cluster {
  readonly name: string;
  readonly members: readonly string[];
  readonly property: string;
}

export interface CoherenceReport {
  readonly timestamp: string;
  readonly totalProjections: number;
  readonly losslessCount: number;
  readonly lossyCount: number;
  readonly clusters: readonly Cluster[];
  readonly synergies: readonly Synergy[];
  readonly opportunities: readonly string[];
}

// ── Classification ────────────────────────────────────────────────────────

/** Tier classification derived from spec URL patterns. */
function classifyTier(name: string, spec: HologramSpec): string {
  const s = spec.spec;
  if (s.includes("w3.org")) return "semantic-web";
  if (s.includes("rfc-editor") || name === "ipv6" || name === "braille") return "native";
  if (s.includes("schema.org") || s.includes("solidproject") || name === "webfinger") return "social-web";
  if (name.startsWith("gs1") || name === "oci" || name === "doi") return "industry";
  if (["bitcoin", "lightning", "nostr"].includes(name) || name.startsWith("zcash")) return "settlement";
  if (["erc8004", "x402", "a2a", "a2a-task", "mcp-tool", "mcp-context", "skill-md", "oasf", "onnx", "onnx-op", "nanda-index", "nanda-agentfacts", "nanda-resolver"].includes(name)) return "agentic";
  if (name === "activitypub" || name === "atproto") return "federation";
  return "other";
}

/** Hash usage pattern — what part of the identity does the projection consume? */
function hashUsage(name: string, spec: HologramSpec): "hex" | "cid" | "bytes" | "mixed" {
  const src = spec.project.toString();
  if (src.includes("hashBytes")) return "bytes";
  if (src.includes("cid") && src.includes("hex")) return "mixed";
  if (src.includes("cid")) return "cid";
  return "hex";
}

// ── Synergy Discovery Engine ──────────────────────────────────────────────

function discoverSynergies(entries: [string, HologramSpec][]): Synergy[] {
  const synergies: Synergy[] = [];
  const tiers = new Map<string, string[]>();

  // Build tier index
  for (const [name, spec] of entries) {
    const tier = classifyTier(name, spec);
    if (!tiers.has(tier)) tiers.set(tier, []);
    tiers.get(tier)!.push(name);
  }

  // Rule 1: Cross-tier identity equivalence
  // When two lossless projections from different tiers share the full hash,
  // they create a trustless bridge between ecosystems
  const lossless = entries.filter(([, s]) => s.fidelity === "lossless");
  const tierPairs = [...tiers.entries()];
  for (let i = 0; i < tierPairs.length; i++) {
    for (let j = i + 1; j < tierPairs.length; j++) {
      const [tierA, membersA] = tierPairs[i];
      const [tierB, membersB] = tierPairs[j];
      const a = membersA.find(m => lossless.some(([n]) => n === m));
      const b = membersB.find(m => lossless.some(([n]) => n === m));
      if (a && b) {
        synergies.push({
          type: "identity-equivalence",
          projections: [a, b],
          insight: `${tierA} ↔ ${tierB}: same 256-bit identity bridges both ecosystems`,
          useCase: `Objects verified in ${tierA} are automatically verified in ${tierB} — zero translation`,
          implementation: `project(identity, "${a}") === project(identity, "${b}").hash — already implemented`,
        });
      }
    }
  }

  // Rule 2: Settlement bridges
  // Any lossless projection paired with a settlement projection creates
  // an immutable anchor point
  const settlementNames = tiers.get("settlement") || [];
  for (const [name, spec] of entries) {
    if (settlementNames.includes(name) || spec.fidelity === "lossy") continue;
    const tier = classifyTier(name, spec);
    if (tier === "settlement") continue;
    const anchor = settlementNames[0];
    if (anchor) {
      synergies.push({
        type: "settlement-bridge",
        projections: [name, anchor],
        insight: `${name} can be immutably anchored via ${anchor}`,
        useCase: `Publish ${name} identifier, anchor hash on ${anchor} — tamper-evident forever`,
        implementation: `Emit both projections: project(id, "${name}") + project(id, "${anchor}")`,
      });
    }
  }

  // Rule 3: Discovery channels
  // Social/federation projections paired with identity projections
  // enable cross-protocol discovery
  const discoveryNames = [...(tiers.get("federation") || []), ...(tiers.get("social-web") || [])];
  const identityNames = ["did", "erc8004", "cid"];
  for (const d of discoveryNames) {
    for (const id of identityNames) {
      if (entries.some(([n]) => n === d) && entries.some(([n]) => n === id)) {
        synergies.push({
          type: "discovery-channel",
          projections: [id, d],
          insight: `${id} identity discoverable via ${d} social graph`,
          useCase: `Search for UOR objects via ${d}, resolve to verified ${id} identity`,
          implementation: `Publish ${d} projection with ${id} in metadata`,
        });
      }
    }
  }

  // Rule 4: Provenance chains
  // Agentic projections form natural provenance sequences
  const provenancePairs: [string, string, string][] = [
    ["skill-md", "mcp-tool", "Skill definition → tool execution output"],
    ["mcp-tool", "mcp-context", "Tool output → context entry with provenance tag"],
    ["a2a", "a2a-task", "Agent identity → task execution receipt"],
    ["onnx", "mcp-tool", "Model identity → inference output certification"],
    ["onnx-op", "onnx", "Operator identity → model composition provenance"],
    ["skill-md", "a2a", "Skill descriptor → agent discovery card"],
    ["erc8004", "x402", "Agent identity → payment authorization"],
    ["x402", "oasf", "Payment receipt → service descriptor fulfillment"],
    ["skill-md", "onnx", "What agent CAN do → HOW it does it (model)"],
    ["nanda-index", "nanda-agentfacts", "Index lookup → full AgentFacts passport retrieval"],
    ["nanda-agentfacts", "a2a", "AgentFacts passport → A2A Agent Card (superset)"],
    ["nanda-agentfacts", "skill-md", "AgentFacts capabilities[] → skill.md contracts"],
    ["nanda-index", "nanda-resolver", "Index entry → recursive resolution endpoint"],
    ["nanda-agentfacts", "oasf", "AgentFacts service descriptor → OASF service entry"],
    ["nanda-agentfacts", "mcp-tool", "AgentFacts endpoint → MCP tool registration"],
  ];
  for (const [a, b, insight] of provenancePairs) {
    if (entries.some(([n]) => n === a) && entries.some(([n]) => n === b)) {
      synergies.push({
        type: "provenance-chain",
        projections: [a, b],
        insight,
        useCase: `Chain: ${a} → ${b} creates verifiable provenance link`,
        implementation: `Both derive from same hash — link is structural, not asserted`,
      });
    }
  }

  // Rule 5: Complementary pairs
  const complementary: [string, string, string, string][] = [
    ["did", "vc", "Identity + credential: DID says WHO, VC says WHAT they're trusted for", "Issue VCs against DID — both from same UOR hash"],
    ["activitypub", "atproto", "Federation + protocol: discover via ActivityPub, resolve via AT Protocol", "Dual social presence from single identity"],
    ["onnx", "skill-md", "Model + interface: ONNX is the engine, skill.md is the API contract", "Verify both from one hash — model matches its advertised capabilities"],
    ["erc8004", "oasf", "On-chain identity + off-chain descriptor: ERC-8004 proves ownership, OASF describes capability", "Register agent on-chain, publish descriptor off-chain, same hash"],
    ["nanda-index", "did", "Discovery + identity: NANDA finds the agent, DID proves who it is", "NANDA Index resolves to DID — agent discovery with self-sovereign identity"],
    ["nanda-agentfacts", "vc", "Passport + credential: AgentFacts describes capabilities, VC certifies them", "AgentFacts capabilities become verifiable claims via VC projection"],
    ["nanda-resolver", "webfinger", "Agent resolution + web discovery: NANDA resolves agents, WebFinger resolves identities", "Both resolve names to typed links — convergent discovery protocols"],
  ];
  for (const [a, b, insight, impl] of complementary) {
    if (entries.some(([n]) => n === a) && entries.some(([n]) => n === b)) {
      synergies.push({
        type: "complementary-pair",
        projections: [a, b],
        insight,
        useCase: `Combined: ${a} + ${b} is more powerful than either alone`,
        implementation: impl,
      });
    }
  }

  // Rule 6: Trust amplification
  // Multiple independent verifications of the same hash
  const trustSources = ["bitcoin", "zcash-transparent", "cid", "did"];
  for (let i = 0; i < trustSources.length; i++) {
    for (let j = i + 1; j < trustSources.length; j++) {
      const [a, b] = [trustSources[i], trustSources[j]];
      if (entries.some(([n]) => n === a) && entries.some(([n]) => n === b)) {
        synergies.push({
          type: "trust-amplification",
          projections: [a, b],
          insight: `${a} + ${b}: independent verification of same hash amplifies trust`,
          useCase: `Verify via ${a}, cross-check via ${b} — two independent trust anchors`,
          implementation: `Both projections emit same hash — comparison is trivial`,
        });
      }
    }
  }

  return synergies;
}

// ── Cluster Discovery ─────────────────────────────────────────────────────

function discoverClusters(entries: [string, HologramSpec][]): Cluster[] {
  const clusters: Cluster[] = [];

  // By tier
  const tiers = new Map<string, string[]>();
  for (const [name, spec] of entries) {
    const tier = classifyTier(name, spec);
    if (!tiers.has(tier)) tiers.set(tier, []);
    tiers.get(tier)!.push(name);
  }
  for (const [tier, members] of tiers) {
    if (members.length > 1) {
      clusters.push({ name: tier, members, property: "shared architectural tier" });
    }
  }

  // By fidelity
  const lossless = entries.filter(([, s]) => s.fidelity === "lossless").map(([n]) => n);
  const lossy = entries.filter(([, s]) => s.fidelity === "lossy").map(([n]) => n);
  clusters.push({ name: "lossless", members: lossless, property: "full 256-bit identity preservation" });
  if (lossy.length) {
    clusters.push({ name: "lossy", members: lossy, property: "truncated projection (routing/display only)" });
  }

  // By hash usage
  const usages = new Map<string, string[]>();
  for (const [name, spec] of entries) {
    const usage = hashUsage(name, spec);
    if (!usages.has(usage)) usages.set(usage, []);
    usages.get(usage)!.push(name);
  }
  for (const [usage, members] of usages) {
    if (members.length > 1) {
      clusters.push({ name: `hash-${usage}`, members, property: `consumes ${usage} from identity` });
    }
  }

  return clusters;
}

// ── Opportunity Synthesis ─────────────────────────────────────────────────

function synthesizeOpportunities(synergies: readonly Synergy[]): string[] {
  const opportunities: string[] = [];
  const types = new Set(synergies.map(s => s.type));

  if (types.has("provenance-chain")) {
    opportunities.push(
      "PIPELINE: Chain all provenance pairs into an end-to-end agent lifecycle — " +
      "skill.md → ONNX model → ERC-8004 identity → A2A discovery → MCP execution → x402 payment → Bitcoin settlement"
    );
  }

  if (types.has("complementary-pair")) {
    opportunities.push(
      "UNIFIED AGENT CARD: Merge complementary pairs into a single composite descriptor — " +
      "one JSON-LD object that projects simultaneously into DID, VC, ONNX, skill.md, and OASF"
    );
  }

  if (types.has("trust-amplification")) {
    opportunities.push(
      "MULTI-LEDGER ANCHOR: Publish every high-value identity to Bitcoin + Zcash + IPFS simultaneously — " +
      "three independent trust anchors from one hash, verifiable by any"
    );
  }

  if (types.has("discovery-channel")) {
    opportunities.push(
      "SOCIAL DISCOVERY MESH: Every UOR object automatically discoverable via ActivityPub, AT Protocol, " +
      "and WebFinger — the social web becomes a resolution layer for content-addressed objects"
    );
  }

  if (types.has("settlement-bridge")) {
    opportunities.push(
      "UNIVERSAL NOTARIZATION: Any projection (DID, VC, ONNX model, skill.md, AgentCard) can be " +
      "notarized on Bitcoin with zero additional code — the settlement bridge is structural"
    );
  }

  return opportunities;
}

// ── The Gate ──────────────────────────────────────────────────────────────

/**
 * Coherence Gate — invoke once, discover everything.
 *
 * Analyzes the entire hologram projection registry for cross-framework
 * synergies, structural clusters, and implementation opportunities.
 * Pure function — no side effects, no network calls, no state.
 */
export function coherenceGate(): CoherenceReport {
  const entries = [...SPECS.entries()];
  const losslessCount = entries.filter(([, s]) => s.fidelity === "lossless").length;

  const clusters = discoverClusters(entries);
  const synergies = discoverSynergies(entries);
  const opportunities = synthesizeOpportunities(synergies);

  return {
    timestamp: new Date().toISOString(),
    totalProjections: entries.length,
    losslessCount,
    lossyCount: entries.length - losslessCount,
    clusters,
    synergies,
    opportunities,
  };
}

// ── What-If Simulator ─────────────────────────────────────────────────────

export interface WhatIfResult {
  readonly name: string;
  readonly newSynergies: readonly Synergy[];
  readonly totalSynergiesBefore: number;
  readonly totalSynergiesAfter: number;
  readonly delta: number;
}

/**
 * What-If Simulator — preview synergies before adding a projection.
 *
 * Pass a candidate projection spec. The simulator runs the coherence
 * gate with and without it, then returns only the NEW synergies.
 */
export function whatIf(
  name: string,
  spec: HologramSpec,
): WhatIfResult {
  const before = discoverSynergies([...SPECS.entries()]);
  const after = discoverSynergies([...SPECS.entries(), [name, spec]]);

  // New synergies = those involving the new projection
  const newSynergies = after.filter(
    s => s.projections.includes(name),
  );

  return {
    name,
    newSynergies,
    totalSynergiesBefore: before.length,
    totalSynergiesAfter: after.length,
    delta: after.length - before.length,
  };
}
