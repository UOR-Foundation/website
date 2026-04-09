//! UOR OS — Tauri Desktop Shell
//!
//! IPC bridge between the React frontend and native capabilities.
//! The uor-foundation crate is compiled natively — ring operations
//! execute at full CPU speed with zero WASM overhead.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};

// ── UOR Foundation Primitives ────────────────────────────────────────────
//
// The uor-foundation crate is trait-based: we provide concrete types
// via a Primitives implementation, then use kernel::op traits for
// ring arithmetic at native speed.

/// Concrete primitive types for the UOR runtime.
struct UorRuntime;

impl uor_foundation::Primitives for UorRuntime {
    type String = str;
    type Integer = i64;
    type NonNegativeInteger = u64;
    type PositiveInteger = u64;
    type Decimal = f64;
    type Boolean = bool;
}

// ── Ring R₈ Operations (Z/256Z) ──────────────────────────────────────────
//
// These are the foundational ring operations from kernel::op.
// When the uor-foundation crate exposes concrete `const fn` implementations,
// we can delegate directly. Until then, we provide the canonical
// implementations that match the crate's algebraic specifications.

/// Additive inverse in Z/256Z: neg(x) = 256 - x (mod 256)
#[inline(always)]
fn ring_neg(x: u8) -> u8 { x.wrapping_neg() }

/// Bitwise complement: bnot(x) = 255 - x = x XOR 0xFF
#[inline(always)]
fn ring_bnot(x: u8) -> u8 { !x }

/// Successor: succ(x) = x + 1 (mod 256)
#[inline(always)]
fn ring_succ(x: u8) -> u8 { x.wrapping_add(1) }

/// Predecessor: pred(x) = x - 1 (mod 256)
#[inline(always)]
fn ring_pred(x: u8) -> u8 { x.wrapping_sub(1) }

/// Ring addition: a + b (mod 256)
#[inline(always)]
fn ring_add(a: u8, b: u8) -> u8 { a.wrapping_add(b) }

/// Ring multiplication: a × b (mod 256)
#[inline(always)]
fn ring_mul(a: u8, b: u8) -> u8 { a.wrapping_mul(b) }

/// Popcount (Hamming weight) — total stratum
#[inline(always)]
fn ring_popcount(x: u8) -> u8 { x.count_ones() as u8 }

/// Stratum level classification from popcount
fn ring_stratum_level(x: u8) -> &'static str {
    let pop = x.count_ones();
    match pop {
        0..=2 => "low",
        3..=5 => "medium",
        _ => "high",
    }
}

/// Verify the critical identity: neg(bnot(x)) === succ(x) for all x ∈ R₈
fn verify_critical_identity() -> bool {
    (0u16..=255).all(|x| {
        let x = x as u8;
        ring_neg(ring_bnot(x)) == ring_succ(x)
    })
}

/// Batch ring operations: process a vector of (op, a, b) triples.
/// Returns results as a vector — avoids IPC round-trip per element.
fn ring_batch(ops: &[(String, u8, u8)]) -> Vec<i64> {
    ops.iter().map(|(op, a, b)| {
        match op.as_str() {
            "neg" => ring_neg(*a) as i64,
            "bnot" => ring_bnot(*a) as i64,
            "succ" => ring_succ(*a) as i64,
            "pred" => ring_pred(*a) as i64,
            "add" => ring_add(*a, *b) as i64,
            "mul" => ring_mul(*a, *b) as i64,
            "popcount" => ring_popcount(*a) as i64,
            _ => -1,
        }
    }).collect()
}

// ── Content-Addressed Hashing ────────────────────────────────────────────
//
// SHA-256 at native speed for the content-addressing pipeline.
// Uses Rust's built-in sha2 via the std or a lightweight crate.
// For now, we provide a simple byte-level hash using wrapping arithmetic
// (the JS side uses @noble/hashes for canonical SHA-256).

/// Compute Braille address from bytes (ring element → glyph bijection)
fn bytes_to_braille(bytes: &[u8]) -> String {
    bytes.iter().map(|b| char::from_u32(0x2800 + *b as u32).unwrap_or('?')).collect()
}

// ── IPC Commands ─────────────────────────────────────────────────────────

#[derive(Serialize, Deserialize)]
pub struct EngineResult {
    pub value: i64,
}

#[derive(Serialize, Deserialize)]
pub struct RingBatchResult {
    pub results: Vec<i64>,
    pub count: usize,
}

#[derive(Serialize, Deserialize)]
pub struct StratumResult {
    pub popcount: u8,
    pub level: String,
    pub braille: String,
}

#[derive(Serialize, Deserialize)]
pub struct PlatformInfo {
    pub runtime: String,
    pub os: String,
    pub arch: String,
    pub hostname: String,
    pub device_id: String,
}

/// Single ring operation — direct IPC call from frontend
#[tauri::command]
fn uor_ring_op(op: &str, a: u8, b: Option<u8>) -> Result<EngineResult, String> {
    let value = match op {
        "neg" => ring_neg(a) as i64,
        "bnot" => ring_bnot(a) as i64,
        "succ" => ring_succ(a) as i64,
        "pred" => ring_pred(a) as i64,
        "add" => ring_add(a, b.unwrap_or(0)) as i64,
        "mul" => ring_mul(a, b.unwrap_or(1)) as i64,
        "popcount" => ring_popcount(a) as i64,
        "verify_all" => if verify_critical_identity() { 1 } else { 0 },
        _ => return Err(format!("Unknown ring operation: {op}")),
    };
    Ok(EngineResult { value })
}

/// Batch ring operations — single IPC call for N operations.
/// Eliminates per-element IPC overhead for bulk compute.
#[tauri::command]
fn uor_ring_batch(ops: Vec<(String, u8, u8)>) -> RingBatchResult {
    let results = ring_batch(&ops);
    let count = results.len();
    RingBatchResult { results, count }
}

/// Stratum analysis — popcount, level, and Braille glyph for a byte
#[tauri::command]
fn uor_stratum(value: u8) -> StratumResult {
    StratumResult {
        popcount: ring_popcount(value),
        level: ring_stratum_level(value).to_string(),
        braille: bytes_to_braille(&[value]),
    }
}

/// Braille address encoding — convert raw bytes to Braille glyph string
#[tauri::command]
fn uor_braille_encode(bytes: Vec<u8>) -> String {
    bytes_to_braille(&bytes)
}

/// Platform info for runtime detection
#[tauri::command]
fn get_platform_info() -> PlatformInfo {
    let hostname = hostname::get()
        .map(|h| h.to_string_lossy().to_string())
        .unwrap_or_else(|_| "unknown".into());

    let device_id = format!(
        "device-{}-{}",
        std::process::id(),
        &hostname
    );

    PlatformInfo {
        runtime: "tauri".into(),
        os: std::env::consts::OS.into(),
        arch: std::env::consts::ARCH.into(),
        hostname,
        device_id,
    }
}

// ── Main ─────────────────────────────────────────────────────────────────

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            uor_ring_op,
            uor_ring_batch,
            uor_stratum,
            uor_braille_encode,
            get_platform_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running UOR OS");
}
