<?php

declare(strict_types=1);

final class Root
{
    /**
     * @param list<Payment> $payments
     */
    public function __construct(
        public readonly string $id,
        public readonly \DateTimeImmutable $createdAt,
        public readonly \DateTimeImmutable $birthday,
        public readonly Address $billingAddress,
        public readonly Address $shippingAddress,
        public readonly array $payments,
        public readonly Metadata $metadata,
    ) {
    }

    /** @param array<string, mixed> $data */
    public static function fromArray(array $data): self
    {
        return new self(
            id: $data['id'],
            createdAt: new \DateTimeImmutable($data['created_at']),
            birthday: new \DateTimeImmutable($data['birthday']),
            billingAddress: Address::fromArray($data['billing_address']),
            shippingAddress: Address::fromArray($data['shipping_address']),
            payments: array_map(static fn ($item) => Payment::fromArray($item), $data['payments']),
            metadata: Metadata::fromArray($data['metadata']),
        );
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'created_at' => $this->createdAt->format(\DATE_ATOM),
            'birthday' => $this->birthday->format('Y-m-d'),
            'billing_address' => $this->billingAddress->toArray(),
            'shipping_address' => $this->shippingAddress->toArray(),
            'payments' => array_map(static fn ($item) => $item->toArray(), $this->payments),
            'metadata' => $this->metadata->toArray(),
        ];
    }
}

final class Address
{
    public function __construct(
        public readonly string $street,
        public readonly string $city,
    ) {
    }

    /** @param array<string, mixed> $data */
    public static function fromArray(array $data): self
    {
        return new self(
            street: $data['street'],
            city: $data['city'],
        );
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'street' => $this->street,
            'city' => $this->city,
        ];
    }
}

final class Payment
{
    public function __construct(
        public readonly float $amount,
        public readonly ?\DateTimeImmutable $paidAt,
    ) {
    }

    /** @param array<string, mixed> $data */
    public static function fromArray(array $data): self
    {
        return new self(
            amount: (float) $data['amount'],
            paidAt: isset($data['paid_at']) ? new \DateTimeImmutable($data['paid_at']) : null,
        );
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'amount' => $this->amount,
            'paid_at' => $this->paidAt === null ? null : $this->paidAt->format(\DATE_ATOM),
        ];
    }
}

final class Metadata
{
    public function __construct(
        public readonly string $source,
    ) {
    }

    /** @param array<string, mixed> $data */
    public static function fromArray(array $data): self
    {
        return new self(
            source: $data['source'],
        );
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'source' => $this->source,
        ];
    }
}
