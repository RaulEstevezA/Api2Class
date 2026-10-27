import type { PrimitiveType, Schema, TypeRef } from '../../schema.ts'
import { classNames, noClassesMessage } from '../common.ts'
import type { Generator } from '../types.ts'

// Reserved as type names; property names can be any string
const RESERVED_TYPES = new Set(
  'any boolean break case catch class const continue debugger default delete do else enum export extends false finally for function if import in instanceof never new null number object return string super switch symbol this throw true try typeof undefined unknown var void while with'.split(
    ' ',
  ),
)

// Dates and UUIDs arrive as strings: JSON.parse does not turn them into Date objects
const PRIMITIVES: Record<PrimitiveType, string> = {
  string: 'string',
  integer: 'number',
  float: 'number',
  boolean: 'boolean',
  date: 'string',
  datetime: 'string',
  uuid: 'string',
  object: 'Record<string, unknown>',
  null: 'null',
  any: 'unknown',
}

const INDENT = '  '

function generate(schema: Schema) {
  if (schema.classes.length === 0) return { fileName: 'model.ts', code: `// ${noClassesMessage(schema)}\n` }

  const names = classNames(schema, RESERVED_TYPES)

  function typeName(type: TypeRef): string {
    if (type.kind === 'class') return names.get(type.classId)!
    if (type.kind === 'array') return type.itemsNullable ? `(${typeName(type.items)} | null)[]` : `${typeName(type.items)}[]`
    return PRIMITIVES[type.name]
  }

  // Interfaces describe the JSON as it is, so properties keep their keys (quoted when they need it)
  const blocks = schema.classes.map((item) => {
    const lines = item.fields.map((field) => {
      const key = /^[A-Za-z_$][\w$]*$/.test(field.key) ? field.key : JSON.stringify(field.key)
      const type = typeName(field.type)
      return `${INDENT}${key}${field.optional ? '?' : ''}: ${field.nullable && type !== 'null' ? `${type} | null` : type};`
    })
    const header = `export interface ${names.get(item.id)} {`
    return lines.length > 0 ? `${header}\n${lines.join('\n')}\n}` : `${header}}`
  })

  return { fileName: `${names.get(schema.classes[0].id)}.ts`, code: `${blocks.join('\n\n')}\n` }
}

export const typescript: Generator = {
  id: 'typescript',
  label: 'TypeScript',
  styles: [{ id: 'interface', label: 'interface' }],
  generate,
}
