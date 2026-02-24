/**
 * Stream Projection Tests — Live Coherence Engine
 */
import { describe, it, expect, vi } from "vitest";
import { StreamProjection, type StreamSnapshot } from "@/modules/observable/stream-projection";
import { SystemEventBus } from "@/modules/observable/system-event-bus";

describe("Stream Projection Engine", () => {
  it("1. Emits snapshot on ingest", () => {
    const sp = new StreamProjection();
    const snapshots: StreamSnapshot[] = [];
    sp.subscribe((s) => snapshots.push(s));
    sp.ingest(new Uint8Array([42, 7, 255]));
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].totalBytes).toBe(3);
    expect(snapshots[0].frame).toBe(1);
  });

  it("2. Levels are populated after ingest", () => {
    const sp = new StreamProjection();
    let snap: StreamSnapshot | null = null;
    sp.subscribe((s) => { snap = s; });
    sp.ingest(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]));
    expect(snap).not.toBeNull();
    // L0 bytes should be populated
    expect(snap!.levels[0].count).toBeGreaterThan(0);
    // L1 datums should be populated
    expect(snap!.levels[1].count).toBeGreaterThan(0);
  });

  it("3. Accumulates bytes across multiple ingests", () => {
    const sp = new StreamProjection();
    let snap: StreamSnapshot | null = null;
    sp.subscribe((s) => { snap = s; });
    sp.ingest(new Uint8Array([1, 2]));
    sp.ingest(new Uint8Array([3, 4]));
    sp.ingest(new Uint8Array([5, 6]));
    expect(snap!.totalBytes).toBe(6);
    expect(snap!.frame).toBe(3);
  });

  it("4. Recent bytes window caps at 64", () => {
    const sp = new StreamProjection();
    let snap: StreamSnapshot | null = null;
    sp.subscribe((s) => { snap = s; });
    // Ingest 100 bytes
    sp.ingest(new Uint8Array(100).fill(42));
    expect(snap!.recentBytes.length).toBeLessThanOrEqual(64);
  });

  it("5. Cross-scale coherence is reported", () => {
    const sp = new StreamProjection();
    let snap: StreamSnapshot | null = null;
    sp.subscribe((s) => { snap = s; });
    sp.ingest(new Uint8Array([0, 0, 0, 0]));
    expect(snap!.crossScale).toBeDefined();
    expect(typeof snap!.crossScale.consistent).toBe("boolean");
  });

  it("6. Full Q0 graph → COHERENCE at L0", () => {
    const sp = new StreamProjection(); // Default = full Q0
    let snap: StreamSnapshot | null = null;
    sp.subscribe((s) => { snap = s; });
    sp.ingest(new Uint8Array([0, 128, 255]));
    expect(snap!.levels[0].zone).toBe("COHERENCE");
    expect(snap!.levels[0].meanH).toBe(0);
  });

  it("7. Sparse graph → elevated H-scores", () => {
    const sp = new StreamProjection([0]); // Only 0 in graph
    let snap: StreamSnapshot | null = null;
    sp.subscribe((s) => { snap = s; });
    sp.ingest(new Uint8Array([255, 127, 63]));
    expect(snap!.levels[0].meanH).toBeGreaterThan(0);
  });

  it("8. Reset clears all state", () => {
    const sp = new StreamProjection();
    sp.ingest(new Uint8Array([1, 2, 3]));
    let snap: StreamSnapshot | null = null;
    sp.subscribe((s) => { snap = s; });
    sp.reset();
    expect(snap!.totalBytes).toBe(0);
    expect(snap!.frame).toBe(1);
    expect(snap!.recentBytes.length).toBe(0);
  });

  it("9. Unsubscribe stops notifications", () => {
    const sp = new StreamProjection();
    let count = 0;
    const unsub = sp.subscribe(() => { count++; });
    sp.ingest(new Uint8Array([1]));
    expect(count).toBe(1);
    unsub();
    sp.ingest(new Uint8Array([2]));
    expect(count).toBe(1); // No additional call
  });

  it("10. Network observation (L5) is populated", () => {
    const sp = new StreamProjection();
    let snap: StreamSnapshot | null = null;
    sp.subscribe((s) => { snap = s; });
    sp.ingest(new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80]));
    expect(snap!.network).not.toBeNull();
    expect(snap!.network!.level).toBe(5);
  });

  it("11. Demo mode sets isStreaming flag", () => {
    const sp = new StreamProjection();
    expect(sp.isStreaming).toBe(false);
    sp.startDemo("coherent", 50);
    expect(sp.isStreaming).toBe(true);
    sp.stop();
    expect(sp.isStreaming).toBe(false);
  });

  it("12. Bytes per second is computed", () => {
    const sp = new StreamProjection();
    let snap: StreamSnapshot | null = null;
    sp.subscribe((s) => { snap = s; });
    sp.ingest(new Uint8Array(100));
    expect(snap!.bytesPerSecond).toBeGreaterThan(0);
  });

  it("13. connectToSystem receives system events", () => {
    const sp = new StreamProjection();
    let snap: StreamSnapshot | null = null;
    sp.subscribe((s) => { snap = s; });
    sp.connectToSystem();
    expect(sp.isConnectedToSystem).toBe(true);
    expect(sp.isStreaming).toBe(true);

    // Emit a system event
    SystemEventBus.emit("ring", "neg", new Uint8Array([42]), new Uint8Array([214]));
    expect(snap).not.toBeNull();
    expect(snap!.totalBytes).toBe(2); // 1 input + 1 output
    expect(sp.systemEventsReceived).toBe(1);

    sp.disconnectFromSystem();
    expect(sp.isConnectedToSystem).toBe(false);

    // No more events after disconnect
    SystemEventBus.emit("ring", "neg", new Uint8Array([1]), new Uint8Array([255]));
    expect(sp.systemEventsReceived).toBe(1);
  });
});
