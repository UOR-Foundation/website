import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowRight, BookOpen, Check, ChevronRight, Clock, Code2, Copy, FileText, Home, Menu, Rocket, Compass, Search, Sparkles, X } from "lucide-react";
import { DocsGPTWidget } from "docsgpt";
import { DOCSGPT_API_HOST, DOCSGPT_API_KEY, docsgptEnabled, type DocsGPTController } from "@/docsgpt";
import { HINT_TERMS, MILESTONES, TERMS, VERBS, dockerGloss, findMilestone, siteTerms, verbMilestone, type Milestone } from "./vocabulary";
import { ALL_PAGES, CHANGELOG, DOCS_ASK, GOLDEN_PATH, navLabel, RELEASE_STATUS, SOURCE, TABS, UPSTREAM_CHANGELOG, pageMarkdown, type DocPage } from "./content";
import { SDK_FEATURES } from "@/agent/site";
import askPrismIcon from "@/assets/uor-icon.svg";

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/ /g, "-");
const current = () => window.location.pathname.replace(/^\/docs\/?/, "").replace(/\/$/, "");

function go(path: string) {
  window.history.pushState(null, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
}

function Link({ to, className, children, onClick }: { to: string; className?: string; children: ReactNode; onClick?: () => void }) {
  return (
    <a href={to} className={className} onClick={(e) => { if (e.metaKey || e.ctrlKey) return; e.preventDefault(); onClick?.(); go(to); }}>{children}</a>
  );
}

/* Minimal Markdown renderer: headings, paragraphs, lists, tables, fenced code, inline code, links, bold. */
const TERM_RE = new RegExp(`\\b(${[...HINT_TERMS].sort((a, b) => b.prism.length - a.prism.length).map((t) => t.prism.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})s?\\b`, "i");
const COMING = "/docs/get-started/coming-from-containers";
function hinted(text: string, seen: Set<string> | null, key: number): ReactNode {
  if (!seen) return text;
  const m = text.match(TERM_RE);
  if (!m || m.index === undefined) return text;
  const t = HINT_TERMS.find((x) => x.prism.toLowerCase() === m[1].toLowerCase())!;
  if (seen.has(t.prism)) return text;
  seen.add(t.prism);
  return <span key={key}>{text.slice(0, m.index)}<Link to={COMING} className="dc-term"><span title={`Also known as ${dockerGloss(t)}`} data-tip={`Also known as ${dockerGloss(t)}`}>{m[0]}</span></Link>{hinted(text.slice(m.index + m[0].length), seen, key + 1)}</span>;
}
function inline(text: string, seen: Set<string> | null = null): ReactNode[] {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g).map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length > 1) return <code key={i} className="dc-inline">{part.slice(1, -1)}</code>;
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    const m = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (m) {
      const href = m[2].replace(/^https:\/\/(?:uor\.foundation|universal-coordinate-foundation\.lovable\.app)/, "");
      return href.startsWith("/docs/") ? <Link key={i} to={href}>{inline(m[1])}</Link> : <a key={i} href={href} target="_blank" rel="noreferrer">{inline(m[1])}</a>;
    }
    return hinted(part, seen, i * 100);
  });
}
const cells = (row: string) => row.trim().replace(/^\|/, "").replace(/\|$/, "").split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, "|"));
function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="dc-code">
      <div className="dc-code-bar"><span>{lang || "text"}</span>
        <button aria-label="Copy code" onClick={() => { navigator.clipboard.writeText(code); setDone(true); setTimeout(() => setDone(false), 1400); }}>{done ? <Check size={14} /> : <Copy size={14} />}</button>
      </div>
      <pre><code>{code}</code></pre>
    </div>
  );
}
function MilestoneBadge({ m, dim }: { m: Milestone | null; dim?: boolean }) {
  if (!m) return null;
  return <a href={m.url} target="_blank" rel="noreferrer" className={`dc-ms ${dim ? "dc-ms-dim" : ""}`} title={`${m.code} ${m.version} ${m.name}`}>{m.code} {m.version}</a>;
}
function Markdown({ src, slug = "" }: { src: string; slug?: string }) {
  const out: ReactNode[] = [];
  const seen = slug === "reference/vocabulary" || slug === "get-started/coming-from-containers" ? null : new Set<string>();
  const cli = slug === "reference/cli";
  const lines = src.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.startsWith("```")) {
      const lang = l.slice(3).trim(); const buf: string[] = [];
      while (++i < lines.length && !lines[i].startsWith("```")) buf.push(lines[i]);
      out.push(<CodeBlock key={i} code={buf.join("\n")} lang={lang} />);
    } else if (l.startsWith("## ")) out.push(<h2 key={i} id={slugify(l.slice(3))}><a href={`#${slugify(l.slice(3))}`}>{l.slice(3)}</a></h2>);
    else if (l.startsWith("### ")) out.push(cli
      ? <h3 key={i} id={slugify(l.slice(4))} className="dc-verb">{l.slice(4)}<span className="dc-verb-ms">Available in <MilestoneBadge m={verbMilestone(l.slice(4).trim())} /></span></h3>
      : <h3 key={i} id={slugify(l.slice(4))}>{l.slice(4)}</h3>);
    else if (l.trim().startsWith("|") && /^\|[\s:|-]+\|$/.test(lines[i + 1]?.trim() ?? "")) {
      const head = cells(l); const rows: string[][] = []; i++;
      while (lines[i + 1]?.trim().startsWith("|")) rows.push(cells(lines[++i]));
      out.push(<div key={i} className="dc-table"><table><thead><tr>{head.map((h, j) => <th key={j}>{inline(h)}</th>)}</tr></thead><tbody>{rows.map((r, k) => <tr key={k}>{r.map((c, j) => <td key={j}>{inline(c, seen)}</td>)}</tr>)}</tbody></table></div>);
    } else if (/^\d+\. /.test(l)) {
      const items = [l];
      while (/^\d+\. /.test(lines[i + 1] ?? "")) items.push(lines[++i]);
      out.push(<ol key={i}>{items.map((it, j) => <li key={j}>{inline(it.replace(/^\d+\. /, ""), seen)}</li>)}</ol>);
    } else if (l.startsWith("- ")) {
      const items = [l];
      while (lines[i + 1]?.startsWith("- ")) items.push(lines[++i]);
      out.push(<ul key={i}>{items.map((it, j) => <li key={j}>{inline(it.slice(2), seen)}</li>)}</ul>);
    } else if (l.trim()) out.push(<p key={i}>{inline(l, seen)}</p>);
  }
  return <>{out}</>;
}
const headings = (md: string) => md.split("\n").filter((l) => l.startsWith("## ")).map((l) => l.slice(3));

