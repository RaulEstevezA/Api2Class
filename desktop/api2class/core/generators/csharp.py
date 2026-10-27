"""C#: class or record, with System.Text.Json or Newtonsoft.Json. Mirrors web/src/core/generators/csharp/csharp.ts."""

from ..jsstring import js_string
from ..schema import ClassDef, Schema, TypeRef
from .common import LanguageRules, Names, Property, no_classes_message, required_first
from .types import GeneratedCode, GeneratedFile, GenerateSettings, Generator, GeneratorOption, choices, option_value

KEYWORDS = frozenset(
    "abstract as base bool break byte case catch char checked class const continue decimal default delegate do double "
    "else enum event explicit extern false finally fixed float for foreach goto if implicit in int interface internal "
    "is lock long namespace new null object operator out override params private protected public readonly ref return "
    "sbyte sealed short sizeof stackalloc static string struct switch this throw true try typeof uint ulong unchecked "
    "unsafe ushort using virtual void volatile while".split()
)

PRIMITIVES = {
    "string": "string",
    "integer": "long",
    "float": "double",
    "boolean": "bool",
    "date": "DateOnly",
    "datetime": "DateTimeOffset",
    "uuid": "Guid",
    "object": "Dictionary<string, object?>",
    "null": "object?",
    "any": "object?",
}

ATTRIBUTES = {
    "system.text.json": ("System.Text.Json.Serialization", "JsonPropertyName"),
    "newtonsoft": ("Newtonsoft.Json", "JsonProperty"),
}

INDENT = "    "

OPTIONS = (
    GeneratorOption("style", choices(("class", "class"), ("record", "record"))),
    GeneratorOption("library", choices(("system.text.json", "System.Text.Json"), ("newtonsoft", "Newtonsoft.Json"))),
)


def generate(schema: Schema, settings: GenerateSettings) -> GeneratedCode:
    if not schema.classes:
        return GeneratedCode([GeneratedFile("Models.cs", f"// {no_classes_message(schema)}\n")], None, [])

    style = option_value(OPTIONS, settings, "style")
    library = option_value(OPTIONS, settings, "library")
    # C# escapes keywords with @, and properties are PascalCase
    names = Names(
        schema,
        settings,
        LanguageRules(reserved=KEYWORDS, default_naming="PascalCase", escape_reserved=lambda name: f"@{name}"),
    )

    blocks = []
    for item in schema.classes:
        usings: set[str] = set()
        code = _record(item, names, library, usings) if style == "record" else _class(item, names, library, usings)
        blocks.append((item, code, usings))

    def with_usings(usings: set[str], code: str) -> str:
        # System namespaces first, then the rest
        lines = sorted(usings, key=lambda name: (not name.startswith("System"), name))
        header = "\n".join(f"using {line};" for line in lines) + ("\n\n" if lines else "")
        # Nullable reference types, so string? and string mean what they say
        return f"{header}#nullable enable\n\n{code}\n"

    if settings.multiple_files:
        files = [
            GeneratedFile(f"{names.class_name(item.id)}.cs", with_usings(usings, code)) for item, code, usings in blocks
        ]
    else:
        all_usings = set().union(*(usings for _, _, usings in blocks))
        code = "\n\n".join(code for _, code, _ in blocks)
        files = [GeneratedFile(f"{names.class_name(schema.classes[0].id)}.cs", with_usings(all_usings, code))]
    return GeneratedCode(files, _usage(schema, names, library), names.notes)


def _type_name(type_ref: TypeRef, names: Names, usings: set[str]) -> str:
    if type_ref.kind == "class":
        return names.class_name(type_ref.class_id)
    if type_ref.kind == "array":
        usings.add("System.Collections.Generic")
        items = _type_name(type_ref.items, names, usings)
        return f"List<{items}?>" if type_ref.items_nullable and not items.endswith("?") else f"List<{items}>"
    if type_ref.name in ("date", "datetime", "uuid"):
        usings.add("System")
    if type_ref.name == "object":
        usings.add("System.Collections.Generic")
    return PRIMITIVES[type_ref.name]


def _property_type(prop: Property, names: Names, usings: set[str]) -> str:
    """The property type: ? when it can be null or missing."""
    type_name = _type_name(prop.field.type, names, usings)
    return (
        f"{type_name}?" if (prop.field.nullable or prop.field.optional) and not type_name.endswith("?") else type_name
    )


def _member_name(prop: Property, class_name: str) -> str:
    """C# does not allow a member named like its class: Item.Item becomes Item.ItemValue."""
    return f"{prop.name}Value" if prop.name == class_name else prop.name


def _attribute(prop: Property, name: str, library: str, usings: set[str]) -> str | None:
    if name == prop.field.key:
        return None
    using, attribute = ATTRIBUTES[library]
    usings.add(using)
    return f"[{attribute}({js_string(prop.field.key)})]"


def _class(item: ClassDef, names: Names, library: str, usings: set[str]) -> str:
    class_name = names.class_name(item.id)
    members = []
    for prop in names.properties(item):
        name = _member_name(prop, class_name)
        lines = []
        attribute = _attribute(prop, name, library, usings)
        if attribute:
            lines.append(f"{INDENT}{attribute}")
        # required: the JSON always has it, and System.Text.Json fails if it is missing
        required = "" if prop.field.optional else "required "
        lines.append(f"{INDENT}public {required}{_property_type(prop, names, usings)} {name} {{ get; set; }}")
        members.append("\n".join(lines))
    return f"public class {class_name}\n{{\n" + "\n\n".join(members) + ("\n" if members else "") + "}"


def _record(item: ClassDef, names: Names, library: str, usings: set[str]) -> str:
    class_name = names.class_name(item.id)
    # Parameters with a default value must come last
    parameters = []
    for prop in required_first(names.properties(item)):
        name = _member_name(prop, class_name)
        attribute = _attribute(prop, name, library, usings)
        prefix = f"[property: {attribute[1:-1]}] " if attribute else ""
        default = " = null" if prop.field.optional else ""
        parameters.append(f"{INDENT}{prefix}{_property_type(prop, names, usings)} {name}{default}")
    if not parameters:
        return f"public record {class_name}();"
    return f"public record {class_name}(\n" + ",\n".join(parameters) + "\n);"


def _usage(schema: Schema, names: Names, library: str) -> str:
    root = names.class_name(schema.classes[0].id)
    is_list = schema.root.kind == "array"
    type_name = f"List<{root}>" if is_list else root
    variable = "items" if is_list else "root"
    if library == "newtonsoft":
        return f"var {variable} = JsonConvert.DeserializeObject<{type_name}>(json);\n"
    return f"using System.Text.Json;\n\nvar {variable} = JsonSerializer.Deserialize<{type_name}>(json);\n"


CSHARP = Generator("csharp", "C#", OPTIONS, True, generate)
