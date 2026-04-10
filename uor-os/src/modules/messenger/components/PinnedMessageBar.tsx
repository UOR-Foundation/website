import { Pin, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  text: string;
  onScrollTo: () => void;
  onDismiss: () => void;
  show: boolean;
}

export default function PinnedMessageBar({ text, onScrollTo, onDismiss, show }: Props) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="overflow-hidden"
        >
          <div className="flex items-center gap-2 px-4 py-2 bg-white/[0.03] border-b border-white/[0.04] cursor-pointer hover:bg-white/[0.04] transition-colors duration-100">
            <Pin size={14} className="text-teal-400/50 rotate-45 flex-shrink-0" />
            <div className="flex-1 min-w-0" onClick={onScrollTo}>
              <p className="text-[12px] text-teal-400/60 font-medium">Pinned Message</p>
              <p className="text-[13px] text-white/50 truncate">{text}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onDismiss(); }}
              className="text-white/20 hover:text-white/50 transition-colors p-1"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
