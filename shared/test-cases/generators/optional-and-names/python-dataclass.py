from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class Root:
    users: list[User]

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Root:
        return cls(
            users=[User.from_dict(item) for item in data["users"]],
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "users": [item.to_dict() for item in self.users],
        }


@dataclass
class User:
    user_id: int  # JSON: "userId"
    phone: str | None
    postal_code: str  # JSON: "Postal Code"
    class_: str  # JSON: "class"
    field_2fa: bool  # JSON: "2fa"
    tags: list[str | None]
    deleted_at: None
    email: str | None = None
    manager: Manager | None = None

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> User:
        return cls(
            user_id=data["userId"],
            phone=data["phone"],
            postal_code=data["Postal Code"],
            class_=data["class"],
            field_2fa=data["2fa"],
            tags=data["tags"],
            deleted_at=data["deleted_at"],
            email=data.get("email"),
            manager=Manager.from_dict(data["manager"]) if data.get("manager") is not None else None,
        )

    def to_dict(self) -> dict[str, Any]:
        data: dict[str, Any] = {
            "userId": self.user_id,
            "phone": self.phone,
            "Postal Code": self.postal_code,
            "class": self.class_,
            "2fa": self.field_2fa,
            "tags": self.tags,
            "deleted_at": self.deleted_at,
        }
        if self.email is not None:
            data["email"] = self.email
        if self.manager is not None:
            data["manager"] = self.manager.to_dict()
        return data


@dataclass
class Manager:
    user_id: int

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Manager:
        return cls(
            user_id=data["user_id"],
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "user_id": self.user_id,
        }
