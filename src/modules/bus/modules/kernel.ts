/**
 * Sovereign Bus — Kernel Module Registration.
 * ═════════════════════════════════════════════════════════════════
 *
 * Exposes UOR engine operations: encode, decode, verify, derive,
 * project (engine→graph bridge), ring (WASM arithmetic), manifest.
 *
 * All local — pure computation, never leaves the device.
 *
 * @version 2.0.0
 */

import { register } from "../registry";

register({
  ns: "kernel",
  label: "UOR Engine",
  layer: 0,
  operations: {
    encode: {
      handler: async (params: any) => {
        const { singleProofHash } = await import("@/modules/engine");
        return singleProofHash(params?.content ?? params);
      },
      description: "Content-address any object via URDNA2015 → SHA-256 → IPv6 ULA",
      paramsSchema: { type: "object", properties: { content: { description: "Any JSON-serializable object to encode" } } },
    },
    decode: {
      handler: async (params: any) => {
        const { verifySingleProof } = await import("@/modules/engine");
        return verifySingleProof(params?.content, params?.expectedId);
      },
      description: "Verify a content-addressed object against its expected derivation ID",
    },
    verify: {
      handler: async (params: any) => {
        const { verifySingleProof } = await import("@/modules/engine");
        return verifySingleProof(params?.content, params?.expectedId);
      },
      description: "Alias for decode — verify integrity of content-addressed data",
    },
    derive: {
      handler: async (params: any) => {
        const { singleProofHash } = await import("@/modules/engine");
        return singleProofHash(params?.content ?? params);
      },
      description: "Derive canonical identity (derivation ID, CID, IPv6) from content",
    },

    // ── Engine → Graph Bridge ─────────────────────────────────────────
    project: {
      handler: async (params: any) => {
        const { singleProofHash } = await import("@/modules/engine");
        const { call } = await import("../bus");

        // Step 1: Derive canonical identity from content
        const proof = await singleProofHash(params?.content ?? params);

        // Step 2: Project into the knowledge graph
        const graphResult = await call("graph/put", {
          node: {
            uorAddress: proof.cidV1,
            derivationId: proof.derivation_id,
            ipv6: proof.ipv6,
            label: params?.label ?? proof.derivation_id?.slice(0, 16),
            content: params?.content ?? params,
            type: params?.type ?? "uor:ContentAddressed",
            metadata: {
              encodedAt: new Date().toISOString(),
              braille: proof.braille,
              ...(params?.metadata ?? {}),
            },
          },
        });

        return {
          proof,
          graph: graphResult,
          projected: true,
        };
      },
      description:
        "Atomic engine→graph bridge: encode content via UOR engine AND project it into the knowledge graph in one call",
      paramsSchema: {
        type: "object",
        properties: {
          content: { description: "Any JSON-serializable object to encode and project" },
          label: { type: "string", description: "Optional human-readable label for the graph node" },
          type: { type: "string", description: "Optional RDF type IRI" },
          metadata: { type: "object", description: "Optional additional metadata" },
        },
        required: ["content"],
      },
    },

    // ── WASM Ring Arithmetic ──────────────────────────────────────────
    ring: {
      handler: async (params: any) => {
        const bridge = await import("@/lib/wasm/uor-bridge");
        const op = params?.op ?? "add";
        const a = params?.a ?? 0;
        const b = params?.b;

        switch (op) {
          case "add": return bridge.constRingAdd?.(a, b) ?? a + b;
          case "mul": return bridge.constRingMul?.(a, b) ?? a * b;
          case "neg": return bridge.constRingNeg?.(a) ?? -a;
          case "eval": return bridge.constRingEvalQ0?.(a) ?? a;
          case "factorize": return bridge.constRingFactorize?.(a) ?? [a];
          case "classify": return bridge.constRingClassify?.(a) ?? "unknown";
          default:
            throw new Error(`Unknown ring operation: ${op}. Available: add, mul, neg, eval, factorize, classify`);
        }
      },
      description: "WASM-accelerated ring arithmetic in Z/(2^n)Z with TypeScript fallback",
      paramsSchema: {
        type: "object",
        properties: {
          op: { type: "string", enum: ["add", "mul", "neg", "eval", "factorize", "classify"] },
          a: { type: "number" },
          b: { type: "number" },
        },
        required: ["op", "a"],
      },
    },

    // ── Self-Description ──────────────────────────────────────────────
    manifest: {
      handler: async () => {
        const { BUS_MANIFEST } = await import("../manifest");
        return BUS_MANIFEST;
      },
      description: "Return the full bus manifest — every ns/op, its layer, and local/remote flag",
    },
  },
});
