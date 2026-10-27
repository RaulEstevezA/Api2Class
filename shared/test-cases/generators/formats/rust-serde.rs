use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Root {
    pub id: String,
    pub created_at: String,
    pub birthday: String,
    pub billing_address: Address,
    pub shipping_address: Address,
    pub payments: Vec<Payment>,
    pub metadata: Metadata,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Address {
    pub street: String,
    pub city: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Payment {
    pub amount: f64,
    pub paid_at: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Metadata {
    pub source: String,
}
