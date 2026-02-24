/**
 * DeployResultCard — Post-deploy summary with canonical ID, runtime info,
 * snapshot chain, self-hosted serve URL, and actionable next steps.
 */

import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { DeployResult } from "@/modules/uor-sdk/deploy";
import {
  Check, Copy, ExternalLink, Globe, QrCode,
  ShieldCheck, Cpu, Clock, Layers, Link2, Box,
} from "lucide-react";
import { CanonicalIdBadge } from "./ConsoleUI";

interface DeployResultCardProps {
  result: DeployResult;
  onDismiss?: () => void;
}

export default function DeployResultCard({ result, onDismiss }: DeployResultCardProps) {
  const navigate = useNavigate();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = useCallback((value: string, field: string) => {
    navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  }, []);

  const appName = result.import.manifest["app:name"];
  const version = result.import.manifest["app:version"];
  const canonicalId = result.build.image.canonicalId;
  const serveUrl = result.ingest?.serveUrl ?? "";
  const originalSourceUrl = result.import.manifest["app:sourceUrl"] as string ?? "";
  const sourceUrl = originalSourceUrl.startsWith("http") ? originalSourceUrl : serveUrl;
  const snapshotId = result.ship?.snapshot?.["u:canonicalId"] ?? canonicalId;
  const ipv6 = result.instance?.ipv6 ?? "fd00:75:6f72::1";
  const wasmStatus = result.instance?.status ?? "running";

  const CopyBtn = ({ value, field }: { value: string; field: string }) => (
    <button
      onClick={() => copyToClipboard(value, field)}
      className="p-1 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
      aria-label={`Copy ${field}`}
    >
      {copiedField === field ? (
        <Check className="h-3.5 w-3.5 text-primary" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );

  return (
    <div className="rounded-2xl border border-primary/30 bg-card/50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/30 bg-primary/5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <Check className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Deploy Successful
            </h3>
            <p className="text-sm text-muted-foreground">
              {appName}:{version} — {result.durationMs}ms
            </p>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted/40 transition-colors"
          >
            Dismiss
          </button>
        )}
      </div>

      {/* Body — Key artifacts */}
      <div className="p-6 space-y-5">
        {/* Artifact rows */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Canonical ID */}
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" /> Canonical ID
            </span>
            <div className="flex items-center gap-2">
              <code className="text-sm text-foreground font-mono truncate max-w-[220px]">
                {canonicalId.slice(0, 32)}…
              </code>
              <CopyBtn value={canonicalId} field="canonicalId" />
            </div>
          </div>

          {/* Snapshot */}
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5" /> Snapshot
            </span>
            <div className="flex items-center gap-2">
              <code className="text-sm text-foreground font-mono truncate max-w-[220px]">
                {snapshotId.slice(0, 32)}…
              </code>
              <CopyBtn value={snapshotId} field="snapshot" />
            </div>
          </div>

          {/* Runtime */}
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5" /> WASM Runtime
            </span>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                {wasmStatus === "running" ? "Running" : wasmStatus}
              </span>
            </div>
          </div>

          {/* IPv6 endpoint */}
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" /> Endpoint
            </span>
            <div className="flex items-center gap-2">
              <code className="text-sm text-foreground font-mono">{ipv6}</code>
              <CopyBtn value={ipv6} field="ipv6" />
            </div>
          </div>
        </div>

        {/* Verification badge */}
        <div className="flex items-center gap-2 rounded-xl bg-muted/20 border border-border/30 px-4 py-3">
          <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm text-muted-foreground">
            {result.ingest?.deduplicated
              ? "Content-addressed and deduplicated — serving from self-hosted infrastructure"
              : "Content-addressed, signed, and ingested — serving from self-hosted infrastructure"}
          </span>
          <CopyBtn value={snapshotId} field="verification" />
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={() => {
              // Store source URL so the runner can load the real app
              if (sourceUrl) {
                sessionStorage.setItem(`uor:sourceUrl:${canonicalId}`, sourceUrl);
              }
              navigate(`/console/run/${encodeURIComponent(canonicalId)}`);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-primary hover:bg-primary/90 px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors shadow-md shadow-primary/20"
          >
            <ExternalLink className="h-4 w-4" />
            Open App
          </button>
          <button className="inline-flex items-center gap-2 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 px-5 py-2.5 text-sm font-medium text-foreground transition-colors">
            <QrCode className="h-4 w-4" />
            QR Cartridge
          </button>
          <button
            onClick={() => navigate(`/console/app-detail/${encodeURIComponent(canonicalId)}`)}
            className="inline-flex items-center gap-2 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 px-5 py-2.5 text-sm font-medium text-foreground transition-colors"
          >
            <Box className="h-4 w-4" />
            View in Console
          </button>
        </div>
      </div>
    </div>
  );
}
