from __future__ import annotations

from pydantic import BaseModel


class Root(BaseModel):
    id: int
    name: str
    active: bool
    address: Address
    orders: list[Order]


class Address(BaseModel):
    city: str
    postal_code: str


class Order(BaseModel):
    id: int
    total: float
