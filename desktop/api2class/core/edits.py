"""User edits by path, applied on top of the detected schema. Mirrors web/src/core/edits.ts.

Classes are edited by id (#/orders/[]) and fields by the id of their class and their key
(#/orders/[]/total), apart from the analysis, so edits survive changes to the JSON while the paths exist.
Edits are plain dicts with the same keys as the web version (name, type, optional, nullable, excluded).
"""

from dataclasses import dataclass, field, replace

from .schema import ArrayType, ClassDef, Field, Primitive, Schema, TypeRef, child_path, class_of


@dataclass
class Edits:
    classes: dict[str, dict] = field(default_factory=dict)
    fields: dict[str, dict] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, data: dict) -> "Edits":
        return cls(dict(data.get("classes", {})), dict(data.get("fields", {})))

    def is_empty(self) -> bool:
        return not self.classes and not self.fields


def field_path(class_id: str, key: str) -> str:
    return child_path(class_id, key)


def update_edit(edits: dict[str, dict], path: str, change: dict) -> dict[str, dict]:
    """Sets or clears part of an edit (None clears); an edit left empty is removed."""
    merged = {**edits.get(path, {}), **change}
    merged = {key: value for key, value in merged.items() if value is not None}
    result = dict(edits)
    if merged:
        result[path] = merged
    else:
        result.pop(path, None)
    return result


def _replace_innermost(type_ref: TypeRef, name: str) -> TypeRef:
    if type_ref.kind == "array":
        return ArrayType(_replace_innermost(type_ref.items, name), type_ref.items_nullable)
    return Primitive(name)


def edited_field(source: Field, edit: dict | None) -> Field:
    """Applies a field's edit to it: what the code is generated from."""
    if not edit:
        return source
    result = replace(source)
    name = edit.get("name")
    if name is not None and name.strip() != "":
        result.name = name.strip()
    if edit.get("type") is not None:
        result.type = _replace_innermost(source.type, edit["type"])
        result.type_edited = True
    if edit.get("optional") is not None:
        result.optional = edit["optional"]
    if edit.get("nullable") is not None:
        result.nullable = edit["nullable"]
    return result


def apply_edits(schema: Schema, edits: Edits) -> Schema:
    """The schema the code is generated from: edits applied, excluded fields removed, and classes that
    nothing uses any more left out."""
    by_id = {item.id: item for item in schema.classes}
    edited: dict[str, ClassDef] = {}

    def visit(class_id: str) -> None:
        if class_id in edited:
            return
        item = by_id[class_id]
        name = (edits.classes.get(class_id, {}).get("name") or "").strip()
        result = ClassDef(item.id, name or item.name, [])
        edited[class_id] = result
        for source in item.fields:
            edit = edits.fields.get(field_path(class_id, source.key))
            if edit and edit.get("excluded"):
                continue
            final = edited_field(source, edit)
            result.fields.append(final)
            nested = class_of(final.type)
            if nested:
                visit(nested)

    root_class = class_of(schema.root)
    if root_class:
        visit(root_class)
    # Same order as the analysis
    return Schema(schema.root, [edited[item.id] for item in schema.classes if item.id in edited])
