/**
 * UOR Certificate generation.
 * Produces verification receipts for any JSON-LD-describable component.
 *
 * This file re-exports from the canonical certificate module.
 * The module handles boundary enforcement, canonicalization, and hashing.
 */

export { generateCertificate, generateCertificates } from "@/modules/certificate/generate";
export type { UorCertificate } from "@/modules/certificate/types";
