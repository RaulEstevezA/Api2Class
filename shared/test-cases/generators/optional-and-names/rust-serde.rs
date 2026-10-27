use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Root {
    pub users: Vec<User>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct User {
    #[serde(rename = "userId")]
    pub user_id: i64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub email: Option<String>,
    pub phone: Option<String>,
    #[serde(rename = "Postal Code")]
    pub postal_code: String,
    pub class: String,
    #[serde(rename = "2fa")]
    pub _2fa: bool,
    pub tags: Vec<Option<String>>,
    pub deleted_at: serde_json::Value,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub manager: Option<Manager>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Manager {
    pub user_id: i64,
}
