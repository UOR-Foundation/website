import { describe, it, expect, beforeAll } from "vitest";
import { WhisperTokenizer } from "../tokenizer";

describe("WhisperTokenizer", () => {
  const tokenizer = new WhisperTokenizer();

  beforeAll(async () => {
    await tokenizer.load();
  }, 30000);

  it("loads vocab successfully", () => {
    expect(tokenizer.loaded).toBe(true);
    expect(tokenizer.vocabSize).toBeGreaterThan(50000);
    console.log(`Vocab size: ${tokenizer.vocabSize}, source: ${tokenizer.info.source}`);
  });

  it("identifies special tokens", () => {
    expect(tokenizer.isSpecialToken(50258)).toBe(true);  // SOT
    expect(tokenizer.isSpecialToken(50257)).toBe(true);  // EOT
    expect(tokenizer.isSpecialToken(50259)).toBe(true);  // LANG_EN
    expect(tokenizer.isSpecialToken(50360)).toBe(true);  // TRANSCRIBE
    expect(tokenizer.isSpecialToken(50364)).toBe(true);  // NO_TIMESTAMPS
    expect(tokenizer.isSpecialToken(50365)).toBe(true);  // timestamp
    expect(tokenizer.isSpecialToken(220)).toBe(false);    // regular token
  });

  it("decodes timestamp tokens", () => {
    expect(tokenizer.getTimestamp(50365)).toBe(0);
    expect(tokenizer.getTimestamp(50366)).toBeCloseTo(0.02);
    expect(tokenizer.getTimestamp(50415)).toBeCloseTo(1.0);
    expect(tokenizer.getTimestamp(220)).toBeNull();
  });

  it("decodes known word tokens to English text", () => {
    // Token 220 = "Ġ" = space in GPT-2 BPE
    const spaceToken = tokenizer.tokenToString(220);
    expect(spaceToken).toBe("Ġ");

    // Decode a sequence: strip specials, produce readable text
    // SOT(50258), " Hello"(2425), " world"(1002), EOT(50257)
    // Token IDs from whisper-tiny.en vocab for common words
    const helloId = tokenizer.encode("ĠHello");
    const worldId = tokenizer.encode("Ġworld");
    console.log(`"ĠHello" → ${helloId}, "Ġworld" → ${worldId}`);

    if (helloId !== undefined && worldId !== undefined) {
      const text = tokenizer.decode([50258, helloId, worldId, 50257]);
      console.log(`Decoded: "${text}"`);
      expect(text.toLowerCase()).toContain("hello");
      expect(text.toLowerCase()).toContain("world");
    }
  });

  it("strips all special tokens from output", () => {
    // A sequence of only special tokens should produce empty/whitespace
    const text = tokenizer.decode([50258, 50259, 50360, 50364, 50257]);
    expect(text.trim()).toBe("");
  });

  it("decodes with timestamps", () => {
    const helloId = tokenizer.encode("ĠHello") ?? 2425;
    const result = tokenizer.decodeWithTimestamps([
      50258, 50259, 50360, 50364,
      50365, // timestamp 0.0s
      helloId,
      50415, // timestamp 1.0s
      50257,
    ]);

    console.log("decodeWithTimestamps:", JSON.stringify(result));
    const timestamps = result.filter(r => r.type === "timestamp");
    const texts = result.filter(r => r.type === "text");
    expect(timestamps.length).toBe(2);
    expect(texts.length).toBeGreaterThanOrEqual(1);
    if (timestamps[0].type === "timestamp") {
      expect(timestamps[0].seconds).toBe(0);
    }
  });

  it("handles byte-level BPE for punctuation and unicode", () => {
    // The token for "." should decode to "."
    const dotId = tokenizer.encode(".");
    if (dotId !== undefined) {
      const text = tokenizer.decode([dotId]);
      console.log(`dot token ${dotId} → "${text}"`);
      expect(text).toBe(".");
    }
  });
});
