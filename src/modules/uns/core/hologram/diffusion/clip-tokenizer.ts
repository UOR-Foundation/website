/**
 * CLIP Tokenizer — Browser-Native BPE Tokenizer
 * ════════════════════════════════════════════════
 *
 * Minimal CLIP tokenizer for Stable Diffusion text encoding.
 * Tokenizes prompts into token IDs for the CLIP text encoder.
 *
 * @module uns/core/hologram/diffusion/clip-tokenizer
 */

import { buildProxyUrl } from "../model-proxy";

// ── Constants ─────────────────────────────────────────────────────────────

const MAX_LENGTH = 77; // CLIP context length
const BOS_TOKEN = 49406; // <|startoftext|>
const EOS_TOKEN = 49407; // <|endoftext|>
const PAD_TOKEN = EOS_TOKEN;

// ── Tokenizer ─────────────────────────────────────────────────────────────

export class ClipTokenizer {
  private vocab: Map<string, number> = new Map();
  private merges: [string, string][] = [];
  private bpeCache: Map<string, string[]> = new Map();
  private ready = false;

  /**
   * Load vocabulary and merges from model files.
   */
  async load(modelId: string): Promise<void> {
    if (this.ready) return;

    console.log("[ClipTokenizer] Loading vocab & merges...");

    const [vocabRes, mergesRes] = await Promise.all([
      fetch(buildProxyUrl("tokenizer/vocab.json", modelId), { redirect: "follow" }),
      fetch(buildProxyUrl("tokenizer/merges.txt", modelId), { redirect: "follow" }),
    ]);

    if (!vocabRes.ok) throw new Error(`Failed to load vocab: ${vocabRes.status}`);
    if (!mergesRes.ok) throw new Error(`Failed to load merges: ${mergesRes.status}`);

    const vocabJson = await vocabRes.json();
    for (const [token, id] of Object.entries(vocabJson)) {
      this.vocab.set(token, id as number);
    }

    const mergesText = await mergesRes.text();
    const lines = mergesText.split("\n").filter(l => l.trim() && !l.startsWith("#"));
    for (const line of lines) {
      const parts = line.split(" ");
      if (parts.length === 2) {
        this.merges.push([parts[0], parts[1]]);
      }
    }

    this.ready = true;
    console.log(`[ClipTokenizer] Loaded ${this.vocab.size} vocab, ${this.merges.length} merges`);
  }

  /**
   * Tokenize a text prompt into CLIP token IDs.
   * Pads/truncates to MAX_LENGTH (77 tokens).
   */
  encode(text: string): { inputIds: BigInt64Array; attentionMask: BigInt64Array } {
    if (!this.ready) throw new Error("Tokenizer not loaded");

    // Clean and lowercase
    const cleaned = text.toLowerCase().trim();

    // Simple whitespace tokenization + BPE
    const words = cleaned.split(/\s+/).filter(w => w.length > 0);
    const tokens: number[] = [BOS_TOKEN];

    for (const word of words) {
      const bpeTokens = this.bpe(word + "</w>");
      for (const t of bpeTokens) {
        const id = this.vocab.get(t);
        if (id !== undefined) {
          tokens.push(id);
        }
      }
      if (tokens.length >= MAX_LENGTH - 1) break;
    }

    tokens.push(EOS_TOKEN);

    // Pad to MAX_LENGTH
    const inputIds = new BigInt64Array(MAX_LENGTH);
    const attentionMask = new BigInt64Array(MAX_LENGTH);

    for (let i = 0; i < MAX_LENGTH; i++) {
      if (i < tokens.length) {
        inputIds[i] = BigInt(tokens[i]);
        attentionMask[i] = 1n;
      } else {
        inputIds[i] = BigInt(PAD_TOKEN);
        attentionMask[i] = 0n;
      }
    }

    return { inputIds, attentionMask };
  }

  /**
   * Byte-Pair Encoding for a single word.
   */
  private bpe(word: string): string[] {
    const cached = this.bpeCache.get(word);
    if (cached) return cached;

    let chars = word.split("");
    if (chars.length === 0) return [];

    // Iteratively merge pairs
    for (const [a, b] of this.merges) {
      const merged: string[] = [];
      let i = 0;
      while (i < chars.length) {
        if (i < chars.length - 1 && chars[i] === a && chars[i + 1] === b) {
          merged.push(a + b);
          i += 2;
        } else {
          merged.push(chars[i]);
          i++;
        }
      }
      chars = merged;
      if (chars.length === 1) break;
    }

    this.bpeCache.set(word, chars);
    return chars;
  }
}
