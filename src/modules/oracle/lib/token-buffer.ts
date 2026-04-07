/**
 * TokenBuffer — humanized text reveal
 *
 * Queues raw SSE tokens and flushes them to the UI at a natural,
 * variable cadence so the stream feels like a human typing rather
 * than a machine dumping bytes.
 */

export class TokenBuffer {
  private queue: string[] = [];
  private accumulated = "";
  private running = false;
  private rafId: number | null = null;
  private lastFlush = 0;
  private onFlush: (text: string) => void;

  /** Base interval between flushes (ms). Randomised ±15 ms each tick. */
  private baseInterval = 35;
  /** Extra pause after sentence-ending punctuation (ms). */
  private sentencePause = 280;

  constructor(onFlush: (text: string) => void) {
    this.onFlush = onFlush;
  }

  /** Push a raw token from the SSE stream. */
  push(token: string) {
    this.queue.push(token);
    if (this.running && !this.rafId) this.scheduleFlush();
  }

  /** Start the flush loop. */
  start() {
    this.running = true;
    this.accumulated = "";
    this.queue = [];
    this.lastFlush = performance.now();
    this.scheduleFlush();
  }

  /** Stop the loop and flush everything remaining. */
  stop() {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    // drain remaining
    if (this.queue.length) {
      this.accumulated += this.queue.join("");
      this.queue = [];
      this.onFlush(this.accumulated);
    }
  }

  /** Immediately flush all queued tokens (e.g. on unmount). */
  flush() {
    this.stop();
  }

  /* ── internals ── */

  private scheduleFlush() {
    this.rafId = requestAnimationFrame((now) => {
      this.rafId = null;
      if (!this.running) return;

      const elapsed = now - this.lastFlush;
      const interval = this.currentInterval();

      if (elapsed < interval) {
        // not time yet — reschedule
        this.scheduleFlush();
        return;
      }

      if (this.queue.length === 0) {
        // nothing to flush — wait for next push
        return;
      }

      // Batch: take one token (or multiple tiny ones)
      let batch = "";
      while (this.queue.length > 0) {
        batch += this.queue.shift()!;
        // keep batching single-char tokens to avoid flicker
        if (batch.length >= 3 || this.queue.length === 0) break;
      }

      this.accumulated += batch;
      this.lastFlush = now;
      this.onFlush(this.accumulated);

      if (this.queue.length > 0 || this.running) {
        this.scheduleFlush();
      }
    });
  }

  /** Determine current flush interval, adding variance and sentence pauses. */
  private currentInterval(): number {
    const variance = (Math.random() - 0.5) * 30; // ±15ms
    const base = this.baseInterval + variance;

    // Check if the last flushed char was sentence-ending
    if (this.accumulated.length > 0) {
      const lastChar = this.accumulated[this.accumulated.length - 1];
      if (lastChar === "." || lastChar === "!" || lastChar === "?") {
        // Only pause if the next token starts a new sentence (space or newline)
        const next = this.queue[0];
        if (next && (next[0] === " " || next[0] === "\n")) {
          return base + this.sentencePause + Math.random() * 120;
        }
      }
    }

    return Math.max(18, base);
  }
}
