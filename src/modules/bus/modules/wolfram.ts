/**
 * Sovereign Bus — Wolfram Module.
 * Layer 2 — remote. Computational knowledge via Wolfram Alpha.
 * @version 1.0.0
 */
import { register } from "../registry";

register({
  ns: "wolfram",
  label: "Wolfram Alpha",
  layer: 2,
  defaultRemote: true,
  operations: {
    compute: {
      handler: async (params: any) => {
        throw new Error("[bus] wolfram/compute is a remote method — should be dispatched via gateway");
      },
      description: "Compute via Wolfram Alpha API",
    },
  },
});
