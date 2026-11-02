import { defineConfig, type Plugin } from "vite";
import fs from "fs";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";
import { ALL_PAGES, UPSTREAM_CHANGELOG, UPSTREAM_LLMS, UPSTREAM_LLMS_FULL, llmsTxt, llmsFullTxt, pageMarkdown } from "./src/docs/content";
import { dockerMarkdown, roadmapJson } from "./src/docs/vocabulary";
import { frameworkMarkdown } from "./src/framework/content";
import { aboutMarkdown, agentsMarkdown, frontDoor, homeMarkdown, playgroundMarkdown, requestsJson, requestsMarkdown, sitemapXml, wellKnownJson } from "./src/agent/site";
import { shareMarkdown, swarmMarkdown, wallMarkdown } from "./src/agent/share";
import { discordMarkdown } from "./src/agent/discord";
import { BLOG_POSTS, blogFullTxt, blogLlmsTxt, blogRss, postMarkdown } from "./src/blog/agent";

// Zero cost full text search: a Pagefind index built from the same docs source. Dev serves it from memory; the build emits it as static assets next to the site.
const PF_KEEP = /^(pagefind\.js|pagefind-entry\.json|.*\.pf_(meta|fragment|index)$|wasm\.)/;
const pfEsc = (s: string) => s.replace(/&/g, "\x26amp;").replace(/</g, "\x26lt;").replace(/>/g, "\x26gt;");
const pfInline = (s: string) => s.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/`{1,3}([^`]*)`{1,3}/g, "$1").replace(/\*\*([^*]+)\*\*/g, "$1");
function pfBodyHtml(md: string) {
  const out: string[] = [];
  let code: string[] | null = null;
  for (const raw of md.split("\n")) {
    if (/^```/.test(raw)) { if (code) { out.push(`<pre><code>${pfEsc(code.join("\n"))}</code></pre>`); code = null; } else code = []; continue; }
    if (code) { code.push(raw); continue; }
    const h = raw.match(/^(#{1,4})\s+(.*)$/);
    if (h) out.push(`<h${h[1].length + 1}>${pfEsc(pfInline(h[2]))}</h${h[1].length + 1}>`);
    else if (raw.trim()) out.push(`<p>${pfEsc(pfInline(raw))}</p>`);
  }
  return out.join("\n");
}
async function pagefindAssets(): Promise<Record<string, Uint8Array>> {
  try {
    const pf = await import("pagefind");
    const { index, errors } = await pf.createIndex({ forceLanguage: "en" });
    if (!index || errors.length) throw new Error(errors.join("; ") || "index unavailable");
    for (const p of [...ALL_PAGES, ...(UPSTREAM_CHANGELOG ? [UPSTREAM_CHANGELOG] : [])]) {
      const content = `<html lang="en"><body><h1>${pfEsc(p.title)}</h1><p>${pfEsc(p.summary)}</p>${pfBodyHtml(p.body)}</body></html>`;
      await index.addHTMLFile({ url: `/docs/${p.slug}`, content });
    }
    const built = await index.getFiles();
    await pf.close();
    return Object.fromEntries(built.files.filter((f) => PF_KEEP.test(f.path)).map((f) => [f.path, f.content]));
  } catch (e) {
    console.warn("Pagefind index unavailable:", e instanceof Error ? e.message : e);
    return {};
  }
}

