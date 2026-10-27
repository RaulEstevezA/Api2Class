import 'package:json_annotation/json_annotation.dart';

part 'root.g.dart';

@JsonSerializable(explicitToJson: true)
class Root {
  final int id;
  final String name;
  final bool active;
  final Address address;
  final List<Order> orders;

  const Root({
    required this.id,
    required this.name,
    required this.active,
    required this.address,
    required this.orders,
  });

  factory Root.fromJson(Map<String, dynamic> json) => _$RootFromJson(json);

  Map<String, dynamic> toJson() => _$RootToJson(this);
}

@JsonSerializable(explicitToJson: true)
class Address {
  final String city;
  @JsonKey(name: 'postal_code')
  final String postalCode;

  const Address({
    required this.city,
    required this.postalCode,
  });

  factory Address.fromJson(Map<String, dynamic> json) => _$AddressFromJson(json);

  Map<String, dynamic> toJson() => _$AddressToJson(this);
}

@JsonSerializable(explicitToJson: true)
class Order {
  final int id;
  final double total;

  const Order({
    required this.id,
    required this.total,
  });

  factory Order.fromJson(Map<String, dynamic> json) => _$OrderFromJson(json);

  Map<String, dynamic> toJson() => _$OrderToJson(this);
}
