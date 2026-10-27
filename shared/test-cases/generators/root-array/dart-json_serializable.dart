import 'package:json_annotation/json_annotation.dart';

part 'root.g.dart';

@JsonSerializable(explicitToJson: true)
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

  factory Root.fromJson(Map<String, dynamic> json) => _$RootFromJson(json);

  Map<String, dynamic> toJson() => _$RootToJson(this);
}

@JsonSerializable(explicitToJson: true)
class Point {
  final double x;
  final int y;

  const Point({
    required this.x,
    required this.y,
  });

  factory Point.fromJson(Map<String, dynamic> json) => _$PointFromJson(json);

  Map<String, dynamic> toJson() => _$PointToJson(this);
}
