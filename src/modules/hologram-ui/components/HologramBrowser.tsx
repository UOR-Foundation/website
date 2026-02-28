/**
 * HologramBrowser — Thin shell composing modular browser parts.
 *
 * Architecture:
 *   browser-palette.ts       → shared types, colors, helpers
 *   useBrowserNavigation.ts  → all state, cache, prefetch, keyboard shortcuts
 *   BrowserChrome.tsx        → URL bar + nav buttons
 *   BrowserContent.tsx       → markdown renderer, skeleton, scroll memory
 *   BrowserHistory.tsx       → history sidebar
 *   BrowserSkeleton.tsx      → loading placeholder
 */

import { P } from "./browser/browser-palette";
import { useBrowserNavigation } from "./browser/useBrowserNavigation";
import BrowserChrome from "./browser/BrowserChrome";
import BrowserContent from "./browser/BrowserContent";
import BrowserHistory from "./browser/BrowserHistory";

interface BrowserProps {
  onClose: () => void;
  onSendToLumen?: (context: { title: string; url: string; markdown: string }) => void;
}

export default function HologramBrowser({ onClose, onSendToLumen }: BrowserProps) {
  const [state, actions] = useBrowserNavigation(onClose);

  return (
    <div
      className="flex flex-col h-full w-full"
      style={{
        background: "hsla(25, 10%, 10%, 0.6)",
        backdropFilter: "blur(48px) saturate(1.5)",
        WebkitBackdropFilter: "blur(48px) saturate(1.5)",
        fontFamily: P.font,
        borderLeft: `1px solid hsla(38, 20%, 80%, 0.1)`,
        boxShadow: "inset 0 0 80px hsla(25, 8%, 4%, 0.2), inset 0 1px 0 hsla(38, 25%, 90%, 0.06)",
      }}
    >
      <BrowserChrome state={state} actions={actions} onClose={onClose} onSendToLumen={onSendToLumen} />
      <div className="flex flex-1 overflow-hidden">
        {state.showHistory && <BrowserHistory state={state} actions={actions} />}
        <BrowserContent state={state} actions={actions} />
      </div>
    </div>
  );
}
