import { FEEDBACK_URL } from "@/agent/site";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, BookOpen, ChevronLeft, ChevronRight, Check, Copy, Plus, X } from "lucide-react";
import { FD_BODY, FD_CARD, FD_CATEGORY, FD_COLUMN, FD_EYEBROW, FD_HERO, FD_LABEL, FD_LEAD, FD_SECTION } from "./type";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/jetbrains-mono/400.css";
import prismCard from "@/assets/foundation-prism-sharp.jpg";
import uorIcon from "@/assets/uor-icon.svg";
import aaifLogo from "@/assets/aaif-logo.png.asset.json";
import nandaLogo from "@/assets/nanda-logo.png.asset.json";
import alex from "@/assets/contrib/Alex.png";
import tirath from "@/assets/contrib/Tirath.png";
import kat from "@/assets/contrib/Kat.png";
import john from "@/assets/contrib/John.png";
import ilya from "@/assets/contrib/Ilya.png";
import bill from "@/assets/contrib/Bill.png";
import adam from "@/assets/contrib/Adam.png";
import matt from "@/assets/contrib/Matt.png";
import max from "@/assets/contrib/Max.png";
import ari from "@/assets/contrib/Ari.png";
import mark from "@/assets/contrib/Mark.png";
import maura from "@/assets/contrib/Maura.png";
import { ABOUT, CLOSING, FRAMEWORK, HERO, POSTS, RIBBON, STATS } from "./content";
import { DISCORD_URL, GITHUB_ORG_URL, GITHUB_PRISM_URL } from "./links";
import { DiscordMark, GithubMark } from "./BrandIcons";
import MobileMenu from "./MobileMenu";
import BrailleWord from "./BrailleWord";

const NAV = [
  { label: "UOR Framework", target: "about" },
  { label: "Prism SDK", target: "framework" },
  { label: "Community", target: "posts" },
];
const ORGANIZATIONS = [
  { name: "AAIF", href: "https://aaif.io/", image: aaifLogo.url, className: "fd-logo-white max-w-[180px] max-h-12" },
  { name: "MIT Project NANDA", href: "https://www.media.mit.edu/groups/nanda/overview/", image: nandaLogo.url, className: "fd-logo-white max-w-[190px] max-h-20" },
];
const CONTRIBUTORS = [
  { name: "Alex", role: "Chief Scientist @ UOR", image: alex },
  { name: "Tirath", role: "Chief Scientist @ Xenesis", image: tirath },
  { name: "Kat", role: "Engineer @ Cisco", image: kat },
  { name: "John", role: "Solutions Architect @ DoD Business Systems", image: john },
  { name: "Maura", role: "Ecosystem @ UOR", image: maura },
  { name: "Bill", role: "Chairman @ Enterprise Neurosystems", image: bill },
  { name: "Adam", role: "Founder @ ØDX", image: adam },
  { name: "Ilya", role: "Founding Partner @ Arete Capital", image: ilya },
  { name: "Ari", role: "Founder @ MVM", image: ari },
  { name: "Mark", role: "AI Researcher", image: mark },
  { name: "Max", role: "Engineer @ Maitai (YC S24)", image: max },
  { name: "Matt", role: "Founder @ DecentraNet", image: matt },
];

function Label({ children }: { children: string }) {
  return <p className={`${FD_EYEBROW} mb-5`}>// {children.toUpperCase()}</p>;
}

