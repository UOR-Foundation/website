import { motion, AnimatePresence } from "framer-motion";

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ open, title, message, confirmLabel = "Confirm", danger = false, onConfirm, onCancel }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-sm mx-4 bg-slate-900/95 backdrop-blur-xl border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 text-center">
              <h3 className="text-[16px] text-white/90 font-medium mb-2">{title}</h3>
              <p className="text-[13px] text-white/45 leading-relaxed">{message}</p>
            </div>
            <div className="flex border-t border-white/[0.06]">
              <button
                onClick={onCancel}
                className="flex-1 py-3.5 text-[14px] text-white/50 hover:bg-white/[0.03] transition-all duration-100 active:scale-[0.98] border-r border-white/[0.06]"
              >
                Cancel
              </button>
              <button
                onClick={() => { onConfirm(); onCancel(); }}
                className={`flex-1 py-3.5 text-[14px] font-medium transition-all duration-100 active:scale-[0.98] ${
                  danger ? "text-red-400 hover:bg-red-500/10" : "text-teal-400 hover:bg-teal-500/10"
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
