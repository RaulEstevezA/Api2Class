"""Builds the intermediate model of a parsed JSON value. Mirrors web/src/core/analyze.ts."""

import json
import re

from .json_parser import JsonValue
from .naming import class_name, split_words, unique_name
from .schema import ArrayType, ClassDef, ClassRef, Field, Primitive, Schema, TypeRef, child_path

_FORMATS = [
    ("date", re.compile(r"^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$", re.ASCII)),
    # RFC 3339, the profile of ISO 8601 that every language can read: T separator, seconds and a time zone
    (
        "datetime",
        re.compile(
            r"^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(\.\d+)?"
            r"(Z|[+-]([01]\d|2[0-3]):[0-5]\d)$",
            re.ASCII,
        ),
    ),
    ("uuid", re.compile(r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$", re.ASCII)),
]


class _ObjectShape:
    def __init__(self):
        self.count = 0
        self.fields: dict[str, _Shape] = {}


class _Shape:
    """Everything seen in one position of the JSON. Every object of an array is merged into the same
    shape, so a field missing from some of them can be told apart from one that is always there."""

    def __init__(self):
        self.count = 0
        self.kinds: dict[str, int] = {}
        # How many of the strings match each format
        self.formats = {"date": 0, "datetime": 0, "uuid": 0}
        self.object: _ObjectShape | None = None
        # Items of every array seen here, merged
        self.array: _Shape | None = None


def _add_value(shape: _Shape, value: JsonValue) -> None:
    shape.count += 1
    kind = ("integer" if value.integer else "float") if value.kind == "number" else value.kind
    shape.kinds[kind] = shape.kinds.get(kind, 0) + 1
    if value.kind == "string":
        for name, pattern in _FORMATS:
            if pattern.match(value.value):
                shape.formats[name] += 1
    elif value.kind == "array":
        if shape.array is None:
            shape.array = _Shape()
        for item in value.items:
            _add_value(shape.array, item)
    elif value.kind == "object":
        if shape.object is None:
            shape.object = _ObjectShape()
        shape.object.count += 1
        # A repeated key counts once, with its last value (as JSON.parse does)
        for key, item in dict(value.entries).items():
            if key not in shape.object.fields:
                shape.object.fields[key] = _Shape()
            _add_value(shape.object.fields[key], item)


def analyze(
    value: JsonValue, root_name: str = "Root", detect_formats: bool = True, merge_identical: bool = True
) -> Schema:
    root = _Shape()
    _add_value(root, value)

    def kind_of(shape: _Shape):
        """What a shape is once nulls are set aside: ("primitive", name), ("object", object) or
        ("array", items). Mixed kinds become any, except integers mixed with floats, which are floats."""
        kinds = [kind for kind in shape.kinds if kind != "null"]
        if not kinds:
            return ("primitive", "null" if shape.kinds.get("null") else "any")
        if len(kinds) == 2 and "integer" in kinds and "float" in kinds:
            return ("primitive", "float")
        if len(kinds) > 1:
            return ("primitive", "any")
        if kinds[0] == "object":
            # An object that is always empty says nothing about its fields: a generic map, not an empty class
            return ("object", shape.object) if shape.object.fields else ("primitive", "object")
        if kinds[0] == "array":
            return ("array", shape.array)
        if kinds[0] == "string" and detect_formats:
            for name, _ in _FORMATS:
                if shape.formats[name] == shape.kinds["string"]:
                    return ("primitive", name)
        return ("primitive", kinds[0])

    def is_nullable(shape: _Shape) -> bool:
        kind = kind_of(shape)
        return bool(shape.kinds.get("null")) and kind != ("primitive", "null")

    def nested_object(shape: _Shape, path: str):
        """The object a shape leads to, directly or through arrays: (object, array_item, path)."""
        kind, inner = kind_of(shape)
        if kind == "object":
            return inner, False, path
        if kind == "array":
            found = nested_object(inner, f"{path}/[]")
            return (found[0], True, found[2]) if found else None
        return None

    # 1. Every object position becomes a node, level by level (breadth-first)
    nodes: list[dict] = []
    node_of: dict[int, int] = {}
    root_object = nested_object(root, "#")
    if root_object:
        nodes.append({"object": root_object[0], "path": root_object[2], "base": root_name, "parent": None})
        node_of[id(root_object[0])] = 0
    index = 0
    while index < len(nodes):
        for key, field_shape in nodes[index]["object"].fields.items():
            nested = nested_object(field_shape, child_path(nodes[index]["path"], key))
            if nested:
                node_of[id(nested[0])] = len(nodes)
                nodes.append(
                    {"object": nested[0], "path": nested[2], "base": class_name(key, nested[1]), "parent": index}
                )
        index += 1

    # 2. Objects with the same fields share one class. Children are compared first (they come later in
    # breadth-first order), so two classes are the same when their nested classes are too.
    group_of = list(range(len(nodes)))
    if merge_identical:
        signatures: dict[str, int] = {}

        def type_signature(shape: _Shape) -> str:
            kind, inner = kind_of(shape)
            if kind == "primitive":
                return inner
            if kind == "object":
                return f"#{group_of[node_of[id(inner)]]}"
            return f"[{type_signature(inner)}{'?' if is_nullable(inner) else ''}]"

        for position in range(len(nodes) - 1, -1, -1):
            obj = nodes[position]["object"]
            signature = json.dumps(
                [
                    [key, type_signature(shape), shape.count < obj.count, is_nullable(shape)]
                    for key, shape in obj.fields.items()
                ]
            )
            if signature in signatures:
                group_of[position] = signatures[signature]
            else:
                signatures[signature] = position
        # Point every member at the first node of its group in breadth-first order
        first: dict[int, int] = {}
        for position, group in enumerate(group_of):
            first.setdefault(group, position)
            group_of[position] = first[group]

    # 3. Names, in breadth-first order so shallow objects get the simplest ones
    classes: list[ClassDef] = []
    class_of_node: dict[int, ClassDef] = {}
    used: set[str] = set()
    for position, node in enumerate(nodes):
        if group_of[position] != position:
            continue
        members = [other for index, other in enumerate(nodes) if group_of[index] == position]
        name = _common_name([member["base"] for member in members]) if len(members) > 1 else node["base"]
        parent_name = "" if node["parent"] is None else class_of_node[group_of[node["parent"]]].name
        # address inside User and inside Company: Address, then CompanyAddress
        if name in used and parent_name and parent_name + name not in used:
            name = parent_name + name
        item = ClassDef(node["path"], unique_name(name, used), [])
        classes.append(item)
        class_of_node[position] = item

    def type_of(shape: _Shape) -> TypeRef:
        kind, inner = kind_of(shape)
        if kind == "primitive":
            return Primitive(inner)
        if kind == "object":
            return ClassRef(class_of_node[group_of[node_of[id(inner)]]].id)
        return ArrayType(type_of(inner), is_nullable(inner))

    def innermost_items(shape: _Shape) -> dict[str, int]:
        kind, inner = kind_of(shape)
        return innermost_items(inner) if kind == "array" else shape.kinds

    for position, node in enumerate(nodes):
        if group_of[position] != position:
            continue
        obj = node["object"]
        fields = []
        for key, shape in obj.fields.items():
            entry = Field(key, type_of(shape), shape.count < obj.count, is_nullable(shape), dict(shape.kinds))
            if kind_of(shape)[0] == "array":
                entry.items_observed = dict(innermost_items(shape.array))
            fields.append(entry)
        class_of_node[position].fields = fields

    return Schema(type_of(root), classes)


def _common_name(names: list[str]) -> str:
    """Name for a class shared by several objects: the words their names end with in common
    (BillingAddress + ShippingAddress → Address), or the first name if they have none."""
    words = [split_words(name) for name in names]
    common: list[str] = []
    back = 1
    while back <= len(words[0]):
        word = words[0][-back]
        if any(len(other) < back or other[-back] != word for other in words):
            break
        common.insert(0, word)
        back += 1
    return "".join(common) if common else names[0]
