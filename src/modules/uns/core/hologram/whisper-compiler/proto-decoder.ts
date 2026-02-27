/**
 * Minimal Protobuf Wire-Format Decoder
 * ═════════════════════════════════════
 *
 * Zero-dependency protobuf decoder for reading ONNX model files.
 * Handles the wire format directly — no .proto compilation needed.
 *
 * Supports: varint, fixed32, fixed64, length-delimited, nested messages.
 * ~2KB minified. No npm packages. Fully Hologram-native.
 *
 * @module uns/core/hologram/whisper-compiler/proto-decoder
 */

// ── Wire Types ─────────────────────────────────────────────────────────────

export const WireType = {
  VARINT: 0,
  FIXED64: 1,
  LENGTH_DELIMITED: 2,
  START_GROUP: 3,
  END_GROUP: 4,
  FIXED32: 5,
} as const;

// ── ProtoReader ────────────────────────────────────────────────────────────

/**
 * Low-level protobuf reader that operates directly on ArrayBuffer.
 * Designed for zero-copy operation on large ONNX files (40-60MB).
 */
export class ProtoReader {
  private buf: Uint8Array;
  private view: DataView;
  private pos: number;
  private end: number;

  constructor(buffer: ArrayBuffer, offset = 0, length?: number) {
    this.buf = new Uint8Array(buffer);
    this.view = new DataView(buffer);
    this.pos = offset;
    this.end = offset + (length ?? buffer.byteLength - offset);
  }

  /** True when all bytes have been consumed */
  get done(): boolean {
    return this.pos >= this.end;
  }

  /** Current read position */
  get position(): number {
    return this.pos;
  }

  /** Remaining bytes */
  get remaining(): number {
    return this.end - this.pos;
  }

  // ── Varint ──────────────────────────────────────────────────────────

  /** Read a varint as unsigned 32-bit number */
  readVarint(): number {
    let result = 0;
    let shift = 0;

    while (this.pos < this.end) {
      const byte = this.buf[this.pos++];

      if (shift < 28) {
        result |= (byte & 0x7f) << shift;
      } else {
        // For shifts >= 28, use multiplication to avoid 32-bit truncation
        result += (byte & 0x7f) * (2 ** shift);
      }

      if (!(byte & 0x80)) {
        return result >>> 0;
      }

      shift += 7;
      if (shift > 63) {
        // Consume remaining continuation bytes and return what we have
        while (this.pos < this.end && this.buf[this.pos] & 0x80) this.pos++;
        if (this.pos < this.end) this.pos++; // consume final byte
        return result >>> 0;
      }
    }

    return result >>> 0;
  }

  /** Read a varint as signed 32-bit (zigzag decoded) */
  readSint32(): number {
    const n = this.readVarint();
    return (n >>> 1) ^ -(n & 1);
  }

  /** Read a varint as 64-bit number (lossy for values > 2^53) */
  readVarint64AsNumber(): number {
    let result = 0;
    let shift = 0;

    while (this.pos < this.end) {
      const byte = this.buf[this.pos++];
      // Use multiplication for shifts > 28 to avoid 32-bit truncation
      result += (byte & 0x7f) * (2 ** shift);

      if (!(byte & 0x80)) {
        return result;
      }

      shift += 7;
      if (shift > 63) {
        throw new Error("[ProtoReader] Varint64 too long");
      }
    }

    throw new Error("[ProtoReader] Unexpected end of varint64");
  }

  // ── Fixed-width ─────────────────────────────────────────────────────

  /** Read a little-endian float32 */
  readFloat32(): number {
    const val = this.view.getFloat32(this.pos, true);
    this.pos += 4;
    return val;
  }

  /** Read a little-endian float64 */
  readFloat64(): number {
    const val = this.view.getFloat64(this.pos, true);
    this.pos += 8;
    return val;
  }

  /** Read a little-endian uint32 */
  readFixed32(): number {
    const val = this.view.getUint32(this.pos, true);
    this.pos += 4;
    return val;
  }

