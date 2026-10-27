"""PHP 8.1 readonly classes with fromArray / toArray. Mirrors web/src/core/generators/php/php.ts."""

from ..schema import ClassDef, Schema, TypeRef
from .common import LanguageRules, Names, Property, no_classes_message, required_first
from .types import GeneratedCode, GeneratedFile, GenerateSettings, Generator, GeneratorOption, choices

# Reserved for class names, whatever their case. Property names ($class, $list) can be anything.
RESERVED_CLASSES = frozenset(
    "abstract and array as bool break callable case catch class clone const continue declare default do echo else "
    "elseif empty enddeclare endfor endforeach endif endswitch endwhile enum eval exit extends false final finally "
    "float fn for foreach function global goto if implements include instanceof insteadof int interface isset iterable "
    "list match mixed namespace never new null object or parent print private protected public readonly require return "
    "self static string switch throw trait true try unset use var void while xor yield".split()
)

PRIMITIVES = {
    "string": "string",
    "integer": "int",
    "float": "float",
    "boolean": "bool",
    "date": "\\DateTimeImmutable",
    "datetime": "\\DateTimeImmutable",
    "uuid": "string",
    "object": "array",
    "null": "mixed",
    "any": "mixed",
}

INDENT = "    "

OPTIONS = (GeneratorOption("style", choices(("class", "readonly class (PHP 8.1+)"))),)


def generate(schema: Schema, settings: GenerateSettings) -> GeneratedCode:
    if not schema.classes:
        return GeneratedCode([GeneratedFile("Models.php", f"<?php\n\n// {no_classes_message(schema)}\n")], None, [])

    names = Names(
        schema,
        settings,
        LanguageRules(
            reserved=frozenset(),
            reserved_classes=RESERVED_CLASSES,
            case_insensitive=True,
            default_naming="camelCase",
            escape_reserved=lambda name: f"{name}Model",
        ),
    )
    blocks = [(item, _php_class(item, names)) for item in schema.classes]
    # strict_types: values are converted explicitly in fromArray, never silently
    header = "<?php\n\ndeclare(strict_types=1);\n\n"
    if settings.multiple_files:
        files = [GeneratedFile(f"{names.class_name(item.id)}.php", f"{header}{code}\n") for item, code in blocks]
    else:
        files = [
            GeneratedFile(
                f"{names.class_name(schema.classes[0].id)}.php", header + "\n\n".join(code for _, code in blocks) + "\n"
            )
        ]
    return GeneratedCode(files, _usage(schema, names), names.notes)


def _php_type(prop: Property, names: Names) -> str:
    """Type for the parameter declaration: PHP has no typed arrays, so lists are array."""
    type_ref = prop.field.type
    if type_ref.kind == "array":
        base = "array"
    elif type_ref.kind == "class":
        base = names.class_name(type_ref.class_id)
    else:
        base = PRIMITIVES[type_ref.name]
    return f"?{base}" if (prop.field.nullable or prop.field.optional) and base != "mixed" else base


def _doc_type(type_ref: TypeRef, names: Names) -> str:
    """Type for the PHPDoc: list<Order>, list<?string>."""
    if type_ref.kind == "class":
        return names.class_name(type_ref.class_id)
    if type_ref.kind == "array":
        return f"list<{'?' if type_ref.items_nullable else ''}{_doc_type(type_ref.items, names)}>"
    return "array<string, mixed>" if type_ref.name == "object" else PRIMITIVES[type_ref.name]


def _quote(text: str) -> str:
    escaped = text.replace("\\", "\\\\").replace("'", "\\'")
    return f"'{escaped}'"


def _from_json(type_ref: TypeRef, source: str, names: Names, depth: int = 0) -> str:
    """PHP expression that reads source (from json_decode(..., true)) as type_ref."""
    if type_ref.kind == "class":
        return f"{names.class_name(type_ref.class_id)}::fromArray({source})"
    if type_ref.kind == "array":
        item = "$item" if depth == 0 else f"$item{depth + 1}"
        inner = _from_json(type_ref.items, item, names, depth + 1)
        if inner == item:
            return source
        element = f"{item} === null ? null : {inner}" if type_ref.items_nullable else inner
        return f"array_map(static fn (${item[1:]}) => {element}, {source})"
    # json_decode gives 120 for 120.0, an int that strict_types would refuse as a float
    if type_ref.name == "float":
        return f"(float) {source}"
    if type_ref.name in ("date", "datetime"):
        return f"new \\DateTimeImmutable({source})"
    return source


