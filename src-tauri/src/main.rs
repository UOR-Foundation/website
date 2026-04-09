//! UOR OS — Tauri Desktop Shell
//!
//! IPC bridge between the React frontend and native capabilities.
//! When the uor-foundation crate is compiled in, ring operations
//! execute at native speed with zero WASM overhead.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};

// ── Ring R₈ Operations (Z/256Z) ──────────────────────────────────────────

/// Additive inverse in Z/256Z
fn ring_neg(x: u8) -> u8 {
    x.wrapping_neg()
}

/// Bitwise complement
fn ring_bnot(x: u8) -> u8 {
    !x
}

/// Successor
fn ring_succ(x: u8) -> u8 {
    x.wrapping_add(1)
}

/// Predecessor
fn ring_pred(x: u8) -> u8 {
    x.wrapping_sub(1)
}

/// Ring addition
fn ring_add(a: u8, b: u8) -> u8 {
    a.wrapping_add(b)
}

/// Ring multiplication
fn ring_mul(a: u8, b: u8) -> u8 {
    a.wrapping_mul(b)
}

/// Verify critical identity: neg(bnot(x)) === succ(x) for all x in 0..255
fn verify_all_critical() -> bool {
    (0u16..=255).all(|x| {
        let x = x as u8;
        ring_neg(ring_bnot(x)) == ring_succ(x)
    })
}

// ── IPC Commands ─────────────────────────────────────────────────────────

#[derive(Serialize, Deserialize)]
pub struct EngineResult {
    pub value: i64,
}

#[derive(Serialize, Deserialize)]
pub struct PlatformInfo {
    pub runtime: String,
    pub os: String,
    pub arch: String,
    pub hostname: String,
    pub device_id: String,
}

#[tauri::command]
fn uor_ring_op(op: &str, a: u8, b: Option<u8>) -> Result<EngineResult, String> {
    let value = match op {
        "neg" => ring_neg(a) as i64,
        "bnot" => ring_bnot(a) as i64,
        "succ" => ring_succ(a) as i64,
        "pred" => ring_pred(a) as i64,
        "add" => ring_add(a, b.unwrap_or(0)) as i64,
        "mul" => ring_mul(a, b.unwrap_or(1)) as i64,
        "verify_all" => if verify_all_critical() { 1 } else { 0 },
        _ => return Err(format!("Unknown ring operation: {op}")),
    };
    Ok(EngineResult { value })
}

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
            get_platform_info,
        ])
        .run(tauri::generate_context!())
        .expect("error while running UOR OS");
}
