use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Root {
    pub id: i64,
    pub name: String,
    pub active: bool,
    pub address: Address,
    pub orders: Vec<Order>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Address {
    pub city: String,
    pub postal_code: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Order {
    pub id: i64,
    pub total: f64,
}
