/**
 * Q-Driver — Block Device Abstraction Layer
 * ═══════════════════════════════════════════
 *
 * Maps storage backends to mountable block devices with content-addressed I/O.
 *
 *   ┌──────────────────┬────────────────────────────────────────────────────┐
 *   │ Linux            │ Q-Driver                                          │
 *   ├──────────────────┼────────────────────────────────────────────────────┤
 *   │ /dev/sda         │ BlockDevice { backend: "indexeddb" }              │
 *   │ /dev/nfs0        │ BlockDevice { backend: "supabase" }               │
 *   │ /dev/fuse0       │ BlockDevice { backend: "ipfs" }                   │
 *   │ /dev/ram0        │ BlockDevice { backend: "memory" }                 │
 *   │ blkid            │ CID-based sector addressing                       │
 *   │ mount -t ext4    │ driver.mount("/mnt/cloud", supabaseDevice)        │
 *   │ /proc/diskstats  │ driver.stats()                                    │
 *   │ udev             │ DeviceRegistry — hot-plug event bus               │
 *   └──────────────────┴────────────────────────────────────────────────────┘
 *
 * Every read/write goes through the MMU for content-addressing. The driver
 * layer adds persistence semantics: "where do the bytes physically live?"
 *
 * @module qkernel/q-driver
 */

import { sha256, computeCid, bytesToHex } from "@/modules/uns/core/address";
import type { QMmu } from "./q-mmu";
import type { QFs } from "./q-fs";

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

/** Supported storage backends */
export type BackendType = "memory" | "indexeddb" | "supabase" | "ipfs";

/** Block device state */
export type DeviceState = "uninitialized" | "online" | "readonly" | "error" | "ejected";

/** A sector — the fundamental I/O unit (content-addressed) */
export interface Sector {
  readonly cid: string;
  readonly data: Uint8Array;
  readonly byteLength: number;
  readonly writtenAt: number;
}

/** Block device descriptor — like /dev/sdX */
export interface BlockDeviceDescriptor {
  readonly id: string;
  readonly name: string;
  readonly backend: BackendType;
  readonly state: DeviceState;
  readonly capacity: number;        // max bytes (0 = unlimited)
  readonly usedBytes: number;
  readonly sectorCount: number;
  readonly mountPath: string | null; // null = unmounted
  readonly createdAt: number;
  readonly readOnly: boolean;
}

/** Device I/O result */
export interface IoResult {
  readonly ok: boolean;
  readonly cid: string | null;
  readonly bytesTransferred: number;
  readonly latencyMs: number;
  readonly error?: string;
}

/** Driver statistics */
export interface DriverStats {
  readonly totalDevices: number;
  readonly onlineDevices: number;
  readonly mountedDevices: number;
  readonly totalReads: number;
  readonly totalWrites: number;
  readonly totalBytesRead: number;
  readonly totalBytesWritten: number;
  readonly cacheHitRate: number;
  readonly backends: Record<BackendType, number>;
}

/** Device event for hot-plug bus */
export interface DeviceEvent {
  readonly type: "attach" | "detach" | "error" | "mount" | "unmount";
  readonly deviceId: string;
  readonly timestamp: number;
  readonly detail?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// Backend Interface
// ═══════════════════════════════════════════════════════════════════════

/**
 * StorageBackend — the contract every physical backend must satisfy.
 * Like a Linux block device driver's fops struct.
 */
export interface StorageBackend {
  readonly type: BackendType;
  read(cid: string): Promise<Uint8Array | null>;
  write(cid: string, data: Uint8Array): Promise<boolean>;
  delete(cid: string): Promise<boolean>;
  exists(cid: string): Promise<boolean>;
  list(): Promise<string[]>;
  size(): Promise<number>;
}

// ═══════════════════════════════════════════════════════════════════════
// Backend Implementations
// ═══════════════════════════════════════════════════════════════════════

/** In-memory backend — /dev/ram0 equivalent */
export class MemoryBackend implements StorageBackend {
  readonly type: BackendType = "memory";
  private store = new Map<string, Uint8Array>();

