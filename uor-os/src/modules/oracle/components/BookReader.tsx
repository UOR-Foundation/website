/**
 * BookReader — Immersive reading view for a single book.
 */

import { motion } from "framer-motion";
import { ArrowLeft, ExternalLink, BookOpen, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { CatalogBook } from "@/modules/oracle/lib/book-catalog";
import { DOMAIN_COLORS } from "@/modules/oracle/lib/book-catalog";

interface Props {
  book: CatalogBook;
  markdownContent?: string | null;
  relatedBooks: CatalogBook[];
  onBack: () => void;
  onSelectBook: (id: string) => void;
}

export default function BookReader({ book, markdownContent, relatedBooks, onBack, onSelectBook }: Props) {
  const gradient = DOMAIN_COLORS[book.domain] || DOMAIN_COLORS.General;
  const content = markdownContent || book.summary;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className="min-h-[80vh]"
    >
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Library
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10">
        {/* Main content */}
        <div>
          {/* Book header */}
          <div className="flex gap-6 mb-10">
            <div className={`flex-shrink-0 w-32 h-48 rounded-lg overflow-hidden bg-gradient-to-br ${gradient} shadow-2xl`}>
              {book.cover_url ? (
                <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen className="w-10 h-10 text-white/30" />
                </div>
              )}
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-xs uppercase tracking-widest text-primary/80 font-semibold mb-2">{book.domain}</span>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground leading-tight">{book.title}</h1>
              <p className="text-muted-foreground mt-1">by {book.author}</p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {book.tags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider bg-white/5 text-white/50 border border-white/10">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Prose content */}
          <article className="prose prose-invert prose-lg max-w-none
            prose-headings:font-display prose-headings:text-foreground
            prose-p:text-white/80 prose-p:leading-relaxed
            prose-strong:text-white/90
            prose-li:text-white/75
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline
            prose-blockquote:border-primary/40 prose-blockquote:text-white/60
          ">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </article>

          {/* Source link */}
          <a
            href={book.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-8 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Read full summary on blas.com
          </a>
        </div>

        {/* Sidebar */}
        <aside className="space-y-8">
          {/* Key Takeaways */}
          {book.takeaways.length > 0 && (
            <div className="rounded-xl bg-white/[0.03] border border-white/10 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Key Takeaways</h3>
              </div>
              <ul className="space-y-3">
                {book.takeaways.map((t, i) => (
                  <li key={i} className="flex gap-3 text-sm text-white/70">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Related Books */}
          {relatedBooks.length > 0 && (
            <div className="rounded-xl bg-white/[0.03] border border-white/10 p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Related Books</h3>
              <div className="space-y-3">
                {relatedBooks.slice(0, 6).map((rb) => (
                  <button
                    key={rb.id}
                    onClick={() => onSelectBook(rb.id)}
                    className="flex items-center gap-3 w-full text-left group hover:bg-white/5 rounded-lg p-2 -m-2 transition-colors"
                  >
                    <div className="w-8 h-12 rounded overflow-hidden flex-shrink-0 bg-white/5">
                      {rb.cover_url ? (
                        <img src={rb.cover_url} alt={rb.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="w-3 h-3 text-white/20" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-white/80 truncate group-hover:text-foreground transition-colors">{rb.title}</p>
                      <p className="text-[10px] text-white/40">{rb.author}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </motion.div>
  );
}
