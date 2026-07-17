// AiFER OS — Desktop Shell (Tauri 2.x)
// Full tray menu + native OS integration

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{TrayIconBuilder, MouseButton, MouseButtonState, TrayIconEvent},
    Manager,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
struct SystemInfo {
    os: String,
    arch: String,
    version: String,
    hostname: String,
    family: String,
}

#[tauri::command]
fn get_system_info() -> SystemInfo {
    SystemInfo {
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        hostname: hostname::get().ok().and_then(|s| s.into_string().ok()).unwrap_or_else(|| "unknown".to_string()),
        family: std::env::consts::FAMILY.to_string(),
    }
}

#[tauri::command]
async fn check_ollama() -> Result<serde_json::Value, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(2))
        .build()
        .map_err(|e| e.to_string())?;

    match client.get("http://localhost:11434/api/tags").send().await {
        Ok(resp) if resp.status().is_success() => {
            let body: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
            Ok(serde_json::json!({
                "available": true,
                "models": body.get("models"),
            }))
        }
        _ => Ok(serde_json::json!({ "available": false })),
    }
}

#[tauri::command]
async fn start_ollama() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    std::process::Command::new("ollama").arg("serve").spawn().map_err(|e| e.to_string())?;

    #[cfg(not(target_os = "windows"))]
    std::process::Command::new("sh")
        .arg("-c")
        .arg("ollama serve > /tmp/ollama.log 2>&1 &")
        .spawn()
        .map_err(|e| e.to_string())?;

    Ok("Ollama starting...".to_string())
}

#[tauri::command]
fn get_aifer_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
fn open_url(url: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    std::process::Command::new("cmd").args(["/C", "start", &url]).spawn().map_err(|e| e.to_string())?;

    #[cfg(target_os = "macos")]
    std::process::Command::new("open").arg(&url).spawn().map_err(|e| e.to_string())?;

    #[cfg(target_os = "linux")]
    std::process::Command::new("xdg-open").arg(&url).spawn().map_err(|e| e.to_string())?;

    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            let handle = app.handle();

            // Build tray menu with all app shortcuts
            let dashboard = MenuItem::with_id(handle, "dashboard", "Open Dashboard", true, None::<&str>)?;
            let chat = MenuItem::with_id(handle, "chat", "Chat", true, None::<&str>)?;
            let mesh = MenuItem::with_id(handle, "mesh", "Mesh Network", true, None::<&str>)?;
            let wallet = MenuItem::with_id(handle, "wallet", "Wallet", true, None::<&str>)?;
            let marketplace = MenuItem::with_id(handle, "marketplace", "Marketplace", true, None::<&str>)?;
            let files = MenuItem::with_id(handle, "files", "Files", true, None::<&str>)?;
            let notes = MenuItem::with_id(handle, "notes", "Notes", true, None::<&str>)?;
            let terminal = MenuItem::with_id(handle, "terminal", "Terminal", true, None::<&str>)?;

            let sep1 = PredefinedMenuItem::separator(handle)?;
            let sep2 = PredefinedMenuItem::separator(handle)?;

            let about = MenuItem::with_id(handle, "about", "About AiFER", true, None::<&str>)?;
            let updates = MenuItem::with_id(handle, "updates", "Check for Updates", true, None::<&str>)?;
            let quit = MenuItem::with_id(handle, "quit", "Quit", true, Some("CmdOrCtrl+Q"))?;

            let menu = Menu::with_items(handle, &[
                &dashboard, &sep1,
                &chat, &mesh, &wallet, &marketplace,
                &files, &notes, &terminal, &sep2,
                &about, &updates, &quit,
            ])?;

            let _tray = TrayIconBuilder::new()
                .tooltip("AiFER OS — The Bouncing Ferret")
                .menu(&menu)
                .on_menu_event(|app, event| {
                    let window = app.get_webview_window("main");
                    let navigate = |path: &str| {
                        if let Some(w) = window.clone() {
                            let _ = w.show();
                            let _ = w.set_focus();
                            let _ = w.eval(&format!("window.location.hash = '#/{}'", path));
                        }
                    };

                    match event.id.as_ref() {
                        "dashboard" => navigate("Dashboard"),
                        "chat" => navigate("Chat"),
                        "mesh" => navigate("MeshNetwork"),
                        "wallet" => navigate("Wallet"),
                        "marketplace" => navigate("AifMarketplace"),
                        "files" => navigate("FerretFiles"),
                        "notes" => navigate("FerretNotes"),
                        "terminal" => navigate("FerretTerminal"),
                        "about" => {
                            if let Some(w) = window {
                                let _ = w.eval("alert('AiFER OS v8 — The Bouncing Ferret\\\\nBuilt by SEM\\\\nhttps://aifer.org')");
                            }
                        }
                        "updates" => {
                            if let Some(w) = window {
                                let _ = w.eval("window.open('https://aifer.org/download', '_blank')");
                            }
                        }
                        "quit" => app.exit(0),
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                            let _ = window.unminimize();
                        }
                    }
                })
                .build(app)?;

            println!("AiFER OS v8 \"Neon Ferret\" — Desktop shell ready");
            println!("    Platform: {} ({})", std::env::consts::OS, std::env::consts::ARCH);
            println!("    Tray menu: 8 quick links active");

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_system_info,
            check_ollama,
            start_ollama,
            get_aifer_version,
            open_url,
        ])
        .run(tauri::generate_context!())
        .expect("error while running AiFER OS");
}

mod hostname_impl {
    pub fn get_hostname() -> String {
        #[cfg(target_os = "windows")]
        {
            std::env::var("COMPUTERNAME").unwrap_or_else(|_| "ferret".to_string())
        }
        #[cfg(unix)]
        {
            std::env::var("HOSTNAME")
                .or_else(|_| std::env::var("HOST"))
                .unwrap_or_else(|_| "ferret".to_string())
        }
    }
}
