/**
 * Service Mesh — Vault Module.
 * @ontology uor:ServiceMesh
 * Layer 1 — local. Encryption and secure local storage.
 * @version 1.0.0
 */
import { register } from "../registry";

register({
  ns: "vault",
  label: "Sovereign Vault",
  layer: 1,
  operations: {
    encrypt: {
      handler: async (params: any) => {
        const content = params?.content ?? params;
        const encoder = new TextEncoder();
        const data = encoder.encode(typeof content === "string" ? content : JSON.stringify(content));
        const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
        const exportedKey = await crypto.subtle.exportKey("jwk", key);
        return {
          ciphertext: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
          iv: btoa(String.fromCharCode(...iv)),
          key: exportedKey,
          algorithm: "AES-GCM-256",
        };
      },
      description: "Encrypt content with AES-GCM-256",
    },
    decrypt: {
      handler: async (params: any) => {
        const key = await crypto.subtle.importKey("jwk", params.key, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
        const iv = Uint8Array.from(atob(params.iv), (c) => c.charCodeAt(0));
        const ciphertext = Uint8Array.from(atob(params.ciphertext), (c) => c.charCodeAt(0));
        const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
        const decoder = new TextDecoder();
        const text = decoder.decode(decrypted);
        try { return JSON.parse(text); } catch { return text; }
      },
      description: "Decrypt content with AES-GCM-256",
    },
    store: {
      handler: async (params: any) => {
        // Encrypt then store in the knowledge graph
        const { call } = await import("../bus");
        const content = params?.content ?? params;
        const encoder = new TextEncoder();
        const data = encoder.encode(typeof content === "string" ? content : JSON.stringify(content));
        const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
        const exportedKey = await crypto.subtle.exportKey("jwk", key);
        const ciphertext = btoa(String.fromCharCode(...new Uint8Array(encrypted)));

        // Project encrypted content into the graph
        const result = await call("kernel/project", {
          content: { encrypted: ciphertext, algorithm: "AES-GCM-256" },
          type: "uor:EncryptedContent",
          label: params?.label ?? "vault-entry",
        });

        return {
          ...result,
          iv: btoa(String.fromCharCode(...iv)),
          key: exportedKey,
        };
      },
      description: "Encrypt and store content in the knowledge graph",
    },
  },
});
