use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Root {
    pub id: i64,
    pub value: serde_json::Value,
    pub meta: serde_json::Map<String, serde_json::Value>,
    pub matrix: Vec<Vec<i64>>,
    pub points: Vec<Point>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Point {
    pub x: f64,
    pub y: i64,
}
