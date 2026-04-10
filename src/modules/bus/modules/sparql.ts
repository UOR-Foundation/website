/**
 * Service Mesh — SPARQL Module.
 * @ontology uor:ServiceMesh
 * Layer 1 — remote. SPARQL query and update via edge functions.
 * @version 1.0.0
 */
import { register } from "../registry";

register({
  ns: "sparql",
  label: "SPARQL",
  layer: 1,
  defaultRemote: true,
  operations: {
    query: {
      handler: async (params: any) => {
        throw new Error("[bus] sparql/query is a remote method — should be dispatched via gateway");
      },
      description: "Execute a SPARQL query against the knowledge graph",
    },
    update: {
      handler: async (params: any) => {
        throw new Error("[bus] sparql/update is a remote method — should be dispatched via gateway");
      },
      description: "Execute a SPARQL update against the knowledge graph",
    },
  },
});
