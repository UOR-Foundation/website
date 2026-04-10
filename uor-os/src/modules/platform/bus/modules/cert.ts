/**
 * Service Mesh — Certificate Module Registration.
 * @ontology uor:ServiceMesh
 * ═════════════════════════════════════════════════════════════════
 *
 * Exposes certificate operations: issue, verify, chain.
 * All local — pure cryptographic computation.
 *
 * @version 1.0.0
 */

import { register } from "../registry";

register({
  ns: "cert",
  label: "Certificates",
  operations: {
    issue: {
      handler: async (params: any) => {
        const { singleProofHash } = await import("@/lib/uor-canonical");
        const certPayload = {
          "@context": { cert: "https://uor.foundation/cert/" },
          "@type": "cert:Certificate",
          "cert:subject": params?.subject,
          "cert:issuedAt": new Date().toISOString(),
          ...params?.claims,
        };
        const proof = await singleProofHash(certPayload);
        return {
          certificate: certPayload,
          derivationId: proof.derivationId,
          ipv6: proof.ipv6Address["u:ipv6"],
          cid: proof.cid,
        };
      },
      description: "Issue a UOR certificate for a subject with claims",
      paramsSchema: {
        type: "object",
        properties: {
          subject: { type: "string", description: "UOR address or IRI of the subject" },
          claims: { type: "object", description: "Additional claims to include" },
        },
        required: ["subject"],
      },
    },
    verify: {
      handler: async (params: any) => {
        const { verifySingleProof } = await import("@/lib/uor-canonical");
        return verifySingleProof(params?.certificate, params?.expectedId);
      },
      description: "Verify a certificate against its expected derivation ID",
    },
    chain: {
      handler: async (params: any) => {
        const { localGraphStore } = await import("@/modules/data/knowledge-graph");
        const chain = [];
        let current = params?.startAddress;
        const maxDepth = params?.maxDepth ?? 10;
        let depth = 0;
        while (current && depth < maxDepth) {
          const node = await localGraphStore.getNode(current);
          if (!node) break;
          chain.push(node);
          const edges = await localGraphStore.queryBySubject(current);
          const derivedFrom = edges.find((e: any) => e.predicate === "cert:derivedFrom");
          current = derivedFrom?.object;
          depth++;
        }
        return { chain, depth: chain.length };
      },
      description: "Walk the certificate derivation chain from a starting address",
    },
  },
});
