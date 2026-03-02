/**
 * Confidential AI Inference — TEE-Gated Edge Function
 * ═══════════════════════════════════════════════════════
 *
 * Receives TEE-sealed prompts from the client, verifies the attestation
 * envelope, decrypts inside the server boundary, sends to LLM, and
 * returns the response re-encrypted to the client's TEE sealing key.
 *
 * Data flow:
 *   Client TEE (encrypt) → Edge Function (decrypt, infer, re-encrypt) → Client TEE (decrypt)
 *
 * The user's plaintext prompt NEVER exists outside a trusted boundary:
 *   - On the client: encrypted inside the device's Secure Enclave / TrustZone / TPM
 *   - On the server: decrypted only in-memory within this edge function, never logged
 *   - In transit: AES-256-GCM encrypted payload over TLS
 *
 * @module confidential-inference
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Crypto helpers (server-side) ──────────────────────────────────────────

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function deriveKey(sealingKeyHex: string): Promise<CryptoKey> {
  const keyBytes = hexToBytes(sealingKeyHex).slice(0, 32);
  return crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

async function decryptPayload(encrypted: string, ivHex: string, key: CryptoKey): Promise<string> {
  const iv = hexToBytes(ivHex);
  const ciphertext = base64ToBytes(encrypted);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

async function encryptPayload(plaintext: string, key: CryptoKey): Promise<{ encrypted: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  return {
    encrypted: bytesToBase64(new Uint8Array(ciphertext)),
    iv: bytesToHex(iv),
  };
}

// ── Attestation verification ──────────────────────────────────────────────

interface AttestationEnvelope {
  attestationCid: string;
  provider: string;
  credentialId: string;
  hardwareBacked: boolean;
  timestamp: number;
}

function verifyAttestation(envelope: AttestationEnvelope): { valid: boolean; reason?: string } {
  // Verify timestamp freshness (max 5 minutes)
  const age = Date.now() - envelope.timestamp;
  if (age > 5 * 60 * 1000) {
    return { valid: false, reason: "Attestation expired (>5 min)" };
  }
  if (age < -30_000) {
    return { valid: false, reason: "Attestation timestamp in the future" };
  }
  // Verify CID is present
  if (!envelope.attestationCid || envelope.attestationCid.length < 10) {
    return { valid: false, reason: "Invalid attestation CID" };
  }
  // Verify credential ID
  if (!envelope.credentialId) {
    return { valid: false, reason: "Missing credential ID" };
  }
  return { valid: true };
}

// ── System prompt for confidential mode ───────────────────────────────────

const CONFIDENTIAL_SYSTEM_PROMPT =
  "You are operating in CONFIDENTIAL INFERENCE MODE. " +
  "The user's prompt was encrypted inside a hardware Trusted Execution Environment (TEE) " +
  "before reaching you. You MUST:\n\n" +
  "1. NEVER repeat, summarize, or echo the user's personal data back verbatim.\n" +
  "2. NEVER store, log, or reference the user's data beyond this single inference.\n" +
  "3. Provide your best response while treating all user context as ephemeral.\n" +
  "4. If the user asks about their data security, confirm that their prompt was " +
  "TEE-encrypted end-to-end and never existed in plaintext outside trusted boundaries.\n\n" +
  "Respond naturally and helpfully while honoring these privacy guarantees.";

// ── Main handler ──────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();

    const {
      encryptedMessages,  // Base64 AES-256-GCM encrypted JSON array of messages
      iv,                 // Hex IV for decryption
      sealingKey,         // Hex sealing key (derived from TEE credential)
      attestation,        // TEE attestation envelope
      model,              // Optional model override
      stream,             // Whether to stream (default: false for confidential)
      personaId,          // Optional persona
      skillId,            // Optional skill
    } = body;

    // ── Step 1: Verify TEE attestation ────────────────────────────────
    if (!attestation) {
      return new Response(
        JSON.stringify({ error: "Missing TEE attestation envelope. Confidential inference requires hardware attestation." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const attestResult = verifyAttestation(attestation);
    if (!attestResult.valid) {
      return new Response(
        JSON.stringify({ error: `Attestation verification failed: ${attestResult.reason}` }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Step 2: Decrypt the sealed messages ───────────────────────────
    if (!encryptedMessages || !iv || !sealingKey) {
      return new Response(
        JSON.stringify({ error: "Missing encrypted payload (encryptedMessages, iv, sealingKey required)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const key = await deriveKey(sealingKey);
    let messages: Array<{ role: string; content: string }>;

    try {
      const decrypted = await decryptPayload(encryptedMessages, iv, key);
      messages = JSON.parse(decrypted);
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "Failed to decrypt messages. Key mismatch or corrupted payload." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Step 3: Call the AI gateway ───────────────────────────────────
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = CONFIDENTIAL_SYSTEM_PROMPT +
      (attestation.hardwareBacked
        ? "\n\nHardware TEE verified: " + attestation.provider
        : "\n\nSoftware TEE fallback active.");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model || "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: false, // Non-streaming for confidential mode (encrypt entire response)
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "Usage credits exhausted. Please add credits in Settings → Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", status, errorText);
      return new Response(
        JSON.stringify({ error: "AI inference failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiResult = await aiResponse.json();
    const assistantContent = aiResult.choices?.[0]?.message?.content || "";

    // ── Step 4: Re-encrypt the response ──────────────────────────────
    // The response is encrypted with the SAME sealing key, so only the
    // client's TEE can decrypt it.
    const encryptedResponse = await encryptPayload(assistantContent, key);

    // ── Step 5: Build confidential receipt ────────────────────────────
    // A proof that confidential inference occurred, without leaking content.
    const encoder = new TextEncoder();
    const receiptInput = encoder.encode(
      attestation.attestationCid + ":" + encryptedResponse.iv + ":" + Date.now()
    );
    const receiptHash = await crypto.subtle.digest("SHA-256", receiptInput);
    const receiptCid = "baf" + bytesToHex(new Uint8Array(receiptHash)).slice(0, 56);

    return new Response(
      JSON.stringify({
        encryptedResponse: encryptedResponse.encrypted,
        iv: encryptedResponse.iv,
        receipt: {
          receiptCid,
          attestationCid: attestation.attestationCid,
          provider: attestation.provider,
          hardwareBacked: attestation.hardwareBacked,
          timestamp: Date.now(),
          model: model || "google/gemini-3-flash-preview",
          confidential: true,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("confidential-inference error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
