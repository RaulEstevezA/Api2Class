"""Dart: class with fromJson / toJson (and copyWith), json_serializable or freezed.
Mirrors web/src/core/generators/dart/dart.ts."""

from ..naming import to_snake_case
from ..schema import ClassDef, Schema, TypeRef
from .common import LanguageRules, Names, Property, dependencies, no_classes_message
from .types import GeneratedCode, GeneratedFile, GenerateSettings, Generator, GeneratorOption, choices, option_value

KEYWORDS = frozenset(
    "assert break case catch class const continue default do else enum extends false final finally for if in is new "
    "null rethrow return super switch this throw true try var void while with".split()
)

PRIMITIVES = {
    "string": "String",
    "integer": "int",
    "float": "double",
    "boolean": "bool",
    "date": "DateTime",
    "datetime": "DateTime",
    "uuid": "String",
    "object": "Map<String, dynamic>",
    "null": "Object?",
    "any": "dynamic",
}

INDENT = "  "

OPTIONS = (
    GeneratorOption(
        "style",
        choices(
            ("class", "class + fromJson / toJson"), ("json_serializable", "json_serializable"), ("freezed", "freezed")
        ),
    ),
    GeneratorOption("copyWith", choices(("no", "no"), ("yes", "copyWith")), styles=("class",)),
)


def generate(schema: Schema, settings: GenerateSettings) -> GeneratedCode:
    if not schema.classes:
        return GeneratedCode([GeneratedFile("models.dart", f"// {no_classes_message(schema)}\n")], None, [])

    style = option_value(OPTIONS, settings, "style")
    copy_with = option_value(OPTIONS, settings, "copyWith") == "yes"
    names = Names(
        schema,
        settings,
        LanguageRules(
            reserved=KEYWORDS,
            default_naming="camelCase",
            # A leading underscore makes a name private in Dart
            digit_prefix="field",
            escape_reserved=lambda name: f"{name}Value",
        ),
    )

    def file_of(class_id: str) -> str:
        return f"{to_snake_case(names.class_name(class_id)) or 'models'}.dart"

    blocks = []
    for item in schema.classes:
        if style == "freezed":
            code = _freezed_class(item, names)
        elif style == "json_serializable":
            code = _serializable_class(item, names)
        else:
            code = _plain_class(item, names, copy_with)
        blocks.append((item, code))

    def header(file_name: str, local: list[str]) -> str:
        base = file_name.removesuffix(".dart")
        if style == "freezed":
            lines = [
                "import 'package:freezed_annotation/freezed_annotation.dart';",
                *local,
                "",
                f"part '{base}.freezed.dart';",
                f"part '{base}.g.dart';",
            ]
        elif style == "json_serializable":
            lines = ["import 'package:json_annotation/json_annotation.dart';", *local, "", f"part '{base}.g.dart';"]
        else:
            lines = local
        return "\n".join(lines) + "\n\n" if lines else ""

    if settings.multiple_files:
        files = []
        for item, code in blocks:
            local = sorted(
                f"import '{file_of(dependency)}';" for dependency in dependencies(item) if dependency != item.id
            )
            files.append(GeneratedFile(file_of(item.id), f"{header(file_of(item.id), local)}{code}\n"))
    else:
        root_file = file_of(schema.classes[0].id)
        files = [GeneratedFile(root_file, header(root_file, []) + "\n\n".join(code for _, code in blocks) + "\n")]
    return GeneratedCode(files, _usage(schema, names, file_of(schema.classes[0].id)), names.notes)


def _type_name(type_ref: TypeRef, names: Names) -> str:
    if type_ref.kind == "class":
        return names.class_name(type_ref.class_id)
    if type_ref.kind == "array":
        items = _type_name(type_ref.items, names)
        nullable = type_ref.items_nullable and items != "dynamic" and not items.endswith("?")
        return f"List<{items}?>" if nullable else f"List<{items}>"
    return PRIMITIVES[type_ref.name]


def _field_type(prop: Property, names: Names) -> str:
    type_name = _type_name(prop.field.type, names)
    can_be_null = prop.field.nullable or prop.field.optional
    return f"{type_name}?" if can_be_null and type_name != "dynamic" and not type_name.endswith("?") else type_name


def _from_json(type_ref: TypeRef, source: str, names: Names, depth: int = 0) -> str:
    """Dart expression that reads source (a value from jsonDecode) as type_ref."""
    if type_ref.kind == "class":
        return f"{names.class_name(type_ref.class_id)}.fromJson({source} as Map<String, dynamic>)"
    if type_ref.kind == "array":
        item = "e" if depth == 0 else f"e{depth + 1}"
        inner = _from_json(type_ref.items, item, names, depth + 1)
        element = f"{item} == null ? null : {inner}" if type_ref.items_nullable and inner != item else inner
        return f"({source} as List<dynamic>).map(({item}) => {element}).toList()"
    name = type_ref.name
    if name == "integer":
        return f"{source} as int"
    # jsonDecode reads 120 as an int even in a double field
    if name == "float":
        return f"({source} as num).toDouble()"
    if name in ("date", "datetime"):
        return f"DateTime.parse({source} as String)"
    if name == "object":
        return f"{source} as Map<String, dynamic>"
    if name in ("null", "any"):
        return source
    return f"{source} as {PRIMITIVES[name]}"


def _to_json(type_ref: TypeRef, source: str, nullable: bool, depth: int = 0) -> str:
    """Dart expression that turns source back into a JSON value. nullable adds the ?."""
    access = "?." if nullable else "."
    if type_ref.kind == "class":
        return f"{source}{access}toJson()"
    if type_ref.kind == "array":
        item = "e" if depth == 0 else f"e{depth + 1}"
        inner = _to_json(type_ref.items, item, type_ref.items_nullable, depth + 1)
        return source if inner == item else f"{source}{access}map(({item}) => {inner}).toList()"
    if type_ref.name == "datetime":
        return f"{source}{access}toIso8601String()"
    # Back to the date alone, as it came
    if type_ref.name == "date":
        return f"{source}{access}toIso8601String().substring(0, 10)"
    return source


