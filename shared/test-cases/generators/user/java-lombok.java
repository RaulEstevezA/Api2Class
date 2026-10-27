import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import lombok.Data;

@Data
public class Root {
    private Long id;
    private String name;
    private Boolean active;
    private Address address;
    private List<Order> orders;
}

@Data
class Address {
    private String city;
    @JsonProperty("postal_code")
    private String postalCode;
}

@Data
class Order {
    private Long id;
    private Double total;
}
