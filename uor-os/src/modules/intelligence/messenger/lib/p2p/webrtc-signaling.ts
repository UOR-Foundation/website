/**
 * WebRTC Signaling via Supabase Realtime
 * ═══════════════════════════════════════
 *
 * Uses Supabase Realtime broadcast channels as the signaling
 * server for WebRTC offer/answer/ICE exchange.
 * No external TURN/STUN dependency for signaling.
 */

import { supabase } from "@/integrations/supabase/client";

export type SignalType = "offer" | "answer" | "ice-candidate";

export interface SignalPayload {
  type: SignalType;
  senderId: string;
  sessionId: string;
  data: RTCSessionDescriptionInit | RTCIceCandidateInit;
}

/**
 * Create a signaling channel for a session.
 * Returns send/receive functions + cleanup.
 */
export function createSignalingChannel(
  sessionId: string,
  userId: string,
  onSignal: (signal: SignalPayload) => void,
) {
  const channelName = `webrtc-signal-${sessionId}`;

  const channel = supabase
    .channel(channelName)
    .on("broadcast", { event: "signal" }, ({ payload }) => {
      const signal = payload as SignalPayload;
      // Don't process our own signals
      if (signal.senderId !== userId) {
        onSignal(signal);
      }
    })
    .subscribe();

  const send = async (type: SignalType, data: any) => {
    await channel.send({
      type: "broadcast",
      event: "signal",
      payload: {
        type,
        senderId: userId,
        sessionId,
        data,
      } satisfies SignalPayload,
    });
  };

  const destroy = () => {
    supabase.removeChannel(channel);
  };

  return { send, destroy };
}
