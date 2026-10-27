import io.circe.{Decoder, Encoder, Json, JsonObject}

final case class Root(
  id: Long,
  value: Json,
  meta: JsonObject,
  matrix: List[List[Long]],
  points: List[Point]
) derives Decoder, Encoder.AsObject

final case class Point(
  x: Double,
  y: Long
) derives Decoder, Encoder.AsObject
