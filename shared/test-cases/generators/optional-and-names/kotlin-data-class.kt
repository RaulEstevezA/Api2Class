import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

@Serializable
data class Root(
    val users: List<User>,
)

@Serializable
data class User(
    val userId: Long,
    val email: String? = null,
    val phone: String?,
    @SerialName("Postal Code")
    val postalCode: String,
    @SerialName("class")
    val `class`: String,
    @SerialName("2fa")
    val _2fa: Boolean,
    val tags: List<String?>,
    @SerialName("deleted_at")
    val deletedAt: JsonElement?,
    val manager: Manager? = null,
)

@Serializable
data class Manager(
    @SerialName("user_id")
    val userId: Long,
)
