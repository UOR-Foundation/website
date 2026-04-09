/**
 * Sovereign Bus — Ring Module Registration.
 * ═════════════════════════════════════════════════════════════════
 *
 * Exposes UOR ring operations via the bus API.
 * Automatically dispatches to native Rust (Tauri) or JS fallback.
 *
 * @version 2.0.0
 */

import { register } from "../registry";

register({
  ns: "ring",
  label: "UOR Ring Engine",
  layer: 0,
  operations: {
    op: {
      handler: async (params: any) => {
        const { ringEngine } = await import("@/lib/ring-engine");
        if (!params?.op) throw new Error("Provide op: neg|bnot|succ|pred|add|mul|popcount");
        return ringEngine.op(params.op, params.a ?? 0, params.b ?? 0);
      },
      description: "Execute a single ring operation (Z/256Z)",
      paramsSchema: {
        type: "object",
        properties: {
          op: { type: "string", enum: ["neg", "bnot", "succ", "pred", "add", "mul", "popcount", "verify_all"] },
          a: { type: "number" },
          b: { type: "number" },
        },
        required: ["op", "a"],
      },
    },
    batch: {
      handler: async (params: any) => {
        const { ringEngine } = await import("@/lib/ring-engine");
        if (!params?.ops || !Array.isArray(params.ops)) throw new Error("Provide ops array");
        return ringEngine.batch(params.ops);
      },
      description: "Execute a batch of ring operations in a single call (eliminates per-element IPC overhead)",
      paramsSchema: {
        type: "object",
        properties: {
          ops: {
            type: "array",
            items: {
              type: "object",
              properties: {
                op: { type: "string" },
                a: { type: "number" },
                b: { type: "number" },
              },
            },
          },
        },
        required: ["ops"],
      },
    },
    stratum: {
      handler: async (params: any) => {
        const { ringEngine } = await import("@/lib/ring-engine");
        return ringEngine.stratum(params?.value ?? 0);
      },
      description: "Compute stratum analysis: popcount, level, and Braille glyph",
      paramsSchema: {
        type: "object",
        properties: {
          value: { type: "number", description: "Byte value 0-255" },
        },
        required: ["value"],
      },
    },
    braille: {
      handler: async (params: any) => {
        const { ringEngine } = await import("@/lib/ring-engine");
        const bytes = params?.bytes ?? [];
        return ringEngine.brailleEncode(bytes);
      },
      description: "Convert byte array to Braille address string",
      paramsSchema: {
        type: "object",
        properties: {
          bytes: { type: "array", items: { type: "number" } },
        },
        required: ["bytes"],
      },
    },
    verify: {
      handler: async () => {
        const { ringEngine } = await import("@/lib/ring-engine");
        return ringEngine.verifyCriticalIdentity();
      },
      description: "Verify critical identity: neg(bnot(x)) === succ(x) for all x in R₈",
    },
    backend: {
      handler: async () => {
        const { ringEngine } = await import("@/lib/ring-engine");
        return { backend: ringEngine.getBackend() };
      },
      description: "Check which ring backend is active: 'native' (Tauri/Rust) or 'wasm' (browser/JS)",
    },
  },
});
