using System.Collections.Generic;
using System.Text.Json.Serialization;

#nullable enable

public class Root
{
    [JsonPropertyName("id")]
    public required long Id { get; set; }

    [JsonPropertyName("name")]
    public required string Name { get; set; }

    [JsonPropertyName("active")]
    public required bool Active { get; set; }

    [JsonPropertyName("address")]
    public required Address Address { get; set; }

    [JsonPropertyName("orders")]
    public required List<Order> Orders { get; set; }
}

public class Address
{
    [JsonPropertyName("city")]
    public required string City { get; set; }

    [JsonPropertyName("postal_code")]
    public required string PostalCode { get; set; }
}

public class Order
{
    [JsonPropertyName("id")]
    public required long Id { get; set; }

    [JsonPropertyName("total")]
    public required double Total { get; set; }
}
