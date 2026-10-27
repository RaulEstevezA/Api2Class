import 'package:freezed_annotation/freezed_annotation.dart';

part 'root.freezed.dart';
part 'root.g.dart';

@freezed
abstract class Root with _$Root {
  const factory Root({
    required int id,
    required String name,
    required bool active,
    required Address address,
    required List<Order> orders,
  }) = _Root;

  factory Root.fromJson(Map<String, dynamic> json) => _$RootFromJson(json);
}

@freezed
abstract class Address with _$Address {
  const factory Address({
    required String city,
    @JsonKey(name: 'postal_code') required String postalCode,
  }) = _Address;

  factory Address.fromJson(Map<String, dynamic> json) => _$AddressFromJson(json);
}

@freezed
abstract class Order with _$Order {
  const factory Order({
    required int id,
    required double total,
  }) = _Order;

  factory Order.fromJson(Map<String, dynamic> json) => _$OrderFromJson(json);
}
