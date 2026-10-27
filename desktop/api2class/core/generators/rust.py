"""Rust structs with serde. Mirrors web/src/core/generators/rust/rust.ts."""

from ..jsstring import js_string
from ..naming import to_snake_case
from ..schema import ClassDef, Schema, TypeRef
from .common import LanguageRules, Names, no_classes_message
from .types import GeneratedCode, GeneratedFile, GenerateSettings, Generator, GeneratorOption, choices

KEYWORDS = frozenset(
    "as async await break const continue crate dyn else enum extern false fn for if impl in let loop match mod move "
    "mut pub ref return self Self static struct super trait true type unsafe use where while abstract become box do "
    "final macro override priv try typeof unsized virtual yield".split()
)

# Dates and UUIDs stay as text, so the code only needs serde and serde_json
PRIMITIVES = {
    "string": "String",
    "integer": "i64",
    "float": "f64",
    "boolean": "bool",
    "date": "String",
    "datetime": "String",
    "uuid": "String",
    "object": "serde_json::Map<String, serde_json::Value>",
    "null": "serde_json::Value",
    "any": "serde_json::Value",
}

INDENT = "    "

OPTIONS = (GeneratorOption("style", choices(("serde", "struct + serde"))),)


def generate(schema: Schema, settings: GenerateSettings) -> GeneratedCode:
    if not schema.classes:
        return GeneratedCode([GeneratedFile("models.rs", f"// {no_classes_message(schema)}\n")], None, [])

    names = Names(
        schema,
        settings,
        LanguageRules(reserved=KEYWORDS, default_naming="snake_case", escape_reserved=lambda name: f"{name}_"),
    )
    code = (
        "use serde::{Deserialize, Serialize};\n\n" + "\n\n".join(_struct(item, names) for item in schema.classes) + "\n"
    )
    file_name = f"{to_snake_case(names.class_name(schema.classes[0].id)) or 'models'}.rs"
    return GeneratedCode([GeneratedFile(file_name, code)], _usage(schema, names), names.notes)


def _type_name(type_ref: TypeRef, names: Names) -> str:
    if type_ref.kind == "class":
        return names.class_name(type_ref.class_id)
    if type_ref.kind == "array":
        items = _type_name(type_ref.items, names)
        # serde_json::Value already holds null
        return f"Vec<Option<{items}>>" if type_ref.items_nullable and items != "serde_json::Value" else f"Vec<{items}>"
    return PRIMITIVES[type_ref.name]


def _struct(item: ClassDef, names: Names) -> str:
    fields = []
    for prop in names.properties(item):
        field = prop.field
        type_name = _type_name(field.type, names)
        option = (field.nullable or field.optional) and type_name != "serde_json::Value"
        attributes = []
        if prop.renamed:
            attributes.append(f"rename = {js_string(field.key)}")
        # A field missing from the JSON is None, and stays missing when writing it back
        if field.optional:
            attributes += ["default", 'skip_serializing_if = "Option::is_none"']
        lines = [f"{INDENT}#[serde({', '.join(attributes)})]"] if attributes else []
        lines.append(f"{INDENT}pub {prop.name}: {f'Option<{type_name}>' if option else type_name},")
        fields.append("\n".join(lines))
    return "\n".join(
        [
            "#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]",
            f"pub struct {names.class_name(item.id)} {{",
            *fields,
            "}",
        ]
    )


def _usage(schema: Schema, names: Names) -> str:
    root = names.class_name(schema.classes[0].id)
    is_list = schema.root.kind == "array"
    variable = "items" if is_list else "root"
    return "\n".join(
        [
            '// Cargo.toml: serde = { version = "1", features = ["derive"] }, serde_json = "1"',
            f"let {variable}: {f'Vec<{root}>' if is_list else root} = serde_json::from_str(&text)?;",
            f'println!("{{}}", serde_json::to_string(&{variable})?);',
            "",
        ]
    )


RUST = Generator("rust", "Rust", OPTIONS, False, generate)
