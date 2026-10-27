import java.time.{LocalDate, OffsetDateTime}
import java.util.UUID
import io.circe.{Decoder, Encoder}

final case class Root(
  id: UUID,
  created_at: OffsetDateTime,
  birthday: LocalDate,
  billing_address: Address,
  shipping_address: Address,
  payments: List[Payment],
  metadata: Metadata
) derives Decoder, Encoder.AsObject

final case class Address(
  street: String,
  city: String
) derives Decoder, Encoder.AsObject

final case class Payment(
  amount: Double,
  paid_at: Option[OffsetDateTime]
) derives Decoder, Encoder.AsObject

final case class Metadata(
  source: String
) derives Decoder, Encoder.AsObject
