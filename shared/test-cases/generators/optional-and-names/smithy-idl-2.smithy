$version: "2"

namespace example.api

structure Root {
    @required
    users: UserList
}

structure User {
    @required
    userId: Long

    email: String

    phone: String

    @required
    @jsonName("Postal Code")
    postalCode: String

    @required
    class: String

    @required
    @jsonName("2fa")
    field2fa: Boolean

    @required
    tags: StringSparseList

    @jsonName("deleted_at")
    deletedAt: Document

    manager: Manager
}

structure Manager {
    @required
    @jsonName("user_id")
    userId: Long
}

list UserList {
    member: User
}

@sparse
list StringSparseList {
    member: String
}
