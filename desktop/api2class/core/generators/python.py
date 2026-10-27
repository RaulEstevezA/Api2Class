"""Python: dataclass, Pydantic v2 or plain class. Mirrors web/src/core/generators/python/python.ts."""

from ..jsstring import js_string
from ..naming import to_snake_case
from ..schema import ClassDef, Schema, TypeRef
from .common import LanguageRules, Names, Property, dependencies, no_classes_message, required_first
from .types import GeneratedCode, GeneratedFile, GenerateSettings, Generator, GeneratorOption, choices, option_value

KEYWORDS = frozenset(
    "False None True and as assert async await break class continue def del elif else except finally for from "
    "global if import in is lambda nonlocal not or pass raise return try while with yield".split()
)

# BaseModel attributes: a field with one of these names would hide it
PYDANTIC_RESERVED = frozenset(
    "construct copy dict from_orm json parse_file parse_obj parse_raw schema schema_json "
    "update_forward_refs validate".split()
)

PRIMITIVES = {
    "string": "str",
    "integer": "int",
    "float": "float",
    "boolean": "bool",
    "date": "date",
    "datetime": "datetime",
    "uuid": "UUID",
    "object": "dict[str, Any]",
    "null": "None",
    "any": "Any",
}

INDENT = "    "


class Imports:
    """from module import a, b lines, grouped and sorted as isort would."""

    def __init__(self):
        self.modules: dict[str, set[str]] = {}

    def add(self, module: str, name: str) -> None:
        self.modules.setdefault(module, set()).add(name)

    def add_all(self, other: "Imports") -> None:
        for module, names in other.modules.items():
            for name in names:
                self.add(module, name)

    def lines(self, local: list[str] | None = None) -> list[str]:
        def line(module: str) -> str:
            return f"from {module} import {', '.join(sorted(self.modules[module]))}"

        future = [line("__future__"), ""] if "__future__" in self.modules else []
        standard = [line(module) for module in sorted(self.modules) if module not in ("__future__", "pydantic")]
        third_party = [line("pydantic")] if "pydantic" in self.modules else []
        groups = [group for group in (standard, third_party, local or []) if group]
        result = list(future)
        for index, group in enumerate(groups):
            if index > 0:
                result.append("")
            result.extend(group)
        return result


def _options() -> tuple[GeneratorOption, ...]:
    return (
        GeneratorOption("style", choices(("dataclass", "dataclass"), ("pydantic", "Pydantic"), ("class", "class"))),
    )


OPTIONS = _options()


def generate(schema: Schema, settings: GenerateSettings) -> GeneratedCode:
    style = option_value(OPTIONS, settings, "style")
    reserved = KEYWORDS | PYDANTIC_RESERVED if style == "pydantic" else KEYWORDS
    names = Names(
        schema,
        settings,
        LanguageRules(
            reserved=reserved,
            default_naming="snake_case",
            # A leading underscore means private in Python, and Pydantic does not accept it
            digit_prefix="field_",
            escape_reserved=lambda name: f"{name}_",
            # model_ is Pydantic's namespace
            adjust=(lambda name: f"{name}_" if name.startswith("model_") else name) if style == "pydantic" else None,
        ),
    )
    if not schema.classes:
        return GeneratedCode([GeneratedFile("models.py", f"# {no_classes_message(schema)}\n")], None, [])

    root_name = names.class_name(schema.classes[0].id)

    def module_name(class_id: str) -> str:
        return to_snake_case(names.class_name(class_id)) or "models"

    blocks = []
    for item in schema.classes:
        imports = Imports()
        imports.add("__future__", "annotations")
        if style == "pydantic":
            code = _pydantic_class(item, names, imports)
        elif style == "class":
            code = _plain_class(item, names, imports)
        else:
            code = _dataclass(item, names, imports)
        blocks.append((item, code, imports))

    if settings.multiple_files:
        files = []
        for item, code, imports in blocks:
            local = sorted(
                f"from .{module_name(dependency)} import {names.class_name(dependency)}"
                for dependency in dependencies(item)
                if dependency != item.id
            )
            files.append(
                GeneratedFile(f"{module_name(item.id)}.py", "\n".join(imports.lines(local)) + f"\n\n\n{code}\n")
            )
    else:
        imports = Imports()
        for _, _, block_imports in blocks:
            imports.add_all(block_imports)
        body = "\n\n\n".join(code for _, code, _ in blocks)
        files = [GeneratedFile(f"{to_snake_case(root_name)}.py", "\n".join(imports.lines()) + f"\n\n\n{body}\n")]

    module = module_name(schema.classes[0].id) if settings.multiple_files else to_snake_case(root_name)
    return GeneratedCode(files, _usage(schema, style, root_name, module), names.notes)


