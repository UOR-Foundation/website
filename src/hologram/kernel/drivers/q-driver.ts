/**
 * Q-Driver — Block Device Abstraction Layer
 * ═══════════════════════════════════════
 *
 * Maps storage backends to mountable block devices with content-addressed I/O.
 * Now derived from genesis/ axioms — zero external crypto deps.
 *
 * @module qkernel/q-driver
 */

import { toHex, encodeUtf8 } from "../../genesis/axiom-ring";
import { sha256 } from "../../genesis/axiom-hash";
import { createCid } from "../../genesis/axiom-cid";
import type { QMmu } from "../mm/q-mmu";
import type { QFs } from "../fs/q-fs";

// ═══════════════════════════════════════════════════════════════════════
// Types (unchanged)
// ═══════════════════════════════════════════════════════════════════════

export type BackendType = "memory" | "indexeddb" | "supabase" | "ipfs";
export type DeviceState = "uninitialized" | "online" | "readonly" | "error" | "ejected";

export interface Sector {
  readonly cid: string;
  readonly data: Uint8Array;
  readonly byteLength: number;
  readonly writtenAt: number;
}

export interface BlockDeviceDescriptor {
  readonly id: string;
  readonly name: string;
  readonly backend: BackendType;
  readonly state: DeviceState;
  readonly capacity: number;
  readonly usedBytes: number;
  readonly sectorCount: number;
  readonly mountPath: string | null;
  readonly createdAt: number;
  readonly readOnly: boolean;
}

export interface IoResult {
  readonly ok: boolean;
  readonly cid: string | null;
  readonly bytesTransferred: number;
  readonly latencyMs: number;
  readonly error?: string;
}

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

export interface DeviceEvent {
  readonly type: "attach" | "detach" | "error" | "mount" | "unmount";
  readonly deviceId: string;
  readonly timestamp: number;
  readonly detail?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// Backend Interface
// ═══════════════════════════════════════════════════════════════════════

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
// Backend Implementations (unchanged — these are I/O and stay async)
// ═══════════════════════════════════════════════════════════════════════

export class MemoryBackend implements StorageBackend {
  readonly type: BackendType = "memory";
  private store = new Map<string, Uint8Array>();

  async read(cid: string): Promise<Uint8Array | null> { return this.store.get(cid) ? new Uint8Array(this.store.get(cid)!) : null; }
  async write(cid: string, data: Uint8Array): Promise<boolean> { this.store.set(cid, new Uint8Array(data)); return true; }
  async delete(cid: string): Promise<boolean> { return this.store.delete(cid); }
  async exists(cid: string): Promise<boolean> { return this.store.has(cid); }
  async list(): Promise<string[]> { return [...this.store.keys()]; }
  async size(): Promise<number> { let t = 0; for (const v of this.store.values()) t += v.byteLength; return t; }
}

export class IndexedDBBackend implements StorageBackend {
  readonly type: BackendType = "indexeddb";
  private dbName: string;
  private storeName = "sectors";
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor(dbName = "q-driver-blocks") { this.dbName = dbName; }

  private getDb(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(this.dbName, 1);
        req.onupgradeneeded = () => { req.result.createObjectStore(this.storeName); };
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
    return new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
  }

  async read(cid: string): Promise<Uint8Array | null> { const s = await this.tx("readonly"); const d = await this.idbRequest(s.get(cid)); return d instanceof Uint8Array ? d : null; }
  async write(cid: string, data: Uint8Array): Promise<boolean> { const s = await this.tx("readwrite"); await this.idbRequest(s.put(new Uint8Array(data), cid)); return true; }
  async delete(cid: string): Promise<boolean> { const s = await this.tx("readwrite"); await this.idbRequest(s.delete(cid)); return true; }
  async exists(cid: string): Promise<boolean> { const s = await this.tx("readonly"); return (await this.idbRequest(s.count(cid))) > 0; }
  async list(): Promise<string[]> { const s = await this.tx("readonly"); return (await this.idbRequest(s.getAllKeys())).map(k => String(k)); }
  async size(): Promise<number> { const s = await this.tx("readonly"); return this.idbRequest(s.count()); }
}

export class SupabaseBackend implements StorageBackend {
  readonly type: BackendType = "supabase";
  private bucketName: string;
  private supabase: any;

  constructor(supabase: any, bucketName = "q-driver-blocks") { this.supabase = supabase; this.bucketName = bucketName; }

