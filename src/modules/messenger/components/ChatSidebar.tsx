import { useState } from "react";
import { MessageCircle, Phone, CircleDot, Settings, Search, Filter } from "lucide-react";
import ChatList from "./ChatList";
import { chats } from "../lib/mock-data";

interface Props {
  activeChatId: string | null;
  onSelect: (chatId: string) => void;
}

type NavTab = "chats" | "calls" | "status" | "settings";

export default function ChatSidebar({ activeChatId, onSelect }: Props) {
  const [activeTab, setActiveTab] = useState<NavTab>("chats");
  const [searchFilter, setSearchFilter] = useState("");

  const navItems: { id: NavTab; icon: typeof MessageCircle; label: string }[] = [
    { id: "chats", icon: MessageCircle, label: "Chats" },
    { id: "calls", icon: Phone, label: "Calls" },
    { id: "status", icon: CircleDot, label: "Status" },
    { id: "settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="flex h-full">
      {/* ── Nav Rail ── */}
      <div className="w-[64px] bg-[#202c33] flex flex-col items-center py-3 gap-1 border-r border-[#2a3942] flex-shrink-0 hidden md:flex">
        {navItems.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            title={label}
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
              activeTab === id
                ? "bg-[#00a884]/20 text-[#00a884]"
                : "text-[#aebac1] hover:bg-[#2a3942]"
            }`}
          >
            <Icon size={22} />
          </button>
        ))}

        {/* Profile avatar at bottom */}
        <div className="mt-auto">
          <div className="w-10 h-10 rounded-full bg-[#00a884] flex items-center justify-center text-white text-sm font-medium">
            ME
          </div>
        </div>
      </div>

      {/* ── Chat List Panel ── */}
      <div className="flex-1 flex flex-col bg-[#111b21] min-w-0">
        {/* Header */}
        <div className="h-[60px] flex items-center justify-between px-4 flex-shrink-0">
          <h1 className="text-[22px] text-[#e9edef] font-bold">Chats</h1>
          <div className="flex items-center gap-3 text-[#aebac1]">
            <button className="hover:text-[#e9edef] transition-colors"><Filter size={20} /></button>
          </div>
        </div>

        {/* Search bar */}
        <div className="px-3 pb-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8696a0]" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search or start a new chat"
              className="w-full h-[35px] rounded-lg bg-[#202c33] text-[#e9edef] text-[14px] pl-9 pr-3 outline-none placeholder:text-[#8696a0]"
            />
          </div>
        </div>

        <ChatList
          chats={chats}
          activeChatId={activeChatId}
          onSelect={onSelect}
          filter={searchFilter}
        />
      </div>
    </div>
  );
}
