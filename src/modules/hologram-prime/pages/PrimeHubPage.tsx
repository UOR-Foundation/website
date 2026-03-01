/**
 * PrimeHub — Cinematic Multimedia Landing
 * ════════════════════════════════════════
 *
 * Aman-level serenity meets Netflix discovery.
 * Extreme whitespace, floating typography, images that breathe.
 * Every element earns its place.
 *
 * @module hologram-prime/pages/PrimeHubPage
 */

import { useState, useCallback, useRef, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, Play, ChevronLeft, ChevronRight, X } from "lucide-react";
import { P } from "@/modules/hologram-ui/theme/prime-palette";
import { usePrimeTheme } from "../hooks/usePrimeTheme";
import { useIsMobile } from "@/hooks/use-mobile";
import QRShareCard from "../components/QRShareCard";
import hologramIcon from "@/assets/hologram-icon.png";

// Placeholder for now
const HologramPrimePage = () => <div className="text-white p-10 text-center">Audio Player Loading...</div>;

/* ── Content Data ──────────────────────────────────────────────── */

interface ContentItem {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  category: "audio" | "video" | "gaming";
  status: "live" | "coming-soon";
  route?: string;
}

interface ContentRow {
  label: string;
  items: ContentItem[];
}

const HERO_SLIDES = [
  {
    image: "/images/hero-music.jpg",
    label: "listen",
  },
  {
    image: "/images/hero-cinema.jpg",
    label: "watch",
  },
  {
    image: "/images/hero-game.jpg",
    label: "play",
  },
];

const HERO = {
  tagline: "What calls to you?",
  description: "Set your intention. Let it guide your experience.",
};

