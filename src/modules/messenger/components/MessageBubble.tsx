import { Check, CheckCheck, Lock, Reply, Timer, Shield, ShieldCheck, MessageSquare, Send, Briefcase, Gamepad2, Mail, Hash } from "lucide-react";
import { useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { DecryptedMessage } from "../lib/types";
import FileMessage from "./FileMessage";
import VoiceMessage from "./VoiceMessage";
import ImageMessage from "./ImageMessage";
import ReplyBubble from "./ReplyBubble";
import ReactionPicker from "./ReactionPicker";
import MessageContextMenu from "./MessageContextMenu";
import PlatformBadge from "./PlatformBadge";
import { formatFileSize } from "../lib/file-transfer";
import { getTimeRemaining } from "../lib/ephemeral";
import { toast } from "sonner";

interface Props {
  message: DecryptedMessage;
  replyToMessage?: DecryptedMessage;
  onReply?: (msg: DecryptedMessage) => void;
  onEdit?: (msg: DecryptedMessage) => void;
  onDelete?: (msgId: string) => void;
  onPin?: (msg: DecryptedMessage) => void;
  observeRef?: (el: HTMLDivElement | null) => void;
  isGroup?: boolean;
  expiresAfterSeconds?: number | null;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
}

const PLATFORM_MINI_ICONS: Record<string, typeof Shield> = {
  whatsapp: MessageSquare,
  telegram: Send,
  signal: Lock,
  discord: Gamepad2,
  slack: Briefcase,
  email: Mail,
  matrix: Hash,
};

function senderColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
  const colors = [
    "text-teal-400", "text-indigo-400", "text-pink-400", "text-amber-400",
    "text-emerald-400", "text-violet-400", "text-rose-400", "text-cyan-400",
    "text-orange-400", "text-lime-400", "text-fuchsia-400", "text-sky-400",
  ];
  return colors[Math.abs(hash) % colors.length];
}

