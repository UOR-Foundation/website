/**
 * Q-IPC — Inter-Process Communication via Session Chains
 * ═══════════════════════════════════════════════════════
 *
 * Two agents communicate by appending to a shared session chain.
 * Messages are CIDs. The chain IS the conversation — immutable,
 * verifiable, replayable.
 *
 *   ┌───────────────┬──────────────────────────────────────────┐
 *   │ Linux IPC     │ Q-IPC                                     │
 *   ├───────────────┼──────────────────────────────────────────┤
 *   │ pipe()        │ Shared session chain (two-party channel)  │
 *   │ msgget()      │ Channel registry (CID → chain)            │
 *   │ msgsnd()      │ Append CID to chain (content-addressed)   │
 *   │ msgrcv()      │ Read chain tail (latest CID)              │
 *   │ semaphore     │ H-score gate (min coherence to post)      │
 *   │ shared mem    │ Shared MMU page (same CID = same content) │
 *   │ signal        │ Chain event subscription                   │
 *   └───────────────┴──────────────────────────────────────────┘
 *
 * @module qkernel/q-ipc
 */

import { sha256, computeCid, bytesToHex } from "@/modules/uns/core/address";

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

/** A message on the chain — content-addressed, immutable */
export interface QMessage {
  readonly messageCid: string;       // content hash of the message
  readonly senderPid: number;
  readonly payload: Uint8Array;
  readonly hScore: number;           // sender's coherence at time of send
  readonly parentCid: string | null; // previous message CID (chain link)
  readonly sequenceNum: number;
  readonly timestamp: number;
}

/** A communication channel — a shared session chain */
export interface QChannel {
  readonly channelCid: string;       // CID of the channel itself
  readonly name: string;
  readonly participants: number[];   // PIDs
  readonly messages: QMessage[];
  readonly headCid: string | null;   // latest message CID
  readonly minHScore: number;        // minimum coherence to post
  readonly createdAt: number;
  readonly closed: boolean;
}

/** Channel subscription for event notification */
export interface QSubscription {
  readonly subscriberId: number;     // PID
  readonly channelCid: string;
  readonly callback: (msg: QMessage) => void;
}

/** IPC statistics */
export interface IpcStats {
  readonly totalChannels: number;
  readonly activeChannels: number;
  readonly totalMessages: number;
  readonly totalParticipants: number;
  readonly rejectedMessages: number;  // H-score too low
  readonly chainIntegrityVerified: boolean;
}

// ═══════════════════════════════════════════════════════════════════════
// Q-IPC Implementation
// ═══════════════════════════════════════════════════════════════════════

export class QIpc {
  private channels = new Map<string, QChannel>();
  private subscriptions: QSubscription[] = [];
  private rejectedCount = 0;

  // ── Channel Management ──────────────────────────────────────────

  /**
   * pipe() — Create a new IPC channel between processes.
   * Returns the channel CID.
   */
  async createChannel(
    name: string,
    participants: number[],
    minHScore = 0.0
  ): Promise<QChannel> {
    const chanBytes = new TextEncoder().encode(
      JSON.stringify({ name, participants, t: Date.now() })
    );
    const hash = await sha256(chanBytes);
    const channelCid = await computeCid(hash);

    const channel: QChannel = {
      channelCid,
      name,
      participants: [...participants],
      messages: [],
      headCid: null,
      minHScore,
      createdAt: Date.now(),
      closed: false,
    };

    this.channels.set(channelCid, channel);
    return channel;
  }

  /** Get a channel by CID */
  getChannel(channelCid: string): QChannel | undefined {
    return this.channels.get(channelCid);
  }

  /** Close a channel */
  closeChannel(channelCid: string): boolean {
    const ch = this.channels.get(channelCid);
    if (!ch) return false;
    this.channels.set(channelCid, { ...ch, closed: true });
    return true;
  }

  /** List all channels a PID participates in */
  channelsForPid(pid: number): QChannel[] {
    return Array.from(this.channels.values())
      .filter(ch => ch.participants.includes(pid));
  }

  // ── Message Passing ─────────────────────────────────────────────

