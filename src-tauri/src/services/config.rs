use serde::Deserialize;

pub const CONFIG_URL: &str = "http://127.0.0.1:35555/config";

#[derive(Deserialize, Debug)]
struct ConfigResponse {
    server_url: Option<String>,
    error: Option<String>,
}

pub struct ConfigService;

impl ConfigService {
    pub async fn get_server_url() -> Result<String, String> {
        let client = reqwest::Client::new();
        let resp = match client.get(CONFIG_URL).send().await {
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

        let config_data: ConfigResponse = resp.json().await
            .map_err(|e| format!("PARSE_ERROR: {}", e))?;

        if let Some(err_msg) = config_data.error {
            return Err(format!("AGENT_ERROR: {}", err_msg));
        }

        config_data.server_url
            .ok_or_else(|| "MISSING_DATA: server_url".to_string())
    }
}
