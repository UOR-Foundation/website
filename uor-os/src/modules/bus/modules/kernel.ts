/**
 * Service Mesh — Kernel Module Registration.
 * @ontology uor:ServiceMesh
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
            uorAddress: proof.cid,
            derivationId: proof.derivationId,
            ipv6: proof.ipv6Address["u:ipv6"],
            label: params?.label ?? proof.derivationId?.slice(0, 16),
            content: params?.content ?? params,
            type: params?.type ?? "uor:ContentAddressed",
            metadata: {
              encodedAt: new Date().toISOString(),
              braille: proof.uorAddress["u:glyph"],
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
        const b = params?.b ?? 0;

        switch (op) {
          case "add": return bridge.add(a, b);
          case "sub": return bridge.sub(a, b);
          case "mul": return bridge.mul(a, b);
          case "neg": return bridge.neg(a);
          case "bnot": return bridge.bnot(a);
          case "succ": return bridge.succ(a);
          case "pred": return bridge.pred(a);
          case "xor": return bridge.xor(a, b);
          case "and": return bridge.and(a, b);
          case "or": return bridge.or(a, b);
          case "eval": return bridge.constRingEvalQ0(a, b);
          case "factorize": return bridge.factorize(a);
          case "classify": return bridge.classifyByte(a);
          case "verify": return bridge.verifyCriticalIdentity(a);
          default:
            throw new Error(`Unknown ring operation: ${op}. Available: add, sub, mul, neg, bnot, succ, pred, xor, and, or, eval, factorize, classify, verify`);
        }
      },
      description: "WASM-accelerated ring arithmetic in Z/(2^n)Z with TypeScript fallback",
      paramsSchema: {
        type: "object",
        properties: {
          op: { type: "string", enum: ["add", "sub", "mul", "neg", "bnot", "succ", "pred", "xor", "and", "or", "eval", "factorize", "classify", "verify"] },
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
