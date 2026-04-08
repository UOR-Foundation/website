import { Pin } from "lucide-react";
import type { Chat } from "../lib/mock-data";

interface Props {
  chats: Chat[];
  activeChatId: string | null;
  onSelect: (chatId: string) => void;
  filter: string;
}

export default function ChatList({ chats, activeChatId, onSelect, filter }: Props) {
  const filtered = filter
    ? chats.filter((c) => c.contact.name.toLowerCase().includes(filter.toLowerCase()))
    : chats;

  return (
    <div className="flex-1 overflow-y-auto">
      {filtered.map((chat) => {
        const isActive = activeChatId === chat.contact.id;
        return (
          <button
            key={chat.contact.id}
            onClick={() => onSelect(chat.contact.id)}
            className={`w-full flex items-center gap-3 px-3 py-[10px] hover:bg-[#202c33] transition-colors text-left ${
              isActive ? "bg-[#2a3942]" : ""
            }`}
          >
            {/* Avatar */}
            <div
              className="w-[49px] h-[49px] rounded-full flex items-center justify-center text-[15px] font-medium text-white flex-shrink-0"
              style={{ backgroundColor: chat.contact.avatarColor }}
            >
              {chat.contact.initials}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 border-b border-[#222d34] pb-[10px]">
              <div className="flex items-center justify-between">
                <span className="text-[17px] text-[#e9edef] truncate">{chat.contact.name}</span>
                <span className={`text-[12px] flex-shrink-0 ml-2 ${
                  chat.unread > 0 ? "text-[#00a884]" : "text-[#8696a0]"
                }`}>
                  {chat.lastMessageTime}
                </span>
              </div>
              <div className="flex items-center justify-between mt-[2px]">
                <span className="text-[14px] text-[#8696a0] truncate pr-2">
                  {chat.contact.status === "typing" ? (
                    <span className="text-[#00a884]">typing…</span>
                  ) : (
                    chat.lastMessage
                  )}
                </span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {chat.pinned && <Pin size={14} className="text-[#8696a0] rotate-45" />}
                  {chat.unread > 0 && (
                    <span className="min-w-[20px] h-[20px] rounded-full bg-[#00a884] text-[#111b21] text-[11px] font-bold flex items-center justify-center px-1">
                      {chat.unread}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
