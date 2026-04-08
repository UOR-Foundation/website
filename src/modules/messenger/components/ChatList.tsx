import type { Conversation } from "../lib/types";

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  filter: string;
}

export default function ChatList({ conversations, activeId, onSelect, filter }: Props) {
  const filtered = filter
    ? conversations.filter((c) => c.peer.displayName.toLowerCase().includes(filter.toLowerCase()))
    : conversations;

  if (filtered.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-white/20 text-sm px-6 text-center">
        {filter ? "No conversations match your search" : "No conversations yet — start one!"}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {filtered.map((convo) => {
        const isActive = activeId === convo.id;
        const time = convo.lastMessage
          ? new Date(convo.lastMessage.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
          : "";

        return (
          <button
            key={convo.id}
            onClick={() => onSelect(convo.id)}
            className={`w-full flex items-center gap-3 px-3 py-3 transition-colors text-left ${
              isActive
                ? "bg-white/[0.06]"
                : "hover:bg-white/[0.03]"
            }`}
          >
            {/* Avatar */}
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-teal-500/25 to-indigo-500/25 border border-white/[0.08] flex items-center justify-center text-sm font-medium text-white/60 flex-shrink-0">
              {convo.peer.uorGlyph ?? convo.peer.displayName?.charAt(0)?.toUpperCase() ?? "?"}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 border-b border-white/[0.04] pb-3">
              <div className="flex items-center justify-between">
                <span className="text-[15px] text-white/85 truncate font-medium">{convo.peer.displayName}</span>
                <span className="text-[11px] flex-shrink-0 ml-2 text-white/25">
                  {time}
                </span>
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-[13px] text-white/30 truncate pr-2">
                  {convo.lastMessage?.plaintext ?? "No messages"}
                </span>
                {convo.unread > 0 && (
                  <span className="min-w-[18px] h-[18px] rounded-full bg-teal-500/80 text-white text-[10px] font-bold flex items-center justify-center px-1 flex-shrink-0">
                    {convo.unread}
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
