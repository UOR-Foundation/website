/**
 * WhatsApp Bridge — Connects to WhatsApp Business API.
 * ════════════════════════════════════════════════════
 *
 * Uses existing WhatsApp credentials (WHATSAPP_ACCESS_TOKEN,
 * WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_BUSINESS_ACCOUNT_ID)
 * to bridge messages through the WhatsApp Cloud API.
 *
 * This is a scaffold — the edge function handles actual API calls.
 */

import { supabase } from "@/integrations/supabase/client";
import type { MessageBridge, UorIdentityMapping } from "./bridge-protocol";
import type { BridgeMessage } from "../types";

export class WhatsAppBridge implements MessageBridge {
  readonly platform = "whatsapp" as const;
  private connected = false;
  private handlers: Array<(msg: BridgeMessage) => void> = [];

  async connect(): Promise<void> {
    // Verify WhatsApp credentials are configured
    // In production: call edge function to validate token
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.handlers = [];
  }

  isConnected(): boolean {
    return this.connected;
  }

  async sendMessage(to: string, content: string): Promise<void> {
    if (!this.connected) throw new Error("WhatsApp bridge not connected");

    // Call edge function to send via WhatsApp Cloud API
    const { error } = await supabase.functions.invoke("whatsapp-send", {
      body: { to, content },
    });

    if (error) throw new Error(`WhatsApp send failed: ${error.message}`);
  }

  onMessage(handler: (msg: BridgeMessage) => void): () => void {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
    };
  }

  async mapIdentity(phoneNumber: string): Promise<UorIdentityMapping | null> {
    return {
      platform: "whatsapp",
      externalId: phoneNumber,
      uorCanonicalId: `urn:uor:whatsapp:${phoneNumber}`,
      displayName: phoneNumber,
      verified: false,
    };
  }

  getStatus() {
    return { connected: this.connected };
  }
}
