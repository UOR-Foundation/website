/**
 * Semantic Chunker — Sentence-boundary-aligned overlapping windows
 * ═══════════════════════════════════════════════════════════════════
 *
 * Splits extracted text into ~512-token chunks with 64-token overlap.
 * Each chunk gets its own UOR CID for granular content-addressing.
 */

const CHUNK_SIZE = 2048;   // ~512 tokens * ~4 chars/token
const OVERLAP = 256;       // ~64 tokens overlap

/** Split on sentence boundaries (period/exclamation/question + space) */
function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);
}

/**
 * Chunk text into overlapping windows aligned to sentence boundaries.
 * Returns array of chunk strings.
 */
export function chunkText(text: string): string[] {
  if (!text || text.trim().length === 0) return [];
  
  const cleaned = text.replace(/\s+/g, " ").trim();
  
  // If text is small enough, return as single chunk
  if (cleaned.length <= CHUNK_SIZE) return [cleaned];
  
  const sentences = splitSentences(cleaned);
  const chunks: string[] = [];
  let currentChunk = "";
  let sentenceBuffer: string[] = [];
  
  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length + 1 > CHUNK_SIZE && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      
      // Create overlap from last few sentences
      let overlapText = "";
      for (let i = sentenceBuffer.length - 1; i >= 0; i--) {
        if (overlapText.length + sentenceBuffer[i].length > OVERLAP) break;
        overlapText = sentenceBuffer[i] + " " + overlapText;
      }
      currentChunk = overlapText.trim() + " " + sentence;
      sentenceBuffer = [sentence];
    } else {
      currentChunk += (currentChunk ? " " : "") + sentence;
      sentenceBuffer.push(sentence);
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}
