from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class Root:
    id: int
    name: str
    active: bool
    address: Address
    orders: list[Order]

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Root:
        return cls(
            id=data["id"],
            name=data["name"],
            active=data["active"],
            address=Address.from_dict(data["address"]),
            orders=[Order.from_dict(item) for item in data["orders"]],
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "active": self.active,
            "address": self.address.to_dict(),
            "orders": [item.to_dict() for item in self.orders],
        }


@dataclass
class Address:
    city: str
    postal_code: str

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Address:
        return cls(
            city=data["city"],
            postal_code=data["postal_code"],
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "city": self.city,
            "postal_code": self.postal_code,
        }


@dataclass
class Order:
    id: int
    total: float

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Order:
        return cls(
            id=data["id"],
            total=float(data["total"]),
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "total": self.total,
        }
