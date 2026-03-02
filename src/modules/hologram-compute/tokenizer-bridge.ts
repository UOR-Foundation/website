/**
 * Tokenizer Bridge — Load Real Vocabularies for Atlas Partitioning
 * ════════════════════════════════════════════════════════════════
 *
 * Bridges HuggingFace tokenizer vocabularies with the VocabularyPartitioner.
 * Loads tokenizer.json from HuggingFace Hub and extracts the vocabulary map.
 *
 * Supported models:
 *   - HuggingFaceTB/SmolLM2-1.7B (49,152 tokens)
 *   - meta-llama/Meta-Llama-3-70B (128,256 tokens)
 *   - Any model with a tokenizer.json on HuggingFace Hub
 *
 * @module hologram-compute/tokenizer-bridge
 */

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface TokenizerInfo {
  modelId: string;
  vocabSize: number;
  vocabulary: Map<number, string>;
  specialTokens: Set<number>;
  loadTimeMs: number;
}

export interface TokenizerLoadProgress {
  stage: "fetching" | "parsing" | "extracting" | "ready" | "error";
  progress: number;
  message: string;
}

// ═══════════════════════════════════════════════════════════════
// Well-known model vocabularies (fallback for CORS-blocked models)
// ═══════════════════════════════════════════════════════════════

/**
 * Generate a synthetic but semantically structured vocabulary.
 * 
 * This creates a vocabulary that follows real tokenizer patterns:
 * - Byte tokens (0-255)
 * - Common English words
 * - Subword units (prefixed with Ġ like GPT-style)
 * - Special tokens
 *
 * Used when HuggingFace Hub is unreachable or model requires auth.
 */
function generateStructuredVocabulary(vocabSize: number, modelId: string): Map<number, string> {
  const vocab = new Map<number, string>();

  // ── Special tokens ──
  const specials = ["<s>", "</s>", "<unk>", "<pad>", "<|endoftext|>", "<|im_start|>", "<|im_end|>"];
  for (let i = 0; i < specials.length && i < vocabSize; i++) {
    vocab.set(i, specials[i]);
  }

  // ── Byte tokens (like SmolLM/Llama byte fallback) ──
  let id = specials.length;
  for (let b = 0; b < 256 && id < vocabSize; b++, id++) {
    vocab.set(id, `<0x${b.toString(16).padStart(2, '0').toUpperCase()}>`);
  }

  // ── Common English words and subwords ──
  const words = [
    "the", "of", "and", "to", "in", "a", "is", "that", "for", "it",
    "was", "on", "are", "as", "with", "his", "they", "be", "at", "one",
    "have", "this", "from", "or", "had", "by", "not", "but", "what", "all",
    "were", "we", "when", "your", "can", "said", "there", "each", "which", "she",
    "do", "how", "their", "if", "will", "up", "other", "about", "out", "many",
    "then", "them", "these", "so", "some", "her", "would", "make", "like", "him",
    "into", "time", "has", "look", "two", "more", "write", "go", "see", "number",
    "no", "way", "could", "people", "my", "than", "first", "been", "call", "who",
    "its", "now", "find", "long", "down", "day", "did", "get", "come", "made",
    "may", "part", "over", "new", "after", "also", "back", "use", "just", "know",
    // Technical/scientific vocabulary
    "quantum", "neural", "tensor", "matrix", "vector", "gradient", "kernel",
    "coherence", "manifold", "topology", "lattice", "algebra", "geometry",
    "function", "algorithm", "compute", "memory", "state", "system", "model",
    "network", "layer", "attention", "embedding", "projection", "transform",
    "inference", "training", "parameter", "weight", "bias", "activation",
    "entropy", "probability", "distribution", "sample", "token", "sequence",
    "encoder", "decoder", "input", "output", "hidden", "dimension", "batch",
    "learning", "optimization", "convergence", "loss", "accuracy", "metric",
    "data", "feature", "representation", "space", "point", "distance",
    "energy", "field", "wave", "particle", "phase", "frequency", "amplitude",
    "symmetry", "group", "ring", "module", "morphism", "category", "functor",
    // Common subwords
    "ing", "tion", "ment", "ness", "able", "ful", "less", "ous", "ive", "al",
    "er", "ed", "ly", "en", "ize", "ify", "ure", "ism", "ist", "ity",
    "pre", "un", "re", "dis", "mis", "over", "under", "out", "sub", "super",
  ];

  // Add words with Ġ prefix (space-prefixed, like GPT tokenizers)
  for (const word of words) {
    if (id >= vocabSize) break;
    vocab.set(id++, `Ġ${word}`);
  }

  // Add words without prefix
  for (const word of words) {
    if (id >= vocabSize) break;
    vocab.set(id++, word);
  }

  // ── Fill remaining with character n-grams ──
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,!?;:'\"-()[]{}/ \n\t";
  
  // Bigrams
  for (let i = 0; i < chars.length && id < vocabSize; i++) {
    for (let j = 0; j < chars.length && id < vocabSize; j++) {
      vocab.set(id++, chars[i] + chars[j]);
    }
  }

  // Trigrams for remaining slots
  for (let i = 0; i < chars.length && id < vocabSize; i++) {
    for (let j = 0; j < chars.length && id < vocabSize; j++) {
      for (let k = 0; k < chars.length && id < vocabSize; k++) {
        vocab.set(id++, chars[i] + chars[j] + chars[k]);
      }
    }
  }

  return vocab;
}

// ═══════════════════════════════════════════════════════════════
// Tokenizer Loading
// ═══════════════════════════════════════════════════════════════

