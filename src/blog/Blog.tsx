import { applyFigures } from "./figures";
import { FEEDBACK_URL } from "@/agent/site";
import { useEffect, useMemo, useState } from "react";
import { marked } from "marked";
import { ArrowLeft, ArrowRight, Check, Copy, FileText, Rss } from "lucide-react";
import SiteHeader from "@/site/SiteHeader";
import { BLOG_CATEGORIES, BLOG_POSTS, findPost, postMarkdown, readingMinutes } from "./agent";
import { COVERS } from "./covers";
import { FD_ARTICLE, FD_BODY, FD_CARD, FD_CARD_LG, FD_CATEGORY, FD_EYEBROW, FD_SECTION } from "@/site/type";

const DEMO_URL = "/blog/lexlean-v0-4/mnist-demo.html";
const slugify = (s: string) => s.toLowerCase().replace(/<[^>]+>/g, "").replace(/[^a-z0-9]+/g, " ").trim().replace(/ /g, "_");

function render(md: string) {
  const toc: { id: string; text: string }[] = [];
  const renderer = new marked.Renderer();
  renderer.heading = ({ tokens, depth }) => {
    const text = marked.Parser.parseInline(tokens);
    const id = slugify(text);
    if (depth === 2) toc.push({ id, text: text.replace(/<[^>]+>/g, "") });
    return `<h${depth} id="${id}">${text}</h${depth}>`;
  };
  renderer.link = ({ href, tokens }) => {
    const ext = /^https?:/.test(href);
    return `<a href="${href}"${ext ? ' target="_blank" rel="noreferrer"' : ""}>${marked.Parser.parseInline(tokens)}</a>`;
  };
  const html = applyFigures(marked.parse(md, { renderer, gfm: true, async: false }) as string, "html").replace(/<!-- demo:mnist -->/g,
    `<figure class="bl-demo"><iframe src="${DEMO_URL}" title="Certified handwritten digit reader" sandbox="allow-scripts" loading="lazy"></iframe><figcaption><span>Draw a digit from 0 to 9</span><a href="${DEMO_URL}" target="_blank" rel="noreferrer">Open full screen</a></figcaption></figure>`);
  return { html, toc };
}

const Header = SiteHeader;

function Card({ slug, big = false }: { slug: string; big?: boolean }) {
  const p = findPost(slug)!;
  return (
    <a href={`/blog/${p.slug}/`} className={`group flex overflow-hidden rounded-2xl border border-[hsl(var(--fd-line))] bg-[hsl(var(--fd-panel))] transition-all duration-300 hover:-translate-y-1 hover:border-[hsl(var(--fd-accent)/0.5)] ${big ? "flex-col md:flex-row" : "flex-col"}`}>
      <div className={`relative shrink-0 overflow-hidden ${big ? "h-64 md:h-auto md:w-[58%]" : "h-52"}`}>
        <img src={COVERS[p.slug]} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
      </div>
      <div className={`flex flex-1 flex-col ${big ? "p-8 md:p-12" : "p-8"}`}>
        <p className={FD_CATEGORY}>{p.category}</p>
        <h3 className={`mt-5 text-balance ${big ? FD_CARD_LG : FD_CARD}`}>{p.title}</h3>
        {big && <p className="mt-5 text-lg leading-relaxed text-[hsl(var(--fd-dim))]">{p.summary}</p>}
        <p className="fd-mono mt-auto pt-8 text-sm text-[hsl(var(--fd-dim))]">{p.date}</p>
      </div>
    </a>
  );
}

function Index() {
  const [cat, setCat] = useState("All");
  const list = BLOG_POSTS.filter((p) => cat === "All" || p.category === cat);
  const chip = (c: string) => `rounded-full border px-4 py-1.5 text-sm transition-colors ${cat === c ? "border-[hsl(var(--fd-fg))] bg-[hsl(var(--fd-fg))] text-[hsl(var(--fd-bg))]" : "border-[hsl(var(--fd-line))] text-[hsl(var(--fd-dim))] hover:border-[hsl(var(--fd-fg))] hover:text-[hsl(var(--fd-fg))]"}`;
  return (
    <main className="mx-auto max-w-7xl px-6 pb-32 pt-24">
      <p className={`${FD_EYEBROW} mb-5`}>// Blog</p>
      <h1 className={FD_SECTION}>Writing.</h1>
      <div className="mt-12 flex flex-wrap gap-2" role="tablist" aria-label="Categories">
        {["All", ...BLOG_CATEGORIES].map((c) => <button key={c} role="tab" aria-selected={cat === c} onClick={() => setCat(c)} className={chip(c)}>{c}</button>)}
      </div>
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {list.map((p, i) => <div key={p.slug} className={i === 0 ? "md:col-span-3" : ""}><Card slug={p.slug} big={i === 0} /></div>)}
      </div>
    </main>
  );
}

