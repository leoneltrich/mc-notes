use crate::api::auth::get_access_token;
use crate::api::config::get_server_url;

pub mod api;
pub mod models;
pub mod services;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_access_token,
            get_server_url
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application.");
}
