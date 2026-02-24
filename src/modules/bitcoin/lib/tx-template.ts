/**
 * Bitcoin OP_RETURN Transaction Template Builder
 * ═══════════════════════════════════════════════
 *
 * Generates a complete, standards-compliant raw Bitcoin transaction
 * template with an OP_RETURN output that anchors a UOR identity
 * hash to the Bitcoin blockchain.
 *
 * The template follows BIP-141 (SegWit) serialization with a single
 * OP_RETURN output carrying the 36-byte UOR payload:
 *
 *   [3 bytes] "UOR" magic prefix (0x554f52)
 *   [1 byte]  version (0x01)
 *   [32 bytes] SHA-256 canonical identity hash
 *
 * The transaction includes a placeholder input (all zeros) that
 * must be replaced with a real UTXO before broadcast. The change
 * output uses a placeholder P2WPKH address.
 *
 * @module bitcoin/lib/tx-template
 */

/* ── Constants ──────────────────────────────────────────────── */

/** UOR OP_RETURN protocol version */
const UOR_VERSION = "01";

/** Magic prefix: ASCII "UOR" */
const UOR_MAGIC = "554f52";

/** Placeholder 32-byte txid (user replaces with real UTXO) */
const PLACEHOLDER_TXID = "00".repeat(32);

/** Placeholder output index */
const PLACEHOLDER_VOUT = "00000000";

/** Placeholder P2WPKH scriptPubKey (OP_0 OP_PUSHBYTES_20 <20-byte hash>) */
const PLACEHOLDER_P2WPKH = "0014" + "00".repeat(20);

/** Minimum relay fee in satoshis (conservative estimate) */
const MIN_RELAY_FEE_SATS = 300;

/* ── Types ──────────────────────────────────────────────────── */

export interface TxTemplateInput {
  /** 64-char lowercase hex SHA-256 hash */
  readonly identityHash: string;
  /** Input amount in satoshis (default: 10000) */
  readonly inputSats?: number;
  /** Fee in satoshis (default: 300) */
  readonly feeSats?: number;
  /** Optional: real UTXO txid to replace placeholder */
  readonly utxoTxid?: string;
  /** Optional: real UTXO vout */
  readonly utxoVout?: number;
  /** Optional: real P2WPKH scriptPubKey for change */
  readonly changeScriptPubKey?: string;
}

export interface TxTemplateOutput {
  /** Complete raw transaction hex */
  readonly rawTx: string;
  /** The OP_RETURN scriptPubKey hex */
  readonly opReturnScript: string;
  /** Transaction ID (double SHA-256 of serialized tx, reversed) */
  readonly txid: string;
  /** Breakdown of transaction fields */
  readonly fields: TxField[];
  /** Input amount in satoshis */
  readonly inputSats: number;
  /** Fee in satoshis */
  readonly feeSats: number;
  /** Change amount in satoshis */
  readonly changeSats: number;
  /** Whether this uses placeholder values (not ready for broadcast) */
  readonly isTemplate: boolean;
}

export interface TxField {
  readonly name: string;
  readonly hex: string;
  readonly description: string;
  readonly category: "header" | "input" | "output-opreturn" | "output-change" | "footer";
}

/* ── Helpers ────────────────────────────────────────────────── */

