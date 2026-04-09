import { useState } from "react";
import ChatSidebar from "../components/ChatSidebar";
import ConversationView from "../components/ConversationView";
import ConversationInfo from "../components/ConversationInfo";
import NewConversationDialog from "../components/NewConversationDialog";
import { useConversations } from "../lib/use-conversations";
import { useAuth } from "@/hooks/use-auth";
import { useAuthPrompt } from "@/modules/auth/useAuthPrompt";
import { useIsMobile } from "@/hooks/use-mobile";
import { startOfflineSync } from "../lib/offline-queue";
import { ShieldCheck, Lock, MessageSquare } from "lucide-react";
import { useEffect } from "react";

export default function MessengerPage() {
  const { user, loading: authLoading } = useAuth();
  const { prompt: authPrompt } = useAuthPrompt();
  const { conversations, loading: convosLoading, refetch } = useConversations();
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const isMobile = useIsMobile();

  // Start offline sync on mount
  useEffect(() => { startOfflineSync(); }, []);

  const activeConvo = conversations.find((c) => c.id === activeConvoId);

  const showList = isMobile ? !activeConvoId : true;
  const showConvo = isMobile ? !!activeConvoId : true;

  if (authLoading) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-teal-400/30 border-t-teal-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center text-center px-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500/20 to-indigo-500/20 border border-white/10 flex items-center justify-center mb-6">
          <ShieldCheck size={28} className="text-teal-400/70" />
        </div>
        <h2 className="text-2xl text-white/90 font-light mb-3">Messages</h2>
        <p className="text-sm text-white/40 max-w-sm leading-relaxed mb-6">
          Private conversations, end-to-end encrypted with post-quantum security. Sign in to continue.
        </p>
        <button
          onClick={() => authPrompt("messenger")}
          className="px-6 py-3 rounded-xl text-sm font-semibold transition-all"
          style={{ background: "rgba(255,255,255,0.92)", color: "#1a1a1a" }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,1)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.92)"; }}
        >
          Sign in to message
        </button>
        <div className="flex items-center gap-2 mt-6 text-white/25 text-xs">
          <Lock size={11} />
          <span>End-to-end encrypted · Post-quantum secure</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-slate-950 flex overflow-hidden" style={{ fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
      {/* Chat sidebar */}
      {showList && (
        <div className={`${isMobile ? "w-full" : "w-[320px] min-w-[280px] max-w-[380px]"} h-full flex-shrink-0 border-r border-white/[0.04]`}>
          <ChatSidebar
            conversations={conversations}
            activeId={activeConvoId}
            onSelect={(id) => { setActiveConvoId(id); setShowInfo(false); }}
            onNewChat={() => setNewChatOpen(true)}
            loading={convosLoading}
          />
        </div>
      )}

      {/* Conversation panel */}
      {showConvo && (
        <div className="flex-1 h-full min-w-0 relative">
          {activeConvo ? (
            <ConversationView
              conversation={activeConvo}
              onBack={isMobile ? () => setActiveConvoId(null) : undefined}
              onInfo={() => setShowInfo(!showInfo)}
            />
          ) : (
            <div
              className="h-full flex flex-col items-center justify-center text-center px-8"
              style={{
                background: "radial-gradient(ellipse at 50% 40%, rgba(99,102,241,0.04) 0%, transparent 70%)",
              }}
            >
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-500/10 to-indigo-500/10 border border-white/[0.06] flex items-center justify-center mb-6">
                <MessageSquare size={32} className="text-white/15" />
              </div>
              <h2 className="text-2xl text-white/80 font-light mb-3">Messages</h2>
              <p className="text-sm text-white/30 max-w-md leading-relaxed">
                Start a conversation. Everything here is private, end-to-end encrypted, and post-quantum secure.
              </p>
              <div className="flex items-center gap-2 mt-6 text-white/20 text-xs">
                <Lock size={11} />
                <span>Kyber-1024 + AES-256-GCM · Dilithium-3</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info panel (third panel) */}
      {showInfo && activeConvo && !isMobile && (
        <div className="w-[300px] min-w-[280px] h-full flex-shrink-0">
          <ConversationInfo
            conversation={activeConvo}
            onClose={() => setShowInfo(false)}
          />
        </div>
      )}

      {/* New conversation dialog */}
      <NewConversationDialog
        open={newChatOpen}
        onClose={() => setNewChatOpen(false)}
        onCreated={(id) => {
          setActiveConvoId(id);
          refetch();
        }}
      />
    </div>
  );
}
