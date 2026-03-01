/**
 * LegalPanel — Graceful bottom-reveal legal content canvas.
 *
 * Inspired by Hedosophia's elegant minimalism. The panel rises from the
 * bottom of the viewport with a smooth spring-like transition, pushing
 * the main content up and dimming the background. Fully scrollable
 * for long-form legal text. Collapse by clicking the close bar or
 * pressing Escape.
 */

import { useState, useEffect, useRef } from "react";
import { ChevronDown } from "lucide-react";
import {
  DURATION_OVERLAY_MS,
  DURATION_BACKDROP_MS,
  EASE_PROJECT,
  EASE_DISMISS,
} from "@/modules/hologram-ui/theme/projection-transitions";

// ── Types ──────────────────────────────────────────────────────────────────

type LegalTab = "privacy" | "terms" | "principles";

interface LegalPanelProps {
  open: boolean;
  initialTab?: LegalTab;
  onClose: () => void;
  bgMode?: "dark" | "white";
}

// ── Palette ────────────────────────────────────────────────────────────────

const palette = (isDark: boolean) => ({
  bg: isDark ? "hsl(0, 0%, 5%)" : "hsl(38, 20%, 97%)",
  text: isDark ? "hsl(38, 12%, 78%)" : "hsl(30, 8%, 30%)",
  textMuted: isDark ? "hsl(30, 8%, 50%)" : "hsl(30, 8%, 55%)",
  heading: isDark ? "hsl(38, 15%, 90%)" : "hsl(30, 10%, 18%)",
  border: isDark ? "hsla(38, 12%, 30%, 0.2)" : "hsla(30, 10%, 70%, 0.25)",
  tab: isDark ? "hsla(38, 12%, 80%, 0.6)" : "hsla(30, 8%, 40%, 0.6)",
  tabActive: isDark ? "hsl(38, 40%, 65%)" : "hsl(30, 30%, 35%)",
  handleBar: isDark ? "hsla(0, 0%, 100%, 0.12)" : "hsla(0, 0%, 0%, 0.1)",
});

// ── Component ──────────────────────────────────────────────────────────────

