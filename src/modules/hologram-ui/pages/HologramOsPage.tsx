/**
 * Hologram OS — Welcome Screen
 * ═════════════════════════════
 *
 * Desktop: Sidebar + multi-desktop stack (Windows-style virtual desktops).
 * Mobile: iOS-style homescreen shell.
 *
 * Architecture: Only the ACTIVE desktop is fully mounted. During transitions,
 * the departing desktop is also mounted briefly for the peel animation.
 * This eliminates the triple-render overhead of the previous approach.
 *
 * Panel state uses a discriminated union (activePanel) instead of 7 booleans.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";

import { useNavigate } from "react-router-dom";
import { useKernel } from "@/modules/hologram-os/hooks/useKernel";
import KernelBoot from "@/modules/hologram-os/components/KernelBoot";
import HologramClaimOverlay from "@/modules/hologram-ui/components/HologramClaimOverlay";
import HologramAiChat from "@/modules/hologram-ui/components/HologramAiChat";
import BrowserProjection from "@/modules/hologram-ui/components/BrowserProjection";
import ComputeProjection from "@/modules/hologram-ui/components/ComputeProjection";
import MemoryProjection from "@/modules/hologram-ui/components/MemoryProjection";
import MessengerProjection from "@/modules/hologram-ui/components/MessengerProjection";
import TerminalProjection from "@/modules/hologram-ui/components/TerminalProjection";
import JupyterProjection from "@/modules/hologram-ui/components/JupyterProjection";
import MobileOsShell from "@/modules/hologram-ui/components/MobileOsShell";
import DesktopOsSidebar from "@/modules/hologram-ui/components/DesktopOsSidebar";
import ShortcutCheatSheet from "@/modules/hologram-ui/components/ShortcutCheatSheet";
import LegalPanel from "@/modules/hologram-ui/components/LegalPanel";
import KernelHeartbeat from "@/modules/hologram-os/components/KernelHeartbeat";
import { HologramViewport, useDepthShift } from "@/modules/hologram-ui/components/HologramFrame";
import ModularSnapGrid from "@/modules/hologram-ui/components/ModularSnapGrid";
import SnapGuideOverlay from "@/modules/hologram-ui/components/SnapGuideOverlay";
import { type AmbientState } from "@/modules/hologram-ui/components/AmbientPlayer";
import { useModularPanel } from "@/modules/hologram-ui/hooks/useModularPanel";
import { useGreeting } from "@/modules/hologram-ui/hooks/useGreeting";
import { useTriadicActivity } from "@/modules/hologram-ui/hooks/useTriadicActivity";
import { useAttentionMode } from "@/modules/hologram-ui/hooks/useAttentionMode";
import { useFocusJournal } from "@/modules/hologram-ui/hooks/useFocusJournal";
import { useContextProjection } from "@/modules/hologram-ui/hooks/useContextProjection";
import { useShortcutMastery } from "@/modules/hologram-ui/hooks/useShortcutMastery";
import { useContextBeacon, useScreenContext } from "@/modules/hologram-ui/hooks/useScreenContext";
import { useObserverCompanion } from "@/modules/hologram-ui/hooks/useObserverCompanion";
import DesktopSurface from "@/modules/hologram-ui/components/DesktopSurface";
import { useDesktopState, type DesktopId } from "@/modules/hologram-ui/hooks/useDesktopState";
import { useAiChatHistory } from "@/modules/hologram-ui/hooks/useAiChatHistory";
import VoiceOrb from "@/modules/hologram-ui/components/VoiceOrb";

// ── Mobile detection ────────────────────────────────────────────────────────
function useIsMobile(breakpoint = 640) {
  const [mobile, setMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false,
  );
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches);
    setMobile(mql.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [breakpoint]);
  return mobile;
}

/** Syncs overlay open state into the DepthShift context */
function DepthShiftSync({ active }: { active: boolean }) {
  const { setOverlayActive } = useDepthShift();
  useEffect(() => {
    setOverlayActive(active, 3);
  }, [active, setOverlayActive]);
  return null;
}

// ── Panel state: discriminated union replaces 7 booleans ────────────────────
type PanelId = "none" | "chat" | "browser" | "compute" | "memory" | "messenger" | "terminal" | "jupyter";

const ALL_DESKTOPS: DesktopId[] = ["image", "white", "dark"];

