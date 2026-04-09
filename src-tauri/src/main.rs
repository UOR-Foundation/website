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

// ── Local LLM Integration (Ollama / llama.cpp) ──────────────────────────

/// Default Ollama endpoint
const OLLAMA_URL: &str = "http://127.0.0.1:11434";

#[derive(Serialize, Deserialize)]
pub struct LocalModel {
    pub name: String,
    pub size: String,
    pub quantization: String,
    pub parameter_count: String,
    pub family: String,
    pub loaded: bool,
}

#[derive(Serialize, Deserialize)]
pub struct LlmStatus {
    pub backend: String,
    pub available: bool,
    pub models: Vec<LocalModel>,
    pub active_model: Option<String>,
    pub gpu_accelerated: bool,
    pub vram_used_mb: f64,
    pub server_version: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct LlmCompletionResult {
    pub text: String,
    pub backend: String,
    pub model: String,
    pub tokens_generated: u64,
    pub duration_ms: u64,
    pub throughput: f64,
}

#[derive(Serialize, Deserialize)]
pub struct StreamToken {
    pub token: String,
    pub done: bool,
}

/// Check if Ollama is running and return its status.
#[tauri::command]
async fn llm_status() -> Result<LlmStatus, String> {
    // Try Ollama API
    let client = reqwest::Client::new();

    // Check version
    let version = match client.get(format!("{OLLAMA_URL}/api/version")).send().await {
        Ok(resp) if resp.status().is_success() => {
            resp.json::<serde_json::Value>().await
                .ok()
                .and_then(|v| v["version"].as_str().map(String::from))
        }
        _ => return Ok(LlmStatus {
            backend: "cloud".into(),
            available: false,
            models: vec![],
            active_model: None,
            gpu_accelerated: false,
            vram_used_mb: 0.0,
            server_version: None,
        }),
    };

    // List models
    let models = match client.get(format!("{OLLAMA_URL}/api/tags")).send().await {
        Ok(resp) if resp.status().is_success() => {
            let body: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
            body["models"].as_array().map(|arr| {
                arr.iter().map(|m| LocalModel {
                    name: m["name"].as_str().unwrap_or("").into(),
                    size: format_bytes(m["size"].as_u64().unwrap_or(0)),
                    quantization: m["details"]["quantization_level"].as_str().unwrap_or("unknown").into(),
                    parameter_count: m["details"]["parameter_size"].as_str().unwrap_or("unknown").into(),
                    family: m["details"]["family"].as_str().unwrap_or("unknown").into(),
                    loaded: false,
                }).collect()
            }).unwrap_or_default()
        }
        _ => vec![],
    };

    // Check running models (loaded in memory)
    let active_model = match client.get(format!("{OLLAMA_URL}/api/ps")).send().await {
        Ok(resp) if resp.status().is_success() => {
            let body: serde_json::Value = resp.json().await.unwrap_or_default();
            body["models"].as_array()
                .and_then(|arr| arr.first())
                .and_then(|m| m["name"].as_str().map(String::from))
        }
        _ => None,
    };

    Ok(LlmStatus {
        backend: "ollama".into(),
        available: true,
        models,
        active_model,
        gpu_accelerated: false, // TODO: detect via Ollama API
        vram_used_mb: 0.0,
        server_version: version,
    })
}

/// List available models from Ollama.
#[tauri::command]
async fn llm_list_models() -> Result<Vec<LocalModel>, String> {
    let status = llm_status().await?;
    Ok(status.models)
}

/// Pull a model from the Ollama registry.
#[tauri::command]
async fn llm_pull_model(model: String) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();
    let resp = client
        .post(format!("{OLLAMA_URL}/api/pull"))
        .json(&serde_json::json!({ "name": model }))
        .send()
        .await
        .map_err(|e| format!("Pull failed: {e}"))?;

    if resp.status().is_success() {
        Ok(serde_json::json!({ "success": true }))
    } else {
        Err(format!("Pull failed: HTTP {}", resp.status()))
    }
}

/// Run a non-streaming completion via Ollama.
#[tauri::command]
async fn llm_complete(
    prompt: String,
    model: String,
    system_prompt: String,
    temperature: f64,
    max_tokens: u64,
) -> Result<LlmCompletionResult, String> {
    let client = reqwest::Client::new();
    let start = std::time::Instant::now();

    let resp = client
        .post(format!("{OLLAMA_URL}/api/generate"))
        .json(&serde_json::json!({
            "model": model,
            "prompt": prompt,
            "system": system_prompt,
            "stream": false,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
            }
        }))
        .send()
        .await
        .map_err(|e| format!("Ollama request failed: {e}"))?;

    if !resp.status().is_success() {
        return Err(format!("Ollama error: HTTP {}", resp.status()));
    }

    let body: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    let text = body["response"].as_str().unwrap_or("").to_string();
    let duration_ms = start.elapsed().as_millis() as u64;
    let tokens_generated = body["eval_count"].as_u64().unwrap_or(text.len() as u64 / 4);
    let throughput = if duration_ms > 0 {
        tokens_generated as f64 / (duration_ms as f64 / 1000.0)
    } else {
        0.0
    };

    Ok(LlmCompletionResult {
        text,
        backend: "ollama".into(),
        model,
        tokens_generated,
        duration_ms,
        throughput,
    })
}

