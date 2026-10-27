import Foundation

struct Root: Codable {
    let id: Int
    let name: String
    let active: Bool
    let address: Address
    let orders: [Order]
}

struct Address: Codable {
    let city: String
    let postalCode: String

    enum CodingKeys: String, CodingKey {
        case city
        case postalCode = "postal_code"
    }
}

struct Order: Codable {
    let id: Int
    let total: Double
}
