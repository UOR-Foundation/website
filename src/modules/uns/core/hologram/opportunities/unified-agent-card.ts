/**
 * Opportunity 2: UNIFIED AGENT CARD
 * ══════════════════════════════════
 *
 * Merges complementary pairs into a single composite descriptor —
 * one JSON-LD object that projects simultaneously into DID, VC,
 * ONNX, skill.md, OASF, NANDA, and A2A.
 *
 * The card IS the identity — every field is derived from the same hash.
 *
 * @module uns/core/hologram/opportunities/unified-agent-card
 */

import { project, PROJECTIONS } from "../index";
import type { ProjectionInput } from "../index";

/** The unified agent card — a single document spanning all agent protocols. */
export interface UnifiedAgentCard {
  readonly "@context": readonly string[];
  readonly "@type": "opportunity:UnifiedAgentCard";
  readonly "@id": string;

  /** Self-sovereign identity (DID). */
  readonly identity: {
    readonly did: string;
    readonly cid: string;
    readonly canonicalId: string;
  };

  /** Capability contract (skill.md). */
  readonly capabilities: {
    readonly skillUri: string;
    readonly projection: string;
  } | null;

  /** Neural model identity (ONNX). */
  readonly model: {
    readonly onnxUri: string;
    readonly projection: string;
  } | null;

  /** Agent discovery (A2A). */
  readonly discovery: {
    readonly agentCard: string;
    readonly nandaPassport: string | null;
    readonly nandaIndex: string | null;
  };

  /** Service descriptor (OASF). */
  readonly service: {
    readonly oasfUri: string;
    readonly projection: string;
  } | null;

  /** Credential (VC). */
  readonly credential: {
    readonly vcUri: string;
    readonly projection: string;
  } | null;

  /** On-chain identity (ERC-8004). */
  readonly onChain: {
    readonly erc8004: string;
    readonly projection: string;
  } | null;

  /** Payment (x402). */
  readonly payment: {
    readonly x402Uri: string;
    readonly projection: string;
  } | null;

  /** MCP tool endpoint. */
  readonly tool: {
    readonly mcpTool: string;
    readonly mcpContext: string | null;
    readonly projection: string;
  } | null;

  /** The canonical hash threading all fields. */
  readonly threadHash: string;

  /** Count of active projections in this card. */
  readonly projectionCount: number;
}

function tryProject(input: ProjectionInput, name: string): string | null {
  if (!PROJECTIONS.has(name)) return null;
  return project(input, name).value;
}

/**
 * Build a Unified Agent Card from a single identity.
 *
 * The card is a JSON-LD document that simultaneously resolves
 * into every agent protocol — one object, one hash, every standard.
 */
export function buildUnifiedAgentCard(input: ProjectionInput): UnifiedAgentCard {
  const did = project(input, "did").value;
  const cid = project(input, "cid").value;

  let count = 3; // did, cid, canonicalId always present

  const skillUri = tryProject(input, "skill-md");
  const onnxUri = tryProject(input, "onnx");
  const a2aUri = tryProject(input, "a2a");
  const nandaPassport = tryProject(input, "nanda-agentfacts");
  const nandaIndex = tryProject(input, "nanda-index");
  const oasfUri = tryProject(input, "oasf");
  const vcUri = tryProject(input, "vc");
  const erc8004 = tryProject(input, "erc8004");
  const x402Uri = tryProject(input, "x402");
  const mcpTool = tryProject(input, "mcp-tool");
  const mcpContext = tryProject(input, "mcp-context");

  if (skillUri) count++;
  if (onnxUri) count++;
  if (a2aUri) count++;
  if (nandaPassport) count++;
  if (nandaIndex) count++;
  if (oasfUri) count++;
  if (vcUri) count++;
  if (erc8004) count++;
  if (x402Uri) count++;
  if (mcpTool) count++;
  if (mcpContext) count++;

  return {
    "@context": [
      "https://www.w3.org/ns/did/v1",
      "https://uor.foundation/contexts/uor-v1.jsonld",
      "https://schema.org/",
    ],
    "@type": "opportunity:UnifiedAgentCard",
    "@id": did,

    identity: {
      did,
      cid,
      canonicalId: `urn:uor:derivation:sha256:${input.hex}`,
    },

    capabilities: skillUri ? { skillUri, projection: "skill-md" } : null,
    model: onnxUri ? { onnxUri, projection: "onnx" } : null,

    discovery: {
      agentCard: a2aUri ?? did,
      nandaPassport,
      nandaIndex,
    },

    service: oasfUri ? { oasfUri, projection: "oasf" } : null,
    credential: vcUri ? { vcUri, projection: "vc" } : null,
    onChain: erc8004 ? { erc8004, projection: "erc8004" } : null,
    payment: x402Uri ? { x402Uri, projection: "x402" } : null,

    tool: mcpTool ? {
      mcpTool,
      mcpContext,
      projection: "mcp-tool",
    } : null,

    threadHash: input.hex,
    projectionCount: count,
  };
}
