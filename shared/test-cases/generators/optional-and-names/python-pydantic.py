from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class Root(BaseModel):
    users: list[User]


class User(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    user_id: int = Field(alias="userId")
    email: str | None = None
    phone: str | None
    postal_code: str = Field(alias="Postal Code")
    class_: str = Field(alias="class")
    field_2fa: bool = Field(alias="2fa")
    tags: list[str | None]
    deleted_at: None
    manager: Manager | None = None


class Manager(BaseModel):
    user_id: int