/** Known model vocabulary sizes */
const KNOWN_VOCAB_SIZES: Record<string, number> = {
  "HuggingFaceTB/SmolLM2-1.7B": 49152,
  "HuggingFaceTB/SmolLM2-135M": 49152,
  "meta-llama/Meta-Llama-3-70B": 128256,
  "meta-llama/Meta-Llama-3.1-8B": 128256,
  "mistralai/Mistral-7B-v0.1": 32000,
  "Xenova/gpt2": 50257,
};

/**
 * Load a tokenizer vocabulary from HuggingFace Hub.
 *
 * Attempts to fetch tokenizer.json from the Hub. If that fails
 * (CORS, auth required, etc.), falls back to a structured synthetic
 * vocabulary that matches the model's vocab size.
 */
export async function loadTokenizerVocabulary(
  modelId: string,
  onProgress?: (progress: TokenizerLoadProgress) => void,
): Promise<TokenizerInfo> {
  const t0 = performance.now();

  onProgress?.({ stage: "fetching", progress: 0, message: `Loading tokenizer for ${modelId}...` });

  const vocabSize = KNOWN_VOCAB_SIZES[modelId] ?? 32000;
  let vocabulary: Map<number, string>;
  const specialTokens = new Set<number>();

  try {
    // Try fetching tokenizer.json from HuggingFace Hub
    const url = `https://huggingface.co/${modelId}/resolve/main/tokenizer.json`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });

    if (resp.ok) {
      onProgress?.({ stage: "parsing", progress: 0.3, message: "Parsing tokenizer..." });
      const data = await resp.json();

      vocabulary = new Map<number, string>();

      // Extract vocabulary from tokenizer.json structure
      if (data.model?.vocab) {
        // BPE-style tokenizer
        const vocabObj = data.model.vocab;
        for (const [token, id] of Object.entries(vocabObj)) {
          if (typeof id === "number") {
            vocabulary.set(id, token);
          }
        }
      } else if (data.added_tokens) {
        // Fallback to added_tokens
        for (const at of data.added_tokens) {
          vocabulary.set(at.id, at.content);
          if (at.special) specialTokens.add(at.id);
        }
      }

      // If we got very few tokens, supplement with synthetic
      if (vocabulary.size < 1000) {
        console.warn(`[TokenizerBridge] Only got ${vocabulary.size} tokens from tokenizer.json, using synthetic`);
        vocabulary = generateStructuredVocabulary(vocabSize, modelId);
      }

      onProgress?.({ stage: "extracting", progress: 0.8, message: `Extracted ${vocabulary.size} tokens` });
    } else {
      throw new Error(`HTTP ${resp.status}`);
    }
  } catch (err) {
    console.warn(`[TokenizerBridge] Could not fetch tokenizer for ${modelId}, using structured synthetic vocabulary:`, err);
    onProgress?.({ stage: "extracting", progress: 0.5, message: "Using structured synthetic vocabulary..." });
    vocabulary = generateStructuredVocabulary(vocabSize, modelId);
  }

  // Mark common special token IDs
  for (const [id, str] of vocabulary) {
    if (str.startsWith("<") && str.endsWith(">")) {
      specialTokens.add(id);
    }
  }

  const info: TokenizerInfo = {
    modelId,
    vocabSize: vocabulary.size,
    vocabulary,
    specialTokens,
    loadTimeMs: performance.now() - t0,
  };

  onProgress?.({ stage: "ready", progress: 1.0, message: `Ready: ${vocabulary.size} tokens loaded in ${info.loadTimeMs.toFixed(0)}ms` });

  console.log(`[TokenizerBridge] ${modelId}: ${vocabulary.size} tokens, ${specialTokens.size} special, ${info.loadTimeMs.toFixed(0)}ms`);
  return info;
}

/**
 * Simple encode: convert text to token IDs using the vocabulary.
 * This is a basic greedy longest-match tokenizer (not BPE).
 * For accurate results, use @huggingface/transformers.
 */
export function simpleEncode(text: string, vocabulary: Map<number, string>): number[] {
  // Build reverse map (string → id), preferring longer tokens
  const reverseMap = new Map<string, number>();
  let maxLen = 0;
  for (const [id, str] of vocabulary) {
    if (!reverseMap.has(str) || id < reverseMap.get(str)!) {
      reverseMap.set(str, id);
      if (str.length > maxLen) maxLen = str.length;
    }
  }

  const tokens: number[] = [];
  let pos = 0;

  while (pos < text.length) {
    let found = false;
    // Try longest match first
    for (let len = Math.min(maxLen, text.length - pos); len >= 1; len--) {
      const substr = text.substring(pos, pos + len);
      // Try with Ġ prefix (space-prefixed tokens)
      const withPrefix = pos > 0 ? `Ġ${substr}` : substr;
      if (reverseMap.has(withPrefix)) {
        tokens.push(reverseMap.get(withPrefix)!);
        pos += len;
        found = true;
        break;
      }
      if (reverseMap.has(substr)) {
        tokens.push(reverseMap.get(substr)!);
        pos += len;
        found = true;
        break;
      }
    }
    if (!found) {
      // Fallback: byte encoding
      const byte = text.charCodeAt(pos);
      const byteToken = `<0x${byte.toString(16).padStart(2, '0').toUpperCase()}>`;
      if (reverseMap.has(byteToken)) {
        tokens.push(reverseMap.get(byteToken)!);
      } else {
        tokens.push(byte % 256); // Raw byte fallback
      }
      pos++;
    }
  }

  return tokens;
}

/**
 * Simple decode: convert token IDs back to text.
 */
export function simpleDecode(tokenIds: number[], vocabulary: Map<number, string>): string {
  return tokenIds.map(id => {
    const str = vocabulary.get(id) ?? `<${id}>`;
    // Remove Ġ prefix (convert back to space)
    return str.startsWith("Ġ") ? " " + str.slice(1) : str;
  }).join("");
}
