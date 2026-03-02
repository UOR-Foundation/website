/**
 * BloomProjectionTabs — Horizontal tab bar for multi-modal bloom
 * ═══════════════════════════════════════════════════════════════
 *
 * Minimalist pill-style tabs that let users switch between
 * bloom projections without leaving the Lumen surface.
 *
 * @module hologram-ui/components/lumen/BloomProjectionTabs
 */

import { motion } from "framer-motion";
import { MessageCircle, Network, CalendarDays, Brain, Zap, Eye } from "lucide-react";
import { PP } from "@/modules/hologram-ui/theme/portal-palette";

export type BloomProjection = "conversation" | "trust" | "calendar" | "knowledge" | "habits" | "mirror";

interface BloomProjectionTabsProps {
  active: BloomProjection;
  onChange: (projection: BloomProjection) => void;
}

const TABS: { id: BloomProjection; label: string; icon: React.ElementType }[] = [
  { id: "conversation", label: "Chat", icon: MessageCircle },
  { id: "trust",        label: "Trust", icon: Network },
  { id: "calendar",     label: "Calendar", icon: CalendarDays },
  { id: "knowledge",    label: "Graph", icon: Brain },
  { id: "habits",       label: "Habits", icon: Zap },
  { id: "mirror",       label: "Mirror", icon: Eye },
];

export default function BloomProjectionTabs({ active, onChange }: BloomProjectionTabsProps) {
  return (
    <div
      className="flex items-center gap-1 mx-4 px-1 py-1 rounded-2xl"
      style={{
        background: PP.canvasSubtle,
        border: `1px solid ${PP.bloomCardBorder}`,
      }}
    >
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className="relative flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl transition-colors duration-300"
            style={{
              fontFamily: PP.font,
              fontSize: "11px",
              fontWeight: isActive ? 500 : 400,
              color: isActive ? PP.accent : PP.textWhisper,
              letterSpacing: "0.03em",
            }}
          >
            {isActive && (
              <motion.div
                layoutId="bloom-tab-pill"
                className="absolute inset-0 rounded-xl"
                style={{
                  background: `${PP.accent}12`,
                  border: `1px solid ${PP.accent}18`,
                }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <Icon
              className="w-3.5 h-3.5 relative z-10"
              strokeWidth={isActive ? 1.8 : 1.3}
            />
            <span className="relative z-10 hidden min-[380px]:inline">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
