/**
 * UNS Console — Trust Wallet-Inspired Layout
 *
 * Clean dark sidebar on the left with app list, spacious main content area.
 * Designed for deployment management and running application viewing.
 */

import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Globe, Shield, Cpu, Database,
  Lock, Bot, ChevronLeft, AppWindow, Compass,
  Search, Plus, Circle,
} from "lucide-react";
import { useState } from "react";
import { CanonicalIdBadge } from "./ConsoleUI";

/* ── Navigation Items ────────────────────────────────────────────────────── */

const NAV_INFRA = [
  { to: "/console",          icon: LayoutDashboard, label: "Overview" },
  { to: "/console/dns",      icon: Globe,           label: "DNS" },
  { to: "/console/shield",   icon: Shield,          label: "Shield" },
  { to: "/console/compute",  icon: Cpu,             label: "Compute" },
  { to: "/console/store",    icon: Database,         label: "Store" },
  { to: "/console/trust",    icon: Lock,            label: "Trust" },
  { to: "/console/agents",   icon: Bot,             label: "Agents" },
];

const NAV_APPS = [
  { to: "/console/apps",      icon: AppWindow,  label: "Apps" },
  { to: "/console/discovery", icon: Compass,    label: "Discovery" },
];

/* ── Mock deployed apps (would come from SDK in production) ──────────── */

interface DeployedApp {
  name: string;
  network: string;
  address: string;
  icon: string;
}

const DEPLOYED_APPS: DeployedApp[] = [
  { name: "my-saas-app", network: "Mainnet", address: "fd00:75:6f72:a1b2::1", icon: "🟢" },
  { name: "ai-chatbot", network: "Testnet", address: "fd00:75:6f72:dead::1", icon: "🤖" },
  { name: "data-viz", network: "Mainnet", address: "fd00:75:6f72:0011::1", icon: "📊" },
];

const MOCK_NODE_ID = "urn:uor:derivation:sha256:a1b2c3d4e5f60718293a4b5c6d7e8f9001122334";

/* ── Layout Component ────────────────────────────────────────────────── */

export default function ConsoleLayout() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredApps = DEPLOYED_APPS.filter((app) =>
    app.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* ── Left Sidebar ──────────────────────────────────────────────── */}
      <aside
        className={`flex flex-col border-r border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 ${
          collapsed ? "w-16" : "w-72"
        }`}
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b border-border/50 px-4">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary/20 flex items-center justify-center">
                <span className="text-primary text-sm font-bold">U</span>
              </div>
              <span className="text-sm font-semibold tracking-tight">UOR Console</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <ChevronLeft
              className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${
                collapsed ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>

        {/* Search (expanded only) */}
        {!collapsed && (
          <div className="px-3 pt-4 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search apps & services…"
                className="w-full rounded-lg border border-border/50 bg-muted/30 py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors"
              />
            </div>
          </div>
        )}

        {/* Infrastructure Nav */}
        <nav className="px-2 pt-2 space-y-0.5">
          {!collapsed && (
            <p className="px-3 pb-1 text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">
              Infrastructure
            </p>
          )}
          {NAV_INFRA.map((item) => {
            const active =
              item.to === "/console"
                ? location.pathname === "/console"
                : location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200 ${
                  active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                } ${collapsed ? "justify-center" : ""}`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Deployed Apps List */}
        <div className="flex-1 overflow-y-auto px-2 pt-4">
          {!collapsed && (
            <div className="flex items-center justify-between px-3 pb-2">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">
                Deployed Apps
              </p>
              <NavLink
                to="/console/apps"
                className="p-1 rounded-md hover:bg-muted/50 transition-colors"
                title="Deploy new app"
              >
                <Plus className="h-3.5 w-3.5 text-muted-foreground" />
              </NavLink>
            </div>
          )}

          <div className="space-y-0.5">
            {filteredApps.map((app) => (
              <NavLink
                key={app.name}
                to={`/console/apps`}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 hover:bg-muted/30 group ${
                  collapsed ? "justify-center" : ""
                }`}
              >
                <div className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center text-base shrink-0 group-hover:bg-muted/80 transition-colors">
                  {app.icon}
                </div>
                {!collapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">
                        {app.name}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-muted/60 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                        {app.network}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground/70 font-mono truncate">
                      {app.address.slice(0, 18)}…
                    </p>
                  </div>
                )}
              </NavLink>
            ))}
          </div>

          {/* App Nav */}
          <div className="pt-4 space-y-0.5">
            {!collapsed && (
              <p className="px-3 pb-1 text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium">
                Platform
              </p>
            )}
            {NAV_APPS.map((item) => {
              const active = location.pathname.startsWith(item.to);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200 ${
                    active
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  } ${collapsed ? "justify-center" : ""}`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* Footer — Help */}
        {!collapsed && (
          <div className="border-t border-border/50 p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground/70">
              <Circle className="h-2 w-2 fill-primary text-primary" />
              <span>Connected</span>
            </div>
            <CanonicalIdBadge id={MOCK_NODE_ID} chars={20} />
          </div>
        )}
      </aside>

      {/* ── Main Content ──────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar (minimal) */}
        <header className="flex h-14 items-center justify-between border-b border-border/50 px-6">
          <div /> {/* Spacer */}
          <div className="flex items-center gap-4">
            <code className="text-xs text-muted-foreground/70 font-mono">
              fd00:0075:6f72:a1b2:c3d4::1
            </code>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              Live
            </div>
          </div>
        </header>

        {/* Page content — generous padding */}
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
