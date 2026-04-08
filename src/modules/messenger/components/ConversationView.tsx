import { useState, useRef, useEffect } from "react";
import ContactHeader from "./ContactHeader";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import { messages as allMessages, type Contact, type Message } from "../lib/mock-data";

interface Props {
  contact: Contact;
  onBack?: () => void;
}

export default function ConversationView({ contact, onBack }: Props) {
  const [msgs, setMsgs] = useState<Message[]>(allMessages[contact.id] ?? []);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMsgs(allMessages[contact.id] ?? []);
  }, [contact.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs.length]);

  const handleSend = (text: string) => {
    const newMsg: Message = {
      id: `new-${Date.now()}`,
      contactId: contact.id,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      sent: true,
      read: false,
      type: "text",
    };
    setMsgs((prev) => [...prev, newMsg]);
  };

  /* WhatsApp-style doodle wallpaper pattern (very subtle) */
  const wallpaperStyle: React.CSSProperties = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cg fill='%23111b21' opacity='0.4'%3E%3Ccircle cx='20' cy='20' r='1.5'/%3E%3Ccircle cx='60' cy='80' r='1'/%3E%3Ccircle cx='120' cy='40' r='1.2'/%3E%3Ccircle cx='200' cy='100' r='0.8'/%3E%3Ccircle cx='300' cy='60' r='1.3'/%3E%3Ccircle cx='80' cy='200' r='1'/%3E%3Ccircle cx='180' cy='280' r='1.4'/%3E%3Ccircle cx='340' cy='180' r='0.9'/%3E%3Ccircle cx='260' cy='320' r='1.1'/%3E%3Ccircle cx='40' cy='350' r='1'/%3E%3Ccircle cx='380' cy='380' r='1.2'/%3E%3C/g%3E%3C/svg%3E")`,
    backgroundColor: "#0b141a",
  };

  /* Group messages by time for date separators */
  return (
    <div className="flex flex-col h-full">
      <ContactHeader contact={contact} onBack={onBack} />

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto py-3" style={wallpaperStyle}>
        {/* Encryption notice */}
        <div className="flex justify-center mb-4 px-4">
          <div className="bg-[#182229] text-[#8696a0] text-[12.5px] rounded-lg px-3 py-1.5 text-center max-w-[360px] shadow-sm">
            🔒 Messages are end-to-end encrypted. No one outside of this chat can read them.
          </div>
        </div>

        {msgs.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      <MessageInput onSend={handleSend} />
    </div>
  );
}
