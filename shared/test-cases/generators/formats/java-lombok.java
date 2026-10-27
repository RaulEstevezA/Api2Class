import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import lombok.Data;

@Data
public class Root {
    private UUID id;
    @JsonProperty("created_at")
    private OffsetDateTime createdAt;
    private LocalDate birthday;
    @JsonProperty("billing_address")
    private Address billingAddress;
    @JsonProperty("shipping_address")
    private Address shippingAddress;
    private List<Payment> payments;
    private Metadata metadata;
}

@Data
class Address {
    private String street;
    private String city;
}

@Data
class Payment {
    private Double amount;
    @JsonProperty("paid_at")
    private OffsetDateTime paidAt;
}

@Data
class Metadata {
    private String source;
}
