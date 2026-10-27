<?php

declare(strict_types=1);

final class Root
{
    /**
     * @param list<Order> $orders
     */
    public function __construct(
        public readonly int $id,
        public readonly string $name,
        public readonly bool $active,
        public readonly Address $address,
        public readonly array $orders,
    ) {
    }

    /** @param array<string, mixed> $data */
    public static function fromArray(array $data): self
    {
        return new self(
            id: $data['id'],
            name: $data['name'],
            active: $data['active'],
            address: Address::fromArray($data['address']),
            orders: array_map(static fn ($item) => Order::fromArray($item), $data['orders']),
        );
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'active' => $this->active,
            'address' => $this->address->toArray(),
            'orders' => array_map(static fn ($item) => $item->toArray(), $this->orders),
        ];
    }
}

final class Address
{
    public function __construct(
        public readonly string $city,
        public readonly string $postalCode,
    ) {
    }

    /** @param array<string, mixed> $data */
    public static function fromArray(array $data): self
    {
        return new self(
            city: $data['city'],
            postalCode: $data['postal_code'],
        );
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'city' => $this->city,
            'postal_code' => $this->postalCode,
        ];
    }
}

final class Order
{
    public function __construct(
        public readonly int $id,
        public readonly float $total,
    ) {
    }

    /** @param array<string, mixed> $data */
    public static function fromArray(array $data): self
    {
        return new self(
            id: $data['id'],
            total: (float) $data['total'],
        );
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'total' => $this->total,
        ];
    }
}