function toLittleEndian64(sats: number): string {
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  // Bitcoin uses unsigned 64-bit LE for amounts
  view.setUint32(0, sats & 0xffffffff, true);
  view.setUint32(4, Math.floor(sats / 0x100000000), true);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function toLittleEndian32(n: number): string {
  const buf = new ArrayBuffer(4);
  new DataView(buf).setUint32(0, n, true);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

function reverseBytes(hex: string): string {
  const bytes: string[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(hex.slice(i, i + 2));
  }
  return bytes.reverse().join("");
}

async function doubleSha256(hex: string): Promise<string> {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  const first = await crypto.subtle.digest("SHA-256", bytes);
  const second = await crypto.subtle.digest("SHA-256", first);
  return Array.from(new Uint8Array(second))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

/* ── Builder ────────────────────────────────────────────────── */

/**
 * Build a complete raw Bitcoin transaction template with OP_RETURN.
 *
 * The transaction structure:
 *   Version (4 bytes) | Input Count (1) | Input | Output Count (2) |
 *   OP_RETURN Output (0 sats) | Change Output | Locktime (4 bytes)
 */
export async function buildOpReturnTx(input: TxTemplateInput): Promise<TxTemplateOutput> {
  const {
    identityHash,
    inputSats = 10000,
    feeSats = MIN_RELAY_FEE_SATS,
    utxoTxid,
    utxoVout,
    changeScriptPubKey,
  } = input;

  // Validate
  if (!/^[0-9a-f]{64}$/.test(identityHash)) {
    throw new Error("Identity hash must be 64 lowercase hex characters");
  }

  const changeSats = inputSats - feeSats;
  if (changeSats < 0) {
    throw new Error(`Fee (${feeSats}) exceeds input (${inputSats})`);
  }

  const isTemplate = !utxoTxid;

  // ── OP_RETURN scriptPubKey ─────────────────────────────────
  // 6a = OP_RETURN
  // 25 = OP_PUSHBYTES_37 (3 magic + 1 version + 1 flags + 32 hash = 37)
  // 554f52 = "UOR"
  // 01 = version 1
  // 00 = flags (reserved)
  // {hash} = 32-byte identity
  const opReturnPayload = `${UOR_MAGIC}${UOR_VERSION}00${identityHash}`;
  const pushLen = (opReturnPayload.length / 2).toString(16).padStart(2, "0");
  const opReturnScript = `6a${pushLen}${opReturnPayload}`;

  // ── Input (placeholder or real) ────────────────────────────
  const txid = utxoTxid ? reverseBytes(utxoTxid) : PLACEHOLDER_TXID;
  const vout = utxoVout !== undefined ? toLittleEndian32(utxoVout) : PLACEHOLDER_VOUT;
  const scriptSig = "00"; // empty scriptSig (SegWit)
  const sequence = "ffffffff";

  // ── Change output ──────────────────────────────────────────
  const changeScript = changeScriptPubKey || PLACEHOLDER_P2WPKH;
  const changeScriptLen = (changeScript.length / 2).toString(16).padStart(2, "0");

  // ── OP_RETURN output ───────────────────────────────────────
  const opReturnScriptLen = (opReturnScript.length / 2).toString(16).padStart(2, "0");

  // ── Assemble fields ────────────────────────────────────────
  const fields: TxField[] = [
    { name: "Version", hex: "02000000", description: "Transaction version 2 (BIP-68 relative lock-time)", category: "header" },
    { name: "Input Count", hex: "01", description: "One input (UTXO to spend)", category: "header" },
    { name: "Previous Txid", hex: txid, description: isTemplate ? "⚠ Placeholder — replace with real UTXO txid (little-endian)" : `UTXO txid: ${utxoTxid}`, category: "input" },
    { name: "Previous Vout", hex: vout, description: isTemplate ? "⚠ Placeholder — replace with real output index" : `Output index: ${utxoVout}`, category: "input" },
    { name: "ScriptSig Length", hex: scriptSig, description: "Empty scriptSig (witness data goes in SegWit)", category: "input" },
    { name: "Sequence", hex: sequence, description: "0xFFFFFFFF — no relative lock-time, RBF disabled", category: "input" },
    { name: "Output Count", hex: "02", description: "Two outputs: OP_RETURN (data) + change", category: "header" },
    { name: "OP_RETURN Value", hex: toLittleEndian64(0), description: "0 satoshis — data output carries no value", category: "output-opreturn" },
    { name: "OP_RETURN Script Length", hex: opReturnScriptLen, description: `${parseInt(opReturnScriptLen, 16)} bytes of script`, category: "output-opreturn" },
    { name: "OP_RETURN", hex: "6a", description: "Opcode 106: marks output as provably unspendable", category: "output-opreturn" },
    { name: "Push Length", hex: pushLen, description: `Push ${parseInt(pushLen, 16)} bytes of UOR payload`, category: "output-opreturn" },
    { name: "UOR Magic", hex: UOR_MAGIC, description: 'Protocol identifier: ASCII "UOR" (0x554f52)', category: "output-opreturn" },
    { name: "UOR Version", hex: UOR_VERSION, description: "Protocol version 1", category: "output-opreturn" },
    { name: "Flags", hex: "00", description: "Reserved flags byte (0x00)", category: "output-opreturn" },
    { name: "Identity Hash", hex: identityHash, description: "32-byte SHA-256 UOR canonical identity", category: "output-opreturn" },
    { name: "Change Value", hex: toLittleEndian64(changeSats), description: `${changeSats.toLocaleString()} satoshis returned to sender`, category: "output-change" },
    { name: "Change Script Length", hex: changeScriptLen, description: `${parseInt(changeScriptLen, 16)} bytes of locking script`, category: "output-change" },
    { name: "Change ScriptPubKey", hex: changeScript, description: isTemplate ? "⚠ Placeholder P2WPKH — replace with your address" : "P2WPKH change output", category: "output-change" },
    { name: "Locktime", hex: "00000000", description: "No lock-time — transaction valid immediately", category: "footer" },
  ];

  // ── Concatenate raw transaction ────────────────────────────
  const rawTx = fields.map(f => f.hex).join("");

  // ── Compute txid (double SHA-256 of serialized tx, reversed) ──
  const txHash = await doubleSha256(rawTx);
  const computedTxid = reverseBytes(txHash);

  return {
    rawTx,
    opReturnScript,
    txid: computedTxid,
    fields,
    inputSats,
    feeSats,
    changeSats,
    isTemplate,
  };
}
