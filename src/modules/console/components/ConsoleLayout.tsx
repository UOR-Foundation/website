/**
 * UOR Console — Developer-First Layout
 *
 * Entry point for deploying, managing, and monetizing web-coded apps.
 * Sidebar groups: Deploy first, Infrastructure second.
 */

import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Globe, Shield, Cpu, Database,
  Lock, Bot, ChevronLeft, Rocket, Compass,
  Search, Plus, Circle, BarChart3, BookOpen, User,
  Sun, Moon, Eye, Fingerprint, Atom,
} from "lucide-react";
import { useState } from "react";
import { ThemeProvider, useTheme } from "next-themes";
import { CanonicalIdBadge } from "./ConsoleUI";

/* ── Navigation Items — Build · Ship · Run (Docker-aligned) ───────────── */

const NAV_BUILD = [
  { to: "/console",            icon: Rocket,    label: "Images",    end: true,  hint: "Import & content-address code" },
  { to: "/console/compute",    icon: Cpu,       label: "Compose",   end: false, hint: "Multi-service composition" },
  { to: "/console/store",      icon: Database,  label: "Volumes",   end: false, hint: "Persistent storage & cache" },
];

const NAV_SHIP = [
  { to: "/console/discovery",  icon: Compass,   label: "Registry",  hint: "Publish & discover apps" },
  { to: "/console/trust",      icon: Lock,      label: "Tags",      hint: "Certificates & versioning" },
  { to: "/console/dns",        icon: Globe,     label: "Network",   hint: "DNS & routing" },
];

