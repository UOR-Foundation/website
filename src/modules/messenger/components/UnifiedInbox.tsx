import { useState, useMemo } from "react";
import { Search, Menu, Plus, Shield, ShieldCheck, MessageSquare, Send, Hash, Briefcase, Mail, Gamepad2, Lock } from "lucide-react";
import ChatList from "./ChatList";
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

interface PlatformFilterDef {
  id: PlatformFilter;
  label: string;
  icon: typeof Shield;
}

const PLATFORM_FILTERS: PlatformFilterDef[] = [
  { id: "all", label: "All", icon: MessageSquare },
  { id: "native", label: "Sovereign", icon: ShieldCheck },
  { id: "whatsapp", label: "WhatsApp", icon: MessageSquare },
  { id: "telegram", label: "Telegram", icon: Send },
  { id: "signal", label: "Signal", icon: Lock },
  { id: "discord", label: "Discord", icon: Gamepad2 },
  { id: "slack", label: "Slack", icon: Briefcase },
  { id: "email", label: "Email", icon: Mail },
  { id: "matrix", label: "Matrix", icon: Hash },
];

type SpaceFilter = "all" | "personal" | "work" | "bridges";

const SPACE_FILTERS: Array<{ id: SpaceFilter; label: string }> = [
  { id: "all", label: "All Spaces" },
  { id: "personal", label: "Personal" },
  { id: "work", label: "Work" },
  { id: "bridges", label: "Bridges" },
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
  const [spaceFilter, setSpaceFilter] = useState<SpaceFilter>("all");

  const platformCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of conversations) {
      const platform = (c as any).sourcePlatform ?? "native";
      counts.set(platform, (counts.get(platform) ?? 0) + 1);
    }
    return counts;
  }, [conversations]);

  const filteredConversations = useMemo(() => {
    let filtered = conversations;
    if (platformFilter !== "all") {
      filtered = filtered.filter((c) => {
        const platform = (c as any).sourcePlatform ?? "native";
        return platform === platformFilter;
      });
    }
    // Space filter: bridges = any non-native platform
    if (spaceFilter === "bridges") {
      filtered = filtered.filter(c => {
        const platform = (c as any).sourcePlatform ?? "native";
        return platform !== "native";
      });
    }
    return filtered;
  }, [conversations, platformFilter, spaceFilter]);

  const activeFilters = PLATFORM_FILTERS.filter(
    (f) => f.id === "all" || (platformCounts.get(f.id) ?? 0) > 0,
  );

  const unreadCount = conversations.filter(c => c.unread > 0).length;
  const verifiedCount = conversations.filter(c => c.sessionType === "direct" || c.sessionType === "group").length;

  return (
    <div className="flex flex-col h-full bg-slate-950/80 backdrop-blur-sm touch-manipulation">
      <SidebarMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onNewGroup={onNewGroup}
        onContacts={onContacts}
        onCalls={onCalls}
        onSettings={onSettings}
      />

      <div className="h-[56px] flex items-center justify-between px-3 flex-shrink-0 border-b border-white/[0.04]">
        {searchExpanded ? (
          <div className="flex-1 flex items-center gap-2">
            <button onClick={() => { setSearchExpanded(false); setSearchFilter(""); }} className="text-white/50 hover:text-white/80 active:scale-[0.92] transition-all duration-100 p-1">
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
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white/50 hover:text-white/80 hover:bg-white/[0.04] active:bg-white/[0.06] active:scale-[0.95] transition-all duration-100"
            >
              <Menu size={22} />
            </button>
            <h1 className="text-[17px] text-white/90 font-semibold tracking-tight">Messages</h1>
            <button
              onClick={() => setSearchExpanded(true)}
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white/40 hover:text-white/60 hover:bg-white/[0.04] active:bg-white/[0.06] active:scale-[0.95] transition-all duration-100"
            >
              <Search size={20} />
            </button>
          </>
        )}
      </div>

      {/* Spaces strip */}
      <div className="flex px-2 pt-1.5 pb-0.5 gap-1 border-b border-white/[0.03]">
        {SPACE_FILTERS.map((space) => (
          <button
            key={space.id}
            onClick={() => setSpaceFilter(space.id)}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-100 select-none active:scale-[0.95] ${
              spaceFilter === space.id
                ? "bg-teal-500/15 text-teal-400/90"
                : "text-white/30 hover:text-white/50 hover:bg-white/[0.03]"
            }`}
          >
            {space.label}
          </button>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex px-2 pt-1.5 pb-0.5 gap-1">
        {(["all", "unread", "archived"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilterTab(tab)}
            className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-100 select-none active:scale-[0.95] ${
              filterTab === tab
                ? "bg-white/[0.06] text-white/70"
                : "text-white/35 hover:text-white/55 hover:bg-white/[0.03] active:bg-white/[0.05]"
            }`}
          >
            {tab === "all" ? "All Chats" : tab === "unread" ? `Unread${unreadCount > 0 ? ` (${unreadCount})` : ""}` : "Archived"}
          </button>
        ))}
        {/* Verified count badge */}
        <div className="ml-auto flex items-center gap-1 px-2 text-[10px] text-teal-400/40">
          <ShieldCheck size={11} />
          <span>{verifiedCount} verified</span>
        </div>
      </div>

      {/* Platform filter chips */}
      {activeFilters.length > 2 && (
        <div className="flex px-2 pt-1 pb-0.5 gap-1 overflow-x-auto scrollbar-none">
          {activeFilters.map((filter) => {
            const count = filter.id === "all" ? conversations.length : (platformCounts.get(filter.id) ?? 0);
            const Icon = filter.icon;
            return (
              <button
                key={filter.id}
                onClick={() => setPlatformFilter(filter.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] transition-all duration-100 whitespace-nowrap select-none active:scale-[0.93] border ${
                  platformFilter === filter.id
                    ? "bg-white/[0.08] text-white/70 border-white/[0.1]"
                    : "text-white/25 hover:text-white/45 hover:bg-white/[0.03] border-transparent"
                }`}
              >
                <Icon size={11} />
                <span>{filter.label}</span>
                {count > 0 && filter.id !== "all" && (
                  <span className="text-[9px] text-white/20 bg-white/[0.05] rounded-full px-1.5">{count}</span>
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
        className="absolute bottom-5 right-5 w-14 h-14 rounded-full bg-teal-500/90 hover:bg-teal-500 text-white shadow-lg shadow-teal-500/20 flex items-center justify-center transition-all duration-100 hover:scale-105 active:scale-95 z-10 select-none"
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>
    </div>
  );
}
