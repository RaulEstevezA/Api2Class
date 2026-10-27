package models

type Root struct {
	ID     int64          `json:"id"`
	Value  any            `json:"value"`
	Meta   map[string]any `json:"meta"`
	Matrix [][]int64      `json:"matrix"`
	Points []Point        `json:"points"`
}

type Point struct {
	X float64 `json:"x"`
	Y int64   `json:"y"`
}