export default function FoundationHome() {
  const rail = useRef<HTMLDivElement>(null);
  const slide = (d: number) => { const r = rail.current; if (r) r.scrollBy({ left: d * r.clientWidth * 0.9, behavior: "smooth" }); };

  const [ribbon, setRibbon] = useState(true);
  const [copied, setCopied] = useState(false);
  const [heroCopied, setHeroCopied] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => { const f = () => setScrolled(window.scrollY > 8); f(); window.addEventListener("scroll", f, { passive: true }); return () => window.removeEventListener("scroll", f); }, []);

  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return;
    const t = setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "instant" as ScrollBehavior }), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && e.target.classList.add("fd-in")), { threshold: 0.12 });
    document.querySelectorAll(".fd-reveal").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const h2Main = `${FD_SECTION} text-balance`;
  const primary = "rounded-full bg-[hsl(var(--fd-fg))] px-7 py-3.5 text-base font-medium text-[hsl(var(--fd-bg))] transition-colors hover:bg-[hsl(var(--fd-accent))]";
  const ghost = "rounded-full border border-[hsl(var(--fd-line))] px-7 py-3.5 text-base font-medium transition-colors hover:border-[hsl(var(--fd-fg))]";

  return (
    <div className="foundation fd-home min-h-screen bg-[hsl(var(--fd-bg))] text-[hsl(var(--fd-fg))]">
      {ribbon && (
        <div className="fd-notification relative bg-[hsl(var(--fd-accent))] px-6 py-2.5 text-center text-sm text-[hsl(var(--fd-bg))] sm:px-10">
          <span className="inline">{RIBBON.text}</span>
          <span className="fd-notification-tag">{RIBBON.tag}</span>
          <span className="fd-notification-dot mx-2 opacity-50">•</span>
          <a href="#framework" className="whitespace-nowrap font-semibold underline underline-offset-4">{RIBBON.cta}</a>
          <button aria-label="Close" onClick={() => setRibbon(false)} className="absolute right-4 top-1/2 -translate-y-1/2"><X className="h-4 w-4" /></button>
        </div>
      )}

      <header className={`sticky top-0 z-20 backdrop-blur-md transition-colors duration-300 ${scrolled ? "bg-[hsl(var(--fd-bg)/0.8)]" : "bg-transparent"}`}>
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-6">
          <a href="/" className="fd-head flex shrink-0 items-center gap-3 text-xl font-bold tracking-normal sm:text-2xl">
            <img src={uorIcon} alt="" aria-hidden="true" className="h-8 w-auto shrink-0" />
            <span>UOR Foundation</span>
          </a>
          <div className="flex items-center gap-4 text-lg text-[hsl(var(--fd-dim))] lg:gap-7">
            {NAV.map((n) => (
              <a key={n.label} href={`#${n.target}`} className="hidden whitespace-nowrap hover:text-[hsl(var(--fd-fg))] md:inline">{n.label}</a>
            ))}
            <span aria-hidden className="hidden h-6 w-px bg-[hsl(var(--fd-line-strong))] md:block" />
            <span aria-hidden className="hidden" />
            <div className="hidden items-center gap-4 md:flex">
              <a href={GITHUB_ORG_URL} target="_blank" rel="noreferrer" aria-label="GitHub" title="GitHub" className="transition-colors hover:text-[hsl(var(--fd-fg))]"><GithubMark className="h-[24px] w-[24px]" /></a>
              <a href={DISCORD_URL} target="_blank" rel="noreferrer" aria-label="Discord" className="transition-colors hover:text-[hsl(var(--fd-fg))]"><DiscordMark className="h-[24px] w-[24px]" /></a>
            </div>
            <MobileMenu items={NAV.map((n) => ({ label: n.label, href: `#${n.target}` }))} />
          </div>
        </nav>
        <span aria-hidden className={`fd-header-line transition-opacity duration-500 ${scrolled ? "opacity-100" : "opacity-0"}`} />
      </header>

      <main>
        <div className="fd-fold" style={{ ["--fd-ribbon-h" as string]: ribbon ? "40px" : "0px" }}>
        <section className="fd-fold-hero"><div className="mx-auto max-w-6xl px-6 text-center">
          <h1 className={`${FD_HERO} mx-auto`}>
            {HERO.lead}<br />{HERO.rest}
          </h1>
          <p className={`${FD_LEAD} fd-fold-lead mx-auto mt-[clamp(18px,3.5vh,32px)] max-w-2xl text-balance`}>
            {HERO.sub.split(/(self-verifying|From edge to cloud,)/).map((part, i) =>
              part === "self-verifying" || part === "From edge to cloud," ? (
                <span key={i} className="whitespace-nowrap">
                  {part === "self-verifying" ? <BrailleWord text={part} /> : part}
                </span>
              ) : (
                part
              )
            )}
          </p>
          <p className={`${FD_LABEL} mt-[clamp(28px,6vh,56px)]`}>{HERO.agentSkill.label}</p>
          <span className="fd-spectrum mt-4">
            <button
              onClick={async () => { await navigator.clipboard?.writeText(HERO.agentSkill.command); setHeroCopied(true); setTimeout(() => setHeroCopied(false), 1500); }}
              aria-label="Copy agent skill command"
              className="fd-mono relative z-10 inline-flex items-center gap-3 rounded-full border border-[hsl(var(--fd-line))] bg-[hsl(var(--fd-panel))] max-w-full px-5 py-4 text-sm sm:px-7 sm:text-base transition-colors hover:border-[hsl(var(--fd-dim))]"
            >
              <span className="text-[hsl(var(--fd-dim))]">$</span>
              <span className="truncate">{HERO.agentSkill.command}</span>
              {heroCopied ? <Check className="h-4 w-4 text-[hsl(var(--fd-accent))]" /> : <Copy className="h-4 w-4 text-[hsl(var(--fd-dim))]" />}
            </button>
          </span>
          <p className="fd-hero-steward">{HERO.steward}</p>
        </div></section>
        </div>

        <section className="fd-fold-stats mx-auto w-full max-w-7xl px-6 py-20 md:py-32">
          <div className="grid grid-cols-2 gap-y-[clamp(20px,4vh,48px)] xl:grid-cols-4">
            {STATS.map(([k, v], i) => (
              <div key={k} className={`border-[hsl(var(--fd-line-strong))] px-3 text-center sm:px-6 ${i % 2 === 1 ? "border-l" : ""} xl:border-l ${i === 0 ? "xl:border-l-0" : ""}`}>
                <p className="fd-head fd-fold-stat font-bold tracking-tight">{v}</p>
                <p className="fd-mono mt-[clamp(6px,1.2vh,12px)] text-xs uppercase tracking-[0.2em] sm:text-base text-[hsl(var(--fd-dim))]">{k}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="about" className="fd-reveal fd-sec scroll-mt-16">
          <div className="mx-auto max-w-7xl px-6 py-20 md:py-32">
            <div className="grid gap-12 lg:grid-cols-[1.06fr_1fr] lg:gap-16">
              <div>
                <Label>{ABOUT.label}</Label>
                <h2 className={`${h2Main} whitespace-pre-line`}>{ABOUT.title}</h2>
                <p className={`${FD_LABEL} mt-14 mb-6`}>{ABOUT.orgLabel}</p>
                <div aria-label="Organizations" className="grid max-w-md grid-cols-2 items-center gap-x-10 gap-y-8">
                  {ORGANIZATIONS.map((organization) => (
                    <a key={organization.name} href={organization.href} target="_blank" rel="noreferrer" aria-label={organization.name} className="flex h-20 min-w-0 items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-[hsl(var(--fd-fg))]">
                      <img src={organization.image} alt={organization.name} className={`h-auto w-full object-contain ${organization.className}`} />
                    </a>
                  ))}
                </div>
                <a href={ABOUT.cta.href} className={`${primary} mt-12 inline-flex items-center`}>{ABOUT.cta.label}</a>
              </div>
              <div className="lg:pt-10">
                <p className={`${FD_BODY} max-w-xl`}>{ABOUT.body}</p>
                <div className="mt-12 grid gap-8 sm:grid-cols-3">
                  {ABOUT.points.map((p) => (
                    <div key={p.t} className="">
                      <h3 className={`${FD_COLUMN} whitespace-pre-line`}>{p.t}</h3>
                      <ul className="mt-4 space-y-3">
                        {p.b.map((line) => (
                          <li key={line} className="flex gap-2.5 text-base leading-snug text-[hsl(var(--fd-dim))]">
                            <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[hsl(var(--fd-line-strong))]" />
                            <span>{line}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="framework" className="fd-reveal fd-sec relative scroll-mt-16 overflow-hidden">
          <img src={prismCard} alt="" aria-hidden width={1920} height={1072} loading="lazy" className="pointer-events-none absolute inset-0 h-full w-full object-cover object-[70%_center] opacity-50 md:object-right md:opacity-100 lg:left-auto lg:right-[max(1.5rem,calc((100vw_-_80rem)/2))] lg:w-[min(84%,1400px)] lg:[mask-image:linear-gradient(to_right,black_calc(100%_-_160px),transparent)]" />
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,hsl(var(--fd-bg))_30%,hsl(var(--fd-bg)/0.45)_55%,transparent_78%)]" />
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,hsl(var(--fd-bg))_0%,transparent_18%,transparent_82%,hsl(var(--fd-bg))_100%)]" />
          <div className="relative mx-auto max-w-7xl px-6 py-24 md:py-40">
            <Label>{FRAMEWORK.label}</Label>
            <h2 className={`${h2Main} whitespace-pre-line`}>{FRAMEWORK.title}</h2>
            <p className={`${FD_BODY} mt-7 max-w-md`}>An open SDK to build, ship and run self-verifying AI applications. From edge to cloud.</p>
            <div className="mt-10 flex w-full flex-col sm:w-fit">
              <p className={`${FD_LABEL} mb-4 text-center sm:text-left`}>{HERO.agentSkill.label}</p>
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-4 sm:justify-start">
                <div className="flex w-full min-w-0 items-stretch rounded-[28px] border border-[hsl(var(--fd-line))] bg-[hsl(var(--fd-bg)/0.8)] p-1.5 backdrop-blur sm:w-auto sm:items-center sm:rounded-full sm:pl-6 sm:pr-2">
                  <button
                    onClick={async () => { await navigator.clipboard?.writeText(HERO.agentSkill.command); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                    aria-label="Copy agent skill command"
                    className="fd-mono inline-flex min-w-0 flex-1 items-center justify-center gap-2.5 py-3 text-xs sm:flex-none sm:justify-start sm:py-0 transition-opacity hover:opacity-80 sm:text-base"
                  >
                    <span className="text-[hsl(var(--fd-dim))]">$</span>
                    <span className="truncate">{HERO.agentSkill.command}</span>
                    {copied ? <Check className="h-4 w-4 shrink-0 text-[hsl(var(--fd-accent))]" /> : <Copy className="h-4 w-4 shrink-0 text-[hsl(var(--fd-dim))]" />}
                  </button>
                </div>
                <a href="/docs/" className="inline-flex shrink-0 items-center gap-2 text-sm text-[hsl(var(--fd-dim))] transition-colors hover:text-[hsl(var(--fd-fg,0_0%_100%))]"><BookOpen className="h-4 w-4" /> Read the docs</a>
              </div>
            </div>
          </div>
        </section>


        <section id="posts" className="fd-reveal fd-sec scroll-mt-16"><div className="mx-auto max-w-7xl px-6 py-20 md:py-32">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div><Label>{POSTS.label}</Label><h2 className={h2Main}>{POSTS.title}</h2></div>
            <div className="flex shrink-0 items-center gap-3">
              <button type="button" aria-label="Previous posts" onClick={() => slide(-1)} className="grid h-12 w-12 place-items-center rounded-full border border-[hsl(var(--fd-line))] text-[hsl(var(--fd-fg))] transition-colors hover:border-[hsl(var(--fd-accent)/0.6)]"><ChevronLeft className="h-5 w-5" /></button>
              <button type="button" aria-label="Next posts" onClick={() => slide(1)} className="grid h-12 w-12 place-items-center rounded-full border border-[hsl(var(--fd-line))] text-[hsl(var(--fd-fg))] transition-colors hover:border-[hsl(var(--fd-accent)/0.6)]"><ChevronRight className="h-5 w-5" /></button>
              <a href="/blog/" className={`${ghost} shrink-0`}>{POSTS.all}</a>
            </div>
          </div>
          <div ref={rail} className="fd-snap fd-rail -mx-6 mt-14 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-6 md:mx-0 md:gap-5 md:px-0">
            {POSTS.items.map((p) => (
              <a key={p.title} href={p.href} className="fd-press group flex w-[82%] shrink-0 snap-start flex-col overflow-hidden rounded-2xl md:w-[calc((100%-2.5rem)/3)] border border-[hsl(var(--fd-line))] bg-[hsl(var(--fd-panel))] transition-all duration-300 hover:-translate-y-1 hover:border-[hsl(var(--fd-accent)/0.5)]">
                {p.cover && (
                  <div className="relative h-52 shrink-0 overflow-hidden">
                    <img src={p.cover} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--fd-panel))] to-transparent" />
                  </div>
                )}
                <div className="flex flex-1 flex-col p-8">
                  <p className={FD_CATEGORY}>{p.category}</p>
                  <h3 className={`${FD_CARD} mt-5 text-balance`}>{p.title}</h3>
                  <p className="fd-mono mt-auto pt-8 text-sm text-[hsl(var(--fd-dim))]">{p.date}</p>
                </div>
              </a>
            ))}
          </div>
        </div></section>

        <section id="community" className="fd-reveal fd-sec scroll-mt-16">
          <div className="mx-auto max-w-7xl px-6 py-20 md:py-32 text-center">
            <h2 className={`${h2Main} mx-auto max-w-4xl`}>{CLOSING.title1}<br />{CLOSING.title2}</h2>
            <span className="fd-spectrum fd-spectrum-lift mt-10">
              <a href={DISCORD_URL} target="_blank" rel="noreferrer" className={`${primary} relative z-10`}>{CLOSING.cta}</a>
            </span>
            <div className="mx-auto mt-20 flex max-w-[340px] flex-wrap items-start justify-center gap-x-4 gap-y-10 sm:gap-x-6 sm:gap-y-14 sm:max-w-[520px] md:max-w-[700px] lg:max-w-6xl">
              {CONTRIBUTORS.map((c) => (
                <div key={c.name} className="fd-contrib">
                  <span className="fd-contrib-hex"><img src={c.image} alt={c.name} loading="lazy" /></span>
                  <p className="fd-contrib-name">{c.name}</p>
                  <p className="fd-contrib-role">{c.role}</p>
                </div>
              ))}
              <div className="fd-contrib">
                <span className="fd-contrib-hex fd-contrib-more"><Plus className="h-7 w-7" /></span>
                <p className="fd-contrib-name">200+</p>
                <p className="fd-contrib-role">contributors</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="pt-8">
        <div className="fd-wordmark-wrap fd-wm-solid mx-auto max-w-7xl px-6">
          <div className="fd-wordmark-row">
            <div className="fd-wm-row-inner">
              <span aria-hidden="true" className="fd-wm-mask" style={{ ["--wm-icon" as string]: `url(${uorIcon})` }} />
              <span className="fd-wordmark" data-text="UOR Foundation">UOR Foundation</span>
            </div>
          </div>
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
