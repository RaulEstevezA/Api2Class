import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public class Root {
    private List<User> users;

    public List<User> getUsers() {
        return users;
    }

    public void setUsers(List<User> users) {
        this.users = users;
    }
}

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

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getPostalCode() {
        return postalCode;
    }

    public void setPostalCode(String postalCode) {
        this.postalCode = postalCode;
    }

    public String getClass_() {
        return class_;
    }

    public void setClass_(String class_) {
        this.class_ = class_;
    }

    public Boolean get_2fa() {
        return _2fa;
    }

    public void set_2fa(Boolean _2fa) {
        this._2fa = _2fa;
    }

    public List<String> getTags() {
        return tags;
    }

    public void setTags(List<String> tags) {
        this.tags = tags;
    }

    public Object getDeletedAt() {
        return deletedAt;
    }

    public void setDeletedAt(Object deletedAt) {
        this.deletedAt = deletedAt;
    }

    public Manager getManager() {
        return manager;
    }

    public void setManager(Manager manager) {
        this.manager = manager;
    }
}

class Manager {
    @JsonProperty("user_id")
    private Long userId;

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }
}
