import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Root(
    val id: String,
    @SerialName("created_at")
    val createdAt: String,
    val birthday: String,
    @SerialName("billing_address")
    val billingAddress: Address,
    @SerialName("shipping_address")
    val shippingAddress: Address,
    val payments: List<Payment>,
    val metadata: Metadata,
)

@Serializable
data class Address(
    val street: String,
    val city: String,
)

@Serializable
data class Payment(
    val amount: Double,
    @SerialName("paid_at")
    val paidAt: String?,
)

@Serializable
data class Metadata(
    val source: String,
)
