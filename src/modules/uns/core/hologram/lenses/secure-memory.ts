/**
 * Secure Memory Lens — Shield + Memory Composition
 * ═════════════════════════════════════════════════
 *
 * Composes the Prompt Injection Shield with the Memory Crisis Resolver
 * to create a single pipeline: scan first, memorize only safe fragments.
 *
 * Pipeline: Content → [Shield 7 stages] → [Extract safe] → [Memory 6 stages] → Sealed
 *
 * @module uns/core/hologram/lenses/secure-memory
 */

import {
  composeBlueprints,
  forkBlueprint,
  type LensBlueprint,
} from "../lens-blueprint";
import { PROMPT_INJECTION_SHIELD_BLUEPRINT } from "./prompt-injection-shield";
import { MEMORY_CRISIS_BLUEPRINT } from "./memory-crisis";

/**
 * The Secure Memory Blueprint — fractal composition of Shield + Memory.
 *
 * The Shield scans, anchors, correlates, classifies, and produces a
 * SecurityVerdict. The Memory Crisis lens then processes the approved
 * content into a content-addressed, verifiable memory chain.
 *
 * Together: untrusted content → security analysis → safe fragments →
 * permanent, recoverable memory with full provenance.
 */
export const SECURE_MEMORY_BLUEPRINT: LensBlueprint = composeBlueprints(
  "Secure Memory",
  PROMPT_INJECTION_SHIELD_BLUEPRINT,
  MEMORY_CRISIS_BLUEPRINT,
);

/**
 * Create a customized Secure Memory blueprint.
 */
export function createSecureMemoryBlueprint(options?: {
  agentId?: string;
  sessionLabel?: string;
  importanceThreshold?: number;
  safeThreshold?: number;
  maliciousThreshold?: number;
  windowSize?: number;
}): LensBlueprint {
  return forkBlueprint(SECURE_MEMORY_BLUEPRINT, {
    name: "Secure Memory",
    version: "1.0.0-custom",
    description:
      "Customized Secure Memory: scans content for prompt injection " +
      "(including time-shifted attacks), quarantines threats, then processes " +
      "safe fragments into a content-addressed memory chain.",
    metadata: {
      ...SECURE_MEMORY_BLUEPRINT.metadata,
      agentId: options?.agentId,
      sessionLabel: options?.sessionLabel,
    },
  });
}
