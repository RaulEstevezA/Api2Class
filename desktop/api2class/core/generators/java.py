"""Java: POJO, record or Lombok, with Jackson, Gson or no annotations. Mirrors web/src/core/generators/java/java.ts."""

from ..jsstring import js_string
from ..schema import ClassDef, Schema, TypeRef
from .common import LanguageRules, Names, Property, no_classes_message
from .types import GeneratedCode, GeneratedFile, GenerateSettings, Generator, GeneratorOption, choices, option_value

KEYWORDS = frozenset(
    "abstract assert boolean break byte case catch char class const continue default do double else enum extends "
    "false final finally float for goto if implements import instanceof int interface long native new null package "
    "private protected public return short static strictfp super switch synchronized this throw throws transient true "
    "try void volatile while var record yield _".split()
)

# Boxed types, so any field can be null
PRIMITIVES = {
    "string": "String",
    "integer": "Long",
    "float": "Double",
    "boolean": "Boolean",
    "date": "LocalDate",
    "datetime": "OffsetDateTime",
    "uuid": "UUID",
    "object": "Map<String, Object>",
    "null": "Object",
    "any": "Object",
}

IMPORTS = {
    "date": "java.time.LocalDate",
    "datetime": "java.time.OffsetDateTime",
    "object": "java.util.Map",
    "uuid": "java.util.UUID",
}

ANNOTATIONS = {
    "jackson": ("com.fasterxml.jackson.annotation.JsonProperty", "JsonProperty"),
    "gson": ("com.google.gson.annotations.SerializedName", "SerializedName"),
}

INDENT = "    "

OPTIONS = (
    GeneratorOption("style", choices(("pojo", "POJO"), ("record", "record"), ("lombok", "Lombok"))),
    GeneratorOption("library", choices(("jackson", "Jackson"), ("gson", "Gson"), ("none", "none"))),
)


def generate(schema: Schema, settings: GenerateSettings) -> GeneratedCode:
    if not schema.classes:
        return GeneratedCode([GeneratedFile("Model.java", f"// {no_classes_message(schema)}\n")], None, [])

    style = option_value(OPTIONS, settings, "style")
    library = option_value(OPTIONS, settings, "library")
    names = Names(schema, settings, LanguageRules(reserved=KEYWORDS, default_naming="camelCase"))

    blocks = []
    for index, item in enumerate(schema.classes):
        imports: set[str] = set()
        # Only one class per file can be public, named like the file
        visibility = "public " if settings.multiple_files or index == 0 else ""
        if style == "record":
            code = _record(item, names, library, imports, visibility)
        elif style == "lombok":
            code = _lombok_class(item, names, library, imports, visibility)
        else:
            code = _pojo(item, names, library, imports, visibility)
        blocks.append((item, code, imports))

    def with_imports(imports: set[str], code: str) -> str:
        lines = [f"import {path};" for path in sorted(imports)]
        return ("\n".join(lines) + "\n\n" if lines else "") + f"{code}\n"

    if settings.multiple_files:
        files = [
            GeneratedFile(f"{names.class_name(item.id)}.java", with_imports(imports, code))
            for item, code, imports in blocks
        ]
    else:
        all_imports = set().union(*(imports for _, _, imports in blocks))
        code = "\n\n".join(code for _, code, _ in blocks)
        files = [GeneratedFile(f"{names.class_name(schema.classes[0].id)}.java", with_imports(all_imports, code))]
    return GeneratedCode(files, _usage(schema, names, library), names.notes)


def _type_name(type_ref: TypeRef, names: Names, library: str, imports: set[str]) -> str:
    if type_ref.kind == "class":
        return names.class_name(type_ref.class_id)
    if type_ref.kind == "array":
        imports.add("java.util.List")
        return f"List<{_type_name(type_ref.items, names, library, imports)}>"
    # Gson has no adapters for java.time: dates stay as their ISO text
    if library == "gson" and type_ref.name in ("date", "datetime"):
        return "String"
    if type_ref.name in IMPORTS:
        imports.add(IMPORTS[type_ref.name])
    return PRIMITIVES[type_ref.name]