  async read(cid: string): Promise<Uint8Array | null> {
    const { data, error } = await this.supabase.storage.from(this.bucketName).download(`blocks/${cid}`);
    if (error || !data) return null;
    return new Uint8Array(await data.arrayBuffer());
  }
  async write(cid: string, data: Uint8Array): Promise<boolean> {
    const blob = new Blob([new Uint8Array(data)], { type: "application/octet-stream" });
    const { error } = await this.supabase.storage.from(this.bucketName).upload(`blocks/${cid}`, blob, { upsert: true });
    return !error;
  }
  async delete(cid: string): Promise<boolean> { const { error } = await this.supabase.storage.from(this.bucketName).remove([`blocks/${cid}`]); return !error; }
  async exists(cid: string): Promise<boolean> { return (await this.read(cid)) !== null; }
  async list(): Promise<string[]> { const { data } = await this.supabase.storage.from(this.bucketName).list("blocks", { limit: 1000 }); return (data ?? []).map((f: any) => f.name); }
  async size(): Promise<number> { return (await this.list()).length; }
}

export class IpfsBackend implements StorageBackend {
  readonly type: BackendType = "ipfs";
  private gatewayUrl: string;
  private cache = new Map<string, Uint8Array>();

  constructor(gatewayUrl = "https://w3s.link/ipfs") { this.gatewayUrl = gatewayUrl; }

  async read(cid: string): Promise<Uint8Array | null> {
    const cached = this.cache.get(cid);
    if (cached) return new Uint8Array(cached);
    try { const res = await fetch(`${this.gatewayUrl}/${cid}`); if (!res.ok) return null; const buf = new Uint8Array(await res.arrayBuffer()); this.cache.set(cid, buf); return buf; } catch { return null; }
  }
  async write(cid: string, data: Uint8Array): Promise<boolean> { this.cache.set(cid, new Uint8Array(data)); return true; }
  async delete(cid: string): Promise<boolean> { return this.cache.delete(cid); }
  async exists(cid: string): Promise<boolean> { if (this.cache.has(cid)) return true; return (await this.read(cid)) !== null; }
  async list(): Promise<string[]> { return [...this.cache.keys()]; }
  async size(): Promise<number> { let t = 0; for (const v of this.cache.values()) t += v.byteLength; return t; }
}

// ═══════════════════════════════════════════════════════════════════════
// Block Device
// ═══════════════════════════════════════════════════════════════════════

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

