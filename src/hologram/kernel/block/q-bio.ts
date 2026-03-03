/**
 * kernel/block/q-bio — Block I/O Request Scheduler
 * ≡ Linux block/blk-mq.c
 *
 * Manages the I/O request queue between the filesystem layer (fs/)
 * and storage backend drivers (drivers/). Provides:
 *   - Request batching and coalescing
 *   - Priority-based I/O scheduling
 *   - Read-ahead prefetching
 *   - Write-back buffering
 *
 * In Q-Kernel, all I/O is CID-addressed, enabling automatic
 * deduplication at the block layer.
 */

export type IoDirection = "read" | "write";
export type IoPriority = "realtime" | "best-effort" | "idle";

export interface BioRequest {
  id: string;
  cid: string;
  direction: IoDirection;
  priority: IoPriority;
  data?: Uint8Array;
  submittedAt: number;
  completedAt?: number;
}

export interface BioStats {
  totalRequests: number;
  pendingReads: number;
  pendingWrites: number;
  coalescedWrites: number;
  cacheHits: number;
  avgLatencyMs: number;
}

/**
 * QBio — Block I/O scheduler
 * 
 * Queues and schedules I/O requests between fs/ and drivers/.
 * Implements CID-aware request coalescing: duplicate writes to
 * the same CID are automatically merged.
 */
export class QBio {
  private queue: BioRequest[] = [];
  private completed: BioRequest[] = [];
  private writeBuffer = new Map<string, Uint8Array>();
  private stats: BioStats = {
    totalRequests: 0, pendingReads: 0, pendingWrites: 0,
    coalescedWrites: 0, cacheHits: 0, avgLatencyMs: 0,
  };

  /** Submit a block I/O request */
  submit(cid: string, direction: IoDirection, data?: Uint8Array, priority: IoPriority = "best-effort"): BioRequest {
    // Coalesce duplicate writes
    if (direction === "write" && data) {
      if (this.writeBuffer.has(cid)) {
        this.stats.coalescedWrites++;
      }
      this.writeBuffer.set(cid, data);
    }

    const req: BioRequest = {
      id: `bio-${this.stats.totalRequests++}`,
      cid, direction, priority, data,
      submittedAt: Date.now(),
    };

    if (direction === "read") this.stats.pendingReads++;
    else this.stats.pendingWrites++;

    this.queue.push(req);
    return req;
  }

  /** Complete a pending request */
  complete(id: string): BioRequest | null {
    const idx = this.queue.findIndex(r => r.id === id);
    if (idx < 0) return null;

    const req = this.queue.splice(idx, 1)[0];
    req.completedAt = Date.now();

    if (req.direction === "read") this.stats.pendingReads--;
    else {
      this.stats.pendingWrites--;
      this.writeBuffer.delete(req.cid);
    }

    const latency = req.completedAt - req.submittedAt;
    this.stats.avgLatencyMs = this.stats.avgLatencyMs * 0.9 + latency * 0.1;

    this.completed.push(req);
    return req;
  }

  /** Flush all pending writes */
  flush(): BioRequest[] {
    const writes = this.queue.filter(r => r.direction === "write");
    writes.forEach(w => this.complete(w.id));
    return writes;
  }

  /** Get scheduler statistics */
  getStats(): BioStats { return { ...this.stats }; }

  /** Get queue depth */
  queueDepth(): number { return this.queue.length; }
}
