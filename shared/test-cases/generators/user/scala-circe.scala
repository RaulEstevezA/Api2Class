import io.circe.{Decoder, Encoder}

final case class Root(
  id: Long,
  name: String,
  active: Boolean,
  address: Address,
  orders: List[Order]
) derives Decoder, Encoder.AsObject

final case class Address(
  city: String,
  postal_code: String
) derives Decoder, Encoder.AsObject

final case class Order(
  id: Long,
  total: Double
) derives Decoder, Encoder.AsObject
