import io.circe.{Decoder, Encoder, Json}

final case class Root(
  users: List[User]
) derives Decoder, Encoder.AsObject

final case class User(
  userId: Long,
  email: Option[String] = None,
  phone: Option[String],
  `Postal Code`: String,
  `class`: String,
  `2fa`: Boolean,
  tags: List[Option[String]],
  deleted_at: Json,
  manager: Option[Manager] = None
) derives Decoder, Encoder.AsObject

final case class Manager(
  user_id: Long
) derives Decoder, Encoder.AsObject
