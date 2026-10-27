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

  factory Root.fromJson(Map<String, dynamic> json) => Root(
      id: json['id'] as int,
      name: json['name'] as String,
      active: json['active'] as bool,
      address: Address.fromJson(json['address'] as Map<String, dynamic>),
      orders: (json['orders'] as List<dynamic>).map((e) => Order.fromJson(e as Map<String, dynamic>)).toList(),
    );

  Map<String, dynamic> toJson() => {
      'id': id,
      'name': name,
      'active': active,
      'address': address.toJson(),
      'orders': orders.map((e) => e.toJson()).toList(),
    };
}

class Address {
  final String city;
  final String postalCode;

  const Address({
    required this.city,
    required this.postalCode,
  });

  factory Address.fromJson(Map<String, dynamic> json) => Address(
      city: json['city'] as String,
      postalCode: json['postal_code'] as String,
    );

  Map<String, dynamic> toJson() => {
      'city': city,
      'postal_code': postalCode,
    };
}

class Order {
  final int id;
  final double total;

  const Order({
    required this.id,
    required this.total,
  });

  factory Order.fromJson(Map<String, dynamic> json) => Order(
      id: json['id'] as int,
      total: (json['total'] as num).toDouble(),
    );

  Map<String, dynamic> toJson() => {
      'id': id,
      'total': total,
    };
}
