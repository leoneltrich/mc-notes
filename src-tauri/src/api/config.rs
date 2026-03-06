use crate::services::ConfigService;

#[tauri::command]
pub async fn get_server_url() -> Result<String, String> {
    ConfigService::get_server_url().await
}
