/**
 * UOR Foundation v2.0.0. kernel::region
 *
 * Spatial locality, address regions, working sets.
 *
 * @see foundation/src/kernel/region.rs
 * @namespace region/
 */

/** Region. a contiguous range of ring addresses. */
export interface Region {
  /** Region identifier. */
  regionId(): string;
  /** Start address (inclusive). */
  start(): number;
  /** End address (exclusive). */
  end(): number;
  /** Number of addresses in this region. */
  size(): number;
  /** Whether a value falls within this region. */
  contains(value: number): boolean;
}

/** WorkingSet. a set of active regions. */
export interface WorkingSet {
  /** Active regions. */
  regions(): Region[];
  /** Total addresses across all regions. */
  totalSize(): number;
  /** Whether a value is in any active region. */
  contains(value: number): boolean;
}

/** RegionPartition. non-overlapping partition of the address space. */
export interface RegionPartition {
  /** Partitioned regions. */
  regions(): Region[];
  /** Whether the partition covers the full address space. */
  isComplete(): boolean;
  /** Whether all regions are non-overlapping. */
  isDisjoint(): boolean;
}
