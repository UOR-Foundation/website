/**
 * DesktopContextMenu — Right-click context menu using Radix ContextMenu.
 * Theme-aware with submenus, keyboard nav, and accessibility.
 */

import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuCheckboxItem,
} from "@/modules/core/ui/context-menu";
import { useDesktopTheme } from "@/modules/desktop/hooks/useDesktopTheme";
import { usePlatform } from "@/modules/desktop/hooks/usePlatform";

interface Props {
  children: React.ReactNode;
  onNewSearch: () => void;
  onSpotlight: () => void;
  onHideAll?: () => void;
  onToggleWidgets?: () => void;
  widgetsVisible?: boolean;
}

export default function DesktopContextMenu({
  children,
  onNewSearch,
  onSpotlight,
  onHideAll,
  onToggleWidgets,
  widgetsVisible = true,
}: Props) {
  const { isLight, theme, setTheme } = useDesktopTheme();
  const { modKey } = usePlatform();

  const contentClass = isLight
    ? "border-black/[0.08] bg-white/90 text-black/70 backdrop-blur-xl"
    : "border-white/[0.08] bg-[rgba(30,30,30,0.88)] text-white/75 backdrop-blur-xl";

  const itemClass = isLight
    ? "text-black/65 text-[12px] font-medium focus:bg-black/[0.05] focus:text-black/80"
    : "text-white/70 text-[12px] font-medium focus:bg-white/[0.08] focus:text-white/90";

  const shortcutClass = isLight ? "text-black/25" : "text-white/25";
  const separatorClass = isLight ? "bg-black/[0.06]" : "bg-white/[0.06]";

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className={`min-w-[200px] rounded-xl py-1.5 ${contentClass}`}>
        <ContextMenuItem className={itemClass} onSelect={onNewSearch}>
          New Search
        </ContextMenuItem>
        <ContextMenuItem className={itemClass} onSelect={onSpotlight}>
          Spotlight
          <ContextMenuShortcut className={shortcutClass}>{modKey}K</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuSeparator className={separatorClass} />

        <ContextMenuSub>
          <ContextMenuSubTrigger className={itemClass}>
            Appearance
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className={`rounded-xl py-1 ${contentClass}`}>
            <ContextMenuCheckboxItem
              checked={theme === "immersive"}
              onCheckedChange={() => setTheme("immersive")}
              className={itemClass}
            >
              Immersive
            </ContextMenuCheckboxItem>
            <ContextMenuCheckboxItem
              checked={theme === "dark"}
              onCheckedChange={() => setTheme("dark")}
              className={itemClass}
            >
              Dark
            </ContextMenuCheckboxItem>
            <ContextMenuCheckboxItem
              checked={theme === "light"}
              onCheckedChange={() => setTheme("light")}
              className={itemClass}
            >
              Light
            </ContextMenuCheckboxItem>
          </ContextMenuSubContent>
        </ContextMenuSub>

        {onToggleWidgets && (
          <ContextMenuCheckboxItem
            checked={widgetsVisible}
            onCheckedChange={() => onToggleWidgets?.()}
            className={itemClass}
          >
            Show Widgets
          </ContextMenuCheckboxItem>
        )}

        {onHideAll && (
          <ContextMenuItem className={itemClass} onSelect={onHideAll}>
            Hide All Windows
            <ContextMenuShortcut className={shortcutClass}>{modKey}H</ContextMenuShortcut>
          </ContextMenuItem>
        )}

        <ContextMenuSeparator className={separatorClass} />

        <ContextMenuItem className={itemClass} disabled>
          About UOR OS
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