def _to_json(type_ref: TypeRef, source: str, depth: int = 0) -> str:
    """PHP expression that turns source back into what json_encode expects."""
    if type_ref.kind == "class":
        return f"{source}->toArray()"
    if type_ref.kind == "array":
        item = "$item" if depth == 0 else f"$item{depth + 1}"
        inner = _to_json(type_ref.items, item, depth + 1)
        if inner == item:
            return source
        element = f"{item} === null ? null : {inner}" if type_ref.items_nullable else inner
        return f"array_map(static fn (${item[1:]}) => {element}, {source})"
    # json_decode(..., true) reads {} as [], which json_encode would write back as []
    if type_ref.name == "object":
        return f"(object) {source}"
    if type_ref.name == "datetime":
        return f"{source}->format(\\DATE_ATOM)"
    if type_ref.name == "date":
        return f"{source}->format('Y-m-d')"
    return source


def _php_class(item: ClassDef, names: Names) -> str:
    name = names.class_name(item.id)
    # Parameters with a default value must come last
    properties = required_first(names.properties(item))
    docs = []
    for p in properties:
        if p.field.type.kind == "array" or (p.field.type.kind == "primitive" and p.field.type.name == "object"):
            nullable = "?" if p.field.nullable or p.field.optional else ""
            docs.append(f"{INDENT} * @param {nullable}{_doc_type(p.field.type, names)} ${p.name}")
    lines = [f"final class {name}", "{"]
    if docs:
        lines += [f"{INDENT}/**", *docs, f"{INDENT} */"]
    if properties:
        parameters = [
            f"{INDENT}{INDENT}public readonly {_php_type(p, names)} ${p.name}{' = null' if p.field.optional else ''},"
            for p in properties
        ]
        lines.append("\n".join([f"{INDENT}public function __construct(", *parameters, f"{INDENT}) {{", f"{INDENT}}}"]))
    else:
        lines.append(f"{INDENT}public function __construct()\n{INDENT}{{\n{INDENT}}}")
    lines += [
        "",
        f"{INDENT}/** @param array<string, mixed> $data */",
        f"{INDENT}public static function fromArray(array $data): self",
        f"{INDENT}{{",
    ]
    if not properties:
        lines.append(f"{INDENT}{INDENT}return new self();")
    else:
        lines.append(f"{INDENT}{INDENT}return new self(")
        for p in properties:
            source = f"$data[{_quote(p.field.key)}]"
            value = _from_json(p.field.type, source, names)
            if p.field.optional or p.field.nullable:
                read = f"{source} ?? null" if value == source else f"isset({source}) ? {value} : null"
            else:
                read = value
            lines.append(f"{INDENT}{INDENT}{INDENT}{p.name}: {read},")
        lines.append(f"{INDENT}{INDENT});")
    lines += [
        f"{INDENT}}}",
        "",
        f"{INDENT}/** @return array<string, mixed> */",
        f"{INDENT}public function toArray(): array",
        f"{INDENT}{{",
    ]

    def write(p: Property) -> str:
        own = f"$this->{p.name}"
        value = _to_json(p.field.type, own)
        return f"{own} === null ? null : {value}" if p.field.nullable and value != own else value

    required = [p for p in properties if not p.field.optional]
    optional = [p for p in properties if p.field.optional]
    if required:
        entries = "\n".join(f"{INDENT}{INDENT}{INDENT}{_quote(p.field.key)} => {write(p)}," for p in required)
        array = f"[\n{entries}\n{INDENT}{INDENT}]"
    else:
        array = "[]"
    if not optional:
        lines.append(f"{INDENT}{INDENT}return {array};")
    else:
        lines.append(f"{INDENT}{INDENT}$data = {array};")
        # Fields missing from the JSON stay missing instead of becoming null
        for p in optional:
            lines += [
                f"{INDENT}{INDENT}if ($this->{p.name} !== null) {{",
                f"{INDENT}{INDENT}{INDENT}$data[{_quote(p.field.key)}] = {_to_json(p.field.type, f'$this->{p.name}')};",
                f"{INDENT}{INDENT}}}",
            ]
        lines.append(f"{INDENT}{INDENT}return $data;")
    lines += [f"{INDENT}}}", "}"]
    return "\n".join(lines)


def _usage(schema: Schema, names: Names) -> str:
    root = names.class_name(schema.classes[0].id)
    decode = "json_decode($json, true, flags: JSON_THROW_ON_ERROR)"
    if schema.root.kind == "array":
        return (
            f"$items = array_map(static fn (array $item) => {root}::fromArray($item), {decode});\n"
            f"echo json_encode(array_map(static fn ({root} $item) => $item->toArray(), $items));\n"
        )
    return f"$root = {root}::fromArray({decode});\necho json_encode($root->toArray());\n"


PHP = Generator("php", "PHP", OPTIONS, True, generate)