  async read(cid: string): Promise<Uint8Array | null> {
    const data = this.store.get(cid);
    return data ? new Uint8Array(data) : null;
  }
  async write(cid: string, data: Uint8Array): Promise<boolean> {
    this.store.set(cid, new Uint8Array(data));
    return true;
  }
  async delete(cid: string): Promise<boolean> {
    return this.store.delete(cid);
  }
  async exists(cid: string): Promise<boolean> {
    return this.store.has(cid);
  }
  async list(): Promise<string[]> {
    return [...this.store.keys()];
  }
  async size(): Promise<number> {
    let total = 0;
    for (const v of this.store.values()) total += v.byteLength;
    return total;
  }
}

/** IndexedDB backend — persistent local block device */
export class IndexedDBBackend implements StorageBackend {
  readonly type: BackendType = "indexeddb";
  private dbName: string;
  private storeName = "sectors";
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor(dbName = "q-driver-blocks") {
    this.dbName = dbName;
  }

  private getDb(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(this.dbName, 1);
        req.onupgradeneeded = () => {
          req.result.createObjectStore(this.storeName);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return this.dbPromise;
  }

  private async tx(mode: IDBTransactionMode): Promise<IDBObjectStore> {
    const db = await this.getDb();
    return db.transaction(this.storeName, mode).objectStore(this.storeName);
  }

  private idbRequest<T>(req: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async read(cid: string): Promise<Uint8Array | null> {
    const store = await this.tx("readonly");
    const data = await this.idbRequest(store.get(cid));
    return data instanceof Uint8Array ? data : null;
  }
  async write(cid: string, data: Uint8Array): Promise<boolean> {
    const store = await this.tx("readwrite");
    await this.idbRequest(store.put(new Uint8Array(data), cid));
    return true;
  }
  async delete(cid: string): Promise<boolean> {
    const store = await this.tx("readwrite");
    await this.idbRequest(store.delete(cid));
    return true;
  }
  async exists(cid: string): Promise<boolean> {
    const store = await this.tx("readonly");
    const count = await this.idbRequest(store.count(cid));
    return count > 0;
  }
  async list(): Promise<string[]> {
    const store = await this.tx("readonly");
    const keys = await this.idbRequest(store.getAllKeys());
    return keys.map(k => String(k));
  }
  async size(): Promise<number> {
    // Approximate — count keys
    const store = await this.tx("readonly");
    return this.idbRequest(store.count());
  }
}

/** Supabase backend — cloud-persistent block device */
export class SupabaseBackend implements StorageBackend {
  readonly type: BackendType = "supabase";
  private bucketName: string;
  private supabase: any; // Supabase client injected

  constructor(supabase: any, bucketName = "q-driver-blocks") {
    this.supabase = supabase;
    this.bucketName = bucketName;
  }

  async read(cid: string): Promise<Uint8Array | null> {
    const { data, error } = await this.supabase.storage
      .from(this.bucketName)
      .download(`blocks/${cid}`);
    if (error || !data) return null;
    return new Uint8Array(await data.arrayBuffer());
  }
  async write(cid: string, data: Uint8Array): Promise<boolean> {
    const blob = new Blob([new Uint8Array(data)], { type: "application/octet-stream" });
    const { error } = await this.supabase.storage
      .from(this.bucketName)
      .upload(`blocks/${cid}`, blob, { upsert: true });
    return !error;
  }
  async delete(cid: string): Promise<boolean> {
    const { error } = await this.supabase.storage
      .from(this.bucketName)
      .remove([`blocks/${cid}`]);
    return !error;
  }
  async exists(cid: string): Promise<boolean> {
    const data = await this.read(cid);
    return data !== null;
  }
  async list(): Promise<string[]> {
    const { data } = await this.supabase.storage
      .from(this.bucketName)
      .list("blocks", { limit: 1000 });
    return (data ?? []).map((f: any) => f.name);
  }
  async size(): Promise<number> {
    const keys = await this.list();
    return keys.length;
  }
}

/** IPFS backend — content-addressed distributed block device */
export class IpfsBackend implements StorageBackend {
  readonly type: BackendType = "ipfs";
  private gatewayUrl: string;
  private cache = new Map<string, Uint8Array>();

  constructor(gatewayUrl = "https://w3s.link/ipfs") {
    this.gatewayUrl = gatewayUrl;
  }

  async read(cid: string): Promise<Uint8Array | null> {
    const cached = this.cache.get(cid);
    if (cached) return new Uint8Array(cached);
    try {
      const res = await fetch(`${this.gatewayUrl}/${cid}`);
      if (!res.ok) return null;
      const buf = new Uint8Array(await res.arrayBuffer());
      this.cache.set(cid, buf);
      return buf;
    } catch {
      return null;
    }
  }
  async write(cid: string, data: Uint8Array): Promise<boolean> {
    // IPFS writes are content-addressed — the CID IS the address
    // In production, this would pin to a remote node
    this.cache.set(cid, new Uint8Array(data));
    return true;
  }
  async delete(cid: string): Promise<boolean> {
    return this.cache.delete(cid);
  }
  async exists(cid: string): Promise<boolean> {
    if (this.cache.has(cid)) return true;
    const data = await this.read(cid);
    return data !== null;
  }
  async list(): Promise<string[]> {
    return [...this.cache.keys()];
  }
  async size(): Promise<number> {
    let total = 0;
    for (const v of this.cache.values()) total += v.byteLength;
    return total;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Block Device
// ═══════════════════════════════════════════════════════════════════════

/** A block device — wraps a StorageBackend with I/O tracking and MMU integration */
export class BlockDevice {
  readonly id: string;
  readonly name: string;
  readonly backend: StorageBackend;
  readonly capacity: number;
  readonly readOnly: boolean;

  private _state: DeviceState = "uninitialized";
  private _mountPath: string | null = null;
  private _usedBytes = 0;
  private _sectorCount = 0;
  private _reads = 0;
  private _writes = 0;
  private _bytesRead = 0;
  private _bytesWritten = 0;
  private _createdAt = Date.now();

  constructor(
    name: string,
    backend: StorageBackend,
    opts: { capacity?: number; readOnly?: boolean } = {}
  ) {
    this.id = `dev-${backend.type}-${name}-${Date.now().toString(36)}`;
    this.name = name;
    this.backend = backend;
    this.capacity = opts.capacity ?? 0;
    this.readOnly = opts.readOnly ?? false;
  }

  get state(): DeviceState { return this._state; }
  get mountPath(): string | null { return this._mountPath; }
  get usedBytes(): number { return this._usedBytes; }
  get sectorCount(): number { return this._sectorCount; }
  get reads(): number { return this._reads; }
  get writes(): number { return this._writes; }

  /** Initialize the device — like opening a block device file */
  async init(): Promise<boolean> {
    try {
      const existingSize = await this.backend.size();
      this._usedBytes = typeof existingSize === "number" ? existingSize : 0;
      this._state = this.readOnly ? "readonly" : "online";
      return true;
    } catch (e) {
      this._state = "error";
      return false;
    }
  }

  /** Read a sector by CID */
  async readSector(cid: string): Promise<Uint8Array | null> {
    if (this._state === "ejected" || this._state === "uninitialized") return null;
    const t0 = performance.now();
    const data = await this.backend.read(cid);
    this._reads++;
    if (data) this._bytesRead += data.byteLength;
    return data;
  }

  /** Write a sector — returns the CID of the written data */
  async writeSector(data: Uint8Array, mmu: QMmu, ownerPid: number): Promise<IoResult> {
    if (this._state !== "online") {
      return { ok: false, cid: null, bytesTransferred: 0, latencyMs: 0, error: `Device ${this._state}` };
    }
    if (this.readOnly) {
      return { ok: false, cid: null, bytesTransferred: 0, latencyMs: 0, error: "Read-only device" };
    }
    if (this.capacity > 0 && this._usedBytes + data.byteLength > this.capacity) {
      return { ok: false, cid: null, bytesTransferred: 0, latencyMs: 0, error: "Device full" };
    }

    const t0 = performance.now();

    // Content-address through MMU
    const cid = await mmu.store(data, ownerPid);

    // Persist to backend
    const ok = await this.backend.write(cid, data);
    const latencyMs = performance.now() - t0;

    if (ok) {
      this._writes++;
      this._bytesWritten += data.byteLength;
      this._usedBytes += data.byteLength;
      this._sectorCount++;
    }

    return { ok, cid, bytesTransferred: data.byteLength, latencyMs };
  }

  /** Delete a sector */
  async deleteSector(cid: string): Promise<boolean> {
    if (this.readOnly || this._state !== "online") return false;
    return this.backend.delete(cid);
  }

  /** Check if a sector exists */
  async hasSector(cid: string): Promise<boolean> {
    return this.backend.exists(cid);
  }

  /** Set mount path */
  mount(path: string): void {
    this._mountPath = path;
  }

  /** Clear mount path */
  unmount(): void {
    this._mountPath = null;
  }

  /** Eject the device */
  eject(): void {
    this._mountPath = null;
    this._state = "ejected";
  }

  /** Get device descriptor */
  descriptor(): BlockDeviceDescriptor {
    return {
      id: this.id,
      name: this.name,
      backend: this.backend.type,
      state: this._state,
      capacity: this.capacity,
      usedBytes: this._usedBytes,
      sectorCount: this._sectorCount,
      mountPath: this._mountPath,
      createdAt: this._createdAt,
      readOnly: this.readOnly,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Q-Driver — Device Manager (like Linux's device subsystem)
// ═══════════════════════════════════════════════════════════════════════

export class QDriver {
  private devices = new Map<string, BlockDevice>();
  private eventLog: DeviceEvent[] = [];
  private listeners: ((e: DeviceEvent) => void)[] = [];
  private mmu: QMmu;
  private fs: QFs;

  private totalReads = 0;
  private totalWrites = 0;
  private totalBytesRead = 0;
  private totalBytesWritten = 0;
  private cacheHits = 0;
  private cacheMisses = 0;

  constructor(mmu: QMmu, fs: QFs) {
    this.mmu = mmu;
    this.fs = fs;
  }

  // ── Device Lifecycle ─────────────────────────────────────────────

  /**
   * Register a block device — like plugging in a drive.
   * Automatically initializes the device.
   */
  async attach(device: BlockDevice): Promise<boolean> {
    if (this.devices.has(device.id)) return false;
    
    const ok = await device.init();
    if (!ok) {
      this.emit({ type: "error", deviceId: device.id, timestamp: Date.now(), detail: "Init failed" });
      return false;
    }

    this.devices.set(device.id, device);
    this.emit({ type: "attach", deviceId: device.id, timestamp: Date.now() });
    return true;
  }

  /**
   * Detach a device — ejects and removes from registry.
   */
  detach(deviceId: string): boolean {
    const device = this.devices.get(deviceId);
    if (!device) return false;

    if (device.mountPath) {
      this.unmount(deviceId);
    }
    device.eject();
    this.devices.delete(deviceId);
    this.emit({ type: "detach", deviceId, timestamp: Date.now() });
    return true;
  }

  /**
   * Mount a device at a filesystem path.
   */
  async mount(deviceId: string, path: string, ownerPid: number): Promise<boolean> {
    const device = this.devices.get(deviceId);
    if (!device || device.state === "ejected") return false;
    if (device.mountPath) return false; // already mounted

    device.mount(path);
    await this.fs.mount(path, device.id, ownerPid);
    this.emit({ type: "mount", deviceId, timestamp: Date.now(), detail: path });
    return true;
  }

  /**
   * Unmount a device from the filesystem.
   */
  unmount(deviceId: string): boolean {
    const device = this.devices.get(deviceId);
    if (!device || !device.mountPath) return false;

    const path = device.mountPath;
    device.unmount();
    this.emit({ type: "unmount", deviceId, timestamp: Date.now(), detail: path });
    return true;
  }

  // ── I/O Operations ──────────────────────────────────────────────

  /**
   * Read from a device — CID-addressed sector retrieval.
   * Checks MMU cache first, then falls back to device backend.
   */
  async read(deviceId: string, cid: string): Promise<Uint8Array | null> {
    const device = this.devices.get(deviceId);
    if (!device) return null;

    // L1: Check MMU cache
    const cached = this.mmu.load(cid);
    if (cached) {
      this.cacheHits++;
      this.totalReads++;
      this.totalBytesRead += cached.byteLength;
      return cached;
    }

    // L2: Read from device backend
    this.cacheMisses++;
    const data = await device.readSector(cid);
    if (data) {
      this.totalReads++;
      this.totalBytesRead += data.byteLength;
      // Warm MMU cache
      await this.mmu.store(data, 0);
    }
    return data;
  }

  /**
   * Write to a device — content-addressed through MMU.
   * Returns IoResult with the CID and transfer stats.
   */
  async write(deviceId: string, data: Uint8Array, ownerPid: number): Promise<IoResult> {
    const device = this.devices.get(deviceId);
    if (!device) {
      return { ok: false, cid: null, bytesTransferred: 0, latencyMs: 0, error: "Device not found" };
    }

    const result = await device.writeSector(data, this.mmu, ownerPid);
    if (result.ok) {
      this.totalWrites++;
      this.totalBytesWritten += result.bytesTransferred;
    }
    return result;
  }

  /**
   * Sync — flush a device's pending writes.
   * In content-addressed storage, this is a no-op (writes are atomic).
   * Included for API completeness.
   */
  async sync(deviceId: string): Promise<boolean> {
    return this.devices.has(deviceId);
  }

  // ── Queries ─────────────────────────────────────────────────────

  /** Get a device by ID */
  getDevice(deviceId: string): BlockDevice | undefined {
    return this.devices.get(deviceId);
  }

  /** Get a device by mount path */
  getDeviceByPath(path: string): BlockDevice | undefined {
    for (const d of this.devices.values()) {
      if (d.mountPath === path) return d;
    }
    return undefined;
  }

  /** List all devices */
  allDevices(): BlockDeviceDescriptor[] {
    return Array.from(this.devices.values()).map(d => d.descriptor());
  }

  /** Get event log */
  getEventLog(): readonly DeviceEvent[] {
    return this.eventLog;
  }

  /** Subscribe to device events */
  onEvent(listener: (e: DeviceEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /** Driver statistics */
  stats(): DriverStats {
    const backends: Record<BackendType, number> = { memory: 0, indexeddb: 0, supabase: 0, ipfs: 0 };
    let online = 0;
    let mounted = 0;
    for (const d of this.devices.values()) {
      backends[d.backend.type]++;
      if (d.state === "online" || d.state === "readonly") online++;
      if (d.mountPath) mounted++;
    }

    const totalAccesses = this.cacheHits + this.cacheMisses;

    return {
      totalDevices: this.devices.size,
      onlineDevices: online,
      mountedDevices: mounted,
      totalReads: this.totalReads,
      totalWrites: this.totalWrites,
      totalBytesRead: this.totalBytesRead,
      totalBytesWritten: this.totalBytesWritten,
      cacheHitRate: totalAccesses > 0 ? this.cacheHits / totalAccesses : 1,
      backends,
    };
  }

  // ── Internal ────────────────────────────────────────────────────

  private emit(event: DeviceEvent): void {
    this.eventLog.push(event);
    for (const l of this.listeners) {
      try { l(event); } catch { /* swallow listener errors */ }
    }
  }
}
