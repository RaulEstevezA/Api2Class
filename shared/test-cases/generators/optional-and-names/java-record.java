import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record Root(
    List<User> users
) {}

record User(
    Long userId,
    String email,
    String phone,
    @JsonProperty("Postal Code") String postalCode,
    @JsonProperty("class") String class_,
    @JsonProperty("2fa") Boolean _2fa,
    List<String> tags,
    @JsonProperty("deleted_at") Object deletedAt,
    Manager manager
) {}

record Manager(
    @JsonProperty("user_id") Long userId
) {}
