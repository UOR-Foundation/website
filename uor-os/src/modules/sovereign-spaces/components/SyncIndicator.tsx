/**
 * SyncIndicator — Real-time sync status pill for the tab bar.
 *
 * Shows: ● Synced (N devices) | ○ N pending | ◌ Offline
 */

import { useState, useEffect } from "react";
import { syncBridge, type SyncState } from "@/modules/knowledge-graph/sync-bridge";
import { peerDiscovery } from "../sync/peer-discovery";
import { spaceManager } from "../space-manager";

interface SyncIndicatorProps {
  isLight: boolean;
}

const STATE_CONFIG: Record<SyncState, { dot: string; color: string; label: string }> = {
  idle: { dot: "●", color: "text-muted-foreground", label: "Ready" },
  syncing: { dot: "◐", color: "text-blue-400", label: "Syncing" },
  synced: { dot: "●", color: "text-emerald-500", label: "Synced" },
  error: { dot: "●", color: "text-destructive", label: "Error" },
  offline: { dot: "◌", color: "text-muted-foreground", label: "Local" },
};

export default function SyncIndicator({ isLight }: SyncIndicatorProps) {
  const [syncState, setSyncState] = useState<SyncState>(syncBridge.getSyncState());
  const [deviceCount, setDeviceCount] = useState(1);

  useEffect(() => {
    const unsub = syncBridge.subscribeSyncState(setSyncState);

    // Poll device count for active space
    const interval = setInterval(async () => {
      const space = spaceManager.getActiveSpace();
      if (space && space.id !== "local-personal") {
        try {
          const devices = await peerDiscovery.getSpaceDevices(space.id);
          setDeviceCount(Math.max(1, devices.length));
        } catch {
          setDeviceCount(1);
        }
      }
    }, 15000);

    return () => { unsub(); clearInterval(interval); };
  }, []);

  const config = STATE_CONFIG[syncState];
  const opacity = isLight ? "opacity-50" : "opacity-40";

  return (
    <div
      className={`flex items-center gap-1 text-[9px] tracking-wide select-none ${opacity}`}
      title={`${config.label}${deviceCount > 1 ? ` (${deviceCount} devices)` : ""}`}
    >
      <span className={`${config.color} text-[8px] leading-none`}>
        {config.dot}
      </span>
      <span className="text-foreground">
        {syncState === "synced" && deviceCount > 1
          ? `${deviceCount}`
          : config.label
        }
      </span>
    </div>
  );
}
