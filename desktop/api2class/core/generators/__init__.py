"""Every available language, in the order they are offered. Mirrors web/src/core/generators/index.ts."""

from .csharp import CSHARP
from .dart import DART
from .java import JAVA
from .kotlin import KOTLIN
from .python import PYTHON
from .types import Generator
from .typescript import TYPESCRIPT

GENERATORS: list[Generator] = [PYTHON, JAVA, TYPESCRIPT, CSHARP, KOTLIN, DART]


def find_generator(generator_id: str) -> Generator:
    return next((generator for generator in GENERATORS if generator.id == generator_id), GENERATORS[0])
