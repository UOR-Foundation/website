/**
 * Hologram OS — Kernel-Projected Welcome Screen
 * ═══════════════════════════════════════════════
 *
 * ARCHITECTURAL PRINCIPLE: Zero local UI state.
 * ─────────────────────────────────────────────
 * Every visual decision flows from the Q-Linux kernel:
 *   Q-Boot → KernelProjector → ProjectionFrame → useKernel() → pixels
 *
 * Panel open/close, desktop switching, chat visibility — all are
 * kernel syscalls that mutate the KernelConfig, trigger a re-projection,
 * and stream the new frame to this component.
 *
 * This makes the entire experience a streaming projection from Q-Linux.
 * The kernel IS the state. The browser IS the surface.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";

import { useNavigate } from "react-router-dom";
import { useKernel } from "@/modules/hologram-os/hooks/useKernel";
import type { DesktopMode } from "@/modules/hologram-os/projection-engine";
import KernelBoot from "@/modules/hologram-os/components/KernelBoot";
import HologramClaimOverlay from "@/modules/hologram-ui/components/HologramClaimOverlay";
import HologramAiChat from "@/modules/hologram-ui/components/HologramAiChat";
import BrowserProjection from "@/modules/hologram-ui/components/BrowserProjection";
import ComputeProjection from "@/modules/hologram-ui/components/ComputeProjection";
import MemoryProjection from "@/modules/hologram-ui/components/MemoryProjection";
import MessengerProjection from "@/modules/hologram-ui/components/MessengerProjection";
import TerminalProjection from "@/modules/hologram-ui/components/TerminalProjection";
import JupyterProjection from "@/modules/hologram-ui/components/JupyterProjection";
import QuantumWorkspaceProjection from "@/modules/hologram-ui/components/QuantumWorkspaceProjection";
import CodeProjectionShell from "@/modules/hologram-ui/components/CodeProjectionShell";
import PackageManagerProjection from "@/modules/hologram-ui/components/PackageManagerProjection";
import VaultProjection from "@/modules/hologram-ui/components/vault/VaultProjection";
import AppsProjection from "@/modules/hologram-ui/components/AppsProjection";
import MySpaceProjection from "@/modules/hologram-ui/components/MySpaceProjection";
import LumenFullscreen from "@/modules/hologram-ui/components/projections/LumenFullscreen";
import MobileOsShell from "@/modules/hologram-ui/components/MobileOsShell";
import DesktopOsSidebar from "@/modules/hologram-ui/components/DesktopOsSidebar";
import ShortcutCheatSheet from "@/modules/hologram-ui/components/ShortcutCheatSheet";
import LegalPanel from "@/modules/hologram-ui/components/LegalPanel";

import KernelDevTools from "@/modules/hologram-os/components/KernelDevTools";
import KernelInspector from "@/modules/hologram-os/components/KernelInspector";
import BreathingRhythmListener from "@/modules/hologram-os/components/BreathingRhythmListener";
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

const ALL_DESKTOPS: DesktopMode[] = ["image", "white", "dark"];

export default function HologramOsPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // ═══════════════════════════════════════════════════════════════════════
  // KERNEL — the single source of truth for ALL UI state
  // ═══════════════════════════════════════════════════════════════════════
  const k = useKernel();

  const [kernelEntered, setKernelEntered] = useState(false);
  const hasBootedBefore = useRef(false);

  // Boot the kernel on mount (once)
  useEffect(() => {
    if (!k.isBooted && !k.isBooting) {
      const skipAnim = sessionStorage.getItem("kernel:booted") === "1";
      hasBootedBefore.current = skipAnim;
      k.boot().then(() => {
        sessionStorage.setItem("kernel:booted", "1");
      });
    } else if (k.isBooted) {
      setKernelEntered(true);
      hasBootedBefore.current = true;
    }
  }, [k.isBooted, k.isBooting]);

  // ═══════════════════════════════════════════════════════════════════════
  // DERIVED FROM KERNEL — no local state for panels, chat, or desktop
  // ═══════════════════════════════════════════════════════════════════════
  const activePanel = k.activePanel;
  const chatOpen = k.chatOpen;
  const activeDesktop = k.desktopMode;

  // ── Remaining local state (truly view-local, not kernel state) ────────
  const [claimOpen, setClaimOpen] = useState(false);
  const [ambientState, setAmbientState] = useState<AmbientState>({ playing: false, loading: false, stationHue: "220", stationName: "" });
  const lumenPanel = useModularPanel({
    storageKey: "lumen-ai",
    defaultWidth: 340,
    constraints: { minWidth: 280, maxWidth: 600 },
    snap: true,
    dockSide: "right",
  });
  const [chatPrompt, setChatPrompt] = useState("");
  const [chatPrewarmed, setChatPrewarmed] = useState(false);
  const [legalOpen, setLegalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<"privacy" | "terms" | "principles">("principles");
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const journal = useFocusJournal();

  // ── Kernel Inspector keyboard shortcut (Ctrl+Shift+I) ─────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "I") {
        e.preventDefault();
        setInspectorOpen(v => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── Panel preloading — prescience-driven + hover-triggered ─────────────
  const [preloadedPanels, setPreloadedPanels] = useState<Set<string>>(new Set());
  const handleHoverPanel = useCallback((panel: string) => {
    setPreloadedPanels(prev => prev.has(panel) ? prev : new Set(prev).add(panel));
  }, []);

  // Prescience: auto-preload panels predicted by the coherence engine
  useEffect(() => {
    if (k.prescienceHints.length === 0) return;
    setPreloadedPanels(prev => {
      const next = new Set(prev);
      let changed = false;
      for (const hint of k.prescienceHints) {
        if (!next.has(hint.panel)) {
          next.add(hint.panel);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [k.prescienceHints]);

  // ── Transition state (visual-only, not kernel state) ──────────────────
  const [departingDesktop, setDepartingDesktop] = useState<DesktopMode | null>(null);
  const [sidebarBgMode, setSidebarBgMode] = useState<DesktopMode>(activeDesktop);

  const switchDesktop = useCallback((target: DesktopMode) => {
    if (target === activeDesktop || departingDesktop) return;

    // Visual: start peel animation from current desktop
    setDepartingDesktop(activeDesktop);

    // Kernel syscall: switch desktop mode → re-projection
    k.switchDesktop(target as DesktopMode);

    // After peel animation completes — with safety ceiling
    const t = setTimeout(() => {
      setSidebarBgMode(target);
      setDepartingDesktop(null);
    }, 1000);
    return () => clearTimeout(t);
  }, [activeDesktop, departingDesktop, k.switchDesktop]);

  // Safety: clear stuck departing state if it persists beyond 1.5s
  useEffect(() => {
    if (!departingDesktop) return;
    const safety = setTimeout(() => setDepartingDesktop(null), 1500);
    return () => clearTimeout(safety);
  }, [departingDesktop]);

  // ── Widget visibility — projected from kernel ─────────────────────────
  const isWidgetVisible = useCallback((id: string) => k.isDesktopWidgetVisible(activeDesktop, id), [k, activeDesktop]);
  const removeWidget = useCallback((id: string) => k.hideDesktopWidget(activeDesktop, id), [k, activeDesktop]);
  const toggleAllWidgets = useCallback(() => k.toggleAllDesktopWidgets(activeDesktop), [k, activeDesktop]);
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

  // ── Voice ↔ Chat persistence ──────────────────────────────────────────
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

  // ── Auto-hide widgets in focus mode — kernel syscall ────────────────
  useEffect(() => {
    k.setDesktopAllHidden(activeDesktop, isFocus);
  }, [isFocus, activeDesktop]);

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

  // ── Listen for global lumen:open event → kernel syscall ───────────────
  useEffect(() => {
    const handler = () => k.setChatOpen(true);
    window.addEventListener("lumen:open", handler);
    return () => window.removeEventListener("lumen:open", handler);
  }, [k.setChatOpen]);

  // ── Global keyboard shortcuts → kernel syscalls ────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;

      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.shiftKey && e.key === ">") {
        e.preventDefault();
        Object.keys(localStorage).filter(key => key.startsWith("hologram-pos:")).forEach(key => localStorage.removeItem(key));
        window.location.reload();
        return;
      }

      if (!mod) return;

      switch (e.key) {
        case ";": e.preventDefault(); mastery.record(";"); k.setChatOpen(true); break;
        case "]": e.preventDefault(); mastery.record("]"); attention.toggle(); break;
        case "[":
          e.preventDefault();
          mastery.record("[");
          const nextIdx = (ALL_DESKTOPS.indexOf(activeDesktop) + 1) % ALL_DESKTOPS.length;
          switchDesktop(ALL_DESKTOPS[nextIdx]);
          break;
        case ",": e.preventDefault(); mastery.record(","); k.openPanel("messenger"); break;
        case ".": e.preventDefault(); mastery.record("."); k.setChatOpen(false); k.closePanel(); break;
        case "\\": e.preventDefault(); mastery.record("\\"); toggleAllWidgets(); break;
        case "/": e.preventDefault(); mastery.record("/"); setShortcutsOpen(prev => !prev); break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate, attention, activeDesktop, switchDesktop, toggleAllWidgets, k.setChatOpen, k.openPanel, k.closePanel]);

  // ── Mobile: iOS homescreen ──
  if (isMobile) return <MobileOsShell />;

  const welcomeName = name || "traveller";

  // Only mount active desktop + departing (during transition)
  const mountedDesktops = departingDesktop
    ? [activeDesktop, departingDesktop]
    : [activeDesktop];

  function desktopZ(mode: DesktopMode): number {
    if (mode === departingDesktop) return 300;
    if (mode === activeDesktop) return 200;
    return 100;
  }

  return (
    <HologramViewport className="h-screen bg-background">
      {/* ══ Kernel Boot Portal ═════════════════════════════════════ */}
      {!kernelEntered && (
        <KernelBoot
          events={k.bootEvents}
          stage={k.stage}
          isBooted={k.isBooted}
          bootTimeMs={k.bootTimeMs}
          onEntered={() => setKernelEntered(true)}
          skipAnimation={hasBootedBefore.current}
        />
      )}

      <DepthShiftSync active={claimOpen} />

      <div className="flex h-full overflow-hidden">
        {/* ══ Sidebar — kernel syscalls for panel/desktop switching ═══ */}
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
            onNewChat={() => k.setChatOpen(true)}
            onOpenChat={() => k.setChatOpen(true)}
            onHoverChat={() => setChatPrewarmed(true)}
            onOpenBrowser={() => k.openPanel("browser")}
            onOpenCompute={() => k.openPanel("compute")}
            onOpenTerminal={() => k.openPanel("terminal")}
            onOpenMemory={() => k.openPanel("memory")}
            onOpenMessenger={() => k.openPanel("messenger")}
            onOpenJupyter={() => k.openPanel("jupyter")}
            onOpenQuantumWorkspace={() => k.openPanel("quantum-workspace")}
            onOpenCode={() => k.openPanel("code")}
            onOpenPackages={() => k.openPanel("packages")}
            onOpenVault={() => k.openPanel("vault")}
            onOpenApps={() => k.openPanel("apps")}
            onOpenMySpace={() => k.openPanel("myspace")}
            onGoHome={() => { k.setChatOpen(false); k.closePanel(); }}
            onReplayGuide={() => setShortcutsOpen(true)}
            onHoverPanel={handleHoverPanel}
            hintOpacity={mastery.hintOpacity}
            bgMode={sidebarBgMode}
          />
        </div>

        {/* ══ Desktop Stack — lazy-mounted projections from kernel ═══ */}
        <div
          className="flex-1 relative overflow-hidden z-0"
          style={{
            opacity: departing ? 0 : 1,
            transform: `scale(${departing ? 1.02 : isFocus ? 1.03 : 1})`,
            filter: departing ? "blur(4px)" : "none",
            transition: lumenPanel.isResizing
              ? "none"
              : `transform ${isFocus ? 600 : 220}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${isFocus ? 600 : 220}ms ease, filter ${isFocus ? 600 : 220}ms ease`,
            willChange: "transform",
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
                    ? "clip-path 1000ms cubic-bezier(0.22, 1, 0.36, 1)"
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
                  onOpenChat={() => { setChatPrompt(""); k.setChatOpen(true); }}
                  onSwitchDesktop={switchDesktop}
                  onOpenLegal={(tab) => { setLegalTab(tab); setLegalOpen(true); }}
                  isWidgetVisible={isWidgetVisible}
                  removeWidget={removeWidget}
                  onOpenConvergence={() => k.openPanel("convergence")}
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

          {/* ══ Lumen Fullscreen — expands from Genesis dot ═══════════ */}
          <LumenFullscreen
            open={activePanel === "convergence"}
            onClose={() => k.closePanel()}
            onCollapse={() => {
              k.closePanel();
              k.setChatOpen(true);
            }}
          />
        </div>

        {/* ══ Lumen AI Chat — GPU-accelerated slide, always mounted ═══ */}
        <div
          className="shrink-0 h-full"
          style={{
            width: chatOpen || lumenPanel.isResizing
              ? (lumenPanel.width ? `${lumenPanel.width}px` : "340px")
              : "0px",
            overflow: "visible",
            transition: lumenPanel.isResizing
              ? "none"
              : "width 180ms cubic-bezier(0.22, 1, 0.36, 1)",
            willChange: "width",
          }}
        >
          <div
            className="h-full overflow-hidden"
            style={{
              width: lumenPanel.width ? `${lumenPanel.width}px` : "340px",
              transform: chatOpen ? "translateX(0) translateZ(0)" : "translateX(100%) translateZ(0)",
              opacity: chatOpen ? 1 : 0,
              transition: lumenPanel.isResizing
                ? "none"
                : "transform 160ms cubic-bezier(0.22, 1, 0.36, 1), opacity 120ms ease",
              willChange: chatOpen || chatPrewarmed ? "transform, opacity" : "auto",
              contain: "layout style paint",
            }}
          >
            <HologramAiChat
              open={chatOpen}
              onClose={() => { k.setChatOpen(false); setChatPrompt(""); }}
              onPhaseChange={triadicActivity.setActivePhase}
              creatorStage={triadicActivity.creatorStage}
              replayGuideKey={0}
              initialPrompt={chatPrompt}
              panelWidth={lumenPanel.width}
              resizeHandleProps={lumenPanel.resizeHandleProps}
              isResizing={lumenPanel.isResizing}
            />
          </div>
        </div>
      </div>

      {/* ══ Overlay Layer — all derived from kernel projection ═══════ */}
      <HologramClaimOverlay open={claimOpen} onClose={() => setClaimOpen(false)} />
      <ShortcutCheatSheet open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <LegalPanel open={legalOpen} initialTab={legalTab} onClose={() => setLegalOpen(false)} bgMode={activeDesktop === "white" ? "white" : "dark"} />
      <ModularSnapGrid visible={lumenPanel.isResizing} />
      <BrowserProjection
        open={activePanel === "browser"}
        preload={preloadedPanels.has("browser")}
        onClose={() => k.closePanel()}
        onSendToLumen={({ title, url, markdown }) => {
          const truncated = markdown.length > 4000 ? markdown.slice(0, 4000) + "\n\n…[truncated]" : markdown;
          setChatPrompt(`I'm reading "${title}" (${url}). Here's the page content:\n\n${truncated}\n\nPlease summarize the key points and insights from this page.`);
          k.closePanel();
          k.setChatOpen(true);
        }}
      />
      <ComputeProjection open={activePanel === "compute"} preload={preloadedPanels.has("compute")} onClose={() => k.closePanel()} />
      <MemoryProjection open={activePanel === "memory"} preload={preloadedPanels.has("memory")} onClose={() => k.closePanel()} />
      <MessengerProjection open={activePanel === "messenger"} preload={preloadedPanels.has("messenger")} onClose={() => k.closePanel()} />
      <TerminalProjection open={activePanel === "terminal"} preload={preloadedPanels.has("terminal")} onClose={() => k.closePanel()} onOpenJupyter={() => k.openPanel("jupyter")} />
      <JupyterProjection open={activePanel === "jupyter"} preload={preloadedPanels.has("jupyter")} onClose={() => k.closePanel()} />
      <QuantumWorkspaceProjection open={activePanel === "quantum-workspace"} preload={preloadedPanels.has("quantum-workspace")} onClose={() => k.closePanel()} />
      <CodeProjectionShell open={activePanel === "code"} preload={preloadedPanels.has("code")} onClose={() => k.closePanel()} />
      <PackageManagerProjection open={activePanel === "packages"} preload={preloadedPanels.has("packages")} onClose={() => k.closePanel()} />
      <VaultProjection open={activePanel === "vault"} preload={preloadedPanels.has("vault")} onClose={() => k.closePanel()} onOpenPanel={(p) => k.openPanel(p as any)} />
      <AppsProjection open={activePanel === "apps"} preload={preloadedPanels.has("apps")} onClose={() => k.closePanel()} onOpenPanel={(p) => k.openPanel(p as any)} onNavigate={(r) => { k.closePanel(); navigate(r); }} />
      <MySpaceProjection open={activePanel === "myspace"} preload={preloadedPanels.has("myspace")} onClose={() => k.closePanel()} />
      {/* ConvergenceProjection removed — now rendered inline as LumenFullscreen within the content area */}
      <SnapGuideOverlay />
      
      <KernelDevTools />
      <KernelInspector visible={inspectorOpen} onClose={() => setInspectorOpen(false)} />
      <BreathingRhythmListener />
    </HologramViewport>
  );
}
