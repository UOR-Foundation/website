/**
 * TagMenu — A popover/context menu for assigning colored tags to a file.
 */

import { Check, Tag, X } from "lucide-react";
import { DEFAULT_TAGS, tagStore } from "../lib/tags";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/modules/core/ui/dropdown-menu";

interface Props {
  itemId: string;
  currentTags: string[];
  children: React.ReactNode;
}

export default function TagMenu({ itemId, currentTags, children }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[160px]">
        <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/50">
          Tags
        </div>
        {DEFAULT_TAGS.map((tag) => {
          const active = currentTags.includes(tag.id);
          return (
            <DropdownMenuItem
              key={tag.id}
              onClick={(e) => { e.stopPropagation(); tagStore.toggleTag(itemId, tag.id); }}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <div
                className="w-3.5 h-3.5 rounded-full flex-shrink-0 border border-black/10"
                style={{ backgroundColor: tag.color }}
              />
              <span className="flex-1 text-sm">{tag.label}</span>
              {active && <Check className="w-3.5 h-3.5 text-primary" />}
            </DropdownMenuItem>
          );
        })}
        {currentTags.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); tagStore.clearTagsForItem(itemId); }}
              className="flex items-center gap-2.5 cursor-pointer text-muted-foreground"
            >
              <X className="w-3.5 h-3.5" />
              <span className="text-sm">Clear All Tags</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
