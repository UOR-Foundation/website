/**
 * Service Mesh — Scrape Module Registration.
 * @ontology uor:ServiceMesh
 * ═════════════════════════════════════════════════════════════════
 *
 * Exposes web scraping: url, search.
 * Remote — requires network for Firecrawl API.
 *
 * @version 1.0.0
 */

import { register } from "../registry";

register({
  ns: "scrape",
  label: "Web Scraper",
  defaultRemote: true,
  operations: {
    url: {
      handler: async () => ({
        offline: true,
        message: "URL scraping requires network.",
      }),
      remote: true,
      description: "Scrape a URL and extract content as markdown",
      paramsSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: "URL to scrape" },
          formats: { type: "array", items: { type: "string" }, default: ["markdown"] },
          onlyMainContent: { type: "boolean", default: true },
        },
        required: ["url"],
      },
    },
    search: {
      handler: async () => ({
        offline: true,
        message: "Web search requires network.",
      }),
      remote: true,
      description: "Search the web and return structured results",
      paramsSchema: {
        type: "object",
        properties: {
          query: { type: "string" },
          limit: { type: "number", default: 8 },
        },
        required: ["query"],
      },
    },
  },
});
