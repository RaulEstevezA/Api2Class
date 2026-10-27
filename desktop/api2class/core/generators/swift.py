"""Swift Codable structs with CodingKeys. Mirrors web/src/core/generators/swift/swift.ts."""

from ..jsstring import js_string
from ..schema import ClassDef, Schema, TypeRef
from .common import LanguageRules, Names, no_classes_message, primitives_used
from .types import GeneratedCode, GeneratedFile, GenerateSettings, Generator, GeneratorOption, choices

# Keywords that need backticks to be used as names
KEYWORDS = frozenset(
    "associatedtype class deinit enum extension fileprivate func import init inout internal let open "
    "operator private protocol public rethrows static struct subscript typealias var break case continue "
    "default defer do else fallthrough for guard if in repeat return switch where while as Any catch "
    "false is nil super self Self throw throws true try".split()
)

# Dates without time stay as text: JSONDecoder's ISO 8601 strategy only reads date-times
PRIMITIVES = {
    "string": "String",
    "integer": "Int",
    "float": "Double",
    "boolean": "Bool",
    "date": "String",
    "datetime": "Date",
    "uuid": "UUID",
    "object": "[String: JSONValue]",
    "null": "JSONValue?",
    "any": "JSONValue",
}

INDENT = "    "

# Swift has no type for "any JSON value": this enum is added when a field needs one
JSON_VALUE = """/// Any JSON value, for fields whose type is not fixed.
enum JSONValue: Codable {
    case string(String)
    case number(Double)
    case bool(Bool)
    case object([String: JSONValue])
    case array([JSONValue])
    case null

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() {
            self = .null
        } else if let value = try? container.decode(Bool.self) {
            self = .bool(value)
        } else if let value = try? container.decode(Double.self) {
            self = .number(value)
        } else if let value = try? container.decode(String.self) {
            self = .string(value)
        } else if let value = try? container.decode([JSONValue].self) {
            self = .array(value)
        } else {
            self = .object(try container.decode([String: JSONValue].self))
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .string(let value): try container.encode(value)
        case .number(let value): try container.encode(value)
        case .bool(let value): try container.encode(value)
        case .object(let value): try container.encode(value)
        case .array(let value): try container.encode(value)
        case .null: try container.encodeNil()
        }
    }
}"""

OPTIONS = (GeneratorOption("style", choices(("codable", "struct Codable"))),)


def generate(schema: Schema, settings: GenerateSettings) -> GeneratedCode:
    if not schema.classes:
        return GeneratedCode([GeneratedFile("Models.swift", f"// {no_classes_message(schema)}\n")], None, [])

    names = Names(
        schema,
        settings,
        LanguageRules(reserved=KEYWORDS, default_naming="camelCase", escape_reserved=lambda name: f"`{name}`"),
    )
    blocks = [(item, _struct(item, names)) for item in schema.classes]
    needs_json_value = any(primitives_used(item.fields) & {"any", "object", "null"} for item in schema.classes)

    # Swift files of the same module see each other: no imports between them
    header = "import Foundation\n\n"
    if settings.multiple_files:
        files = [GeneratedFile(f"{names.class_name(item.id)}.swift", f"{header}{code}\n") for item, code in blocks]
        if needs_json_value:
            files.append(GeneratedFile("JSONValue.swift", f"{header}{JSON_VALUE}\n"))
    else:
        parts = [code for _, code in blocks] + ([JSON_VALUE] if needs_json_value else [])
        files = [GeneratedFile(f"{names.class_name(schema.classes[0].id)}.swift", header + "\n\n".join(parts) + "\n")]
    return GeneratedCode(files, _usage(schema, names), names.notes)


def _type_name(type_ref: TypeRef, names: Names) -> str:
    if type_ref.kind == "class":
        return names.class_name(type_ref.class_id)
    if type_ref.kind == "array":
        items = _type_name(type_ref.items, names)
        return f"[{items}?]" if type_ref.items_nullable and not items.endswith("?") else f"[{items}]"
    return PRIMITIVES[type_ref.name]


def _struct(item: ClassDef, names: Names) -> str:
    properties = names.properties(item)
    lines = [f"struct {names.class_name(item.id)}: Codable {{"]
    for prop in properties:
        type_name = _type_name(prop.field.type, names)
        can_be_nil = (prop.field.nullable or prop.field.optional) and not type_name.endswith("?")
        # Optionals are decoded with decodeIfPresent: a missing key is nil too
        lines.append(f"{INDENT}let {prop.name}: {type_name + '?' if can_be_nil else type_name}")

    def mapped(prop) -> bool:
        return prop.renamed and prop.name != f"`{prop.field.key}`"

    if any(mapped(prop) for prop in properties):
        lines += ["", f"{INDENT}enum CodingKeys: String, CodingKey {{"]
        for prop in properties:
            raw = f" = {js_string(prop.field.key)}" if mapped(prop) else ""
            lines.append(f"{INDENT}{INDENT}case {prop.name}{raw}")
        lines.append(f"{INDENT}}}")
    lines.append("}")
    return "\n".join(lines)


def _usage(schema: Schema, names: Names) -> str:
    root = names.class_name(schema.classes[0].id)
    is_list = schema.root.kind == "array"
    type_name = f"[{root}]" if is_list else root
    return "\n".join(
        [
            "let decoder = JSONDecoder()",
            "// Date-times as RFC 3339 text (use a custom strategy for fractional seconds)",
            "decoder.dateDecodingStrategy = .iso8601",
            f"let {'items' if is_list else 'root'} = try decoder.decode({type_name}.self, from: data)",
            "",
        ]
    )


SWIFT = Generator("swift", "Swift", OPTIONS, True, generate)
