using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

#nullable enable

public class Root
{
    [JsonPropertyName("id")]
    public required Guid Id { get; set; }

    [JsonPropertyName("created_at")]
    public required DateTimeOffset CreatedAt { get; set; }

    [JsonPropertyName("birthday")]
    public required DateOnly Birthday { get; set; }

    [JsonPropertyName("billing_address")]
    public required Address BillingAddress { get; set; }

    [JsonPropertyName("shipping_address")]
    public required Address ShippingAddress { get; set; }

    [JsonPropertyName("payments")]
    public required List<Payment> Payments { get; set; }

    [JsonPropertyName("metadata")]
    public required Metadata Metadata { get; set; }
}

public class Address
{
    [JsonPropertyName("street")]
    public required string Street { get; set; }

    [JsonPropertyName("city")]
    public required string City { get; set; }
}

public class Payment
{
    [JsonPropertyName("amount")]
    public required double Amount { get; set; }

    [JsonPropertyName("paid_at")]
    public required DateTimeOffset? PaidAt { get; set; }
}

public class Metadata
{
    [JsonPropertyName("source")]
    public required string Source { get; set; }
}
