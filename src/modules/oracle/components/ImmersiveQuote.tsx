/**
 * ImmersiveQuote — Contextual, rotating quotes for the immersive search view.
 * Fetches AI-curated quotes based on user context, caches in sessionStorage,
 * and crossfades between them every 45 seconds.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { gatherQuoteContext, type QuoteContext } from "@/modules/oracle/lib/quote-context";

interface Quote {
  text: string;
  author: string;
  source: string;
  resonanceType: "affirm" | "grow";
}

const CACHE_KEY = "uor:immersive-quotes";
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const ROTATE_INTERVAL_MS = 45_000;

const FALLBACK_QUOTES: Quote[] = [
  { text: "The universe is made of stories, not of atoms.", author: "Muriel Rukeyser", source: "The Speed of Darkness", resonanceType: "affirm" },
  { text: "The imagination of nature is far, far greater than the imagination of man.", author: "Richard Feynman", source: "The Character of Physical Law", resonanceType: "grow" },
  { text: "I am not only a mathematician but a poetical scientist.", author: "Ada Lovelace", source: "Letter to Charles Babbage, 1843", resonanceType: "affirm" },
  { text: "A book is a garden you carry in your pocket.", author: "Arabian proverb", source: "Traditional", resonanceType: "grow" },
  { text: "We do not see things as they are, we see them as we are.", author: "Anaïs Nin", source: "Seduction of the Minotaur", resonanceType: "grow" },
];

function getCachedQuotes(): Quote[] | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { quotes, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
    return Array.isArray(quotes) && quotes.length > 0 ? quotes : null;
  } catch {
    return null;
  }
}

function setCachedQuotes(quotes: Quote[]) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ quotes, ts: Date.now() }));
  } catch { /* ignore */ }
}

const ORACLE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/uor-oracle`;

async function fetchQuotes(context: QuoteContext): Promise<Quote[]> {
  const resp = await fetch(ORACLE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ mode: "quote", context }),
  });

  if (!resp.ok) throw new Error(`Quote fetch failed: ${resp.status}`);
  const data = await resp.json();
  if (Array.isArray(data.quotes) && data.quotes.length > 0) return data.quotes;
  throw new Error("No quotes returned");
}

export default function ImmersiveQuote() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [index, setIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const loadQuotes = useCallback(async () => {
    // Check cache first
    const cached = getCachedQuotes();
    if (cached) {
      setQuotes(cached);
      setReady(true);
      return;
    }

    try {
      const ctx = await gatherQuoteContext();
      const fetched = await fetchQuotes(ctx);
      setQuotes(fetched);
      setCachedQuotes(fetched);
      setReady(true);
    } catch (e) {
      console.warn("Quote fetch failed, using fallback:", e);
      // Shuffle fallback for variety
      const shuffled = [...FALLBACK_QUOTES].sort(() => Math.random() - 0.5);
      setQuotes(shuffled.slice(0, 3));
      setReady(true);
    }
  }, []);

  useEffect(() => {
    loadQuotes();
  }, [loadQuotes]);

  // Rotate quotes
  useEffect(() => {
    if (quotes.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setIndex(prev => (prev + 1) % quotes.length);
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(intervalRef.current);
  }, [quotes.length]);

  if (!ready || quotes.length === 0) {
    return (
      <span className="text-white/40 text-xs font-medium tracking-wide">
        Universal Object Reference
      </span>
    );
  }

  const current = quotes[index];

  return (
    <div className="max-w-[60vw] md:max-w-[50vw] min-h-[2.5rem]">
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="flex flex-col gap-0.5"
        >
          <p
            className="text-white/50 leading-relaxed"
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontStyle: "italic",
              fontSize: "clamp(13px, 1.1vw, 15px)",
            }}
          >
            "{current.text}"
          </p>
          <span
            className="text-white/30 tracking-widest"
            style={{
              fontVariant: "small-caps",
              fontSize: "clamp(10px, 0.8vw, 12px)",
            }}
          >
            — {current.author}
            {current.source && current.source !== "Traditional" && (
              <span className="text-white/20 ml-1.5 tracking-normal" style={{ fontVariant: "normal", fontStyle: "italic" }}>
                {current.source}
              </span>
            )}
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
