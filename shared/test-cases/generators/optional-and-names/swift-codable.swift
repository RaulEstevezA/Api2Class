import Foundation

struct Root: Codable {
    let users: [User]
}

struct User: Codable {
    let userId: Int
    let email: String?
    let phone: String?
    let postalCode: String
    let `class`: String
    let _2fa: Bool
    let tags: [String?]
    let deletedAt: JSONValue?
    let manager: Manager?

    enum CodingKeys: String, CodingKey {
        case userId
        case email
        case phone
        case postalCode = "Postal Code"
        case `class`
        case _2fa = "2fa"
        case tags
        case deletedAt = "deleted_at"
        case manager
    }
}

struct Manager: Codable {
    let userId: Int

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
    }
}

/// Any JSON value, for fields whose type is not fixed.
enum JSONValue: Codable {
    case string(String)
    case number(Double)
    case bool(Bool)
    case object([String: JSONValue])
    case array([JSONValue])
    case null

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() {
            self = .null
        } else if let value = try? container.decode(Bool.self) {
            self = .bool(value)
        } else if let value = try? container.decode(Double.self) {
            self = .number(value)
        } else if let value = try? container.decode(String.self) {
            self = .string(value)
        } else if let value = try? container.decode([JSONValue].self) {
            self = .array(value)
        } else {
            self = .object(try container.decode([String: JSONValue].self))
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .string(let value): try container.encode(value)
        case .number(let value): try container.encode(value)
        case .bool(let value): try container.encode(value)
        case .object(let value): try container.encode(value)
        case .array(let value): try container.encode(value)
        case .null: try container.encodeNil()
        }
    }
}
