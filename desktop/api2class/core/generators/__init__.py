"""Every available language, in the order they are offered: the most used first, then the languages
for describing APIs. Mirrors web/src/core/generators/index.ts."""

from .csharp import CSHARP
from .dart import DART
from .go import GO
from .java import JAVA
from .kotlin import KOTLIN
from .php import PHP
from .python import PYTHON
from .rust import RUST
from .swift import SWIFT
from .types import Generator
from .typescript import TYPESCRIPT

GENERATORS: list[Generator] = [
    PYTHON,
    JAVA,
    TYPESCRIPT,
    CSHARP,
    KOTLIN,
    DART,
    SWIFT,
    GO,
    PHP,
    RUST,
    SCALA,
    JSON_SCHEMA,
    SMITHY,
]


def find_generator(generator_id: str) -> Generator:
    return next((generator for generator in GENERATORS if generator.id == generator_id), GENERATORS[0])
