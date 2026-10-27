import { toSnakeCase } from '../../naming.ts'
import type { ClassDef, PrimitiveType, Schema, TypeRef } from '../../schema.ts'
import { createNames, noClassesMessage, type Names } from '../common.ts'
import { type GeneratedCode, type GenerateSettings, type Generator } from '../types.ts'

const KEYWORDS = new Set(
  'as async await break const continue crate dyn else enum extern false fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait true type unsafe use where while abstract become box do final macro override priv try typeof unsized virtual yield'.split(
    ' ',
  ),
)

// Dates and UUIDs stay as text, so the code only needs serde and serde_json
const PRIMITIVES: Record<PrimitiveType, string> = {
  string: 'String',
  integer: 'i64',
  float: 'f64',
  boolean: 'bool',
  date: 'String',
  datetime: 'String',
  uuid: 'String',
  object: 'serde_json::Map<String, serde_json::Value>',
  null: 'serde_json::Value',
  any: 'serde_json::Value',
}

const INDENT = '    '

function generate(schema: Schema, settings: GenerateSettings): GeneratedCode {
  if (schema.classes.length === 0) return { files: [{ name: 'models.rs', code: `// ${noClassesMessage(schema)}\n` }], usage: null, notes: [] }

  const names = createNames(schema, settings, { reserved: KEYWORDS, defaultNaming: 'snake_case', escapeReserved: (name) => `${name}_` })
  const code = `use serde::{Deserialize, Serialize};\n\n${schema.classes.map((item) => struct(item, names)).join('\n\n')}\n`
  return { files: [{ name: `${toSnakeCase(names.className(schema.classes[0].id)) || 'models'}.rs`, code }], usage: usage(schema, names), notes: names.notes }
}

function typeName(type: TypeRef, names: Names): string {
  if (type.kind === 'class') return names.className(type.classId)
  if (type.kind === 'array') {
    const items = typeName(type.items, names)
    // serde_json::Value already holds null
    return `Vec<${type.itemsNullable && items !== 'serde_json::Value' ? `Option<${items}>` : items}>`
  }
  return PRIMITIVES[type.name]
}

function struct(item: ClassDef, names: Names): string {
  const fields = names.properties(item).map(({ field, name, renamed }) => {
    const type = typeName(field.type, names)
    const option = (field.nullable || field.optional) && type !== 'serde_json::Value'
    const attributes: string[] = []
    if (renamed) attributes.push(`rename = ${JSON.stringify(field.key)}`)
    // A field missing from the JSON is None, and stays missing when writing it back
    if (field.optional) attributes.push('default', 'skip_serializing_if = "Option::is_none"')
    const lines = attributes.length > 0 ? [`${INDENT}#[serde(${attributes.join(', ')})]`] : []
    lines.push(`${INDENT}pub ${name}: ${option ? `Option<${type}>` : type},`)
    return lines.join('\n')
  })
  return [
    '#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]',
    `pub struct ${names.className(item.id)} {`,
    ...fields,
    '}',
  ].join('\n')
}

function usage(schema: Schema, names: Names): string {
  const root = names.className(schema.classes[0].id)
  const list = schema.root.kind === 'array'
  return [
    '// Cargo.toml: serde = { version = "1", features = ["derive"] }, serde_json = "1"',
    `let ${list ? 'items' : 'root'}: ${list ? `Vec<${root}>` : root} = serde_json::from_str(&text)?;`,
    `println!("{}", serde_json::to_string(&${list ? 'items' : 'root'})?);`,
    '',
  ].join('\n')
}

export const rust: Generator = {
  id: 'rust',
  label: 'Rust',
  options: [{ id: 'style', choices: [{ id: 'serde', label: 'struct + serde' }] }],
  // Several files would need a module tree, which depends on the project
  supportsMultipleFiles: false,
  generate,
}
