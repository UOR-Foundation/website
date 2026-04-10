import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check } from "lucide-react";
import SovereignEditor, { type SovereignEditorHandle } from "@/modules/platform/core/editor/SovereignEditor";

interface Props {
  open: boolean;
  initialText: string;
  onSave: (text: string) => void;
  onClose: () => void;
}

export default function EditMessageModal({ open, initialText, onSave, onClose }: Props) {
  const [text, setText] = useState(initialText);
  const editorRef = useRef<SovereignEditorHandle>(null);

  useEffect(() => {
    if (open) {
      setText(initialText);
      setTimeout(() => editorRef.current?.focus(), 50);
    }
  }, [open, initialText]);

  const handleSave = () => {
    const trimmed = text.trim();
    if (trimmed && trimmed !== initialText) onSave(trimmed);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-md mx-4 bg-slate-900/95 backdrop-blur-xl border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
              <h3 className="text-[15px] text-white/90 font-medium">Edit Message</h3>
              <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors p-1">
                <X size={16} />
              </button>
            </div>
            <div className="p-4">
              <SovereignEditor
                ref={editorRef}
                value={text}
                onChange={setText}
                onEnter={() => { handleSave(); return true; }}
                onEscape={onClose}
                autoFocus
                className="w-full rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/90 text-[14px] px-4 py-3 focus:border-teal-500/30 transition-colors"
                minHeight="72px"
              />
            </div>
            <div className="flex justify-end gap-2 px-4 pb-4">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-[13px] text-white/50 hover:text-white/70 hover:bg-white/[0.04] transition-all duration-75 active:scale-[0.97]"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!text.trim() || text.trim() === initialText}
                className="px-4 py-2 rounded-lg text-[13px] font-medium bg-teal-500/90 text-white hover:bg-teal-500 transition-all duration-75 disabled:opacity-30 disabled:pointer-events-none active:scale-[0.97] flex items-center gap-1.5"
              >
                <Check size={14} />
                Save
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
