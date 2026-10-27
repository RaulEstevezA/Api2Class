using System.Collections.Generic;
using System.Text.Json.Serialization;

#nullable enable

public record Root(
    [property: JsonPropertyName("id")] long Id,
    [property: JsonPropertyName("name")] string Name,
    [property: JsonPropertyName("active")] bool Active,
    [property: JsonPropertyName("address")] Address Address,
    [property: JsonPropertyName("orders")] List<Order> Orders
);

public record Address(
    [property: JsonPropertyName("city")] string City,
    [property: JsonPropertyName("postal_code")] string PostalCode
);

public record Order(
    [property: JsonPropertyName("id")] long Id,
    [property: JsonPropertyName("total")] double Total
);
