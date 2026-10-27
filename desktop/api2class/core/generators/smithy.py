"""Smithy IDL 2.0. Mirrors web/src/core/generators/smithy/smithy.ts."""

from ..jsstring import js_string
from ..naming import to_snake_case
from ..schema import ClassDef, Schema, TypeRef
from .common import LanguageRules, Names, no_classes_message
from .types import GeneratedCode, GeneratedFile, GenerateSettings, Generator, GeneratorOption, choices

# A date-time is a timestamp written as RFC 3339; dates and UUIDs are strings
PRIMITIVES = {
    "string": "String",
    "integer": "Long",
    "float": "Double",
    "boolean": "Boolean",
    "date": "String",
    "datetime": "Timestamp",
    "uuid": "String",
    "object": "Document",
    "null": "Document",
    "any": "Document",
}

# Shapes of the prelude: a structure with one of these names would hide it
PRELUDE = frozenset(
    "BigDecimal BigInteger Blob Boolean Byte Document Double Float Integer Long PrimitiveBoolean PrimitiveByte "
    "PrimitiveDouble PrimitiveFloat PrimitiveInteger PrimitiveLong PrimitiveShort Short String Timestamp Unit".split()
)

INDENT = "    "

OPTIONS = (GeneratorOption("style", choices(("idl-2", "IDL 2.0"))),)


def generate(schema: Schema, settings: GenerateSettings) -> GeneratedCode:
    if not schema.classes:
        return GeneratedCode([GeneratedFile("model.smithy", f"// {no_classes_message(schema)}\n")], None, [])

    names = Names(
        schema,
        settings,
        LanguageRules(
            reserved=frozenset(),
            reserved_classes=PRELUDE,
            default_naming="camelCase",
            escape_reserved=lambda name: f"{name}Shape",
            # Smithy identifiers cannot start with _ followed by a digit
            digit_prefix="field",
        ),
    )
    # Smithy has no inline list types: every list is a shape with a name (OrderList, StringList)
    lists: dict[str, str] = {}

    def shape_name(type_ref: TypeRef) -> str:
        if type_ref.kind == "class":
            return names.class_name(type_ref.class_id)
        if type_ref.kind == "primitive":
            return PRIMITIVES[type_ref.name]
        member = shape_name(type_ref.items)
        name = f"{member}{'Sparse' if type_ref.items_nullable else ''}List"
        if name not in lists:
            # @sparse lets a list hold nulls
            sparse = "@sparse\n" if type_ref.items_nullable else ""
            lists[name] = f"{sparse}list {name} {{\n{INDENT}member: {member}\n}}"
        return name

    structures = [_structure(item, names, shape_name) for item in schema.classes]
    code = "\n".join(
        ['$version: "2"', "", "namespace example.api", "", "\n\n".join([*structures, *lists.values()]), ""]
    )
    file_name = f"{to_snake_case(names.class_name(schema.classes[0].id)) or 'model'}.smithy"
    return GeneratedCode([GeneratedFile(file_name, code)], None, names.notes)


def _structure(item: ClassDef, names: Names, shape_name) -> str:
    members = []
    for prop in names.properties(item):
        field = prop.field
        traits = []
        # A member that can be missing or null is not @required
        only_null = field.type.kind == "primitive" and field.type.name == "null"
        if not field.optional and not field.nullable and not only_null:
            traits.append("@required")
        if prop.renamed:
            traits.append(f"@jsonName({js_string(field.key)})")
        if field.type.kind == "primitive" and field.type.name == "datetime":
            traits.append('@timestampFormat("date-time")')
        members.append(
            "\n".join([*(f"{INDENT}{trait}" for trait in traits), f"{INDENT}{prop.name}: {shape_name(field.type)}"])
        )
    inside = "\n" + "\n\n".join(members) + "\n" if members else ""
    return f"structure {names.class_name(item.id)} {{{inside}}}"


SMITHY = Generator("smithy", "Smithy", OPTIONS, False, generate)
