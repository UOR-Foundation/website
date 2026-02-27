/**
 * Whisper Tokenizer — GPT-2 BPE Token Decoder
 * ═════════════════════════════════════════════
 *
 * Decodes Whisper token IDs back into readable English text.
 * Uses the vocab.json from openai/whisper-tiny.en (GPT-2 byte-level BPE).
 *
 * Design:
 *   1. vocab.json is fetched from our storage bucket (self-hosted)
 *      with HuggingFace fallback
 *   2. Browser Cache API stores it permanently after first load
 *   3. Byte-level BPE tokens are decoded via unicode→byte table
 *
 * @module uns/core/hologram/whisper-compiler/tokenizer
 */

// ── Constants ──────────────────────────────────────────────────────────────

const VOCAB_CACHE_KEY = "hologram-whisper-vocab-v1";

const SELF_HOSTED_VOCAB_URL = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/app-assets/whisper-models/openai/whisper-tiny.en/resolve/main/vocab.json`;
const HF_VOCAB_URL = "https://huggingface.co/openai/whisper-tiny.en/resolve/main/vocab.json";

// Special token IDs
const SOT = 50258;
const EOT = 50257;
const LANG_EN = 50259;
const TRANSCRIBE = 50360;
const TRANSLATE = 50361;
const NO_TIMESTAMPS = 50364;
const TIMESTAMP_BEGIN = 50365;

const SPECIAL_TOKEN_IDS = new Set([
  SOT, EOT, LANG_EN, TRANSCRIBE, TRANSLATE, NO_TIMESTAMPS,
]);

// ── Byte ↔ Unicode mapping (GPT-2 byte-level BPE) ─────────────────────────

/**
 * GPT-2 maps each byte (0–255) to a printable unicode character.
 * This avoids whitespace/control chars in the vocab.
 * We need the reverse: unicode char → original byte.
 */
function buildByteDecoder(): Map<string, number> {
  const bs: number[] = [];
  const cs: number[] = [];
  
  // Printable ASCII ranges that map to themselves
  // 33–126 (! to ~), 161–172 (¡ to ¬), 174–255 (® to ÿ)
  for (let i = 33; i <= 126; i++) { bs.push(i); cs.push(i); }
  for (let i = 161; i <= 172; i++) { bs.push(i); cs.push(i); }
  for (let i = 174; i <= 255; i++) { bs.push(i); cs.push(i); }
  
  // Remaining bytes (0–32, 127–160, 173) get mapped to 256+
  let n = 0;
  for (let b = 0; b < 256; b++) {
    if (!bs.includes(b)) {
      bs.push(b);
      cs.push(256 + n);
      n++;
    }
  }
  
  // Build reverse map: unicode codepoint char → byte value
  const decoder = new Map<string, number>();
  for (let i = 0; i < bs.length; i++) {
    decoder.set(String.fromCodePoint(cs[i]), bs[i]);
  }
  return decoder;
}

const BYTE_DECODER = buildByteDecoder();

// ── Tokenizer ──────────────────────────────────────────────────────────────

export interface TokenizerInfo {
  vocabSize: number;
  loaded: boolean;
  source: "cache" | "self-hosted" | "huggingface" | "none";
}

export class WhisperTokenizer {
  private idToToken: Map<number, string> = new Map();
  private tokenToId: Map<string, number> = new Map();
  private _loaded = false;
  private _source: TokenizerInfo["source"] = "none";
  private _loadPromise: Promise<void> | null = null;

  get loaded(): boolean { return this._loaded; }
  get vocabSize(): number { return this.idToToken.size; }

  get info(): TokenizerInfo {
    return { vocabSize: this.vocabSize, loaded: this._loaded, source: this._source };
  }

  /**
   * Load vocab.json. Safe to call multiple times.
   */
  async load(): Promise<void> {
    if (this._loaded) return;
    if (this._loadPromise) return this._loadPromise;
    this._loadPromise = this._doLoad();
    return this._loadPromise;
  }

  private async _doLoad(): Promise<void> {
    try {
      // 1. Try browser Cache API
      const cached = await this._loadFromCache();
      if (cached) {
        this._buildMaps(cached);
        this._source = "cache";
        console.log(`[WhisperTokenizer] ✅ Loaded from cache (${this.vocabSize} tokens)`);
        return;
      }

      // 2. Try self-hosted
      let vocab: Record<string, number> | null = null;
      try {
        const res = await fetch(SELF_HOSTED_VOCAB_URL);
        if (res.ok) {
          vocab = await res.json();
          this._source = "self-hosted";
          console.log("[WhisperTokenizer] 📦 Loaded from self-hosted storage");
        }
      } catch { /* fall through */ }

      // 3. Fallback to HuggingFace
      if (!vocab) {
        const res = await fetch(HF_VOCAB_URL);
        if (!res.ok) throw new Error(`Failed to fetch vocab.json: ${res.status}`);
        vocab = await res.json();
        this._source = "huggingface";
        console.log("[WhisperTokenizer] 🌐 Loaded from HuggingFace");
      }

      this._buildMaps(vocab!);
      await this._saveToCache(vocab!);
      console.log(`[WhisperTokenizer] ✅ Ready (${this.vocabSize} tokens)`);
    } catch (err) {
      console.error("[WhisperTokenizer] Load failed:", err);
      throw err;
    } finally {
      this._loadPromise = null;
    }
  }

  private _buildMaps(vocab: Record<string, number>): void {
    this.idToToken.clear();
    this.tokenToId.clear();
    for (const [token, id] of Object.entries(vocab)) {
      this.idToToken.set(id, token);
      this.tokenToId.set(token, id);
    }
    this._loaded = true;
  }

  // ── Cache helpers ──────────────────────────────────────────────────────

  private async _loadFromCache(): Promise<Record<string, number> | null> {
    try {
      const cache = await caches.open(VOCAB_CACHE_KEY);
      const res = await cache.match(VOCAB_CACHE_KEY);
      if (res) return res.json();
    } catch { /* Cache API unavailable */ }
    return null;
  }

  private async _saveToCache(vocab: Record<string, number>): Promise<void> {
    try {
      const cache = await caches.open(VOCAB_CACHE_KEY);
      const res = new Response(JSON.stringify(vocab), {
        headers: { "Content-Type": "application/json" },
      });
      await cache.put(VOCAB_CACHE_KEY, res);
    } catch { /* Cache API unavailable */ }
  }

  // ── Decode ─────────────────────────────────────────────────────────────

  /**
   * Decode a single token ID to its raw BPE string.
   */
  tokenToString(id: number): string | undefined {
    return this.idToToken.get(id);
  }

  /**
   * Check if a token ID is a special control token.
   */
  isSpecialToken(id: number): boolean {
    if (SPECIAL_TOKEN_IDS.has(id)) return true;
    // Timestamp tokens: 50365+
    if (id >= TIMESTAMP_BEGIN) return true;
    return false;
  }

  /**
   * Check if a token ID is a timestamp token.
   * Returns the timestamp in seconds if so.
   */
  getTimestamp(id: number): number | null {
    if (id >= TIMESTAMP_BEGIN) {
      return (id - TIMESTAMP_BEGIN) * 0.02; // 20ms per timestamp token
    }
    return null;
  }

  /**
   * Decode an array of token IDs into readable text.
   * Strips special tokens, decodes GPT-2 byte-level BPE.
   *
   * The Ġ character in GPT-2 BPE represents a leading space.
   */
  decode(tokenIds: number[]): string {
    if (!this._loaded) throw new Error("Tokenizer not loaded. Call load() first.");

    // Filter out special tokens and collect BPE strings
    const pieces: string[] = [];
    for (const id of tokenIds) {
      if (this.isSpecialToken(id)) continue;
      const token = this.idToToken.get(id);
      if (token !== undefined) pieces.push(token);
    }

    // Join all BPE pieces, then decode byte-level encoding
    const joined = pieces.join("");
    return this._decodeBpe(joined);
  }

  /**
   * Decode with timestamps preserved as markers.
   */
  decodeWithTimestamps(tokenIds: number[]): Array<{ type: "text"; text: string } | { type: "timestamp"; seconds: number }> {
    if (!this._loaded) throw new Error("Tokenizer not loaded. Call load() first.");

    const result: Array<{ type: "text"; text: string } | { type: "timestamp"; seconds: number }> = [];
    let buffer: string[] = [];

    const flushBuffer = () => {
      if (buffer.length > 0) {
        const text = this._decodeBpe(buffer.join(""));
        if (text.trim()) result.push({ type: "text", text });
        buffer = [];
      }
    };

    for (const id of tokenIds) {
      const ts = this.getTimestamp(id);
      if (ts !== null) {
        flushBuffer();
        result.push({ type: "timestamp", seconds: ts });
        continue;
      }
      if (this.isSpecialToken(id)) continue;
      const token = this.idToToken.get(id);
      if (token !== undefined) buffer.push(token);
    }

    flushBuffer();
    return result;
  }

  /**
   * Decode GPT-2 byte-level BPE string to UTF-8 text.
   * Each character in the BPE string maps to a byte via the GPT-2 table.
   */
  private _decodeBpe(bpeString: string): string {
    const bytes: number[] = [];
    for (const ch of bpeString) {
      const b = BYTE_DECODER.get(ch);
      if (b !== undefined) {
        bytes.push(b);
      }
    }
    return new TextDecoder("utf-8").decode(new Uint8Array(bytes));
  }

  // ── Encode (simple lookup, no merges) ──────────────────────────────────

  /**
   * Look up a known token string → ID. Useful for special tokens.
   * For full encoding (text → token IDs) you'd need merge rules;
   * this is just a convenience for known tokens.
   */
  encode(token: string): number | undefined {
    return this.tokenToId.get(token);
  }
}

// ── Singleton ──────────────────────────────────────────────────────────────

let _tokenizer: WhisperTokenizer | null = null;

export function getWhisperTokenizer(): WhisperTokenizer {
  if (!_tokenizer) _tokenizer = new WhisperTokenizer();
  return _tokenizer;
}
