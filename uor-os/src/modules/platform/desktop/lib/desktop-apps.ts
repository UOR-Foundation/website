/**
 * Desktop Apps — Blueprint-Derived Application Registry.
 * ═════════════════════════════════════════════════════════════════
 *
 * Derives the DesktopApp[] array from Sovereign Compose blueprints.
 * This is the bridge between the composition engine (Layer 3) and
 * the desktop shell UI.
 *
 * The icon mapping is the only piece that can't live in a blueprint
 * (React components aren't serializable), so we resolve iconName → component here.
 *
 * @version 2.0.0
 */

import { lazy, type ComponentType } from "react";
import {
  Search, Sparkles, BookOpen, MessageCircle, Shield, Activity, FolderOpen,
  Network, CalendarDays, LayoutGrid, Wallet, Play, PackageOpen, Clock, ShieldCheck,
  Hammer,
} from "lucide-react";
import type { OsCategory } from "./os-taxonomy";
import { STATIC_BLUEPRINTS } from "@/modules/platform/compose/static-blueprints";
import type { AppBlueprint } from "@/modules/platform/compose/types";

// ── Types ─────────────────────────────────────────────────────────────────

export interface DesktopApp {
  id: string;
  label: string;
  icon: ComponentType<any>;
  component: React.LazyExoticComponent<ComponentType<any>>;
  defaultSize?: { w: number; h: number };
  color: string;
  category: OsCategory;
  hidden?: boolean;
  description: string;
  keywords: string[];
  /** The blueprint this app was derived from. */
  blueprint: AppBlueprint;
}

// ── Icon Registry ─────────────────────────────────────────────────────────

const ICON_MAP: Record<string, ComponentType<any>> = {
  Search,
  Sparkles,
  BookOpen,
  MessageCircle,
  Shield,
  Activity,
  FolderOpen,
  Network,
  CalendarDays,
  LayoutGrid,
  Wallet,
  Play,
  PackageOpen,
  Clock,
  ShieldCheck,
  Hammer,
};

// ── Component Loader ──────────────────────────────────────────────────────

const COMPONENT_MAP: Record<string, React.LazyExoticComponent<ComponentType<any>>> = {
  "@/modules/intelligence/oracle/pages/ResolvePage": lazy(() => import("@/modules/intelligence/oracle/pages/ResolvePage")),
  "@/modules/intelligence/oracle/pages/OraclePage": lazy(() => import("@/modules/intelligence/oracle/pages/OraclePage")),
  "@/modules/intelligence/oracle/pages/LibraryPage": lazy(() => import("@/modules/intelligence/oracle/pages/LibraryPage")),
  "@/modules/intelligence/messenger/pages/MessengerPage": lazy(() => import("@/modules/intelligence/messenger/pages/MessengerPage")),
  "@/modules/identity/addressing/pages/ProjectUorIdentity": lazy(() => import("@/modules/identity/addressing/pages/ProjectUorIdentity")),
  "@/modules/platform/boot/SystemMonitorApp": lazy(() => import("@/modules/platform/boot/SystemMonitorApp")),
  "@/modules/data/sovereign-vault/components/VaultPanel": lazy(() => import("@/modules/data/sovereign-vault/components/VaultPanel")),
  "@/modules/data/knowledge-graph/components/SovereignGraphExplorer": lazy(() => import("@/modules/data/knowledge-graph/components/SovereignGraphExplorer")),
  "@/modules/intelligence/oracle/pages/DailyNotesPage": lazy(() => import("@/modules/intelligence/oracle/pages/DailyNotesPage")),
  "@/modules/platform/desktop/components/AppHub": lazy(() => import("@/modules/platform/desktop/components/AppHub")),
  "@/modules/intelligence/media/components/MediaPlayer": lazy(() => import("@/modules/intelligence/media/components/MediaPlayer")),
  "@/modules/data/takeout/components/SovereignTakeout": lazy(() => import("@/modules/data/takeout/components/SovereignTakeout")),
  "@/modules/data/time-machine/pages/TimeMachinePage": lazy(() => import("@/modules/data/time-machine/pages/TimeMachinePage")),
  "@/modules/research/canonical-compliance/pages/ComplianceDashboardPage": lazy(() => import("@/modules/research/canonical-compliance/pages/ComplianceDashboardPage")),
  "@/modules/platform/app-builder/pages/AppBuilderPage": lazy(() => import("@/modules/platform/app-builder/pages/AppBuilderPage")),
};

// ── Blueprint → DesktopApp Derivation ─────────────────────────────────────

function deriveDesktopApp(bp: AppBlueprint): DesktopApp {
  const icon = ICON_MAP[bp.iconName];
  if (!icon) {
    console.warn(`[desktop-apps] Unknown icon "${bp.iconName}" for blueprint "${bp.name}"`);
  }

  const component = COMPONENT_MAP[bp.ui.component];
  if (!component) {
    console.warn(`[desktop-apps] Unknown component "${bp.ui.component}" for blueprint "${bp.name}"`);
  }

  const LABEL_OVERRIDES: Record<string, string> = {
    "app-hub": "Apps",
  };

  return {
    id: bp.name,
    label: LABEL_OVERRIDES[bp.name] ?? bp.name
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" "),
    icon: icon ?? Search,
    component: component ?? lazy(() => import("@/modules/platform/desktop/components/AppHub")),
    defaultSize: bp.defaultSize,
    color: bp.color,
    category: bp.category,
    hidden: bp.hidden,
    description: bp.description,
    keywords: bp.keywords,
    blueprint: bp,
  };
}

// ── Exported Registry ─────────────────────────────────────────────────────

/**
 * DESKTOP_APPS — derived from static blueprints.
 *
 * Previously a hand-written array. Now each entry is computed from
 * an AppBlueprint, linking the desktop shell to the composition engine.
 */
export const DESKTOP_APPS: DesktopApp[] = STATIC_BLUEPRINTS.map(deriveDesktopApp);

/** Lookup a desktop app by ID. */
export function getApp(id: string): DesktopApp | undefined {
  return DESKTOP_APPS.find((a) => a.id === id);
}
