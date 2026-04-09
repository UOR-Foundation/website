/**
 * Email Bridge — SMTP/IMAP → UMP envelope wrapper.
 * ═════════════════════════════════════════════════
 *
 * Wraps email in UMP envelopes, enabling encrypted email
 * through the same messenger UI. Uses edge functions for
 * actual SMTP/IMAP transport.
 *
 * This is a scaffold — the edge function implementation
 * will handle actual mail delivery.
 */

import type { MessageBridge, UorIdentityMapping } from "./bridge-protocol";
import type { BridgeMessage } from "../types";

export class EmailBridge implements MessageBridge {
  readonly platform = "email" as const;
  private connected = false;
  private handlers: Array<(msg: BridgeMessage) => void> = [];

  async connect(): Promise<void> {
    // In production: verify SMTP/IMAP credentials via edge function
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.handlers = [];
  }

  isConnected(): boolean {
    return this.connected;
  }

  async sendMessage(to: string, content: string, metadata?: Record<string, unknown>): Promise<void> {
    if (!this.connected) throw new Error("Email bridge not connected");

    // In production: call edge function to send email
    // The edge function wraps the content in a UMP envelope
    // and sends via SMTP with S/MIME or PGP encryption
    console.log(`[EmailBridge] Would send to ${to}:`, content, metadata);
  }

  onMessage(handler: (msg: BridgeMessage) => void): () => void {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
    };
  }

  async mapIdentity(email: string): Promise<UorIdentityMapping | null> {
    // In production: look up UOR identity by email from profiles
    return {
      platform: "email",
      externalId: email,
      uorCanonicalId: `urn:uor:email:${email}`,
      displayName: email.split("@")[0],
      verified: false,
    };
  }

  getStatus() {
    return { connected: this.connected };
  }
}
