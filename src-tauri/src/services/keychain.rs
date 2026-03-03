use keyring::Entry;
use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce, Key
};
use base64::{prelude::BASE64_STANDARD, Engine};
use serde::Deserialize;

pub const SERVICE_INTERNAL: &str = "ServeMe_Internal";
pub const ACCOUNT_MASTER_KEY: &str = "master_key";
pub const TOKEN_URL: &str = "http://127.0.0.1:35555/token";

#[derive(Deserialize, Debug)]
struct TokenResponse {
    ciphertext: Option<String>,
    nonce: Option<String>,
    error: Option<String>,
}

pub struct KeychainService;

impl KeychainService {
    pub async fn get_access_token() -> Result<Option<String>, String> {
        // 1. Retrieve the Master Key from the Keychain
        let master_key_raw = match Self::get_master_key() {
            Ok(key) => key,
            Err(e) => return Err(format!("KEYCHAIN_ERROR: {}", e)),
        };

        // Try to decode the master key. It should be 32 bytes (256 bits).
        let master_key_bytes = if let Ok(bytes) = BASE64_STANDARD.decode(&master_key_raw) {
            if bytes.len() == 32 { bytes } else { 
                return Err(format!("DECODE_ERROR: Invalid Base64 key length ({})", bytes.len()));
            }
        } else if let Ok(bytes) = hex::decode(&master_key_raw) {
             if bytes.len() == 32 { bytes } else { 
                return Err(format!("DECODE_ERROR: Invalid Hex key length ({})", bytes.len()));
            }
        } else if master_key_raw.len() == 32 {
            master_key_raw.as_bytes().to_vec()
        } else {
            return Err("DECODE_ERROR: Master Key must be 32 bytes (raw), 44 bytes (base64), or 64 chars (hex).".into());
        };

        // 2. Fetch the Encrypted Token from the local API
        let client = reqwest::Client::new();
        let resp = match client.get(TOKEN_URL).send().await {
            Ok(r) => r,
            Err(e) => {
                if e.is_connect() {
                    return Err("CONNECTION_REFUSED".into());
                }
                return Err(format!("FETCH_ERROR: {}", e));
            }
        };

        if resp.status().as_u16() == 404 {
            return Err("API_ERROR: Endpoint not found (404)".into());
        }

        let token_data: TokenResponse = resp.json().await
            .map_err(|e| format!("PARSE_ERROR: {}", e))?;

        if let Some(err_msg) = token_data.error {
            // Check for the specific "no active session" message
            if err_msg.to_lowercase().contains("no active session") || err_msg.to_lowercase().contains("login") {
                return Err("NO_SESSION".into());
            }
            return Err(format!("AGENT_ERROR: {}", err_msg));
        }

        let ciphertext_b64 = token_data.ciphertext
            .ok_or_else(|| "MISSING_DATA: ciphertext".to_string())?;
        let nonce_b64 = token_data.nonce
            .ok_or_else(|| "MISSING_DATA: nonce".to_string())?;

        // 3. Decrypt the Token
        Self::decrypt_token(&master_key_bytes, &ciphertext_b64, &nonce_b64)
    }

    fn get_master_key() -> Result<String, String> {
        let entry = Entry::new(SERVICE_INTERNAL, ACCOUNT_MASTER_KEY)
            .map_err(|e| format!("{}", e))?;

        entry.get_password().map_err(|e| format!("{}", e))
    }

    fn decrypt_token(key_bytes: &[u8], ciphertext_b64: &str, nonce_b64: &str) -> Result<Option<String>, String> {
        let key = Key::<Aes256Gcm>::from_slice(key_bytes);
        let cipher = Aes256Gcm::new(key);

        let ciphertext = BASE64_STANDARD.decode(ciphertext_b64)
            .map_err(|e| format!("DECODE_ERROR: Ciphertext Base64 ({})", e))?;
        let nonce_vec = BASE64_STANDARD.decode(nonce_b64)
            .map_err(|e| format!("DECODE_ERROR: Nonce Base64 ({})", e))?;
        
        if nonce_vec.len() != 12 {
            return Err(format!("DECRYPT_ERROR: Invalid nonce length ({})", nonce_vec.len()));
        }

        let nonce = Nonce::from_slice(&nonce_vec);

        let plaintext_bytes = cipher.decrypt(nonce, ciphertext.as_ref())
            .map_err(|e| format!("DECRYPT_ERROR: AES failure ({})", e))?;

        String::from_utf8(plaintext_bytes)
            .map(|s| Some(s))
            .map_err(|e| format!("DECODE_ERROR: UTF-8 failure ({})", e))
    }
}
