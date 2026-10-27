from __future__ import annotations

from datetime import date, datetime
from typing import Any
from uuid import UUID


class Root:
    def __init__(
        self,
        id: UUID,
        created_at: datetime,
        birthday: date,
        billing_address: Address,
        shipping_address: Address,
        payments: list[Payment],
        metadata: Metadata,
    ) -> None:
        self.id = id
        self.created_at = created_at
        self.birthday = birthday
        self.billing_address = billing_address
        self.shipping_address = shipping_address
        self.payments = payments
        self.metadata = metadata

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


class Address:
    def __init__(
        self,
        street: str,
        city: str,
    ) -> None:
        self.street = street
        self.city = city

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


class Payment:
    def __init__(
        self,
        amount: float,
        paid_at: datetime | None,
    ) -> None:
        self.amount = amount
        self.paid_at = paid_at

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


class Metadata:
    def __init__(
        self,
        source: str,
    ) -> None:
        self.source = source

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Metadata:
        return cls(
            source=data["source"],
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "source": self.source,
        }
