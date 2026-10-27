"""Formatting and minifying. Mirrors web/src/core/format.ts.

The parsed value is written back by hand instead of with json.dumps, so numbers keep their text
(29.0, big integers) and repeated keys are kept: formatting never changes what the JSON says.
"""

from .json_parser import JsonValue
from .jsstring import js_string


def format_json(value: JsonValue, indent: int = 2) -> str:
    unit = " " * indent

    def write(item: JsonValue, depth: int) -> str:
        if item.kind == "null":
            return "null"
        if item.kind == "boolean":
            return "true" if item.value else "false"
        if item.kind == "number":
            return item.text
        if item.kind == "string":
            return js_string(item.value)
        if item.kind == "array":
            opening, closing = "[", "]"
            parts = [write(child, depth + 1) for child in item.items]
        else:
            opening, closing = "{", "}"
            separator = ": " if indent > 0 else ":"
            parts = [f"{js_string(key)}{separator}{write(child, depth + 1)}" for key, child in item.entries]
        if not parts:
            return opening + closing
        if indent == 0:
            return opening + ",".join(parts) + closing
        inner = unit * (depth + 1)
        return f"{opening}\n{inner}" + f",\n{inner}".join(parts) + f"\n{unit * depth}{closing}"

    return write(value, 0)


def minify_json(value: JsonValue) -> str:
    return format_json(value, 0)
