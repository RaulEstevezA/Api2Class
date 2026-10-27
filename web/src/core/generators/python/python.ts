import { toSnakeCase } from '../../naming.ts'
import type { ClassDef, PrimitiveType, Schema, TypeRef } from '../../schema.ts'
import { createNames, dependencies, noClassesMessage, requiredFirst, type Names, type Property } from '../common.ts'
import { optionValue, type GeneratedCode, type GenerateSettings, type Generator } from '../types.ts'

const KEYWORDS = new Set(
  'False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield'.split(
    ' ',
  ),
)

// BaseModel attributes: a field with one of these names would hide it
const PYDANTIC_RESERVED = new Set(
  'construct copy dict from_orm json parse_file parse_obj parse_raw schema schema_json update_forward_refs validate'.split(' '),
)

const PRIMITIVES: Record<PrimitiveType, string> = {
  string: 'str',
  integer: 'int',
  float: 'float',
  boolean: 'bool',
  date: 'date',
  datetime: 'datetime',
  uuid: 'UUID',
  object: 'dict[str, Any]',
  null: 'None',
  any: 'Any',
}

const INDENT = '    '

/** `from module import a, b` lines, grouped and sorted as isort would. */
class Imports {
  private readonly modules = new Map<string, Set<string>>()

  add(module: string, name: string) {
    if (!this.modules.has(module)) this.modules.set(module, new Set())
    this.modules.get(module)!.add(name)
  }

  addAll(other: Imports) {
    for (const [module, names] of other.modules) for (const name of names) this.add(module, name)
  }

  lines(local: string[] = []): string[] {
    const line = (module: string) => `from ${module} import ${[...this.modules.get(module)!].sort().join(', ')}`
    const future = this.modules.has('__future__') ? [line('__future__'), ''] : []
    const standard = [...this.modules.keys()].filter((module) => module !== '__future__' && module !== 'pydantic').sort().map(line)
    const thirdParty = this.modules.has('pydantic') ? [line('pydantic')] : []
    const groups = [standard, thirdParty, local].filter((group) => group.length > 0)
    return [...future, ...groups.flatMap((group, index) => (index === 0 ? group : ['', ...group]))]
  }
}

function generate(schema: Schema, settings: GenerateSettings): GeneratedCode {
  const style = optionValue(python, settings, 'style')
  const reserved = style === 'pydantic' ? new Set([...KEYWORDS, ...PYDANTIC_RESERVED]) : KEYWORDS
  const names = createNames(schema, settings, {
    reserved,
    defaultNaming: 'snake_case',
    // A leading underscore means private in Python, and Pydantic does not accept it
    digitPrefix: 'field_',
    // model_ is Pydantic's namespace
    escapeReserved: (name) => `${name}_`,
    adjust: style === 'pydantic' ? (name) => (name.startsWith('model_') ? `${name}_` : name) : undefined,
  })
  const rootName = schema.classes[0] ? names.className(schema.classes[0].id) : ''
  const moduleName = (classId: string) => toSnakeCase(names.className(classId)) || 'models'

  if (schema.classes.length === 0) {
    return { files: [{ name: 'models.py', code: `# ${noClassesMessage(schema)}\n` }], usage: null, notes: [] }
  }

  const blocks = schema.classes.map((item) => {
    const imports = new Imports()
    imports.add('__future__', 'annotations')
    const code =
      style === 'pydantic' ? pydanticClass(item, names, imports) : style === 'class' ? plainClass(item, names, imports) : dataclass(item, names, imports)
    return { item, code, imports }
  })

  let files: GeneratedCode['files']
  if (settings.multipleFiles) {
    files = blocks.map(({ item, code, imports }) => {
      const local = dependencies(item)
        .filter((dependency) => dependency !== item.id)
        .map((dependency) => `from .${moduleName(dependency)} import ${names.className(dependency)}`)
        .sort()
      return { name: `${moduleName(item.id)}.py`, code: `${imports.lines(local).join('\n')}\n\n\n${code}\n` }
    })
  } else {
    const imports = new Imports()
    for (const block of blocks) imports.addAll(block.imports)
    files = [{ name: `${toSnakeCase(rootName)}.py`, code: `${imports.lines().join('\n')}\n\n\n${blocks.map((block) => block.code).join('\n\n\n')}\n` }]
  }

  return { files, usage: usage(schema, style, rootName, settings.multipleFiles ? moduleName(schema.classes[0].id) : toSnakeCase(rootName)), notes: names.notes }
}

