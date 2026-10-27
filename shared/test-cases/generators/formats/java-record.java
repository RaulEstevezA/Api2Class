import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record Root(
    UUID id,
    @JsonProperty("created_at") OffsetDateTime createdAt,
    LocalDate birthday,
    @JsonProperty("billing_address") Address billingAddress,
    @JsonProperty("shipping_address") Address shippingAddress,
    List<Payment> payments,
    Metadata metadata
) {}

record Address(
    String street,
    String city
) {}

record Payment(
    Double amount,
    @JsonProperty("paid_at") OffsetDateTime paidAt
) {}

record Metadata(
    String source
) {}
