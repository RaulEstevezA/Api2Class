import java.util.List;
import java.util.Map;
import lombok.Data;

@Data
public class Root {
    private Long id;
    private Object value;
    private Map<String, Object> meta;
    private List<List<Long>> matrix;
    private List<Point> points;
}

@Data
class Point {
    private Double x;
    private Long y;
}
