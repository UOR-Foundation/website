import { Phone, Video, Search, ShieldCheck, ArrowLeft } from "lucide-react";
import type { Conversation } from "../lib/types";

interface Props {
  conversation: Conversation;
  onBack?: () => void;
}

export default function ContactHeader({ conversation, onBack }: Props) {
  const peer = conversation.peer;

  return (
    <div className="h-[60px] bg-white/[0.03] backdrop-blur-xl flex items-center px-4 gap-3 border-b border-white/[0.06] flex-shrink-0">
      {onBack && (
        <button onClick={onBack} className="md:hidden text-white/50 hover:text-white/80 transition-colors mr-1">
          <ArrowLeft size={20} />
        </button>
      )}

      {/* Avatar */}
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500/30 to-indigo-500/30 border border-white/10 flex items-center justify-center text-sm font-medium text-white/70 flex-shrink-0">
        {peer.displayName?.charAt(0)?.toUpperCase() ?? "?"}
      </div>

      {/* Name + status */}
      <div className="flex-1 min-w-0">
        <div className="text-[15px] text-white/90 font-medium leading-tight truncate">
          {peer.displayName}
        </div>
        {peer.handle && (
          <div className="text-xs text-white/35 leading-tight truncate">
            @{peer.handle}
          </div>
        )}
      </div>

      {/* Action icons */}
      <div className="flex items-center gap-4 text-white/30">
        <button className="hover:text-white/60 transition-colors hidden sm:block"><Video size={18} /></button>
        <button className="hover:text-white/60 transition-colors hidden sm:block"><Phone size={18} /></button>
        <button className="hover:text-white/60 transition-colors"><Search size={18} /></button>
        <ShieldCheck size={16} className="text-teal-400/60" />
      </div>
    </div>
  );
}
