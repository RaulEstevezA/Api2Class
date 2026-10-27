class Root {
  final int id;
  final dynamic value;
  final Map<String, dynamic> meta;
  final List<List<int>> matrix;
  final List<Point> points;

  const Root({
    required this.id,
    required this.value,
    required this.meta,
    required this.matrix,
    required this.points,
  });

  factory Root.fromJson(Map<String, dynamic> json) => Root(
      id: json['id'] as int,
      value: json['value'],
      meta: json['meta'] as Map<String, dynamic>,
      matrix: (json['matrix'] as List<dynamic>).map((e) => (e as List<dynamic>).map((e2) => e2 as int).toList()).toList(),
      points: (json['points'] as List<dynamic>).map((e) => Point.fromJson(e as Map<String, dynamic>)).toList(),
    );

  Map<String, dynamic> toJson() => {
      'id': id,
      'value': value,
      'meta': meta,
      'matrix': matrix,
      'points': points.map((e) => e.toJson()).toList(),
    };
}

class Point {
  final double x;
  final int y;

  const Point({
    required this.x,
    required this.y,
  });

  factory Point.fromJson(Map<String, dynamic> json) => Point(
      x: (json['x'] as num).toDouble(),
      y: json['y'] as int,
    );

  Map<String, dynamic> toJson() => {
      'x': x,
      'y': y,
    };
}
