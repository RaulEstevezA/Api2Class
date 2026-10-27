"""Kotlin data classes with kotlinx.serialization, Gson or Moshi. Mirrors web/src/core/generators/kotlin/kotlin.ts."""

from ..jsstring import js_string
from ..schema import ClassDef, Schema, TypeRef
from .common import LanguageRules, Names, Property, no_classes_message
from .types import GeneratedCode, GeneratedFile, GenerateSettings, Generator, GeneratorOption, choices, option_value

# Hard keywords: they can still be used as names between backticks
KEYWORDS = frozenset(
    "as break class continue do else false for fun if in interface is null object package return super this throw "
    "true try typealias typeof val var when while".split()
)

# Dates and UUIDs stay as their text: none of the libraries reads java.time without extra adapters
PRIMITIVES = {
    "string": "String",
    "integer": "Long",
    "float": "Double",
    "boolean": "Boolean",
    "date": "String",
    "datetime": "String",
    "uuid": "String",
    "object": "Map<String, Any?>",
    "null": "Any?",
    "any": "Any?",
}

KOTLINX = {
    "object": ("JsonObject", "kotlinx.serialization.json.JsonObject"),
    "null": ("JsonElement?", "kotlinx.serialization.json.JsonElement"),
    "any": ("JsonElement?", "kotlinx.serialization.json.JsonElement"),
}

INDENT = "    "

OPTIONS = (
    GeneratorOption("style", choices(("data-class", "data class"))),
    GeneratorOption(
        "library", choices(("kotlinx", "kotlinx.serialization"), ("gson", "Gson"), ("moshi", "Moshi"), ("none", "none"))
    ),
)


def generate(schema: Schema, settings: GenerateSettings) -> GeneratedCode:
    if not schema.classes:
        return GeneratedCode([GeneratedFile("Models.kt", f"// {no_classes_message(schema)}\n")], None, [])

    library = option_value(OPTIONS, settings, "library")
    names = Names(
        schema,
        settings,
        LanguageRules(reserved=KEYWORDS, default_naming="camelCase", escape_reserved=lambda name: f"`{name}`"),
    )
    blocks = []
    for item in schema.classes:
        imports: set[str] = set()
        blocks.append((item, _data_class(item, names, library, imports), imports))

    def with_imports(imports: set[str], code: str) -> str:
        lines = [f"import {path}" for path in sorted(imports)]
        return ("\n".join(lines) + "\n\n" if lines else "") + f"{code}\n"

    if settings.multiple_files:
        files = [
            GeneratedFile(f"{names.class_name(item.id)}.kt", with_imports(imports, code))
            for item, code, imports in blocks
        ]
    else:
        all_imports = set().union(*(imports for _, _, imports in blocks))
        code = "\n\n".join(code for _, code, _ in blocks)
        files = [GeneratedFile(f"{names.class_name(schema.classes[0].id)}.kt", with_imports(all_imports, code))]
    return GeneratedCode(files, _usage(schema, names, library), names.notes)


def _type_name(type_ref: TypeRef, names: Names, library: str, imports: set[str]) -> str:
    if type_ref.kind == "class":
        return names.class_name(type_ref.class_id)
    if type_ref.kind == "array":
        items = _type_name(type_ref.items, names, library, imports)
        return f"List<{items}?>" if type_ref.items_nullable and not items.endswith("?") else f"List<{items}>"
    if library == "kotlinx" and type_ref.name in KOTLINX:
        name, path = KOTLINX[type_ref.name]
        imports.add(path)
        return name
    return PRIMITIVES[type_ref.name]


def _json_name(prop: Property, library: str, imports: set[str]) -> str | None:
    if not prop.renamed or library == "none":
        return None
    key = js_string(prop.field.key)
    if library == "kotlinx":
        imports.add("kotlinx.serialization.SerialName")
        return f"@SerialName({key})"
    if library == "gson":
        imports.add("com.google.gson.annotations.SerializedName")
        return f"@SerializedName({key})"
    imports.add("com.squareup.moshi.Json")
    return f"@Json(name = {key})"


def _data_class(item: ClassDef, names: Names, library: str, imports: set[str]) -> str:
    parameters = []
    for prop in names.properties(item):
        field = prop.field
        type_name = _type_name(field.type, names, library, imports)
        if (field.nullable or field.optional) and not type_name.endswith("?"):
            type_name += "?"
        annotation = _json_name(prop, library, imports)
        # A default value lets kotlinx and Moshi accept the field when it is missing
        parameter = f"{INDENT}val {prop.name}: {type_name}{' = null' if field.optional else ''},"
        parameters.append(f"{INDENT}{annotation}\n{parameter}" if annotation else parameter)
    annotations = []
    if library == "kotlinx":
        imports.add("kotlinx.serialization.Serializable")
        annotations.append("@Serializable")
    elif library == "moshi":
        imports.add("com.squareup.moshi.JsonClass")
        annotations.append("@JsonClass(generateAdapter = true)")
    name = names.class_name(item.id)
    # A data class needs at least one property
    declaration = f"data class {name}(\n" + "\n".join(parameters) + "\n)" if parameters else f"class {name}"
    return "\n".join([*annotations, declaration])


def _usage(schema: Schema, names: Names, library: str) -> str | None:
    root = names.class_name(schema.classes[0].id)
    is_list = schema.root.kind == "array"
    type_name = f"List<{root}>" if is_list else root
    variable = "items" if is_list else "root"
    if library == "kotlinx":
        return "\n".join(
            [
                "import kotlinx.serialization.json.Json",
                "",
                "val json = Json { ignoreUnknownKeys = true }",
                f"val {variable} = json.decodeFromString<{type_name}>(text)",
                "",
            ]
        )
    if library == "gson":
        if is_list:
            return f"val {variable}: {type_name} = Gson().fromJson(text, object : TypeToken<{type_name}>() {{}}.type)\n"
        return f"val {variable} = Gson().fromJson(text, {root}::class.java)\n"
    if library == "moshi":
        if is_list:
            adapter = f"adapter<{type_name}>(Types.newParameterizedType(List::class.java, {root}::class.java))"
        else:
            adapter = f"adapter({root}::class.java)"
        return f"val adapter = Moshi.Builder().build().{adapter}\nval {variable} = adapter.fromJson(text)\n"
    return None


KOTLIN = Generator("kotlin", "Kotlin", OPTIONS, True, generate)
