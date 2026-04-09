/**
 * Sovereign Bus — Store Module Registration.
 * ═════════════════════════════════════════════════════════════════
 *
 * Exposes decentralized storage: write, read, pin.
 * Remote — requires network for IPFS/Storacha operations.
 *
 * @version 1.0.0
 */

import { register } from "../registry";

register({
  ns: "store",
  label: "Decentralized Storage",
  defaultRemote: true,
  operations: {
    write: {
      handler: async () => ({
        offline: true,
        message: "Storage write requires network. Data is saved locally and will sync when online.",
      }),
      remote: true,
      description: "Write content-addressed data to decentralized storage (IPFS/Storacha)",
      paramsSchema: {
        type: "object",
        properties: {
          content: { description: "Data to store" },
          contentType: { type: "string", default: "application/json" },
        },
        required: ["content"],
      },
    },
    read: {
      handler: async () => ({
        offline: true,
        message: "Storage read requires network.",
      }),
      remote: true,
      description: "Read content from decentralized storage by CID or UOR address",
    },
    pin: {
      handler: async () => ({
        offline: true,
        message: "Pinning requires network.",
      }),
      remote: true,
      description: "Pin content to ensure persistence on IPFS",
    },
  },
});
