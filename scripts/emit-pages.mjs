// GitHub Pages friendly routing: emit a real index.html for every site route and a
// 404.html SPA fallback, so deep links serve 200 responses and render the right page.
// Route HTML is a copy of the built index.html; each app reads window.location.pathname.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const dist = resolve(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const indexHtml = readFileSync(join(dist, "index.html"));

// Anything GitHub Pages cannot match serves 404.html with the URL unchanged, so the
// app still routes from the address bar.
writeFileSync(join(dist, "404.html"), indexHtml);

const mdFiles = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (entry.name.endsWith(".md")) mdFiles.push(relative(dist, path).split(/[\\/]/).join("/"));
  }
};
walk(dist);

// Markdown twins that are agent feeds or conveniences, not app routes.
const skip = new Set([
  "index.md",
  "docs/llms-full.md",
  "docs/requests.md",
  "docs/coming-from-containers.md",
]);

const routes = new Set(["docs", "blog", "playground"]);
for (const file of mdFiles) {
  if (skip.has(file)) continue;
  if (file.startsWith("docs/")) routes.add(`docs/${file.slice(5, -3)}`);
  else if (file.startsWith("blog/")) routes.add(`blog/${file.slice(5, -3)}`);
  else if (file === "about.md") routes.add("about");
  else if (file === "framework.md") routes.add("framework");
  else if (file === "agents/index.md") routes.add("agents");
  else if (file === "agents/discord.md") routes.add("agents/discord");
}

for (const route of routes) {
  mkdirSync(join(dist, route), { recursive: true });
  writeFileSync(join(dist, route, "index.html"), indexHtml);
}

console.log(`emit-pages: ${routes.size} route pages + 404.html`);
