/**
 * Bridge Protocol — Abstract interface for social platform bridges.
 * ═════════════════════════════════════════════════════════════════
 *
 * Enables interoperability with WhatsApp, Telegram, Signal, and Email
 * through a unified message interface anchored to UOR identities.
 */

import type { BridgePlatform, BridgeMessage } from "../types";

/** Canonical identity mapping from external platform to UOR. */
export interface UorIdentityMapping {
  platform: BridgePlatform;
  externalId: string;
  uorCanonicalId: string;
  displayName: string;
  verified: boolean;
}

/** Encrypted payload for bridge messages. */
export interface EncryptedBridgePayload {
  ciphertext: string;
  envelopeCid: string;
  messageHash: string;
}

/**
 * Abstract bridge interface — all platform bridges implement this.
 */
export interface MessageBridge {
  /** Platform identifier. */
  readonly platform: BridgePlatform;

  /** Initialize the bridge connection. */
  connect(): Promise<void>;

  /** Disconnect the bridge. */
  disconnect(): Promise<void>;

  /** Check if bridge is connected. */
  isConnected(): boolean;

  /** Send a message through the bridge. */
  sendMessage(to: string, content: string, metadata?: Record<string, unknown>): Promise<void>;

  /** Register a handler for incoming messages. */
  onMessage(handler: (msg: BridgeMessage) => void): () => void;

  /** Map an external identity to UOR canonical identity. */
  mapIdentity(externalId: string): Promise<UorIdentityMapping | null>;

  /** Get bridge status and health info. */
  getStatus(): { connected: boolean; lastSync?: string; error?: string };
}

/**
 * Bridge registry — manages all active bridges.
 */
class BridgeRegistry {
  private bridges = new Map<BridgePlatform, MessageBridge>();

  register(bridge: MessageBridge): void {
    this.bridges.set(bridge.platform, bridge);
  }

  get(platform: BridgePlatform): MessageBridge | undefined {
    return this.bridges.get(platform);
  }

  getAll(): MessageBridge[] {
    return Array.from(this.bridges.values());
  }

  getConnected(): MessageBridge[] {
    return this.getAll().filter((b) => b.isConnected());
  }
}

export const bridgeRegistry = new BridgeRegistry();
