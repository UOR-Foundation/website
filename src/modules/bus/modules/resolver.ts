/**
 * Sovereign Bus — Resolver Module.
 * Layer 1 — local. Resolve UOR addresses to content and back.
 * @version 1.0.0
 */
import { register } from "../registry";

register({
  ns: "resolver",
  label: "Resolver",
  layer: 1,
  operations: {
    resolve: {
      handler: async (params: any) => {
        const { call } = await import("../bus");
        // Resolve through the knowledge graph
        const node = await call("graph/get", { uorAddress: params?.address ?? params });
        return node;
      },
      description: "Resolve a UOR address to its content via the knowledge graph",
    },
    reverse: {
      handler: async (params: any) => {
        const { singleProofHash } = await import("@/modules/engine");
        const proof = await singleProofHash(params?.content ?? params);
        return {
          address: proof.cidV1,
          derivationId: proof.derivation_id,
          ipv6: proof.ipv6,
        };
      },
      description: "Reverse-resolve content to its UOR address",
    },
  },
});
