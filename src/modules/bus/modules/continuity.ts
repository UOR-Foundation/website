/**
 * Sovereign Bus — Continuity Module.
 * Layer 1 — remote. Session state persistence and chaining.
 * @version 1.0.0
 */
import { register } from "../registry";

register({
  ns: "continuity",
  label: "Continuity",
  layer: 1,
  defaultRemote: true,
  operations: {
    save: {
      handler: async (params: any) => {
        throw new Error("[bus] continuity/save is a remote method — should be dispatched via gateway");
      },
      description: "Save session state for continuity",
    },
    restore: {
      handler: async (params: any) => {
        throw new Error("[bus] continuity/restore is a remote method — should be dispatched via gateway");
      },
      description: "Restore session state",
    },
    chain: {
      handler: async (params: any) => {
        throw new Error("[bus] continuity/chain is a remote method — should be dispatched via gateway");
      },
      description: "Chain session states into a DAG",
    },
  },
});
