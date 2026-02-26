/**
 * schema: namespace — unified barrel export.
 *
 * Consolidates: triad + jsonld
 * Kernel Space — triadic primitives and JSON-LD emission/validation.
 *
 * @namespace schema:
 * @version 2.0.0
 */

// ── Triadic Coordinates (from triad/) ──────────────────────────────────────
export { computeTriad, popcount, basisElements, stratumLevel, stratumDensity } from "@/modules/triad/triad";

// ── JSON-LD Emission (from jsonld/) ────────────────────────────────────────
export { emitContext } from "@/modules/jsonld/context";
export type { UorJsonLdContext } from "@/modules/jsonld/context";
export { emitDatum, emitDerivation, emitCoherenceProof, emitGraph } from "@/modules/jsonld/emitter";
export type { JsonLdNode, JsonLdDocument, EmitGraphOptions } from "@/modules/jsonld/emitter";
export { validateJsonLd } from "@/modules/jsonld/validator";
export type { ValidationResult } from "@/modules/jsonld/validator";
export { emitVocabulary } from "@/modules/jsonld/vocabulary";
export type { VocabularyDocument, VocabularyNode } from "@/modules/jsonld/vocabulary";
