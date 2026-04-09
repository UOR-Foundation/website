/**
 * UnifiedInbox — Enhanced ChatSidebar with platform filter tabs.
 *
 * Merges native UMP conversations, Matrix rooms, and bridged platform
 * conversations into one unified view with platform badges and filters.
 */

import { useState, useMemo } from "react";
import { Search, Plus, Users, Settings2 } from "lucide-react";
import ChatList from "./ChatList";
import SessionBadge from "./SessionBadge";
import PlatformBadge from "./PlatformBadge";
import type { Conversation, BridgePlatform } from "../lib/types";

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onNewGroup?: () => void;
  onOpenBridges?: () => void;
  loading: boolean;
}

type PlatformFilter = "all" | BridgePlatform | "matrix" | "native";

const PLATFORM_FILTERS: Array<{ id: PlatformFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "native", label: "🛡️" },
  { id: "whatsapp", label: "💬" },
  { id: "telegram", label: "✈️" },
  { id: "signal", label: "🔐" },
  { id: "discord", label: "🎮" },
  { id: "slack", label: "💼" },
  { id: "email", label: "✉️" },
  { id: "matrix", label: "🟢" },
];

export default function UnifiedInbox({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onNewGroup,
  onOpenBridges,
  loading,
}: Props) {
  const [searchFilter, setSearchFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");

  // Count conversations per platform
  const platformCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of conversations) {
      const platform = (c as any).sourcePlatform ?? "native";
      counts.set(platform, (counts.get(platform) ?? 0) + 1);
    }
    return counts;
  }, [conversations]);

  // Filter conversations by platform
  const filteredConversations = useMemo(() => {
    if (platformFilter === "all") return conversations;
    return conversations.filter((c) => {
      const platform = (c as any).sourcePlatform ?? "native";
      return platform === platformFilter;
    });
  }, [conversations, platformFilter]);

  // Only show filters that have conversations
  const activeFilters = PLATFORM_FILTERS.filter(
    (f) => f.id === "all" || (platformCounts.get(f.id) ?? 0) > 0,
  );

  return (
    <div className="flex flex-col h-full bg-slate-950/80 backdrop-blur-sm">
      {/* Header */}
      <div className="h-[60px] flex items-center justify-between px-4 flex-shrink-0 border-b border-white/[0.04]">
        <h1 className="text-lg text-white/90 font-semibold tracking-tight">Messages</h1>
        <div className="flex items-center gap-2">
          <SessionBadge status="active" compact />
          {onOpenBridges && (
            <button
              onClick={onOpenBridges}
              className="w-8 h-8 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 flex items-center justify-center text-purple-400 transition-colors"
              title="Bridge Connections"
            >
              <Settings2 size={16} />
            </button>
          )}
          {onNewGroup && (
            <button
              onClick={onNewGroup}
              className="w-8 h-8 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 flex items-center justify-center text-indigo-400 transition-colors"
              title="New Group"
            >
              <Users size={16} />
            </button>
          )}
          <button
            onClick={onNewChat}
            className="w-8 h-8 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 flex items-center justify-center text-teal-400 transition-colors"
            title="New Conversation"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* Platform filter tabs */}
      {activeFilters.length > 2 && (
        <div className="flex px-3 pt-2 gap-1 overflow-x-auto scrollbar-none">
          {activeFilters.map((filter) => {
            const count = filter.id === "all" ? conversations.length : (platformCounts.get(filter.id) ?? 0);
            return (
              <button
                key={filter.id}
                onClick={() => setPlatformFilter(filter.id)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] transition-colors whitespace-nowrap ${
                  platformFilter === filter.id
                    ? "bg-white/[0.08] text-white/70"
                    : "text-white/30 hover:text-white/50 hover:bg-white/[0.03]"
                }`}
                title={filter.id === "all" ? "All platforms" : filter.id}
              >
                {filter.label}
                {count > 0 && filter.id !== "all" && (
                  <span className="text-[9px] text-white/25">{count}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Search bar */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search across all platforms…"
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
          conversations={filteredConversations}
          activeId={activeId}
          onSelect={onSelect}
          filter={searchFilter}
          filterTab="all"
        />
      )}
    </div>
  );
}
