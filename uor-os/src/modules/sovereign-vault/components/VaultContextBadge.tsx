/**
 * VaultContextBadge — Shows document count on the Oracle search bar
 */

import { Shield } from "lucide-react";

interface Props {
  count: number;
}

export default function VaultContextBadge({ count }: Props) {
  if (count === 0) return null;

  return (
    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
      <Shield className="w-3 h-3" />
      {count} doc{count !== 1 ? "s" : ""}
    </div>
  );
}
