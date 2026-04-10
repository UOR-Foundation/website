/**
 * SpaceSwitcher — Dropdown in the tab bar to switch active space context.
 * Compact, elegant, fits the TabBar aesthetic.
 */

import { useState, useEffect } from "react";
import { Layers, Plus, Lock, Globe, Users } from "lucide-react";
import { spaceManager } from "../space-manager";
import type { SovereignSpace, SpaceType } from "../types";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from "@/modules/core/ui/dropdown-menu";

interface SpaceSwitcherProps {
  isLight: boolean;
}

const SPACE_ICONS: Record<SpaceType, typeof Lock> = {
  personal: Lock,
  shared: Users,
  public: Globe,
};

export default function SpaceSwitcher({ isLight }: SpaceSwitcherProps) {
  const [spaces, setSpaces] = useState<SovereignSpace[]>([]);
  const [active, setActive] = useState<SovereignSpace | null>(null);

  useEffect(() => {
    const unsub = spaceManager.subscribe(() => {
      setSpaces(spaceManager.getSpaces());
      setActive(spaceManager.getActiveSpace());
    });
    // Initial load
    spaceManager.load().catch(console.error);
    return unsub;
  }, []);

  const activeIcon = active ? SPACE_ICONS[active.spaceType] : Layers;
  const ActiveIcon = activeIcon;

  const handleSwitch = (id: string) => {
    spaceManager.setActiveSpace(id);
  };

  const handleCreate = async () => {
    try {
      const name = prompt("Space name:");
      if (!name) return;
      const space = await spaceManager.create(name, "shared");
      spaceManager.setActiveSpace(space.id);
    } catch (err) {
      console.error("Failed to create space:", err);
    }
  };

  const opacity = isLight ? "opacity-60" : "opacity-45";
  const hoverBg = isLight ? "hover:bg-black/[0.06]" : "hover:bg-white/[0.06]";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium tracking-wide uppercase select-none transition-colors ${hoverBg} ${opacity} text-foreground`}
          title={active?.name ?? "Spaces"}
        >
          <ActiveIcon className="w-3 h-3" />
          <span className="max-w-[80px] truncate">
            {active?.name ?? "Space"}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="min-w-[180px] bg-popover/95 backdrop-blur-xl border-border/50"
      >
        {spaces.map((space) => {
          const Icon = SPACE_ICONS[space.spaceType];
          const isActive = space.id === active?.id;
          return (
            <DropdownMenuItem
              key={space.id}
              onClick={() => handleSwitch(space.id)}
              className={`text-xs gap-2 ${isActive ? "bg-accent/50" : ""}`}
            >
              <Icon className="w-3.5 h-3.5 opacity-60" />
              <span className="flex-1 truncate">{space.name}</span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleCreate} className="text-xs gap-2">
          <Plus className="w-3.5 h-3.5 opacity-60" />
          New Space
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
