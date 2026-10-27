<?php

declare(strict_types=1);

final class Root
{
    /**
     * @param list<User> $users
     */
    public function __construct(
        public readonly array $users,
    ) {
    }

    /** @param array<string, mixed> $data */
    public static function fromArray(array $data): self
    {
        return new self(
            users: array_map(static fn ($item) => User::fromArray($item), $data['users']),
        );
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'users' => array_map(static fn ($item) => $item->toArray(), $this->users),
        ];
    }
}

final class User
{
    /**
     * @param list<?string> $tags
     */
    public function __construct(
        public readonly int $userId,
        public readonly ?string $phone,
        public readonly string $postalCode,
        public readonly string $class,
        public readonly bool $_2fa,
        public readonly array $tags,
        public readonly mixed $deletedAt,
        public readonly ?string $email = null,
        public readonly ?Manager $manager = null,
    ) {
    }

    /** @param array<string, mixed> $data */
    public static function fromArray(array $data): self
    {
        return new self(
            userId: $data['userId'],
            phone: $data['phone'] ?? null,
            postalCode: $data['Postal Code'],
            class: $data['class'],
            _2fa: $data['2fa'],
            tags: $data['tags'],
            deletedAt: $data['deleted_at'],
            email: $data['email'] ?? null,
            manager: isset($data['manager']) ? Manager::fromArray($data['manager']) : null,
        );
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        $data = [
            'userId' => $this->userId,
            'phone' => $this->phone,
            'Postal Code' => $this->postalCode,
            'class' => $this->class,
            '2fa' => $this->_2fa,
            'tags' => $this->tags,
            'deleted_at' => $this->deletedAt,
        ];
        if ($this->email !== null) {
            $data['email'] = $this->email;
        }
        if ($this->manager !== null) {
            $data['manager'] = $this->manager->toArray();
        }
        return $data;
    }
}

final class Manager
{
    public function __construct(
        public readonly int $userId,
    ) {
    }

    /** @param array<string, mixed> $data */
    public static function fromArray(array $data): self
    {
        return new self(
            userId: $data['user_id'],
        );
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'user_id' => $this->userId,
        ];
    }
}
