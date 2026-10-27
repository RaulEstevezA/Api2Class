import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Root(
    val id: Long,
    val name: String,
    val active: Boolean,
    val address: Address,
    val orders: List<Order>,
)

@Serializable
data class Address(
    val city: String,
    @SerialName("postal_code")
    val postalCode: String,
)

@Serializable
data class Order(
    val id: Long,
    val total: Double,
)
