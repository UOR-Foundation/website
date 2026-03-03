/**
 * kernel/include/memory — Memory Management Types
 * ≡ Linux include/linux/mm_types.h
 *
 * Defines the virtual memory abstraction: CID-addressed pages,
 * storage tiers, and page fault descriptors.
 */

/** Storage tier (≡ Linux memory zones: ZONE_DMA, ZONE_NORMAL, ZONE_HIGHMEM) */
export type StorageTier = "hot" | "warm" | "cold" | "archive";

/** Page table entry (≡ pte_t) */
export interface PageTableEntry {
  cid: string;
  tier: StorageTier;
  size: number;
  accessCount: number;
  lastAccess: number;
  dirty: boolean;
}

/** Page fault descriptor (≡ struct vm_fault) */
export interface PageFault {
  cid: string;
  type: "not_present" | "protection" | "cow";
  resolved: boolean;
  newCid?: string;
}

/** Memory management statistics (≡ /proc/meminfo) */
export interface MmuStats {
  totalPages: number;
  hotPages: number;
  warmPages: number;
  coldPages: number;
  faults: number;
  evictions: number;
  deduplicatedBytes: number;
}
