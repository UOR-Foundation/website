/**
 * BridgeConnectionPanel — Settings panel for managing platform bridge connections.
 *
 * Shows connected platforms with status indicators and provides flows to
 * connect new platforms (QR code for WhatsApp, phone for Signal, OAuth for Slack, etc.)
 */

import { useState, useEffect, useCallback } from "react";
import { X, Wifi, WifiOff, RefreshCw, Plus, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import PlatformBadge from "./PlatformBadge";
import type { BridgePlatform } from "../lib/types";
import { toast } from "sonner";

interface Props {
  onClose: () => void;
}

interface BridgeConnection {
  id: string;
  platform: string;
  status: string;
  externalUserId?: string;
  connectedAt?: string;
  lastSyncedAt?: string;
}

const AVAILABLE_PLATFORMS: Array<{
  platform: BridgePlatform;
  label: string;
  description: string;
  method: string;
}> = [
  { platform: "whatsapp", label: "WhatsApp", description: "Connect via QR code scan", method: "qr_code" },
  { platform: "telegram", label: "Telegram", description: "Connect with phone number", method: "phone_code" },
  { platform: "signal", label: "Signal", description: "Link as secondary device", method: "link_device" },
  { platform: "discord", label: "Discord", description: "Connect with token or QR", method: "token" },
  { platform: "slack", label: "Slack", description: "OAuth workspace authorization", method: "oauth" },
  { platform: "email", label: "Email", description: "IMAP/SMTP credentials", method: "imap_credentials" },
  { platform: "linkedin", label: "LinkedIn", description: "Connect with credentials", method: "credentials" },
  { platform: "twitter", label: "X / Twitter", description: "OAuth authorization", method: "oauth" },
  { platform: "instagram", label: "Instagram", description: "Connect via Meta bridge", method: "credentials" },
  { platform: "sms", label: "SMS", description: "Connect via Twilio", method: "phone_code" },
];

export default function BridgeConnectionPanel({ onClose }: Props) {
  const { user } = useAuth();
  const [connections, setConnections] = useState<BridgeConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);

  const fetchConnections = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from("bridge_connections")
      .select("*")
      .eq("user_id", user.id)
      .order("platform");

    setConnections(
      (data ?? []).map((c: any) => ({
        id: c.id,
        platform: c.platform,
        status: c.status,
        externalUserId: c.external_user_id,
        connectedAt: c.connected_at,
        lastSyncedAt: c.last_synced_at,
      })),
    );
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const initiateConnection = async (platform: BridgePlatform) => {
    if (!user) return;
    setConnecting(platform);

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/matrix-bridge-gateway/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({ platform }),
        },
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      toast.success(`${platform} bridge initiated — follow the instructions to complete setup`);
      fetchConnections();
    } catch (err) {
      toast.error(`Failed to connect ${platform}`);
      console.error(err);
    } finally {
      setConnecting(null);
    }
  };

  const disconnectPlatform = async (connectionId: string, platform: string) => {
    await supabase
      .from("bridge_connections")
      .update({ status: "disconnected" } as any)
      .eq("id", connectionId);

    toast.success(`${platform} disconnected`);
    fetchConnections();
  };

  const connectedPlatforms = new Set(connections.map((c) => c.platform));

  return (
    <div className="h-full flex flex-col bg-slate-950/90 backdrop-blur-sm border-l border-white/[0.04]">
      {/* Header */}
      <div className="h-[60px] flex items-center justify-between px-4 border-b border-white/[0.04] flex-shrink-0">
        <h2 className="text-sm font-semibold text-white/80">Bridge Connections</h2>
        <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Connected platforms */}
        {connections.length > 0 && (
          <div className="p-4">
            <p className="text-[11px] text-white/30 uppercase tracking-wider mb-3">Connected</p>
            <div className="space-y-2">
              {connections.map((conn) => (
                <div
                  key={conn.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.04]"
                >
                  <div className="flex items-center gap-3">
                    <PlatformBadge platform={conn.platform as BridgePlatform} size="md" />
                    <div>
                      <p className="text-sm text-white/70 capitalize">{conn.platform}</p>
                      <p className="text-[11px] text-white/30">
                        {conn.status === "connected" ? (
                          <span className="flex items-center gap-1">
                            <Wifi size={10} className="text-green-400" />
                            Connected
                            {conn.lastSyncedAt && ` · Synced ${new Date(conn.lastSyncedAt).toLocaleDateString()}`}
                          </span>
                        ) : conn.status === "connecting" ? (
                          <span className="flex items-center gap-1">
                            <RefreshCw size={10} className="animate-spin text-amber-400" />
                            Connecting…
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <WifiOff size={10} className="text-red-400" />
                            Disconnected
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => disconnectPlatform(conn.id, conn.platform)}
                    className="text-[11px] text-red-400/50 hover:text-red-400 transition-colors"
                  >
                    Disconnect
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available platforms */}
        <div className="p-4">
          <p className="text-[11px] text-white/30 uppercase tracking-wider mb-3">
            {connections.length > 0 ? "Add Platform" : "Connect Your Platforms"}
          </p>
          <div className="space-y-1.5">
            {AVAILABLE_PLATFORMS.filter((p) => !connectedPlatforms.has(p.platform)).map((platform) => (
              <button
                key={platform.platform}
                onClick={() => initiateConnection(platform.platform)}
                disabled={connecting === platform.platform}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.03] hover:border-white/[0.06] transition-all group"
              >
                <div className="flex items-center gap-3">
                  <PlatformBadge platform={platform.platform} size="md" />
                  <div className="text-left">
                    <p className="text-sm text-white/60 group-hover:text-white/80 transition-colors">
                      {platform.label}
                    </p>
                    <p className="text-[11px] text-white/25">{platform.description}</p>
                  </div>
                </div>
                {connecting === platform.platform ? (
                  <RefreshCw size={14} className="text-white/30 animate-spin" />
                ) : (
                  <ChevronRight size={14} className="text-white/15 group-hover:text-white/30 transition-colors" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="p-4">
          <div className="rounded-xl bg-teal-500/[0.04] border border-teal-500/[0.08] p-3">
            <p className="text-[11px] text-teal-400/50 leading-relaxed">
              Bridge connections use the Matrix protocol with mautrix bridges to securely relay messages.
              Your credentials never leave your device — all bridge connections run locally with E2EE.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
