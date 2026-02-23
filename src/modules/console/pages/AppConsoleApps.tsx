/**
 * App Console — Apps Page (P13)
 *
 * App cards with canonical IDs, zone badges, deploy modal.
 */

import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  CanonicalIdBadge,
  ZoneBadge,
  StatCard,
} from "../components/ConsoleUI";

interface AppCard {
  name: string;
  canonicalId: string;
  zone: "COHERENCE" | "DRIFT" | "COLLAPSE";
  userCount: number;
  revenue: number;
}

const MOCK_APPS: AppCard[] = [
  { name: "my-saas-app", canonicalId: "urn:uor:derivation:sha256:a1b2c3d4e5f6071829abcdef01234567890abcdef01234567890abcdef012345", zone: "COHERENCE", userCount: 89, revenue: 1842.40 },
  { name: "ai-chatbot", canonicalId: "urn:uor:derivation:sha256:deadbeef00112233445566778899aabbccddeeff00112233445566778899aabb", zone: "DRIFT", userCount: 34, revenue: 567.20 },
  { name: "data-viz-tool", canonicalId: "urn:uor:derivation:sha256:0011223344556677889900aabbccddeeff00112233445566778899aabbccddeeff", zone: "COHERENCE", userCount: 4, revenue: 438.00 },
];

export default function AppConsoleApps() {
  const [showImport, setShowImport] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [deploying, setDeploying] = useState(false);

  const handleDeploy = () => {
    if (!importUrl.trim()) return;
    setDeploying(true);
    setTimeout(() => {
      setDeploying(false);
      setShowImport(false);
      setImportUrl("");
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Your Apps</h2>
        <button
          onClick={() => setShowImport(!showImport)}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Deploy New App
        </button>
      </div>

      {/* Import modal */}
      {showImport && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-sm font-medium">Import & Deploy</p>
          <p className="text-xs text-muted-foreground">Paste a URL (GitHub, ZIP, or hosted app)</p>
          <input
            type="url"
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
            placeholder="https://github.com/user/repo"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <div className="flex gap-2">
            <button
              onClick={handleDeploy}
              disabled={deploying || !importUrl.trim()}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {deploying ? "Deploying…" : "Deploy"}
            </button>
            <button
              onClick={() => setShowImport(false)}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
          {deploying && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              Computing canonical identity…
            </div>
          )}
        </div>
      )}

      {/* App cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {MOCK_APPS.map((app) => (
          <NavLink
            key={app.canonicalId}
            to={`/console/app-detail/${encodeURIComponent(app.canonicalId)}`}
            className="block rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-sm transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-foreground">{app.name}</span>
              <ZoneBadge zone={app.zone} />
            </div>
            <div className="mb-3">
              <CanonicalIdBadge id={app.canonicalId} chars={24} />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-muted-foreground">Users</p>
                <p className="font-semibold text-foreground">{app.userCount}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Revenue</p>
                <p className="font-semibold text-foreground">${app.revenue.toFixed(2)}</p>
              </div>
            </div>
          </NavLink>
        ))}
      </div>
    </div>
  );
}
