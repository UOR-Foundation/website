/**
 * Q-IPC — Inter-Process Communication via Session Chains
 * ═══════════════════════════════════════════════════════
 *
 * Two agents communicate by appending to a shared session chain.
 * Messages are CIDs. The chain IS the conversation — immutable,
 * verifiable, replayable.
 *
 * @module qkernel/q-ipc
 */

import { toHex, encodeUtf8 } from "../genesis/axiom-ring";
import { sha256 } from "../genesis/axiom-hash";
import { createCid } from "../genesis/axiom-cid";
import { canonicalEncode } from "../genesis/axiom-codec";

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

export interface QMessage {
  readonly messageCid: string;
  readonly senderPid: number;
  readonly payload: Uint8Array;
  readonly hScore: number;
  readonly parentCid: string | null;
  readonly sequenceNum: number;
  readonly timestamp: number;
}

export interface QChannel {
  readonly channelCid: string;
  readonly name: string;
  readonly participants: number[];
  readonly messages: QMessage[];
  readonly headCid: string | null;
  readonly minHScore: number;
  readonly createdAt: number;
  readonly closed: boolean;
}

export interface QSubscription {
  readonly subscriberId: number;
  readonly channelCid: string;
  readonly callback: (msg: QMessage) => void;
}

export interface IpcStats {
  readonly totalChannels: number;
  readonly activeChannels: number;
  readonly totalMessages: number;
  readonly totalParticipants: number;
  readonly rejectedMessages: number;
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

  createChannel(name: string, participants: number[], minHScore = 0.0): QChannel {
    const chanBytes = canonicalEncode({ name, participants, t: Date.now() });
    const hash = sha256(chanBytes);
    const channelCid = createCid(hash).string;

    const channel: QChannel = {
      channelCid, name, participants: [...participants],
      messages: [], headCid: null, minHScore,
      createdAt: Date.now(), closed: false,
    };

    this.channels.set(channelCid, channel);
    return channel;
  }

  getChannel(channelCid: string): QChannel | undefined { return this.channels.get(channelCid); }

  closeChannel(channelCid: string): boolean {
    const ch = this.channels.get(channelCid);
    if (!ch) return false;
    this.channels.set(channelCid, { ...ch, closed: true });
    return true;
  }

  channelsForPid(pid: number): QChannel[] {
    return Array.from(this.channels.values()).filter(ch => ch.participants.includes(pid));
  }

  // ── Message Passing ─────────────────────────────────────────────

  send(
    channelCid: string, senderPid: number, payload: Uint8Array, hScore: number
  ): { sent: boolean; message?: QMessage; reason?: string } {
    const ch = this.channels.get(channelCid);
    if (!ch) return { sent: false, reason: "channel_not_found" };
    if (ch.closed) return { sent: false, reason: "channel_closed" };
    if (!ch.participants.includes(senderPid)) return { sent: false, reason: "not_participant" };

    if (hScore < ch.minHScore) {
      this.rejectedCount++;
      return { sent: false, reason: `h_score_too_low:${hScore}<${ch.minHScore}` };
    }

    const parentCid = ch.headCid;
    const sequenceNum = ch.messages.length;

    const payloadHash = toHex(sha256(payload));
    const msgBytes = canonicalEncode({
      channel: channelCid, sender: senderPid,
      parent: parentCid, seq: sequenceNum,
      payload: payloadHash, t: Date.now(),
    });
    const msgHash = sha256(msgBytes);
    const messageCid = createCid(msgHash).string;

    const message: QMessage = {
      messageCid, senderPid, payload: new Uint8Array(payload),
      hScore, parentCid, sequenceNum, timestamp: Date.now(),
    };

    const updatedMessages = [...ch.messages, message];
    this.channels.set(channelCid, { ...ch, messages: updatedMessages, headCid: messageCid });

    for (const sub of this.subscriptions) {
      if (sub.channelCid === channelCid && sub.subscriberId !== senderPid) {
        sub.callback(message);
      }
    }

    return { sent: true, message };
  }

  receive(channelCid: string, sinceCid?: string): QMessage[] {
    const ch = this.channels.get(channelCid);
    if (!ch) return [];
    if (!sinceCid) return [...ch.messages];
    const idx = ch.messages.findIndex(m => m.messageCid === sinceCid);
    if (idx < 0) return [...ch.messages];
    return ch.messages.slice(idx + 1);
  }

  head(channelCid: string): QMessage | null {
    const ch = this.channels.get(channelCid);
    if (!ch || ch.messages.length === 0) return null;
    return ch.messages[ch.messages.length - 1];
  }

  // ── Subscriptions ───────────────────────────────────────────────

  subscribe(pid: number, channelCid: string, callback: (msg: QMessage) => void): void {
    this.subscriptions.push({ subscriberId: pid, channelCid, callback });
  }

  unsubscribe(pid: number, channelCid: string): boolean {
    const before = this.subscriptions.length;
    this.subscriptions = this.subscriptions.filter(
      s => !(s.subscriberId === pid && s.channelCid === channelCid)
    );
    return this.subscriptions.length < before;
  }

  // ── Chain Verification ──────────────────────────────────────────

  verifyChain(channelCid: string): { valid: boolean; length: number; breaks: number[] } {
    const ch = this.channels.get(channelCid);
    if (!ch) return { valid: false, length: 0, breaks: [] };

    const breaks: number[] = [];
    for (let i = 0; i < ch.messages.length; i++) {
      const msg = ch.messages[i];
      if (i === 0) { if (msg.parentCid !== null) breaks.push(i); }
      else { if (msg.parentCid !== ch.messages[i - 1].messageCid) breaks.push(i); }
    }

    return { valid: breaks.length === 0, length: ch.messages.length, breaks };
  }

  // ── Statistics ──────────────────────────────────────────────────

  stats(): IpcStats {
    const channels = Array.from(this.channels.values());
    const activeChannels = channels.filter(c => !c.closed).length;
    const totalMessages = channels.reduce((s, c) => s + c.messages.length, 0);
    const allParticipants = new Set<number>();
    for (const ch of channels) { for (const p of ch.participants) allParticipants.add(p); }

    let allValid = true;
    for (const ch of channels) {
      const v = this.verifyChain(ch.channelCid);
      if (!v.valid) { allValid = false; break; }
    }

    return {
      totalChannels: channels.length, activeChannels, totalMessages,
      totalParticipants: allParticipants.size,
      rejectedMessages: this.rejectedCount,
      chainIntegrityVerified: allValid,
    };
  }
}
