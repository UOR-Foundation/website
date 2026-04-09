/**
 * Sovereign Bus — UNS (Universal Name Service) Module.
 * Layer 1 — local. Resolve, publish, and compute UNS identities.
 * @version 1.0.0
 */
import { register } from "../registry";

register({
  ns: "uns",
  label: "Name Service",
  layer: 1,
  operations: {
    resolve: {
      handler: async (params: any) => {
        const { resolveByName } = await import("@/modules/uns");
        return resolveByName(params?.name ?? params);
      },
      description: "Resolve a UNS name to its canonical identity",
    },
    publish: {
      handler: async (params: any) => {
        const { publishRecord, createRecord } = await import("@/modules/uns");
        const record = await createRecord(params);
        return publishRecord(record);
      },
      description: "Publish a name binding to the name service",
    },
    computeId: {
      handler: async (params: any) => {
        const { singleProofHash } = await import("@/modules/engine");
        return singleProofHash(params?.name ?? params);
      },
      description: "Compute the UOR identity for a name without publishing",
    },
  },
});
