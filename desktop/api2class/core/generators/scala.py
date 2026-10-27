"""Scala 3 case classes deriving circe codecs. Mirrors web/src/core/generators/scala/scala.ts."""

import re
from dataclasses import replace

from ..schema import ClassDef, Schema, TypeRef
from .common import LanguageRules, Names, no_classes_message
from .types import GeneratedCode, GeneratedFile, GenerateSettings, Generator, GeneratorOption, choices

KEYWORDS = frozenset(
    "abstract case catch class def do else enum export extends false final finally for forSome given if implicit "
    "import lazy match new null object override package private protected return sealed super then this throw trait "
    "true try type val var while with yield".split()
)

PRIMITIVES = {
    "string": "String",
    "integer": "Long",
    "float": "Double",
    "boolean": "Boolean",
    "date": "LocalDate",
    "datetime": "OffsetDateTime",
    "uuid": "UUID",
    "object": "JsonObject",
    "null": "Json",
    "any": "Json",
}

INDENT = "  "
IDENTIFIER = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")

OPTIONS = (GeneratorOption("style", choices(("circe", "case class + circe"))),)


def generate(schema: Schema, settings: GenerateSettings) -> GeneratedCode:
    if not schema.classes:
        return GeneratedCode([GeneratedFile("Models.scala", f"// {no_classes_message(schema)}\n")], None, [])

    # circe derives the codecs from the field names, so fields keep the JSON keys (between backticks when
    # they are not plain identifiers): property naming and renames do not apply
    names = Names(
        schema,
        replace(settings, naming="keep"),
        LanguageRules(reserved=KEYWORDS, default_naming="keep", any_property_name=True),
    )
    used: set[str] = set()
    body = "\n\n".join(_case_class(item, names, used) for item in schema.classes)
    imports = []
    if "date" in used or "datetime" in used:
        times = [*(["LocalDate"] if "date" in used else []), *(["OffsetDateTime"] if "datetime" in used else [])]
        imports.append(f"import java.time.{{{', '.join(times)}}}")
    if "uuid" in used:
        imports.append("import java.util.UUID")
    circe = [
        "Decoder",
        "Encoder",
        *(["Json"] if "any" in used or "null" in used else []),
        *(["JsonObject"] if "object" in used else []),
    ]
    imports.append(f"import io.circe.{{{', '.join(circe)}}}")
    code = "\n".join(imports) + f"\n\n{body}\n"
    return GeneratedCode(
        [GeneratedFile(f"{names.class_name(schema.classes[0].id)}.scala", code)], _usage(schema, names), names.notes
    )


def _type_name(type_ref: TypeRef, names: Names, used: set[str]) -> str:
    if type_ref.kind == "class":
        return names.class_name(type_ref.class_id)
    if type_ref.kind == "array":
        items = _type_name(type_ref.items, names, used)
        return f"List[Option[{items}]]" if type_ref.items_nullable and items != "Json" else f"List[{items}]"
    used.add(type_ref.name)
    return PRIMITIVES[type_ref.name]


def _case_class(item: ClassDef, names: Names, used: set[str]) -> str:
    parameters = []
    for field in item.fields:
        if IDENTIFIER.match(field.key) and field.key not in KEYWORDS:
            name = field.key
        else:
            name = f"`{field.key.replace('`', '')}`"
        type_name = _type_name(field.type, names, used)
        option = (field.nullable or field.optional) and type_name != "Json"
        # circe decodes a missing Option as None
        parameters.append(
            f"{INDENT}{name}: {f'Option[{type_name}]' if option else type_name}{' = None' if field.optional else ''}"
        )
    name = names.class_name(item.id)
    inside = "\n" + ",\n".join(parameters) + "\n" if parameters else ""
    return f"final case class {name}({inside}) derives Decoder, Encoder.AsObject"


def _usage(schema: Schema, names: Names) -> str:
    root = names.class_name(schema.classes[0].id)
    type_name = f"List[{root}]" if schema.root.kind == "array" else root
    return "\n".join(
        [
            '// build.sbt: "io.circe" %% "circe-core" % "0.14.x", "io.circe" %% "circe-parser" % "0.14.x"',
            "import io.circe.parser.decode",
            "import io.circe.syntax.*",
            "",
            f"val result: Either[io.circe.Error, {type_name}] = decode[{type_name}](text)",
            "result.foreach(value => println(value.asJson.noSpaces))",
            "",
        ]
    )


SCALA = Generator("scala", "Scala 3", OPTIONS, False, generate)