export default function HologramOsPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // ── Kernel Projection ─────────────────────────────────────────────────────
  const kernel = useKernel();
  const [kernelEntered, setKernelEntered] = useState(false);
  const hasBootedBefore = useRef(false);

  useEffect(() => {
    if (!kernel.isBooted && !kernel.isBooting) {
      const skipAnim = sessionStorage.getItem("kernel:booted") === "1";
      hasBootedBefore.current = skipAnim;
      kernel.boot().then(() => {
        sessionStorage.setItem("kernel:booted", "1");
      });
    } else if (kernel.isBooted) {
      setKernelEntered(true);
      hasBootedBefore.current = true;
    }
  }, [kernel.isBooted, kernel.isBooting]);

  const [claimOpen, setClaimOpen] = useState(false);

  // ── Consolidated panel state ──────────────────────────────────────────────
  const [activePanel, setActivePanel] = useState<PanelId>("none");
  const [chatOpen, setChatOpen] = useState(false); // Chat is independent (can coexist with desktop)

  const openPanel = useCallback((panel: PanelId) => {
    if (panel === "chat") {
      setChatOpen(true);
    } else {
      setActivePanel(panel);
      setChatOpen(false);
    }
  }, []);

  const closePanel = useCallback(() => setActivePanel("none"), []);

  const [ambientState, setAmbientState] = useState<AmbientState>({ playing: false, loading: false, stationHue: "220", stationName: "" });
  const lumenPanel = useModularPanel({
    storageKey: "lumen-ai",
    defaultWidth: 340,
    constraints: { minWidth: 280, maxWidth: 600 },
    snap: true,
    dockSide: "right",
  });
  const [chatPrompt, setChatPrompt] = useState("");
  const [legalOpen, setLegalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<"privacy" | "terms">("privacy");
  const journal = useFocusJournal();

  // ── Active desktop ────────────────────────────────────────────────────────
  const [activeDesktop, setActiveDesktop] = useState<DesktopId>(() => {
    const saved = localStorage.getItem("hologram-bg-mode");
    return saved === "white" || saved === "dark" || saved === "image" ? saved : "image";
  });

  // ── Transition state ──────────────────────────────────────────────────────
  const [departingDesktop, setDepartingDesktop] = useState<DesktopId | null>(null);
  const [sidebarBgMode, setSidebarBgMode] = useState<DesktopId>(activeDesktop);

  const switchDesktop = useCallback((target: DesktopId) => {
    if (target === activeDesktop || departingDesktop) return;
    setDepartingDesktop(activeDesktop);
    setActiveDesktop(target);
    localStorage.setItem("hologram-bg-mode", target);
    setTimeout(() => {
      setSidebarBgMode(target);
      setDepartingDesktop(null);
    }, 2000);
  }, [activeDesktop, departingDesktop]);

  // ── Single desktop widget state (only for active desktop) ─────────────────
  const activeWidgets = useDesktopState(activeDesktop);

  const [departing, setDeparting] = useState(false);
  const { greeting, name } = useGreeting();
  const triadicActivity = useTriadicActivity();
  const attention = useAttentionMode();
  const mastery = useShortcutMastery();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const ctx = useContextProjection();
  const screenCtx = useScreenContext();
  const observer = useObserverCompanion({
    profile: ctx.profile,
    pendingTLDR: journal.pendingTLDR,
    sessionSNR: null,
  });
  const isFocus = attention.preset === "focus";

  // ── Voice ↔ Chat persistence ──────────────────────────────────────────────
  const chatHistory = useAiChatHistory();
  const voiceConversationRef = React.useRef<string | null>(null);

  const handleVoiceExchange = useCallback(async (userText: string, assistantText: string) => {
    if (!chatHistory.isAuthenticated) return;
    let convId = voiceConversationRef.current;
    if (!convId) {
      convId = await chatHistory.createConversation("Voice Session", "voice");
      if (!convId) return;
      voiceConversationRef.current = convId;
    }
    await chatHistory.saveMessage(convId, "user", userText, { source: "voice" });
    await chatHistory.saveMessage(convId, "assistant", assistantText, { source: "voice" });
    if (userText) await chatHistory.autoTitle(convId, userText);
  }, [chatHistory.isAuthenticated, chatHistory.createConversation, chatHistory.saveMessage, chatHistory.autoTitle]);

  // ── Load active conversation messages as voice context ─────────────────
  const [voiceChatContext, setVoiceChatContext] = useState<{ role: "user" | "assistant"; content: string }[]>([]);

  useEffect(() => {
    if (!chatHistory.activeConversationId || !chatHistory.isAuthenticated) {
      setVoiceChatContext([]);
      return;
    }
    chatHistory.loadMessages(chatHistory.activeConversationId).then((msgs) => {
      setVoiceChatContext(
        msgs
          .filter((m) => m.role === "user" || m.role === "assistant")
          .slice(-20)
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))
      );
    });
  }, [chatHistory.activeConversationId, chatHistory.isAuthenticated]);

  // ── Auto-hide widgets in focus mode ────────────────────────────────────
  useEffect(() => {
    activeWidgets.setAllHidden(isFocus);
  }, [isFocus, activeDesktop]);

  // Context hints
  const contextHints = useMemo(() => {
    const entries = Object.entries(ctx.profile.interests);
    if (entries.length === 0) return [];
    return entries.sort(([, a], [, b]) => b - a).slice(0, 3).map(([tag]) => tag.replace(/-/g, " "));
  }, [ctx.profile.interests]);

  useContextBeacon({
    id: "hologram-home",
    title: `Hologram Home — ${greeting}`,
    summary: `User is on the Hologram OS welcome screen. Desktop: ${activeDesktop}. ${isFocus ? "Focus mode is active." : ""}`,
    contentType: "dashboard",
    metadata: { bgMode: activeDesktop, focusMode: isFocus },
  });

  // ── Listen for global lumen:open event ─────────────────────────────────
  useEffect(() => {
    const handler = () => setChatOpen(true);
    window.addEventListener("lumen:open", handler);
    return () => window.removeEventListener("lumen:open", handler);
  }, []);

  // ── Global keyboard shortcuts ──────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;

      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.shiftKey && e.key === ">") {
        e.preventDefault();
        Object.keys(localStorage).filter(k => k.startsWith("hologram-pos:")).forEach(k => localStorage.removeItem(k));
        window.location.reload();
        return;
      }

      if (!mod) return;

      switch (e.key) {
        case ";": e.preventDefault(); mastery.record(";"); setChatOpen(true); break;
        case "]": e.preventDefault(); mastery.record("]"); attention.toggle(); break;
        case "[":
          e.preventDefault();
          mastery.record("[");
          const nextIdx = (ALL_DESKTOPS.indexOf(activeDesktop) + 1) % ALL_DESKTOPS.length;
          switchDesktop(ALL_DESKTOPS[nextIdx]);
          break;
        case ",": e.preventDefault(); mastery.record(","); openPanel("messenger"); break;
        case ".": e.preventDefault(); mastery.record("."); setChatOpen(false); closePanel(); break;
        case "\\": e.preventDefault(); mastery.record("\\"); activeWidgets.toggleAllWidgets(); break;
        case "/": e.preventDefault(); mastery.record("/"); setShortcutsOpen(prev => !prev); break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate, attention, activeDesktop, switchDesktop, activeWidgets]);

  // ── Mobile: iOS homescreen ──
  if (isMobile) return <MobileOsShell />;

  const welcomeName = name || "traveller";

  // ── Desktops to mount: only active + departing ────────────────────────────
  const mountedDesktops = departingDesktop
    ? [activeDesktop, departingDesktop]
    : [activeDesktop];

  function desktopZ(mode: DesktopId): number {
    if (mode === departingDesktop) return 300;
    if (mode === activeDesktop) return 200;
    return 100;
  }

  return (
    <HologramViewport className="h-screen bg-background">
      {/* ══ Kernel Boot Portal ═════════════════════════════════════ */}
      {!kernelEntered && (
        <KernelBoot
          events={kernel.bootEvents}
          stage={kernel.stage}
          isBooted={kernel.isBooted}
          bootTimeMs={kernel.bootTimeMs}
          onEntered={() => setKernelEntered(true)}
          skipAnimation={hasBootedBefore.current}
        />
      )}

      <DepthShiftSync active={claimOpen} />

      <div className="flex h-full overflow-hidden">
        {/* ══ Sidebar (Chrome Layer) ═══════════════════════════════ */}
        <div
          className="shrink-0 overflow-visible"
          style={{
            width: isFocus ? 0 : undefined,
            opacity: isFocus ? 0 : 1,
            pointerEvents: isFocus ? "none" : "auto",
            transition: isFocus ? "all 300ms ease-out" : "none",
          }}
        >
          <DesktopOsSidebar
            onNewChat={() => setChatOpen(true)}
            onOpenChat={() => setChatOpen(true)}
            onOpenBrowser={() => openPanel("browser")}
            onOpenCompute={() => openPanel("compute")}
            onOpenTerminal={() => openPanel("terminal")}
            onOpenMemory={() => openPanel("memory")}
            onOpenMessenger={() => openPanel("messenger")}
            onOpenJupyter={() => openPanel("jupyter")}
            onGoHome={() => { setChatOpen(false); closePanel(); }}
            onReplayGuide={() => setShortcutsOpen(true)}
            hintOpacity={mastery.hintOpacity}
            bgMode={sidebarBgMode}
          />
        </div>

        {/* ══ Desktop Stack (lazy-mounted: only active + departing) ════ */}
        <div
          className={`flex-1 relative overflow-hidden z-0 ${lumenPanel.isResizing ? "" : "transition-all ease-in-out"}`}
          style={{
            opacity: departing ? 0 : 1,
            transform: departing ? "scale(1.02)" : isFocus ? "scale(1.03)" : "scale(1)",
            filter: departing ? "blur(4px)" : "none",
            transitionDuration: lumenPanel.isResizing ? "0ms" : isFocus ? "600ms" : "400ms",
            marginRight: chatOpen ? `${lumenPanel.width}px` : "0px",
          }}
        >
          {mountedDesktops.map((mode) => {
            const isDep = mode === departingDesktop;
            const isAct = mode === activeDesktop;

            return (
              <div
                key={mode}
                className="absolute inset-0"
                style={{
                  zIndex: desktopZ(mode),
                  clipPath: isDep ? "inset(0 100% 0 0)" : "inset(0 0 0 0)",
                  transition: isDep
                    ? "clip-path 2000ms cubic-bezier(0.25, 0.46, 0.45, 0.94)"
                    : "none",
                  willChange: isDep ? "clip-path" : "auto",
                }}
              >
                <DesktopSurface
                  mode={mode}
                  isActive={isAct && !departingDesktop}
                  isDeparting={isDep}
                  greeting={greeting}
                  welcomeName={welcomeName}
                  isFocus={isFocus}
                  contextHints={contextHints}
                  onOpenChat={() => { setChatPrompt(""); setChatOpen(true); }}
                  onSwitchDesktop={switchDesktop}
                  onOpenLegal={(tab) => { setLegalTab(tab); setLegalOpen(true); }}
                  isWidgetVisible={activeWidgets.isWidgetVisible}
                  removeWidget={activeWidgets.removeWidget}
                  ambientState={mode === "image" ? ambientState : undefined}
                  observerBriefing={observer.promptText}
                  screenContext={screenCtx.getPromptContext()}
                  onExchange={handleVoiceExchange}
                  chatContext={voiceChatContext}
                />

                {isDep && (
                  <div
                    className="absolute top-0 bottom-0 left-0 pointer-events-none"
                    style={{
                      width: "80px",
                      background: "linear-gradient(to right, hsla(38, 30%, 65%, 0.08), transparent)",
                      filter: "blur(16px)",
                      zIndex: 1,
                    }}
                  />
                )}
              </div>
            );
          })}

          {/* ══ Page-level VoiceOrb (single instance) ═══════════════ */}
          <div
            className="absolute left-1/2 -translate-x-1/2 z-[400]"
            style={{
              bottom: "clamp(180px, 22vh, 280px)",
              opacity: isFocus ? 0 : 1,
              pointerEvents: isFocus ? "none" : "auto",
              transition: "opacity 300ms",
            }}
          >
            <VoiceOrb
              personaId="hologram"
              observerBriefing={observer.promptText}
              screenContext={screenCtx.getPromptContext()}
              onExchange={handleVoiceExchange}
              chatContext={voiceChatContext}
            />
          </div>
        </div>
      </div>

      {/* ══ Overlay Layer (modals, chat, projections) ════════════ */}
      <HologramClaimOverlay open={claimOpen} onClose={() => setClaimOpen(false)} />
      <ShortcutCheatSheet open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <LegalPanel open={legalOpen} initialTab={legalTab} onClose={() => setLegalOpen(false)} bgMode={activeDesktop === "white" ? "white" : "dark"} />
      <ModularSnapGrid visible={lumenPanel.isResizing} />
      <HologramAiChat
        open={chatOpen}
        onClose={() => { setChatOpen(false); setChatPrompt(""); }}
        onPhaseChange={triadicActivity.setActivePhase}
        creatorStage={triadicActivity.creatorStage}
        replayGuideKey={0}
        initialPrompt={chatPrompt}
        panelWidth={lumenPanel.width}
        resizeHandleProps={lumenPanel.resizeHandleProps}
        isResizing={lumenPanel.isResizing}
      />
      <BrowserProjection
        open={activePanel === "browser"}
        onClose={closePanel}
        onSendToLumen={({ title, url, markdown }) => {
          const truncated = markdown.length > 4000 ? markdown.slice(0, 4000) + "\n\n…[truncated]" : markdown;
          setChatPrompt(`I'm reading "${title}" (${url}). Here's the page content:\n\n${truncated}\n\nPlease summarize the key points and insights from this page.`);
          closePanel();
          setChatOpen(true);
        }}
      />
      <ComputeProjection open={activePanel === "compute"} onClose={closePanel} />
      <MemoryProjection open={activePanel === "memory"} onClose={closePanel} />
      <MessengerProjection open={activePanel === "messenger"} onClose={closePanel} />
      <TerminalProjection open={activePanel === "terminal"} onClose={closePanel} onOpenJupyter={() => { closePanel(); setTimeout(() => setActivePanel("jupyter"), 350); }} />
      <JupyterProjection open={activePanel === "jupyter"} onClose={closePanel} />
      <SnapGuideOverlay />
      <KernelHeartbeat />
    </HologramViewport>
  );
}
