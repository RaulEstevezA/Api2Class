import { toSnakeCase } from '../../naming.ts'
import type { ClassDef, PrimitiveType, Schema, TypeRef } from '../../schema.ts'
import { createNames, noClassesMessage, type Names } from '../common.ts'
import { type GeneratedCode, type GenerateSettings, type Generator } from '../types.ts'

// Smithy IDL 2.0. A date-time is a timestamp written as RFC 3339; dates and UUIDs are strings.
const PRIMITIVES: Record<PrimitiveType, string> = {
  string: 'String',
  integer: 'Long',
  float: 'Double',
  boolean: 'Boolean',
  date: 'String',
  datetime: 'Timestamp',
  uuid: 'String',
  object: 'Document',
  null: 'Document',
  any: 'Document',
}

// Shapes of the prelude: a structure with one of these names would hide it
const PRELUDE = new Set(
  'BigDecimal BigInteger Blob Boolean Byte Document Double Float Integer Long PrimitiveBoolean PrimitiveByte PrimitiveDouble PrimitiveFloat PrimitiveInteger PrimitiveLong PrimitiveShort Short String Timestamp Unit'.split(
    ' ',
  ),
)
const INDENT = '    '

function generate(schema: Schema, settings: GenerateSettings): GeneratedCode {
  if (schema.classes.length === 0) return { files: [{ name: 'model.smithy', code: `// ${noClassesMessage(schema)}\n` }], usage: null, notes: [] }

  const names = createNames(schema, settings, {
    reserved: new Set(),
    reservedClasses: PRELUDE,
    defaultNaming: 'camelCase',
    escapeReserved: (name) => `${name}Shape`,
    // Smithy identifiers cannot start with _ followed by a digit
    digitPrefix: 'field',
  })
  // Smithy has no inline list types: every list is a shape with a name (OrderList, StringList)
  const lists = new Map<string, string>()

  function shapeName(type: TypeRef): string {
    if (type.kind === 'class') return names.className(type.classId)
    if (type.kind === 'primitive') return PRIMITIVES[type.name]
    const member = shapeName(type.items)
    const name = `${member}${type.itemsNullable ? 'Sparse' : ''}List`
    if (!lists.has(name)) {
      // @sparse lets a list hold nulls
      lists.set(name, `${type.itemsNullable ? '@sparse\n' : ''}list ${name} {\n${INDENT}member: ${member}\n}`)
    }
    return name
  }

  const structures = schema.classes.map((item) => structure(item, names, shapeName))
  const code = ['$version: "2"', '', 'namespace example.api', '', [...structures, ...lists.values()].join('\n\n'), ''].join('\n')
  return { files: [{ name: `${toSnakeCase(names.className(schema.classes[0].id)) || 'model'}.smithy`, code }], usage: null, notes: names.notes }
}

function structure(item: ClassDef, names: Names, shapeName: (type: TypeRef) => string): string {
  const members = names.properties(item).map(({ field, name, renamed }) => {
    const traits: string[] = []
    // A member that can be missing or null is not @required
    const onlyNull = field.type.kind === 'primitive' && field.type.name === 'null'
    if (!field.optional && !field.nullable && !onlyNull) traits.push('@required')
    if (renamed) traits.push(`@jsonName(${JSON.stringify(field.key)})`)
    if (field.type.kind === 'primitive' && field.type.name === 'datetime') traits.push('@timestampFormat("date-time")')
    return [...traits.map((trait) => `${INDENT}${trait}`), `${INDENT}${name}: ${shapeName(field.type)}`].join('\n')
  })
  return `structure ${names.className(item.id)} {${members.length > 0 ? `\n${members.join('\n\n')}\n` : ''}}`
}

export const smithy: Generator = {
  id: 'smithy',
  label: 'Smithy',
  options: [{ id: 'style', choices: [{ id: 'idl-2', label: 'IDL 2.0' }] }],
  supportsMultipleFiles: false,
  generate,
}
