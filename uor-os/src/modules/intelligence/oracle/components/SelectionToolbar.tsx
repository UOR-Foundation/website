import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ZoomIn, ZoomOut, HelpCircle, ShieldCheck } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/modules/platform/core/ui/tooltip";

export type SelectionAction = "zoom-in" | "zoom-out" | "clarify" | "verify";

interface SelectionToolbarProps {
  /** The container element to listen for selections within */
  containerRef: React.RefObject<HTMLElement | null>;
  /** Called when user picks an action; receives the action type and the selected text */
  onAction: (action: SelectionAction, selectedText: string) => void;
}

const ACTIONS = [
  { type: "zoom-in" as const, icon: ZoomIn, tip: "Go deeper" },
  { type: "zoom-out" as const, icon: ZoomOut, tip: "Simplify" },
  { type: "clarify" as const, icon: HelpCircle, tip: "Clarify" },
  { type: "verify" as const, icon: ShieldCheck, tip: "Check sources" },
];

const SelectionToolbar = ({ containerRef, onAction }: SelectionToolbarProps) => {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState("");
  const toolbarRef = useRef<HTMLDivElement>(null);

  const dismiss = useCallback(() => {
    setVisible(false);
    setSelectedText("");
  }, []);

  const handleMouseUp = useCallback(() => {
    // Small delay so the selection finalises
    requestAnimationFrame(() => {
      const sel = window.getSelection();
      const text = sel?.toString().trim();
      if (!text || text.length < 2) {
        dismiss();
        return;
      }

      // Check the selection is inside our container
      const container = containerRef.current;
      if (!container || !sel?.rangeCount) {
        dismiss();
        return;
      }

      const range = sel.getRangeAt(0);
      if (!container.contains(range.commonAncestorContainer)) {
        dismiss();
        return;
      }

      const rect = range.getBoundingClientRect();
      setPos({
        x: rect.left + rect.width / 2,
        y: rect.top - 8,
      });
      setSelectedText(text);
      setVisible(true);
    });
  }, [containerRef, dismiss]);

  // Listen for mouseup on the container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("mouseup", handleMouseUp);
    return () => el.removeEventListener("mouseup", handleMouseUp);
  }, [containerRef, handleMouseUp]);

  // Dismiss on scroll, escape, or click outside
  useEffect(() => {
    if (!visible) return;

    const onScroll = () => dismiss();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    const onMouseDown = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        dismiss();
      }
    };

    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mousedown", onMouseDown);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", onMouseDown);
    };
  }, [visible, dismiss]);

  const handleAction = (action: SelectionAction) => {
    onAction(action, selectedText);
    window.getSelection()?.removeAllRanges();
    dismiss();
  };

  return createPortal(
    <AnimatePresence>
      {visible && (
        <TooltipProvider delayDuration={200}>
          <motion.div
            ref={toolbarRef}
            initial={{ opacity: 0, y: 6, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="fixed z-[9999] flex items-center gap-0.5 rounded-full border border-border/40 bg-card/95 backdrop-blur-xl shadow-lg shadow-black/20 px-1.5 py-1"
            style={{
              left: pos.x,
              top: pos.y,
              transform: "translate(-50%, -100%)",
            }}
          >
            {ACTIONS.map(({ type, icon: Icon, tip }) => (
              <Tooltip key={type}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleAction(type)}
                    className="p-2 rounded-full text-muted-foreground/70 hover:text-foreground hover:bg-primary/10 transition-colors"
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  {tip}
                </TooltipContent>
              </Tooltip>
            ))}
          </motion.div>
        </TooltipProvider>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default SelectionToolbar;
