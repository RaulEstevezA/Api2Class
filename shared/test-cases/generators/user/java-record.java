import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record Root(
    Long id,
    String name,
    Boolean active,
    Address address,
    List<Order> orders
) {}

record Address(
    String city,
    @JsonProperty("postal_code") String postalCode
) {}

record Order(
    Long id,
    Double total
) {}
