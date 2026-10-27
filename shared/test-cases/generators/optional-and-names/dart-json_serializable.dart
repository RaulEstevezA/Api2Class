import 'package:json_annotation/json_annotation.dart';

part 'root.g.dart';

@JsonSerializable(explicitToJson: true)
class Root {
  final List<User> users;

  const Root({
    required this.users,
  });

  factory Root.fromJson(Map<String, dynamic> json) => _$RootFromJson(json);

  Map<String, dynamic> toJson() => _$RootToJson(this);
}

@JsonSerializable(explicitToJson: true)
class User {
  final int userId;
  final String? email;
  final String? phone;
  @JsonKey(name: 'Postal Code')
  final String postalCode;
  @JsonKey(name: 'class')
  final String classValue;
  @JsonKey(name: '2fa')
  final bool field2fa;
  final List<String?> tags;
  @JsonKey(name: 'deleted_at')
  final Object? deletedAt;
  final Manager? manager;

  const User({
    required this.userId,
    this.email,
    required this.phone,
    required this.postalCode,
    required this.classValue,
    required this.field2fa,
    required this.tags,
    required this.deletedAt,
    this.manager,
  });

  factory User.fromJson(Map<String, dynamic> json) => _$UserFromJson(json);

  Map<String, dynamic> toJson() => _$UserToJson(this);
}

@JsonSerializable(explicitToJson: true)
class Manager {
  @JsonKey(name: 'user_id')
  final int userId;

  const Manager({
    required this.userId,
  });

  factory Manager.fromJson(Map<String, dynamic> json) => _$ManagerFromJson(json);

  Map<String, dynamic> toJson() => _$ManagerToJson(this);
}
