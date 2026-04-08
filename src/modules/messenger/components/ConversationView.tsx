import { useRef, useEffect } from "react";
import ContactHeader from "./ContactHeader";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import SessionBadge from "./SessionBadge";
import { useMessages } from "../lib/use-messages";
import { useSendMessage } from "../lib/use-send-message";
import type { Conversation } from "../lib/types";
import { ShieldCheck } from "lucide-react";

interface Props {
  conversation: Conversation;
  onBack?: () => void;
}

export default function ConversationView({ conversation, onBack }: Props) {
  const { messages, loading } = useMessages(conversation.id, conversation.sessionHash);
  const { send, sending } = useSendMessage(conversation.id, conversation.sessionHash);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <div className="flex flex-col h-full">
      <ContactHeader conversation={conversation} onBack={onBack} />

      {/* Messages area */}
      <div
        className="flex-1 overflow-y-auto py-3"
        style={{
          background: "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.06) 0%, transparent 60%), linear-gradient(180deg, hsl(222 47% 7%) 0%, hsl(222 47% 5%) 100%)",
        }}
      >
        {/* Encryption notice */}
        <div className="flex justify-center mb-4 px-4">
          <div className="bg-white/[0.04] border border-white/[0.06] text-white/40 text-[11px] rounded-xl px-3 py-1.5 text-center max-w-[360px] flex items-center gap-2">
            <ShieldCheck size={12} className="text-teal-400/60" />
            <span>End-to-end encrypted with UMP · Post-quantum secure</span>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-5 h-5 border-2 border-teal-400/30 border-t-teal-400 rounded-full animate-spin" />
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-white/20 text-sm">
            <ShieldCheck size={32} className="mb-3 text-teal-400/30" />
            <p>No messages yet</p>
            <p className="text-xs text-white/15 mt-1">Send the first encrypted message</p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      <MessageInput onSend={send} disabled={sending} />
    </div>
  );
}
