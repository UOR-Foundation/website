/**
 * BookCard — Visual cover-focused book card for the library grid.
 */

import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";
import type { CatalogBook } from "@/modules/intelligence/oracle/lib/book-catalog";
import { DOMAIN_COLORS } from "@/modules/intelligence/oracle/lib/book-catalog";

interface Props {
  book: CatalogBook;
  selected: boolean;
  onToggle: (id: string) => void;
  onRead: (id: string) => void;
}

export default function BookCard({ book, selected, onToggle, onRead }: Props) {
  const gradient = DOMAIN_COLORS[book.domain] || DOMAIN_COLORS.General;

  return (
    <motion.div
      layout
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="relative group cursor-pointer"
    >
      {/* Cover */}
      <div
        onClick={() => onRead(book.id)}
        className={`
          relative rounded-lg overflow-hidden aspect-[2/3]
          bg-gradient-to-br ${gradient}
          shadow-lg group-hover:shadow-2xl group-hover:shadow-primary/10
          transition-shadow duration-300
          ${selected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}
        `}
      >
        {book.cover_url ? (
          <img
            src={book.cover_url}
            alt={book.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-white/20" />
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <span className="text-white text-xs font-semibold tracking-wider uppercase">Read</span>
        </div>

        {/* Selection checkbox */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(book.id); }}
          className={`
            absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center
            transition-all duration-200 z-10
            ${selected
              ? "bg-primary border-primary"
              : "bg-black/40 border-white/30 opacity-0 group-hover:opacity-100"
            }
          `}
        >
          {selected && <span className="text-primary-foreground text-[10px] font-bold">✓</span>}
        </button>
      </div>

      {/* Title & Author */}
      <div className="mt-2.5 px-0.5">
        <p className="text-xs font-semibold text-foreground/90 line-clamp-2 leading-tight">{book.title}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{book.author}</p>
      </div>
    </motion.div>
  );
}
