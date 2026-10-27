"""Names valid in each language and helpers shared by every generator. Mirrors web/src/core/generators/common.ts."""

import unicodedata
from collections.abc import Callable
from dataclasses import dataclass

from ..naming import convert_case, safe_identifier, starts_with_digit, unique_name
from ..schema import ClassDef, Field, Schema, class_of, describe_type, innermost_type
from .types import GenerateSettings, NameNote


@dataclass
class LanguageRules:
    # Words that cannot be used as names
    reserved: frozenset[str]
    # Convention for properties when the user keeps the default: camelCase, snake_case, PascalCase or keep
    default_naming: str
    # How a reserved word is made usable: class_ by default; Kotlin and Swift use backticks
    escape_reserved: Callable[[str], str] | None = None
    # Put before names starting with a digit: _2fa by default
    digit_prefix: str = "_"
    # Fixes a converted name to the language's conventions (Go initialisms: Id → ID)
    adjust: Callable[[str], str] | None = None
    # Any string can be a property name (TypeScript quotes them), so they are never escaped
    any_property_name: bool = False
    # Words that cannot be class names, when they differ from reserved (PHP)
    reserved_classes: frozenset[str] | None = None
    # Reserved words match whatever their case (PHP: list, List, LIST)
    case_insensitive: bool = False


@dataclass
class Property:
    field: Field
    name: str
    # The name differs from the JSON key, so the code needs to map it
    renamed: bool


def is_identifier(text: str) -> bool:
    """Same as /^[\\p{L}_][\\p{L}\\p{N}_]*$/u: letters, digits and underscores, not starting with a digit."""
    if not text:
        return False
    first = text[0] == "_" or unicodedata.category(text[0])[0] == "L"
    return first and all(char == "_" or unicodedata.category(char)[0] in "LN" for char in text[1:])


class Names:
    """Names valid in the target language for every class and property, and the notes about the ones
    that had to change. Every generator uses it, so names are decided the same way everywhere."""

    def __init__(self, schema: Schema, settings: GenerateSettings, rules: LanguageRules):
        self.rules = rules
        self.notes: list[NameNote] = []
        self._escape = rules.escape_reserved or (lambda name: f"{name}_")
        self._naming = rules.default_naming if settings.naming == "default" else settings.naming
        used_classes: set[str] = set()
        self._class_names: dict[str, str] = {}
        for item in schema.classes:
            valid = self._valid(
                safe_identifier(item.name, frozenset(), "Model"),
                "Model",
                (item.name, ""),
                rules.reserved_classes if rules.reserved_classes is not None else rules.reserved,
            )
            self._class_names[item.id] = unique_name(valid, used_classes)
        self._properties: dict[str, list[Property]] = {}

    def _is_reserved(self, name: str, words: frozenset[str]) -> bool:
        return (name.lower() if self.rules.case_insensitive else name) in words

    def _valid(
        self, name: str, fallback: str, note: tuple[str, str] | None, words: frozenset[str] | None = None
    ) -> str:
        words = self.rules.reserved if words is None else words
        result = fallback if name == "" else name
        reason = "invalid" if name == "" else None
        if starts_with_digit(result):
            result = self.rules.digit_prefix + result
            reason = "invalid"
        if self._is_reserved(result, words):
            result = self._escape(result)
            reason = "reserved"
        if reason and note:
            self.notes.append(NameNote(note[0], note[1], result, reason))
        return result

    def _convert(self, key: str) -> str:
        if self._naming == "keep" and (is_identifier(key) or self.rules.any_property_name):
            return key
        converted = convert_case(key, "camelCase" if self._naming == "keep" else self._naming)
        return self.rules.adjust(converted) if self.rules.adjust else converted

    def class_name(self, class_id: str) -> str:
        return self._class_names[class_id]

    def properties(self, item: ClassDef) -> list[Property]:
        """Property names of a class, in field order. A name chosen by the user is used as is. Two fields
        that end up with the same name (userId and user_id in snake_case) get a number."""
        if item.id not in self._properties:
            used: set[str] = set()
            result = []
            for field in item.fields:
                wanted = field.name if field.name is not None else self._convert(field.key)
                if not self.rules.any_property_name:
                    wanted = self._valid(wanted, "field", (self._class_names[item.id], field.key))
                name = unique_name(wanted, used)
                result.append(Property(field, name, name != field.key))
            self._properties[item.id] = result
        return self._properties[item.id]


def no_classes_message(schema: Schema) -> str:
    """Text for a JSON without objects, such as [1, 2, 3]: there is nothing to generate."""
    return f"The JSON root is {describe_type(schema.root, schema)}: there are no objects to generate classes from."


def primitives_used(fields: list[Field]) -> set[str]:
    """Primitive types used anywhere in a class, to know which imports it needs."""
    used = set()
    for field in fields:
        inner = innermost_type(field.type)
        if inner.kind == "primitive":
            used.add(inner.name)
    return used


def dependencies(item: ClassDef) -> list[str]:
    """Classes a class refers to directly, in field order."""
    result: list[str] = []
    for field in item.fields:
        class_id = class_of(field.type)
        if class_id is not None and class_id not in result:
            result.append(class_id)
    return result


def dependency_order(schema: Schema) -> list[ClassDef]:
    """Classes ordered so each one comes after the ones it uses (Zod...). Otherwise breadth-first order."""
    by_id = {item.id: item for item in schema.classes}
    ordered: list[ClassDef] = []
    done: set[str] = set()

    def visit(item: ClassDef) -> None:
        if item.id in done:
            return
        done.add(item.id)
        for dependency in dependencies(item):
            visit(by_id[dependency])
        ordered.append(item)

    for item in schema.classes:
        visit(item)
    return ordered


def required_first(properties: list[Property]) -> list[Property]:
    """Required fields first, keeping their order: for languages where defaults must go last."""
    return [p for p in properties if not p.field.optional] + [p for p in properties if p.field.optional]