function Post({ slug }: { slug: string }) {
  const p = findPost(slug)!;
  const { html, toc } = useMemo(() => render(p.body), [p]);
  const fromHome = new URLSearchParams(window.location.search).get("from") === "highlights";
  const [copied, setCopied] = useState(false);
  const [active, setActive] = useState("");
  const i = BLOG_POSTS.indexOf(p);
  const newer = BLOG_POSTS[i - 1], older = BLOG_POSTS[i + 1];
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && setActive(e.target.id)), { rootMargin: "-80px 0px -70% 0px" });
    document.querySelectorAll(".bl-prose h2").forEach((h) => io.observe(h));
    return () => io.disconnect();
  }, [html]);
  const copy = async () => { await navigator.clipboard.writeText(postMarkdown(p)); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  const btn = "inline-flex items-center gap-2 rounded-full border border-[hsl(var(--fd-line))] px-4 py-1.5 text-sm text-[hsl(var(--fd-dim))] transition-colors hover:border-[hsl(var(--fd-fg))] hover:text-[hsl(var(--fd-fg))]";
  return (
    <main className="mx-auto max-w-7xl px-6 pb-32 pt-16">
      <a href={fromHome ? "/#posts" : "/blog/"} className="inline-flex items-center gap-2 text-[hsl(var(--fd-dim))] hover:text-[hsl(var(--fd-fg))]"><ArrowLeft className="h-4 w-4" /> {fromHome ? "Back to highlights" : "All posts"}</a>
      <article className="mx-auto mt-12 max-w-[760px]">
        <p className={FD_CATEGORY}>{p.category}<span className="mx-3 text-[hsl(var(--fd-dim))]">·</span><span className="text-[hsl(var(--fd-dim))]">{p.date}</span><span className="mx-3 text-[hsl(var(--fd-dim))]">·</span><span className="text-[hsl(var(--fd-dim))]">{readingMinutes(p)} min read</span></p>
        <h1 className={`${FD_ARTICLE} mt-6 text-balance`}>{p.title}</h1>
        <p className={`${FD_BODY} mt-6`}>{p.summary}</p>
        <div className="mt-8 flex gap-2">
          <button onClick={copy} className={btn}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? "Copied" : "Copy page"}</button>
          <a href={`/blog/${p.slug}.md`} className={btn}><FileText className="h-4 w-4" />Markdown</a>
        </div>
      </article>
      <div className="mx-auto mt-12 max-w-5xl overflow-hidden rounded-2xl border border-[hsl(var(--fd-line))]">
        <img src={COVERS[p.slug]} alt="" className="max-h-[560px] w-full object-cover" />
      </div>
      <div className="relative mx-auto mt-16 max-w-[760px]">
        <div className="bl-prose" dangerouslySetInnerHTML={{ __html: html }} />
        {toc.length > 2 && (
          <aside className="absolute left-full top-0 ml-16 hidden h-full w-56 2xl:block">
            <div className="sticky top-28">
              <p className="fd-mono mb-4 text-xs uppercase tracking-[0.2em] text-[hsl(var(--fd-dim))]">On this page</p>
              <ul className="space-y-2.5 border-l border-[hsl(var(--fd-line))] text-sm">
                {toc.map((t) => <li key={t.id}><a href={`#${t.id}`} className={`-ml-px block border-l pl-4 transition-colors ${active === t.id ? "border-[hsl(var(--fd-fg))] text-[hsl(var(--fd-fg))]" : "border-transparent text-[hsl(var(--fd-dim))] hover:text-[hsl(var(--fd-fg))]"}`}>{t.text}</a></li>)}
              </ul>
            </div>
          </aside>
        )}
      </div>
      {fromHome && <div className="mx-auto mt-24 max-w-[760px] text-center"><a href="/#posts" className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--fd-line))] px-7 py-3.5 font-medium transition-colors hover:border-[hsl(var(--fd-fg))]"><ArrowLeft className="h-4 w-4" />Back to highlights</a></div>}
      <nav className="mx-auto mt-24 grid max-w-[760px] gap-4 border-t border-[hsl(var(--fd-line))] pt-10 sm:grid-cols-2">
        {newer ? <a href={`/blog/${newer.slug}/`} className="group rounded-2xl border border-[hsl(var(--fd-line))] p-6 hover:border-[hsl(var(--fd-fg))]"><span className="flex items-center gap-2 text-sm text-[hsl(var(--fd-dim))]"><ArrowLeft className="h-4 w-4" />Newer</span><span className="fd-head mt-3 block text-lg font-medium leading-snug">{newer.title}</span></a> : <span />}
        {older && <a href={`/blog/${older.slug}/`} className="group rounded-2xl border border-[hsl(var(--fd-line))] p-6 text-right hover:border-[hsl(var(--fd-fg))]"><span className="flex items-center justify-end gap-2 text-sm text-[hsl(var(--fd-dim))]">Older<ArrowRight className="h-4 w-4" /></span><span className="fd-head mt-3 block text-lg font-medium leading-snug">{older.title}</span></a>}
      </nav>
    </main>
  );
}

export default function Blog() {
  const slug = window.location.pathname.replace(/^\/blog\/?/, "").replace(/\/$/, "");
  const post = slug ? findPost(slug) : undefined;
  useEffect(() => {
    document.title = post ? `${post.title} | UOR Foundation Blog` : "Blog | UOR Foundation";
    document.querySelector('meta[name="description"]')?.setAttribute("content", post ? post.summary : "Essays, announcements and research notes from the UOR community.");
    window.scrollTo(0, 0);
  }, [post]);
  return (
    <div className="foundation min-h-screen bg-[hsl(var(--fd-bg))] text-[hsl(var(--fd-fg))]">
      <Header />
      {slug && !post ? (
        <main className="mx-auto max-w-7xl px-6 py-32"><h1 className={FD_SECTION}>Post not found.</h1><a href="/blog/" className="mt-8 inline-block underline underline-offset-4">All posts</a></main>
      ) : post ? <Post slug={post.slug} /> : <Index />}
      <footer className="border-t border-[hsl(var(--fd-line))] text-sm text-[hsl(var(--fd-dim))]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-6 py-10 sm:justify-between">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
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
