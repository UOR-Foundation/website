import type { Conversation } from "../lib/types";
import GroupAvatar from "./GroupAvatar";
import { BellOff, Pin, Check, CheckCheck } from "lucide-react";

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  filter: string;
  filterTab?: "all" | "unread" | "archived";
}

export default function ChatList({ conversations, activeId, onSelect, filter, filterTab = "all" }: Props) {
  let filtered = conversations;

  if (filterTab === "unread") {
    filtered = filtered.filter((c) => c.unread > 0);
  } else if (filterTab === "archived") {
    filtered = filtered.filter((c) => c.archived);
  } else {
    filtered = filtered.filter((c) => !c.archived);
  }

  if (filter) {
    filtered = filtered.filter((c) => {
      const name = c.sessionType === "group" && c.groupMeta ? c.groupMeta.name : c.peer.displayName;
      return name.toLowerCase().includes(filter.toLowerCase());
    });
  }

  if (filtered.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-white/30 text-base px-6 text-center">
        {filter ? "No results" :
         filterTab === "archived" ? "No archived conversations" :
         filterTab === "unread" ? "No unread conversations" :
         "No conversations yet"}
      </div>
    );
  }

  const getPreviewIcon = (type?: string) => {
    switch (type) {
      case "image": return "📷 ";
      case "voice": return "🎤 ";
      case "file": return "📎 ";
      default: return "";
    }
  };

  const DeliveryStatus = ({ status }: { status?: string }) => {
    switch (status) {
      case "read": return <CheckCheck size={14} className="text-teal-400/70 flex-shrink-0" />;
      case "delivered": return <CheckCheck size={14} className="text-white/30 flex-shrink-0" />;
      case "sent": return <Check size={14} className="text-white/30 flex-shrink-0" />;
      default: return null;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto pb-20" style={{ willChange: "transform" }}>
      {filtered.map((convo) => {
        const isActive = activeId === convo.id;
        const isGroup = convo.sessionType === "group";
        const displayName = isGroup && convo.groupMeta ? convo.groupMeta.name : convo.peer.displayName;
        const time = convo.lastMessage
          ? new Date(convo.lastMessage.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
          : "";
        const lastMsgType = convo.lastMessage?.messageType;
        const lastMsgStatus = convo.lastMessage?.sentByMe ? (convo.lastMessage?.deliveryStatus ?? "sent") : undefined;

        return (
          <button
            key={convo.id}
            onClick={() => onSelect(convo.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 transition-all duration-100 text-left relative select-none active:bg-white/[0.05] active:scale-[0.99] ${
              isActive
                ? "bg-teal-500/[0.08]"
                : "hover:bg-white/[0.03]"
            }`}
          >
            {isActive && (
              <div className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full bg-teal-400/60" />
            )}

            {isGroup ? (
              <GroupAvatar members={convo.members} groupName={convo.groupMeta?.name} size="md" />
            ) : (
              <div className="w-[52px] h-[52px] rounded-full bg-gradient-to-br from-teal-500/25 to-indigo-500/25 border border-white/[0.08] flex items-center justify-center text-base font-medium text-white/60 flex-shrink-0 relative">
                {convo.peer.uorGlyph ?? convo.peer.displayName?.charAt(0)?.toUpperCase() ?? "?"}
              </div>
            )}

            <div className="flex-1 min-w-0 border-b border-white/[0.03] pb-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  {convo.pinned && <Pin size={10} className="text-white/25 flex-shrink-0 rotate-45" />}
                  <span className="text-[16px] text-white/90 truncate font-medium">{displayName}</span>
                  {convo.muted && <BellOff size={11} className="text-white/20 flex-shrink-0" />}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                  {convo.lastMessage?.sentByMe && <DeliveryStatus status={lastMsgStatus ?? "sent"} />}
                  <span className={`text-[12px] ${convo.unread > 0 ? "text-teal-400/70 font-medium" : "text-white/30"}`}>
                    {time}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-[14px] text-white/40 truncate pr-2">
                  {convo.lastMessage ? (
                    <>
                      {convo.lastMessage.sentByMe ? "You: " : (isGroup && convo.lastMessage.senderName ? `${convo.lastMessage.senderName}: ` : "")}
                      {getPreviewIcon(lastMsgType)}
                      {convo.lastMessage.plaintext ?? "No messages"}
                    </>
                  ) : "No messages"}
                </span>
                {convo.unread > 0 && (
                  <span className="min-w-[20px] h-[20px] rounded-full bg-teal-500/80 text-white text-[11px] font-bold flex items-center justify-center px-1.5 flex-shrink-0">
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
