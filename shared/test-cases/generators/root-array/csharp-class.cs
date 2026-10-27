using System.Collections.Generic;
using System.Text.Json.Serialization;

#nullable enable

public class Root
{
    [JsonPropertyName("id")]
    public required long Id { get; set; }

    [JsonPropertyName("value")]
    public required object? Value { get; set; }

    [JsonPropertyName("meta")]
    public required Dictionary<string, object?> Meta { get; set; }

    [JsonPropertyName("matrix")]
    public required List<List<long>> Matrix { get; set; }

    [JsonPropertyName("points")]
    public required List<Point> Points { get; set; }
}

public class Point
{
    [JsonPropertyName("x")]
    public required double X { get; set; }

    [JsonPropertyName("y")]
    public required long Y { get; set; }
}
