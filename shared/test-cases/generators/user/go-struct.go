package models

type Root struct {
	ID      int64   `json:"id"`
	Name    string  `json:"name"`
	Active  bool    `json:"active"`
	Address Address `json:"address"`
	Orders  []Order `json:"orders"`
}

type Address struct {
	City       string `json:"city"`
	PostalCode string `json:"postal_code"`
}

type Order struct {
	ID    int64   `json:"id"`
	Total float64 `json:"total"`
}
