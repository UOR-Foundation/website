/**
 * UOR Certificate generation.
 * Produces verification receipts for any JSON-LD-describable component.
 *
 * This file re-exports from the canonical certificate module.
 * The module handles boundary enforcement, canonicalization, and hashing.
 */

export { generateCertificate, generateCertificates } from "@/modules/identity/addressing/certificate/generate";
export type { UorCertificate } from "@/modules/identity/addressing/certificate/types";
