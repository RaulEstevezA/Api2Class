from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from typing import Any
from uuid import UUID


@dataclass
class Root:
    id: UUID
    created_at: datetime
    birthday: date
    billing_address: Address
    shipping_address: Address
    payments: list[Payment]
    metadata: Metadata

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Root:
        return cls(
            id=UUID(data["id"]),
            created_at=datetime.fromisoformat(data["created_at"]),
            birthday=date.fromisoformat(data["birthday"]),
            billing_address=Address.from_dict(data["billing_address"]),
            shipping_address=Address.from_dict(data["shipping_address"]),
            payments=[Payment.from_dict(item) for item in data["payments"]],
            metadata=Metadata.from_dict(data["metadata"]),
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": str(self.id),
            "created_at": self.created_at.isoformat(),
            "birthday": self.birthday.isoformat(),
            "billing_address": self.billing_address.to_dict(),
            "shipping_address": self.shipping_address.to_dict(),
            "payments": [item.to_dict() for item in self.payments],
            "metadata": self.metadata.to_dict(),
        }


@dataclass
class Address:
    street: str
    city: str

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Address:
        return cls(
            street=data["street"],
            city=data["city"],
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "street": self.street,
            "city": self.city,
        }


@dataclass
class Payment:
    amount: float
    paid_at: datetime | None

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Payment:
        return cls(
            amount=float(data["amount"]),
            paid_at=datetime.fromisoformat(data["paid_at"]) if data["paid_at"] is not None else None,
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "amount": self.amount,
            "paid_at": self.paid_at.isoformat() if self.paid_at is not None else None,
        }


@dataclass
class Metadata:
    source: str

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Metadata:
        return cls(
            source=data["source"],
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "source": self.source,
        }