function typeName(type: TypeRef, names: Names, imports: Imports): string {
  if (type.kind === 'class') return names.className(type.classId)
  if (type.kind === 'array') return `list[${typeName(type.items, names, imports)}${type.itemsNullable ? ' | None' : ''}]`
  if (type.name === 'date' || type.name === 'datetime') imports.add('datetime', type.name)
  if (type.name === 'uuid') imports.add('uuid', 'UUID')
  if (type.name === 'any' || type.name === 'object') imports.add('typing', 'Any')
  return PRIMITIVES[type.name]
}

function annotation(property: Property, names: Names, imports: Imports): string {
  const type = typeName(property.field.type, names, imports)
  return (property.field.nullable || property.field.optional) && type !== 'None' ? `${type} | None` : type
}

function jsonComment(property: Property): string {
  return property.renamed ? `  # JSON: ${JSON.stringify(property.field.key)}` : ''
}

function dataclass(item: ClassDef, names: Names, imports: Imports): string {
  imports.add('dataclasses', 'dataclass')
  // Fields with a default value must come after the ones without one
  const properties = requiredFirst(names.properties(item))
  const body = properties.map(
    (property) => `${INDENT}${property.name}: ${annotation(property, names, imports)}${property.field.optional ? ' = None' : ''}${jsonComment(property)}`,
  )
  const methods = dictMethods(item, properties, names, imports)
  return ['@dataclass', `class ${names.className(item.id)}:`, ...(body.length > 0 ? body : []), ...(body.length > 0 ? ['', methods] : [methods])].join('\n')
}

function plainClass(item: ClassDef, names: Names, imports: Imports): string {
  const properties = requiredFirst(names.properties(item))
  const parameters = properties.map(
    (property) => `${INDENT}${INDENT}${property.name}: ${annotation(property, names, imports)}${property.field.optional ? ' = None' : ''},${jsonComment(property)}`,
  )
  const init =
    properties.length === 0
      ? [`${INDENT}def __init__(self) -> None:`, `${INDENT}${INDENT}pass`]
      : [
          `${INDENT}def __init__(`,
          `${INDENT}${INDENT}self,`,
          ...parameters,
          `${INDENT}) -> None:`,
          ...properties.map((property) => `${INDENT}${INDENT}self.${property.name} = ${property.name}`),
        ]
  return [`class ${names.className(item.id)}:`, ...init, '', dictMethods(item, properties, names, imports)].join('\n')
}

function pydanticClass(item: ClassDef, names: Names, imports: Imports): string {
  imports.add('pydantic', 'BaseModel')
  const properties = names.properties(item)
  const aliased = properties.some((property) => property.renamed)
  const body = properties.map((property) => {
    const type = annotation(property, names, imports)
    const { optional } = property.field
    let value = ''
    if (property.renamed) {
      imports.add('pydantic', 'Field')
      value = ` = Field(${optional ? 'default=None, ' : ''}alias=${JSON.stringify(property.field.key)})`
    } else if (optional) {
      value = ' = None'
    }
    return `${INDENT}${property.name}: ${type}${value}`
  })
  const lines = [`class ${names.className(item.id)}(BaseModel):`]
  if (aliased) {
    imports.add('pydantic', 'ConfigDict')
    // Accept both the JSON key and the Python name when creating the model by hand
    lines.push(`${INDENT}model_config = ConfigDict(populate_by_name=True)`, '')
  }
  lines.push(...(body.length > 0 ? body : [`${INDENT}pass`]))
  return lines.join('\n')
}

/** Python expression that turns the JSON value `source` into `type`. */
function fromJson(type: TypeRef, source: string, names: Names, depth = 0): string {
  if (type.kind === 'class') return `${names.className(type.classId)}.from_dict(${source})`
  if (type.kind === 'array') {
    const item = depth === 0 ? 'item' : `item${depth + 1}`
    const inner = fromJson(type.items, item, names, depth + 1)
    if (inner === item) return source
    return `[${type.itemsNullable ? `${inner} if ${item} is not None else None` : inner} for ${item} in ${source}]`
  }
  if (type.name === 'date' || type.name === 'datetime') return `${type.name}.fromisoformat(${source})`
  if (type.name === 'uuid') return `UUID(${source})`
  // JSON writes 120 for 120.0, which Python reads as int
  if (type.name === 'float') return `float(${source})`
  return source
}

