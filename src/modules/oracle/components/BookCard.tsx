import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";
import type { BookSummary } from "@/modules/oracle/lib/stream-resonance";

interface Props {
  book: BookSummary;
  selected: boolean;
  onToggle: (id: string) => void;
}

const DOMAIN_COLORS: Record<string, string> = {
  Physics: "from-blue-500/30 to-cyan-500/30",
  Philosophy: "from-purple-500/30 to-violet-500/30",
  Business: "from-emerald-500/30 to-green-500/30",
  Finance: "from-amber-500/30 to-yellow-500/30",
  Psychology: "from-rose-500/30 to-pink-500/30",
  Biology: "from-lime-500/30 to-teal-500/30",
  History: "from-orange-500/30 to-red-500/30",
  Technology: "from-sky-500/30 to-indigo-500/30",
  Mathematics: "from-fuchsia-500/30 to-purple-500/30",
  Science: "from-teal-500/30 to-cyan-500/30",
  Literature: "from-amber-500/30 to-orange-500/30",
  General: "from-gray-500/30 to-slate-500/30",
};

export default function BookCard({ book, selected, onToggle }: Props) {
  const gradient = DOMAIN_COLORS[book.domain] || DOMAIN_COLORS.General;

  return (
    <motion.button
      layout
      whileHover={{ scale: 1.04, y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onToggle(book.id)}
      className={`
        relative group text-left rounded-xl overflow-hidden transition-all duration-300
        bg-gradient-to-br ${gradient} backdrop-blur-sm
        border-2 ${selected ? "border-primary shadow-[0_0_20px_hsl(var(--primary)/0.4)]" : "border-white/10 hover:border-white/25"}
        w-full aspect-[3/4] flex flex-col
      `}
    >
      {/* Cover image or fallback */}
      <div className="flex-1 relative overflow-hidden">
        {book.cover_url ? (
          <img
            src={book.cover_url}
            alt={book.title}
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="w-10 h-10 text-white/30" />
          </div>
        )}

        {/* Selection ring */}
        {selected && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute inset-0 border-2 border-primary rounded-xl"
          />
        )}

        {/* Selection checkmark */}
        {selected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center"
          >
            <span className="text-primary-foreground text-xs font-bold">✓</span>
          </motion.div>
        )}
      </div>

      {/* Info bar */}
      <div className="p-3 bg-black/40 backdrop-blur-sm">
        <p className="text-xs font-semibold text-white/90 line-clamp-2 leading-tight">
          {book.title}
        </p>
        <p className="text-[10px] text-white/50 mt-1 uppercase tracking-wider">
          {book.domain}
        </p>
      </div>
    </motion.button>
  );
}
