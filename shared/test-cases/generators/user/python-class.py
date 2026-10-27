from __future__ import annotations

from typing import Any


class Root:
    def __init__(
        self,
        id: int,
        name: str,
        active: bool,
        address: Address,
        orders: list[Order],
    ) -> None:
        self.id = id
        self.name = name
        self.active = active
        self.address = address
        self.orders = orders

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


class Address:
    def __init__(
        self,
        city: str,
        postal_code: str,
    ) -> None:
        self.city = city
        self.postal_code = postal_code

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


class Order:
    def __init__(
        self,
        id: int,
        total: float,
    ) -> None:
        self.id = id
        self.total = total

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
