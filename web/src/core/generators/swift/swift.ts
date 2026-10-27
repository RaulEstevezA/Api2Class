import type { ClassDef, PrimitiveType, Schema, TypeRef } from '../../schema.ts'
import { createNames, noClassesMessage, primitivesUsed, type Names } from '../common.ts'
import { type GeneratedCode, type GenerateSettings, type Generator } from '../types.ts'

// Keywords that need backticks to be used as names
const KEYWORDS = new Set(
  'associatedtype class deinit enum extension fileprivate func import init inout internal let open operator private protocol public rethrows static struct subscript typealias var break case continue default defer do else fallthrough for guard if in repeat return switch where while as Any catch false is nil super self Self throw throws true try'.split(
    ' ',
  ),
)

// Dates without time stay as text: JSONDecoder's ISO 8601 strategy only reads date-times
const PRIMITIVES: Record<PrimitiveType, string> = {
  string: 'String',
  integer: 'Int',
  float: 'Double',
  boolean: 'Bool',
  date: 'String',
  datetime: 'Date',
  uuid: 'UUID',
  object: '[String: JSONValue]',
  null: 'JSONValue?',
  any: 'JSONValue',
}

const INDENT = '    '

// Swift has no type for "any JSON value": this enum is added when a field needs one
const JSON_VALUE = `/// Any JSON value, for fields whose type is not fixed.
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
}`

function generate(schema: Schema, settings: GenerateSettings): GeneratedCode {
  if (schema.classes.length === 0) return { files: [{ name: 'Models.swift', code: `// ${noClassesMessage(schema)}\n` }], usage: null, notes: [] }

  const names = createNames(schema, settings, { reserved: KEYWORDS, defaultNaming: 'camelCase', escapeReserved: (name) => `\`${name}\`` })
  const blocks = schema.classes.map((item) => ({ item, code: struct(item, names) }))
  const needsJsonValue = schema.classes.some((item) => [...primitivesUsed(item.fields)].some((name) => name === 'any' || name === 'object' || name === 'null'))

  // Swift files of the same module see each other: no imports between them
  const header = 'import Foundation\n\n'
  const files = settings.multipleFiles
    ? [
        ...blocks.map(({ item, code }) => ({ name: `${names.className(item.id)}.swift`, code: `${header}${code}\n` })),
        ...(needsJsonValue ? [{ name: 'JSONValue.swift', code: `${header}${JSON_VALUE}\n` }] : []),
      ]
    : [
        {
          name: `${names.className(schema.classes[0].id)}.swift`,
          code: `${header}${[...blocks.map((block) => block.code), ...(needsJsonValue ? [JSON_VALUE] : [])].join('\n\n')}\n`,
        },
      ]
  return { files, usage: usage(schema, names), notes: names.notes }
}

function typeName(type: TypeRef, names: Names): string {
  if (type.kind === 'class') return names.className(type.classId)
  if (type.kind === 'array') {
    const items = typeName(type.items, names)
    return `[${type.itemsNullable && !items.endsWith('?') ? `${items}?` : items}]`
  }
  return PRIMITIVES[type.name]
}

function struct(item: ClassDef, names: Names): string {
  const properties = names.properties(item)
  const lines = [`struct ${names.className(item.id)}: Codable {`]
  for (const { field, name } of properties) {
    const type = typeName(field.type, names)
    // Optionals are decoded with decodeIfPresent: a missing key is nil too
    lines.push(`${INDENT}let ${name}: ${(field.nullable || field.optional) && !type.endsWith('?') ? `${type}?` : type}`)
  }
  if (properties.some((property) => property.renamed && property.name !== `\`${property.field.key}\``)) {
    lines.push('', `${INDENT}enum CodingKeys: String, CodingKey {`)
    for (const { field, name, renamed } of properties) {
      lines.push(`${INDENT}${INDENT}case ${name}${renamed && name !== `\`${field.key}\`` ? ` = ${JSON.stringify(field.key)}` : ''}`)
    }
    lines.push(`${INDENT}}`)
  }
  lines.push('}')
  return lines.join('\n')
}

function usage(schema: Schema, names: Names): string {
  const root = names.className(schema.classes[0].id)
  const type = schema.root.kind === 'array' ? `[${root}]` : root
  return [
    'let decoder = JSONDecoder()',
    '// Date-times as RFC 3339 text (use a custom strategy for fractional seconds)',
    'decoder.dateDecodingStrategy = .iso8601',
    `let ${schema.root.kind === 'array' ? 'items' : 'root'} = try decoder.decode(${type}.self, from: data)`,
    '',
  ].join('\n')
}

export const swift: Generator = {
  id: 'swift',
  label: 'Swift',
  options: [{ id: 'style', choices: [{ id: 'codable', label: 'struct Codable' }] }],
  supportsMultipleFiles: true,
  generate,
}

