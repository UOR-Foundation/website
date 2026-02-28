/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║  AXIOM-HASH  —  SHA-256 from Ring Operations            ║
 * ║                                                          ║
 * ║  Complete FIPS 180-4 SHA-256 implementation using        ║
 * ║  only primitives from axiom-ring.ts.                     ║
 * ║  No Web Crypto. No node:crypto. No imports beyond ring.  ║
 * ║                                                          ║
 * ║  The hash is how the kernel names things.                ║
 * ║  Name = Identity = Address.                              ║
 * ╚══════════════════════════════════════════════════════════╝
 */

import {
  type ByteTuple,
  byteTuple,
  rotr32,
  shr,
  toHex,
} from "./axiom-ring";

// ── SHA-256 Constants (first 32 bits of fractional parts of cube roots of first 64 primes) ──
const K: readonly number[] = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

// ── Initial hash values (first 32 bits of fractional parts of square roots of first 8 primes) ──
const H0: readonly number[] = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
  0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
];

// ── SHA-256 logical functions (built from ring shifts/rotations) ──
function Ch(x: number, y: number, z: number): number {
  return ((x & y) ^ (~x & z)) >>> 0;
}

function Maj(x: number, y: number, z: number): number {
  return ((x & y) ^ (x & z) ^ (y & z)) >>> 0;
}

function Sigma0(x: number): number {
  return (rotr32(x, 2) ^ rotr32(x, 13) ^ rotr32(x, 22)) >>> 0;
}

function Sigma1(x: number): number {
  return (rotr32(x, 6) ^ rotr32(x, 11) ^ rotr32(x, 25)) >>> 0;
}

function sigma0(x: number): number {
  return (rotr32(x, 7) ^ rotr32(x, 18) ^ shr(x, 3)) >>> 0;
}

function sigma1(x: number): number {
  return (rotr32(x, 17) ^ rotr32(x, 19) ^ shr(x, 10)) >>> 0;
}

// ── Add two 32-bit words modulo 2^32 ──────────────────────
function add32(a: number, b: number): number {
  return (a + b) >>> 0;
}

// ── Pad message per FIPS 180-4 §5.1.1 ────────────────────
function pad(msg: ByteTuple): ByteTuple {
  const bitLen = msg.length * 8;
  // message + 0x80 + zeros + 8 bytes length
  const padLen = 64 - ((msg.length + 9) % 64);
  const totalLen = msg.length + 1 + (padLen === 64 ? 0 : padLen) + 8;
  const padded = new Uint8Array(totalLen);
  padded.set(msg);
  padded[msg.length] = 0x80;
  // Big-endian 64-bit length (we only use lower 32 bits for messages < 2^32 bits)
  const lenPos = totalLen - 8;
  // Upper 32 bits (for large messages)
  const hi = (bitLen / 0x100000000) >>> 0;
  padded[lenPos]     = (hi >>> 24) & 0xff;
  padded[lenPos + 1] = (hi >>> 16) & 0xff;
  padded[lenPos + 2] = (hi >>> 8)  & 0xff;
  padded[lenPos + 3] = hi          & 0xff;
  // Lower 32 bits
  padded[lenPos + 4] = (bitLen >>> 24) & 0xff;
  padded[lenPos + 5] = (bitLen >>> 16) & 0xff;
  padded[lenPos + 6] = (bitLen >>> 8)  & 0xff;
  padded[lenPos + 7] = bitLen          & 0xff;
  return padded;
}

// ── Core SHA-256 compression ──────────────────────────────
/**
 * Computes the SHA-256 hash of a byte array.
 * This is the kernel's naming function.
 * Every identity in the system flows through this.
 */
export function sha256(message: ByteTuple): ByteTuple {
  const padded = pad(message);

  // Working hash values
  let h0 = H0[0], h1 = H0[1], h2 = H0[2], h3 = H0[3];
  let h4 = H0[4], h5 = H0[5], h6 = H0[6], h7 = H0[7];

  // Process each 512-bit (64-byte) block
  const W = new Uint32Array(64);

  for (let offset = 0; offset < padded.length; offset += 64) {
    // Prepare message schedule W
    for (let t = 0; t < 16; t++) {
      const i = offset + t * 4;
      W[t] = ((padded[i] << 24) | (padded[i + 1] << 16) | (padded[i + 2] << 8) | padded[i + 3]) >>> 0;
    }
    for (let t = 16; t < 64; t++) {
      W[t] = add32(add32(sigma1(W[t - 2]), W[t - 7]), add32(sigma0(W[t - 15]), W[t - 16]));
    }

    // Initialize working variables
    let a = h0, b = h1, c = h2, d = h3;
    let e = h4, f = h5, g = h6, h = h7;

    // 64 rounds
    for (let t = 0; t < 64; t++) {
      const T1 = add32(add32(add32(h, Sigma1(e)), add32(Ch(e, f, g), K[t])), W[t]);
      const T2 = add32(Sigma0(a), Maj(a, b, c));
      h = g; g = f; f = e;
      e = add32(d, T1);
      d = c; c = b; b = a;
      a = add32(T1, T2);
    }

    // Update hash values
    h0 = add32(h0, a); h1 = add32(h1, b);
    h2 = add32(h2, c); h3 = add32(h3, d);
    h4 = add32(h4, e); h5 = add32(h5, f);
    h6 = add32(h6, g); h7 = add32(h7, h);
  }

  // Produce the 256-bit (32-byte) digest
  const digest = new Uint8Array(32);
  const words = [h0, h1, h2, h3, h4, h5, h6, h7];
  for (let i = 0; i < 8; i++) {
    digest[i * 4]     = (words[i] >>> 24) & 0xff;
    digest[i * 4 + 1] = (words[i] >>> 16) & 0xff;
    digest[i * 4 + 2] = (words[i] >>> 8)  & 0xff;
    digest[i * 4 + 3] = words[i]           & 0xff;
  }
  return digest;
}

/**
 * Hash a UTF-8 string directly.
 */
export function sha256str(input: string): ByteTuple {
  return sha256(byteTuple(Array.from(new TextEncoder().encode(input))));
}

/**
 * Hash to hex string — the most common display format.
 */
export function sha256hex(input: ByteTuple): string {
  return toHex(sha256(input));
}

/**
 * Double-SHA256 (used in Bitcoin, UOR receipt chains).
 */
export function doubleSha256(input: ByteTuple): ByteTuple {
  return sha256(sha256(input));
}
