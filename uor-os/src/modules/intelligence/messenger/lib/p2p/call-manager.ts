/**
 * Call Manager — Audio/Video calls via WebRTC.
 * ═════════════════════════════════════════════
 *
 * Manages audio/video call lifecycle:
 *   - Request camera/mic permissions
 *   - Create offer/answer with media tracks
 *   - Handle renegotiation for add/remove tracks
 *   - Kyber key exchange happens at the session level
 */

import { createSignalingChannel, type SignalPayload } from "./webrtc-signaling";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export type CallState = "idle" | "ringing" | "connecting" | "active" | "ended";
export type CallType = "audio" | "video";

export interface CallEvents {
  onStateChange: (state: CallState) => void;
  onRemoteStream: (stream: MediaStream) => void;
  onError: (error: string) => void;
}

export interface ActiveCall {
  state: CallState;
  type: CallType;
  localStream: MediaStream | null;
  answer: () => Promise<void>;
  hangup: () => void;
  toggleMute: () => boolean;
  toggleVideo: () => boolean;
}

/**
 * Initiate or receive a call.
 */
export function createCall(
  sessionId: string,
  userId: string,
  peerId: string,
  callType: CallType,
  isInitiator: boolean,
  events: CallEvents,
): ActiveCall {
  let state: CallState = "idle";
  let localStream: MediaStream | null = null;
  let pc: RTCPeerConnection | null = null;
  let muted = false;
  let videoOff = false;

  const setState = (s: CallState) => {
    state = s;
    events.onStateChange(s);
  };

  const signaling = createSignalingChannel(sessionId, userId, async (signal: SignalPayload) => {
    if (!pc) return;
    try {
      if (signal.type === "offer") {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.data as RTCSessionDescriptionInit));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await signaling.send("answer", answer);
        setState("active");
      } else if (signal.type === "answer") {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.data as RTCSessionDescriptionInit));
        setState("active");
      } else if (signal.type === "ice-candidate") {
        await pc.addIceCandidate(new RTCIceCandidate(signal.data as RTCIceCandidateInit));
      }
    } catch (err) {
      events.onError(`Signal error: ${err}`);
    }
  });

  const start = async () => {
    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === "video",
      });

      pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

      for (const track of localStream.getTracks()) {
        pc.addTrack(track, localStream);
      }

      pc.onicecandidate = (e) => {
        if (e.candidate) signaling.send("ice-candidate", e.candidate.toJSON());
      };

      pc.ontrack = (e) => {
        if (e.streams[0]) events.onRemoteStream(e.streams[0]);
      };

      pc.onconnectionstatechange = () => {
        if (pc?.connectionState === "failed" || pc?.connectionState === "disconnected") {
          setState("ended");
        }
      };

      if (isInitiator) {
        setState("ringing");
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await signaling.send("offer", offer);
      } else {
        setState("connecting");
      }
    } catch (err) {
      events.onError(`Failed to start call: ${err}`);
      setState("ended");
    }
  };

  // Start immediately
  start();

  return {
    get state() { return state; },
    type: callType,
    get localStream() { return localStream; },
    answer: async () => {
      // Answer is handled via signaling
      setState("connecting");
    },
    hangup: () => {
      localStream?.getTracks().forEach((t) => t.stop());
      pc?.close();
      signaling.destroy();
      setState("ended");
    },
    toggleMute: () => {
      muted = !muted;
      localStream?.getAudioTracks().forEach((t) => { t.enabled = !muted; });
      return muted;
    },
    toggleVideo: () => {
      videoOff = !videoOff;
      localStream?.getVideoTracks().forEach((t) => { t.enabled = !videoOff; });
      return videoOff;
    },
  };
}
