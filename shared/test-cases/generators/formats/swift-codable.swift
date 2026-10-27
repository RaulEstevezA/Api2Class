import Foundation

struct Root: Codable {
    let id: UUID
    let createdAt: Date
    let birthday: String
    let billingAddress: Address
    let shippingAddress: Address
    let payments: [Payment]
    let metadata: Metadata

    enum CodingKeys: String, CodingKey {
        case id
        case createdAt = "created_at"
        case birthday
        case billingAddress = "billing_address"
        case shippingAddress = "shipping_address"
        case payments
        case metadata
    }
}

struct Address: Codable {
    let street: String
    let city: String
}

struct Payment: Codable {
    let amount: Double
    let paidAt: Date?

    enum CodingKeys: String, CodingKey {
        case amount
        case paidAt = "paid_at"
    }
}

struct Metadata: Codable {
    let source: String
}
