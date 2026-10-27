using System.Collections.Generic;
using System.Text.Json.Serialization;

#nullable enable

public record Root(
    [property: JsonPropertyName("users")] List<User> Users
);

public record User(
    [property: JsonPropertyName("userId")] long UserId,
    [property: JsonPropertyName("phone")] string? Phone,
    [property: JsonPropertyName("Postal Code")] string PostalCode,
    [property: JsonPropertyName("class")] string Class,
    [property: JsonPropertyName("2fa")] bool _2fa,
    [property: JsonPropertyName("tags")] List<string?> Tags,
    [property: JsonPropertyName("deleted_at")] object? DeletedAt,
    [property: JsonPropertyName("email")] string? Email = null,
    [property: JsonPropertyName("manager")] Manager? Manager = null
);

public record Manager(
    [property: JsonPropertyName("user_id")] long UserId
);
