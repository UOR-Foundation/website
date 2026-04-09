/**
 * Sovereign Bus — Social Module.
 * Layer 2 — remote. Social messaging via edge functions.
 * @version 1.0.0
 */
import { register } from "../registry";

register({
  ns: "social",
  label: "Social",
  layer: 2,
  defaultRemote: true,
  operations: {
    send: {
      handler: async (params: any) => {
        throw new Error("[bus] social/send is a remote method — should be dispatched via gateway");
      },
      description: "Send a social message (WhatsApp, etc.)",
    },
    webhook: {
      handler: async (params: any) => {
        throw new Error("[bus] social/webhook is a remote method — should be dispatched via gateway");
      },
      description: "Handle incoming social webhook",
    },
  },
});
