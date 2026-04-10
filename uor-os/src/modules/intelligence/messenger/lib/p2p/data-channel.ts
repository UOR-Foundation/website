/**
 * P2P Data Channel — Encrypted WebRTC data channel.
 * ══════════════════════════════════════════════════
 *
 * Wraps RTCDataChannel with UMP session encryption.
 * Messages sent through the data channel are still sealed
 * with the session AES key — the P2P path only removes
 * the cloud relay, not the encryption.
 */

import { createSignalingChannel, type SignalPayload } from "./webrtc-signaling";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export interface P2PChannelEvents {
  onOpen: () => void;
  onMessage: (data: string) => void;
  onClose: () => void;
  onError: (err: Event) => void;
}

export interface P2PConnection {
  state: "connecting" | "open" | "closed";
  send: (data: string) => void;
  close: () => void;
}

/**
 * Initiate or accept a P2P data channel for a session.
 * The initiator (lower userId lexicographically) creates the offer.
 */
export function createP2PChannel(
  sessionId: string,
  userId: string,
  peerId: string,
  events: P2PChannelEvents,
): P2PConnection {
  const isInitiator = userId < peerId;
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  let dc: RTCDataChannel | null = null;
  let channelState: "connecting" | "open" | "closed" = "connecting";

  const signaling = createSignalingChannel(sessionId, userId, async (signal: SignalPayload) => {
    try {
      if (signal.type === "offer" && !isInitiator) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.data as RTCSessionDescriptionInit));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await signaling.send("answer", answer);
      } else if (signal.type === "answer" && isInitiator) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.data as RTCSessionDescriptionInit));
      } else if (signal.type === "ice-candidate") {
        await pc.addIceCandidate(new RTCIceCandidate(signal.data as RTCIceCandidateInit));
      }
    } catch (err) {
      console.warn("[P2P] Signal processing error:", err);
    }
  });

  // ICE candidate handling
  pc.onicecandidate = (e) => {
    if (e.candidate) {
      signaling.send("ice-candidate", e.candidate.toJSON());
    }
  };

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
      channelState = "closed";
      events.onClose();
    }
  };

  const setupDataChannel = (channel: RTCDataChannel) => {
    dc = channel;
    channel.onopen = () => {
      channelState = "open";
      events.onOpen();
    };
    channel.onmessage = (e) => events.onMessage(e.data);
    channel.onclose = () => {
      channelState = "closed";
      events.onClose();
    };
    channel.onerror = (e) => events.onError(e);
  };

  if (isInitiator) {
    // Create data channel and offer
    const channel = pc.createDataChannel("ump-messages", { ordered: true });
    setupDataChannel(channel);

    pc.createOffer().then(async (offer) => {
      await pc.setLocalDescription(offer);
      await signaling.send("offer", offer);
    });
  } else {
    // Wait for data channel from initiator
    pc.ondatachannel = (e) => setupDataChannel(e.channel);
  }

  return {
    get state() { return channelState; },
    send: (data: string) => {
      if (dc?.readyState === "open") {
        dc.send(data);
      }
    },
    close: () => {
      dc?.close();
      pc.close();
      signaling.destroy();
      channelState = "closed";
    },
  };
}
