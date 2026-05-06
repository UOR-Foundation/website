// RSS 2.0 feed for UOR Foundation news.
// Default: Engineering category. Pass ?category=All for the full feed.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Category = "Engineering" | "Research" | "Foundation" | "Community";

interface NewsItem {
  title: string;
  excerpt: string;
  date: string;
  isoDate: string;
  category: Category;
  href: string;
  external?: boolean;
}

// Source of truth duplicated server-side so the feed has zero runtime deps
// on the SPA bundle. Keep in sync with src/data/news-items.ts.
const NEWS_ITEMS: NewsItem[] = [
  {
    title: "uor-foundation v0.3.1 is live on crates.io",
    excerpt:
      "The complete UOR Foundation vocabulary as typed Rust traits. 34 namespaces, 471 classes, 948 properties, plus the uor! macro.",
    date: "May 5, 2026",
    isoDate: "2026-05-05",
    category: "Engineering",
    href: "/blog/uor-foundation-v0-3-1",
  },
  {
    title: "The Path to Sustainable AI: Notes from the Uganda Deep Tech Summit",
    excerpt:
      "Alex Flom represented the UOR Foundation in Kampala. Compute once, lookup forever.",
    date: "May 6, 2026",
    isoDate: "2026-05-06",
    category: "Community",
    href: "/blog/sustainable-ai-uganda",
  },
  {
    title: "A Universal Data Fingerprint for Your AI Agent",
    excerpt:
      "UOR derives a 256-bit fingerprint from canonical structure. Same object, same hash, in any language or runtime.",
    date: "April 21, 2026",
    isoDate: "2026-04-21",
    category: "Engineering",
    href: "/blog/universal-data-fingerprint",
  },
  {
    title: "What If Every Piece of Data Had One Permanent Address?",
    excerpt:
      "The open specification is live. Browse the full framework, review the architecture, and start building.",
    date: "February 19, 2026",
    isoDate: "2026-02-19",
    category: "Research",
    href: "/blog/uor-framework-launch",
  },
  {
    title: "Unveiling a Universal Mathematical Language",
    excerpt:
      "A breakthrough that reveals the hidden order behind nature's most complex systems.",
    date: "October 10, 2025",
    isoDate: "2025-10-10",
    category: "Research",
    href: "/blog/universal-mathematical-language",
  },
  {
    title: "UOR: Building the Internet's Knowledge Graph",
    excerpt:
      "How a single addressing system could turn the internet into a structured, navigable knowledge graph.",
    date: "December 21, 2023",
    isoDate: "2023-12-21",
    category: "Foundation",
    href: "/blog/building-the-internets-knowledge-graph",
  },
  {
    title: "The UOR Framework: Everything Is an Object",
    excerpt:
      "The original framework introduction. Universal Object Reference reframes information systems around content-derived addresses.",
    date: "July 13, 2022",
    isoDate: "2022-07-13",
    category: "Research",
    href: "/blog/uor-framework-origin",
  },
];

const SITE_URL = "https://uor.foundation";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function rfc822(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toUTCString();
}

function absoluteUrl(href: string): string {
  if (href.startsWith("http")) return href;
  return `${SITE_URL}${href}`;
}

Deno.serve((req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const categoryParam = url.searchParams.get("category");
  const allowed = new Set<string>(["All", "Engineering", "Research", "Foundation", "Community"]);
  const category = allowed.has(categoryParam ?? "") ? (categoryParam as string) : "Engineering";

  const items = (category === "All"
    ? NEWS_ITEMS
    : NEWS_ITEMS.filter((i) => i.category === category)
  ).sort((a, b) => (a.isoDate < b.isoDate ? 1 : -1));

  const feedTitle =
    category === "All"
      ? "UOR Foundation"
      : `UOR Foundation, ${category}`;
  const feedDescription =
    category === "Engineering"
      ? "Releases, standards, and engineering announcements from the UOR Foundation."
      : "Releases, research, and milestones from the UOR Foundation.";

  const selfHref = `${SITE_URL}/feeds/${category.toLowerCase()}.xml`;
  const lastBuild =
    items.length > 0 ? rfc822(items[0].isoDate) : new Date().toUTCString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(feedTitle)}</title>
    <link>${SITE_URL}/news</link>
    <description>${escapeXml(feedDescription)}</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <atom:link href="${escapeXml(selfHref)}" rel="self" type="application/rss+xml" />
${items
  .map((item) => {
    const link = absoluteUrl(item.href);
    return `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${rfc822(item.isoDate)}</pubDate>
      <category>${escapeXml(item.category)}</category>
      <description>${escapeXml(item.excerpt)}</description>
    </item>`;
  })
  .join("\n")}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=600, s-maxage=3600",
    },
    status: 200,
  });
});