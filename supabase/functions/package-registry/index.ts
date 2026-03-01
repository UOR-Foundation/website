/**
 * package-registry — Proxy for npm, crates.io, and PyPI metadata APIs.
 * ═════════════════════════════════════════════════════════════════════
 *
 * Endpoints (via POST body):
 *   { registry: "npm",   action: "search", query: "react" }
 *   { registry: "npm",   action: "meta",   name: "react" }
 *   { registry: "cargo", action: "search", query: "serde" }
 *   { registry: "cargo", action: "meta",   name: "serde" }
 *   { registry: "pypi",  action: "search", query: "requests" }
 *   { registry: "pypi",  action: "meta",   name: "requests" }
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// ── npm registry ────────────────────────────────────────────────────────

async function npmSearch(query: string, limit = 20) {
  const url = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=${limit}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`npm search failed: ${res.status}`);
  const data = await res.json();
  return (data.objects ?? []).map((o: any) => ({
    name: o.package.name,
    version: o.package.version,
    description: o.package.description ?? "",
    license: o.package.license ?? "unknown",
    homepage: o.package.links?.homepage ?? o.package.links?.npm ?? "",
    repository: o.package.links?.repository ?? "",
    keywords: o.package.keywords ?? [],
    score: Math.round((o.score?.final ?? 0) * 100),
  }));
}

async function npmMeta(name: string) {
  const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}`);
  if (!res.ok) throw new Error(`npm meta failed: ${res.status}`);
  const data = await res.json();
  const latest = data["dist-tags"]?.latest ?? Object.keys(data.versions ?? {}).pop() ?? "";
  const ver = data.versions?.[latest] ?? {};
  return {
    name: data.name,
    version: latest,
    description: data.description ?? "",
    license: data.license ?? ver.license ?? "unknown",
    homepage: data.homepage ?? "",
    repository: typeof data.repository === "string" ? data.repository : data.repository?.url ?? "",
    keywords: data.keywords ?? [],
    dependencies: Object.keys(ver.dependencies ?? {}),
    devDependencies: Object.keys(ver.devDependencies ?? {}),
    maintainers: (data.maintainers ?? []).map((m: any) => m.name ?? m.email ?? ""),
    distTarball: ver.dist?.tarball ?? "",
    distShasum: ver.dist?.shasum ?? "",
    distIntegrity: ver.dist?.integrity ?? "",
    unpackedSize: ver.dist?.unpackedSize ?? 0,
    versions: Object.keys(data.versions ?? {}).length,
    created: data.time?.created ?? "",
    modified: data.time?.modified ?? "",
  };
}

// ── crates.io registry ──────────────────────────────────────────────────

async function cargoSearch(query: string, limit = 20) {
  const url = `https://crates.io/api/v1/crates?q=${encodeURIComponent(query)}&per_page=${limit}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "hologram-os/1.0 (package-registry)" },
  });
  if (!res.ok) throw new Error(`crates.io search failed: ${res.status}`);
  const data = await res.json();
  return (data.crates ?? []).map((c: any) => ({
    name: c.name,
    version: c.max_version ?? c.newest_version ?? "",
    description: c.description ?? "",
    license: c.license ?? "unknown",
    homepage: c.homepage ?? "",
    repository: c.repository ?? "",
    keywords: c.keywords ?? [],
    downloads: c.downloads ?? 0,
  }));
}

async function cargoMeta(name: string) {
  const res = await fetch(`https://crates.io/api/v1/crates/${encodeURIComponent(name)}`, {
    headers: { "User-Agent": "hologram-os/1.0 (package-registry)" },
  });
  if (!res.ok) throw new Error(`crates.io meta failed: ${res.status}`);
  const data = await res.json();
  const cr = data.crate ?? {};
  const latest = (data.versions ?? [])[0] ?? {};
  return {
    name: cr.name,
    version: cr.max_version ?? latest.num ?? "",
    description: cr.description ?? "",
    license: latest.license ?? cr.license ?? "unknown",
    homepage: cr.homepage ?? "",
    repository: cr.repository ?? "",
    keywords: (data.keywords ?? []).map((k: any) => k.keyword ?? k),
    categories: (data.categories ?? []).map((c: any) => c.category ?? c),
    downloads: cr.downloads ?? 0,
    recentDownloads: cr.recent_downloads ?? 0,
    dependencies: (latest.dependencies ?? []).map((d: any) => d.crate_id ?? d),
    created: cr.created_at ?? "",
    modified: cr.updated_at ?? "",
    versions: (data.versions ?? []).length,
    msrv: latest.rust_version ?? null,
  };
}

// ── PyPI registry ───────────────────────────────────────────────────────

async function pypiSearch(query: string, limit = 20) {
  // PyPI has no search API — use the simple JSON endpoint or fall back to a search
  // We use the XMLRPC replacement: https://pypi.org/search/ is deprecated
  // Best approach: search via warehouse simple API + partial match
  const url = `https://pypi.org/pypi/${encodeURIComponent(query)}/json`;
  const res = await fetch(url);
  if (res.ok) {
    const data = await res.json();
    const info = data.info ?? {};
    return [{
      name: info.name,
      version: info.version ?? "",
      description: info.summary ?? "",
      license: info.license ?? "unknown",
      homepage: info.home_page ?? info.project_url ?? "",
      repository: (info.project_urls?.Source ?? info.project_urls?.Repository ?? ""),
      keywords: info.keywords?.split(",").map((k: string) => k.trim()).filter(Boolean) ?? [],
    }];
  }
  // Fallback: return empty — PyPI doesn't have a public free-text search API
  return [];
}

async function pypiMeta(name: string) {
  const res = await fetch(`https://pypi.org/pypi/${encodeURIComponent(name)}/json`);
  if (!res.ok) throw new Error(`PyPI meta failed: ${res.status}`);
  const data = await res.json();
  const info = data.info ?? {};
  const releases = Object.keys(data.releases ?? {});
  return {
    name: info.name,
    version: info.version ?? "",
    description: info.summary ?? "",
    license: info.license ?? "unknown",
    homepage: info.home_page ?? "",
    repository: info.project_urls?.Source ?? info.project_urls?.Repository ?? "",
    keywords: info.keywords?.split(",").map((k: string) => k.trim()).filter(Boolean) ?? [],
    author: info.author ?? "",
    authorEmail: info.author_email ?? "",
    requiresPython: info.requires_python ?? "",
    dependencies: (info.requires_dist ?? []).slice(0, 30),
    classifiers: (info.classifiers ?? []).slice(0, 10),
    versions: releases.length,
    created: "",
    modified: "",
    projectUrls: info.project_urls ?? {},
  };
}

// ── Handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { registry, action, query, name, limit } = await req.json();

    if (!registry || !action) {
      return json({ success: false, error: "registry and action are required" }, 400);
    }

    let result: unknown;

    switch (`${registry}:${action}`) {
      case "npm:search":    result = await npmSearch(query, limit); break;
      case "npm:meta":      result = await npmMeta(name); break;
      case "cargo:search":  result = await cargoSearch(query, limit); break;
      case "cargo:meta":    result = await cargoMeta(name); break;
      case "pypi:search":   result = await pypiSearch(query, limit); break;
      case "pypi:meta":     result = await pypiMeta(name); break;
      default:
        return json({ success: false, error: `Unknown: ${registry}:${action}` }, 400);
    }

    return json({ success: true, data: result });
  } catch (err) {
    console.error("package-registry error:", err);
    return json({ success: false, error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
