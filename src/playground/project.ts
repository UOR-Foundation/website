import { strFromU8, strToU8, compressSync, gunzipSync } from "fflate";

export type ProjectFiles = Record<string, string>;
export const STORAGE_KEY = "uor-playground-project-v1";
export const EXAMPLES = [
  { id: "identity", name: "Content identity", source: `import { codeHash, describe } from 'prism-code';

const source = 'const answer = 42;\\n';
const hash = codeHash(source);

console.log('Content identity');
console.log(hash);
console.log('Source facts');
console.log(JSON.stringify(describe(source), null, 2));
` },
  { id: "canonical", name: "Canonical form", source: `import { canonicalize, codeHash } from 'prism-code';

const original = 'const answer = 42;  \\r\\n\\r\\n';
const canonical = canonicalize(original);

console.log('Original:', JSON.stringify(original));
console.log('Canonical:', JSON.stringify(canonical));
console.log('Same identity:', codeHash(original) === codeHash(canonical));
` },
  { id: "changes", name: "Detect changes", source: `import { differs, codeHash } from 'prism-code';

const original = 'const answer = 42;\\n';
const reformatted = 'const answer = 42;   \\r\\n';
const changed = 'const answer = 43;\\n';

console.log('Formatting changes substance:', differs(original, reformatted));
console.log('Value changes substance:', differs(original, changed));
console.log('Original identity:', codeHash(original));
console.log('Changed identity:', codeHash(changed));
` },
] as const;

export function createProject(exampleId = "identity"): ProjectFiles {
  const example = EXAMPLES.find((item) => item.id === exampleId) ?? EXAMPLES[0];
  return {
    "index.ts": example.source,
    "package.json": JSON.stringify({ name: "prism-playground", private: true, type: "module", scripts: { start: "tsx index.ts" }, dependencies: { "prism-code": "0.1.0", tsx: "4.20.6", typescript: "5.9.3" } }, null, 2) + "\n",
    "tsconfig.json": JSON.stringify({ compilerOptions: { target: "ES2022", module: "ESNext", moduleResolution: "Bundler", strict: true, skipLibCheck: true, noEmit: true } }, null, 2) + "\n",
  };
}

export function validFilename(name: string): boolean {
  return /^[a-zA-Z0-9_.][a-zA-Z0-9_.\/-]{0,79}$/.test(name) && !name.split("/").some((part) => !part || part === ".." || part === ".") && !name.startsWith("node_modules/");
}

export function validateProject(value: unknown): ProjectFiles | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entries = Object.entries(value);
  if (entries.length > 30 || entries.length < 1) return null;
  if (!entries.every(([name, source]) => validFilename(name) && typeof source === "string" && source.length <= 100_000)) return null;
  if (typeof (value as ProjectFiles)["index.ts"] !== "string" || typeof (value as ProjectFiles)["package.json"] !== "string") return null;
  return Object.fromEntries(entries);
}

export function encodeProject(files: ProjectFiles): string {
  const bytes = compressSync(strToU8(JSON.stringify(files)));
  return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join("")).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeProject(encoded: string): ProjectFiles | null {
  if (!encoded || encoded.length > 80_000) return null;
  try {
    const raw = atob(encoded.replace(/-/g, "+").replace(/_/g, "/"));
    const compressed = Uint8Array.from(raw, (char) => char.charCodeAt(0));
    // Limit decompression before allocating an attacker controlled payload.
    const size = new DataView(compressed.buffer).getUint32(compressed.length - 4, true);
    if (size > 500_000) return null;
    return validateProject(JSON.parse(strFromU8(gunzipSync(compressed, { out: new Uint8Array(size) }))));
  } catch { return null; }
}

export function loadProject(): ProjectFiles {
  const shared = window.location.hash.startsWith("#code=") ? decodeProject(window.location.hash.slice(6)) : null;
  if (shared) return shared;
  try { return validateProject(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null")) ?? createProject(); }
  catch { return createProject(); }
}