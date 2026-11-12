import { applyFigures } from "./figures";
import { POSTS_DATA, type BlogPost } from "./posts.data";

export const BLOG_POSTS = POSTS_DATA;
export const BLOG_CATEGORIES = Array.from(new Set(POSTS_DATA.map((p) => p.category)));
export const findPost = (slug: string) => POSTS_DATA.find((p) => p.slug === slug);
export const readingMinutes = (p: BlogPost) => Math.max(1, Math.round(p.body.split(/\s+/).length / 220));

export const postMarkdown = (p: BlogPost) =>
  `---\ntitle: ${JSON.stringify(p.title)}\ndate: ${p.iso}\ncategory: ${p.category}\nurl: /blog/${p.slug}/\n---\n\n# ${p.title}\n\n> ${p.summary}\n\n${applyFigures(p.body, "md").replace(/<!-- demo:mnist -->/g, "[Try the live digit reader](/blog/lexlean-v0-4/mnist-demo.html)")}`;

export const blogLlmsTxt = () =>
  `# UOR Foundation Blog\n\n> Essays, announcements and research notes from the UOR community.\n\n## Posts\n\n` +
  POSTS_DATA.map((p) => `- [${p.title}](/blog/${p.slug}.md): ${p.summary}`).join("\n") + "\n";

export const blogFullTxt = () => POSTS_DATA.map(postMarkdown).join("\n\n---\n\n");

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export const blogRss = (origin = "") =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>UOR Foundation Blog</title><link>${origin}/blog/</link><description>Essays, announcements and research notes from the UOR community.</description>\n` +
  POSTS_DATA.map((p) => `<item><title>${esc(p.title)}</title><link>${origin}/blog/${p.slug}/</link><guid>${origin}/blog/${p.slug}/</guid><pubDate>${new Date(p.iso + "T12:00:00Z").toUTCString()}</pubDate><category>${esc(p.category)}</category><description>${esc(p.summary)}</description></item>`).join("\n") +
  `\n</channel></rss>\n`;
