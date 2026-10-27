import type { ClassDef, PrimitiveType, Schema, TypeRef } from '../../schema.ts'
import { createNames, type Names } from '../common.ts'
import { type GeneratedCode, type GenerateSettings, type Generator } from '../types.ts'

type JsonSchema = Record<string, unknown>

const PRIMITIVES: Record<PrimitiveType, JsonSchema> = {
  string: { type: 'string' },
  integer: { type: 'integer' },
  float: { type: 'number' },
  boolean: { type: 'boolean' },
  date: { type: 'string', format: 'date' },
  datetime: { type: 'string', format: 'date-time' },
  uuid: { type: 'string', format: 'uuid' },
  object: { type: 'object' },
  null: { type: 'null' },
  // Any value
  any: {},
}

/** Draft 2020-12 schema describing the JSON as it arrives: properties are always the JSON keys. */
function generate(schema: Schema, settings: GenerateSettings): GeneratedCode {
  const names = createNames(schema, settings, { reserved: new Set(), defaultNaming: 'keep', anyPropertyName: true })
  const defs = Object.fromEntries(schema.classes.map((item) => [names.className(item.id), classSchema(item, names)]))
  const document: JsonSchema = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: schema.classes[0] ? names.className(schema.classes[0].id) : 'Root',
    ...typeSchema(schema.root, names),
    ...(schema.classes.length > 0 ? { $defs: defs } : {}),
  }
  const name = `${schema.classes[0] ? names.className(schema.classes[0].id) : 'root'}.schema.json`
  return { files: [{ name, code: `${JSON.stringify(document, null, 2)}\n` }], usage: usage(name), notes: [] }
}

function typeSchema(type: TypeRef, names: Names): JsonSchema {
  if (type.kind === 'class') return { $ref: `#/$defs/${names.className(type.classId)}` }
  if (type.kind === 'array') return { type: 'array', items: type.itemsNullable ? nullable(typeSchema(type.items, names)) : typeSchema(type.items, names) }
  return { ...PRIMITIVES[type.name] }
}

/** The same schema, also accepting null. */
function nullable(schema: JsonSchema): JsonSchema {
  if (Object.keys(schema).length === 0) return schema
  if (typeof schema.type === 'string' && !schema.$ref) return schema.type === 'null' ? schema : { ...schema, type: [schema.type, 'null'] }
  return { anyOf: [schema, { type: 'null' }] }
}

function classSchema(item: ClassDef, names: Names): JsonSchema {
  const properties = Object.fromEntries(
    item.fields.map((field) => [field.key, field.nullable ? nullable(typeSchema(field.type, names)) : typeSchema(field.type, names)]),
  )
  const required = item.fields.filter((field) => !field.optional).map((field) => field.key)
  return { type: 'object', properties, ...(required.length > 0 ? { required } : {}) }
}

function usage(fileName: string): string {
  return [
    '# Validate a response with the schema (Python, pip install jsonschema)',
    'import json',
    'from jsonschema import validate',
    '',
    `validate(instance=json.loads(text), schema=json.load(open(${JSON.stringify(fileName)})))`,
    '',
  ].join('\n')
}

export const jsonSchema: Generator = {
  id: 'jsonschema',
  label: 'JSON Schema',
  options: [{ id: 'style', choices: [{ id: 'draft-2020-12', label: 'Draft 2020-12' }] }],
  supportsMultipleFiles: false,
  generate,
}
