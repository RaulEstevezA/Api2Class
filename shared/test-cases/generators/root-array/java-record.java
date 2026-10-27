import java.util.List;
import java.util.Map;

public record Root(
    Long id,
    Object value,
    Map<String, Object> meta,
    List<List<Long>> matrix,
    List<Point> points
) {}

record Point(
    Double x,
    Long y
) {}