def _json_name(prop: Property, library: str, imports: set[str]) -> str | None:
    """The annotation that maps a renamed property to its JSON key, if the library needs one."""
    if not prop.renamed or library == "none":
        return None
    path, name = ANNOTATIONS[library]
    imports.add(path)
    return f"@{name}({js_string(prop.field.key)})"


def _field_declarations(item: ClassDef, names: Names, library: str, imports: set[str]) -> list[str]:
    result = []
    for prop in names.properties(item):
        annotation = _json_name(prop, library, imports)
        declaration = f"{INDENT}private {_type_name(prop.field.type, names, library, imports)} {prop.name};"
        comment = f" // JSON: {js_string(prop.field.key)}" if prop.renamed and library == "none" else ""
        result.append(f"{INDENT}{annotation}\n{declaration}" if annotation else declaration + comment)
    return result


def _pojo(item: ClassDef, names: Names, library: str, imports: set[str], visibility: str) -> str:
    declarations = _field_declarations(item, names, library, imports)
    accessors = []
    for prop in names.properties(item):
        type_name = _type_name(prop.field.type, names, library, imports)
        # userId → getUserId; class_ → getClass_ (getClass is final in Object)
        suffix = prop.name[:1].upper() + prop.name[1:]
        accessors.append(
            "\n".join(
                [
                    f"{INDENT}public {type_name} get{suffix}() {{",
                    f"{INDENT}{INDENT}return {prop.name};",
                    f"{INDENT}}}",
                    "",
                    f"{INDENT}public void set{suffix}({type_name} {prop.name}) {{",
                    f"{INDENT}{INDENT}this.{prop.name} = {prop.name};",
                    f"{INDENT}}}",
                ]
            )
        )
    header = f"{visibility}class {names.class_name(item.id)} {{"
    body = [part for part in ["\n".join(declarations), *accessors] if part != ""]
    return f"{header}\n" + "\n\n".join(body) + "\n}" if body else f"{header}\n}}"


def _lombok_class(item: ClassDef, names: Names, library: str, imports: set[str], visibility: str) -> str:
    imports.add("lombok.Data")
    declarations = _field_declarations(item, names, library, imports)
    header = f"@Data\n{visibility}class {names.class_name(item.id)} {{"
    return f"{header}\n" + "\n".join(declarations) + "\n}" if declarations else f"{header}\n}}"


def _record(item: ClassDef, names: Names, library: str, imports: set[str], visibility: str) -> str:
    components = []
    for prop in names.properties(item):
        annotation = _json_name(prop, library, imports)
        component = f"{_type_name(prop.field.type, names, library, imports)} {prop.name}"
        components.append(f"{INDENT}{annotation + ' ' if annotation else ''}{component}")
    name = f"{visibility}record {names.class_name(item.id)}"
    return f"{name}(\n" + ",\n".join(components) + "\n) {}" if components else f"{name}() {{}}"


def _usage(schema: Schema, names: Names, library: str) -> str | None:
    root = names.class_name(schema.classes[0].id)
    is_list = schema.root.kind == "array"
    if library == "jackson":
        read = (
            f"List<{root}> items = mapper.readValue(json, new TypeReference<List<{root}>>() {{}});"
            if is_list
            else f"{root} root = mapper.readValue(json, {root}.class);"
        )
        return "\n".join(
            [
                "ObjectMapper mapper = new ObjectMapper()",
                "    .findAndRegisterModules() // java.time types (jackson-datatype-jsr310)",
                "    .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);",
                read,
                "",
            ]
        )
    if library == "gson":
        read = (
            f"List<{root}> items = gson.fromJson(json, new TypeToken<List<{root}>>() {{}}.getType());"
            if is_list
            else f"{root} root = gson.fromJson(json, {root}.class);"
        )
        return "\n".join(["Gson gson = new Gson();", read, ""])
    return None


JAVA = Generator("java", "Java", OPTIONS, True, generate)
