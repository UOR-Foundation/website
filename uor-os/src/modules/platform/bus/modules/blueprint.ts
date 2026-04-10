/**
 * Service Mesh — Blueprint Module Registration.
 * @ontology uor:ServiceMesh
 * ═════════════════════════════════════════════════════════════════
 *
 * Exposes object blueprint operations: decompose, materialize, export.
 * All local — JSON-LD blueprints with UOR identity.
 *
 * @version 1.0.0
 */

import { register } from "../registry";

register({
  ns: "blueprint",
  label: "Object Blueprints",
  operations: {
    decompose: {
      handler: async (params: any) => {
        const { decomposeToBlueprint } = await import("@/modules/data/knowledge-graph");
        return decomposeToBlueprint(params?.uorAddress);
      },
      description: "Decompose a KG node into a portable JSON-LD blueprint",
      paramsSchema: {
        type: "object",
        properties: { uorAddress: { type: "string" } },
        required: ["uorAddress"],
      },
    },
    materialize: {
      handler: async (params: any) => {
        const { materializeFromBlueprint } = await import("@/modules/data/knowledge-graph");
        return materializeFromBlueprint(params?.blueprint);
      },
      description: "Reconstruct a KG node + edges from a blueprint",
    },
    export: {
      handler: async (params: any) => {
        const { decomposeToBlueprint, serializeBlueprint } = await import(
          "@/modules/data/knowledge-graph"
        );
        const bp = await decomposeToBlueprint(params?.uorAddress);
        return serializeBlueprint(bp);
      },
      description: "Decompose and serialize a blueprint to portable JSON string",
    },
    verify: {
      handler: async (params: any) => {
        const { verifyBlueprint } = await import("@/modules/data/knowledge-graph");
        return verifyBlueprint(params?.blueprint);
      },
      description: "Verify blueprint integrity against its UOR identity",
    },
  },
});
