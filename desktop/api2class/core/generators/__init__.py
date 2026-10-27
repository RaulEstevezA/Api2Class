"""Every available language, in the order they are offered. Mirrors web/src/core/generators/index.ts."""

from .java import JAVA
from .python import PYTHON
from .types import Generator

GENERATORS: list[Generator] = [PYTHON, JAVA]


def find_generator(generator_id: str) -> Generator:
    return next((generator for generator in GENERATORS if generator.id == generator_id), GENERATORS[0])
