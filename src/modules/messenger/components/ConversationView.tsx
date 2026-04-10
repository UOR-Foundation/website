import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import ContactHeader from "./ContactHeader";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import DateSeparator from "./DateSeparator";
import SearchMessages from "./SearchMessages";
import PinnedMessageBar from "./PinnedMessageBar";
import { useMessages } from "../lib/use-messages";
import { useSendMessage } from "../lib/use-send-message";
import { usePresence } from "../lib/use-presence";
import { useReadReceipts } from "../lib/use-read-receipts";
import { useMessageSearch } from "../lib/use-message-search";
import { filterExpiredMessages } from "../lib/ephemeral";
import { uploadEncryptedFile } from "../lib/file-transfer";
import { getCachedSession } from "../lib/messaging-protocol";
import type { Conversation, DecryptedMessage } from "../lib/types";
import { ShieldCheck, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

interface Props {
  conversation: Conversation;
  onBack?: () => void;
  onInfo?: () => void;
}

export default function ConversationView({ conversation, onBack, onInfo }: Props) {
  const { user } = useAuth();
  const { messages, loading } = useMessages(conversation.id, conversation.sessionHash);
  const { send, sending, editMessage, deleteMessage } = useSendMessage(conversation.id, conversation.sessionHash);
  const { peerPresence, setTyping } = usePresence(conversation.id);
  const { observeMessage } = useReadReceipts(messages, conversation.id);
  const search = useMessageSearch(messages);
  const [replyTo, setReplyTo] = useState<DecryptedMessage | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [pinnedMessage, setPinnedMessage] = useState<DecryptedMessage | null>(null);
  const [pinnedDismissed, setPinnedDismissed] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isGroup = conversation.sessionType === "group";
  const visibleMessages = filterExpiredMessages(messages, conversation.expiresAfterSeconds);

  // Group messages by date
  const messagesByDate = useMemo(() => {
    return visibleMessages.reduce<Map<string, DecryptedMessage[]>>((acc, msg) => {
      const dateKey = new Date(msg.createdAt).toDateString();
      if (!acc.has(dateKey)) acc.set(dateKey, []);
      acc.get(dateKey)!.push(msg);
      return acc;
    }, new Map());
  }, [visibleMessages]);

  // Determine message grouping (consecutive same sender within 60s)
  const messageGroupInfo = useMemo(() => {
    const info = new Map<string, { isFirstInGroup: boolean; isLastInGroup: boolean }>();
    for (let i = 0; i < visibleMessages.length; i++) {
      const msg = visibleMessages[i];
      const prev = i > 0 ? visibleMessages[i - 1] : null;
      const next = i < visibleMessages.length - 1 ? visibleMessages[i + 1] : null;
      const sameSenderAsPrev = prev && prev.sentByMe === msg.sentByMe &&
        (prev.senderId === msg.senderId) &&
        (new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() < 60000);
      const sameSenderAsNext = next && next.sentByMe === msg.sentByMe &&
        (next.senderId === msg.senderId) &&
        (new Date(next.createdAt).getTime() - new Date(msg.createdAt).getTime() < 60000);
      info.set(msg.id, { isFirstInGroup: !sameSenderAsPrev, isLastInGroup: !sameSenderAsNext });
    }
    return info;
  }, [visibleMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setShowScrollBottom(scrollHeight - scrollTop - clientHeight > 200);
  };

  const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: "smooth" });

  const handleFileSelected = async (file: File) => {
    if (!user) return;
    try {
      const session = getCachedSession(conversation.sessionHash);
      const sessionKey = session?.symmetricKey ?? new Uint8Array(32);
      toast.info(`Encrypting ${file.name}…`);
      const manifest = await uploadEncryptedFile(file, user.id, sessionKey, () => {});
      const messageType = file.type.startsWith("image/") ? "image" as const :
                          file.type.startsWith("audio/") ? "voice" as const : "file" as const;
      await send(`📎 ${file.name}`, { messageType, fileManifest: manifest, replyToHash: replyTo?.messageHash });
      setReplyTo(null);
      toast.success("File sent");
    } catch (err: any) { toast.error(`Upload failed: ${err.message}`); }
  };

  const handleEdit = useCallback((msg: DecryptedMessage) => {
    const newText = prompt("Edit message:", msg.plaintext);
    if (newText && newText !== msg.plaintext) editMessage(msg.id, newText);
  }, [editMessage]);

  const handleDelete = useCallback((msgId: string) => {
    if (confirm("Delete this message for everyone?")) deleteMessage(msgId);
  }, [deleteMessage]);

  const handlePin = useCallback((msg: DecryptedMessage) => {
    setPinnedMessage(msg);
    setPinnedDismissed(false);
    toast.success("Message pinned");
  }, []);

  const findReplyMessage = useCallback((hash: string | null | undefined) => {
    if (!hash) return undefined;
    return messages.find((m) => m.messageHash === hash);
  }, [messages]);

  // Typing indicator
  const showTyping = peerPresence?.typing;

  return (
    <div className="flex flex-col h-full">
      <ContactHeader
        conversation={conversation}
        onBack={onBack}
        presence={peerPresence}
        onSearch={() => search.setActive(!search.active)}
        onInfo={onInfo}
      />

      {/* Pinned message bar */}
      <PinnedMessageBar
        show={!!pinnedMessage && !pinnedDismissed}
        text={pinnedMessage?.plaintext ?? ""}
        onScrollTo={() => {}}
        onDismiss={() => setPinnedDismissed(true)}
      />

      {/* Search bar */}
      {search.active && (
        <SearchMessages
          query={search.query}
          onQueryChange={search.setQuery}
          resultCount={search.resultCount}
          onClose={() => { search.setActive(false); search.setQuery(""); }}
        />
      )}

      {/* Messages area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto py-3 relative"
        style={{
          background: "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.04) 0%, transparent 60%), linear-gradient(180deg, hsl(222 47% 6%) 0%, hsl(222 47% 4.5%) 100%)",
        }}
      >
        {/* Encryption notice */}
        <div className="flex justify-center mb-4 px-4">
          <div className="bg-white/[0.03] border border-white/[0.05] text-white/35 text-[11px] rounded-full px-3.5 py-1.5 text-center max-w-[340px] flex items-center gap-1.5">
            <ShieldCheck size={11} className="text-teal-400/50" />
            <span>End-to-end encrypted · Post-quantum secure</span>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <div className="w-5 h-5 border-2 border-teal-400/30 border-t-teal-400 rounded-full animate-spin" />
          </div>
        )}

        {!loading && visibleMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-white/20 text-sm">
            <ShieldCheck size={32} className="mb-3 text-teal-400/25" />
            <p>No messages yet</p>
            <p className="text-xs text-white/12 mt-1">Send the first encrypted message</p>
          </div>
        )}

        {Array.from(messagesByDate.entries()).map(([dateKey, msgs]) => (
          <div key={dateKey}>
            <DateSeparator date={msgs[0].createdAt} />
            {msgs.map((msg) => {
              const groupInfo = messageGroupInfo.get(msg.id) ?? { isFirstInGroup: true, isLastInGroup: true };
              return (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  replyToMessage={findReplyMessage(msg.replyToHash)}
                  onReply={(m) => setReplyTo(m)}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onPin={handlePin}
                  observeRef={(el) => observeMessage(el, msg)}
                  isGroup={isGroup}
                  expiresAfterSeconds={conversation.expiresAfterSeconds}
                  isFirstInGroup={groupInfo.isFirstInGroup}
                  isLastInGroup={groupInfo.isLastInGroup}
                />
              );
            })}
          </div>
        ))}

        {/* Typing indicator */}
        {showTyping && (
          <div className="flex justify-start px-[5%] mb-2">
            <div className="bg-white/[0.07] rounded-2xl px-4 py-2.5 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Scroll to bottom FAB */}
      {showScrollBottom && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-[72px] right-5 w-10 h-10 rounded-full bg-slate-900/90 border border-white/[0.08] flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-slate-800/90 transition-all duration-100 shadow-lg z-10"
        >
          <ChevronDown size={20} />
        </button>
      )}

      <MessageInput
        onSend={(text, opts) => { send(text, { ...opts, replyToHash: replyTo?.messageHash }); setReplyTo(null); }}
        onTyping={() => setTyping(true)}
        disabled={sending}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        onFileSelected={handleFileSelected}
        members={conversation.members}
        isGroup={isGroup}
      />
    </div>
  );
}
