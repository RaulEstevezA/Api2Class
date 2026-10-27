import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import lombok.Data;

@Data
public class Root {
    private List<User> users;
}

@Data
class User {
    private Long userId;
    private String email;
    private String phone;
    @JsonProperty("Postal Code")
    private String postalCode;
    @JsonProperty("class")
    private String class_;
    @JsonProperty("2fa")
    private Boolean _2fa;
    private List<String> tags;
    @JsonProperty("deleted_at")
    private Object deletedAt;
    private Manager manager;
}

@Data
class Manager {
    @JsonProperty("user_id")
    private Long userId;
}
