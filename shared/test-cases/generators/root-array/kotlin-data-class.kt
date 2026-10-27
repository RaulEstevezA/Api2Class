import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject

@Serializable
data class Root(
    val id: Long,
    val value: JsonElement?,
    val meta: JsonObject,
    val matrix: List<List<Long>>,
    val points: List<Point>,
)

@Serializable
data class Point(
    val x: Double,
    val y: Long,
)
