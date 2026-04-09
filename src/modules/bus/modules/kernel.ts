/**
 * Sovereign Bus — Kernel Module Registration.
 * ═════════════════════════════════════════════════════════════════
 *
 * Exposes UOR engine operations: encode, decode, verify, derive.
 * All local — pure computation, never leaves the device.
 *
 * @version 1.0.0
 */

import { register } from "../registry";

register({
  ns: "kernel",
  label: "UOR Engine",
  operations: {
    encode: {
      handler: async (params: any) => {
        const { singleProofHash } = await import("@/lib/uor-canonical");
        return singleProofHash(params?.content ?? params);
      },
      description: "Content-address any object via URDNA2015 → SHA-256 → IPv6 ULA",
      paramsSchema: { type: "object", properties: { content: { description: "Any JSON-serializable object to encode" } } },
    },
    decode: {
      handler: async (params: any) => {
        const { verifySingleProof } = await import("@/lib/uor-canonical");
        return verifySingleProof(params?.content, params?.expectedId);
      },
      description: "Verify a content-addressed object against its expected derivation ID",
    },
    verify: {
      handler: async (params: any) => {
        const { verifySingleProof } = await import("@/lib/uor-canonical");
        return verifySingleProof(params?.content, params?.expectedId);
      },
      description: "Alias for decode — verify integrity of content-addressed data",
    },
    derive: {
      handler: async (params: any) => {
        const { singleProofHash } = await import("@/lib/uor-canonical");
        return singleProofHash(params?.content ?? params);
      },
      description: "Derive canonical identity (derivation ID, CID, IPv6) from content",
    },
  },
});
