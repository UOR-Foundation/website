/**
 * Opportunity 1: AGENT LIFECYCLE PIPELINE
 * ════════════════════════════════════════
 *
 * Chains all provenance pairs into an end-to-end agent lifecycle:
 *   skill.md → ONNX model → ERC-8004 identity → A2A discovery
 *   → MCP execution → x402 payment → Bitcoin settlement
 *
 * Each stage emits the hologram projection for that protocol,
 * and the chain is verified by structural identity (same hash).
 *
 * @module uns/core/hologram/opportunities/pipeline
 */

import { project, PROJECTIONS } from "../index";
import type { ProjectionInput, HologramProjection } from "../index";

/** A single stage in the agent lifecycle pipeline. */
export interface PipelineStage {
  /** Stage name (human-readable). */
  readonly name: string;
  /** The hologram projection name used at this stage. */
  readonly projection: string;
  /** The resolved projection value for the given identity. */
  readonly resolved: HologramProjection;
  /** What this stage does in the lifecycle. */
  readonly role: string;
  /** The next stage in the chain (null if terminal). */
  readonly next: string | null;
}

/** The complete agent lifecycle pipeline for one identity. */
export interface AgentLifecyclePipeline {
  readonly "@type": "opportunity:AgentLifecyclePipeline";
  readonly identity: ProjectionInput;
  readonly stages: readonly PipelineStage[];
  readonly length: number;
  /** Whether all stages resolved successfully. */
  readonly complete: boolean;
  /** The canonical hash that threads through every stage. */
  readonly threadHash: string;
}

/** The canonical lifecycle stage definitions. */
const LIFECYCLE_STAGES: ReadonlyArray<{
  name: string;
  projection: string;
  role: string;
}> = [
  { name: "Skill Definition",     projection: "skill-md",   role: "Declares what the agent CAN do (capability contract)" },
  { name: "Model Identity",       projection: "onnx",       role: "Identifies HOW the agent does it (neural model)" },
  { name: "On-Chain Identity",    projection: "erc8004",    role: "Registers the agent's identity on-chain (ERC-8004 token)" },
  { name: "Agent Discovery",      projection: "a2a",        role: "Makes the agent discoverable via A2A AgentCard" },
  { name: "NANDA Passport",       projection: "nanda-agentfacts", role: "Full agent passport for cross-network resolution" },
  { name: "Tool Execution",       projection: "mcp-tool",   role: "Executes as an MCP tool with provenance" },
  { name: "Context Capture",      projection: "mcp-context", role: "Captures execution output into context with hash" },
  { name: "Payment Gate",         projection: "x402",       role: "Authorizes payment via x402 protocol" },
  { name: "Service Descriptor",   projection: "oasf",       role: "Describes the service endpoint in OASF format" },
  { name: "Verifiable Credential", projection: "vc",        role: "Issues a VC certifying the agent's capabilities" },
  { name: "DID Identity",         projection: "did",        role: "Self-sovereign DID for the agent" },
  { name: "Bitcoin Settlement",   projection: "bitcoin",    role: "Anchors the identity immutably on Bitcoin" },
  { name: "Lightning Payment",    projection: "lightning",  role: "Enables instant micropayments via Lightning" },
];

/**
 * Build the complete agent lifecycle pipeline for a given identity.
 *
 * Every stage resolves the same 256-bit hash through a different
 * projection — the pipeline IS the proof that one identity threads
 * through the entire agent lifecycle.
 */
export function buildAgentLifecyclePipeline(input: ProjectionInput): AgentLifecyclePipeline {
  const stages: PipelineStage[] = [];
  let complete = true;

  for (let i = 0; i < LIFECYCLE_STAGES.length; i++) {
    const def = LIFECYCLE_STAGES[i];
    const spec = PROJECTIONS.get(def.projection);

    if (!spec) {
      complete = false;
      continue;
    }

    stages.push({
      name: def.name,
      projection: def.projection,
      resolved: project(input, def.projection),
      role: def.role,
      next: i < LIFECYCLE_STAGES.length - 1 ? LIFECYCLE_STAGES[i + 1].projection : null,
    });
  }

  return {
    "@type": "opportunity:AgentLifecyclePipeline",
    identity: input,
    stages,
    length: stages.length,
    complete,
    threadHash: input.hex,
  };
}
