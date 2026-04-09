import { lazy, type ComponentType } from "react";
import {
  Search, Sparkles, BookOpen, MessageCircle, Shield, Activity, FolderOpen,
} from "lucide-react";
import type { OsCategory } from "./os-taxonomy";

export interface DesktopApp {
  id: string;
  label: string;
  icon: ComponentType<any>;
  component: React.LazyExoticComponent<ComponentType<any>>;
  defaultSize?: { w: number; h: number };
  color: string; // accent color for dock glow
  /** OS taxonomy category grounded in UOR v0.2.0 modules. */
  category: OsCategory;
  /** If true, app is available via openApp but hidden from Spotlight/dock. */
  hidden?: boolean;
}

export const DESKTOP_APPS: DesktopApp[] = [
  {
    id: "search",
    label: "Search",
    icon: Search,
    component: lazy(() => import("@/modules/oracle/pages/ResolvePage")),
    defaultSize: { w: 960, h: 620 },
    color: "hsl(210 80% 60%)",
    category: "RESOLVE",
    hidden: true,
  },
  {
    id: "oracle",
    label: "Oracle",
    icon: Sparkles,
    component: lazy(() => import("@/modules/oracle/pages/OraclePage")),
    defaultSize: { w: 780, h: 580 },
    color: "hsl(270 70% 65%)",
    category: "RESOLVE",
  },
  {
    id: "library",
    label: "Library",
    icon: BookOpen,
    component: lazy(() => import("@/modules/oracle/pages/LibraryPage")),
    defaultSize: { w: 900, h: 600 },
    color: "hsl(35 90% 55%)",
    category: "RESOLVE",
  },
  {
    id: "messenger",
    label: "Messenger",
    icon: MessageCircle,
    component: lazy(() => import("@/modules/messenger/pages/MessengerPage")),
    defaultSize: { w: 700, h: 560 },
    color: "hsl(160 60% 50%)",
    category: "EXCHANGE",
  },
  {
    id: "vault",
    label: "Vault",
    icon: Shield,
    component: lazy(() => import("@/modules/identity/pages/ProjectUorIdentity")),
    defaultSize: { w: 720, h: 520 },
    color: "hsl(200 70% 55%)",
    category: "IDENTITY",
  },
  {
    id: "system-monitor",
    label: "System Monitor",
    icon: Activity,
    component: lazy(() => import("@/modules/boot/SystemMonitorApp")),
    defaultSize: { w: 1020, h: 680 },
    color: "hsl(142 60% 50%)",
    category: "OBSERVE",
  },
  {
    id: "files",
    label: "Files",
    icon: FolderOpen,
    component: lazy(() => import("@/modules/sovereign-vault/components/VaultPanel")),
    defaultSize: { w: 800, h: 560 },
    color: "hsl(45 80% 55%)",
    category: "STRUCTURE",
  },
];

export function getApp(id: string): DesktopApp | undefined {
  return DESKTOP_APPS.find(a => a.id === id);
}
