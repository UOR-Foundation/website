/**
 * UNS Console — Sidebar + Layout Shell
 */

import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Globe, Shield, Cpu, Database,
  Lock, Bot, ChevronLeft,
} from "lucide-react";
import { CanonicalIdBadge } from "./ConsoleUI";
import { useState } from "react";

const NAV = [
  { to: "/console",          icon: LayoutDashboard, label: "Overview" },
  { to: "/console/dns",      icon: Globe,           label: "DNS Records" },
  { to: "/console/shield",   icon: Shield,          label: "Shield" },
  { to: "/console/compute",  icon: Cpu,             label: "Compute" },
  { to: "/console/store",    icon: Database,         label: "Store" },
  { to: "/console/trust",    icon: Lock,            label: "Trust" },
  { to: "/console/agents",   icon: Bot,             label: "Agents" },
];

const MOCK_NODE_ID = "urn:uor:derivation:sha256:a1b2c3d4e5f60718293a4b5c6d7e8f9001122334";
const MOCK_IPV6 = "fd00:0075:6f72:a1b2:c3d4::1";

export default function ConsoleLayout() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className={`flex flex-col border-r border-border bg-card transition-all duration-200 ${collapsed ? "w-14" : "w-56"}`}>
        {/* Logo */}
        <div className="flex h-12 items-center justify-between border-b border-border px-3">
          {!collapsed && <span className="text-sm font-semibold tracking-tight">UNS Console</span>}
          <button onClick={() => setCollapsed(!collapsed)} className="p-1 rounded hover:bg-muted transition-colors">
            <ChevronLeft className={`h-4 w-4 text-muted-foreground transition-transform ${collapsed ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
          {NAV.map((item) => {
            const active = item.to === "/console"
              ? location.pathname === "/console"
              : location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors ${
                  active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Node ID */}
        {!collapsed && (
          <div className="border-t border-border p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Node</p>
            <CanonicalIdBadge id={MOCK_NODE_ID} chars={20} />
          </div>
        )}
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* TopBar */}
        <header className="flex h-12 items-center justify-between border-b border-border px-4">
          <h1 className="text-sm font-semibold">UNS Console</h1>
          <div className="flex items-center gap-3">
            <code className="text-xs text-muted-foreground font-mono">{MOCK_IPV6}</code>
            <span className="inline-flex items-center gap-1.5 text-xs">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              Connected
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
