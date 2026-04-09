import { Check, CheckCheck, Lock, Reply } from "lucide-react";
import { useState, useRef } from "react";
import type { DecryptedMessage } from "../lib/types";
import FileMessage from "./FileMessage";
import VoiceMessage from "./VoiceMessage";
import ImageMessage from "./ImageMessage";
import ReplyBubble from "./ReplyBubble";
import ReactionPicker from "./ReactionPicker";
import { formatFileSize } from "../lib/file-transfer";

interface Props {
  message: DecryptedMessage;
  replyToMessage?: DecryptedMessage;
  onReply?: (msg: DecryptedMessage) => void;
  observeRef?: (el: HTMLDivElement | null) => void;
}

export default function MessageBubble({ message, replyToMessage, onReply, observeRef }: Props) {
  const sent = message.sentByMe;
  const isEncrypted = message.plaintext === "🔒 Encrypted";
  const [showReactions, setShowReactions] = useState(false);

  const time = new Date(message.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

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
        return <span className="text-sm leading-relaxed">{message.plaintext}</span>;
    }
  };

  return (
    <div
      ref={observeRef}
      className={`flex ${sent ? "justify-end" : "justify-start"} mb-1 px-[6%] group relative`}
      onDoubleClick={() => onReply?.(message)}
    >
      {/* Reaction picker trigger area */}
      <div className="relative">
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
            relative max-w-[65%] min-w-[80px] rounded-2xl px-3.5 pt-2 pb-2 
            ${sent
              ? "bg-indigo-500/15 border border-indigo-400/10 text-white/90"
              : "bg-white/[0.06] border border-white/[0.06] text-white/85"
            }
          `}
          style={{ wordBreak: "break-word" }}
          onContextMenu={(e) => { e.preventDefault(); setShowReactions(true); }}
        >
          {/* Reply reference */}
          {replyToMessage && <ReplyBubble replyTo={replyToMessage} />}

          {renderContent()}

          {/* Reactions display */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="flex gap-0.5 mt-1">
              {message.reactions.map((r, i) => (
                <span key={i} className="text-xs bg-white/[0.06] rounded-full px-1.5 py-0.5">
                  {r.emoji}
                </span>
              ))}
            </div>
          )}

          {/* Timestamp + delivery status */}
          <span className="float-right mt-0.5 ml-2 flex items-center gap-0.5 text-[10px] text-white/30 leading-none translate-y-0.5">
            {time}
            <StatusIcon />
          </span>

          {/* Reaction picker */}
          <ReactionPicker
            show={showReactions}
            onClose={() => setShowReactions(false)}
            onReact={(emoji) => {
              console.log("React with:", emoji, "to:", message.id);
            }}
          />
        </div>
      </div>
    </div>
  );
}