const NAV_RUN = [
  { to: "/console/overview",   icon: BarChart3, label: "Containers", hint: "Live instances & metrics" },
  { to: "/console/shield",     icon: Shield,    label: "Logs",       hint: "Security & monitoring" },
  { to: "/console/agents",     icon: Bot,       label: "Exec",       hint: "AI agents & orchestration" },
  { to: "/console/observer",   icon: Eye,       label: "Observer",   hint: "Live coherence monitoring" },
  { to: "/console/fpp",        icon: Fingerprint, label: "FPP Trust", hint: "First Person trust flow" },
  { to: "/console/pq-bridge",  icon: Atom,        label: "PQ Bridge", hint: "Post-quantum blockchain shield" },
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

function ConsoleLayoutInner() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { theme, setTheme } = useTheme();

  const filteredApps = DEPLOYED_APPS.filter((app) =>
    app.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* ── Left Sidebar ──────────────────────────────────────────────── */}
      <aside
        className={`flex flex-col border-r border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-300 ${
          collapsed ? "w-16" : "w-80"
        }`}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-border/50 px-5">
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <span className="text-primary text-base font-bold">H</span>
              </div>
              <span className="text-base font-semibold tracking-tight">Hologram Console</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <ChevronLeft
              className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${
                collapsed ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>

        {/* Search (expanded only) */}
        {!collapsed && (
          <div className="px-4 pt-5 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search apps & services…"
                className="w-full rounded-lg border border-border/50 bg-muted/30 py-2.5 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-colors"
              />
            </div>
          </div>
        )}

        {/* ── Build · Ship · Run Navigation (Docker-aligned) ──────── */}
        <nav className="px-3 pt-2 space-y-1">
          {[
            { title: "Build", items: NAV_BUILD },
            { title: "Ship", items: NAV_SHIP },
            { title: "Run", items: NAV_RUN },
          ].map((group) => (
            <div key={group.title} className="pb-2">
              {!collapsed && (
                <p className="px-3 pt-3 pb-1.5 text-xs uppercase tracking-widest text-muted-foreground/60 font-semibold">
                  {group.title}
                </p>
              )}
              {collapsed && (
                <div className="flex justify-center py-1">
                  <span className="text-[9px] uppercase tracking-widest text-muted-foreground/40 font-bold">
                    {group.title.charAt(0)}
                  </span>
                </div>
              )}
              {group.items.map((item: any) => {
                const end = "end" in item ? (item.end as boolean) : false;
                const active = end
                  ? location.pathname === item.to
                  : location.pathname.startsWith(item.to);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={end || undefined}
                    title={collapsed ? `${item.label} — ${item.hint}` : item.hint}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-base transition-all duration-200 ${
                      active
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                    } ${collapsed ? "justify-center" : ""}`}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {!collapsed && (
                      <div className="flex-1 min-w-0">
                        <span className="block">{item.label}</span>
                        <span className="block text-sm text-muted-foreground leading-snug">
                          {item.hint}
                        </span>
                      </div>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* ── Deployed Apps List ──────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-3 pt-3">
          {!collapsed && (
            <div className="flex items-center justify-between px-3 pb-2">
              <p className="text-xs uppercase tracking-widest text-muted-foreground/60 font-semibold">
                Your Apps
              </p>
              <NavLink
                to="/console"
                className="p-1.5 rounded-md hover:bg-muted/50 transition-colors"
                title="Deploy new app"
              >
                <Plus className="h-4 w-4 text-muted-foreground" />
              </NavLink>
            </div>
          )}

          <div className="space-y-1">
            {filteredApps.map((app) => (
              <NavLink
                key={app.name}
                to={`/console/app-detail/${encodeURIComponent(
                  `urn:uor:derivation:sha256:${app.address.replace(/[:.]/g, "")}`
                )}`}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 text-base transition-all duration-200 hover:bg-muted/30 group ${
                  collapsed ? "justify-center" : ""
                }`}
              >
                <div className="h-9 w-9 rounded-full bg-muted/50 flex items-center justify-center text-lg shrink-0 group-hover:bg-muted/80 transition-colors">
                  {app.icon}
                </div>
                {!collapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-medium text-foreground truncate">
                        {app.name}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {app.network}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground/70 font-mono truncate">
                      {app.address.slice(0, 18)}…
                    </p>
                  </div>
                )}
              </NavLink>
            ))}
          </div>

          {/* Docs & Space links */}
          {!collapsed && (
            <div className="pt-5 space-y-1">
              <NavLink
                to="/developers"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-base text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all duration-200"
              >
                <BookOpen className="h-5 w-5 shrink-0" />
                <span>Documentation</span>
              </NavLink>
              <NavLink
                to="/console/your-space"
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-base transition-all duration-200 ${
                  location.pathname === "/console/your-space"
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
              >
                <User className="h-5 w-5 shrink-0" />
                <span>Your Space</span>
              </NavLink>
            </div>
          )}
        </div>

        {/* Footer — Status */}
        {!collapsed && (
          <div className="border-t border-border/50 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground/70">
              <Circle className="h-2.5 w-2.5 fill-primary text-primary" />
              <span>Connected</span>
            </div>
            <CanonicalIdBadge id={MOCK_NODE_ID} chars={20} />
          </div>
        )}
      </aside>

      {/* ── Main Content ──────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 items-center justify-between border-b border-border/50 px-6">
          <div />
          <div className="flex items-center gap-4">
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/60 bg-muted/40 hover:bg-muted/70 transition-colors"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              <Sun className={`h-4 w-4 transition-colors ${theme === "dark" ? "text-muted-foreground/40" : "text-amber-500"}`} />
              <div className={`relative h-5 w-9 rounded-full transition-colors ${theme === "dark" ? "bg-primary/30" : "bg-muted-foreground/20"}`}>
                <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-foreground shadow-sm transition-transform duration-200 ${theme === "dark" ? "translate-x-4" : "translate-x-0.5"}`} />
              </div>
              <Moon className={`h-4 w-4 transition-colors ${theme === "dark" ? "text-primary" : "text-muted-foreground/40"}`} />
            </button>
            <code className="text-xs text-muted-foreground/70 font-mono">
              fd00:0075:6f72:a1b2:c3d4::1
            </code>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              Live
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function ConsoleLayout() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <ConsoleLayoutInner />
    </ThemeProvider>
  );
}
