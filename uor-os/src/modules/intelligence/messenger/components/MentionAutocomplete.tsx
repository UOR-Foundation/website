import { motion } from "framer-motion";
import type { GroupMember } from "../lib/types";

interface Props {
  members: GroupMember[];
  query: string;
  onSelect: (member: GroupMember) => void;
  position?: { bottom: number; left: number };
}

export default function MentionAutocomplete({ members, query, onSelect, position }: Props) {
  const filtered = members.filter((m) => {
    const q = query.toLowerCase();
    return (
      (m.displayName?.toLowerCase().includes(q) ?? false) ||
      (m.handle?.toLowerCase().includes(q) ?? false)
    );
  }).slice(0, 6);

  if (filtered.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="absolute bottom-full mb-1 left-0 right-0 mx-4 bg-slate-900/95 backdrop-blur-xl border border-white/[0.1] rounded-xl shadow-2xl overflow-hidden z-50"
    >
      {filtered.map((member) => (
        <button
          key={member.userId}
          onClick={() => onSelect(member)}
          className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/[0.06] transition-colors text-left"
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-500/25 to-indigo-500/25 border border-white/[0.08] flex items-center justify-center text-[10px] text-white/60 font-medium flex-shrink-0">
            {member.uorGlyph ?? (member.displayName ?? "?").charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white/80 truncate">{member.displayName}</p>
            {member.handle && <p className="text-[11px] text-white/35 truncate">@{member.handle}</p>}
          </div>
        </button>
      ))}
    </motion.div>
  );
}
