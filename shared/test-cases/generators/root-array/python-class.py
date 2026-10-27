from __future__ import annotations

from typing import Any


class Root:
    def __init__(
        self,
        id: int,
        value: Any,
        meta: dict[str, Any],
        matrix: list[list[int]],
        points: list[Point],
    ) -> None:
        self.id = id
        self.value = value
        self.meta = meta
        self.matrix = matrix
        self.points = points

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Root:
        return cls(
            id=data["id"],
            value=data["value"],
            meta=data["meta"],
            matrix=data["matrix"],
            points=[Point.from_dict(item) for item in data["points"]],
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "value": self.value,
            "meta": self.meta,
            "matrix": self.matrix,
            "points": [item.to_dict() for item in self.points],
        }


class Point:
    def __init__(
        self,
        x: float,
        y: int,
    ) -> None:
        self.x = x
        self.y = y

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> Point:
        return cls(
            x=float(data["x"]),
            y=data["y"],
        )

    def to_dict(self) -> dict[str, Any]:
        return {
            "x": self.x,
            "y": self.y,
        }
