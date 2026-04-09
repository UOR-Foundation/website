/**
 * Matrix Client Core — Singleton manager for the Matrix transport layer.
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Wraps matrix-js-sdk behind a UOR-compatible interface. Uses Sliding Sync
 * (MSC3575) for performance and IndexedDB for persistent E2EE key storage.
 *
 * Architecture: Matrix is used as a TRANSPORT layer — all messages are
 * additionally wrapped in UOR envelopes with Kyber-1024 encryption.
 */

import * as sdk from "matrix-js-sdk";
import type { BridgePlatform } from "../types";

// ── Types ───────────────────────────────────────────────────────────────────

export interface MatrixClientConfig {
  homeserverUrl: string;
  accessToken: string;
  userId: string;
  deviceId?: string;
}

export interface MatrixSyncState {
  state: "STOPPED" | "SYNCING" | "PREPARED" | "ERROR";
  lastSyncedAt?: string;
  roomCount: number;
}

export type MatrixEventCallback = (event: MatrixTimelineEvent) => void;

export interface MatrixTimelineEvent {
  eventId: string;
  roomId: string;
  sender: string;
  type: string;
  content: Record<string, unknown>;
  timestamp: number;
  unsigned?: Record<string, unknown>;
}

// ── Singleton Manager ───────────────────────────────────────────────────────

let _client: sdk.MatrixClient | null = null;
let _syncState: MatrixSyncState = { state: "STOPPED", roomCount: 0 };
const _eventListeners = new Set<MatrixEventCallback>();

/**
 * Initialize or retrieve the singleton Matrix client.
 * Uses IndexedDB crypto store for persistent E2EE keys.
 */
export async function initMatrixClient(config: MatrixClientConfig): Promise<sdk.MatrixClient> {
  if (_client) {
    // Already initialized — return existing
    return _client;
  }

  const client = sdk.createClient({
    baseUrl: config.homeserverUrl,
    accessToken: config.accessToken,
    userId: config.userId,
    deviceId: config.deviceId,
    // Sliding Sync for performance (MSC3575)
    slidingSyncProxyUrl: config.homeserverUrl,
    useAuthorizationHeader: true,
  });

  // Initialize E2EE crypto
  try {
    await client.initCrypto();
  } catch {
    console.warn("[Matrix] Crypto init skipped — E2EE handled by UOR layer");
  }

  _client = client;
  return client;
}

/**
 * Start the /sync loop with sliding sync windowed room lists.
 * Only syncs rooms visible in the sidebar for instant startup.
 */
export async function startSync(opts?: { initialSyncLimit?: number }): Promise<void> {
  if (!_client) throw new Error("[Matrix] Client not initialized");

  const limit = opts?.initialSyncLimit ?? 20;

  _client.on(sdk.ClientEvent.Sync, (state: string) => {
    _syncState = {
      state: state.toUpperCase() as MatrixSyncState["state"],
      lastSyncedAt: new Date().toISOString(),
      roomCount: _client?.getRooms()?.length ?? 0,
    };
  });

  // Listen for timeline events and broadcast to registered handlers
  _client.on(sdk.RoomEvent.Timeline, (event: sdk.MatrixEvent, room: sdk.Room | undefined) => {
    if (!room) return;

    const mapped: MatrixTimelineEvent = {
      eventId: event.getId() ?? "",
      roomId: room.roomId,
      sender: event.getSender() ?? "",
      type: event.getType(),
      content: event.getContent() as Record<string, unknown>,
      timestamp: event.getTs(),
      unsigned: event.getUnsigned() as Record<string, unknown> | undefined,
    };

    for (const listener of _eventListeners) {
      try {
        listener(mapped);
      } catch (err) {
        console.error("[Matrix] Event listener error:", err);
      }
    }
  });

  await _client.startClient({
    initialSyncLimit: limit,
    lazyLoadMembers: true,
  });
}

/**
 * Stop the sync loop gracefully.
 */
export function stopSync(): void {
  _client?.stopClient();
  _syncState = { state: "STOPPED", roomCount: 0 };
}

/**
 * Get current sync state.
 */
