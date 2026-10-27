import type { ClassDef, PrimitiveType, Schema, TypeRef } from '../../schema.ts'
import { createNames, noClassesMessage, type Names } from '../common.ts'
import { type GeneratedCode, type GenerateSettings, type Generator } from '../types.ts'

const KEYWORDS = new Set(
  'abstract case catch class def do else enum export extends false final finally for forSome given if implicit import lazy match new null object override package private protected return sealed super then this throw trait true try type val var while with yield'.split(
    ' ',
  ),
)

const PRIMITIVES: Record<PrimitiveType, string> = {
  string: 'String',
  integer: 'Long',
  float: 'Double',
  boolean: 'Boolean',
  date: 'LocalDate',
  datetime: 'OffsetDateTime',
  uuid: 'UUID',
  object: 'JsonObject',
  null: 'Json',
  any: 'Json',
}

const INDENT = '  '
const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/

function generate(schema: Schema, settings: GenerateSettings): GeneratedCode {
  if (schema.classes.length === 0) return { files: [{ name: 'Models.scala', code: `// ${noClassesMessage(schema)}\n` }], usage: null, notes: [] }

  // circe derives the codecs from the field names, so fields keep the JSON keys (between backticks
  // when they are not plain identifiers): property naming and renames do not apply
  const names = createNames(schema, { ...settings, naming: 'keep' }, { reserved: KEYWORDS, defaultNaming: 'keep', anyPropertyName: true })
  const used = new Set<string>()
  const body = schema.classes.map((item) => caseClass(item, names, used)).join('\n\n')
  const imports = [
    ...(used.has('date') || used.has('datetime') ? [`import java.time.{${[...(used.has('date') ? ['LocalDate'] : []), ...(used.has('datetime') ? ['OffsetDateTime'] : [])].join(', ')}}`] : []),
    ...(used.has('uuid') ? ['import java.util.UUID'] : []),
    `import io.circe.{${['Decoder', 'Encoder', ...(used.has('any') || used.has('null') ? ['Json'] : []), ...(used.has('object') ? ['JsonObject'] : [])].join(', ')}}`,
  ]
  const code = `${imports.join('\n')}\n\n${body}\n`
  return { files: [{ name: `${names.className(schema.classes[0].id)}.scala`, code }], usage: usage(schema, names), notes: names.notes }
}

function typeName(type: TypeRef, names: Names, used: Set<string>): string {
  if (type.kind === 'class') return names.className(type.classId)
  if (type.kind === 'array') {
    const items = typeName(type.items, names, used)
    return `List[${type.itemsNullable && items !== 'Json' ? `Option[${items}]` : items}]`
  }
  used.add(type.name)
  return PRIMITIVES[type.name]
}

function caseClass(item: ClassDef, names: Names, used: Set<string>): string {
  const parameters = item.fields.map((field) => {
    const name = IDENTIFIER.test(field.key) && !KEYWORDS.has(field.key) ? field.key : `\`${field.key.replace(/`/g, '')}\``
    const type = typeName(field.type, names, used)
    const option = (field.nullable || field.optional) && type !== 'Json'
    // circe decodes a missing Option as None
    return `${INDENT}${name}: ${option ? `Option[${type}]` : type}${field.optional ? ' = None' : ''}`
  })
  const name = names.className(item.id)
  return `final case class ${name}(${parameters.length > 0 ? `\n${parameters.join(',\n')}\n` : ''}) derives Decoder, Encoder.AsObject`
}

function usage(schema: Schema, names: Names): string {
  const root = names.className(schema.classes[0].id)
  const type = schema.root.kind === 'array' ? `List[${root}]` : root
  return [
    '// build.sbt: "io.circe" %% "circe-core" % "0.14.x", "io.circe" %% "circe-parser" % "0.14.x"',
    'import io.circe.parser.decode',
    'import io.circe.syntax.*',
    '',
    `val result: Either[io.circe.Error, ${type}] = decode[${type}](text)`,
    'result.foreach(value => println(value.asJson.noSpaces))',
    '',
  ].join('\n')
}

export const scala: Generator = {
  id: 'scala',
  label: 'Scala 3',
  options: [{ id: 'style', choices: [{ id: 'circe', label: 'case class + circe' }] }],
  supportsMultipleFiles: false,
  generate,
}