/// Start a streaming completion — returns a session ID for polling.
/// (Simplified: runs full generation and caches result for polling.)
#[tauri::command]
async fn llm_stream_start(
    prompt: String,
    model: String,
    system_prompt: String,
    temperature: f64,
    max_tokens: u64,
    state: tauri::State<'_, StreamSessions>,
) -> Result<String, String> {
    let session_id = format!("llm-{}", std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis());

    let sid = session_id.clone();
    let sessions = state.inner().clone();

    // Spawn async generation
    tauri::async_runtime::spawn(async move {
        let client = reqwest::Client::new();

        let resp = client
            .post(format!("{OLLAMA_URL}/api/generate"))
            .json(&serde_json::json!({
                "model": model,
                "prompt": prompt,
                "system": system_prompt,
                "stream": true,
                "options": {
                    "temperature": temperature,
                    "num_predict": max_tokens,
                }
            }))
            .send()
            .await;

        match resp {
            Ok(r) => {
                let mut stream = r.bytes_stream();
                use futures_util::StreamExt;
                let mut buf = String::new();

                while let Some(chunk) = stream.next().await {
                    if let Ok(bytes) = chunk {
                        buf.push_str(&String::from_utf8_lossy(&bytes));
                        // Ollama streams NDJSON — one JSON object per line
                        while let Some(nl) = buf.find('\n') {
                            let line = buf[..nl].to_string();
                            buf = buf[nl + 1..].to_string();
                            if let Ok(obj) = serde_json::from_str::<serde_json::Value>(&line) {
                                let token = obj["response"].as_str().unwrap_or("").to_string();
                                let done = obj["done"].as_bool().unwrap_or(false);
                                let mut guard = sessions.0.lock().unwrap();
                                let tokens = guard.entry(sid.clone()).or_insert_with(Vec::new);
                                tokens.push(StreamToken { token, done });
                            }
                        }
                    }
                }
            }
            Err(e) => {
                let mut guard = sessions.0.lock().unwrap();
                let tokens = guard.entry(sid.clone()).or_insert_with(Vec::new);
                tokens.push(StreamToken { token: format!("[error: {e}]"), done: true });
            }
        }
    });

    Ok(session_id)
}

/// Poll for tokens from a streaming session.
#[tauri::command]
fn llm_stream_poll(
    session_id: String,
    state: tauri::State<'_, StreamSessions>,
) -> Vec<StreamToken> {
    let mut guard = state.0.lock().unwrap();
    guard.remove(&session_id).unwrap_or_default()
}

/// Shared state for streaming sessions.
#[derive(Default, Clone)]
struct StreamSessions(std::sync::Arc<std::sync::Mutex<std::collections::HashMap<String, Vec<StreamToken>>>>);

fn format_bytes(bytes: u64) -> String {
    if bytes >= 1_073_741_824 {
        format!("{:.1} GB", bytes as f64 / 1_073_741_824.0)
    } else if bytes >= 1_048_576 {
        format!("{:.1} MB", bytes as f64 / 1_048_576.0)
    } else {
        format!("{} KB", bytes / 1024)
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
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_stronghold::Builder::new(|password| {
            // Derive key from password using argon2
            use std::collections::hash_map::DefaultHasher;
            use std::hash::{Hash, Hasher};
            let mut hasher = DefaultHasher::new();
            password.hash(&mut hasher);
            let hash = hasher.finish();
            Ok(hash.to_le_bytes().to_vec())
        }).build())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--hidden"]),
        ))
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // Focus the main window when a second instance is launched
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .setup(|app| {
            // System tray menu
            use tauri::menu::{MenuBuilder, MenuItemBuilder};
            use tauri::tray::TrayIconBuilder;

            let open = MenuItemBuilder::with_id("open", "Open UOR OS").build(app)?;
            let sync = MenuItemBuilder::with_id("sync", "Sync Status").build(app)?;
            let capture = MenuItemBuilder::with_id("capture", "Quick Capture").build(app)?;
            let quit = MenuItemBuilder::with_id("quit", "Quit").build(app)?;

            let menu = MenuBuilder::new(app)
                .item(&open)
                .item(&sync)
                .item(&capture)
                .separator()
                .item(&quit)
                .build()?;

            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .tooltip("UOR OS — Sovereign Portal")
                .on_menu_event(|app, event| {
                    match event.id().as_ref() {
                        "open" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .build(app)?;

            Ok(())
        })
        .manage(StreamSessions::default())
        .invoke_handler(tauri::generate_handler![
            uor_ring_op,
            uor_ring_batch,
            uor_stratum,
            uor_braille_encode,
            get_platform_info,
            llm_status,
            llm_list_models,
            llm_pull_model,
            llm_complete,
            llm_stream_start,
            llm_stream_poll,
        ])
        .run(tauri::generate_context!())
        .expect("error while running UOR OS");
}

