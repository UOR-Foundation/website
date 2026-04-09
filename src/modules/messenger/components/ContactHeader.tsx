import { Phone, Video, Search, ShieldCheck, ArrowLeft, Info } from "lucide-react";
import type { Conversation, PresenceState } from "../lib/types";

interface Props {
  conversation: Conversation;
  onBack?: () => void;
  presence?: PresenceState | null;
  onSearch?: () => void;
  onInfo?: () => void;
  onCall?: (type: "audio" | "video") => void;
}

export default function ContactHeader({ conversation, onBack, presence, onSearch, onInfo, onCall }: Props) {
  const peer = conversation.peer;

  const statusText = presence?.typing
    ? "typing…"
    : presence?.online
      ? "online"
      : presence?.lastSeen
        ? `last seen ${new Date(presence.lastSeen).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
        : null;

  return (
    <div className="h-[60px] bg-white/[0.03] backdrop-blur-sm flex items-center px-4 gap-3 border-b border-white/[0.06] flex-shrink-0">
      {onBack && (
        <button onClick={onBack} className="md:hidden text-white/50 hover:text-white/80 transition-colors mr-1">
          <ArrowLeft size={20} />
        </button>
      )}

      {/* Avatar with online indicator */}
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500/30 to-indigo-500/30 border border-white/10 flex items-center justify-center text-sm font-medium text-white/70">
          {peer.uorGlyph ?? peer.displayName?.charAt(0)?.toUpperCase() ?? "?"}
        </div>
        {presence?.online && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-teal-400 border-2 border-slate-950" />
        )}
      </div>

      {/* Name + status */}
      <div className="flex-1 min-w-0" onClick={onInfo} role="button">
        <div className="text-[15px] text-white/90 font-medium leading-tight truncate">
          {peer.displayName}
        </div>
        {statusText ? (
          <div className={`text-xs leading-tight truncate ${
            presence?.typing ? "text-teal-400/60" : "text-white/35"
          }`}>
            {statusText}
          </div>
        ) : peer.handle ? (
          <div className="text-xs text-white/35 leading-tight truncate">
            @{peer.handle}
          </div>
        ) : null}
      </div>

      {/* Action icons */}
      <div className="flex items-center gap-3 text-white/30">
        <button
          onClick={() => onCall?.("video")}
          className="hover:text-white/60 transition-colors hidden sm:block"
        >
          <Video size={18} />
        </button>
        <button
          onClick={() => onCall?.("audio")}
          className="hover:text-white/60 transition-colors hidden sm:block"
        >
          <Phone size={18} />
        </button>
        <button onClick={onSearch} className="hover:text-white/60 transition-colors">
          <Search size={18} />
        </button>
        <button onClick={onInfo} className="hover:text-white/60 transition-colors">
          <Info size={16} />
        </button>
        <ShieldCheck size={16} className="text-teal-400/60" />
      </div>
    </div>
  );
}
