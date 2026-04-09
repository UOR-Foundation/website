import { Check, CheckCheck, Lock, Reply, Timer } from "lucide-react";
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { DecryptedMessage } from "../lib/types";
import FileMessage from "./FileMessage";
import VoiceMessage from "./VoiceMessage";
import ImageMessage from "./ImageMessage";
import ReplyBubble from "./ReplyBubble";
import ReactionPicker from "./ReactionPicker";
import MessageContextMenu from "./MessageContextMenu";
import { formatFileSize } from "../lib/file-transfer";
import { getTimeRemaining } from "../lib/ephemeral";
import { toast } from "sonner";

interface Props {
  message: DecryptedMessage;
  replyToMessage?: DecryptedMessage;
  onReply?: (msg: DecryptedMessage) => void;
  onEdit?: (msg: DecryptedMessage) => void;
  onDelete?: (msgId: string) => void;
  observeRef?: (el: HTMLDivElement | null) => void;
  isGroup?: boolean;
  expiresAfterSeconds?: number | null;
}

export default function MessageBubble({ message, replyToMessage, onReply, onEdit, onDelete, observeRef, isGroup, expiresAfterSeconds }: Props) {
  const { user } = useAuth();
  const sent = message.sentByMe;
  const isEncrypted = message.plaintext === "🔒 Encrypted";
  const [showReactions, setShowReactions] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ show: boolean; x: number; y: number }>({ show: false, x: 0, y: 0 });

  const time = new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  // Check if message is editable (own message, within 15 minutes)
  const isEditable = sent && !isEncrypted && (Date.now() - new Date(message.createdAt).getTime() < 15 * 60 * 1000);
  const isDeletable = sent && (Date.now() - new Date(message.createdAt).getTime() < 15 * 60 * 1000);

  // Ephemeral timer
  const ttl = message.selfDestructSeconds ?? expiresAfterSeconds;
  const timeRemaining = getTimeRemaining(message.createdAt, ttl);

  const handleReact = useCallback(async (emoji: string) => {
    if (!user) return;
    try {
      // Check if already reacted with this emoji
      const existing = message.reactions?.find(r => r.userId === user.id && r.emoji === emoji);
      if (existing) {
        await supabase
          .from("message_reactions")
          .delete()
          .eq("message_id", message.id)
          .eq("user_id", user.id)
          .eq("emoji", emoji);
      } else {
        await supabase
          .from("message_reactions")
          .insert({
            message_id: message.id,
            user_id: user.id,
            emoji,
          } as any);
      }
    } catch (err) {
      toast.error("Failed to react");
    }
  }, [user, message.id, message.reactions]);

  // Aggregate reactions for display
  const reactionCounts = new Map<string, { count: number; byMe: boolean }>();
  if (message.reactions) {
    for (const r of message.reactions) {
      const existing = reactionCounts.get(r.emoji) ?? { count: 0, byMe: false };
      existing.count++;
      if (r.userId === user?.id) existing.byMe = true;
      reactionCounts.set(r.emoji, existing);
    }
  }

  // Delivery status icon
  const StatusIcon = () => {
    if (!sent) return null;
    switch (message.deliveryStatus) {
      case "read":
        return <CheckCheck size={14} className="text-teal-400/80 ml-0.5" />;
      case "delivered":
        return <CheckCheck size={14} className="text-white/30 ml-0.5" />;
      case "sent":
        return <Check size={14} className="text-white/30 ml-0.5" />;
      case "sending":
        return <div className="w-3 h-3 border border-white/20 border-t-white/50 rounded-full animate-spin ml-0.5" />;
      default:
        return <Check size={14} className="text-white/30 ml-0.5" />;
    }
  };

  const renderContent = () => {
    if (isEncrypted) {
      return (
        <span className="text-sm leading-relaxed flex items-center gap-1.5 text-white/40">
          <Lock size={12} />
          Encrypted message
        </span>
      );
    }

    switch (message.messageType) {
      case "file":
        if (message.fileManifest) {
          return <FileMessage manifest={message.fileManifest} sentByMe={sent} />;
        }
        return <span className="text-sm">📎 File attachment</span>;

      case "image":
        if (message.fileManifest) {
          return (
            <ImageMessage
              filename={message.fileManifest.filename}
              sizeLabel={formatFileSize(message.fileManifest.sizeBytes)}
              sentByMe={sent}
              thumbnailUrl={message.fileManifest.thumbnailUrl}
            />
          );
        }
        return <span className="text-sm">📷 Image</span>;

      case "voice":
        return <VoiceMessage sentByMe={sent} duration={30} />;

      default:
        return (
          <span className="text-sm leading-relaxed">
            {message.plaintext}
            {message.editedAt && (
              <span className="text-[10px] text-white/25 ml-1.5 italic">(edited)</span>
            )}
          </span>
        );
    }
  };

  return (
    <div
      ref={observeRef}
      className={`flex ${sent ? "justify-end" : "justify-start"} mb-1 px-[6%] group relative`}
      onDoubleClick={() => onReply?.(message)}
    >
      {/* Reaction picker trigger area */}
      <div className="relative max-w-[75%]">
        {/* Reply button on hover */}
        {onReply && !isEncrypted && (
          <button
            onClick={() => onReply(message)}
            className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-white/20 hover:text-white/50 ${
              sent ? "-left-8" : "-right-8"
            }`}
          >
            <Reply size={14} />
          </button>
        )}

        <div
          className={`
            relative max-w-full min-w-[80px] rounded-2xl px-3.5 pt-2 pb-2 
            ${sent
              ? "bg-indigo-500/15 border border-indigo-400/10 text-white/90"
              : "bg-white/[0.06] border border-white/[0.06] text-white/85"
            }
          `}
          style={{ wordBreak: "break-word" }}
          onContextMenu={(e) => {
            e.preventDefault();
            setContextMenu({ show: true, x: e.clientX, y: e.clientY });
          }}
        >
          {/* Sender name in group chats */}
          {isGroup && !sent && message.senderName && (
            <p className="text-[11px] font-medium text-teal-400/60 mb-0.5 truncate">
              {message.senderName}
            </p>
          )}

          {/* Reply reference */}
          {replyToMessage && <ReplyBubble replyTo={replyToMessage} />}

          {renderContent()}

          {/* Reactions display */}
          {reactionCounts.size > 0 && (
            <div className="flex flex-wrap gap-0.5 mt-1">
              {Array.from(reactionCounts.entries()).map(([emoji, { count, byMe }]) => (
                <button
                  key={emoji}
                  onClick={() => handleReact(emoji)}
                  className={`text-xs rounded-full px-1.5 py-0.5 transition-colors ${
                    byMe
                      ? "bg-teal-500/15 border border-teal-500/20"
                      : "bg-white/[0.06] border border-white/[0.04] hover:bg-white/[0.1]"
                  }`}
                >
                  {emoji}{count > 1 && <span className="text-[10px] ml-0.5 text-white/40">{count}</span>}
                </button>
              ))}
            </div>
          )}

          {/* Timestamp + delivery status + timer */}
          <span className="float-right mt-0.5 ml-2 flex items-center gap-0.5 text-[10px] text-white/30 leading-none translate-y-0.5">
            {timeRemaining && !timeRemaining.expired && (
              <span className="flex items-center gap-0.5 text-amber-400/50 mr-1">
                <Timer size={9} />
                {timeRemaining.label}
              </span>
            )}
            {time}
            <StatusIcon />
          </span>

          {/* Reaction picker */}
          <ReactionPicker
            show={showReactions}
            onClose={() => setShowReactions(false)}
            onReact={handleReact}
          />
        </div>

        {/* Context menu */}
        <MessageContextMenu
          show={contextMenu.show}
          message={message}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={() => setContextMenu({ show: false, x: 0, y: 0 })}
          onReply={() => onReply?.(message)}
          onCopy={() => toast.success("Copied")}
          onEdit={isEditable ? () => onEdit?.(message) : undefined}
          onDelete={isDeletable ? () => onDelete?.(message.id) : undefined}
          onReact={() => setShowReactions(true)}
          canEdit={isEditable}
          canDelete={isDeletable}
        />
      </div>
    </div>
  );
}
