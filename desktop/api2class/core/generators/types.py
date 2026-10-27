"""Generator interface, options and settings. Mirrors web/src/core/generators/types.ts."""

from collections.abc import Callable
from dataclasses import dataclass, field

from ..schema import Schema


@dataclass(frozen=True)
class Choice:
    id: str
    label: str


@dataclass(frozen=True)
class GeneratorOption:
    """A setting of a generator: its style, the serialization library... The first choice is the default."""

    id: str
    choices: tuple[Choice, ...]
    # Only shown for these values of the style option
    styles: tuple[str, ...] | None = None


@dataclass
class GenerateSettings:
    # By option id; missing ones take their first choice
    options: dict[str, str] = field(default_factory=dict)
    # default, camelCase, snake_case, PascalCase or keep (as in the JSON)
    naming: str = "default"
    # One file per class instead of a single file
    multiple_files: bool = False


@dataclass
class GeneratedFile:
    name: str
    code: str


@dataclass
class NameNote:
    """A name that had to change to be valid in the language."""

    class_name: str
    key: str
    name: str
    # reserved or invalid
    reason: str


@dataclass
class GeneratedCode:
    files: list[GeneratedFile]
    # Short example of reading the JSON with the generated code, or None when there is nothing to read
    usage: str | None
    notes: list[NameNote]


@dataclass(frozen=True)
class Generator:
    """One target language. Generators are independent from each other: adding a language means adding
    its module and registering it in generators/__init__.py."""

    id: str
    label: str
    # Settings, the style first
    options: tuple[GeneratorOption, ...]
    supports_multiple_files: bool
    generate: Callable[[Schema, GenerateSettings], GeneratedCode]


def choices(*pairs: tuple[str, str]) -> tuple[Choice, ...]:
    return tuple(Choice(choice_id, label) for choice_id, label in pairs)


def option_value(options: tuple[GeneratorOption, ...], settings: GenerateSettings, option_id: str) -> str:
    """The value of an option, or its default (first choice)."""
    option = next(item for item in options if item.id == option_id)
    value = settings.options.get(option_id)
    return value if any(choice.id == value for choice in option.choices) else option.choices[0].id