function ReleaseStatus() {
  return (
    <section className="dc-status" aria-label="Release status">
      <p className="dc-status-label">Release status</p>
      <div className="dc-table"><table><tbody>
        {RELEASE_STATUS.map((r) => <tr key={r.item}><th scope="row">{r.item}</th><td className="fd-mono">{r.status}</td><td>{r.note}</td></tr>)}
      </tbody></table></div>
      <p className="dc-status-src">Synced from <a href={`https://github.com/${SOURCE.repo}/tree/${SOURCE.commit}`} target="_blank" rel="noreferrer" className="fd-mono">{SOURCE.repo}@{SOURCE.branch}</a></p>
    </section>
  );
}

function ReleaseLine() {
  return (
    <details className="dc-status dc-release-line">
      <summary className="fd-mono">Documents {RELEASE_STATUS[0].status} · npm {RELEASE_STATUS[1].status} · CLI not shipped</summary>
      <ReleaseStatus />
    </details>
  );
}

function GoldenPath() {
  const patterns = ["dots", "grid", "lines", "grid", "dots"];
  return (
    <ol className="dc-home-grid dc-path-grid" aria-label="Get started in five steps">
      {GOLDEN_PATH.map((g, i) => {
        const page = g.slug ? ALL_PAGES.find((p) => p.slug === g.slug) : undefined;
        const m = g.verb ? verbMilestone(g.verb) : null;
        const inner = <><div className={`dc-pattern dc-${patterns[i]}`} /><div className="p-6"><strong>{g.step}</strong><span>{g.text}</span>{m && <em className="dc-path-ms fd-mono">{m.code} {m.version}</em>}</div></>;
        return <li key={g.step}>{page ? <Link to={`/docs/${page.slug}`} className={`dc-home-card${m ? " dc-soon" : ""}`}>{inner}</Link> : <div className="dc-home-card dc-soon" aria-disabled>{inner}</div>}</li>;
      })}
    </ol>
  );
}

