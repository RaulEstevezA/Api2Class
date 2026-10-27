class Root {
  final List<User> users;

  const Root({
    required this.users,
  });

  factory Root.fromJson(Map<String, dynamic> json) => Root(
      users: (json['users'] as List<dynamic>).map((e) => User.fromJson(e as Map<String, dynamic>)).toList(),
    );

  Map<String, dynamic> toJson() => {
      'users': users.map((e) => e.toJson()).toList(),
    };
}

class User {
  final int userId;
  final String? email;
  final String? phone;
  final String postalCode;
  final String classValue;
  final bool field2fa;
  final List<String?> tags;
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

  factory User.fromJson(Map<String, dynamic> json) => User(
      userId: json['userId'] as int,
      email: json['email'] == null ? null : json['email'] as String,
      phone: json['phone'] == null ? null : json['phone'] as String,
      postalCode: json['Postal Code'] as String,
      classValue: json['class'] as String,
      field2fa: json['2fa'] as bool,
      tags: (json['tags'] as List<dynamic>).map((e) => e == null ? null : e as String).toList(),
      deletedAt: json['deleted_at'],
      manager: json['manager'] == null ? null : Manager.fromJson(json['manager'] as Map<String, dynamic>),
    );

  Map<String, dynamic> toJson() => {
      'userId': userId,
      if (email != null) 'email': email!,
      'phone': phone,
      'Postal Code': postalCode,
      'class': classValue,
      '2fa': field2fa,
      'tags': tags,
      'deleted_at': deletedAt,
      if (manager != null) 'manager': manager!.toJson(),
    };
}

class Manager {
  final int userId;

  const Manager({
    required this.userId,
  });

  factory Manager.fromJson(Map<String, dynamic> json) => Manager(
      userId: json['user_id'] as int,
    );

  Map<String, dynamic> toJson() => {
      'user_id': userId,
    };
}
