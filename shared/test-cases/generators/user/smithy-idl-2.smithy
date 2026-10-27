$version: "2"

namespace example.api

structure Root {
    @required
    id: Long

    @required
    name: String

    @required
    active: Boolean

    @required
    address: Address

    @required
    orders: OrderList
}

structure Address {
    @required
    city: String

    @required
    @jsonName("postal_code")
    postalCode: String
}

structure Order {
    @required
    id: Long

    @required
    total: Double
}

list OrderList {
    member: Order
}
