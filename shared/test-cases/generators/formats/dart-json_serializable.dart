import 'package:json_annotation/json_annotation.dart';

part 'root.g.dart';

@JsonSerializable(explicitToJson: true)
class Root {
  final String id;
  @JsonKey(name: 'created_at')
  final DateTime createdAt;
  final DateTime birthday;
  @JsonKey(name: 'billing_address')
  final Address billingAddress;
  @JsonKey(name: 'shipping_address')
  final Address shippingAddress;
  final List<Payment> payments;
  final Metadata metadata;

  const Root({
    required this.id,
    required this.createdAt,
    required this.birthday,
    required this.billingAddress,
    required this.shippingAddress,
    required this.payments,
    required this.metadata,
  });

  factory Root.fromJson(Map<String, dynamic> json) => _$RootFromJson(json);

  Map<String, dynamic> toJson() => _$RootToJson(this);
}

@JsonSerializable(explicitToJson: true)
class Address {
  final String street;
  final String city;

  const Address({
    required this.street,
    required this.city,
  });

  factory Address.fromJson(Map<String, dynamic> json) => _$AddressFromJson(json);

  Map<String, dynamic> toJson() => _$AddressToJson(this);
}

@JsonSerializable(explicitToJson: true)
class Payment {
  final double amount;
  @JsonKey(name: 'paid_at')
  final DateTime? paidAt;

  const Payment({
    required this.amount,
    required this.paidAt,
  });

  factory Payment.fromJson(Map<String, dynamic> json) => _$PaymentFromJson(json);

  Map<String, dynamic> toJson() => _$PaymentToJson(this);
}

@JsonSerializable(explicitToJson: true)
class Metadata {
  final String source;

  const Metadata({
    required this.source,
  });

  factory Metadata.fromJson(Map<String, dynamic> json) => _$MetadataFromJson(json);

  Map<String, dynamic> toJson() => _$MetadataToJson(this);
}
