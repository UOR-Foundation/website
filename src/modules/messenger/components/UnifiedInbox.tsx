import { useState, useMemo } from "react";
import { Search, Menu, Plus, Users } from "lucide-react";
import ChatList from "./ChatList";
import SessionBadge from "./SessionBadge";
import SidebarMenu from "./SidebarMenu";
import type { Conversation, BridgePlatform } from "../lib/types";

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onNewGroup?: () => void;
  onOpenBridges?: () => void;
  onContacts?: () => void;
  onCalls?: () => void;
  onSettings?: () => void;
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
  conversations, activeId, onSelect, onNewChat, onNewGroup,
  onOpenBridges, onContacts, onCalls, onSettings, loading,
}: Props) {
  const [searchFilter, setSearchFilter] = useState("");
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");
  const [menuOpen, setMenuOpen] = useState(false);
  const [filterTab, setFilterTab] = useState<"all" | "unread" | "archived">("all");

  const platformCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of conversations) {
      const platform = (c as any).sourcePlatform ?? "native";
      counts.set(platform, (counts.get(platform) ?? 0) + 1);
    }
    return counts;
  }, [conversations]);

  const filteredConversations = useMemo(() => {
    if (platformFilter === "all") return conversations;
    return conversations.filter((c) => {
      const platform = (c as any).sourcePlatform ?? "native";
      return platform === platformFilter;
    });
  }, [conversations, platformFilter]);

  const activeFilters = PLATFORM_FILTERS.filter(
    (f) => f.id === "all" || (platformCounts.get(f.id) ?? 0) > 0,
  );

  const unreadCount = conversations.filter(c => c.unread > 0).length;

  return (
    <div className="flex flex-col h-full bg-slate-950/80 backdrop-blur-sm">
      {/* Hamburger Menu */}
      <SidebarMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onNewGroup={onNewGroup}
        onContacts={onContacts}
        onCalls={onCalls}
        onSettings={onSettings}
      />

      {/* Header — Telegram style */}
      <div className="h-[56px] flex items-center justify-between px-3 flex-shrink-0 border-b border-white/[0.04]">
        {searchExpanded ? (
          <div className="flex-1 flex items-center gap-2">
            <button onClick={() => { setSearchExpanded(false); setSearchFilter(""); }} className="text-white/50 hover:text-white/80 transition-colors p-1">
              <Search size={18} />
            </button>
            <input
              autoFocus
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search…"
              className="flex-1 h-9 bg-transparent text-white/90 text-[15px] outline-none placeholder:text-white/25"
            />
          </div>
        ) : (
          <>
            <button
              onClick={() => setMenuOpen(true)}
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white/50 hover:text-white/80 hover:bg-white/[0.04] transition-all duration-100"
            >
              <Menu size={22} />
            </button>
            <h1 className="text-[17px] text-white/90 font-semibold tracking-tight">Messages</h1>
            <button
              onClick={() => setSearchExpanded(true)}
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white/40 hover:text-white/60 hover:bg-white/[0.04] transition-all duration-100"
            >
              <Search size={20} />
            </button>
          </>
        )}
      </div>

      {/* Filter tabs — All / Unread / Archived */}
      <div className="flex px-2 pt-1.5 pb-0.5 gap-1">
        {(["all", "unread", "archived"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilterTab(tab)}
            className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-100 ${
              filterTab === tab
                ? "bg-teal-500/15 text-teal-400/90"
                : "text-white/35 hover:text-white/55 hover:bg-white/[0.03]"
            }`}
          >
            {tab === "all" ? "All Chats" : tab === "unread" ? `Unread${unreadCount > 0 ? ` (${unreadCount})` : ""}` : "Archived"}
          </button>
        ))}
      </div>

      {/* Platform filter tabs */}
      {activeFilters.length > 2 && (
        <div className="flex px-2 pt-1 pb-0.5 gap-0.5 overflow-x-auto scrollbar-none">
          {activeFilters.map((filter) => {
            const count = filter.id === "all" ? conversations.length : (platformCounts.get(filter.id) ?? 0);
            return (
              <button
                key={filter.id}
                onClick={() => setPlatformFilter(filter.id)}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] transition-colors duration-100 whitespace-nowrap ${
                  platformFilter === filter.id
                    ? "bg-white/[0.08] text-white/70"
                    : "text-white/25 hover:text-white/45 hover:bg-white/[0.03]"
                }`}
              >
                {filter.label}
                {count > 0 && filter.id !== "all" && (
                  <span className="text-[9px] text-white/20">{count}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

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
          filterTab={filterTab}
        />
      )}

      {/* FAB — New Chat */}
      <button
        onClick={onNewChat}
        className="absolute bottom-5 right-5 w-14 h-14 rounded-full bg-teal-500/90 hover:bg-teal-500 text-white shadow-lg shadow-teal-500/20 flex items-center justify-center transition-all duration-150 hover:scale-105 z-10"
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>
    </div>
  );
}
