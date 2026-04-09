/**
 * file-identity — UOR content-addressing for file explorer items.
 * Computes a deterministic identity from file content using SHA-256.
 * Same content → same address, everywhere, permanently.
 */

const identityCache = new Map<string, string>();

/**
 * Compute a truncated SHA-256 hex digest for the given text content.
 * This serves as the UOR content address — deterministic and permanent.
 */
export async function computeFileUorAddress(text: string): Promise<string> {
  const cached = identityCache.get(text);
  if (cached) return cached;

  const bytes = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  const hashArray = new Uint8Array(hashBuffer);
  const hex = Array.from(hashArray).map(b => b.toString(16).padStart(2, "0")).join("");

  identityCache.set(text, hex);
  return hex;
}

/** Get first N chars of a UOR address for display */
export function truncateAddress(address: string, chars = 8): string {
  return address.slice(0, chars);
}

/** Check if two items have the same content identity */
export function isSameContent(addr1: string, addr2: string): boolean {
  return addr1 === addr2;
}
