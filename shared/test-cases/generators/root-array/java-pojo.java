import java.util.List;
import java.util.Map;

public class Root {
    private Long id;
    private Object value;
    private Map<String, Object> meta;
    private List<List<Long>> matrix;
    private List<Point> points;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Object getValue() {
        return value;
    }

    public void setValue(Object value) {
        this.value = value;
    }

    public Map<String, Object> getMeta() {
        return meta;
    }

    public void setMeta(Map<String, Object> meta) {
        this.meta = meta;
    }

    public List<List<Long>> getMatrix() {
        return matrix;
    }

    public void setMatrix(List<List<Long>> matrix) {
        this.matrix = matrix;
    }

    public List<Point> getPoints() {
        return points;
    }

    public void setPoints(List<Point> points) {
        this.points = points;
    }
}

class Point {
    private Double x;
    private Long y;

    public Double getX() {
        return x;
    }

    public void setX(Double x) {
        this.x = x;
    }

    public Long getY() {
        return y;
    }

    public void setY(Long y) {
        this.y = y;
    }
}
