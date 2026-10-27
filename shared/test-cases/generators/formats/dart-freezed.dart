import 'package:freezed_annotation/freezed_annotation.dart';

part 'root.freezed.dart';
part 'root.g.dart';

@freezed
abstract class Root with _$Root {
  const factory Root({
    required String id,
    @JsonKey(name: 'created_at') required DateTime createdAt,
    required DateTime birthday,
    @JsonKey(name: 'billing_address') required Address billingAddress,
    @JsonKey(name: 'shipping_address') required Address shippingAddress,
    required List<Payment> payments,
    required Metadata metadata,
  }) = _Root;

  factory Root.fromJson(Map<String, dynamic> json) => _$RootFromJson(json);
}

@freezed
abstract class Address with _$Address {
  const factory Address({
    required String street,
    required String city,
  }) = _Address;

  factory Address.fromJson(Map<String, dynamic> json) => _$AddressFromJson(json);
}

@freezed
abstract class Payment with _$Payment {
  const factory Payment({
    required double amount,
    @JsonKey(name: 'paid_at') required DateTime? paidAt,
  }) = _Payment;

  factory Payment.fromJson(Map<String, dynamic> json) => _$PaymentFromJson(json);
}

@freezed
abstract class Metadata with _$Metadata {
  const factory Metadata({
    required String source,
  }) = _Metadata;

  factory Metadata.fromJson(Map<String, dynamic> json) => _$MetadataFromJson(json);
}
