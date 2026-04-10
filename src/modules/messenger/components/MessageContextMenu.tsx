import { motion, AnimatePresence } from "framer-motion";
import { Reply, Copy, Pencil, Trash2, Pin, Forward, Smile } from "lucide-react";
import type { DecryptedMessage } from "../lib/types";

interface Props {
  show: boolean;
  message: DecryptedMessage;
  position: { x: number; y: number };
  onClose: () => void;
  onReply: () => void;
  onCopy: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onPin?: () => void;
  onReact: () => void;
  canEdit: boolean;
  canDelete: boolean;
}

export default function MessageContextMenu({
  show, message, position, onClose, onReply, onCopy, onEdit, onDelete, onPin, onReact, canEdit, canDelete,
}: Props) {
  if (!show) return null;

  const items = [
    { icon: Reply, label: "Reply", action: onReply },
    { icon: Smile, label: "React", action: onReact },
    { icon: Copy, label: "Copy", action: () => { navigator.clipboard.writeText(message.plaintext); onCopy(); } },
    { icon: Pin, label: "Pin", action: () => { onPin?.(); } },
    ...(canEdit && onEdit ? [{ icon: Pencil, label: "Edit", action: onEdit }] : []),
    ...(canDelete && onDelete ? [{ icon: Trash2, label: "Delete", action: onDelete, danger: true }] : []),
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.1 }}
        className="fixed inset-0 z-[100]"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={{ duration: 0.1 }}
          className="absolute bg-slate-900/95 backdrop-blur-xl border border-white/[0.1] rounded-xl shadow-2xl py-1 min-w-[160px] overflow-hidden"
          style={{ left: Math.min(position.x, window.innerWidth - 200), top: Math.min(position.y, window.innerHeight - 250) }}
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                onClick={() => { item.action(); onClose(); }}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] transition-colors duration-75 ${
                  (item as any).danger ? "text-red-400/80 hover:bg-red-500/10" : "text-white/70 hover:bg-white/[0.06]"
                }`}
              >
                <Icon size={15} />
                {item.label}
              </button>
            );
          })}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
