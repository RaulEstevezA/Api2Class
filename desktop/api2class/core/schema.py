"""The intermediate model between the JSON and the generated code. Mirrors web/src/core/schema.ts.

Generators only read this model, never the JSON, so whatever the user edits is what ends up in the code.
"""

from dataclasses import dataclass, field
from typing import ClassVar, Literal

# date, datetime and uuid are strings in the JSON, detected by their format. object is a generic map
# (dict, Map, Record), used when the user prefers it to a class.
PrimitiveName = Literal["string", "integer", "float", "boolean", "date", "datetime", "uuid", "object", "null", "any"]
ValueKind = Literal["string", "integer", "float", "boolean", "null", "object", "array"]


@dataclass(frozen=True)
class Primitive:
    name: PrimitiveName
    kind: ClassVar[str] = "primitive"


@dataclass(frozen=True)
class ArrayType:
    items: "TypeRef"
    items_nullable: bool
    kind: ClassVar[str] = "array"


@dataclass(frozen=True)
class ClassRef:
    class_id: str
    kind: ClassVar[str] = "class"


TypeRef = Primitive | ArrayType | ClassRef


@dataclass
class Field:
    # The key as written in the JSON
    key: str
    type: TypeRef
    # Missing in some of the objects it was found in
    optional: bool
    # null in some objects, and a real value in others
    nullable: bool
    # How many values of each kind were found, for the field and, for arrays, for the innermost items
    observed: dict[str, int] = field(default_factory=dict)
    items_observed: dict[str, int] | None = None
    # Property name chosen by the user, used as is instead of converting the key
    name: str | None = None
    # The type was chosen by the user, not detected
    type_edited: bool = False


@dataclass
class ClassDef:
    # Path of the first object it comes from (#, #/address, #/orders/[])
    id: str
    name: str
    fields: list[Field]


@dataclass
class Schema:
    # The type of the whole JSON: usually a class, or an array of a class
    root: TypeRef
    # In the order they were found, the root class first
    classes: list[ClassDef]


def find_class(schema: Schema, class_id: str) -> ClassDef:
    for item in schema.classes:
        if item.id == class_id:
            return item
    raise KeyError(f"Unknown class {class_id}")


def describe_type(type_ref: TypeRef, schema: Schema) -> str:
    """Language-neutral description of a type: integer, Order[], (string | null)[]."""
    if type_ref.kind == "primitive":
        return type_ref.name
    if type_ref.kind == "class":
        return find_class(schema, type_ref.class_id).name
    items = describe_type(type_ref.items, schema)
    return f"({items} | null)[]" if type_ref.items_nullable else f"{items}[]"


def class_of(type_ref: TypeRef) -> str | None:
    """The class a type leads to, directly or through arrays."""
    if type_ref.kind == "class":
        return type_ref.class_id
    if type_ref.kind == "array":
        return class_of(type_ref.items)
    return None


def innermost_type(type_ref: TypeRef) -> Primitive | ClassRef:
    """The type at the bottom of a type, through arrays (Order[][] → Order)."""
    return innermost_type(type_ref.items) if type_ref.kind == "array" else type_ref


def child_path(path: str, key: str) -> str:
    """Path of a field: #/orders/[] + id → #/orders/[]/id. Keys are escaped as in JSON Pointer, and []
    stands for array items."""
    escaped = key.replace("~", "~0").replace("/", "~1")
    return f"{path}/{'~2' if escaped == '[]' else escaped}"