/** Python expression that turns `source` back into a JSON value. */
function toJson(type: TypeRef, source: string, depth = 0): string {
  if (type.kind === 'class') return `${source}.to_dict()`
  if (type.kind === 'array') {
    const item = depth === 0 ? 'item' : `item${depth + 1}`
    const inner = toJson(type.items, item, depth + 1)
    if (inner === item) return source
    return `[${type.itemsNullable ? `${inner} if ${item} is not None else None` : inner} for ${item} in ${source}]`
  }
  if (type.name === 'date' || type.name === 'datetime') return `${source}.isoformat()`
  if (type.name === 'uuid') return `str(${source})`
  return source
}

function dictMethods(item: ClassDef, properties: Property[], names: Names, imports: Imports): string {
  imports.add('typing', 'Any')
  const className = names.className(item.id)
  const key = (property: Property) => JSON.stringify(property.field.key)

  const parameters = properties.map((property) => {
    const { field } = property
    const source = field.optional ? `data.get(${key(property)})` : `data[${key(property)}]`
    const converted = fromJson(field.type, source, names)
    const canBeNone = field.optional || field.nullable
    const value = converted === source || !canBeNone ? converted : `${fromJson(field.type, `data[${key(property)}]`, names)} if ${source} is not None else None`
    return `${INDENT}${INDENT}${INDENT}${property.name}=${value},`
  })
  const fromDict = [
    `${INDENT}@classmethod`,
    `${INDENT}def from_dict(cls, data: dict[str, Any]) -> ${className}:`,
    ...(parameters.length > 0 ? [`${INDENT}${INDENT}return cls(`, ...parameters, `${INDENT}${INDENT})`] : [`${INDENT}${INDENT}return cls()`]),
  ]

  const serialize = (property: Property) => {
    const self = `self.${property.name}`
    const converted = toJson(property.field.type, self)
    return converted !== self && property.field.nullable ? `${converted} if ${self} is not None else None` : converted
  }
  const required = properties.filter((property) => !property.field.optional)
  const optional = properties.filter((property) => property.field.optional)
  const toDict = [`${INDENT}def to_dict(self) -> dict[str, Any]:`]
  if (optional.length === 0) {
    toDict.push(
      required.length === 0
        ? `${INDENT}${INDENT}return {}`
        : [`${INDENT}${INDENT}return {`, ...required.map((property) => `${INDENT}${INDENT}${INDENT}${key(property)}: ${serialize(property)},`), `${INDENT}${INDENT}}`].join('\n'),
    )
  } else {
    toDict.push(
      required.length === 0
        ? `${INDENT}${INDENT}data: dict[str, Any] = {}`
        : [`${INDENT}${INDENT}data: dict[str, Any] = {`, ...required.map((property) => `${INDENT}${INDENT}${INDENT}${key(property)}: ${serialize(property)},`), `${INDENT}${INDENT}}`].join('\n'),
      // Fields missing from the JSON stay missing, instead of becoming null
      ...optional.map((property) => `${INDENT}${INDENT}if self.${property.name} is not None:\n${INDENT}${INDENT}${INDENT}data[${key(property)}] = ${toJson(property.field.type, `self.${property.name}`)}`),
      `${INDENT}${INDENT}return data`,
    )
  }
  return [...fromDict, '', ...toDict].join('\n')
}

function usage(schema: Schema, style: string, rootName: string, moduleName: string): string {
  const list = schema.root.kind === 'array'
  const read = `from ${moduleName} import ${rootName}`
  if (style === 'pydantic') {
    if (list) {
      return [
        'from pydantic import TypeAdapter',
        '',
        read,
        '',
        `adapter = TypeAdapter(list[${rootName}])`,
        "items = adapter.validate_json(text)  # text: the API response",
        'print(adapter.dump_json(items, by_alias=True))',
        '',
      ].join('\n')
    }
    return [read, '', `root = ${rootName}.model_validate_json(text)  # text: the API response`, 'print(root.model_dump_json(by_alias=True, exclude_unset=True))', ''].join('\n')
  }
  return [
    'import json',
    '',
    read,
    '',
    ...(list
      ? [`items = [${rootName}.from_dict(item) for item in json.loads(text)]  # text: the API response`, 'print(json.dumps([item.to_dict() for item in items]))']
      : [`root = ${rootName}.from_dict(json.loads(text))  # text: the API response`, 'print(json.dumps(root.to_dict()))']),
    '',
  ].join('\n')
}

export const python: Generator = {
  id: 'python',
  label: 'Python',
  options: [
    {
      id: 'style',
      choices: [
        { id: 'dataclass', label: 'dataclass' },
        { id: 'pydantic', label: 'Pydantic' },
        { id: 'class', label: 'class' },
      ],
    },
  ],
  supportsMultipleFiles: true,
  generate,
}
