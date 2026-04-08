import { useState } from "react";
import ChatSidebar from "../components/ChatSidebar";
import ConversationView from "../components/ConversationView";
import { contacts } from "../lib/mock-data";
import { useIsMobile } from "@/hooks/use-mobile";
import { Lock } from "lucide-react";

export default function MessengerPage() {
  const [activeChatId, setActiveChatId] = useState<string | null>("1");
  const isMobile = useIsMobile();

  const activeContact = contacts.find((c) => c.id === activeChatId);

  const showList = isMobile ? !activeChatId : true;
  const showConvo = isMobile ? !!activeChatId : true;

  return (
    <div className="h-screen w-screen bg-[#0b141a] flex overflow-hidden" style={{ fontFamily: "'Segoe UI', Helvetica, Arial, sans-serif" }}>
      {/* Chat sidebar */}
      {showList && (
        <div className={`${isMobile ? "w-full" : "w-[30%] min-w-[300px] max-w-[440px]"} h-full flex-shrink-0 border-r border-[#2a3942]`}>
          <ChatSidebar
            activeChatId={activeChatId}
            onSelect={(id) => setActiveChatId(id)}
          />
        </div>
      )}

      {/* Conversation panel */}
      {showConvo && (
        <div className="flex-1 h-full min-w-0">
          {activeContact ? (
            <ConversationView
              contact={activeContact}
              onBack={isMobile ? () => setActiveChatId(null) : undefined}
            />
          ) : (
            /* Empty state */
            <div className="h-full flex flex-col items-center justify-center text-center px-8">
              <div className="w-[320px] h-[188px] mb-8 flex items-center justify-center">
                <div className="text-[#00a884] text-8xl opacity-20">💬</div>
              </div>
              <h2 className="text-[32px] text-[#e9edef] font-light mb-3">UOR Messenger</h2>
              <p className="text-[14px] text-[#8696a0] max-w-[440px] leading-relaxed">
                Send and receive messages powered by the Universal Object Reference framework.
                Your conversations are content-addressed and coherence-verified.
              </p>
              <div className="flex items-center gap-2 mt-8 text-[#8696a0] text-[13px]">
                <Lock size={12} />
                <span>End-to-end encrypted</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
