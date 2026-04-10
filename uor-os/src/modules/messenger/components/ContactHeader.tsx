import { Phone, Video, Search, ShieldCheck, ArrowLeft, Info, Users, Globe, MessageSquare, Send, Lock, Briefcase, Gamepad2, Mail, Hash, Shield } from "lucide-react";
import type { Conversation, PresenceState } from "../lib/types";
import GroupAvatar from "./GroupAvatar";

interface Props {
  conversation: Conversation;
  onBack?: () => void;
  presence?: PresenceState | null;
  onSearch?: () => void;
  onInfo?: () => void;
  onCall?: (type: "audio" | "video") => void;
}

const PLATFORM_ICONS: Record<string, typeof Shield> = {
  whatsapp: MessageSquare,
  telegram: Send,
  signal: Lock,
  discord: Gamepad2,
  slack: Briefcase,
  email: Mail,
  matrix: Hash,
};

const PLATFORM_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  signal: "Signal",
  discord: "Discord",
  slack: "Slack",
  email: "Email",
  matrix: "Matrix",
};

export default function ContactHeader({ conversation, onBack, presence, onSearch, onInfo, onCall }: Props) {
  const peer = conversation.peer;
  const isGroup = conversation.sessionType === "group";
  const memberCount = conversation.members?.length ?? 0;
  const sourcePlatform = (conversation as any).sourcePlatform as string | undefined;
  const isBridged = sourcePlatform && sourcePlatform !== "native";

  const PlatformIcon = isBridged ? (PLATFORM_ICONS[sourcePlatform] ?? Globe) : null;

  const statusText = isGroup
    ? (presence?.typing
      ? "someone is typing…"
      : `${memberCount} members`)
    : (presence?.typing
      ? "typing…"
      : presence?.online
        ? "online"
        : presence?.lastSeen
          ? `last seen ${new Date(presence.lastSeen).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
          : null);

  return (
    <div className="h-[60px] bg-white/[0.03] backdrop-blur-sm flex items-center px-4 gap-3 border-b border-white/[0.06] flex-shrink-0">
      {onBack && (
        <button onClick={onBack} className="md:hidden text-white/50 hover:text-white/80 transition-colors mr-1">
          <ArrowLeft size={20} />
        </button>
      )}

      {/* Avatar with online indicator */}
      <div className="relative flex-shrink-0">
        {isGroup ? (
          <GroupAvatar members={conversation.members} groupName={conversation.groupMeta?.name} size="sm" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500/30 to-indigo-500/30 border border-white/10 flex items-center justify-center text-sm font-medium text-white/70">
            {peer.uorGlyph ?? peer.displayName?.charAt(0)?.toUpperCase() ?? "?"}
          </div>
        )}
        {!isGroup && presence?.online && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-teal-400 border-2 border-slate-950" />
        )}
        {/* Platform badge on avatar */}
        {isBridged && PlatformIcon && (
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center">
            <PlatformIcon size={9} className="text-white/50" />
          </div>
        )}
      </div>

      {/* Name + status + platform */}
      <div className="flex-1 min-w-0" onClick={onInfo} role="button">
        <div className="flex items-center gap-1.5">
          <span className="text-[15px] text-white/90 font-medium leading-tight truncate">
            {isGroup && conversation.groupMeta ? conversation.groupMeta.name : peer.displayName}
          </span>
          {isBridged && (
            <span className="text-[9px] text-white/25 bg-white/[0.05] rounded px-1.5 py-0.5 flex-shrink-0">
              {PLATFORM_LABELS[sourcePlatform] ?? sourcePlatform}
            </span>
          )}
        </div>
        {statusText ? (
          <div className={`text-xs leading-tight truncate ${
            presence?.typing ? "text-teal-400/60" : "text-white/35"
          }`}>
            {isGroup && <Users size={10} className="inline mr-1 -mt-0.5" />}
            {statusText}
          </div>
        ) : peer.handle && !isGroup ? (
          <div className="text-xs text-white/35 leading-tight truncate">
            @{peer.handle}
          </div>
        ) : null}
      </div>

      {/* Action icons */}
      <div className="flex items-center gap-3 text-white/30">
        <button
          onClick={() => onCall?.("video")}
          className="hover:text-white/60 active:scale-[0.9] transition-all duration-100 hidden sm:block"
          title="Video call"
        >
          <Video size={18} />
        </button>
        <button
          onClick={() => onCall?.("audio")}
          className="hover:text-white/60 active:scale-[0.9] transition-all duration-100 hidden sm:block"
          title="Voice call"
        >
          <Phone size={18} />
        </button>
        <button onClick={onSearch} className="hover:text-white/60 active:scale-[0.9] transition-all duration-100" title="Search messages">
          <Search size={18} />
        </button>
        <button onClick={onInfo} className="hover:text-white/60 active:scale-[0.9] transition-all duration-100">
          <Info size={16} />
        </button>
        <ShieldCheck size={16} className="text-teal-400/60" />
      </div>
    </div>
  );
}
