using System.Collections.Generic;
using System.Text.Json.Serialization;

#nullable enable

public record Root(
    [property: JsonPropertyName("id")] long Id,
    [property: JsonPropertyName("value")] object? Value,
    [property: JsonPropertyName("meta")] Dictionary<string, object?> Meta,
    [property: JsonPropertyName("matrix")] List<List<long>> Matrix,
    [property: JsonPropertyName("points")] List<Point> Points
);

public record Point(
    [property: JsonPropertyName("x")] double X,
    [property: JsonPropertyName("y")] long Y
);
