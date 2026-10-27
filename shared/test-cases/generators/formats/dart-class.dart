class Root {
  final String id;
  final DateTime createdAt;
  final DateTime birthday;
  final Address billingAddress;
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

  factory Root.fromJson(Map<String, dynamic> json) => Root(
      id: json['id'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
      birthday: DateTime.parse(json['birthday'] as String),
      billingAddress: Address.fromJson(json['billing_address'] as Map<String, dynamic>),
      shippingAddress: Address.fromJson(json['shipping_address'] as Map<String, dynamic>),
      payments: (json['payments'] as List<dynamic>).map((e) => Payment.fromJson(e as Map<String, dynamic>)).toList(),
      metadata: Metadata.fromJson(json['metadata'] as Map<String, dynamic>),
    );

  Map<String, dynamic> toJson() => {
      'id': id,
      'created_at': createdAt.toIso8601String(),
      'birthday': birthday.toIso8601String().substring(0, 10),
      'billing_address': billingAddress.toJson(),
      'shipping_address': shippingAddress.toJson(),
      'payments': payments.map((e) => e.toJson()).toList(),
      'metadata': metadata.toJson(),
    };
}

class Address {
  final String street;
  final String city;

  const Address({
    required this.street,
    required this.city,
  });

  factory Address.fromJson(Map<String, dynamic> json) => Address(
      street: json['street'] as String,
      city: json['city'] as String,
    );

  Map<String, dynamic> toJson() => {
      'street': street,
      'city': city,
    };
}

class Payment {
  final double amount;
  final DateTime? paidAt;

  const Payment({
    required this.amount,
    required this.paidAt,
  });

  factory Payment.fromJson(Map<String, dynamic> json) => Payment(
      amount: (json['amount'] as num).toDouble(),
      paidAt: json['paid_at'] == null ? null : DateTime.parse(json['paid_at'] as String),
    );

  Map<String, dynamic> toJson() => {
      'amount': amount,
      'paid_at': paidAt?.toIso8601String(),
    };
}

class Metadata {
  final String source;

  const Metadata({
    required this.source,
  });

  factory Metadata.fromJson(Map<String, dynamic> json) => Metadata(
      source: json['source'] as String,
    );

  Map<String, dynamic> toJson() => {
      'source': source,
    };
}
