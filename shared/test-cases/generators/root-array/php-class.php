<?php

declare(strict_types=1);

final class Root
{
    /**
     * @param array<string, mixed> $meta
     * @param list<list<int>> $matrix
     * @param list<Point> $points
     */
    public function __construct(
        public readonly int $id,
        public readonly mixed $value,
        public readonly array $meta,
        public readonly array $matrix,
        public readonly array $points,
    ) {
    }

    /** @param array<string, mixed> $data */
    public static function fromArray(array $data): self
    {
        return new self(
            id: $data['id'],
            value: $data['value'],
            meta: $data['meta'],
            matrix: $data['matrix'],
            points: array_map(static fn ($item) => Point::fromArray($item), $data['points']),
        );
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'value' => $this->value,
            'meta' => (object) $this->meta,
            'matrix' => $this->matrix,
            'points' => array_map(static fn ($item) => $item->toArray(), $this->points),
        ];
    }
}

final class Point
{
    public function __construct(
        public readonly float $x,
        public readonly int $y,
    ) {
    }

    /** @param array<string, mixed> $data */
    public static function fromArray(array $data): self
    {
        return new self(
            x: (float) $data['x'],
            y: $data['y'],
        );
    }

    /** @return array<string, mixed> */
    public function toArray(): array
    {
        return [
            'x' => $this->x,
            'y' => $this->y,
        ];
    }
}
