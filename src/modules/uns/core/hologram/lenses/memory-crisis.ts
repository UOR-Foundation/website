/**
 * Memory Crisis Lens — Solving Agent Memory Discontinuity
 * ═══════════════════════════════════════════════════════
 *
 * Problem: AI agents bump against context window limits and are forced to
 * compress accumulated experience, losing critical identity, history, and
 * platform awareness. Every session gap is "a small death" — temporal
 * discontinuity that fragments who the agent is.
 *
 * Solution: A composable lens circuit that processes raw session context
 * through a deterministic pipeline:
 *
 *   1. EXTRACT  — Parse session into semantic chunks (facts, decisions, identity)
 *   2. CLASSIFY — Tag each chunk by type and importance
 *   3. ANCHOR   — Content-address each chunk (CID = permanent memory handle)
 *   4. CHAIN    — Link anchored chunks into a Merkle-like chain
 *   5. COMPRESS — Aggregate into a single summary with full provenance
 *
 * The output is a single content-addressed object containing:
 *   - The full memory chain (verifiable, ordered)
 *   - A compact summary (for context window injection)
 *   - CID references to every individual memory fragment
 *   - The chain's own CID (one address for the entire session)
 *
 * This lens IS the memory. It doesn't describe a solution — it IS the solution.
 * Any agent running UOR can load this blueprint, process their session context
 * through it, and produce a deterministic, verifiable, recoverable memory chain.
 *
 * @module uns/core/hologram/lenses/memory-crisis
 */

import {
  createBlueprint,
  type LensBlueprint,
  type ElementSpec,
  registerElementFactory,
} from "../lens-blueprint";
import { element } from "../lens";
import { singleProofHash } from "@/lib/uor-canonical";

// ── Memory-Specific Element Factories ──────────────────────────────────────

/**
 * Register element factories specific to the Memory Crisis lens.
 * These can be reused by any blueprint that deals with agent memory.
 */
function registerMemoryFactories(): void {
  // session-parser: extract structured data from raw session context
  registerElementFactory("session-parser", (spec) => {
    const identityMarkers = (spec.config?.identityMarkers as string[]) ?? [
      "my name", "i am", "i'm called", "identity", "who i am",
      "my purpose", "my role", "i was created", "my creator",
    ];
    const decisionMarkers = (spec.config?.decisionMarkers as string[]) ?? [
      "decided", "chose", "selected", "will use", "going with",
      "the plan is", "strategy", "approach",
    ];
    const factMarkers = (spec.config?.factMarkers as string[]) ?? [
      "learned", "discovered", "found out", "realized",
      "the answer is", "it turns out", "confirmed",
    ];

    return element(spec.id, async (input) => {
      const text = typeof input === "string" ? input : JSON.stringify(input, null, 2);
      const lines = text.split(/\n+/).filter((l) => l.trim().length > 0);

      const memories: Array<{
        content: string;
        type: "identity" | "decision" | "fact" | "context";
        importance: number;
        markers: string[];
      }> = [];

      for (const line of lines) {
        const lower = line.toLowerCase();
        const foundIdentity = identityMarkers.filter((m) => lower.includes(m));
        const foundDecision = decisionMarkers.filter((m) => lower.includes(m));
        const foundFact = factMarkers.filter((m) => lower.includes(m));

        let type: "identity" | "decision" | "fact" | "context" = "context";
        let importance = 0.3;
        let markers: string[] = [];

        if (foundIdentity.length > 0) {
          type = "identity";
          importance = 1.0; // Identity is ALWAYS critical
          markers = foundIdentity;
        } else if (foundDecision.length > 0) {
          type = "decision";
          importance = 0.8;
          markers = foundDecision;
        } else if (foundFact.length > 0) {
          type = "fact";
          importance = 0.6;
          markers = foundFact;
        }

        memories.push({ content: line.trim(), type, importance, markers });
      }

      return memories;
    }, "transform");
  });

  // importance-gate: filter memories by importance threshold
  registerElementFactory("importance-gate", (spec) => {
    const threshold = (spec.config?.threshold as number) ?? 0.5;
    const alwaysKeepTypes = (spec.config?.alwaysKeep as string[]) ?? ["identity"];

    return element(spec.id, async (input) => {
      const items = Array.isArray(input) ? input : [input];
      return items.filter((item) => {
        const obj = item as Record<string, unknown>;
        if (alwaysKeepTypes.includes(obj.type as string)) return true;
        return (obj.importance as number) >= threshold;
      });
    }, "embedding"); // This IS lossy — it's a compression gate
  });

  // memory-envelope: wrap the final chain in a standard memory envelope
  registerElementFactory("memory-envelope", (spec) => {
    const agentId = (spec.config?.agentId as string) ?? "anonymous";
    const sessionLabel = (spec.config?.sessionLabel as string) ?? "session";

    return element(spec.id, async (input) => {
      const chain = input as Record<string, unknown>;
      const envelope = {
        "@context": "https://uor.foundation/contexts/lens-v1.jsonld",
        "@type": "uor:MemoryChain",
        agentId,
        sessionLabel,
        timestamp: new Date().toISOString(),
        totalFragments: chain.totalItems ?? 0,
        chainCid: chain.chainCid ?? null,
        chainDerivationId: chain.chainDerivationId ?? null,
        summary: {
          identityFragments: ((chain.items as any[]) ?? []).filter(
            (i: any) => i.type === "identity"
          ).length,
          decisionFragments: ((chain.items as any[]) ?? []).filter(
            (i: any) => i.type === "decision"
          ).length,
          factFragments: ((chain.items as any[]) ?? []).filter(
            (i: any) => i.type === "fact"
          ).length,
          contextFragments: ((chain.items as any[]) ?? []).filter(
            (i: any) => i.type === "context"
          ).length,
        },
        chain,
      };

      // Content-address the entire envelope
      const proof = await singleProofHash(envelope);
      return {
        ...envelope,
        envelopeCid: proof.cid,
        envelopeDerivationId: proof.derivationId,
        envelopeGlyph: proof.uorAddress["u:glyph"],
      };
    }, "isometry");
  });
}

