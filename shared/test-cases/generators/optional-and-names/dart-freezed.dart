import 'package:freezed_annotation/freezed_annotation.dart';

part 'root.freezed.dart';
part 'root.g.dart';

@freezed
abstract class Root with _$Root {
  const factory Root({
    required List<User> users,
  }) = _Root;

  factory Root.fromJson(Map<String, dynamic> json) => _$RootFromJson(json);
}

@freezed
abstract class User with _$User {
  const factory User({
    required int userId,
    String? email,
    required String? phone,
    @JsonKey(name: 'Postal Code') required String postalCode,
    @JsonKey(name: 'class') required String classValue,
    @JsonKey(name: '2fa') required bool field2fa,
    required List<String?> tags,
    @JsonKey(name: 'deleted_at') required Object? deletedAt,
    Manager? manager,
  }) = _User;

  factory User.fromJson(Map<String, dynamic> json) => _$UserFromJson(json);
}

@freezed
abstract class Manager with _$Manager {
  const factory Manager({
    @JsonKey(name: 'user_id') required int userId,
  }) = _Manager;

  factory Manager.fromJson(Map<String, dynamic> json) => _$ManagerFromJson(json);
}
