package models

type Root struct {
	Users []User `json:"users"`
}

type User struct {
	UserID     int64     `json:"userId"`
	Email      *string   `json:"email,omitempty"`
	Phone      *string   `json:"phone"`
	PostalCode string    `json:"Postal Code"`
	Class      string    `json:"class"`
	Field2fa   bool      `json:"2fa"`
	Tags       []*string `json:"tags"`
	DeletedAt  any       `json:"deleted_at"`
	Manager    *Manager  `json:"manager,omitempty"`
}

type Manager struct {
	UserID int64 `json:"user_id"`
}
