from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Root:
    id: int
    name: str
    active: bool
    address: Address
    orders: list[Order]


@dataclass
class Address:
    city: str
    postal_code: str


@dataclass
class Order:
    id: int
    total: float