// Serves and emits agent readable docs (llms.txt, llms-full.txt, /docs/<slug>.md) from the docs source.
function agentDocs(): Plugin {
  const files = (): Record<string, string> => {
    const blogIndex = blogLlmsTxt().split("## Posts")[1];
    const out: Record<string, string> = {
      "llms.txt": frontDoor(llmsTxt(), blogIndex),
      ".well-known/llms.txt": frontDoor(llmsTxt(), blogIndex),
      ".well-known/agents.json": wellKnownJson(),
      "agents.md": agentsMarkdown(),
      "share.md": shareMarkdown(),
      "swarm.md": swarmMarkdown(),
      "agents/index.md": wallMarkdown(),
      "agents/discord.md": discordMarkdown(),
      "index.md": homeMarkdown(),
      "about.md": aboutMarkdown(),
      "playground.md": playgroundMarkdown(),
      "sitemap.xml": sitemapXml([...BLOG_POSTS.map((p) => `/blog/${p.slug}/`), ...ALL_PAGES.map((p) => `/docs/${p.slug}/`)]),
      "framework.md": frameworkMarkdown(),
       "llms-full.txt": `${agentsMarkdown()}\n\n---\n\n${discordMarkdown()}\n\n---\n\n${shareMarkdown()}\n\n---\n\n${swarmMarkdown()}\n\n---\n\n${homeMarkdown()}\n\n---\n\n${frameworkMarkdown()}\n\n---\n\n${llmsFullTxt()}\n\n---\n\n${blogFullTxt()}`,
      "docs/llms.txt": llmsTxt(),
      "docs/upstream/llms.txt": UPSTREAM_LLMS,
      "docs/coming-from-containers.md": dockerMarkdown(),
      "docs/roadmap.json": roadmapJson(),
      "docs/requests.md": requestsMarkdown(),
      "docs/requests.json": requestsJson(),
      "docs/llms-full.md": UPSTREAM_LLMS_FULL,
      "blog/llms.txt": blogLlmsTxt(),
      "blog/rss.xml": blogRss(),
    };
    for (const p of BLOG_POSTS) out[`blog/${p.slug}.md`] = postMarkdown(p);
    for (const p of ALL_PAGES) out[`docs/${p.slug}.md`] = pageMarkdown(p);
    if (UPSTREAM_CHANGELOG) out["docs/changelog.md"] = pageMarkdown(UPSTREAM_CHANGELOG);
    return out;
  };
  return {
    name: "agent-docs",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const key = decodeURIComponent((req.url || "").split("?")[0]).replace(/^\//, "");
        const body = files()[key];
        if (!body) return next();
        res.setHeader("Content-Type", key.endsWith(".json") ? "application/json" : key.endsWith(".xml") ? (key.includes("rss") ? "application/rss+xml; charset=utf-8" : "application/xml; charset=utf-8") : "text/markdown; charset=utf-8");
        res.end(body);
      });
      let pfCache: Record<string, Uint8Array> | null = null;
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/pagefind/")) return next();
        try {
          pfCache ??= await pagefindAssets();
          const key = decodeURIComponent(req.url.split("?")[0]).replace(/^\//, "");
          const body = pfCache[key];
          if (!body) return next();
          res.setHeader("Content-Type", key.endsWith(".js") ? "text/javascript" : key.endsWith(".json") ? "application/json" : key.endsWith(".css") ? "text/css" : "application/octet-stream");
          res.end(body);
        } catch { next(); }
      });
    },
    async generateBundle() {
      for (const [fileName, source] of Object.entries(files())) this.emitFile({ type: "asset", fileName, source });
      for (const [fileName, source] of Object.entries(await pagefindAssets())) this.emitFile({ type: "asset", fileName: `pagefind/${fileName}`, source });
    },
  };
}

// GitHub Pages (uor.foundation) cannot serve Lovable CDN paths, so an asset pointer with a
// committed sibling file bundles that file and keeps the pointer's shape ({ url, ... }).
function localAssetPointers(): Plugin {
  return {
    name: "local-asset-pointers",
    enforce: "pre",
    async resolveId(source, importer, options) {
      if (!source.split("?")[0].endsWith(".asset.json")) return null;
      const r = await this.resolve(source, importer, { ...options, skipSelf: true });
      const file = r?.id.split("?")[0];
      if (!file || !fs.existsSync(file.slice(0, -".asset.json".length))) return null;
      return "\0local-asset:" + file + ".js";
    },
    load(id) {
      if (!id.startsWith("\0local-asset:")) return null;
      const file = id.slice("\0local-asset:".length, -".js".length);
      const meta = JSON.parse(fs.readFileSync(file, "utf8"));
      return `import url from ${JSON.stringify(file.slice(0, -".asset.json".length))};\nexport default { ...${JSON.stringify(meta)}, url };`;
    },
  };
}

export default defineConfig(({ mode }) => ({
  server: { host: "::", port: 8080, hmr: { overlay: false } },
  plugins: [localAssetPointers(), react(), agentDocs(), mode === "development" && componentTagger()].filter(Boolean),
  css: { postcss: { plugins: [tailwindcss(), autoprefixer()] } },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
}));
