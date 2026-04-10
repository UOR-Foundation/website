/**
 * SpaceSettings — Manage members, permissions, and space metadata.
 */

import { useState, useEffect } from "react";
import { Users, Shield, Trash2, UserPlus } from "lucide-react";
import { spaceManager } from "../space-manager";
import type { SovereignSpace, SpaceMember, SpaceRole } from "../types";

interface SpaceSettingsProps {
  spaceId: string;
  onClose: () => void;
}

const ROLE_LABELS: Record<SpaceRole, string> = {
  owner: "Owner",
  writer: "Writer",
  reader: "Reader",
};

const ROLE_COLORS: Record<SpaceRole, string> = {
  owner: "text-amber-500",
  writer: "text-blue-400",
  reader: "text-muted-foreground",
};

export default function SpaceSettings({ spaceId, onClose }: SpaceSettingsProps) {
  const [space, setSpace] = useState<SovereignSpace | null>(null);
  const [members, setMembers] = useState<SpaceMember[]>([]);
  const [myRole, setMyRole] = useState<SpaceRole | null>(null);

  useEffect(() => {
    const s = spaceManager.getSpaces().find(s => s.id === spaceId);
    setSpace(s ?? null);
    spaceManager.getMembers(spaceId).then(setMembers).catch(console.error);
    spaceManager.getMyRole(spaceId).then(setMyRole).catch(console.error);
  }, [spaceId]);

  if (!space) return null;

  const isOwner = myRole === "owner";

  return (
    <div className="p-4 space-y-4 max-w-md">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">{space.name}</h3>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {space.spaceType}
        </span>
      </div>

      {/* Space Info */}
      <div className="text-[11px] text-muted-foreground space-y-1">
        <div>Graph IRI: <code className="text-[10px] opacity-70">{space.graphIri}</code></div>
        <div>CID: <code className="text-[10px] opacity-70">{space.cid.slice(0, 16)}…</code></div>
      </div>

      {/* Members */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Users className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">
            Members ({members.length})
          </span>
        </div>
        <div className="space-y-1">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between px-2 py-1.5 rounded-md bg-muted/30">
              <span className="text-xs text-foreground truncate max-w-[120px]">
                {m.userId.slice(0, 8)}…
              </span>
              <span className={`text-[10px] font-medium ${ROLE_COLORS[m.role]}`}>
                {ROLE_LABELS[m.role]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      {isOwner && (
        <div className="flex gap-2 pt-2 border-t border-border/30">
          <button
            className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 transition-colors"
            onClick={() => {
              const uid = prompt("User ID to invite:");
              if (uid) spaceManager.invite(spaceId, uid, "reader").catch(console.error);
            }}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Invite
          </button>
        </div>
      )}

      {/* Leave */}
      {space.spaceType !== "personal" && (
        <button
          className="flex items-center gap-1 text-[11px] text-destructive hover:text-destructive/80 transition-colors"
          onClick={async () => {
            await spaceManager.leave(spaceId);
            onClose();
          }}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Leave Space
        </button>
      )}
    </div>
  );
}
