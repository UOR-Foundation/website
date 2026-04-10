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
  /** Optional callback for layout height prediction (Pretext integration) */
  private onHeightHint: ((text: string) => void) | null;

  /** Base interval between flushes (ms). Randomised ±15 ms each tick. */
  private baseInterval: number;
  /** Extra pause after sentence-ending punctuation (ms). */
  private sentencePause: number;
  /** Instant-flush mode: first N chars flush with zero delay */
  private rushChars: number;
  private totalFlushed = 0;
  /** Throttle height hints to avoid excessive calls */
  private lastHeightHint = 0;

  constructor(onFlush: (text: string) => void, opts?: { baseInterval?: number; sentencePause?: number; rushChars?: number; onHeightHint?: (text: string) => void }) {
    this.onFlush = onFlush;
    this.onHeightHint = opts?.onHeightHint ?? null;
    this.baseInterval = opts?.baseInterval ?? 22;
    this.sentencePause = opts?.sentencePause ?? 120;
    this.rushChars = opts?.rushChars ?? 250;
  }

  /** Push a raw token from the SSE stream. */
  push(token: string) {
    this.queue.push(token);
    if (!this.running) return;

    // Rush mode: flush immediately for the first batch of chars
    if (this.totalFlushed < this.rushChars) {
      this.flushNow();
      return;
    }

    if (!this.rafId) this.scheduleFlush();
  }

  /** Start the flush loop. */
  start() {
    this.running = true;
    this.accumulated = "";
    this.queue = [];
    this.totalFlushed = 0;
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

  /** Flush all queued tokens immediately (rush mode). */
  private flushNow() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.queue.length === 0) return;
    const batch = this.queue.join("");
    this.queue = [];
    this.accumulated += batch;
    this.totalFlushed += batch.length;
    this.lastFlush = performance.now();
    this.onFlush(this.accumulated);
    this.emitHeightHint();
    // If still in rush mode and running, stay ready
    if (this.running && this.totalFlushed >= this.rushChars && this.queue.length > 0) {
      this.scheduleFlush();
    }
  }

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
      this.totalFlushed += batch.length;
      this.lastFlush = now;
      this.onFlush(this.accumulated);
      this.emitHeightHint();

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

  /** Emit height hint callback, throttled to every 200ms */
  private emitHeightHint() {
    if (!this.onHeightHint) return;
    const now = performance.now();
    if (now - this.lastHeightHint < 200) return;
    this.lastHeightHint = now;
    this.onHeightHint(this.accumulated);
  }
}
