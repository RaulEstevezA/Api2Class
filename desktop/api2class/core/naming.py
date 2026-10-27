"""Naming conventions, English singular and valid identifiers. Mirrors web/src/core/naming.ts."""

import re
import unicodedata
from typing import Literal

NamingConvention = Literal["PascalCase", "camelCase", "snake_case"]


def _category(char: str) -> str:
    return unicodedata.category(char)


def _is_word_char(char: str) -> bool:
    return _category(char)[0] in "LN"


def split_words(text: str) -> list[str]:
    """Splits a JSON key into words: postal_code, postalCode, PostalCode, postal-code and Postal Code
    all give ["postal", "code"]. Accents are removed (teléfono → telefono) and digits stay with the
    word before them (address2)."""
    plain = "".join(char for char in unicodedata.normalize("NFD", text) if _category(char)[0] != "M")
    words: list[str] = []
    for part in re.split(r"\W+|_+", "".join(char if _is_word_char(char) else " " for char in plain)):
        if not part:
            continue
        current = part[0]
        for index in range(1, len(part)):
            previous, char = part[index - 1], part[index]
            following = part[index + 1] if index + 1 < len(part) else ""
            # userId → user Id; HTTPServer → HTTP Server
            lower_or_digit = _category(previous) == "Ll" or _category(previous)[0] == "N"
            if _category(char) == "Lu" and (
                lower_or_digit or (_category(previous) == "Lu" and following and _category(following) == "Ll")
            ):
                words.append(current)
                current = char
            else:
                current += char
        words.append(current)
    return [word for word in words if word]


def _capitalize(word: str) -> str:
    return word[:1].upper() + word[1:].lower()


def to_pascal_case(text: str) -> str:
    return "".join(_capitalize(word) for word in split_words(text))


def to_camel_case(text: str) -> str:
    pascal = to_pascal_case(text)
    words = split_words(text)
    first = words[0] if words else ""
    return first.lower() + pascal[len(first) :]


def to_snake_case(text: str) -> str:
    return "_".join(word.lower() for word in split_words(text))


def convert_case(text: str, convention: NamingConvention) -> str:
    if convention == "PascalCase":
        return to_pascal_case(text)
    if convention == "camelCase":
        return to_camel_case(text)
    return to_snake_case(text)


# Already singular, or the same in singular and plural
_UNCHANGED = {"data", "metadata", "news", "series", "species", "info", "information", "media", "status"}
_IRREGULAR = {
    "people": "person",
    "children": "child",
    "men": "man",
    "women": "woman",
    # -ies plurals of words ending in -ie
    "movies": "movie",
    "cookies": "cookie",
}


def singularize(word: str) -> str:
    """English singular of one word, keeping its case: Categories → Category, addresses → address.
    Returns the word unchanged when it does not look like a plural."""
    lower = word.lower()
    if lower in _UNCHANGED:
        return word
    if lower in _IRREGULAR:
        return word[:1] + _IRREGULAR[lower][1:]
    if re.search(r"[^aeiou]ies$", lower):
        return word[:-3] + ("Y" if word.endswith("IES") else "y")
    if re.search(r"(ss|us|x|z|ch|sh)es$", lower):
        return word[:-2]
    if re.search(r"(ss|us|is)$", lower) or not lower.endswith("s") or len(lower) < 3:
        return word
    return word[:-1]


def class_name(key: str, array_item: bool) -> str:
    """Class name for a JSON key. Items of an array are named in singular (orders → Order); when the
    key has no plural (data), Item is added (DataItem)."""
    words = split_words(key)
    if not words:
        return "Item" if array_item else "Object"
    if array_item:
        last = words[-1]
        singular = singularize(last)
        if singular == last:
            words.append("Item")
        else:
            words[-1] = singular
    return "".join(_capitalize(word) for word in words)


def starts_with_digit(name: str) -> bool:
    return bool(name) and _category(name[0])[0] == "N"


def safe_identifier(name: str, reserved: set[str] | frozenset[str], fallback: str) -> str:
    """Makes a name usable as an identifier: never empty, not starting with a digit and not reserved."""
    if name == "":
        return fallback
    if starts_with_digit(name):
        return f"_{name}"
    if name in reserved:
        return f"{name}_"
    return name


def unique_name(name: str, used: set[str]) -> str:
    """Returns name, or name2, name3... if it is already taken, and marks the result as taken."""
    result = name
    number = 2
    while result in used:
        result = f"{name}{number}"
        number += 1
    used.add(result)
    return result
