import { useState } from "react";
import { Search, Plus } from "lucide-react";
import ChatList from "./ChatList";
import SessionBadge from "./SessionBadge";
import type { Conversation } from "../lib/types";

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  loading: boolean;
}

export default function ChatSidebar({ conversations, activeId, onSelect, onNewChat, loading }: Props) {
  const [searchFilter, setSearchFilter] = useState("");

  return (
    <div className="flex flex-col h-full bg-slate-950/80 backdrop-blur-xl">
      {/* Header */}
      <div className="h-[60px] flex items-center justify-between px-4 flex-shrink-0 border-b border-white/[0.04]">
        <h1 className="text-lg text-white/90 font-semibold tracking-tight">Messages</h1>
        <div className="flex items-center gap-2">
          <SessionBadge status="active" compact />
          <button
            onClick={onNewChat}
            className="w-8 h-8 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 flex items-center justify-center text-teal-400 transition-colors"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search…"
            className="w-full h-9 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white/80 text-[13px] pl-8 pr-3 outline-none placeholder:text-white/20 focus:border-teal-500/30 transition-colors"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-teal-400/30 border-t-teal-400 rounded-full animate-spin" />
        </div>
      ) : (
        <ChatList
          conversations={conversations}
          activeId={activeId}
          onSelect={onSelect}
          filter={searchFilter}
        />
      )}
    </div>
  );
}