  constructor(name: string, backend: StorageBackend, opts: { capacity?: number; readOnly?: boolean } = {}) {
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

  async init(): Promise<boolean> {
    try { const s = await this.backend.size(); this._usedBytes = typeof s === "number" ? s : 0; this._state = this.readOnly ? "readonly" : "online"; return true; }
    catch { this._state = "error"; return false; }
  }

  async readSector(cid: string): Promise<Uint8Array | null> {
    if (this._state === "ejected" || this._state === "uninitialized") return null;
    const data = await this.backend.read(cid);
    this._reads++;
    if (data) this._bytesRead += data.byteLength;
    return data;
  }

  async writeSector(data: Uint8Array, mmu: QMmu, ownerPid: number): Promise<IoResult> {
    if (this._state !== "online") return { ok: false, cid: null, bytesTransferred: 0, latencyMs: 0, error: `Device ${this._state}` };
    if (this.readOnly) return { ok: false, cid: null, bytesTransferred: 0, latencyMs: 0, error: "Read-only device" };
    if (this.capacity > 0 && this._usedBytes + data.byteLength > this.capacity)
      return { ok: false, cid: null, bytesTransferred: 0, latencyMs: 0, error: "Device full" };

    const t0 = performance.now();
    const cid = mmu.store(data, ownerPid);
    const ok = await this.backend.write(cid, data);
    const latencyMs = performance.now() - t0;

    if (ok) { this._writes++; this._bytesWritten += data.byteLength; this._usedBytes += data.byteLength; this._sectorCount++; }
    return { ok, cid, bytesTransferred: data.byteLength, latencyMs };
  }

  async deleteSector(cid: string): Promise<boolean> {
    if (this.readOnly || this._state !== "online") return false;
    return this.backend.delete(cid);
  }

  async hasSector(cid: string): Promise<boolean> { return this.backend.exists(cid); }
  mount(path: string): void { this._mountPath = path; }
  unmount(): void { this._mountPath = null; }
  eject(): void { this._mountPath = null; this._state = "ejected"; }

  descriptor(): BlockDeviceDescriptor {
    return {
      id: this.id, name: this.name, backend: this.backend.type,
      state: this._state, capacity: this.capacity, usedBytes: this._usedBytes,
      sectorCount: this._sectorCount, mountPath: this._mountPath,
      createdAt: this._createdAt, readOnly: this.readOnly,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// Q-Driver — Device Manager
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

  constructor(mmu: QMmu, fs: QFs) { this.mmu = mmu; this.fs = fs; }

  async attach(device: BlockDevice): Promise<boolean> {
    if (this.devices.has(device.id)) return false;
    const ok = await device.init();
    if (!ok) { this.emit({ type: "error", deviceId: device.id, timestamp: Date.now(), detail: "Init failed" }); return false; }
    this.devices.set(device.id, device);
    this.emit({ type: "attach", deviceId: device.id, timestamp: Date.now() });
    return true;
  }

  detach(deviceId: string): boolean {
    const device = this.devices.get(deviceId);
    if (!device) return false;
    if (device.mountPath) this.unmount(deviceId);
    device.eject();
    this.devices.delete(deviceId);
    this.emit({ type: "detach", deviceId, timestamp: Date.now() });
    return true;
  }

  async mount(deviceId: string, path: string, ownerPid: number): Promise<boolean> {
    const device = this.devices.get(deviceId);
    if (!device || device.state === "ejected" || device.mountPath) return false;
    device.mount(path);
    this.fs.mount(path, device.id, ownerPid);
    this.emit({ type: "mount", deviceId, timestamp: Date.now(), detail: path });
    return true;
  }

  unmount(deviceId: string): boolean {
    const device = this.devices.get(deviceId);
    if (!device || !device.mountPath) return false;
    device.unmount();
    this.emit({ type: "unmount", deviceId, timestamp: Date.now() });
    return true;
  }

  async read(deviceId: string, cid: string): Promise<Uint8Array | null> {
    const device = this.devices.get(deviceId);
    if (!device) return null;
    const cached = this.mmu.load(cid);
    if (cached) { this.cacheHits++; this.totalReads++; this.totalBytesRead += cached.byteLength; return cached; }
    this.cacheMisses++;
    const data = await device.readSector(cid);
    if (data) { this.totalReads++; this.totalBytesRead += data.byteLength; this.mmu.store(data, 0); }
    return data;
  }

  async write(deviceId: string, data: Uint8Array, ownerPid: number): Promise<IoResult> {
    const device = this.devices.get(deviceId);
    if (!device) return { ok: false, cid: null, bytesTransferred: 0, latencyMs: 0, error: "Device not found" };
    const result = await device.writeSector(data, this.mmu, ownerPid);
    if (result.ok) { this.totalWrites++; this.totalBytesWritten += result.bytesTransferred; }
    return result;
  }

  async sync(deviceId: string): Promise<boolean> { return this.devices.has(deviceId); }

  getDevice(deviceId: string): BlockDevice | undefined { return this.devices.get(deviceId); }
  getDeviceByPath(path: string): BlockDevice | undefined {
    for (const d of this.devices.values()) { if (d.mountPath === path) return d; }
    return undefined;
  }
  allDevices(): BlockDeviceDescriptor[] { return Array.from(this.devices.values()).map(d => d.descriptor()); }
  getEventLog(): readonly DeviceEvent[] { return this.eventLog; }

  onEvent(listener: (e: DeviceEvent) => void): () => void {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter(l => l !== listener); };
  }

  stats(): DriverStats {
    const backends: Record<BackendType, number> = { memory: 0, indexeddb: 0, supabase: 0, ipfs: 0 };
    let online = 0, mounted = 0;
    for (const d of this.devices.values()) {
      backends[d.backend.type]++;
      if (d.state === "online" || d.state === "readonly") online++;
      if (d.mountPath) mounted++;
    }
    const totalAccesses = this.cacheHits + this.cacheMisses;
    return {
      totalDevices: this.devices.size, onlineDevices: online, mountedDevices: mounted,
      totalReads: this.totalReads, totalWrites: this.totalWrites,
      totalBytesRead: this.totalBytesRead, totalBytesWritten: this.totalBytesWritten,
      cacheHitRate: totalAccesses > 0 ? this.cacheHits / totalAccesses : 1, backends,
    };
  }

  private emit(event: DeviceEvent): void {
    this.eventLog.push(event);
    for (const l of this.listeners) { try { l(event); } catch { /* swallow */ } }
  }
}
