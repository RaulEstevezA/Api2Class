import type { ClassDef, PrimitiveType, Schema, TypeRef } from '../../schema.ts'
import { createNames, noClassesMessage, requiredFirst, type Names, type Property } from '../common.ts'
import { type GeneratedCode, type GenerateSettings, type Generator } from '../types.ts'

// Reserved for class names, whatever their case. Property names ($class, $list) can be anything.
const RESERVED_CLASSES = new Set(
  'abstract and array as bool break callable case catch class clone const continue declare default do echo else elseif empty enddeclare endfor endforeach endif endswitch endwhile enum eval exit extends false final finally float fn for foreach function global goto if implements include instanceof insteadof int interface isset iterable list match mixed namespace never new null object or parent print private protected public readonly require return self static string switch throw trait true try unset use var void while xor yield'.split(
    ' ',
  ),
)

const PRIMITIVES: Record<PrimitiveType, string> = {
  string: 'string',
  integer: 'int',
  float: 'float',
  boolean: 'bool',
  date: '\\DateTimeImmutable',
  datetime: '\\DateTimeImmutable',
  uuid: 'string',
  object: 'array',
  null: 'mixed',
  any: 'mixed',
}

const INDENT = '    '

function generate(schema: Schema, settings: GenerateSettings): GeneratedCode {
  if (schema.classes.length === 0) return { files: [{ name: 'Models.php', code: `<?php\n\n// ${noClassesMessage(schema)}\n` }], usage: null, notes: [] }

  const names = createNames(schema, settings, {
    reserved: new Set(),
    reservedClasses: RESERVED_CLASSES,
    caseInsensitive: true,
    defaultNaming: 'camelCase',
    escapeReserved: (name) => `${name}Model`,
  })
  const blocks = schema.classes.map((item) => ({ item, code: phpClass(item, names) }))
  // strict_types: values are converted explicitly in fromArray, never silently
  const header = '<?php\n\ndeclare(strict_types=1);\n\n'
  const files = settings.multipleFiles
    ? blocks.map(({ item, code }) => ({ name: `${names.className(item.id)}.php`, code: `${header}${code}\n` }))
    : [{ name: `${names.className(schema.classes[0].id)}.php`, code: `${header}${blocks.map((block) => block.code).join('\n\n')}\n` }]
  return { files, usage: usage(schema, names), notes: names.notes }
}

/** Type for the parameter declaration: PHP has no typed arrays, so lists are `array`. */
function phpType(property: Property, names: Names): string {
  const { type, nullable, optional } = property.field
  const base = type.kind === 'array' ? 'array' : type.kind === 'class' ? names.className(type.classId) : PRIMITIVES[type.name]
  return (nullable || optional) && base !== 'mixed' ? `?${base}` : base
}

/** Type for the PHPDoc: `list<Order>`, `list<?string>`. */
function docType(type: TypeRef, names: Names): string {
  if (type.kind === 'class') return names.className(type.classId)
  if (type.kind === 'array') return `list<${type.itemsNullable ? '?' : ''}${docType(type.items, names)}>`
  return type.name === 'object' ? 'array<string, mixed>' : PRIMITIVES[type.name]
}

