/**
 * Bitcoin Tools Navigation Bar
 * Shared across all Bitcoin/Zcash pages for cross-navigation.
 */

import { Link, useLocation } from "react-router-dom";
import { FileText, Clock, Zap, Shield, Bot, Search } from "lucide-react";

const LINKS = [
  { path: "/bitcoin", label: "Script Inspector", icon: FileText },
  { path: "/bitcoin/timestamp", label: "Timestamping", icon: Clock },
  { path: "/bitcoin/demo", label: "E2E Demo", icon: Zap },
  { path: "/bitcoin/zcash", label: "Zcash Duality", icon: Shield },
  { path: "/bitcoin/agents", label: "Agent Stack", icon: Bot },
  { path: "/bitcoin/coherence", label: "Coherence Gate", icon: Search },
] as const;

export default function BitcoinNav() {
  const { pathname } = useLocation();

  return (
    <nav className="flex items-center justify-center gap-1 flex-wrap mb-8">
      {LINKS.map(({ path, label, icon: Icon }) => {
        const active = pathname === path;
        return (
          <Link
            key={path}
            to={path}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors ${
              active
                ? "bg-primary/10 text-primary font-bold border border-primary/30"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60 border border-transparent"
            }`}
          >
            <Icon size={12} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