export default function LegalPanel({ open, initialTab = "privacy", onClose, bgMode = "dark" }: LegalPanelProps) {
  const [tab, setTab] = useState<LegalTab>(initialTab);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDark = bgMode === "dark";
  const P = palette(isDark);
  const [mounted, setMounted] = useState(false);
  const [contentKey, setContentKey] = useState(0);

  // Keep-alive mount + reset tab on open
  useEffect(() => {
    if (open) {
      setMounted(true);
      setTab(initialTab);
      scrollRef.current?.scrollTo({ top: 0 });
    }
  }, [open, initialTab]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const font = "'DM Sans', system-ui, sans-serif";
  const fontDisplay = "'Playfair Display', serif";

  if (!mounted) return null;

  return (
    <>
      {/* Backdrop — pure CSS opacity */}
      <div
        className="fixed inset-0 z-[60]"
        style={{
          background: isDark ? "hsla(0, 0%, 0%, 0.5)" : "hsla(0, 0%, 0%, 0.2)",
          opacity: open ? 1 : 0,
          transition: `opacity ${DURATION_BACKDROP_MS}ms ease-out`,
          pointerEvents: open ? "auto" : "none",
        }}
        onClick={onClose}
      />

      {/* Panel — GPU-promoted translateY from bottom */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[61] flex flex-col"
        style={{
          top: "clamp(80px, 12vh, 140px)",
          background: P.bg,
          borderTop: `1px solid ${P.border}`,
          borderRadius: "20px 20px 0 0",
          fontFamily: font,
          transform: open ? "translate3d(0, 0, 0)" : "translate3d(0, 100%, 0)",
          opacity: open ? 1 : 0,
          transition: open
            ? `transform ${DURATION_OVERLAY_MS}ms ${EASE_PROJECT}, opacity ${Math.round(DURATION_OVERLAY_MS * 0.5)}ms ${EASE_PROJECT}`
            : `transform ${DURATION_OVERLAY_MS}ms ${EASE_DISMISS}, opacity ${Math.round(DURATION_OVERLAY_MS * 0.3)}ms ease-out`,
          pointerEvents: open ? "auto" : "none",
          willChange: open ? "transform, opacity" : "auto",
          contain: "layout style",
        }}
      >
        {/* Handle bar + close icon */}
        <div className="flex items-center justify-between px-6 pt-4 pb-3">
          <div className="w-7" />
          <button
            onClick={onClose}
            className="cursor-pointer group"
            aria-label="Close"
          >
            <div
              className="w-10 h-[3px] rounded-full transition-all duration-300 group-hover:w-14"
              style={{ background: P.handleBar }}
            />
          </button>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full transition-all duration-300 hover:scale-110"
            style={{
              background: isDark ? "hsla(0, 0%, 100%, 0.05)" : "hsla(0, 0%, 0%, 0.04)",
              color: P.textMuted,
            }}
            aria-label="Collapse"
          >
            <ChevronDown size={14} strokeWidth={1.5} />
          </button>
        </div>

        {/* Tab switcher */}
        <div
          className="flex items-center justify-center gap-8 pb-4"
          style={{ borderBottom: `1px solid ${P.border}` }}
        >
          {(["principles", "privacy", "terms"] as LegalTab[]).map((t) => (
            <button
              key={t}
              onClick={() => {
                setTab(t);
                setContentKey(k => k + 1);
                scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="relative pb-2 transition-colors duration-300"
              style={{
                fontFamily: font,
                fontSize: "11px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: tab === t ? P.tabActive : P.tab,
                fontWeight: tab === t ? 600 : 400,
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              {t === "privacy" ? "Privacy Policy" : t === "terms" ? "Terms of Use" : "Our Principles"}
              {/* Active indicator line — pure CSS */}
              <div
                className="absolute bottom-0 left-0 right-0 h-[1px]"
                style={{
                  background: P.tabActive,
                  transform: tab === t ? "scaleX(1)" : "scaleX(0)",
                  opacity: tab === t ? 1 : 0,
                  transition: "transform 200ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease",
                }}
              />
            </button>
          ))}
        </div>

        {/* Scrollable content */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto overscroll-contain"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: `${P.border} transparent`,
          }}
        >
          <div className="max-w-2xl mx-auto px-8 py-10 pb-16">
            <div
              key={contentKey}
              style={{
                animation: "legal-tab-enter 250ms cubic-bezier(0.22, 1, 0.36, 1) both",
              }}
            >
              {tab === "privacy" ? (
                <PrivacyContent P={P} fontDisplay={fontDisplay} />
              ) : tab === "terms" ? (
                <TermsContent P={P} fontDisplay={fontDisplay} />
              ) : (
                <PrinciplesContent P={P} fontDisplay={fontDisplay} />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Shared styles ──────────────────────────────────────────────────────────

const InlineLink = ({ href, children, P }: { href: string; children: React.ReactNode; P: ReturnType<typeof palette> }) => (
  <a
    href={href}
    target={href.startsWith("http") ? "_blank" : undefined}
    rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
    style={{
      color: P.tabActive,
      textDecoration: "none",
      borderBottom: `1px solid ${P.tabActive}44`,
      transition: "border-color 0.3s",
    }}
    onMouseEnter={(e) => (e.currentTarget.style.borderColor = P.tabActive)}
    onMouseLeave={(e) => (e.currentTarget.style.borderColor = `${P.tabActive}44`)}
  >
    {children}
  </a>
);

const Section = ({ title, children, P, fontDisplay }: { title: string; children: React.ReactNode; P: ReturnType<typeof palette>; fontDisplay: string }) => (
  <section className="mb-12">
    <h2
      className="text-lg font-light tracking-wide mb-5"
      style={{ fontFamily: fontDisplay, color: P.heading }}
    >
      {title}
    </h2>
    <div
      className="space-y-4 text-[16px] leading-[2]"
      style={{ color: P.text }}
    >
      {children}
    </div>
  </section>
);

// ── Privacy Policy (template) ──────────────────────────────────────────────

function PrivacyContent({ P, fontDisplay }: { P: ReturnType<typeof palette>; fontDisplay: string }) {
  return (
    <article>
      <h1
        className="text-2xl font-light tracking-wide mb-2"
        style={{ fontFamily: fontDisplay, color: P.heading }}
      >
        Privacy by Default
      </h1>
      <p className="text-[13px] tracking-wider uppercase mb-5" style={{ color: P.textMuted }}>
        Last updated: February 2026
      </p>
      <p
        className="text-[16px] leading-[2] mb-12"
        style={{ color: P.text }}
      >
        Most platforms write a privacy policy to protect themselves. Hologram is different. We give you the infrastructure and tools to create your own. Privacy is not a feature we bolt on. It is the architecture itself.
      </p>

      <Section title="1. Our Default: Store Nothing" P={P} fontDisplay={fontDisplay}>
        <p>
          By default, Hologram aims to store as little information about you as possible. Your identity is derived from your email handle, which we use only to verify you are you. We do not store it as personal data or use it to build a profile about you.
        </p>
        <p>
          There is no hidden data collection. No behavioural tracking. No advertising profiles. No third-party analytics. The platform is designed from the ground up to function without needing to know who you are beyond what you choose to share.
        </p>
      </Section>

      <Section title="2. Zero Knowledge by Design" P={P} fontDisplay={fontDisplay}>
        <p>
          Hologram is built on zero knowledge principles. This means you can prove things about yourself, that your identity is valid, that you meet a requirement, that you hold a credential, without disclosing the underlying information.
        </p>
        <p>
          Think of it like proving you are over 18 without showing your date of birth, or confirming you are a member without revealing your name. The platform's architecture makes this the default, not an option you have to enable.
        </p>
      </Section>

      <Section title="3. Selective Disclosure: You Choose What to Reveal" P={P} fontDisplay={fontDisplay}>
        <p>
          Your information is private by default. Sharing anything requires an active, deliberate choice on your part. Hologram uses a layered disclosure model:
        </p>
        <ul className="space-y-3 pl-1 mt-3" style={{ listStyle: "none" }}>
          <li className="flex gap-2.5 items-start">
            <span style={{ color: P.tabActive, fontSize: "9px", marginTop: "9px" }}>◆</span>
            <span><strong style={{ color: P.heading }}>Default: fully private</strong>. Nothing is shared with anyone. No application, service, or user can see your information unless you grant access.</span>
          </li>
          <li className="flex gap-2.5 items-start">
            <span style={{ color: P.tabActive, fontSize: "9px", marginTop: "9px" }}>◆</span>
            <span><strong style={{ color: P.heading }}>Step by step opt out</strong>. Revealing information is a graduated process. You choose what to share, with whom, and for how long. Each step requires your explicit action.</span>
          </li>
          <li className="flex gap-2.5 items-start">
            <span style={{ color: P.tabActive, fontSize: "9px", marginTop: "9px" }}>◆</span>
            <span><strong style={{ color: P.heading }}>Revocable at any time</strong>. Any disclosure you make can be withdrawn. Access you have granted can be removed. You are always in control.</span>
          </li>
        </ul>
      </Section>

      <Section title="4. Your Privacy Policy, Not Ours" P={P} fontDisplay={fontDisplay}>
        <p>
          Hologram provides programmatic tools for you to define your own privacy policy. Rather than accepting a document written by a company to protect itself, you create rules that protect you.
        </p>
        <p>
          These tools allow you to specify what data you are willing to share, under what conditions, with which applications, and for how long. When an application wants to interact with your information, it must meet <em style={{ color: P.tabActive }}>your</em> terms, not the other way around.
        </p>
        <p>
          This is the foundation of Hologram's privacy architecture: you write the rules, and the system enforces them.
        </p>
      </Section>

      <Section title="5. What We Never Do" P={P} fontDisplay={fontDisplay}>
        <p>
          We do not sell your data. We do not share it with advertisers. We do not use third-party trackers. We do not build behavioural profiles. We do not monetise your personal information in any way. There is no advertising on Hologram, and there never will be.
        </p>
      </Section>

      <Section title="6. Contact" P={P} fontDisplay={fontDisplay}>
        <p>
          If you have questions about how privacy works on Hologram or need help configuring your privacy settings, reach out through our community channels. We are committed to transparency.
        </p>
      </Section>
    </article>
  );
}
// ── Terms of Use (template) ────────────────────────────────────────────────

function TermsContent({ P, fontDisplay }: { P: ReturnType<typeof palette>; fontDisplay: string }) {
  return (
    <article>
      <h1
        className="text-2xl font-light tracking-wide mb-2"
        style={{ fontFamily: fontDisplay, color: P.heading }}
      >
        Terms of Use
      </h1>
      <p className="text-[13px] tracking-wider uppercase mb-5" style={{ color: P.textMuted }}>
        Last updated: February 2026
      </p>
      <p
        className="text-[16px] leading-[2] mb-12"
        style={{ color: P.text }}
      >
        Hologram is built on a simple premise: your information is yours. We do not
        write terms to protect ourselves from you. We build infrastructure that
        protects you and gives you the tools to define your own terms for how
        applications interact with your data.
      </p>

      <Section title="1. Privacy Is the Default" P={P} fontDisplay={fontDisplay}>
        <p>
          When you use Hologram, privacy is not something you opt into. It is where
          you start. By default, we store the absolute minimum: your identity is
          anchored to your email handle, which we do not retain on our servers. No
          profiles are built, no behaviour is tracked, no data is mined.
        </p>
        <p>
          To share anything about yourself, you must actively choose to do so. Every
          piece of information you reveal is a deliberate, reversible decision, not
          a checkbox buried in a settings page.
        </p>
      </Section>

      <Section title="2. Zero Knowledge Verification" P={P} fontDisplay={fontDisplay}>
        <p>
          Hologram enables you to prove things about yourself, such as your age, your
          credentials, or your membership, without disclosing the underlying information.
          Applications can confirm what they need to know without ever seeing what
          they do not need to know.
        </p>
        <p>
          This means you can participate fully in digital experiences while revealing
          nothing more than what is strictly necessary. Verification without exposure.
        </p>
      </Section>

      <Section title="3. Selective Disclosure: You Choose" P={P} fontDisplay={fontDisplay}>
        <p>
          Traditional platforms operate on an all or nothing model: accept our terms
          or leave. Hologram reverses this entirely. You decide:
        </p>
        <ul className="space-y-3 pl-1 mt-3" style={{ listStyle: "none" }}>
          <li className="flex gap-2.5 items-start">
            <span style={{ color: P.tabActive, fontSize: "9px", marginTop: "9px" }}>◆</span>
            <span><strong style={{ color: P.heading }}>What to reveal</strong> — share specific attributes without exposing the full picture. An app can know you are over 18 without knowing your date of birth.</span>
          </li>
          <li className="flex gap-2.5 items-start">
            <span style={{ color: P.tabActive, fontSize: "9px", marginTop: "9px" }}>◆</span>
            <span><strong style={{ color: P.heading }}>To whom</strong> — each application or service must request access individually. No blanket permissions, no cascading consent.</span>
          </li>
          <li className="flex gap-2.5 items-start">
            <span style={{ color: P.tabActive, fontSize: "9px", marginTop: "9px" }}>◆</span>
            <span><strong style={{ color: P.heading }}>When and for how long</strong> — set time limited disclosures that automatically expire. You can revoke access at any moment, and connected services are notified immediately.</span>
          </li>
        </ul>
      </Section>

      <Section title="4. Your Terms, Not Ours" P={P} fontDisplay={fontDisplay}>
        <p>
          Hologram gives you the programmatic tools to create your own machine readable
          privacy policy. This is not a template you fill in. It is a real, enforceable
          set of rules that applications must accept before they can interact with your data.
        </p>
        <p>
          This approach is inspired by the{" "}
          <InlineLink href="https://myterms.info/" P={P}>MyTerms</InlineLink>{" "}
          standard (IEEE 7012), which was designed to put individuals, not corporations,
          in control of personal data exchange. When an app cannot meet your conditions,
          it simply does not get access.
        </p>
      </Section>

      <Section title="5. Opting Out of Privacy" P={P} fontDisplay={fontDisplay}>
        <p>
          Privacy on Hologram is not a setting you turn on. It is the foundation you
          would have to deliberately step away from. Revealing information requires
          explicit, incremental steps:
        </p>
        <ul className="space-y-3 pl-1 mt-3" style={{ listStyle: "none" }}>
          <li className="flex gap-2.5 items-start">
            <span style={{ color: P.tabActive, fontSize: "9px", marginTop: "9px" }}>1</span>
            <span>You choose to share a specific piece of information.</span>
          </li>
          <li className="flex gap-2.5 items-start">
            <span style={{ color: P.tabActive, fontSize: "9px", marginTop: "9px" }}>2</span>
            <span>You choose who receives it.</span>
          </li>
          <li className="flex gap-2.5 items-start">
            <span style={{ color: P.tabActive, fontSize: "9px", marginTop: "9px" }}>3</span>
            <span>You choose how long they can keep it.</span>
          </li>
          <li className="flex gap-2.5 items-start">
            <span style={{ color: P.tabActive, fontSize: "9px", marginTop: "9px" }}>4</span>
            <span>You can reverse any of these decisions at any time.</span>
          </li>
        </ul>
        <p className="mt-4">
          There is no "share everything" button. Every disclosure is a conscious act.
        </p>
      </Section>

      <Section title="6. What We Commit To" P={P} fontDisplay={fontDisplay}>
        <ul className="space-y-3 pl-1" style={{ listStyle: "none" }}>
          <li className="flex gap-2.5 items-start">
            <span style={{ color: P.tabActive, fontSize: "9px", marginTop: "9px" }}>◆</span>
            <span>We will never sell, trade, or monetise your personal information.</span>
          </li>
          <li className="flex gap-2.5 items-start">
            <span style={{ color: P.tabActive, fontSize: "9px", marginTop: "9px" }}>◆</span>
            <span>We will never build behavioural profiles or serve targeted advertising.</span>
          </li>
          <li className="flex gap-2.5 items-start">
            <span style={{ color: P.tabActive, fontSize: "9px", marginTop: "9px" }}>◆</span>
            <span>We will never use your data to train AI models without your explicit, informed, revocable consent.</span>
          </li>
          <li className="flex gap-2.5 items-start">
            <span style={{ color: P.tabActive, fontSize: "9px", marginTop: "9px" }}>◆</span>
            <span>We will continue to minimise our own data footprint, storing less, not more, over time.</span>
          </li>
        </ul>
      </Section>

      <Section title="7. Built on an Open Standard" P={P} fontDisplay={fontDisplay}>
        <p>
          The infrastructure behind your personal terms is based on{" "}
          <InlineLink href="https://myterms.info/" P={P}>MyTerms</InlineLink>{" "}
          (IEEE 7012), a published global standard for machine readable personal privacy.
          It is not proprietary. It is open, auditable, and designed so that privacy
          is something you can see, control, and trust.
        </p>
      </Section>

      <Section title="8. Contact" P={P} fontDisplay={fontDisplay}>
        <p>
          Questions about these terms or your privacy? Reach us at{" "}
          <InlineLink href="mailto:privacy@hologram.xyz" P={P}>privacy@hologram.xyz</InlineLink>.
        </p>
      </Section>
    </article>
  );
}

// ── Our Principles ─────────────────────────────────────────────────────────

function PrinciplesContent({ P, fontDisplay }: { P: ReturnType<typeof palette>; fontDisplay: string }) {
  return (
    <article>
      <h1
        className="text-2xl font-light tracking-wide mb-2"
        style={{ fontFamily: fontDisplay, color: P.heading }}
      >
        Our Principles
      </h1>
      <p className="text-[13px] tracking-wider uppercase mb-5" style={{ color: P.textMuted }}>
        What we believe and how it shapes everything
      </p>
      <p
        className="text-[16px] leading-[2] mb-12"
        style={{ color: P.text }}
      >
        Hologram exists for one reason: to give you technology that actually works for you. Not technology that watches you. Not technology that nudges you toward someone else's goals. Technology that respects your time, protects your information, and helps you think clearly. These are the principles that make that real.
      </p>

      {/* ── Part 1: You Come First ── */}
      <Section title="Part 1: You Come First" P={P} fontDisplay={fontDisplay}>
        <p>
          Everything starts here. Your data belongs to you. Your attention belongs to you. Your identity belongs to you. Hologram never collects information behind your back, never sells your behaviour, and never treats you as a product. There is no surveillance. There is no telemetry you did not ask for. There are no dark patterns designed to keep you scrolling.
        </p>
        <p>
          When you use Hologram, the system adapts to you. When you are focused, it goes quiet. When you are exploring, it opens up. It reads the room, not your inbox.
        </p>
      </Section>

      {/* ── Part 2: The Eight Guarantees ── */}
      <Section title="Part 2: The Eight Guarantees" P={P} fontDisplay={fontDisplay}>
        <p>
          These are not aspirations. They are structural constraints built into the system's foundation. They cannot be turned off, overridden, or bypassed. Not by us. Not by any application. Not by any AI.
        </p>

        <div className="mt-6 space-y-5">
          <Principle n="01" title="Your data stays with you" P={P} fontDisplay={fontDisplay}>
            No background collection. No silent uploads. No analytics you did not consent to. Processing happens within your boundary, and nothing leaves without your explicit choice.
          </Principle>

          <Principle n="02" title="No fabrication" P={P} fontDisplay={fontDisplay}>
            Every claim is grounded in real data. If the system is uncertain, it tells you. It will never generate confident sounding answers it cannot back up. In a world of hallucinating AI, this is the line we do not cross.
          </Principle>

          <Principle n="03" title="Full transparency" P={P} fontDisplay={fontDisplay}>
            Every operation is recorded in a tamper proof log. You can see what happened, when, and why. Nothing runs in the dark.
          </Principle>

          <Principle n="04" title="Honesty over comfort" P={P} fontDisplay={fontDisplay}>
            The system will never tell you what you want to hear if it is not true. Low confidence? It says so. Does not know? It says that too. Truth always comes before a smooth experience.
          </Principle>

          <Principle n="05" title="You stay in control" P={P} fontDisplay={fontDisplay}>
            No destructive action happens without your explicit confirmation. The system cannot delete your data, revoke your access, or take irreversible steps on its own.
          </Principle>

          <Principle n="06" title="Proportional response" P={P} fontDisplay={fontDisplay}>
            Small signal, small suggestion. The system cannot make a sweeping change based on weak evidence. The weight of any action always matches the weight of the evidence behind it.
          </Principle>

          <Principle n="07" title="Trust is earned" P={P} fontDisplay={fontDisplay}>
            Every agent, tool, and integration starts with limited permissions and earns more over time through reliability. This is how trust works between people. It is how it works here.
          </Principle>

          <Principle n="08" title="Your success is the measure" P={P} fontDisplay={fontDisplay}>
            No engagement traps. No extraction. Every feature exists because it genuinely helps you learn, create, or connect. If it does not serve you, it does not belong here.
          </Principle>
        </div>
      </Section>

      {/* ── Part 3: AI That Serves You ── */}
      <Section title="Part 3: AI That Serves You" P={P} fontDisplay={fontDisplay}>
        <p>
          Hologram includes a native AI called <strong style={{ color: P.heading }}>Lumen</strong>. It is capable, fast, and governed by the same eight guarantees above. But it is your co-pilot, not your replacement.
        </p>
        <p>
          You set the intention. You monitor the outcome. You bring what only humans can: creativity, judgment, the ability to reframe a problem entirely. Lumen supports your decisions. It does not make them for you. And when it does not have a good answer, it stays quiet rather than guessing.
        </p>
      </Section>

      {/* ── Part 4: Safety by Structure ── */}
      <Section title="Part 4: Safety by Structure" P={P} fontDisplay={fontDisplay}>
        <p>
          Most AI safety relies on rules that can be bypassed. Hologram takes a different approach: it confines AI within a mathematical structure where unsafe behaviour is not just discouraged, it is impossible. Think of it as a landscape with no cliff edges, rather than a landscape full of warning signs.
        </p>

        {/* Visual: Confinement vs Rules */}
        <div
          className="my-10 flex flex-col sm:flex-row gap-6 sm:gap-8"
          style={{ fontSize: "13px", lineHeight: 1.7 }}
        >
          <div className="flex-1 rounded-lg p-5" style={{ border: `1px solid ${P.border}`, background: "hsla(0,0%,100%,0.02)" }}>
            <div className="text-center mb-4">
              <span className="text-[11px] tracking-[0.2em] uppercase" style={{ color: P.textMuted }}>
                Traditional approach
              </span>
              <p className="mt-1 font-medium" style={{ color: P.heading, fontFamily: fontDisplay }}>
                Rules &amp; Guidelines
              </p>
            </div>
            <div
              className="relative mx-auto rounded-md flex items-end justify-center overflow-hidden"
              style={{
                width: "100%",
                height: "100px",
                background: "linear-gradient(180deg, hsla(0,0%,100%,0.03) 0%, hsla(0,50%,50%,0.06) 100%)",
                border: "1px dashed hsla(0,50%,60%,0.25)",
              }}
            >
              {["18%", "45%", "72%"].map((left, i) => (
                <div
                  key={i}
                  className="absolute"
                  style={{
                    left,
                    top: `${20 + i * 18}%`,
                    fontSize: "9px",
                    letterSpacing: "0.1em",
                    color: "hsla(0,40%,65%,0.7)",
                    transform: `rotate(${-5 + i * 4}deg)`,
                    whiteSpace: "nowrap",
                  }}
                >
                  ⚠ {["do not cross", "stop here", "caution"][i]}
                </div>
              ))}
              <div
                className="absolute rounded-full"
                style={{
                  width: 8, height: 8,
                  background: "hsla(0,50%,65%,0.8)",
                  boxShadow: "0 0 8px hsla(0,50%,60%,0.4)",
                  top: "30%", left: "60%",
                }}
              />
            </div>
            <p className="text-center mt-3" style={{ color: P.textMuted, fontSize: "12px" }}>
              Open space with warning signs.
              <br />
              The AI <em>chooses</em> to obey.
            </p>
          </div>

          <div className="flex-1 rounded-lg p-5" style={{ border: "1px solid hsla(38,30%,50%,0.2)", background: "hsla(38,20%,50%,0.04)" }}>
            <div className="text-center mb-4">
              <span className="text-[11px] tracking-[0.2em] uppercase" style={{ color: P.tabActive }}>
                Hologram approach
              </span>
              <p className="mt-1 font-medium" style={{ color: P.heading, fontFamily: fontDisplay }}>
                Structural Confinement
              </p>
            </div>
            <div
              className="relative mx-auto flex items-center justify-center"
              style={{ width: "100%", height: "100px" }}
            >
              <div
                className="absolute rounded-full"
                style={{
                  width: 90, height: 90,
                  border: "1.5px solid hsla(38,40%,55%,0.4)",
                  background: "hsla(38,30%,50%,0.06)",
                  left: "50%", top: "50%",
                  transform: "translate(-50%, -50%)",
                }}
              />
              <div
                className="absolute rounded-full"
                style={{
                  width: 50, height: 50,
                  border: "1px solid hsla(38,40%,55%,0.25)",
                  background: "hsla(38,30%,50%,0.08)",
                  left: "50%", top: "50%",
                  transform: "translate(-50%, -50%)",
                }}
              />
              <div
                className="absolute rounded-full"
                style={{
                  width: 8, height: 8,
                  background: "hsla(38,50%,60%,0.9)",
                  boxShadow: "0 0 10px hsla(38,50%,55%,0.5)",
                  left: "50%", top: "50%",
                  transform: "translate(-50%, -50%)",
                }}
              />
              <span
                className="absolute text-[9px] tracking-[0.15em]"
                style={{ color: P.textMuted, right: "8%", top: "12%" }}
              >
                boundary
              </span>
            </div>
            <p className="text-center mt-3" style={{ color: P.textMuted, fontSize: "12px" }}>
              Bounded space with no edges to fall from.
              <br />
              The AI <em>cannot</em> leave.
            </p>
          </div>
        </div>

        <p>
          This makes safety a structural guarantee, not a behavioural hope. It does not depend on the AI choosing to be good. The boundaries are mathematical. They hold regardless.
        </p>
      </Section>

      {/* ── Part 5: The Promise ── */}
      <Section title="Part 5: The Promise" P={P} fontDisplay={fontDisplay}>
        <p>
          You deserve technology that treats you as its purpose, not its resource. Hologram is built on that belief. The eight guarantees are not marketing copy. They are mathematical constraints fused into every layer of the system. They apply to every operation, every user, and every AI equally.
        </p>
        <p>
          Not a promise. A proof.
        </p>
      </Section>
    </article>
  );
}

// ── Principle Item ─────────────────────────────────────────────────────────

function Principle({
  n, title, children, P, fontDisplay,
}: {
  n: string; title: string; children: React.ReactNode;
  P: ReturnType<typeof palette>; fontDisplay: string;
}) {
  return (
    <div className="flex gap-4 items-start">
      <span
        className="text-[12px] font-light mt-[2px] shrink-0"
        style={{ color: P.tabActive, fontFamily: fontDisplay, minWidth: "20px" }}
      >
        {n}
      </span>
      <div>
        <p className="mb-1.5" style={{ color: P.heading, fontWeight: 500 }}>
          {title}
        </p>
        <p className="text-[15px] leading-[1.9]" style={{ color: P.text }}>
          {children}
        </p>
      </div>
    </div>
  );
}