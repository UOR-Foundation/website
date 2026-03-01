/**
 * AppsPanel — Learn · Work · Play
 * ════════════════════════════════
 *
 * A single-screen, slide-out projection that surfaces everything
 * you can do inside Hologram across three clear modes of engagement.
 *
 * Why three sections? Because every meaningful interaction with a computer
 * falls into one of three intentions: learning something new, getting
 * something done, or unwinding. Hologram makes each one sovereign.
 */

import { useState, useCallback } from "react";
import {
  X, BookOpen, Briefcase, Sparkles,
  GraduationCap, Calculator, Microscope, Atom,
  Terminal, Code2, Beaker, MessageSquare, BarChart3,
  Music, Film, Gamepad2, Heart, Palette,
  ExternalLink,
} from "lucide-react";
import { KP } from "@/modules/hologram-os/kernel-palette";

/* ── Types ────────────────────────────────────────────────── */

interface AppEntry {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  action?: string; // panel ID to open
  route?: string;  // route to navigate
}

interface Section {
  key: string;
  label: string;
  tagline: string;
  icon: React.ElementType;
  color: string;
  colorSoft: string;
  apps: AppEntry[];
}

/* ── Sections ─────────────────────────────────────────────── */

const SECTIONS: Section[] = [
  {
    key: "learn",
    label: "Learn",
    tagline: "Explore, study, discover",
    icon: BookOpen,
    color: "hsl(210, 60%, 60%)",
    colorSoft: "hsla(210, 60%, 50%, 0.1)",
    apps: [
      { id: "quantum-lab", name: "Quantum Lab", description: "Interactive quantum circuit simulator", icon: Atom, action: "quantum-workspace" },
      { id: "jupyter", name: "Jupyter Notebook", description: "Python & data science notebooks", icon: Beaker, action: "jupyter" },
      { id: "knowledge-graph", name: "Knowledge Graph", description: "Personal knowledge mapping", icon: Microscope, action: "memory" },
      { id: "uor-academy", name: "UOR Academy", description: "Interactive UOR framework courses", icon: GraduationCap, route: "/research" },
      { id: "math-lens", name: "Math Lens", description: "Algebraic structures visualizer", icon: Calculator, route: "/research" },
    ],
  },
  {
    key: "work",
    label: "Work",
    tagline: "Build, ship, communicate",
    icon: Briefcase,
    color: "hsl(38, 55%, 60%)",
    colorSoft: "hsla(38, 55%, 50%, 0.1)",
    apps: [
      { id: "terminal", name: "Terminal", description: "QShell — POSIX-compatible command line", icon: Terminal, action: "terminal" },
      { id: "code", name: "Code Editor", description: "Monaco-based multi-file editor", icon: Code2, action: "code" },
      { id: "synth-research", name: "Synth Research", description: "AI-assisted research synthesis", icon: Beaker, action: "jupyter" },
      { id: "messenger", name: "Messenger", description: "Sovereign encrypted messaging", icon: MessageSquare, action: "messenger" },
      { id: "analytics", name: "Data Studio", description: "Visual analytics & dashboards", icon: BarChart3, route: "/research" },
    ],
  },
  {
    key: "play",
    label: "Play",
    tagline: "Listen, watch, unwind",
    icon: Sparkles,
    color: "hsl(280, 50%, 65%)",
    colorSoft: "hsla(280, 50%, 50%, 0.1)",
    apps: [
      { id: "music", name: "Music", description: "Content-addressed audio streaming", icon: Music, route: "/hologram-prime" },
      { id: "video", name: "Video", description: "Sovereign video streaming", icon: Film, route: "/hologram-prime" },
      { id: "creative", name: "Creative Studio", description: "Generative art & design", icon: Palette, route: "/research" },
      { id: "games", name: "Games", description: "Browser-native gaming", icon: Gamepad2, route: "/research" },
      { id: "wellness", name: "Wellness", description: "Mindfulness & focus sounds", icon: Heart, route: "/research" },
    ],
  },
];

/* ── Props ─────────────────────────────────────────────────── */

interface AppsPanelProps {
  onClose: () => void;
  onOpenPanel?: (panel: string) => void;
  onNavigate?: (route: string) => void;
}

/* ── Component ────────────────────────────────────────────── */

export default function AppsPanel({ onClose, onOpenPanel, onNavigate }: AppsPanelProps) {
  const handleAppClick = useCallback((app: AppEntry) => {
    if (app.action) {
      onOpenPanel?.(app.action);
    } else if (app.route) {
      onNavigate?.(app.route);
      onClose();
    }
  }, [onOpenPanel, onNavigate, onClose]);

  return (
    <div
      className="w-full h-full flex flex-col select-none"
      style={{ background: KP.bg, fontFamily: KP.font }}
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-6 py-4 shrink-0"
        style={{ borderBottom: `1px solid ${KP.border}` }}
      >
        <Sparkles className="w-5 h-5" strokeWidth={1.3} style={{ color: KP.gold }} />
        <span className="text-[16px] font-semibold tracking-wide" style={{ color: KP.text }}>
          Apps
        </span>
        <div className="flex-1" />
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-80 transition-opacity"
          style={{ color: KP.muted }}
        >
          <X className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>

      {/* ── Content: Three sections ────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto px-6 py-5"
        style={{ scrollbarWidth: "thin", scrollbarColor: `${KP.dim} transparent` }}
      >
        <div className="grid grid-rows-3 gap-6 h-full min-h-0">
          {SECTIONS.map((section) => (
            <SectionCard
              key={section.key}
              section={section}
              onAppClick={handleAppClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Section Card ─────────────────────────────────────────── */

function SectionCard({ section, onAppClick }: {
  section: Section;
  onAppClick: (app: AppEntry) => void;
}) {
  const Icon = section.icon;

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col min-h-0"
      style={{
        border: `1px solid ${KP.border}`,
        background: section.colorSoft,
      }}
    >
      {/* Section header */}
      <div className="flex items-center gap-3 px-5 py-3 shrink-0">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: `${section.color}20` }}
        >
          <Icon className="w-4 h-4" strokeWidth={1.4} style={{ color: section.color }} />
        </div>
        <div>
          <h2 className="text-[14px] font-semibold" style={{ color: KP.text }}>
            {section.label}
          </h2>
          <p className="text-[11px]" style={{ color: KP.muted }}>
            {section.tagline}
          </p>
        </div>
      </div>

      {/* App list — horizontal scroll */}
      <div
        className="flex-1 flex items-stretch gap-2.5 px-5 pb-4 overflow-x-auto min-h-0"
        style={{ scrollbarWidth: "none" }}
      >
        {section.apps.map((app) => (
          <button
            key={app.id}
            onClick={() => onAppClick(app)}
            className="group/app flex flex-col items-center gap-2 px-4 py-3 rounded-xl transition-all duration-200 shrink-0 cursor-pointer"
            style={{
              background: KP.card,
              border: `1px solid ${KP.cardBorder}`,
              minWidth: "120px",
              maxWidth: "140px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${section.color}15`;
              e.currentTarget.style.borderColor = `${section.color}30`;
              e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = KP.card;
              e.currentTarget.style.borderColor = KP.cardBorder;
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover/app:scale-110"
              style={{ background: `${section.color}18` }}
            >
              <app.icon className="w-5 h-5" strokeWidth={1.3} style={{ color: section.color }} />
            </div>
            <span
              className="text-[11px] font-medium text-center leading-tight"
              style={{ color: KP.text }}
            >
              {app.name}
            </span>
            <span
              className="text-[9px] text-center leading-tight line-clamp-2"
              style={{ color: KP.muted }}
            >
              {app.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
