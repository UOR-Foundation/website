/**
 * UOR Foundation v2.0.0. bridge::boundary
 *
 * IO boundary, source/sink, ingest/emit effects.
 *
 * @see foundation/src/bridge/boundary.rs
 * @namespace boundary/
 */

/** Source. an input endpoint for data ingestion. */
export interface Source {
  /** Source identifier. */
  sourceId(): string;
  /** Media type of ingested data. */
  mediaType(): string;
  /** Whether this source is currently active. */
  isActive(): boolean;
}

/** Sink. an output endpoint for data emission. */
export interface Sink {
  /** Sink identifier. */
  sinkId(): string;
  /** Media type of emitted data. */
  mediaType(): string;
  /** Whether this sink is currently active. */
  isActive(): boolean;
}

/** IngestEffect. the effect of ingesting data from a source. */
export interface IngestEffect {
  /** Source that produced the data. */
  sourceId(): string;
  /** Number of bytes ingested. */
  bytesIngested(): number;
  /** Resulting datum CID. */
  datumCid(): string;
  /** Timestamp. */
  timestamp(): string;
}

/** EmitEffect. the effect of emitting data to a sink. */
export interface EmitEffect {
  /** Sink receiving the data. */
  sinkId(): string;
  /** Number of bytes emitted. */
  bytesEmitted(): number;
  /** Source datum CID. */
  datumCid(): string;
  /** Timestamp. */
  timestamp(): string;
}

/** BoundarySession. a session managing source/sink lifecycle. */
export interface BoundarySession {
  /** Session identifier. */
  sessionId(): string;
  /** Active sources. */
  sources(): Source[];
  /** Active sinks. */
  sinks(): Sink[];
  /** Whether the session is open. */
  isOpen(): boolean;
}
