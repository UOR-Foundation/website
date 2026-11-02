import { FEEDBACK_URL } from "@/agent/site";
import { useEffect } from "react";
import { ArrowUpRight } from "lucide-react";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/jetbrains-mono/400.css";
import uorIcon from "@/assets/uor-icon.svg";
import bill from "@/assets/board/bill-wright.jpg.asset.json";
import alex from "@/assets/board/alex-flom.jpg.asset.json";
import tirath from "@/assets/board/tirath-virdee.jpg.asset.json";
import ilya from "@/assets/board/ilya-paveliev.jpg.asset.json";
import john from "@/assets/board/john-haines-v2.jpg.asset.json";
import { DISCORD_URL } from "@/site/links";
import SiteHeader from "@/site/SiteHeader";
import { FD_BODY, FD_CARD, FD_CATEGORY, FD_COLUMN, FD_EYEBROW, FD_HERO, FD_LEAD, FD_SECTION } from "@/site/type";
import { BOARD, CLOSE, DOCS, FOCUS, INTRO } from "./content";

const PHOTOS: Record<string, string> = { bill: bill.url, alex: alex.url, tirath: tirath.url, ilya: ilya.url, john: john.url };
const primary = "rounded-full bg-[hsl(var(--fd-fg))] px-7 py-3.5 text-base font-medium text-[hsl(var(--fd-bg))] transition-colors hover:bg-[hsl(var(--fd-accent))]";

function Label({ children }: { children: string }) {
  return <p className={`${FD_EYEBROW} mb-5`}>// {children.toUpperCase()}</p>;
}

export default function About() {
  useEffect(() => { document.title = "About · The UOR Foundation"; window.scrollTo(0, 0); }, []);
  const sec = "fd-sec mx-auto max-w-7xl px-6 py-28";

  return (
    <div className="foundation min-h-screen bg-[hsl(var(--fd-bg))] text-[hsl(var(--fd-fg))]">
      <SiteHeader />

      <main>
        <section className="mx-auto max-w-7xl px-6 pb-24 pt-28 md:pt-36">
          <Label>{INTRO.label}</Label>
          <h1 className={FD_HERO}>{INTRO.title}</h1>
          <p className={`${FD_LEAD} mt-7 max-w-2xl text-balance`}>{INTRO.line}</p>
          <a href={INTRO.cta.href} target="_blank" rel="noreferrer" className={`${primary} mt-10 inline-flex items-center gap-2`}>{INTRO.cta.label}<ArrowUpRight className="h-4 w-4" /></a>
        </section>

        <section className={sec}>
          <Label>{FOCUS.label}</Label>
          <h2 className={FD_SECTION}>{FOCUS.title}</h2>
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {FOCUS.items.map((f, i) => (
              <div key={f.t} className="rounded-2xl border border-[hsl(var(--fd-line))] bg-[hsl(var(--fd-panel))] p-8">
                <p className={FD_CATEGORY}>0{i + 1}</p>
                <h3 className={`${FD_COLUMN} mt-5`}>{f.t}</h3>
                <p className="mt-3 text-base leading-relaxed text-[hsl(var(--fd-dim))]">{f.b}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={sec}>
          <Label>{BOARD.label}</Label>
          <h2 className={FD_SECTION}>{BOARD.title}</h2>
          <p className={`${FD_BODY} mt-7 max-w-xl`}>{BOARD.line}</p>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {BOARD.members.map((m) => (
              <a key={m.name} href={m.href} target="_blank" rel="noreferrer" className="group flex flex-col rounded-2xl border border-[hsl(var(--fd-line))] bg-[hsl(var(--fd-panel))] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[hsl(var(--fd-accent)/0.5)]">
                <span className="fd-contrib-hex"><img src={PHOTOS[m.photo]} alt={m.name} loading="lazy" /></span>
                <h3 className={`${FD_CARD} mt-6`}>{m.name}</h3>
                <p className={`${FD_CATEGORY} mt-2`}>{m.role}</p>
                <p className="mt-4 text-sm leading-relaxed text-[hsl(var(--fd-dim))]">{m.bio}</p>
                <span className="mt-auto inline-flex items-center gap-1 pt-6 text-sm text-[hsl(var(--fd-dim))] group-hover:text-[hsl(var(--fd-fg))]">LinkedIn<ArrowUpRight className="h-3.5 w-3.5" /></span>
              </a>
            ))}
          </div>
        </section>

        <section className={sec}>
          <Label>{DOCS.label}</Label>
          <h2 className={FD_SECTION}>{DOCS.title}</h2>
          <div className="mt-14 border-t border-[hsl(var(--fd-line))]">
            {DOCS.items.map((d) => (
              <a key={d.t} href={d.href} target="_blank" rel="noreferrer" className="group flex items-center justify-between border-b border-[hsl(var(--fd-line))] py-6 transition-colors hover:text-[hsl(var(--fd-accent))]">
                <span className="fd-head text-xl font-medium md:text-2xl">{d.t}</span>
                <ArrowUpRight className="h-5 w-5 text-[hsl(var(--fd-dim))] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </a>
            ))}
          </div>
        </section>

        <section className={`${sec} text-center`}>
          <h2 className={FD_SECTION}>{CLOSE.title}</h2>
          <span className="fd-spectrum fd-spectrum-lift mt-10">
            <a href={DISCORD_URL} target="_blank" rel="noreferrer" className={`${primary} relative z-10`}>{CLOSE.cta}</a>
          </span>
        </section>
      </main>

      <footer className="pt-8">
        <div className="fd-wordmark-wrap fd-wm-solid mx-auto max-w-7xl px-6">
          <div className="fd-wordmark-row"><div className="fd-wm-row-inner">
            <span aria-hidden="true" className="fd-wm-mask" style={{ ["--wm-icon" as string]: `url(${uorIcon})` }} />
            <span className="fd-wordmark" data-text="UOR Foundation">UOR Foundation</span>
          </div></div>
        </div>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-6 py-10 text-base text-[hsl(var(--fd-dim))] sm:justify-between">
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
            <a href="/about/" className="transition-colors hover:text-[hsl(var(--fd-fg))]">About</a>
            <a href="/agents/" className="transition-colors hover:text-[hsl(var(--fd-fg))]">Agents</a>
            <a href={FEEDBACK_URL} target="_blank" rel="noreferrer" className="transition-colors hover:text-[hsl(var(--fd-fg))]">Website feedback</a>
          </div>
          <span>© 2026 The UOR Foundation.</span>
        </div>
      </footer>
    </div>
  );
}