def _type_name(type_ref: TypeRef, names: Names, imports: Imports) -> str:
    if type_ref.kind == "class":
        return names.class_name(type_ref.class_id)
    if type_ref.kind == "array":
        return f"list[{_type_name(type_ref.items, names, imports)}{' | None' if type_ref.items_nullable else ''}]"
    if type_ref.name in ("date", "datetime"):
        imports.add("datetime", type_ref.name)
    if type_ref.name == "uuid":
        imports.add("uuid", "UUID")
    if type_ref.name in ("any", "object"):
        imports.add("typing", "Any")
    return PRIMITIVES[type_ref.name]


def _annotation(prop: Property, names: Names, imports: Imports) -> str:
    type_name = _type_name(prop.field.type, names, imports)
    return f"{type_name} | None" if (prop.field.nullable or prop.field.optional) and type_name != "None" else type_name


def _json_comment(prop: Property) -> str:
    return f"  # JSON: {js_string(prop.field.key)}" if prop.renamed else ""


def _dataclass(item: ClassDef, names: Names, imports: Imports) -> str:
    imports.add("dataclasses", "dataclass")
    # Fields with a default value must come after the ones without one
    properties = required_first(names.properties(item))
    body = [
        f"{INDENT}{p.name}: {_annotation(p, names, imports)}{' = None' if p.field.optional else ''}{_json_comment(p)}"
        for p in properties
    ]
    methods = _dict_methods(item, properties, names, imports)
    return "\n".join(
        ["@dataclass", f"class {names.class_name(item.id)}:", *body, *(["", methods] if body else [methods])]
    )


def _plain_class(item: ClassDef, names: Names, imports: Imports) -> str:
    properties = required_first(names.properties(item))
    parameters = []
    for p in properties:
        default = " = None" if p.field.optional else ""
        parameters.append(f"{INDENT}{INDENT}{p.name}: {_annotation(p, names, imports)}{default},{_json_comment(p)}")
    if not properties:
        init = [f"{INDENT}def __init__(self) -> None:", f"{INDENT}{INDENT}pass"]
    else:
        init = [
            f"{INDENT}def __init__(",
            f"{INDENT}{INDENT}self,",
            *parameters,
            f"{INDENT}) -> None:",
            *(f"{INDENT}{INDENT}self.{p.name} = {p.name}" for p in properties),
        ]
    return "\n".join(
        [f"class {names.class_name(item.id)}:", *init, "", _dict_methods(item, properties, names, imports)]
    )


def _pydantic_class(item: ClassDef, names: Names, imports: Imports) -> str:
    imports.add("pydantic", "BaseModel")
    properties = names.properties(item)
    aliased = any(p.renamed for p in properties)
    body = []
    for p in properties:
        type_name = _annotation(p, names, imports)
        value = ""
        if p.renamed:
            imports.add("pydantic", "Field")
            value = f" = Field({'default=None, ' if p.field.optional else ''}alias={js_string(p.field.key)})"
        elif p.field.optional:
            value = " = None"
        body.append(f"{INDENT}{p.name}: {type_name}{value}")
    lines = [f"class {names.class_name(item.id)}(BaseModel):"]
    if aliased:
        imports.add("pydantic", "ConfigDict")
        # Accept both the JSON key and the Python name when creating the model by hand
        lines += [f"{INDENT}model_config = ConfigDict(populate_by_name=True)", ""]
    lines += body or [f"{INDENT}pass"]
    return "\n".join(lines)


def _from_json(type_ref: TypeRef, source: str, names: Names, depth: int = 0) -> str:
    """Python expression that turns the JSON value source into type_ref."""
    if type_ref.kind == "class":
        return f"{names.class_name(type_ref.class_id)}.from_dict({source})"
    if type_ref.kind == "array":
        item = "item" if depth == 0 else f"item{depth + 1}"
        inner = _from_json(type_ref.items, item, names, depth + 1)
        if inner == item:
            return source
        element = f"{inner} if {item} is not None else None" if type_ref.items_nullable else inner
        return f"[{element} for {item} in {source}]"
    if type_ref.name in ("date", "datetime"):
        return f"{type_ref.name}.fromisoformat({source})"
    if type_ref.name == "uuid":
        return f"UUID({source})"
    # JSON writes 120 for 120.0, which Python reads as int
    if type_ref.name == "float":
        return f"float({source})"
    return source