  /** Read a little-endian int32 */
  readSfixed32(): number {
    const val = this.view.getInt32(this.pos, true);
    this.pos += 4;
    return val;
  }

  // ── Length-delimited ────────────────────────────────────────────────

  /**
   * Read raw bytes. Returns a zero-copy view into the original buffer.
   * IMPORTANT: Do not modify the returned Uint8Array if the source
   * buffer is shared.
   */
  readBytes(): Uint8Array {
    const len = this.readVarint();
    if (this.pos + len > this.end) {
      throw new Error(
        `[ProtoReader] Bytes overflow: need ${len}, have ${this.remaining}`
      );
    }
    const bytes = new Uint8Array(this.buf.buffer, this.buf.byteOffset + this.pos, len);
    this.pos += len;
    return bytes;
  }

  /** Read a UTF-8 string */
  readString(): string {
    return new TextDecoder().decode(this.readBytes());
  }

  // ── Tag parsing ─────────────────────────────────────────────────────

  /** Read the next field tag. Returns null at end of message. */
  readTag(): { field: number; wire: number } | null {
    if (this.done) return null;
    const tag = this.readVarint();
    return { field: tag >>> 3, wire: tag & 0x07 };
  }

  /** Skip a field value based on its wire type */
  skip(wire: number): void {
    switch (wire) {
      case WireType.VARINT:
        this.readVarint();
        break;
      case WireType.FIXED64:
        this.pos += 8;
        break;
      case WireType.LENGTH_DELIMITED: {
        const len = this.readVarint();
        this.pos += len;
        break;
      }
      case WireType.START_GROUP: {
        // Skip fields until matching END_GROUP
        while (this.pos < this.end) {
          const tag = this.readTag();
          if (!tag || tag.wire === WireType.END_GROUP) break;
          this.skip(tag.wire);
        }
        break;
      }
      case WireType.END_GROUP:
        break;
      case WireType.FIXED32:
        this.pos += 4;
        break;
      default:
        // Unknown wire type — skip 1 byte and hope for the best
        console.warn(`[ProtoReader] Unknown wire type ${wire} at pos ${this.pos}, skipping`);
        this.pos++;
    }
    // Clamp position to bounds
    if (this.pos > this.end) this.pos = this.end;
  }

  // ── Sub-message ─────────────────────────────────────────────────────

  /**
   * Create a sub-reader for a length-delimited nested message.
   * The sub-reader shares the same underlying buffer (zero-copy).
   */
  subReader(): ProtoReader {
    const len = this.readVarint();
    if (this.pos + len > this.end) {
      throw new Error(
        `[ProtoReader] Sub-message overflow: need ${len}, have ${this.remaining}`
      );
    }
    const sub = new ProtoReader(this.buf.buffer as ArrayBuffer, this.buf.byteOffset + this.pos, len);
    this.pos += len;
    return sub;
  }

  // ── Packed repeated fields ──────────────────────────────────────────

  /** Read a packed array of varint64 values as numbers */
  readPackedVarint64(): number[] {
    const sub = this.subReader();
    const result: number[] = [];
    while (!sub.done) {
      result.push(sub.readVarint64AsNumber());
    }
    return result;
  }

  /** Read a packed array of float32 values */
  readPackedFloat32(): Float32Array {
    const len = this.readVarint();
    const count = len / 4;
    const result = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      result[i] = this.view.getFloat32(this.pos, true);
      this.pos += 4;
    }
    return result as Float32Array<ArrayBuffer>;
  }

  /** Read a packed array of float64 values */
  readPackedFloat64(): Float64Array {
    const len = this.readVarint();
    const count = len / 8;
    const result = new Float64Array(count);
    for (let i = 0; i < count; i++) {
      result[i] = this.view.getFloat64(this.pos, true);
      this.pos += 8;
    }
    return result;
  }

  /** Read a packed array of int32 values */
  readPackedInt32(): Int32Array {
    const sub = this.subReader();
    const result: number[] = [];
    while (!sub.done) {
      result.push(sub.readVarint());
    }
    return new Int32Array(result);
  }
}
