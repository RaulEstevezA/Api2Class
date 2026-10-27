"""JSON Schema (draft 2020-12). Mirrors web/src/core/generators/jsonschema/jsonschema.ts."""

import json

from ..jsstring import js_string
from ..schema import ClassDef, Schema, TypeRef
from .common import LanguageRules, Names
from .types import GeneratedCode, GeneratedFile, GenerateSettings, Generator, GeneratorOption, choices

PRIMITIVES = {
    "string": {"type": "string"},
    "integer": {"type": "integer"},
    "float": {"type": "number"},
    "boolean": {"type": "boolean"},
    "date": {"type": "string", "format": "date"},
    "datetime": {"type": "string", "format": "date-time"},
    "uuid": {"type": "string", "format": "uuid"},
    "object": {"type": "object"},
    "null": {"type": "null"},
    # Any value
    "any": {},
}

OPTIONS = (GeneratorOption("style", choices(("draft-2020-12", "Draft 2020-12"))),)


def generate(schema: Schema, settings: GenerateSettings) -> GeneratedCode:
    """Schema describing the JSON as it arrives: properties are always the JSON keys."""
    names = Names(schema, settings, LanguageRules(reserved=frozenset(), default_naming="keep", any_property_name=True))
    defs = {names.class_name(item.id): _class_schema(item, names) for item in schema.classes}
    document = {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "title": names.class_name(schema.classes[0].id) if schema.classes else "Root",
        **_type_schema(schema.root, names),
        **({"$defs": defs} if schema.classes else {}),
    }
    name = f"{names.class_name(schema.classes[0].id) if schema.classes else 'root'}.schema.json"
    # Same layout as JSON.stringify(document, null, 2)
    code = json.dumps(document, indent=2, ensure_ascii=False) + "\n"
    return GeneratedCode([GeneratedFile(name, code)], _usage(name), [])


def _type_schema(type_ref: TypeRef, names: Names) -> dict:
    if type_ref.kind == "class":
        return {"$ref": f"#/$defs/{names.class_name(type_ref.class_id)}"}
    if type_ref.kind == "array":
        items = _type_schema(type_ref.items, names)
        return {"type": "array", "items": _nullable(items) if type_ref.items_nullable else items}
    return dict(PRIMITIVES[type_ref.name])


def _nullable(schema: dict) -> dict:
    """The same schema, also accepting null."""
    if not schema:
        return schema
    if isinstance(schema.get("type"), str) and "$ref" not in schema:
        return schema if schema["type"] == "null" else {**schema, "type": [schema["type"], "null"]}
    return {"anyOf": [schema, {"type": "null"}]}


def _class_schema(item: ClassDef, names: Names) -> dict:
    properties = {
        field.key: _nullable(_type_schema(field.type, names)) if field.nullable else _type_schema(field.type, names)
        for field in item.fields
    }
    required = [field.key for field in item.fields if not field.optional]
    return {"type": "object", "properties": properties, **({"required": required} if required else {})}


def _usage(file_name: str) -> str:
    return "\n".join(
        [
            "# Validate a response with the schema (Python, pip install jsonschema)",
            "import json",
            "from jsonschema import validate",
            "",
            f"validate(instance=json.loads(text), schema=json.load(open({js_string(file_name)})))",
            "",
        ]
    )


JSON_SCHEMA = Generator("jsonschema", "JSON Schema", OPTIONS, False, generate)