  /**
   * msgsnd() — Append a message to a channel's session chain.
   * The message becomes a CID linked to the previous head.
   */
  async send(
    channelCid: string,
    senderPid: number,
    payload: Uint8Array,
    hScore: number
  ): Promise<{ sent: boolean; message?: QMessage; reason?: string }> {
    const ch = this.channels.get(channelCid);
    if (!ch) return { sent: false, reason: "channel_not_found" };
    if (ch.closed) return { sent: false, reason: "channel_closed" };

    // Participant check
    if (!ch.participants.includes(senderPid)) {
      return { sent: false, reason: "not_participant" };
    }

    // H-score coherence gate (semaphore equivalent)
    if (hScore < ch.minHScore) {
      this.rejectedCount++;
      return { sent: false, reason: `h_score_too_low:${hScore}<${ch.minHScore}` };
    }

    // Build message with chain link
    const parentCid = ch.headCid;
    const sequenceNum = ch.messages.length;

    const msgBytes = new TextEncoder().encode(
      JSON.stringify({
        channel: channelCid,
        sender: senderPid,
        parent: parentCid,
        seq: sequenceNum,
        payload: bytesToHex(await sha256(payload)),
        t: Date.now(),
      })
    );
    const msgHash = await sha256(msgBytes);
    const messageCid = await computeCid(msgHash);

    const message: QMessage = {
      messageCid,
      senderPid,
      payload: new Uint8Array(payload),
      hScore,
      parentCid,
      sequenceNum,
      timestamp: Date.now(),
    };

    // Append to chain
    const updatedMessages = [...ch.messages, message];
    this.channels.set(channelCid, {
      ...ch,
      messages: updatedMessages,
      headCid: messageCid,
    });

    // Notify subscribers
    for (const sub of this.subscriptions) {
      if (sub.channelCid === channelCid && sub.subscriberId !== senderPid) {
        sub.callback(message);
      }
    }

    return { sent: true, message };
  }

  /**
   * msgrcv() — Read messages from a channel.
   * Returns all messages, or messages since a given CID.
   */
  receive(channelCid: string, sinceCid?: string): QMessage[] {
    const ch = this.channels.get(channelCid);
    if (!ch) return [];

    if (!sinceCid) return [...ch.messages];

    const idx = ch.messages.findIndex(m => m.messageCid === sinceCid);
    if (idx < 0) return [...ch.messages];
    return ch.messages.slice(idx + 1);
  }

  /** Get the latest message on a channel */
  head(channelCid: string): QMessage | null {
    const ch = this.channels.get(channelCid);
    if (!ch || ch.messages.length === 0) return null;
    return ch.messages[ch.messages.length - 1];
  }

  // ── Subscriptions (signal equivalent) ───────────────────────────

  /** Subscribe to messages on a channel */
  subscribe(pid: number, channelCid: string, callback: (msg: QMessage) => void): void {
    this.subscriptions.push({
      subscriberId: pid,
      channelCid,
      callback,
    });
  }

  /** Unsubscribe a PID from a channel */
  unsubscribe(pid: number, channelCid: string): boolean {
    const before = this.subscriptions.length;
    this.subscriptions = this.subscriptions.filter(
      s => !(s.subscriberId === pid && s.channelCid === channelCid)
    );
    return this.subscriptions.length < before;
  }

  // ── Chain Verification ──────────────────────────────────────────

  /**
   * Verify the integrity of a channel's message chain.
   * Each message's parentCid must match the previous message's CID.
   */
  verifyChain(channelCid: string): { valid: boolean; length: number; breaks: number[] } {
    const ch = this.channels.get(channelCid);
    if (!ch) return { valid: false, length: 0, breaks: [] };

    const breaks: number[] = [];

    for (let i = 0; i < ch.messages.length; i++) {
      const msg = ch.messages[i];
      if (i === 0) {
        // Genesis message: parentCid should be null
        if (msg.parentCid !== null) breaks.push(i);
      } else {
        // Chain link: parentCid should be previous message's CID
        if (msg.parentCid !== ch.messages[i - 1].messageCid) breaks.push(i);
      }
    }

    return {
      valid: breaks.length === 0,
      length: ch.messages.length,
      breaks,
    };
  }

  // ── Statistics ──────────────────────────────────────────────────

  stats(): IpcStats {
    const channels = Array.from(this.channels.values());
    const activeChannels = channels.filter(c => !c.closed).length;
    const totalMessages = channels.reduce((s, c) => s + c.messages.length, 0);
    const allParticipants = new Set<number>();
    for (const ch of channels) {
      for (const p of ch.participants) allParticipants.add(p);
    }

    // Verify all chains
    let allValid = true;
    for (const ch of channels) {
      const v = this.verifyChain(ch.channelCid);
      if (!v.valid) { allValid = false; break; }
    }

    return {
      totalChannels: channels.length,
      activeChannels,
      totalMessages,
      totalParticipants: allParticipants.size,
      rejectedMessages: this.rejectedCount,
      chainIntegrityVerified: allValid,
    };
  }
}
