import 'package:freezed_annotation/freezed_annotation.dart';

part 'root.freezed.dart';
part 'root.g.dart';

@freezed
abstract class Root with _$Root {
  const factory Root({
    required int id,
    required dynamic value,
    required Map<String, dynamic> meta,
    required List<List<int>> matrix,
    required List<Point> points,
  }) = _Root;

  factory Root.fromJson(Map<String, dynamic> json) => _$RootFromJson(json);
}

@freezed
abstract class Point with _$Point {
  const factory Point({
    required double x,
    required int y,
  }) = _Point;

  factory Point.fromJson(Map<String, dynamic> json) => _$PointFromJson(json);
}
