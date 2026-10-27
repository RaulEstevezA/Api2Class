import java.util.List;

public class Root {
    private Long id;
    private Object value;
    private Meta meta;
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

    public Meta getMeta() {
        return meta;
    }

    public void setMeta(Meta meta) {
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

class Meta {
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