def _constructor(name: str, properties: list[Property]) -> str:
    if not properties:
        return f"{INDENT}const {name}();"
    parameters = [f"{INDENT}{INDENT}{'' if p.field.optional else 'required '}this.{p.name}," for p in properties]
    return "\n".join([f"{INDENT}const {name}({{", *parameters, f"{INDENT}}});"])


def _plain_class(item: ClassDef, names: Names, copy_with: bool) -> str:
    name = names.class_name(item.id)
    properties = names.properties(item)
    lines = [f"class {name} {{"]
    lines += [f"{INDENT}final {_field_type(p, names)} {p.name};" for p in properties]
    if properties:
        lines.append("")
    lines += [_constructor(name, properties), ""]

    reads = []
    for p in properties:
        source = f"json[{_quote(p.field.key)}]"
        value = _from_json(p.field.type, source, names)
        read = (
            f"{source} == null ? null : {value}"
            if (p.field.nullable or p.field.optional) and value != source
            else value
        )
        reads.append(f"{INDENT}{INDENT}{INDENT}{p.name}: {read},")
    writes = []
    for p in properties:
        key = _quote(p.field.key)
        if p.field.optional:
            # A field missing from the JSON stays missing instead of becoming null
            writes.append(
                f"{INDENT}{INDENT}{INDENT}if ({p.name} != null) {key}: {_to_json(p.field.type, f'{p.name}!', False)},"
            )
        else:
            writes.append(f"{INDENT}{INDENT}{INDENT}{key}: {_to_json(p.field.type, p.name, p.field.nullable)},")
    lines += [
        f"{INDENT}factory {name}.fromJson(Map<String, dynamic> json) => {name}(",
        *reads,
        f"{INDENT}{INDENT});",
        "",
        f"{INDENT}Map<String, dynamic> toJson() => {{",
        *writes,
        f"{INDENT}{INDENT}}};",
    ]

    if copy_with and properties:
        parameters = []
        for p in properties:
            type_name = _field_type(p, names)
            nullable_type = type_name if type_name == "dynamic" or type_name.endswith("?") else f"{type_name}?"
            parameters.append(f"{INDENT}{INDENT}{nullable_type} {p.name},")
        lines += [
            "",
            f"{INDENT}{name} copyWith({{",
            *parameters,
            f"{INDENT}}}) =>",
            f"{INDENT}{INDENT}{INDENT}{name}(",
            *(f"{INDENT * 4}{p.name}: {p.name} ?? this.{p.name}," for p in properties),
            f"{INDENT}{INDENT}{INDENT});",
        ]
    lines.append("}")
    return "\n".join(lines)


def _json_key(prop: Property) -> str:
    return f"@JsonKey(name: {_quote(prop.field.key)})" if prop.renamed else ""


def _serializable_class(item: ClassDef, names: Names) -> str:
    name = names.class_name(item.id)
    properties = names.properties(item)
    lines = ["@JsonSerializable(explicitToJson: true)", f"class {name} {{"]
    for p in properties:
        key = _json_key(p)
        if key:
            lines.append(f"{INDENT}{key}")
        lines.append(f"{INDENT}final {_field_type(p, names)} {p.name};")
    if properties:
        lines.append("")
    lines += [
        _constructor(name, properties),
        "",
        f"{INDENT}factory {name}.fromJson(Map<String, dynamic> json) => _${name}FromJson(json);",
        "",
        f"{INDENT}Map<String, dynamic> toJson() => _${name}ToJson(this);",
        "}",
    ]
    return "\n".join(lines)


def _freezed_class(item: ClassDef, names: Names) -> str:
    name = names.class_name(item.id)
    parameters = []
    for p in names.properties(item):
        key = _json_key(p)
        prefix = f"{key} " if key else ""
        parameters.append(
            f"{INDENT}{INDENT}{prefix}{'' if p.field.optional else 'required '}{_field_type(p, names)} {p.name},"
        )
    factory = (
        f"{INDENT}const factory {name}({{\n" + "\n".join(parameters) + f"\n{INDENT}}}) = _{name};"
        if parameters
        else f"{INDENT}const factory {name}() = _{name};"
    )
    return "\n".join(
        [
            "@freezed",
            f"abstract class {name} with _${name} {{",
            factory,
            "",
            f"{INDENT}factory {name}.fromJson(Map<String, dynamic> json) => _${name}FromJson(json);",
            "}",
        ]
    )


def _quote(text: str) -> str:
    # Single quotes as Dart style prefers; $ starts an interpolation, so it is escaped too
    escaped = text.replace("\\", "\\\\").replace("'", "\\'").replace("$", "\\$").replace("\n", "\\n")
    return f"'{escaped}'"


def _usage(schema: Schema, names: Names, file_name: str) -> str:
    root = names.class_name(schema.classes[0].id)
    is_list = schema.root.kind == "array"
    read = (
        "final items = (jsonDecode(text) as List<dynamic>)"
        f".map((e) => {root}.fromJson(e as Map<String, dynamic>)).toList();"
        if is_list
        else f"final root = {root}.fromJson(jsonDecode(text) as Map<String, dynamic>);"
    )
    write = "print(jsonEncode(items));" if is_list else "print(jsonEncode(root.toJson()));"
    return "\n".join(["import 'dart:convert';", "", f"import '{file_name}';", "", read, write, ""])


DART = Generator("dart", "Dart", OPTIONS, True, generate)
