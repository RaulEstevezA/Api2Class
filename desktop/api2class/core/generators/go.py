"""Go structs with json tags. Mirrors web/src/core/generators/go/go.ts."""

from ..naming import split_words, to_pascal_case
from ..schema import ClassDef, Schema, TypeRef
from .common import LanguageRules, Names, no_classes_message, primitives_used
from .types import GeneratedCode, GeneratedFile, GenerateSettings, Generator, GeneratorOption, choices

# Written in capitals in Go names (golint's list): UserId → UserID, ApiUrl → APIURL
INITIALISMS = frozenset(
    "ACL API ASCII CPU CSS DNS EOF GUID HTML HTTP HTTPS ID IP JSON LHS QPS RAM RHS RPC SLA SMTP SQL SSH TCP TLS TTL "
    "UDP UI UID UUID URI URL UTF8 VM XML XMPP XSRF XSS".split()
)

# Dates without time stay as text: time.Time only reads RFC 3339 date-times
PRIMITIVES = {
    "string": "string",
    "integer": "int64",
    "float": "float64",
    "boolean": "bool",
    "date": "string",
    "datetime": "time.Time",
    "uuid": "string",
    "object": "map[string]any",
    "null": "any",
    "any": "any",
}

OPTIONS = (GeneratorOption("style", choices(("struct", "struct + json tags"))),)


def go_name(name: str) -> str:
    """Exported (capitalized) Go name with initialisms in capitals."""
    words = [word.upper() if word.upper() in INITIALISMS else word[:1].upper() + word[1:] for word in split_words(name)]
    return "".join(words) or to_pascal_case(name)


def generate(schema: Schema, settings: GenerateSettings) -> GeneratedCode:
    if not schema.classes:
        return GeneratedCode(
            [GeneratedFile("models.go", f"// {no_classes_message(schema)}\npackage models\n")], None, []
        )

    # Fields must start with a capital to be exported, or encoding/json ignores them
    names = Names(
        schema,
        settings,
        LanguageRules(reserved=frozenset(), default_naming="PascalCase", adjust=go_name, digit_prefix="Field"),
    )
    blocks = [(item, _struct(item, names)) for item in schema.classes]

    def uses_time(item: ClassDef) -> bool:
        return "datetime" in primitives_used(item.fields)

    def header(time: bool) -> str:
        return "package models\n\n" + ('import "time"\n\n' if time else "")

    if settings.multiple_files:
        files = [
            GeneratedFile(f"{_file_name(names.class_name(item.id))}.go", f"{header(uses_time(item))}{code}\n")
            for item, code in blocks
        ]
    else:
        code = "\n\n".join(code for _, code in blocks)
        time = any(uses_time(item) for item in schema.classes)
        files = [GeneratedFile(f"{_file_name(names.class_name(schema.classes[0].id))}.go", f"{header(time)}{code}\n")]
    return GeneratedCode(files, _usage(schema, names), names.notes)


def _file_name(name: str) -> str:
    return "_".join(word.lower() for word in split_words(name)) or "models"


def _type_name(type_ref: TypeRef, names: Names) -> str:
    if type_ref.kind == "class":
        return go_name(names.class_name(type_ref.class_id))
    if type_ref.kind == "array":
        items = _type_name(type_ref.items, names)
        return f"[]*{items}" if type_ref.items_nullable and not _can_be_nil(type_ref.items) else f"[]{items}"
    return PRIMITIVES[type_ref.name]


def _can_be_nil(type_ref: TypeRef) -> bool:
    """Slices, maps and any can already be nil; everything else needs a pointer to be null."""
    return type_ref.kind == "array" or (type_ref.kind == "primitive" and type_ref.name in ("object", "any", "null"))


def _struct(item: ClassDef, names: Names) -> str:
    rows = []
    for prop in names.properties(item):
        field = prop.field
        type_name = _type_name(field.type, names)
        pointer = (field.nullable or field.optional) and not _can_be_nil(field.type)
        # omitempty: a field missing from the JSON stays missing when writing it back
        key = field.key.replace('"', "").replace("\\", "").replace("`", "")
        tag = f'`json:"{key}{",omitempty" if field.optional else ""}"`'
        # Names chosen by the user are capitalized too
        rows.append((prop.name[:1].upper() + prop.name[1:], f"{'*' if pointer else ''}{type_name}", tag))
    # Aligned in columns, as gofmt leaves them
    widths = [max([0, *(len(row[column]) for row in rows)]) for column in (0, 1)]
    lines = [f"\t{name.ljust(widths[0])} {type_name.ljust(widths[1])} {tag}" for name, type_name, tag in rows]
    name = go_name(names.class_name(item.id))
    return f"type {name} struct {{\n" + "\n".join(lines) + "\n}" if lines else f"type {name} struct{{}}"


def _usage(schema: Schema, names: Names) -> str:
    root = go_name(names.class_name(schema.classes[0].id))
    is_list = schema.root.kind == "array"
    variable = "items" if is_list else "root"
    return "\n".join(
        [
            f"var {variable} {f'[]models.{root}' if is_list else f'models.{root}'}",
            f"if err := json.Unmarshal(data, &{variable}); err != nil {{",
            "\treturn err",
            "}",
            "",
        ]
    )


GO = Generator("go", "Go", OPTIONS, True, generate)
