import { useState, useEffect } from "react";
import UnifiedInbox from "../components/UnifiedInbox";
import ConversationView from "../components/ConversationView";
import ConversationInfo from "../components/ConversationInfo";
import GroupInfoPanel from "../components/GroupInfoPanel";
import NewConversationDialog from "../components/NewConversationDialog";
import NewGroupDialog from "../components/NewGroupDialog";
import SharedFiles from "../components/SharedFiles";
import BridgeConnectionPanel from "../components/BridgeConnectionPanel";
import ContactMergeDialog from "../components/ContactMergeDialog";
import ContactsPanel from "../components/ContactsPanel";
import CallsPanel from "../components/CallsPanel";
import SettingsPanel from "../components/SettingsPanel";
import { useConversations } from "../lib/use-conversations";
import { useAuth } from "@/hooks/use-auth";
import { useAuthPrompt } from "@/modules/auth/useAuthPrompt";
import { useIsMobile } from "@/hooks/use-mobile";
import { startOfflineSync } from "../lib/offline-queue";
import { requestNotificationPermission } from "../lib/notifications";
import { ShieldCheck, MessageSquare } from "lucide-react";

type SidePanel = "inbox" | "contacts" | "calls" | "settings";

export default function MessengerPage() {
  const { user, loading: authLoading } = useAuth();
  const { prompt: authPrompt } = useAuthPrompt();
  const { conversations, loading: convosLoading, refetch } = useConversations();
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showSharedFiles, setShowSharedFiles] = useState(false);
  const [showBridges, setShowBridges] = useState(false);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [sidePanel, setSidePanel] = useState<SidePanel>("inbox");
  const isMobile = useIsMobile();

  useEffect(() => {
    startOfflineSync();
    requestNotificationPermission();
  }, []);

  const activeConvo = conversations.find((c) => c.id === activeConvoId);
  const isGroupConvo = activeConvo?.sessionType === "group";

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
        <h2 className="text-2xl text-white/90 font-light mb-3">Inbox</h2>
        <p className="text-base text-white/50 max-w-sm leading-relaxed mb-6">
          Private, encrypted conversations. Sign in to continue.
        </p>
        <button
          onClick={() => authPrompt("messenger")}
          className="px-6 py-3 rounded-xl text-sm font-semibold transition-all"
          style={{ background: "rgba(255,255,255,0.92)", color: "#1a1a1a" }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,1)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.92)"; }}
        >
          Sign in
        </button>
      </div>
    );
  }

  const renderSidePanel = () => {
    switch (sidePanel) {
      case "contacts":
        return (
          <ContactsPanel
            conversations={conversations}
            onBack={() => setSidePanel("inbox")}
            onSelectConversation={(id) => { setActiveConvoId(id); setSidePanel("inbox"); }}
          />
        );
      case "calls":
        return <CallsPanel onBack={() => setSidePanel("inbox")} />;
      case "settings":
        return (
          <SettingsPanel
            onBack={() => setSidePanel("inbox")}
            onOpenBridges={() => { setShowBridges(true); setSidePanel("inbox"); }}
          />
        );
      default:
        return (
          <UnifiedInbox
            conversations={conversations}
            activeId={activeConvoId}
            onSelect={(id) => { setActiveConvoId(id); setShowInfo(false); setShowSharedFiles(false); setShowBridges(false); }}
            onNewChat={() => setNewChatOpen(true)}
            onNewGroup={() => setNewGroupOpen(true)}
            onOpenBridges={() => setShowBridges(!showBridges)}
            onContacts={() => setSidePanel("contacts")}
            onCalls={() => setSidePanel("calls")}
            onSettings={() => setSidePanel("settings")}
            loading={convosLoading}
          />
        );
    }
  };

  return (
    <div className="h-screen w-screen bg-slate-950 flex overflow-hidden" style={{ fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
      {showList && (
        <div className={`${isMobile ? "w-full" : "w-[320px] min-w-[280px] max-w-[380px]"} h-full flex-shrink-0 border-r border-white/[0.04] relative`}>
          {renderSidePanel()}
        </div>
      )}

      {showConvo && (
        <div className="flex-1 h-full min-w-0 relative">
          {activeConvo ? (
            <ConversationView
              conversation={activeConvo}
              onBack={isMobile ? () => setActiveConvoId(null) : undefined}
              onInfo={() => { setShowInfo(!showInfo); setShowSharedFiles(false); }}
            />
          ) : (
            <div
              className="h-full flex flex-col items-center justify-center text-center px-8"
              style={{ background: "radial-gradient(ellipse at 50% 40%, rgba(99,102,241,0.04) 0%, transparent 70%)" }}
            >
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-500/10 to-indigo-500/10 border border-white/[0.06] flex items-center justify-center mb-6">
                <MessageSquare size={32} className="text-white/20" />
              </div>
              <h2 className="text-2xl text-white/80 font-light mb-2">Inbox</h2>
              <p className="text-base text-white/40">
                Select a conversation or start a new one.
              </p>
            </div>
          )}
        </div>
      )}

      {showInfo && activeConvo && !isMobile && (
        <div className="w-[300px] min-w-[280px] h-full flex-shrink-0">
          {isGroupConvo ? (
            <GroupInfoPanel conversation={activeConvo} onClose={() => setShowInfo(false)} />
          ) : (
            <ConversationInfo conversation={activeConvo} onClose={() => setShowInfo(false)} />
          )}
        </div>
      )}

      {showSharedFiles && activeConvo && !isMobile && (
        <div className="w-[300px] min-w-[280px] h-full flex-shrink-0">
          <SharedFiles sessionId={activeConvo.id} onClose={() => setShowSharedFiles(false)} />
        </div>
      )}

      {showBridges && !isMobile && (
        <div className="w-[320px] min-w-[280px] h-full flex-shrink-0">
          <BridgeConnectionPanel onClose={() => setShowBridges(false)} />
        </div>
      )}

      <NewConversationDialog
        open={newChatOpen}
        onClose={() => setNewChatOpen(false)}
        onCreated={(id) => { setActiveConvoId(id); refetch(); }}
      />

      <NewGroupDialog
        open={newGroupOpen}
        onClose={() => setNewGroupOpen(false)}
        onCreated={(id) => { setActiveConvoId(id); refetch(); }}
      />

      <ContactMergeDialog open={showMergeDialog} onClose={() => setShowMergeDialog(false)} />
    </div>
  );
}