function quote(text: string): string {
  return `'${text.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
}

/** PHP expression that reads `source` (from json_decode(..., true)) as `type`. */
function fromJson(type: TypeRef, source: string, names: Names, depth = 0): string {
  if (type.kind === 'class') return `${names.className(type.classId)}::fromArray(${source})`
  if (type.kind === 'array') {
    const item = depth === 0 ? '$item' : `$item${depth + 1}`
    const inner = fromJson(type.items, item, names, depth + 1)
    if (inner === item) return source
    const element = type.itemsNullable ? `${item} === null ? null : ${inner}` : inner
    return `array_map(static fn ($${item.slice(1)}) => ${element}, ${source})`
  }
  // json_decode gives 120 for 120.0, an int that strict_types would refuse as a float
  if (type.name === 'float') return `(float) ${source}`
  if (type.name === 'date' || type.name === 'datetime') return `new \\DateTimeImmutable(${source})`
  return source
}

/** PHP expression that turns `source` back into what json_encode expects. */
function toJson(type: TypeRef, source: string, depth = 0): string {
  if (type.kind === 'class') return `${source}->toArray()`
  if (type.kind === 'array') {
    const item = depth === 0 ? '$item' : `$item${depth + 1}`
    const inner = toJson(type.items, item, depth + 1)
    if (inner === item) return source
    const element = type.itemsNullable ? `${item} === null ? null : ${inner}` : inner
    return `array_map(static fn ($${item.slice(1)}) => ${element}, ${source})`
  }
  // json_decode(..., true) reads {} as [], which json_encode would write back as []
  if (type.name === 'object') return `(object) ${source}`
  if (type.name === 'datetime') return `${source}->format(\\DATE_ATOM)`
  if (type.name === 'date') return `${source}->format('Y-m-d')`
  return source
}

function phpClass(item: ClassDef, names: Names): string {
  const name = names.className(item.id)
  // Parameters with a default value must come last
  const properties = requiredFirst(names.properties(item))
  const docs = properties
    .filter((property) => property.field.type.kind === 'array' || (property.field.type.kind === 'primitive' && property.field.type.name === 'object'))
    .map((property) => `${INDENT} * @param ${property.field.nullable || property.field.optional ? '?' : ''}${docType(property.field.type, names)} $${property.name}`)
  const lines = [`final class ${name}`, '{']
  if (docs.length > 0) lines.push(`${INDENT}/**`, ...docs, `${INDENT} */`)
  lines.push(
    properties.length > 0
      ? [
          `${INDENT}public function __construct(`,
          ...properties.map(
            (property) => `${INDENT}${INDENT}public readonly ${phpType(property, names)} $${property.name}${property.field.optional ? ' = null' : ''},`,
          ),
          `${INDENT}) {`,
          `${INDENT}}`,
        ].join('\n')
      : `${INDENT}public function __construct()\n${INDENT}{\n${INDENT}}`,
    '',
    `${INDENT}/** @param array<string, mixed> $data */`,
    `${INDENT}public static function fromArray(array $data): self`,
    `${INDENT}{`,
  )
  if (properties.length === 0) {
    lines.push(`${INDENT}${INDENT}return new self();`)
  } else {
    lines.push(`${INDENT}${INDENT}return new self(`)
    for (const property of properties) {
      const { field } = property
      const source = `$data[${quote(field.key)}]`
      const value = fromJson(field.type, source, names)
      const read =
        field.optional || field.nullable ? (value === source ? `${source} ?? null` : `isset(${source}) ? ${value} : null`) : value
      lines.push(`${INDENT}${INDENT}${INDENT}${property.name}: ${read},`)
    }
    lines.push(`${INDENT}${INDENT});`)
  }
  lines.push(`${INDENT}}`, '', `${INDENT}/** @return array<string, mixed> */`, `${INDENT}public function toArray(): array`, `${INDENT}{`)

  const write = (property: Property) => {
    const value = toJson(property.field.type, `$this->${property.name}`)
    return property.field.nullable && value !== `$this->${property.name}` ? `$this->${property.name} === null ? null : ${value}` : value
  }
  const required = properties.filter((property) => !property.field.optional)
  const optional = properties.filter((property) => property.field.optional)
  const array = required.length === 0 ? '[]' : `[\n${required.map((property) => `${INDENT}${INDENT}${INDENT}${quote(property.field.key)} => ${write(property)},`).join('\n')}\n${INDENT}${INDENT}]`
  if (optional.length === 0) {
    lines.push(`${INDENT}${INDENT}return ${array};`)
  } else {
    lines.push(`${INDENT}${INDENT}$data = ${array};`)
    // Fields missing from the JSON stay missing instead of becoming null
    for (const property of optional) {
      lines.push(
        `${INDENT}${INDENT}if ($this->${property.name} !== null) {`,
        `${INDENT}${INDENT}${INDENT}$data[${quote(property.field.key)}] = ${toJson(property.field.type, `$this->${property.name}`)};`,
        `${INDENT}${INDENT}}`,
      )
    }
    lines.push(`${INDENT}${INDENT}return $data;`)
  }
  lines.push(`${INDENT}}`, '}')
  return lines.join('\n')
}

function usage(schema: Schema, names: Names): string {
  const root = names.className(schema.classes[0].id)
  const decode = 'json_decode($json, true, flags: JSON_THROW_ON_ERROR)'
  return schema.root.kind === 'array'
    ? `$items = array_map(static fn (array $item) => ${root}::fromArray($item), ${decode});\necho json_encode(array_map(static fn (${root} $item) => $item->toArray(), $items));\n`
    : `$root = ${root}::fromArray(${decode});\necho json_encode($root->toArray());\n`
}

export const php: Generator = {
  id: 'php',
  label: 'PHP',
  options: [{ id: 'style', choices: [{ id: 'class', label: 'readonly class (PHP 8.1+)' }] }],
  supportsMultipleFiles: true,
  generate,
}
