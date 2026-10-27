using System.Collections.Generic;
using System.Text.Json.Serialization;

#nullable enable

public class Root
{
    [JsonPropertyName("users")]
    public required List<User> Users { get; set; }
}

public class User
{
    [JsonPropertyName("userId")]
    public required long UserId { get; set; }

    [JsonPropertyName("email")]
    public string? Email { get; set; }

    [JsonPropertyName("phone")]
    public required string? Phone { get; set; }

    [JsonPropertyName("Postal Code")]
    public required string PostalCode { get; set; }

    [JsonPropertyName("class")]
    public required string Class { get; set; }

    [JsonPropertyName("2fa")]
    public required bool _2fa { get; set; }

    [JsonPropertyName("tags")]
    public required List<string?> Tags { get; set; }

    [JsonPropertyName("deleted_at")]
    public required object? DeletedAt { get; set; }

    [JsonPropertyName("manager")]
    public Manager? Manager { get; set; }
}

public class Manager
{
    [JsonPropertyName("user_id")]
    public required long UserId { get; set; }
}
