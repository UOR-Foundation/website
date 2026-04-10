/**
 * wolfram-client — Client-side API for the wolfram-compute edge function.
 *
 * Returns structured pods from Wolfram Alpha for any natural language query.
 */

const WOLFRAM_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wolfram-compute`;

export interface WolframSubpod {
  title: string;
  plaintext: string;
  img?: { src: string; alt: string; width: string; height: string };
}

export interface WolframPod {
  title: string;
  id: string;
  subpods: WolframSubpod[];
  primary?: boolean;
}

export interface WolframResult {
  success: boolean;
  inputInterpretation?: string;
  pods: WolframPod[];
  didYouMean?: string[];
  error?: string;
}

/** Detect if a query is likely computable (math, science, data) */
export function isComputableQuery(query: string): boolean {
  const q = query.toLowerCase().trim();

  // Math patterns
  if (/\d/.test(q) && /[+\-*/^=()]/.test(q)) return true;
  if (/^(solve|integrate|derivative|factor|simplify|expand|limit|sum|plot)\s/i.test(q)) return true;
  if (/\b(sin|cos|tan|log|ln|sqrt|exp)\s*\(/i.test(q)) return true;

  // Science/data patterns
  if (/\b(mass|weight|density|speed|distance|radius|population|gdp|temperature|boiling point|melting point|atomic number|molecular weight)\s+(of|for)\b/i.test(q)) return true;
  if (/\bhow (many|much|far|fast|old|tall|heavy|big)\b/i.test(q)) return true;
  if (/\bconvert\s+\d/i.test(q)) return true;
  if (/\b\d+\s*(km|mi|kg|lb|ft|m|cm|mph|kph|celsius|fahrenheit|kelvin)\b/i.test(q)) return true;

  // Chemical formulas
  if (/^[A-Z][a-z]?\d*([A-Z][a-z]?\d*)+$/i.test(q.replace(/\s/g, ""))) return true;

  // Comparison/calculation keywords
  if (/\b(compare|versus|vs\.?|calculate|compute|evaluate)\b/i.test(q)) return true;

  return false;
}

/** Fetch computational results from Wolfram Alpha */
export async function queryWolfram(
  query: string,
  signal?: AbortSignal
): Promise<WolframResult> {
  try {
    const res = await fetch(WOLFRAM_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      signal,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Wolfram API error [${res.status}]: ${text}`);
    }

    return await res.json();
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { success: false, pods: [], error: "Aborted" };
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, pods: [], error: message };
  }
}
