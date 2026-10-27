from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class Root:
    id: int
    value: Any
    meta: Meta
    matrix: list[list[int]]
    points: list[Point]


@dataclass
class Meta:
    pass


@dataclass
class Point:
    x: float
    y: int
