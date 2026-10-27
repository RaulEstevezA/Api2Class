from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class Root(BaseModel):
    id: int
    value: Any
    meta: dict[str, Any]
    matrix: list[list[int]]
    points: list[Point]


class Point(BaseModel):
    x: float
    y: int
