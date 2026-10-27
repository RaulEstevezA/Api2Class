from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Root:
    users: list[User]


@dataclass
class User:
    user_id: int  # JSON: "userId"
    phone: str | None
    postal_code: str  # JSON: "Postal Code"
    class_: str  # JSON: "class"
    _2fa: bool  # JSON: "2fa"
    tags: list[str | None]
    deleted_at: None
    email: str | None = None
    manager: Manager | None = None


@dataclass
class Manager:
    user_id: int