def _to_json(type_ref: TypeRef, source: str, depth: int = 0) -> str:
    """Python expression that turns source back into a JSON value."""
    if type_ref.kind == "class":
        return f"{source}.to_dict()"
    if type_ref.kind == "array":
        item = "item" if depth == 0 else f"item{depth + 1}"
        inner = _to_json(type_ref.items, item, depth + 1)
        if inner == item:
            return source
        element = f"{inner} if {item} is not None else None" if type_ref.items_nullable else inner
        return f"[{element} for {item} in {source}]"
    if type_ref.name in ("date", "datetime"):
        return f"{source}.isoformat()"
    if type_ref.name == "uuid":
        return f"str({source})"
    return source


def _dict_methods(item: ClassDef, properties: list[Property], names: Names, imports: Imports) -> str:
    imports.add("typing", "Any")
    class_name = names.class_name(item.id)

    def key(p: Property) -> str:
        return js_string(p.field.key)

    parameters = []
    for p in properties:
        source = f"data.get({key(p)})" if p.field.optional else f"data[{key(p)}]"
        converted = _from_json(p.field.type, source, names)
        can_be_none = p.field.optional or p.field.nullable
        if converted == source or not can_be_none:
            value = converted
        else:
            value = f"{_from_json(p.field.type, f'data[{key(p)}]', names)} if {source} is not None else None"
        parameters.append(f"{INDENT}{INDENT}{INDENT}{p.name}={value},")
    from_dict = [
        f"{INDENT}@classmethod",
        f"{INDENT}def from_dict(cls, data: dict[str, Any]) -> {class_name}:",
        *(
            [f"{INDENT}{INDENT}return cls(", *parameters, f"{INDENT}{INDENT})"]
            if parameters
            else [f"{INDENT}{INDENT}return cls()"]
        ),
    ]

    def serialize(p: Property) -> str:
        own = f"self.{p.name}"
        converted = _to_json(p.field.type, own)
        return f"{converted} if {own} is not None else None" if converted != own and p.field.nullable else converted

    required = [p for p in properties if not p.field.optional]
    optional = [p for p in properties if p.field.optional]
    entries = [f"{INDENT}{INDENT}{INDENT}{key(p)}: {serialize(p)}," for p in required]
    to_dict = [f"{INDENT}def to_dict(self) -> dict[str, Any]:"]
    if not optional:
        to_dict.append(
            "\n".join([f"{INDENT}{INDENT}return {{", *entries, f"{INDENT}{INDENT}}}"])
            if required
            else f"{INDENT}{INDENT}return {{}}"
        )
    else:
        to_dict.append(
            "\n".join([f"{INDENT}{INDENT}data: dict[str, Any] = {{", *entries, f"{INDENT}{INDENT}}}"])
            if required
            else f"{INDENT}{INDENT}data: dict[str, Any] = {{}}"
        )
        # Fields missing from the JSON stay missing, instead of becoming null
        for p in optional:
            to_dict.append(
                f"{INDENT}{INDENT}if self.{p.name} is not None:\n"
                f"{INDENT}{INDENT}{INDENT}data[{key(p)}] = {_to_json(p.field.type, f'self.{p.name}')}"
            )
        to_dict.append(f"{INDENT}{INDENT}return data")
    return "\n".join([*from_dict, "", *to_dict])


def _usage(schema: Schema, style: str, root_name: str, module: str) -> str:
    is_list = schema.root.kind == "array"
    read = f"from {module} import {root_name}"
    if style == "pydantic":
        if is_list:
            return "\n".join(
                [
                    "from pydantic import TypeAdapter",
                    "",
                    read,
                    "",
                    f"adapter = TypeAdapter(list[{root_name}])",
                    "items = adapter.validate_json(text)  # text: the API response",
                    "print(adapter.dump_json(items, by_alias=True))",
                    "",
                ]
            )
        return "\n".join(
            [
                read,
                "",
                f"root = {root_name}.model_validate_json(text)  # text: the API response",
                "print(root.model_dump_json(by_alias=True, exclude_unset=True))",
                "",
            ]
        )
    if is_list:
        body = [
            f"items = [{root_name}.from_dict(item) for item in json.loads(text)]  # text: the API response",
            "print(json.dumps([item.to_dict() for item in items]))",
        ]
    else:
        body = [
            f"root = {root_name}.from_dict(json.loads(text))  # text: the API response",
            "print(json.dumps(root.to_dict()))",
        ]
    return "\n".join(["import json", "", read, "", *body, ""])


PYTHON = Generator("python", "Python", OPTIONS, True, generate)
