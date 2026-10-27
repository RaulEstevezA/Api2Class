"""TypeScript: interface, type or Zod 4 schemas. Mirrors web/src/core/generators/typescript/typescript.ts."""

import re

from ..jsstring import js_string
from ..schema import ClassDef, Schema, TypeRef
from .common import LanguageRules, Names, Property, dependencies, dependency_order, no_classes_message
from .types import GeneratedCode, GeneratedFile, GenerateSettings, Generator, GeneratorOption, choices, option_value

# Reserved as type names; property names can be any string
RESERVED_TYPES = frozenset(
    "any boolean break case catch class const continue debugger default delete do else enum export extends false "
    "finally for function if import in instanceof never new null number object return string super switch symbol "
    "this throw true try typeof undefined unknown var void while with".split()
)

# Dates and UUIDs arrive as strings: JSON.parse does not turn them into Date objects
PRIMITIVES = {
    "string": "string",
    "integer": "number",
    "float": "number",
    "boolean": "boolean",
    "date": "string",
    "datetime": "string",
    "uuid": "string",
    "object": "Record<string, unknown>",
    "null": "null",
    "any": "unknown",
}

# Zod 4
ZOD = {
    "string": "z.string()",
    "integer": "z.number().int()",
    "float": "z.number()",
    "boolean": "z.boolean()",
    "date": "z.iso.date()",
    "datetime": "z.iso.datetime({ offset: true })",
    "uuid": "z.uuid()",
    "object": "z.record(z.string(), z.unknown())",
    "null": "z.null()",
    "any": "z.unknown()",
}

INDENT = "  "
IDENTIFIER = re.compile(r"^[A-Za-z_$][\w$]*$", re.ASCII)

OPTIONS = (GeneratorOption("style", choices(("interface", "interface"), ("type", "type"), ("zod", "Zod"))),)


def generate(schema: Schema, settings: GenerateSettings) -> GeneratedCode:
    if not schema.classes:
        return GeneratedCode([GeneratedFile("model.ts", f"// {no_classes_message(schema)}\n")], None, [])

    style = option_value(OPTIONS, settings, "style")
    names = Names(
        schema, settings, LanguageRules(reserved=RESERVED_TYPES, default_naming="keep", any_property_name=True)
    )
    zod = style == "zod"
    # Zod schemas are constants: each one has to be declared after the ones it uses
    classes = dependency_order(schema) if zod else schema.classes
    blocks = [(item, _zod_schema(item, names) if zod else _declaration(item, names, style)) for item in classes]

    root_name = names.class_name(schema.classes[0].id)
    if settings.multiple_files:
        files = []
        for item, code in blocks:
            imports = []
            for dependency in dependencies(item):
                if dependency == item.id:
                    continue
                name = names.class_name(dependency)
                imports.append(
                    f"import {{ {name}Schema }} from './{name}';"
                    if zod
                    else f"import type {{ {name} }} from './{name}';"
                )
            header = (["import { z } from 'zod';"] if zod else []) + sorted(imports)
            prefix = "\n".join(header) + "\n\n" if header else ""
            files.append(GeneratedFile(f"{names.class_name(item.id)}.ts", f"{prefix}{code}\n"))
    else:
        header = "import { z } from 'zod';\n\n" if zod else ""
        files = [GeneratedFile(f"{root_name}.ts", header + "\n\n".join(code for _, code in blocks) + "\n")]
    return GeneratedCode(files, _usage(schema, root_name, style), names.notes)


def _property_key(prop: Property) -> str:
    """Property as written in the type: the JSON key (quoted when it needs it), or the name chosen."""
    return prop.name if IDENTIFIER.match(prop.name) else js_string(prop.name)


def _type_name(type_ref: TypeRef, names: Names) -> str:
    if type_ref.kind == "class":
        return names.class_name(type_ref.class_id)
    if type_ref.kind == "array":
        items = _type_name(type_ref.items, names)
        return f"({items} | null)[]" if type_ref.items_nullable else f"{items}[]"
    return PRIMITIVES[type_ref.name]


def _declaration(item: ClassDef, names: Names, style: str) -> str:
    lines = []
    for prop in names.properties(item):
        field = prop.field
        type_name = _type_name(field.type, names)
        type_text = f"{type_name} | null" if field.nullable and type_name != "null" else type_name
        line = f"{INDENT}{_property_key(prop)}{'?' if field.optional else ''}: {type_text};"
        # Interfaces describe the JSON as it arrives: a renamed property no longer matches it
        lines.append(f"{line} // JSON: {js_string(field.key)}" if prop.renamed else line)
    name = names.class_name(item.id)
    body = "{\n" + "\n".join(lines) + "\n}" if lines else "{}"
    return f"export type {name} = {body};" if style == "type" else f"export interface {name} {body}"


def _zod_type(type_ref: TypeRef, names: Names) -> str:
    if type_ref.kind == "class":
        return f"{names.class_name(type_ref.class_id)}Schema"
    if type_ref.kind == "array":
        return f"z.array({_zod_type(type_ref.items, names)}{'.nullable()' if type_ref.items_nullable else ''})"
    return ZOD[type_ref.name]


def _zod_schema(item: ClassDef, names: Names) -> str:
    name = names.class_name(item.id)
    # Zod validates the JSON as it arrives, so properties are always its keys
    lines = []
    for prop in names.properties(item):
        field = prop.field
        key = field.key if IDENTIFIER.match(field.key) else js_string(field.key)
        only_null = field.type.kind == "primitive" and field.type.name == "null"
        nullable = ".nullable()" if field.nullable and not only_null else ""
        lines.append(
            f"{INDENT}{key}: {_zod_type(field.type, names)}{nullable}{'.optional()' if field.optional else ''},"
        )
    obj = "z.object({\n" + "\n".join(lines) + "\n})" if lines else "z.object({})"
    return f"export const {name}Schema = {obj};\nexport type {name} = z.infer<typeof {name}Schema>;"


def _usage(schema: Schema, root_name: str, style: str) -> str:
    is_list = schema.root.kind == "array"
    if style == "zod":
        read = (
            f"const items = {root_name}Schema.array().parse(JSON.parse(text));"
            if is_list
            else f"const root = {root_name}Schema.parse(JSON.parse(text));"
        )
        return "\n".join(
            [
                f"import {{ {root_name}Schema }} from './{root_name}';",
                "",
                "// Throws if the response does not match the model",
                read,
                "",
            ]
        )
    read = (
        f"const items = JSON.parse(text) as {root_name}[];"
        if is_list
        else f"const root = JSON.parse(text) as {root_name};"
    )
    return "\n".join(
        [
            f"import type {{ {root_name} }} from './{root_name}';",
            "",
            "// Types are not checked at run time: the JSON is trusted to match",
            read,
            "",
        ]
    )


TYPESCRIPT = Generator("typescript", "TypeScript", OPTIONS, True, generate)
