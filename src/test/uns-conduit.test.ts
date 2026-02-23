import { describe, it, expect, beforeAll } from "vitest";
import { generateKeypair } from "@/modules/uns/core/keypair";
import type { UnsKeypair } from "@/modules/uns/core/keypair";
import {
  kyberKeygen,
  kyberEncapsulate,
  kyberDecapsulate,
  aesGcmEncrypt,
  aesGcmDecrypt,
  UnsConduit,
  ConduitRelay,
} from "@/modules/uns/trust/conduit";
import type { TunnelInitMessage } from "@/modules/uns/trust/conduit";

// @ts-ignore
import { ml_dsa65 } from "@noble/post-quantum/ml-dsa.js";

describe("UNS Conduit — Post-Quantum Encrypted Tunnel", () => {
  let clientKp: UnsKeypair;

  beforeAll(async () => {
    clientKp = await generateKeypair();
  });

  // ── Kyber-1024 KEM ────────────────────────────────────────────────────────

  it("1. kyberEncapsulate produces { sharedSecret(32B), ciphertext(1568B) }", () => {
    const kp = kyberKeygen();
    const { sharedSecret, ciphertext } = kyberEncapsulate(kp.publicKey);
    expect(sharedSecret.length).toBe(32);
    expect(ciphertext.length).toBe(1568);
  });

  it("2. kyberDecapsulate(ciphertext, privateKey) produces same sharedSecret", () => {
    const kp = kyberKeygen();
    const { sharedSecret: ss1, ciphertext } = kyberEncapsulate(kp.publicKey);
    const ss2 = kyberDecapsulate(ciphertext, kp.secretKey);
    expect(ss1).toEqual(ss2);
  });

  // ── AES-256-GCM ──────────────────────────────────────────────────────────

  it("3. aesGcmDecrypt(aesGcmEncrypt(key, plaintext)) === plaintext", () => {
    const key = new Uint8Array(32);
    crypto.getRandomValues(key);
    const plaintext = new TextEncoder().encode("Hello UNS Conduit!");

    const encrypted = aesGcmEncrypt(key, plaintext);
    const decrypted = aesGcmDecrypt(key, encrypted);
    expect(Array.from(decrypted)).toEqual(Array.from(plaintext));
  });

  it("4. aesGcmDecrypt with wrong key throws error", () => {
    const key1 = new Uint8Array(32);
    const key2 = new Uint8Array(32);
    crypto.getRandomValues(key1);
    crypto.getRandomValues(key2);

    const encrypted = aesGcmEncrypt(key1, new Uint8Array([1, 2, 3]));
    expect(() => aesGcmDecrypt(key2, encrypted)).toThrow("tag mismatch");
  });

  it("5. Modified ciphertext fails aesGcmDecrypt (auth tag check)", () => {
    const key = new Uint8Array(32);
    crypto.getRandomValues(key);
    const encrypted = aesGcmEncrypt(key, new Uint8Array([10, 20, 30]));

    // Tamper with a ciphertext byte (after nonce, before tag)
    encrypted[13] ^= 0xff;
    expect(() => aesGcmDecrypt(key, encrypted)).toThrow("tag mismatch");
  });

  // ── Mock Tunnel Handshake ─────────────────────────────────────────────────

  it("6. Mock tunnel: TUNNEL_INIT sent first; TUNNEL_READY received second", async () => {
    const messages: string[] = [];
    let onMsg: ((data: string) => void) | null = null;

    const identityStore = new Map<string, { "cert:keyBytes": string }>();
    identityStore.set(clientKp.canonicalId, clientKp.publicKeyObject as any);
    const relay = new ConduitRelay(identityStore);

    const conduit = new UnsConduit({
      relayUrl: "wss://relay.uor.network/conduit",
      originUrl: "http://localhost:8080",
      identity: clientKp,
    });

    const connectPromise = conduit.connect({
      send: (msg: string) => {
        messages.push(msg);
        // Simulate relay response
        const initMsg = JSON.parse(msg) as TunnelInitMessage;
        expect(initMsg.type).toBe("TUNNEL_INIT");

        relay.handleInit(initMsg).then(({ readyMsg }) => {
          onMsg?.(JSON.stringify(readyMsg));
        });
      },
      close: () => {},
      onMessage: (handler) => { onMsg = handler; },
    });

    await connectPromise;

    expect(messages.length).toBe(1);
    expect(JSON.parse(messages[0]).type).toBe("TUNNEL_INIT");
    expect(conduit.status()).toBe("connected");
  });

  it("7. tunnelCanonicalId() returns valid canonical ID pattern after connect()", async () => {
    const identityStore = new Map<string, { "cert:keyBytes": string }>();
    identityStore.set(clientKp.canonicalId, clientKp.publicKeyObject as any);
    const relay = new ConduitRelay(identityStore);

    const conduit = new UnsConduit({
      relayUrl: "wss://relay.uor.network/conduit",
      originUrl: "http://localhost:8080",
      identity: clientKp,
    });

    let onMsg: ((data: string) => void) | null = null;
    await conduit.connect({
      send: (msg: string) => {
        relay.handleInit(JSON.parse(msg)).then(({ readyMsg }) => {
          onMsg?.(JSON.stringify(readyMsg));
        });
      },
      close: () => {},
      onMessage: (handler) => { onMsg = handler; },
    });

    const tid = conduit.tunnelCanonicalId();
    expect(tid).not.toBeNull();
    expect(tid!).toMatch(/^urn:uor:derivation:sha256:[a-f0-9]{64}$/);
  });

  it("8. Dilithium-3 signature in TUNNEL_INIT verifies against identity public key", async () => {
    let capturedInit: TunnelInitMessage | null = null;
    let onMsg: ((data: string) => void) | null = null;

    const identityStore = new Map<string, { "cert:keyBytes": string }>();
    identityStore.set(clientKp.canonicalId, clientKp.publicKeyObject as any);
    const relay = new ConduitRelay(identityStore);

    const conduit = new UnsConduit({
      relayUrl: "wss://relay.uor.network/conduit",
      originUrl: "http://localhost:8080",
      identity: clientKp,
    });

    await conduit.connect({
      send: (msg: string) => {
        capturedInit = JSON.parse(msg);
        relay.handleInit(capturedInit!).then(({ readyMsg }) => {
          onMsg?.(JSON.stringify(readyMsg));
        });
      },
      close: () => {},
      onMessage: (handler) => { onMsg = handler; },
    });

    // Manually verify the Dilithium-3 signature
    const kyberPkBytes = fromBase64url(capturedInit!.kyberPublicKey);
    const sigBytes = fromBase64url(capturedInit!.dilithiumSignature);
    const valid = ml_dsa65.verify(sigBytes, kyberPkBytes, clientKp.publicKeyBytes);
    expect(valid).toBe(true);
  });

  it("9. aesGcmEncrypt output length === 12 (nonce) + plaintext.length + 16 (tag)", () => {
    const key = new Uint8Array(32);
    crypto.getRandomValues(key);
    const plaintext = new Uint8Array(100);

    const encrypted = aesGcmEncrypt(key, plaintext);
    expect(encrypted.length).toBe(12 + 100 + 16);
  });

  it("10. Two kyberEncapsulate calls produce different ciphertexts (ephemeral KEM)", () => {
    const kp = kyberKeygen();
    const { ciphertext: ct1 } = kyberEncapsulate(kp.publicKey);
    const { ciphertext: ct2 } = kyberEncapsulate(kp.publicKey);

    // Extremely unlikely to be equal
    let same = true;
    for (let i = 0; i < ct1.length; i++) {
      if (ct1[i] !== ct2[i]) { same = false; break; }
    }
    expect(same).toBe(false);
  });
});

// Helper for test 8 — re-export from conduit for base64url decode
function fromBase64url(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
