/**
 * Package Registry API — Client for the package-registry edge function.
 * Supports npm, cargo (crates.io), and PyPI lookups.
 */

import { supabase } from "@/integrations/supabase/client";

export type RegistryId = "npm" | "cargo" | "pypi";

export interface RegistrySearchResult {
  name: string;
  version: string;
  description: string;
  license: string;
  homepage: string;
  repository: string;
  keywords: string[];
  score?: number;
  downloads?: number;
}

export interface NpmMeta {
  name: string;
  version: string;
  description: string;
  license: string;
  homepage: string;
  repository: string;
  keywords: string[];
  dependencies: string[];
  devDependencies: string[];
  maintainers: string[];
  distTarball: string;
  distShasum: string;
  distIntegrity: string;
  unpackedSize: number;
  versions: number;
  created: string;
  modified: string;
}

export interface CargoMeta {
  name: string;
  version: string;
  description: string;
  license: string;
  homepage: string;
  repository: string;
  keywords: string[];
  categories: string[];
  downloads: number;
  recentDownloads: number;
  dependencies: string[];
  created: string;
  modified: string;
  versions: number;
  msrv: string | null;
}

export interface PypiMeta {
  name: string;
  version: string;
  description: string;
  license: string;
  homepage: string;
  repository: string;
  keywords: string[];
  author: string;
  authorEmail: string;
  requiresPython: string;
  dependencies: string[];
  classifiers: string[];
  versions: number;
  projectUrls: Record<string, string>;
}

export type PackageMeta = NpmMeta | CargoMeta | PypiMeta;

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("package-registry", { body });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.error ?? "Unknown registry error");
  return data.data as T;
}

export const registryApi = {
  search: (registry: RegistryId, query: string, limit = 15) =>
    call<RegistrySearchResult[]>({ registry, action: "search", query, limit }),

  meta: (registry: RegistryId, name: string) =>
    call<PackageMeta>({ registry, action: "meta", name }),
};

/** Registry display info */
export const REGISTRIES: Record<RegistryId, { label: string; color: string; installCmd: string; icon: string }> = {
  npm:   { label: "npm",       color: "hsl(5, 64%, 50%)",   installCmd: "npm install",   icon: "📦" },
  cargo: { label: "crates.io", color: "hsl(30, 70%, 50%)",  installCmd: "cargo install", icon: "🦀" },
  pypi:  { label: "PyPI",      color: "hsl(210, 60%, 50%)", installCmd: "pip install",   icon: "🐍" },
};
