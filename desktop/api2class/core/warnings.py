"""Fields whose type could not be detected and should be checked by hand. Mirrors web/src/core/warnings.ts."""

from dataclasses import dataclass

from .schema import Schema, innermost_type


@dataclass
class SchemaWarning:
    # mixedTypes, emptyArray, emptyObject or onlyNull
    code: str
    class_id: str
    key: str
    # For mixedTypes: how many values of each kind, most frequent first
    counts: list[tuple[str, int]] | None = None


def schema_warnings(schema: Schema) -> list[SchemaWarning]:
    """Computed on the edited schema: a field whose type the user has set no longer warns."""
    warnings: list[SchemaWarning] = []
    for item in schema.classes:
        for field in item.fields:
            inner = innermost_type(field.type)
            if inner.kind != "primitive" or field.type_edited:
                continue
            observed = (field.items_observed or {}) if field.type.kind == "array" else field.observed
            if inner.name == "any" and field.type.kind == "array" and not observed:
                warnings.append(SchemaWarning("emptyArray", item.id, field.key))
            elif inner.name == "any" and len(observed) > 1:
                # sorted() is stable, like Array.prototype.sort: ties keep the order the types were found in
                counts = sorted(
                    ((kind, count) for kind, count in observed.items() if kind != "null"), key=lambda e: -e[1]
                )
                warnings.append(SchemaWarning("mixedTypes", item.id, field.key, counts))
            elif inner.name == "object":
                # Only detected as a map when every object was empty
                warnings.append(SchemaWarning("emptyObject", item.id, field.key))
            elif inner.name == "null":
                warnings.append(SchemaWarning("onlyNull", item.id, field.key))
    return warnings
