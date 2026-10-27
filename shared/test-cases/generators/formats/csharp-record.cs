using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

#nullable enable

public record Root(
    [property: JsonPropertyName("id")] Guid Id,
    [property: JsonPropertyName("created_at")] DateTimeOffset CreatedAt,
    [property: JsonPropertyName("birthday")] DateOnly Birthday,
    [property: JsonPropertyName("billing_address")] Address BillingAddress,
    [property: JsonPropertyName("shipping_address")] Address ShippingAddress,
    [property: JsonPropertyName("payments")] List<Payment> Payments,
    [property: JsonPropertyName("metadata")] Metadata Metadata
);

public record Address(
    [property: JsonPropertyName("street")] string Street,
    [property: JsonPropertyName("city")] string City
);

public record Payment(
    [property: JsonPropertyName("amount")] double Amount,
    [property: JsonPropertyName("paid_at")] DateTimeOffset? PaidAt
);

public record Metadata(
    [property: JsonPropertyName("source")] string Source
);
