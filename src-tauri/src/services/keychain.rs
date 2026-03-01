use keyring::Entry;

pub const SERVICE_ACCESS: &str = "ServeMe_Access";
pub const ACCOUNT_NAME: &str = "current_session";

pub struct KeychainService;

impl KeychainService {
    pub fn get_access_token() -> Result<Option<String>, String> {
        let entry = Entry::new(SERVICE_ACCESS, ACCOUNT_NAME)
            .map_err(|e| format!("Failed to initialize keychain entry: {}", e))?;

        match entry.get_password() {
            Ok(password) => Ok(Some(password)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(e) => Err(format!("Failed to retrieve password from keychain: {}", e)),
        }
    }
}
