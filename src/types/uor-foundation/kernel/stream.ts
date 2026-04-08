/**
 * UOR Foundation v2.0.0. kernel::stream
 *
 * Coinductive sequences of cascade epochs.
 *
 * @see foundation/src/kernel/stream.rs
 * @namespace stream/
 */

/** StreamElement. a single element in a coinductive stream. */
export interface StreamElement {
  /** Element index in the stream. */
  index(): number;
  /** Value at this position. */
  value(): number;
  /** Epoch this element belongs to. */
  epochIndex(): number;
}

/** Stream. a coinductive (potentially infinite) sequence. */
export interface Stream {
  /** Stream identifier. */
  streamId(): string;
  /** Take the next n elements. */
  take(n: number): StreamElement[];
  /** Whether the stream has terminated. */
  isExhausted(): boolean;
  /** Current position in the stream. */
  position(): number;
}

/** StreamTransform. a transformation applied to a stream. */
export interface StreamTransform {
  /** Transform identifier. */
  transformId(): string;
  /** Apply to a stream, producing a new stream. */
  apply(input: Stream): Stream;
  /** Whether this transform preserves stream length. */
  lengthPreserving(): boolean;
}
