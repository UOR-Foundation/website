/**
 * Service Mesh — UNS (Universal Name Service) Module.
 * @ontology uor:ServiceMesh
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
        const { resolveByName } = await import("@/modules/identity/uns");
        return resolveByName(params?.name ?? params);
      },
      description: "Resolve a UNS name to its canonical identity",
    },
    publish: {
      handler: async (params: any) => {
        const { publishRecord, createRecord, generateKeypair } = await import("@/modules/identity/uns");
        const record = await createRecord(params);
        const keypair = params?.keypair ?? await generateKeypair();
        return publishRecord(record, keypair);
      },
      description: "Publish a name binding to the name service",
    },
    computeId: {
      handler: async (params: any) => {
        const { singleProofHash } = await import("@/modules/kernel/engine");
        return singleProofHash(params?.name ?? params);
      },
      description: "Compute the UOR identity for a name without publishing",
    },
  },
});