export default function MessageBubble({
  message, replyToMessage, onReply, onEdit, onDelete, onPin, observeRef,
  isGroup, expiresAfterSeconds, isFirstInGroup = true, isLastInGroup = true,
}: Props) {
  const { user } = useAuth();
  const sent = message.sentByMe;
  const isEncrypted = message.plaintext === "🔒 Encrypted";
  const isDecrypting = message.plaintext === "🔒 Encrypted";
  const [showReactions, setShowReactions] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ show: boolean; x: number; y: number }>({ show: false, x: 0, y: 0 });

  const time = new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const isEditable = sent && !isEncrypted && (Date.now() - new Date(message.createdAt).getTime() < 15 * 60 * 1000);
  const isDeletable = sent && (Date.now() - new Date(message.createdAt).getTime() < 15 * 60 * 1000);
  const ttl = message.selfDestructSeconds ?? expiresAfterSeconds;
  const timeRemaining = getTimeRemaining(message.createdAt, ttl);

  // Platform icon for bridged messages
  const bridgePlatform = message.sourcePlatform && message.sourcePlatform !== "native" ? message.sourcePlatform : null;
  const BridgeIcon = bridgePlatform ? (PLATFORM_MINI_ICONS[bridgePlatform] ?? null) : null;

  const nameColor = useMemo(() => {
    if (!isGroup || sent) return "";
    return senderColor(message.senderId ?? "");
  }, [isGroup, sent, message.senderId]);

  const handleReact = useCallback(async (emoji: string) => {
    if (!user) return;
    try {
      const existing = message.reactions?.find(r => r.userId === user.id && r.emoji === emoji);
      if (existing) {
        await supabase.from("message_reactions").delete()
          .eq("message_id", message.id).eq("user_id", user.id).eq("emoji", emoji);
      } else {
        await supabase.from("message_reactions").insert({ message_id: message.id, user_id: user.id, emoji } as any);
      }
    } catch { toast.error("Failed to react"); }
  }, [user, message.id, message.reactions]);

  const reactionCounts = new Map<string, { count: number; byMe: boolean }>();
  if (message.reactions) {
    for (const r of message.reactions) {
      const existing = reactionCounts.get(r.emoji) ?? { count: 0, byMe: false };
      existing.count++;
      if (r.userId === user?.id) existing.byMe = true;
      reactionCounts.set(r.emoji, existing);
    }
  }

  const StatusIcon = () => {
    if (!sent) return null;
    switch (message.deliveryStatus) {
      case "read": return <CheckCheck size={13} className="text-teal-400/80" />;
      case "delivered": return <CheckCheck size={13} className="text-white/30" />;
      case "sent": return <Check size={13} className="text-white/30" />;
      case "sending": return <div className="w-3 h-3 border border-white/20 border-t-white/50 rounded-full animate-spin" />;
      default: return <Check size={13} className="text-white/30" />;
    }
  };

  const borderRadius = sent
    ? `${isFirstInGroup ? "18px" : "6px"} 6px 6px ${isLastInGroup ? "18px" : "6px"}`
    : `6px ${isFirstInGroup ? "18px" : "6px"} ${isLastInGroup ? "18px" : "6px"} 6px`;

  const renderContent = () => {
    // Decrypting skeleton state
    if (isDecrypting) {
      return (
        <div className="flex items-center gap-2 py-1">
          <div className="w-4 h-4 border border-white/15 border-t-white/40 rounded-full animate-spin flex-shrink-0" />
          <span className="text-sm text-white/30">Decrypting…</span>
        </div>
      );
    }
    switch (message.messageType) {
      case "file":
        return message.fileManifest ? <FileMessage manifest={message.fileManifest} sentByMe={sent} /> : <span className="text-sm">📎 File attachment</span>;
      case "image":
        return message.fileManifest ? (
          <ImageMessage filename={message.fileManifest.filename} sizeLabel={formatFileSize(message.fileManifest.sizeBytes)} sentByMe={sent} thumbnailUrl={message.fileManifest.thumbnailUrl} />
        ) : <span className="text-sm">📷 Image</span>;
      case "voice":
        return <VoiceMessage sentByMe={sent} duration={30} />;
      default:
        return (
          <span className="text-[14.5px] leading-[1.45]">
            {message.plaintext}
            {message.editedAt && <span className="text-[10px] text-white/25 ml-1 italic">(edited)</span>}
          </span>
        );
    }
  };

  return (
    <div
      ref={observeRef}
      className={`flex ${sent ? "justify-end" : "justify-start"} ${isLastInGroup ? "mb-2" : "mb-[2px]"} px-[5%] group relative animate-fade-in`}
      style={{ animationDuration: "100ms" }}
      onDoubleClick={() => onReply?.(message)}
    >
      <div className="relative max-w-[70%]">
        {onReply && !isEncrypted && (
          <button
            onClick={() => onReply(message)}
            className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-75 text-white/15 hover:text-white/40 active:scale-[0.9] ${
              sent ? "-left-8" : "-right-8"
            }`}
          >
            <Reply size={14} />
          </button>
        )}

        <div
          className={`relative max-w-full min-w-[72px] px-3 pt-1.5 pb-1.5 select-none ${
            sent
              ? "bg-[hsl(237,40%,22%)] text-white/90"
              : "bg-white/[0.07] text-white/87"
          }`}
          style={{ borderRadius, wordBreak: "break-word" }}
          onContextMenu={(e) => {
            e.preventDefault();
            setContextMenu({ show: true, x: e.clientX, y: e.clientY });
          }}
        >
          {/* Sender name with platform icon and verification shield */}
          {isGroup && !sent && isFirstInGroup && message.senderName && (
            <p className={`text-[12px] font-semibold mb-0.5 truncate flex items-center gap-1 ${nameColor}`}>
              {bridgePlatform && BridgeIcon && (
                <BridgeIcon size={10} className="text-white/30 flex-shrink-0" />
              )}
              {!bridgePlatform && (
                <PlatformBadge platform={message.sourcePlatform ?? "native"} size="sm" />
              )}
              {message.senderName}
              {!bridgePlatform && (
                <ShieldCheck size={9} className="text-teal-400/40 flex-shrink-0" />
              )}
            </p>
          )}
          {!isGroup && bridgePlatform && BridgeIcon && !sent && isFirstInGroup && (
            <div className="mb-0.5 flex items-center gap-1">
              <BridgeIcon size={10} className="text-white/30" />
              <span className="text-[10px] text-white/25">{bridgePlatform}</span>
            </div>
          )}

          {replyToMessage && <ReplyBubble replyTo={replyToMessage} />}

          {renderContent()}

          {/* Reactions as pills */}
          {reactionCounts.size > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5 -mb-0.5">
              {Array.from(reactionCounts.entries()).map(([emoji, { count, byMe }]) => (
                <button
                  key={emoji}
                  onClick={() => handleReact(emoji)}
                  className={`text-xs rounded-full px-2 py-0.5 transition-all duration-75 active:scale-[0.9] flex items-center gap-0.5 ${
                    byMe ? "bg-teal-500/15 border border-teal-500/20" : "bg-white/[0.06] border border-white/[0.04] hover:bg-white/[0.1]"
                  }`}
                >
                  <span>{emoji}</span>
                  {count > 1 && <span className="text-[10px] text-white/40">{count}</span>}
                </button>
              ))}
            </div>
          )}

          {/* Time + status + verification */}
          <span className="float-right mt-0.5 ml-3 flex items-center gap-1 text-[10px] text-white/25 leading-none translate-y-0.5 select-none">
            {timeRemaining && !timeRemaining.expired && (
              <span className="flex items-center gap-0.5 text-amber-400/50 mr-0.5">
                <Timer size={9} />{timeRemaining.label}
              </span>
            )}
            {!bridgePlatform && !sent && (
              <Shield size={8} className="text-teal-400/30" />
            )}
            {time}
            <StatusIcon />
          </span>

          <ReactionPicker show={showReactions} onClose={() => setShowReactions(false)} onReact={handleReact} />
        </div>

        <MessageContextMenu
          show={contextMenu.show}
          message={message}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={() => setContextMenu({ show: false, x: 0, y: 0 })}
          onReply={() => onReply?.(message)}
          onCopy={() => toast.success("Copied")}
          onEdit={isEditable ? () => onEdit?.(message) : undefined}
          onDelete={isDeletable ? () => onDelete?.(message.id) : undefined}
          onPin={() => onPin?.(message)}
          onReact={() => setShowReactions(true)}
          canEdit={isEditable}
          canDelete={isDeletable}
        />
      </div>
    </div>
  );
}
