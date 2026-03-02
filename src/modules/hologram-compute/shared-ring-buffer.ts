/**
 * SharedRingBuffer — Zero-Copy Cross-Thread Tensor Transfer
 * ══════════════════════════════════════════════════════════
 *
 * A lock-free SPSC (single-producer, single-consumer) ring buffer
 * built on SharedArrayBuffer for transferring page-sized tensor
 * chunks between the main thread and compute workers WITHOUT copies.
 *
 * This is the browser equivalent of RDMA: data written by one thread
 * is immediately visible to the other via shared memory, with atomic
 * coordination to prevent torn reads.
 *
 * Design constraints:
 *   - Requires cross-origin isolation (COOP/COEP headers)
 *   - Lock-free: uses Atomics.load/store on head/tail indices
 *   - Fixed slot count (power of 2) for fast modular arithmetic
 *   - Each slot = PAGE_SIZE (64KB) — matches HoloMem page size
 *
 * Usage:
 *   // Main thread (consumer)
 *   const ring = new SharedRingBuffer(32);         // 32 slots = 2MB
 *   worker.postMessage({ sab: ring.buffer });
 *
 *   // Worker (producer)
 *   const ring = SharedRingBuffer.fromBuffer(sab);
 *   ring.push(tensorChunk);                        // zero-copy write
 *
 *   // Main thread
 *   const chunk = ring.pop();                      // zero-copy read
 *
 * @module hologram-compute/shared-ring-buffer
 */

import { PAGE_SIZE } from "./holomem";

// ── Constants ─────────────────────────────────────────────────────────

/** Header layout in the SharedArrayBuffer (Int32 indices) */
const HEAD_OFFSET = 0;   // producer writes here
const TAIL_OFFSET = 1;   // consumer writes here
const HEADER_INTS = 2;
const HEADER_BYTES = HEADER_INTS * 4; // 8 bytes

// ── SharedRingBuffer ──────────────────────────────────────────────────

export class SharedRingBuffer {
  /** The underlying SharedArrayBuffer */
  readonly buffer: SharedArrayBuffer;
  /** Number of slots (power of 2) */
  readonly slots: number;
  /** Bit mask for fast modular arithmetic */
  private readonly mask: number;
  /** Int32 view for atomic head/tail coordination */
  private readonly header: Int32Array;
  /** Uint8 view for data payload */
  private readonly data: Uint8Array;

  /**
   * Create a new ring buffer.
   * @param slots Number of PAGE_SIZE slots (must be power of 2, default 32 = 2MB)
   */
  constructor(slots: number = 32) {
    // Enforce power of 2
    if (slots < 2 || (slots & (slots - 1)) !== 0) {
      slots = Math.max(2, 1 << Math.ceil(Math.log2(slots)));
    }
    this.slots = slots;
    this.mask = slots - 1;

    const totalBytes = HEADER_BYTES + slots * PAGE_SIZE;

    if (typeof SharedArrayBuffer !== "undefined") {
      this.buffer = new SharedArrayBuffer(totalBytes);
    } else {
      // Fallback for non-isolated contexts: use regular ArrayBuffer
      // (no cross-thread sharing, but API still works for single-thread)
      console.warn("[SharedRingBuffer] SharedArrayBuffer unavailable — using ArrayBuffer fallback (no cross-thread sharing)");
      this.buffer = new ArrayBuffer(totalBytes) as unknown as SharedArrayBuffer;
    }

    this.header = new Int32Array(this.buffer, 0, HEADER_INTS);
    this.data = new Uint8Array(this.buffer, HEADER_BYTES);
  }

  /** Reconstruct from a transferred SharedArrayBuffer */
  static fromBuffer(sab: SharedArrayBuffer, slots?: number): SharedRingBuffer {
    const ring = Object.create(SharedRingBuffer.prototype) as SharedRingBuffer;
    (ring as any).buffer = sab;
    const inferredSlots = slots ?? ((sab.byteLength - HEADER_BYTES) / PAGE_SIZE);
    (ring as any).slots = inferredSlots;
    (ring as any).mask = inferredSlots - 1;
    (ring as any).header = new Int32Array(sab, 0, HEADER_INTS);
    (ring as any).data = new Uint8Array(sab, HEADER_BYTES);
    return ring;
  }

  // ── Producer API ──────────────────────────────────────────────────

  /**
   * Push a page-sized chunk into the ring.
   * Returns false if the ring is full (non-blocking).
   */
  push(chunk: Uint8Array): boolean {
    const head = Atomics.load(this.header, HEAD_OFFSET);
    const tail = Atomics.load(this.header, TAIL_OFFSET);
    const nextHead = (head + 1) & this.mask;

    // Full check
    if (nextHead === tail) return false;

    // Write data into slot
    const offset = head * PAGE_SIZE;
    const len = Math.min(chunk.byteLength, PAGE_SIZE);
    this.data.set(chunk.subarray(0, len), offset);
    // Zero-fill remainder if chunk < PAGE_SIZE
    if (len < PAGE_SIZE) {
      this.data.fill(0, offset + len, offset + PAGE_SIZE);
    }

    // Publish: advance head (store-release semantics)
    Atomics.store(this.header, HEAD_OFFSET, nextHead);
    return true;
  }

  // ── Consumer API ──────────────────────────────────────────────────

  /**
   * Pop a page from the ring.
   * Returns null if the ring is empty (non-blocking).
   * Returns a VIEW into shared memory — copy if you need to retain.
   */
  pop(): Uint8Array | null {
    const head = Atomics.load(this.header, HEAD_OFFSET);
    const tail = Atomics.load(this.header, TAIL_OFFSET);

    // Empty check
    if (head === tail) return null;

    // Read data from slot (zero-copy view)
    const offset = tail * PAGE_SIZE;
    const view = this.data.subarray(offset, offset + PAGE_SIZE);

    // Advance tail (store-release semantics)
    const nextTail = (tail + 1) & this.mask;
    Atomics.store(this.header, TAIL_OFFSET, nextTail);

    return view;
  }

  /**
   * Pop and copy into a provided buffer (avoids aliasing issues).
   */
  popInto(target: Uint8Array): boolean {
    const page = this.pop();
    if (!page) return false;
    target.set(page);
    return true;
  }

  // ── Introspection ──────────────────────────────────────────────────

  /** Number of pages currently in the ring */
  get length(): number {
    const head = Atomics.load(this.header, HEAD_OFFSET);
    const tail = Atomics.load(this.header, TAIL_OFFSET);
    return (head - tail + this.slots) & this.mask;
  }

  /** Whether the ring is empty */
  get empty(): boolean { return this.length === 0; }

  /** Whether the ring is full */
  get full(): boolean { return this.length === this.slots - 1; }

  /** Total capacity in bytes */
  get capacityBytes(): number { return this.slots * PAGE_SIZE; }
}