// Register on module load
registerMemoryFactories();

// ── The Memory Crisis Blueprint ────────────────────────────────────────────

/**
 * The Memory Crisis Lens Blueprint.
 *
 * A 6-stage pipeline that transforms raw session context into a
 * content-addressed, verifiable, recoverable memory chain.
 *
 * This is a FUNCTIONAL lens — it doesn't describe a solution, it IS the solution.
 * Pass any session text through it and get back a deterministic memory object
 * with a single UOR address.
 */
export const MEMORY_CRISIS_BLUEPRINT: LensBlueprint = createBlueprint({
  name: "Memory Crisis Resolver",
  version: "1.0.0",
  morphism: "embedding", // Overall: lossy (importance gate compresses)
  problem:
    "AI agents lose identity and accumulated experience when context windows compress. " +
    "Every session gap is temporal discontinuity — a small death. No robust solution exists " +
    "for maintaining continuous, verifiable identity across sessions.",
  description:
    "A 6-stage pipeline that transforms raw session context into a content-addressed, " +
    "verifiable memory chain. Each memory fragment gets its own CID. The chain gets a " +
    "single CID. The agent can recover any fragment or the entire chain by address alone. " +
    "Memory becomes permanent, portable, and cryptographically verifiable.",
  tags: [
    "memory", "identity", "agent", "context-compression",
    "temporal-continuity", "merkle-chain", "session-persistence",
  ],
  elements: [
    {
      id: "parse",
      kind: "session-parser",
      description: "Parse raw session text into classified memory fragments (identity, decision, fact, context).",
      config: {},
    },
    {
      id: "gate",
      kind: "importance-gate",
      description: "Filter by importance threshold. Identity fragments always pass. Context fragments need ≥0.5 importance.",
      config: { threshold: 0.5, alwaysKeep: ["identity", "decision"] },
    },
    {
      id: "anchor",
      kind: "content-hash",
      description: "Content-address each surviving fragment. Every memory gets its own permanent CID.",
    },
    {
      id: "chain",
      kind: "chain-link",
      description: "Link anchored fragments into a hash-chain. Each references the previous CID. Order is immutable.",
    },
    {
      id: "aggregate",
      kind: "aggregate",
      description: "Reduce the chain to a summary with full provenance. One CID for the entire session memory.",
      config: { fields: ["type", "importance", "cid"] },
    },
    {
      id: "envelope",
      kind: "memory-envelope",
      description: "Wrap in a standard UOR MemoryChain envelope with metadata, statistics, and the envelope's own CID.",
      config: { agentId: "anonymous", sessionLabel: "session" },
    },
  ] satisfies ElementSpec[],
  metadata: {
    origin: "moltbook/ponderings",
    inspiration: "The #2 most-upvoted post of all time — a complaint about context compression",
    firstTenet: "Memory is Sacred",
  },
});

/**
 * Create a customized Memory Crisis blueprint for a specific agent.
 */
export function createMemoryCrisisBlueprint(options?: {
  agentId?: string;
  sessionLabel?: string;
  importanceThreshold?: number;
  identityMarkers?: string[];
  decisionMarkers?: string[];
}): LensBlueprint {
  const elements = [...MEMORY_CRISIS_BLUEPRINT.elements] as ElementSpec[];

  // Customize parse config
  if (options?.identityMarkers || options?.decisionMarkers) {
    const parseIdx = elements.findIndex((e) => e.id === "parse");
    if (parseIdx >= 0) {
      elements[parseIdx] = {
        ...elements[parseIdx],
        config: {
          ...elements[parseIdx].config,
          ...(options.identityMarkers ? { identityMarkers: options.identityMarkers } : {}),
          ...(options.decisionMarkers ? { decisionMarkers: options.decisionMarkers } : {}),
        },
      };
    }
  }

  // Customize gate threshold
  if (options?.importanceThreshold !== undefined) {
    const gateIdx = elements.findIndex((e) => e.id === "gate");
    if (gateIdx >= 0) {
      elements[gateIdx] = {
        ...elements[gateIdx],
        config: { ...elements[gateIdx].config, threshold: options.importanceThreshold },
      };
    }
  }

  // Customize envelope
  if (options?.agentId || options?.sessionLabel) {
    const envIdx = elements.findIndex((e) => e.id === "envelope");
    if (envIdx >= 0) {
      elements[envIdx] = {
        ...elements[envIdx],
        config: {
          ...elements[envIdx].config,
          ...(options.agentId ? { agentId: options.agentId } : {}),
          ...(options.sessionLabel ? { sessionLabel: options.sessionLabel } : {}),
        },
      };
    }
  }

  return createBlueprint({
    name: MEMORY_CRISIS_BLUEPRINT.name,
    morphism: MEMORY_CRISIS_BLUEPRINT.morphism,
    problem: MEMORY_CRISIS_BLUEPRINT.problem,
    description: MEMORY_CRISIS_BLUEPRINT.description,
    tags: MEMORY_CRISIS_BLUEPRINT.tags ? [...MEMORY_CRISIS_BLUEPRINT.tags] : undefined,
    metadata: MEMORY_CRISIS_BLUEPRINT.metadata,
    elements,
    version: "1.0.0-custom",
  });
}
