use crate::services::KeychainService;

#[tauri::command]
pub async fn get_access_token() -> Result<Option<String>, String> {
    KeychainService::get_access_token()
}
