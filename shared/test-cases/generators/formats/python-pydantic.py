from __future__ import annotations

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel


class Root(BaseModel):
    id: UUID
    created_at: datetime
    birthday: date
    billing_address: Address
    shipping_address: Address
    payments: list[Payment]
    metadata: Metadata


class Address(BaseModel):
    street: str
    city: str


class Payment(BaseModel):
    amount: float
    paid_at: datetime | None


class Metadata(BaseModel):
    source: str