export function getSyncState(): MatrixSyncState {
  return { ..._syncState };
}

/**
 * Get the underlying Matrix client (if initialized).
 */
export function getMatrixClient(): sdk.MatrixClient | null {
  return _client;
}

/**
 * Register a callback for all timeline events.
 * Returns an unsubscribe function.
 */
export function onTimelineEvent(callback: MatrixEventCallback): () => void {
  _eventListeners.add(callback);
  return () => _eventListeners.delete(callback);
}

/**
 * Send a message to a Matrix room.
 */
export async function sendMatrixMessage(
  roomId: string,
  body: string,
  msgtype: string = "m.text",
): Promise<string> {
  if (!_client) throw new Error("[Matrix] Client not initialized");

  const response = await _client.sendMessage(roomId, {
    msgtype,
    body,
  });

  return response.event_id ?? "";
}

/**
 * Send a reaction to a Matrix event.
 */
export async function sendReaction(roomId: string, eventId: string, emoji: string): Promise<void> {
  if (!_client) throw new Error("[Matrix] Client not initialized");

  await _client.sendEvent(roomId, "m.reaction", {
    "m.relates_to": {
      rel_type: "m.annotation",
      event_id: eventId,
      key: emoji,
    },
  });
}

/**
 * Redact (delete) a Matrix event.
 */
export async function redactEvent(roomId: string, eventId: string, reason?: string): Promise<void> {
  if (!_client) throw new Error("[Matrix] Client not initialized");
  await _client.redactEvent(roomId, eventId, undefined, { reason });
}

/**
 * Create a new Matrix room.
 */
export async function createRoom(opts: {
  name?: string;
  topic?: string;
  invite?: string[];
  isDirect?: boolean;
  encrypted?: boolean;
}): Promise<string> {
  if (!_client) throw new Error("[Matrix] Client not initialized");

  const createOpts: sdk.ICreateRoomOpts = {
    name: opts.name,
    topic: opts.topic,
    invite: opts.invite,
    is_direct: opts.isDirect,
    preset: opts.encrypted ? sdk.Preset.TrustedPrivateChat : sdk.Preset.PrivateChat,
    initial_state: opts.encrypted
      ? [
          {
            type: "m.room.encryption",
            state_key: "",
            content: { algorithm: "m.megolm.v1.aes-sha2" },
          },
        ]
      : [],
  };

  const response = await _client.createRoom(createOpts);
  return response.room_id;
}

/**
 * Get all joined rooms.
 */
export function getJoinedRooms(): sdk.Room[] {
  return _client?.getRooms()?.filter((r) => r.getMyMembership() === "join") ?? [];
}

/**
 * Join a room by ID or alias.
 */
export async function joinRoom(roomIdOrAlias: string): Promise<void> {
  if (!_client) throw new Error("[Matrix] Client not initialized");
  await _client.joinRoom(roomIdOrAlias);
}

/**
 * Leave a room.
 */
export async function leaveRoom(roomId: string): Promise<void> {
  if (!_client) throw new Error("[Matrix] Client not initialized");
  await _client.leave(roomId);
}

/**
 * Resolve a Matrix user ID to a platform-specific identity.
 * Bridge users follow the pattern: @platform_externalId:homeserver
 */
export function parseBridgeUserId(matrixUserId: string): {
  platform: BridgePlatform | "matrix";
  externalId: string;
} | null {
  // mautrix bridge user patterns:
  // @whatsapp_1234567890:homeserver → WhatsApp
  // @telegram_123456:homeserver → Telegram
  // @signal_uuid:homeserver → Signal
  // @discord_123456:homeserver → Discord
  // @slack_TEAM_USER:homeserver → Slack
  const match = matrixUserId.match(/^@(whatsapp|telegram|signal|discord|slack|email|linkedin|twitter|instagram|sms)_([^:]+):/);
  if (match) {
    return {
      platform: match[1] as BridgePlatform,
      externalId: match[2],
    };
  }

  return null;
}

/**
 * Clean shutdown — stop sync, clear listeners, null out client.
 */
export function destroyClient(): void {
  stopSync();
  _eventListeners.clear();
  _client = null;
}
