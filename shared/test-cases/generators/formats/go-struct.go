package models

import "time"

type Root struct {
	ID              string    `json:"id"`
	CreatedAt       time.Time `json:"created_at"`
	Birthday        string    `json:"birthday"`
	BillingAddress  Address   `json:"billing_address"`
	ShippingAddress Address   `json:"shipping_address"`
	Payments        []Payment `json:"payments"`
	Metadata        Metadata  `json:"metadata"`
}

type Address struct {
	Street string `json:"street"`
	City   string `json:"city"`
}

type Payment struct {
	Amount float64    `json:"amount"`
	PaidAt *time.Time `json:"paid_at"`
}

type Metadata struct {
	Source string `json:"source"`
}