function AvailableIn({ value }: { value?: string }) {
  if (!value) return null;
  return <p className="dc-available"><span>Available in</span>{value.split(/,\s*/).map((v) => { const m = findMilestone(v); return m ? <MilestoneBadge key={v} m={m} /> : <code key={v} className="dc-inline">{v}</code>; })}</p>;
}

function Roadmap() {
  const now = Date.now();
  const next = MILESTONES.find((m) => m.state === "open" && m.due && Date.parse(m.due) > now) ?? MILESTONES.find((m) => m.state === "open");
  const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" }) : "Now");
  return (
    <section className="dc-roadmap" aria-labelledby="dc-roadmap-title">
      <div className="dc-row-head"><h2 id="dc-roadmap-title">Roadmap to v1.0</h2><span className="dc-row-links"><a href="https://github.com/orgs/UOR-Foundation/projects/12" target="_blank" rel="noreferrer">Full roadmap</a><a href={SDK_FEATURES} target="_blank" rel="noreferrer">Request features</a></span></div>
      <ol>
        {MILESTONES.map((m) => {
          const total = m.open + m.closed; const pct = total ? Math.round((m.closed / total) * 100) : 0;
          return (
            <li key={m.number} className={m === next ? "dc-next" : m.state === "closed" ? "dc-done" : ""}>
              <a href={m.url} target="_blank" rel="noreferrer">
                <span className="fd-mono dc-rm-code">{m.code} · {m.version}</span>
                <strong>{m.name}</strong>
                <span className="dc-rm-bar" aria-label={`${pct} percent done`}><i style={{ width: `${pct}%` }} /></span>
                <span className="fd-mono dc-rm-due">{fmt(m.due)}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function WhatsNew() {
  if (!UPSTREAM_CHANGELOG) return null;
  const items = UPSTREAM_CHANGELOG.body.split("\n").filter((l) => /^#{2,3} /.test(l)).slice(0, 5).map((l) => l.replace(/^#+ /, ""));
  if (!items.length) return null;
  return (
    <section className="dc-roadmap" aria-labelledby="dc-new-title">
      <div className="dc-row-head"><h2 id="dc-new-title">What's new</h2><Link to="/docs/changelog">All updates</Link></div>
      <ul className="dc-new">{items.map((t) => <li key={t}><Link to={`/docs/changelog#${slugify(t)}`}>{t}</Link></li>)}</ul>
    </section>
  );
}

function AskBox({ onAsk }: { onAsk: (q: string) => void }) {
  const [q, setQ] = useState("");
  return (
    <section className="dc-ask" aria-labelledby="dc-ask-title">
      <h1 id="dc-ask-title">{DOCS_ASK.title}</h1>
      <form className="dc-ask-box" onSubmit={(e) => { e.preventDefault(); if (q.trim()) onAsk(q.trim()); }}>
        <Sparkles size={18} aria-hidden />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={DOCS_ASK.placeholder} aria-label="Ask about Prism" />
        <button type="submit" aria-label="Ask" disabled={!q.trim()}><ArrowRight size={18} /></button>
      </form>
      <div className="dc-ask-chips">
        {DOCS_ASK.questions.map((x) => <button key={x} type="button" onClick={() => onAsk(x)}>{x}</button>)}
      </div>
    </section>
  );
}

type Hit = { label: string; hint: string; to: string; excerpt?: string };
let pfModule: Promise<any> | null = null;
const PF_URL = "/pagefind/pagefind.js";
const loadPagefind = () => (pfModule ??= import(/* @vite-ignore */ PF_URL).catch(() => null));

function SearchPalette({ open, onClose, initial = "" }: { open: boolean; onClose: () => void; initial?: string }) {
  const [q, setQ] = useState(""); const [sel, setSel] = useState(0); const [full, setFull] = useState<Hit[]>([]);
  const items = useMemo<Hit[]>(() => {
    const all = ALL_PAGES.flatMap((p) => [
      { label: p.title, hint: p.group, to: `/docs/${p.slug}` },
      ...headings(p.body).map((h) => ({ label: h, hint: p.title, to: `/docs/${p.slug}#${slugify(h)}` })),
    ]).concat([{ label: "What's new", hint: "Changelog", to: "/docs/changelog" }],
      TERMS.filter((t) => !/^none/.test(t.docker)).map((t) => ({ label: `${dockerGloss(t)} → ${siteTerms(t.prism)}`, hint: "Terms", to: `${COMING}#nouns` })),
      VERBS.filter((v) => !/^none/.test(v.docker)).map((v) => ({ label: `${v.docker.replace(/`/g, "")} → prism ${v.prism}`, hint: "Terms", to: `${COMING}#verbs` })));
    const s = q.toLowerCase().trim();
    if (!s) return all.filter((it) => !it.to.includes("#")).slice(0, 10);
    const exact = all.filter((it) => `${it.label} ${it.hint}`.toLowerCase().includes(s));
    if (exact.length) return exact.slice(0, 10);
    // Questions: rank by how many meaningful words a result shares with the query.
    const words = s.replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 3 && !["what", "does", "with", "today", "before", "about"].includes(w)).map((w) => w.replace(/s$/, ""));
    return all.map((it) => ({ it, n: words.filter((w) => `${it.label} ${it.hint}`.toLowerCase().includes(w)).length }))
      .filter((x) => x.n > 0).sort((a, b) => b.n - a.n).map((x) => x.it).slice(0, 10);
  }, [q]);
  // Full text hits from the Pagefind index, merged under the instant title and heading matches.
  useEffect(() => {
    let alive = true;
    const t = setTimeout(async () => {
      try {
        const pf: any = await loadPagefind();
        if (!pf || !alive) return;
        const res = q.trim() ? await pf.search(q.trim()) : null;
        if (!alive) return;
        const data = res ? await Promise.all(res.results.slice(0, 6).map((r: any) => r.data())) : [];
        setFull(data.map((d: any) => ({ label: d.meta?.title || d.url, hint: "", to: d.url, excerpt: d.excerpt || "" })));
      } catch { if (alive) setFull([]); }
    }, 120);
    return () => { alive = false; clearTimeout(t); };
  }, [q]);
  const merged = useMemo(() => {
    const seen = new Set(items.map((i) => i.to));
    return [...items, ...full.filter((h) => !seen.has(h.to))];
  }, [items, full]);
  useEffect(() => { setSel(0); }, [q]);
  useEffect(() => { if (open) { setQ(initial); setFull([]); } }, [open, initial]);
  if (!open) return null;
  return (
    <div className="dc-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Search documentation">
      <div className="dc-palette" onClick={(e) => e.stopPropagation()}>
        <div className="dc-palette-input"><Search size={18} />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the docs"
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, merged.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
              if (e.key === "Enter" && merged[sel]) { onClose(); go(merged[sel].to); }
              if (e.key === "Escape") onClose();
            }} />
          <kbd>Esc</kbd>
        </div>
        <ul className="dc-palette-list">
          {merged.map((it, i) => (
            <li key={it.to + it.label}><Link to={it.to} onClick={onClose} className={i === sel ? "dc-active" : ""}><FileText size={15} /><span>{it.label}</span>{it.excerpt ? <span className="dc-excerpt" dangerouslySetInnerHTML={{ __html: it.excerpt }} /> : <em>{it.hint}</em>}</Link></li>
          ))}
          {!merged.length && <li className="dc-empty">No results</li>}
        </ul>
      </div>
    </div>
  );
}

function PageView({ p, tab }: { p: DocPage & { group: string }; tab: (typeof TABS)[number] }) {
  const toc = headings(p.body);
  const [active, setActive] = useState(toc[0]);
  const [copied, setCopied] = useState(false);
  const flat = tab.groups.flatMap((g) => g.pages);
  const idx = flat.findIndex((x) => x.slug === p.slug);
  const words = p.body.split(/\s+/).length;
  useEffect(() => {
    const obs = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.textContent || "")), { rootMargin: "-120px 0px -70% 0px" });
    document.querySelectorAll(".dc-article h2").forEach((h) => obs.observe(h));
    if (window.location.hash) document.getElementById(window.location.hash.slice(1))?.scrollIntoView();
    return () => obs.disconnect();
  }, [p.slug]);
  return (
    <>
      <article className="dc-article">
        <nav aria-label="Breadcrumb" className="dc-crumbs"><span>{tab.label}</span>{p.group !== tab.label && p.group !== p.title && <><ChevronRight size={13} /><span>{p.group}</span></>}<ChevronRight size={13} /><span className="text-[hsl(var(--fd-fg))]">{p.title}</span></nav>
        <h1>{p.title}</h1>
        <p className="dc-summary">{p.summary}</p>
        <div className="dc-meta">
          <span>{Math.max(1, Math.round(words / 200))} min read</span><span>Updated {p.updated}</span>
          <span className="ml-auto flex gap-2">
            <button className="dc-chip" onClick={() => { navigator.clipboard.writeText(pageMarkdown(p)); setCopied(true); setTimeout(() => setCopied(false), 1400); }}>{copied ? <Check size={13} /> : <Copy size={13} />}Copy page</button>
            <a className="dc-chip" href={`/docs/${p.slug}.md`} target="_blank" rel="noreferrer"><FileText size={13} />Markdown</a>
          </span>
        </div>
        <AvailableIn value={p.availableIn} />
        <ReleaseLine />
        <Markdown src={p.body} slug={p.slug} />
        <div className="dc-pager">
          {idx > 0 ? <Link to={`/docs/${flat[idx - 1].slug}`} className="dc-card"><span>Previous</span><strong>{flat[idx - 1].title}</strong></Link> : <span />}
          {idx < flat.length - 1 && <Link to={`/docs/${flat[idx + 1].slug}`} className="dc-card text-right"><span>Next</span><strong>{flat[idx + 1].title}</strong></Link>}
        </div>
      </article>
      <aside className="dc-toc" aria-label="On this page">
        <p>On this page</p>
        {toc.map((h) => <a key={h} href={`#${slugify(h)}`} className={active === h ? "dc-active" : ""}>{h}</a>)}
      </aside>
    </>
  );
}

const TAB_ICONS = { home: Home, "get-started": Rocket, guides: Compass, reference: BookOpen, changelog: Clock };

export default function Docs() {
  const [path, setPath] = useState(current());
  const [search, setSearch] = useState(false);
  const [seed, setSeed] = useState("");
  const dgpt = useRef<DocsGPTController>(null);
  const ask = (q: string) => { if (docsgptEnabled()) dgpt.current?.ask(q); else { setSeed(q); setSearch(true); } };
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    const on = () => { setPath(current()); setMenu(false); };
    const key = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setSearch((s) => !s); } };
    window.addEventListener("popstate", on); window.addEventListener("keydown", key);
    return () => { window.removeEventListener("popstate", on); window.removeEventListener("keydown", key); };
  }, []);
  const page = ALL_PAGES.find((p) => p.slug === path);
  const tabId = path === "" ? "home" : path === "changelog" ? "changelog" : page?.tab ?? "home";
  const tab = TABS.find((t) => t.id === tabId);
  useEffect(() => { document.title = `${page?.title ?? (tabId === "changelog" ? "What's new" : "Docs")} · Prism`; }, [page, tabId]);

  const tabs = [
    { id: "home", label: "Home", to: "/docs/" },
    ...TABS.map((t) => ({ id: t.id, label: t.label, to: `/docs/${t.groups[0].pages[0].slug}` })),
    { id: "changelog", label: "What's new", to: "/docs/changelog" },
  ];

  return (
    <div className="foundation dc-root">
      <header className="dc-header">
        <div className="dc-topbar">
          <a href="/" className="dc-brand"><span className="fd-head font-bold">Prism</span><span className="fd-mono">Docs</span></a>
          {tabId !== "home" && <>
            <button className="dc-search" onClick={() => setSearch(true)}><Search size={16} /><span>Search</span><kbd>⌘K</kbd></button>
            <button className="dc-pill hidden md:inline-flex" onClick={() => (docsgptEnabled() ? dgpt.current?.open() : setSearch(true))}>Ask AI<Sparkles size={14} /></button>
          </>}
        </div>
        <nav className="dc-tabs" aria-label="Sections">
          {tab && <button className="dc-menu md:hidden" aria-label="Open navigation" onClick={() => setMenu((m) => !m)}>{menu ? <X size={18} /> : <Menu size={18} />}</button>}
          {tabs.map((t) => { const I = TAB_ICONS[t.id as keyof typeof TAB_ICONS]; return <Link key={t.id} to={t.to} className={tabId === t.id ? "dc-active" : ""}><I size={15} />{t.label}</Link>; })}
        </nav>
      </header>

      {tabId === "home" && (
        <main className="dc-home dc-home-fit">
          <AskBox onAsk={ask} />
          <GoldenPath />
          <Roadmap />
          <WhatsNew />
        </main>
      )}

      {tabId === "changelog" && UPSTREAM_CHANGELOG && (
        <div className="dc-layout dc-layout-noside"><PageView key="changelog" p={{ ...UPSTREAM_CHANGELOG, group: "Changelog" }} tab={{ id: "reference", label: "What's new", groups: [{ label: "Changelog", pages: [UPSTREAM_CHANGELOG] }] }} /></div>
      )}

      {tabId === "changelog" && !UPSTREAM_CHANGELOG && (
        <main className="dc-home">
          <p className="pg-eyebrow !mb-6">// Changelog</p>
          <h1>What's new<span className="text-[hsl(var(--fd-dim))]">.</span></h1>
          <p className="dc-summary">New features, fixes and SDK updates, shipped continuously.</p>
          <div className="mt-10 max-w-2xl"><ReleaseStatus /></div>
          <ol className="dc-timeline">
            {CHANGELOG.map((c) => (
              <li key={c.version}><div className="dc-meta !mt-0"><span>{c.date}</span><span className="fd-mono">{c.version}</span><span className="dc-tag">{c.tag}</span></div><h2>{c.title}</h2><p>{c.note}</p></li>
            ))}
          </ol>
        </main>
      )}

      {tab && page && (
        <div className="dc-layout">
          <aside className={`dc-side ${menu ? "dc-open" : ""}`} aria-label={`${tab.label} navigation`}>
            {tab.groups.map((g) => (
              <div key={g.label}><p>{g.label}</p>{g.pages.map((p) => <Link key={p.slug} to={`/docs/${p.slug}`} className={p.slug === path ? "dc-active" : ""}>{navLabel(p)}</Link>)}{g.planned?.map((f) => <span key={f.label} className="dc-planned">{f.label}{f.milestone && <em className="fd-mono">{f.milestone.code}</em>}</span>)}</div>
            ))}
          </aside>
          <PageView key={page.slug} p={page} tab={tab} />
        </div>
      )}

      {tabId === "home" && path !== "" && <p className="dc-home text-[hsl(var(--fd-dim))]">Page not found.</p>}
      <SearchPalette open={search} initial={seed} onClose={() => { setSearch(false); setSeed(""); }} />
      {docsgptEnabled() && (
        <div className="dc-dgpt">
          <DocsGPTWidget
            ref={dgpt as never}
            apiHost={DOCSGPT_API_HOST}
            apiKey={DOCSGPT_API_KEY}
            theme="dark"
            title="Ask Prism"
            avatar={askPrismIcon}
            description=""
            poweredBy={false}
            heroTitle="Ask anything about Prism"
            heroDescription="Answers come from the Prism documentation. Check important details against the linked sources."
            suggestedQuestions={DOCS_ASK.questions}
            suggestedQuestionsLabel=""
            showSources
            buttonBg="#0a0a0a"
          />
        </div>
      )}
    </div>
  );
}
