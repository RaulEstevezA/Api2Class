$version: "2"

namespace example.api

structure Root {
    @required
    id: String

    @required
    @jsonName("created_at")
    @timestampFormat("date-time")
    createdAt: Timestamp

    @required
    birthday: String

    @required
    @jsonName("billing_address")
    billingAddress: Address

    @required
    @jsonName("shipping_address")
    shippingAddress: Address

    @required
    payments: PaymentList

    @required
    metadata: Metadata
}

structure Address {
    @required
    street: String

    @required
    city: String
}

structure Payment {
    @required
    amount: Double

    @jsonName("paid_at")
    @timestampFormat("date-time")
    paidAt: Timestamp
}

structure Metadata {
    @required
    source: String
}

list PaymentList {
    member: Payment
}
