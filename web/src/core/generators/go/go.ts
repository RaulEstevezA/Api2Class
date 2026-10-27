import { splitWords, toPascalCase } from '../../naming.ts'
import type { ClassDef, PrimitiveType, Schema, TypeRef } from '../../schema.ts'
import { createNames, noClassesMessage, primitivesUsed, type Names } from '../common.ts'
import { type GeneratedCode, type GenerateSettings, type Generator } from '../types.ts'

// Written in capitals in Go names (golint's list): UserId → UserID, ApiUrl → APIURL
const INITIALISMS = new Set(
  'ACL API ASCII CPU CSS DNS EOF GUID HTML HTTP HTTPS ID IP JSON LHS QPS RAM RHS RPC SLA SMTP SQL SSH TCP TLS TTL UDP UI UID UUID URI URL UTF8 VM XML XMPP XSRF XSS'.split(' '),
)

// Dates without time stay as text: time.Time only reads RFC 3339 date-times
const PRIMITIVES: Record<PrimitiveType, string> = {
  string: 'string',
  integer: 'int64',
  float: 'float64',
  boolean: 'bool',
  date: 'string',
  datetime: 'time.Time',
  uuid: 'string',
  object: 'map[string]any',
  null: 'any',
  any: 'any',
}

/** Exported (capitalized) Go name with initialisms in capitals. */
function goName(name: string): string {
  const words = splitWords(name).map((word) => (INITIALISMS.has(word.toUpperCase()) ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1)))
  return words.join('') || toPascalCase(name)
}

function generate(schema: Schema, settings: GenerateSettings): GeneratedCode {
  if (schema.classes.length === 0) return { files: [{ name: 'models.go', code: `// ${noClassesMessage(schema)}\npackage models\n` }], usage: null, notes: [] }

  // Fields must start with a capital to be exported, or encoding/json ignores them
  const names = createNames(schema, settings, { reserved: new Set(), defaultNaming: 'PascalCase', adjust: goName, digitPrefix: 'Field' })
  const blocks = schema.classes.map((item) => ({ item, code: struct(item, names) }))
  const usesTime = (item: ClassDef) => primitivesUsed(item.fields).has('datetime')
  const header = (time: boolean) => `package models\n\n${time ? 'import "time"\n\n' : ''}`

  const files = settings.multipleFiles
    ? blocks.map(({ item, code }) => ({ name: `${fileName(names.className(item.id))}.go`, code: `${header(usesTime(item))}${code}\n` }))
    : [
        {
          name: `${fileName(names.className(schema.classes[0].id))}.go`,
          code: `${header(schema.classes.some(usesTime))}${blocks.map((block) => block.code).join('\n\n')}\n`,
        },
      ]
  return { files, usage: usage(schema, names), notes: names.notes }
}

function fileName(name: string): string {
  return splitWords(name).map((word) => word.toLowerCase()).join('_') || 'models'
}

function typeName(type: TypeRef, names: Names): string {
  if (type.kind === 'class') return goName(names.className(type.classId))
  if (type.kind === 'array') {
    const items = typeName(type.items, names)
    return `[]${type.itemsNullable && !canBeNil(type.items) ? `*${items}` : items}`
  }
  return PRIMITIVES[type.name]
}

/** Slices, maps and any can already be nil; everything else needs a pointer to be null. */
function canBeNil(type: TypeRef): boolean {
  return type.kind === 'array' || (type.kind === 'primitive' && (type.name === 'object' || type.name === 'any' || type.name === 'null'))
}

function struct(item: ClassDef, names: Names): string {
  const rows = names.properties(item).map(({ field, name }) => {
    const type = typeName(field.type, names)
    const pointer = (field.nullable || field.optional) && !canBeNil(field.type)
    // omitempty: a field missing from the JSON stays missing when writing it back
    const tag = `\`json:"${field.key.replace(/["\\`]/g, '')}${field.optional ? ',omitempty' : ''}"\``
    // Names chosen by the user are capitalized too
    return [name.charAt(0).toUpperCase() + name.slice(1), `${pointer ? '*' : ''}${type}`, tag]
  })
  // Aligned in columns, as gofmt leaves them
  const widths = [0, 1].map((column) => Math.max(0, ...rows.map((row) => row[column].length)))
  const lines = rows.map(([name, type, tag]) => `\t${name.padEnd(widths[0])} ${type.padEnd(widths[1])} ${tag}`)
  const name = goName(names.className(item.id))
  return lines.length > 0 ? `type ${name} struct {\n${lines.join('\n')}\n}` : `type ${name} struct{}`
}

function usage(schema: Schema, names: Names): string {
  const root = goName(names.className(schema.classes[0].id))
  const list = schema.root.kind === 'array'
  return [
    `var ${list ? 'items' : 'root'} ${list ? `[]models.${root}` : `models.${root}`}`,
    `if err := json.Unmarshal(data, &${list ? 'items' : 'root'}); err != nil {`,
    '\treturn err',
    '}',
    '',
  ].join('\n')
}

export const go: Generator = {
  id: 'go',
  label: 'Go',
  options: [{ id: 'style', choices: [{ id: 'struct', label: 'struct + json tags' }] }],
  supportsMultipleFiles: true,
  generate,
}