const ROWS: ContentRow[] = [
  {
    label: "Audio",
    items: [
      { id: "a1", title: "Live Radio", subtitle: "Global stations", image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&q=80", category: "audio", status: "live", route: "/hologram-prime/audio" },
      { id: "a2", title: "Spotify Connect", subtitle: "Your library", image: "https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=600&q=80", category: "audio", status: "live", route: "/hologram-prime/audio" },
      { id: "a3", title: "Spatial Audio", subtitle: "Immersive EQ", image: "https://images.unsplash.com/photo-1545127398-14699f92334b?w=600&q=80", category: "audio", status: "live", route: "/hologram-prime/audio" },
      { id: "a4", title: "Luminal AI", subtitle: "Listening insights", image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&q=80", category: "audio", status: "live", route: "/hologram-prime/audio" },
      { id: "a5", title: "Mood Timeline", subtitle: "Visualise energy", image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&q=80", category: "audio", status: "live", route: "/hologram-prime/audio" },
    ],
  },
  {
    label: "Video",
    items: [
      { id: "v1", title: "YouTube Theater", subtitle: "Floating player", image: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&q=80", category: "video", status: "coming-soon" },
      { id: "v2", title: "Live Streams", subtitle: "Real-time", image: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=600&q=80", category: "video", status: "coming-soon" },
      { id: "v3", title: "Cinema Mode", subtitle: "Full immersion", image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&q=80", category: "video", status: "coming-soon" },
      { id: "v4", title: "Documentaries", subtitle: "Curated", image: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=600&q=80", category: "video", status: "coming-soon" },
      { id: "v5", title: "Short Films", subtitle: "Handpicked", image: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=600&q=80", category: "video", status: "coming-soon" },
    ],
  },
  {
    label: "Gaming",
    items: [
      { id: "g1", title: "Cloud Gaming", subtitle: "Instant play", image: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=600&q=80", category: "gaming", status: "coming-soon" },
      { id: "g2", title: "Multiplayer", subtitle: "Social worlds", image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&q=80", category: "gaming", status: "coming-soon" },
      { id: "g3", title: "Indie Spotlight", subtitle: "Discover creators", image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&q=80", category: "gaming", status: "coming-soon" },
      { id: "g4", title: "Retro Arcade", subtitle: "Classics reimagined", image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=600&q=80", category: "gaming", status: "coming-soon" },
      { id: "g5", title: "Puzzle Worlds", subtitle: "Mindful play", image: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&q=80", category: "gaming", status: "coming-soon" },
    ],
  },
];

/* ── Animations ────────────────────────────────────────────────── */

const ease = [0.22, 1, 0.36, 1] as const;

/* ── Page ──────────────────────────────────────────────────────── */

export default function PrimeHubPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { isDark, toggle: toggleTheme } = usePrimeTheme();
  const [shareOpen, setShareOpen] = useState(false);
  const [heroSlide, setHeroSlide] = useState(0);
  const [portalItem, setPortalItem] = useState<ContentItem | null>(null);
  const [portalRect, setPortalRect] = useState<DOMRect | null>(null);
  const [portalReady, setPortalReady] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  // Auto-rotate hero slides
  useEffect(() => {
    const interval = setInterval(() => {
      setHeroSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleItemClick = useCallback((item: ContentItem, rect?: DOMRect) => {
    if (item.status !== "live") return;
    if (rect) {
      setPortalRect(rect);
      setPortalItem(item);
      // Lock scroll
      document.body.style.overflow = "hidden";
      // After expansion animation, mark as ready to show content
      setTimeout(() => setPortalReady(true), 700);
    }
  }, []);

  const handlePortalClose = useCallback(() => {
    setPortalReady(false);
    setTimeout(() => {
      setPortalItem(null);
      setPortalRect(null);
      document.body.style.overflow = "";
    }, 500);
  }, []);

  const pad = isMobile ? "1.5rem" : "4.5rem";

  return (
    <div style={{
      minHeight: "100vh",
      background: P.bgSolid,
      color: P.text,
      fontFamily: P.font,
      overflowX: "hidden",
    }}>

      {/* ── Minimal Nav ──────────────────────────────────────────── */}
      <motion.nav
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, delay: 0.2 }}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          padding: isMobile ? "1.25rem 1.5rem" : "2rem 4.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: `linear-gradient(180deg, ${P.bgSolid} 0%, ${P.bgSolid}00 100%)`,
        }}
      >
        <span style={{
          fontFamily: P.fontDisplay,
          fontSize: isMobile ? "1rem" : "1.15rem",
          color: P.text,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
        }}>
          Hologram Prime
        </span>

        <button
          onClick={toggleTheme}
          style={{
            width: 34, height: 34, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "none",
            background: "transparent",
            color: P.textTertiary,
            cursor: "pointer",
            transition: "color 0.4s",
          }}
        >
          {isDark ? <Sun style={{ width: 15, height: 15 }} /> : <Moon style={{ width: 15, height: 15 }} />}
        </button>
      </motion.nav>

      {/* ── Hero — still, serene ────────────────────────────────── */}
      <motion.section
        ref={heroRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2, ease }}
        style={{
          position: "relative",
          width: "100%",
          minHeight: isMobile ? "60vh" : "65vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {/* Background slides — gentle crossfade only, no zoom */}
        {HERO_SLIDES.map((slide, i) => (
          <div
            key={slide.label}
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url(${slide.image})`,
              backgroundSize: "cover",
              backgroundPosition: "center 40%",
              filter: "brightness(0.22) saturate(0.4)",
              opacity: heroSlide === i ? 1 : 0,
              transition: "opacity 2.5s ease",
            }}
          />
        ))}

        {/* Soft gradient veil — seamless blend into page */}
        <div style={{
          position: "absolute", inset: 0,
          background: `linear-gradient(180deg, ${P.bgSolid}aa 0%, ${P.bgSolid}44 35%, ${P.bgSolid}88 70%, ${P.bgSolid} 100%)`,
        }} />

        {/* Content — centered, unhurried */}
        <div style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          padding: isMobile ? "0 1.5rem" : "0 4.5rem",
          width: "100%",
        }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.4, delay: 0.4, ease }}
          >
            <h1 style={{
              fontFamily: P.fontDisplay,
              fontSize: isMobile ? "2.2rem" : "3.8rem",
              fontWeight: 300,
              color: P.text,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              margin: 0,
            }}>
              {HERO.tagline}
            </h1>

            <p style={{
              fontFamily: P.font,
              fontSize: isMobile ? "0.95rem" : "1.1rem",
              color: P.textSecondary,
              lineHeight: 1.8,
              maxWidth: 420,
              letterSpacing: "0.01em",
              margin: isMobile ? "1.5rem auto 0" : "2rem auto 0",
            }}>
              {HERO.description}
            </p>

            {/* ── Intention Flow — embedded in hero ──────────────── */}
            <div style={{ marginTop: isMobile ? "2rem" : "2.5rem" }}>
              <IntentionFlow isMobile={isMobile} />
            </div>
          </motion.div>
        </div>

        {/* Slide dots */}
        <div style={{
          position: "absolute",
          bottom: isMobile ? "2rem" : "3rem",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 3,
          display: "flex",
          gap: "0.6rem",
        }}>
          {HERO_SLIDES.map((slide, i) => (
            <button
              key={slide.label}
              onClick={() => setHeroSlide(i)}
              aria-label={slide.label}
              style={{
                width: heroSlide === i ? 24 : 8,
                height: 8,
                borderRadius: 999,
                border: "none",
                background: heroSlide === i ? "hsla(35, 20%, 85%, 0.9)" : "hsla(35, 10%, 60%, 0.35)",
                cursor: "pointer",
                transition: "all 0.5s ease",
                padding: 0,
              }}
            />
          ))}
        </div>
      </motion.section>

      {/* ═══ SECTION: Discover ═══════════════════════════════════ */}
      <SectionDivider label="Discover" description="Explore curated experiences across sound, vision, and play." isMobile={isMobile} pad={pad} />
      <div style={{ paddingBottom: isMobile ? "2rem" : "4rem" }}>
        {ROWS.map((row, ri) => (
          <ContentRowSection
            key={row.label}
            row={row}
            index={ri}
            isMobile={isMobile}
            pad={pad}
            onItemClick={handleItemClick}
          />
        ))}
      </div>

      {/* ═══ SECTION: Request & Create — side by side ═══════════ */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 1, ease }}
        style={{
          padding: isMobile ? "5rem 1.5rem 3rem" : "8rem 4.5rem 5rem",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: isMobile ? "2rem" : "2rem",
        }}
      >
        {/* Request Panel */}
        <div style={{
          flex: 1,
          padding: isMobile ? "2rem 1.5rem" : "2.5rem 2.5rem",
          borderRadius: 20,
          border: "1px solid hsla(30, 10%, 60%, 0.1)",
          display: "flex",
          flexDirection: "column",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.2rem" }}>
            <div style={{ width: 28, height: 1, background: P.accent, opacity: 0.35 }} />
            <img src={hologramIcon} alt="" style={{ width: 22, height: 22, opacity: 0.25, objectFit: "contain" }} />
          </div>
          <h3 style={{
            fontFamily: P.fontDisplay,
            fontSize: isMobile ? "1.8rem" : "2.2rem",
            fontWeight: 300,
            color: P.text,
            letterSpacing: "-0.025em",
            margin: 0,
            lineHeight: 1.1,
          }}>Request</h3>
          <p style={{
            fontFamily: P.font,
            fontSize: "0.88rem",
            color: P.textSecondary,
            lineHeight: 1.65,
            margin: "0.8rem 0 1.5rem",
          }}>
            Tell us what you'd love to experience.
          </p>
          <RequestSectionInline isMobile={isMobile} />
        </div>

        {/* Create Panel */}
        <div style={{
          flex: 1,
          padding: isMobile ? "2rem 1.5rem" : "2.5rem 2.5rem",
          borderRadius: 20,
          border: "1px solid hsla(30, 10%, 60%, 0.1)",
          display: "flex",
          flexDirection: "column",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.2rem" }}>
            <div style={{ width: 28, height: 1, background: P.accent, opacity: 0.35 }} />
            <img src={hologramIcon} alt="" style={{ width: 22, height: 22, opacity: 0.25, objectFit: "contain" }} />
          </div>
          <h3 style={{
            fontFamily: P.fontDisplay,
            fontSize: isMobile ? "1.8rem" : "2.2rem",
            fontWeight: 300,
            color: P.text,
            letterSpacing: "-0.025em",
            margin: 0,
            lineHeight: 1.1,
          }}>Create</h3>
          <p style={{
            fontFamily: P.font,
            fontSize: "0.88rem",
            color: P.textSecondary,
            lineHeight: 1.65,
            margin: "0.8rem 0 1.5rem",
          }}>
            Craft your own media experiences with AI.
          </p>
          <CreateSectionInline isMobile={isMobile} />
        </div>
      </motion.div>

      {/* ── Quiet Footer ─────────────────────────────────────────── */}
      <div style={{
        padding: isMobile ? "3rem 1.5rem 2rem" : "4rem 4.5rem 3rem",
      }}>
        <div style={{
          width: "100%",
          height: 1,
          background: `linear-gradient(90deg, transparent, ${P.border}, transparent)`,
          marginBottom: isMobile ? "1.5rem" : "2rem",
        }} />
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <span style={{
            fontFamily: P.font,
            fontSize: "0.6rem",
            color: P.textTertiary,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}>
            Hologram OS
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <div style={{
              width: 4, height: 4, borderRadius: "50%",
              background: P.live,
              boxShadow: `0 0 8px ${P.liveGlow}`,
            }} />
            <span style={{
              fontFamily: P.font,
              fontSize: "0.6rem",
              color: P.textTertiary,
              letterSpacing: "0.06em",
            }}>
              Online
            </span>
          </div>
        </div>
      </div>

      <QRShareCard track={null} open={shareOpen} onClose={() => setShareOpen(false)} />

      {/* ═══ Portal Overlay ═══════════════════════════════════════ */}
      <AnimatePresence>
        {portalItem && portalRect && (
          <motion.div
            key="portal-overlay"
            initial={{
              position: "fixed",
              top: portalRect.top,
              left: portalRect.left,
              width: portalRect.width,
              height: portalRect.height,
              borderRadius: 12,
              zIndex: 9999,
              overflow: "hidden",
            }}
            animate={{
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              borderRadius: 0,
            }}
            exit={{
              top: portalRect.top,
              left: portalRect.left,
              width: portalRect.width,
              height: portalRect.height,
              borderRadius: 12,
              opacity: 0,
            }}
            transition={{
              duration: 0.65,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{
              position: "fixed",
              zIndex: 9999,
              overflow: "hidden",
            }}
          >
            {/* Background image that zooms in */}
            <motion.div
              initial={{ scale: 1 }}
              animate={{ scale: 1.15 }}
              exit={{ scale: 1 }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage: `url(${portalItem.image})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                filter: "brightness(0.3) saturate(0.8)",
              }}
            />

            {/* Dark gradient overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              style={{
                position: "absolute",
                inset: 0,
                background: `linear-gradient(180deg, ${P.bgSolid}dd 0%, ${P.bgSolid} 40%)`,
              }}
            />

            {/* Close button */}
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.5, duration: 0.3 }}
              onClick={handlePortalClose}
              style={{
                position: "absolute",
                top: isMobile ? 16 : 28,
                right: isMobile ? 16 : 28,
                zIndex: 10,
                width: 44,
                height: 44,
                borderRadius: "50%",
                border: "1px solid hsla(30, 10%, 60%, 0.2)",
                background: "hsla(0, 0%, 0%, 0.4)",
                backdropFilter: "blur(12px)",
                color: P.text,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <X style={{ width: 18, height: 18 }} />
            </motion.button>

            {/* Title reveal */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: portalReady ? 0 : 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 5,
              }}
            >
              <h2 style={{
                fontFamily: P.fontDisplay,
                fontSize: isMobile ? "2.5rem" : "4rem",
                fontWeight: 300,
                color: P.text,
                letterSpacing: "-0.03em",
                margin: 0,
              }}>
                {portalItem.title}
              </h2>
              <p style={{
                fontFamily: P.font,
                fontSize: isMobile ? "0.9rem" : "1rem",
                color: P.textSecondary,
                marginTop: "0.75rem",
                letterSpacing: "0.02em",
              }}>
                {portalItem.subtitle}
              </p>
            </motion.div>

            {/* Embedded player — fades in after portal expansion */}
            <AnimatePresence>
              {portalReady && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6 }}
                  style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 6,
                    overflow: "auto",
                  }}
                >
                  <Suspense fallback={
                    <div style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}>
                      <motion.div
                        animate={{ opacity: [0.3, 0.8, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        style={{
                          fontFamily: P.font,
                          fontSize: "0.8rem",
                          color: P.textTertiary,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                        }}
                      >
                        Loading…
                      </motion.div>
                    </div>
                  }>
                    <HologramPrimePage />
                  </Suspense>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 * Section Divider — Aman-inspired, left-aligned, generous
 * ═══════════════════════════════════════════════════════════════════ */

function SectionDivider({ label, description, isMobile, pad }: {
  label: string;
  description: string;
  isMobile: boolean;
  pad: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 1, ease }}
      style={{
        padding: `${isMobile ? "5rem" : "8rem"} ${pad} ${isMobile ? "2.5rem" : "3.5rem"}`,
      }}
    >
      <div style={{
        width: 32,
        height: 1,
        background: P.accent,
        opacity: 0.4,
        marginBottom: isMobile ? "1.5rem" : "2rem",
      }} />
      <h2 style={{
        fontFamily: P.fontDisplay,
        fontSize: isMobile ? "2.4rem" : "3.6rem",
        fontWeight: 300,
        color: P.text,
        letterSpacing: "-0.03em",
        margin: 0,
        lineHeight: 1.05,
      }}>
        {label}
      </h2>
      <p style={{
        fontFamily: P.font,
        fontSize: isMobile ? "1rem" : "1.15rem",
        color: P.textSecondary,
        letterSpacing: "0.005em",
        marginTop: "1rem",
        maxWidth: 520,
        lineHeight: 1.7,
      }}>
        {description}
      </p>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 * Request Section — full-width, editorial, Aman-inspired
 * ═══════════════════════════════════════════════════════════════════ */

const REQUEST_CATEGORIES = [
  {
    icon: "🎵",
    label: "Music",
    desc: "A song, album, or playlist",
    image: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800&q=80",
  },
  {
    icon: "🎬",
    label: "Video",
    desc: "A film, series, or clip",
    image: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&q=80",
  },
  {
    icon: "🎮",
    label: "Game",
    desc: "A game or interactive experience",
    image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80",
  },
];

function RequestSectionInline({ isMobile }: { isMobile: boolean }) {
  const [requestText, setRequestText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!requestText.trim()) return;
    setSubmitted(true);
    setTimeout(() => { setRequestText(""); setSelectedCategory(null); setSubmitted(false); }, 3000);
  };

  return (
    <>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.2rem" }}>
        {REQUEST_CATEGORIES.map((cat) => (
          <button
            key={cat.label}
            onClick={() => setSelectedCategory(selectedCategory === cat.label ? null : cat.label)}
            style={{
              padding: "0.4rem 1rem",
              borderRadius: 999,
              border: `1px solid ${selectedCategory === cat.label ? "hsla(30, 25%, 65%, 0.4)" : "hsla(30, 10%, 60%, 0.15)"}`,
              background: selectedCategory === cat.label ? "hsla(30, 15%, 50%, 0.08)" : "transparent",
              cursor: "pointer",
              transition: "all 0.3s",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
            }}
          >
            <span style={{ fontSize: "0.8rem" }}>{cat.icon}</span>
            <span style={{
              fontFamily: P.font, fontSize: "0.78rem", fontWeight: 500,
              color: selectedCategory === cat.label ? P.text : P.textSecondary,
              letterSpacing: "0.01em", transition: "color 0.3s",
            }}>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Category images — contemplative, evocative */}
      <div style={{
        display: "flex",
        gap: "0.6rem",
        marginBottom: "1.5rem",
        flex: 1,
        minHeight: 0,
      }}>
        {REQUEST_CATEGORIES.map((cat) => (
          <motion.div
            key={cat.label}
            whileHover={{ scale: 1.02 }}
            onClick={() => setSelectedCategory(selectedCategory === cat.label ? null : cat.label)}
            style={{
              flex: 1,
              position: "relative",
              borderRadius: 12,
              overflow: "hidden",
              cursor: "pointer",
              minHeight: isMobile ? 90 : 120,
              border: `1px solid ${selectedCategory === cat.label ? "hsla(30, 25%, 65%, 0.35)" : "hsla(30, 10%, 60%, 0.08)"}`,
              transition: "border-color 0.4s",
            }}
          >
            <div style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url(${cat.image})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity: selectedCategory === cat.label ? 0.4 : 0.2,
              transition: "opacity 0.5s",
            }} />
            <div style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to top, hsla(25, 12%, 8%, 0.75) 0%, transparent 100%)",
            }} />
            <div style={{
              position: "relative",
              zIndex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              height: "100%",
              padding: "0.7rem 0.8rem",
            }}>
              <span style={{
                fontFamily: P.font,
                fontSize: "0.68rem",
                fontWeight: 500,
                color: P.text,
                opacity: 0.85,
                letterSpacing: "0.02em",
              }}>{cat.icon} {cat.label}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "auto" }}>
        <input
          type="text"
          value={requestText}
          onChange={(e) => setRequestText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder={selectedCategory ? `What ${selectedCategory.toLowerCase()} would you love?` : "What would you love?"}
          style={{
            flex: 1,
            padding: "0.85rem 1.3rem",
            borderRadius: 999,
            border: "1px solid hsla(30, 10%, 60%, 0.18)",
            background: "hsla(0, 0%, 100%, 0.03)",
            color: P.text,
            fontFamily: P.font,
            fontSize: "0.88rem",
            outline: "none",
            transition: "border-color 0.3s",
          }}
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSubmit}
          disabled={!requestText.trim()}
          style={{
            width: 40, height: 40, borderRadius: "50%", border: "none",
            background: requestText.trim() ? "hsla(0, 0%, 100%, 0.85)" : "transparent",
            color: requestText.trim() ? P.bgSolid : P.textTertiary,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: requestText.trim() ? "pointer" : "default",
            transition: "all 0.4s", flexShrink: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </motion.button>
      </div>

      <AnimatePresence>
        {submitted && (
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{ fontFamily: P.font, fontSize: "0.85rem", color: P.accent, marginTop: "1rem" }}
          >
            Your request has been noted. ✨
          </motion.p>
        )}
      </AnimatePresence>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 * Create Section — full-width, editorial cards with imagery
 * ═══════════════════════════════════════════════════════════════════ */

const CREATE_TOOLS = [
  {
    title: "Compose",
    category: "Music",
    desc: "Generate original music with AI — set a mood, tempo, and style.",
    image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&q=80",
  },
  {
    title: "Direct",
    category: "Video",
    desc: "Create visual stories and cinematic edits powered by AI.",
    image: "https://images.unsplash.com/photo-1524712245354-2c4e5e7121c0?w=800&q=80",
  },
  {
    title: "Build",
    category: "Games",
    desc: "Design interactive experiences and mini-games with no code.",
    image: "https://images.unsplash.com/photo-1556438064-2d7646166914?w=800&q=80",
  },
];

function CreateSectionInline({ isMobile }: { isMobile: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", flex: 1 }}>
      {/* Image strip — matching Request panel */}
      <div style={{
        display: "flex",
        gap: "0.6rem",
        marginBottom: "0.5rem",
        minHeight: isMobile ? 90 : 120,
      }}>
        {CREATE_TOOLS.map((tool) => (
          <motion.div
            key={tool.title}
            whileHover={{ scale: 1.02 }}
            style={{
              flex: 1,
              position: "relative",
              borderRadius: 12,
              overflow: "hidden",
              cursor: "pointer",
              border: "1px solid hsla(30, 10%, 60%, 0.08)",
              transition: "border-color 0.4s",
            }}
          >
            <div style={{
              position: "absolute", inset: 0,
              backgroundImage: `url(${tool.image})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              opacity: 0.2,
              transition: "opacity 0.5s",
            }} />
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(to top, hsla(25, 12%, 8%, 0.75) 0%, transparent 100%)",
            }} />
            <div style={{
              position: "relative", zIndex: 1,
              display: "flex", flexDirection: "column",
              justifyContent: "flex-end", height: "100%",
              padding: "0.7rem 0.8rem",
            }}>
              <span style={{
                fontFamily: P.font, fontSize: "0.68rem", fontWeight: 500,
                color: P.text, opacity: 0.85, letterSpacing: "0.02em",
              }}>{tool.category}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tool list */}
      {CREATE_TOOLS.map((tool) => (
        <motion.div
          key={tool.title}
          whileHover={{ scale: 1.01 }}
          style={{
            padding: "1.1rem 1.3rem",
            borderRadius: 14,
            border: "1px solid hsla(30, 10%, 60%, 0.1)",
            cursor: "pointer",
            transition: "all 0.4s",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <h4 style={{
              fontFamily: P.fontDisplay, fontSize: "1.1rem", fontWeight: 400,
              color: P.text, margin: 0, letterSpacing: "-0.015em",
            }}>{tool.title}</h4>
            <span style={{
              fontFamily: P.font, fontSize: "0.55rem", color: P.accent,
              letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.55,
            }}>Soon</span>
          </div>
          <p style={{
            fontFamily: P.font, fontSize: "0.8rem", color: P.textSecondary,
            margin: 0, marginTop: "0.35rem", lineHeight: 1.5,
          }}>{tool.desc}</p>
        </motion.div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 * Content Row — generous, aligned, breathing
 * ═══════════════════════════════════════════════════════════════════ */

function ContentRowSection({ row, index, isMobile, pad, onItemClick }: {
  row: ContentRow;
  index: number;
  isMobile: boolean;
  pad: string;
  onItemClick: (item: ContentItem, rect?: DOMRect) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = isMobile ? 260 : 380;
    scrollRef.current.scrollBy({ left: dir === "right" ? amount : -amount, behavior: "smooth" });
  };

  return (
    <motion.section
      id={`row-${row.items[0]?.category}`}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.9, delay: index * 0.08, ease }}
      style={{ marginBottom: isMobile ? "4rem" : "6rem", scrollMarginTop: "2rem" }}
    >
      {/* Row label — simple, aligned to content edge */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: `0 ${pad}`,
        marginBottom: isMobile ? "1.25rem" : "1.75rem",
      }}>
        <h2 style={{
          fontFamily: P.fontDisplay,
          fontSize: isMobile ? "1.8rem" : "2.6rem",
          fontWeight: 400,
          color: P.text,
          letterSpacing: "-0.02em",
          margin: 0,
          lineHeight: 1,
        }}>
          {row.label}
        </h2>

        {!isMobile && (
          <div style={{ display: "flex", gap: "0.35rem" }}>
            <ScrollBtn onClick={() => scroll("left")}><ChevronLeft style={{ width: 16, height: 16 }} /></ScrollBtn>
            <ScrollBtn onClick={() => scroll("right")}><ChevronRight style={{ width: 16, height: 16 }} /></ScrollBtn>
          </div>
        )}
      </div>

      {/* Scrollable cards */}
      <div
        ref={scrollRef}
        style={{
          display: "flex",
          gap: isMobile ? "0.75rem" : "1.5rem",
          overflowX: "auto",
          paddingLeft: pad,
          paddingRight: pad,
          paddingBottom: "0.5rem",
          scrollSnapType: "x mandatory",
          scrollbarWidth: "none",
        }}
      >
        {row.items.map((item, i) => (
          <ContentCard
            key={item.id}
            item={item}
            index={i}
            isMobile={isMobile}
            onClick={onItemClick}
          />
        ))}
      </div>
    </motion.section>
  );
}

function ScrollBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 32, height: 32, borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center",
        border: `1px solid ${P.border}`,
        background: "transparent",
        color: P.textTertiary,
        cursor: "pointer",
        transition: "color 0.3s, border-color 0.3s",
      }}
    >
      {children}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 * Content Card — image-first, quiet text, generous
 * ═══════════════════════════════════════════════════════════════════ */

function ContentCard({ item, index, isMobile, onClick }: {
  item: ContentItem;
  index: number;
  isMobile: boolean;
  onClick: (item: ContentItem, rect?: DOMRect) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const isLive = item.status === "live";

  const handleClick = () => {
    const imageEl = cardRef.current?.querySelector("[data-card-image]") as HTMLElement;
    const rect = imageEl?.getBoundingClientRect();
    onClick(item, rect || undefined);
  };

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, delay: index * 0.06, ease }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleClick}
      style={{
        flex: isMobile ? "0 0 220px" : "1 1 0%",
        minWidth: isMobile ? 220 : 0,
        scrollSnapAlign: "start",
        cursor: isLive ? "pointer" : "default",
        opacity: isLive ? 1 : 0.5,
      }}
    >
      {/* Image */}
      <div data-card-image style={{
        position: "relative",
        width: "100%",
        aspectRatio: "3 / 2",
        borderRadius: isMobile ? "0.6rem" : "0.75rem",
        overflow: "hidden",
        marginBottom: "0.9rem",
      }}>
        <motion.div
          animate={{ scale: hovered && isLive ? 1.04 : 1 }}
          transition={{ duration: 0.8, ease }}
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${item.image})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />

        {/* Gentle hover veil */}
        <AnimatePresence>
          {hovered && isLive && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              style={{
                position: "absolute",
                inset: 0,
                background: "hsla(0, 0%, 0%, 0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.85, opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{
                  width: 44, height: 44, borderRadius: "50%",
                  background: "hsla(0, 0%, 100%, 0.9)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Play style={{ width: 18, height: 18, color: "hsl(25, 20%, 10%)", marginLeft: 2 }} />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Coming soon — quiet, unobtrusive */}
        {!isLive && (
          <div style={{
            position: "absolute",
            bottom: "0.6rem",
            left: "0.6rem",
            padding: "0.2rem 0.55rem",
            borderRadius: 999,
            background: "hsla(0, 0%, 0%, 0.55)",
            backdropFilter: "blur(8px)",
            fontFamily: P.font,
            fontSize: "0.55rem",
            color: "hsl(0, 0%, 72%)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}>
            Soon
          </div>
        )}
      </div>

      {/* Text — just title and one line */}
      <h3 style={{
        fontFamily: P.fontDisplay,
        fontSize: isMobile ? "1.05rem" : "1.25rem",
        fontWeight: 400,
        color: P.text,
        letterSpacing: "-0.01em",
        margin: 0,
        lineHeight: 1.3,
      }}>
        {item.title}
      </h3>
      <p style={{
        fontFamily: P.font,
        fontSize: isMobile ? "0.85rem" : "0.95rem",
        color: P.textTertiary,
        margin: "0.3rem 0 0",
        letterSpacing: "0.02em",
      }}>
        {item.subtitle}
      </p>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 * Intention Flow — AI-guided, immersive, embedded
 * ═══════════════════════════════════════════════════════════════════ */

const INTENTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/luminal-intention`;

const PLACEHOLDERS = [
  "I want to feel something beautiful…",
  "Take me somewhere calm…",
  "I need energy…",
  "Show me something I've never seen…",
  "Surprise me…",
];

function IntentionFlow({ isMobile }: { isMobile: boolean }) {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasResponded, setHasResponded] = useState(false);
  const [placeholder, setPlaceholder] = useState(PLACEHOLDERS[0]);
  const [isListening, setIsListening] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const toggleVoice = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join("");
      setInput(transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.start();
    setIsListening(true);
  }, [isListening]);

  // Rotate placeholder
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholder(prev => {
        const idx = PLACEHOLDERS.indexOf(prev);
        return PLACEHOLDERS[(idx + 1) % PLACEHOLDERS.length];
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    setIsStreaming(true);
    setResponse("");
    setHasResponded(true);

    try {
      const resp = await fetch(INTENTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ intention: text }),
      });

      if (!resp.ok || !resp.body) {
        setResponse("I'm here when you're ready. Try again in a moment.");
        setIsStreaming(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              // Don't show the tag to the user
              setResponse(fullText.replace(/\[(AUDIO|VIDEO|GAMING)\]/g, "").trim());
            }
          } catch { /* partial */ }
        }
      }

      // Extract category tag and scroll
      setIsStreaming(false);
      const tagMatch = fullText.match(/\[(AUDIO|VIDEO|GAMING)\]/);
      if (tagMatch) {
        const target = tagMatch[1].toLowerCase();
        setTimeout(() => {
          document.getElementById(`row-${target}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 2000);
      }
    } catch {
      setResponse("Something shifted. Let's try again.");
      setIsStreaming(false);
    }
  }, [input, isStreaming]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 1, delay: 0.1, ease }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: hasResponded ? 140 : "auto",
      }}
    >
      {/* AI Response — flowing text */}
      <AnimatePresence>
        {hasResponded && response && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease }}
            style={{
              fontFamily: P.fontDisplay,
              fontSize: isMobile ? "1.2rem" : "1.5rem",
              fontWeight: 400,
              color: "hsl(35, 15%, 88%)",
              letterSpacing: "-0.02em",
              lineHeight: 1.5,
              textAlign: "center",
              maxWidth: 520,
              marginBottom: "2rem",
            }}
          >
            {response}
            {isStreaming && (
              <motion.span
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                style={{ color: P.accent }}
              >
                &#8239;&#124;
              </motion.span>
            )}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Reset — appears after response completes */}
      <AnimatePresence>
        {hasResponded && !isStreaming && response && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            onClick={() => {
              setInput("");
              setResponse("");
              setHasResponded(false);
              inputRef.current?.focus();
            }}
            style={{
              marginBottom: "1.5rem",
              padding: "0.4rem 1.1rem",
              borderRadius: 999,
              border: "1px solid hsla(30, 10%, 60%, 0.2)",
              background: "transparent",
              color: "hsl(30, 8%, 55%)",
              fontFamily: P.font,
              fontSize: "0.72rem",
              letterSpacing: "0.04em",
              cursor: "pointer",
              transition: "all 0.3s",
            }}
          >
            ask again
          </motion.button>
        )}
      </AnimatePresence>

      {/* Input + Prompts wrapper — same width */}
      <div style={{
        width: "100%",
        maxWidth: isMobile ? "100%" : 500,
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
      }}>
        {!hasResponded && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{ position: "relative" }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder={placeholder}
              style={{
                width: "100%",
                padding: isMobile ? "1rem 1.25rem" : "1.25rem 1.5rem",
                borderRadius: 999,
                border: "1px solid hsla(30, 10%, 60%, 0.2)",
                background: "hsla(0, 0%, 100%, 0.03)",
                color: P.text,
                fontFamily: P.font,
                fontSize: isMobile ? "0.95rem" : "1.05rem",
                outline: "none",
                textAlign: "center",
                transition: "border-color 0.3s, background 0.3s",
              }}
            />
            {/* Submit Arrow (only if text) */}
            <AnimatePresence>
              {input.trim() && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={handleSubmit}
                  style={{
                    position: "absolute",
                    right: 8,
                    top: 8,
                    bottom: 8,
                    width: 40,
                    borderRadius: "50%",
                    background: P.text,
                    color: P.bgSolid,
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
