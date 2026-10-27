import { toSnakeCase } from '../../naming.ts'
import type { ClassDef, PrimitiveType, Schema, TypeRef } from '../../schema.ts'
import { createNames, dependencies, noClassesMessage, type Names, type Property } from '../common.ts'
import { optionValue, type GeneratedCode, type GenerateSettings, type Generator } from '../types.ts'

const KEYWORDS = new Set(
  'assert break case catch class const continue default do else enum extends false final finally for if in is new null rethrow return super switch this throw true try var void while with'.split(
    ' ',
  ),
)

const PRIMITIVES: Record<PrimitiveType, string> = {
  string: 'String',
  integer: 'int',
  float: 'double',
  boolean: 'bool',
  date: 'DateTime',
  datetime: 'DateTime',
  uuid: 'String',
  object: 'Map<String, dynamic>',
  null: 'Object?',
  any: 'dynamic',
}

const INDENT = '  '

function generate(schema: Schema, settings: GenerateSettings): GeneratedCode {
  if (schema.classes.length === 0) return { files: [{ name: 'models.dart', code: `// ${noClassesMessage(schema)}\n` }], usage: null, notes: [] }

  const style = optionValue(dart, settings, 'style')
  const copyWith = optionValue(dart, settings, 'copyWith') === 'yes'
  const names = createNames(schema, settings, {
    reserved: KEYWORDS,
    defaultNaming: 'camelCase',
    // A leading underscore makes a name private in Dart
    digitPrefix: 'field',
    escapeReserved: (name) => `${name}Value`,
  })
  const fileOf = (classId: string) => `${toSnakeCase(names.className(classId)) || 'models'}.dart`

  const blocks = schema.classes.map((item) => ({
    item,
    code: style === 'freezed' ? freezedClass(item, names) : style === 'json_serializable' ? serializableClass(item, names) : plainClass(item, names, copyWith),
  }))

  const header = (fileName: string, local: string[]) => {
    const base = fileName.replace(/\.dart$/, '')
    const lines =
      style === 'freezed'
        ? ["import 'package:freezed_annotation/freezed_annotation.dart';", ...local, '', `part '${base}.freezed.dart';`, `part '${base}.g.dart';`]
        : style === 'json_serializable'
          ? ["import 'package:json_annotation/json_annotation.dart';", ...local, '', `part '${base}.g.dart';`]
          : local
    return lines.length > 0 ? `${lines.join('\n')}\n\n` : ''
  }

  const files = settings.multipleFiles
    ? blocks.map(({ item, code }) => {
        const local = dependencies(item)
          .filter((dependency) => dependency !== item.id)
          .map((dependency) => `import '${fileOf(dependency)}';`)
          .sort()
        return { name: fileOf(item.id), code: `${header(fileOf(item.id), local)}${code}\n` }
      })
    : [{ name: fileOf(schema.classes[0].id), code: `${header(fileOf(schema.classes[0].id), [])}${blocks.map((block) => block.code).join('\n\n')}\n` }]

  return { files, usage: usage(schema, names, fileOf(schema.classes[0].id)), notes: names.notes }
}

function typeName(type: TypeRef, names: Names): string {
  if (type.kind === 'class') return names.className(type.classId)
  if (type.kind === 'array') {
    const items = typeName(type.items, names)
    return `List<${type.itemsNullable && items !== 'dynamic' && !items.endsWith('?') ? `${items}?` : items}>`
  }
  return PRIMITIVES[type.name]
}

function fieldType(property: Property, names: Names): string {
  const type = typeName(property.field.type, names)
  return (property.field.nullable || property.field.optional) && type !== 'dynamic' && !type.endsWith('?') ? `${type}?` : type
}

/** Dart expression that reads `source` (a value from jsonDecode) as `type`. */
function fromJson(type: TypeRef, source: string, names: Names, depth = 0): string {
  if (type.kind === 'class') return `${names.className(type.classId)}.fromJson(${source} as Map<String, dynamic>)`
  if (type.kind === 'array') {
    const item = depth === 0 ? 'e' : `e${depth + 1}`
    const inner = fromJson(type.items, item, names, depth + 1)
    const element = type.itemsNullable && inner !== item ? `${item} == null ? null : ${inner}` : inner
    return `(${source} as List<dynamic>).map((${item}) => ${element}).toList()`
  }
  switch (type.name) {
    case 'integer':
      return `${source} as int`
    // jsonDecode reads 120 as an int even in a double field
    case 'float':
      return `(${source} as num).toDouble()`
    case 'date':
    case 'datetime':
      return `DateTime.parse(${source} as String)`
    case 'object':
      return `${source} as Map<String, dynamic>`
    case 'null':
    case 'any':
      return source
    default:
      return `${source} as ${PRIMITIVES[type.name]}`
  }
}

/** Dart expression that turns `source` back into a JSON value. `nullable` adds the ?. */
function toJson(type: TypeRef, source: string, nullable: boolean, depth = 0): string {
  const access = nullable ? '?.' : '.'
  if (type.kind === 'class') return `${source}${access}toJson()`
  if (type.kind === 'array') {
    const item = depth === 0 ? 'e' : `e${depth + 1}`
    const inner = toJson(type.items, item, type.itemsNullable, depth + 1)
    return inner === item ? source : `${source}${access}map((${item}) => ${inner}).toList()`
  }
  if (type.name === 'datetime') return `${source}${access}toIso8601String()`
  // Back to the date alone, as it came
  if (type.name === 'date') return `${source}${access}toIso8601String().substring(0, 10)`
  return source
}

function plainClass(item: ClassDef, names: Names, copyWith: boolean): string {
  const name = names.className(item.id)
  const properties = names.properties(item)
  const lines = [`class ${name} {`]
  for (const property of properties) lines.push(`${INDENT}final ${fieldType(property, names)} ${property.name};`)
  if (properties.length > 0) lines.push('')

  const required = (property: Property) => (property.field.optional ? '' : 'required ')
  lines.push(
    properties.length > 0
      ? [`${INDENT}const ${name}({`, ...properties.map((property) => `${INDENT}${INDENT}${required(property)}this.${property.name},`), `${INDENT}});`].join('\n')
      : `${INDENT}const ${name}();`,
    '',
  )

  const reads = properties.map((property) => {
    const { field } = property
    const source = `json[${quote(field.key)}]`
    const value = fromJson(field.type, source, names)
    const read = (field.nullable || field.optional) && value !== source ? `${source} == null ? null : ${value}` : value
    return `${INDENT}${INDENT}${INDENT}${property.name}: ${read},`
  })
  lines.push(
    `${INDENT}factory ${name}.fromJson(Map<String, dynamic> json) => ${name}(`,
    ...reads,
    `${INDENT}${INDENT});`,
    '',
    `${INDENT}Map<String, dynamic> toJson() => {`,
    ...properties.map((property) => {
      const { field } = property
      const value = toJson(field.type, property.name, field.nullable || field.optional)
      // A field missing from the JSON stays missing instead of becoming null
      return field.optional ? `${INDENT}${INDENT}${INDENT}if (${property.name} != null) ${quote(field.key)}: ${toJson(field.type, `${property.name}!`, false)},` : `${INDENT}${INDENT}${INDENT}${quote(field.key)}: ${value},`
    }),
    `${INDENT}${INDENT}};`,
  )

  if (copyWith && properties.length > 0) {
    lines.push(
      '',
      `${INDENT}${name} copyWith({`,
      ...properties.map((property) => {
        const type = fieldType(property, names)
        return `${INDENT}${INDENT}${type === 'dynamic' || type.endsWith('?') ? type : `${type}?`} ${property.name},`
      }),
      `${INDENT}}) =>`,
      `${INDENT}${INDENT}${INDENT}${name}(`,
      ...properties.map((property) => `${INDENT}${INDENT}${INDENT}${INDENT}${property.name}: ${property.name} ?? this.${property.name},`),
      `${INDENT}${INDENT}${INDENT});`,
    )
  }
  lines.push('}')
  return lines.join('\n')
}

function jsonKey(property: Property): string {
  return property.renamed ? `@JsonKey(name: ${quote(property.field.key)})` : ''
}

function serializableClass(item: ClassDef, names: Names): string {
  const name = names.className(item.id)
  const properties = names.properties(item)
  const lines = ['@JsonSerializable(explicitToJson: true)', `class ${name} {`]
  for (const property of properties) {
    const key = jsonKey(property)
    if (key) lines.push(`${INDENT}${key}`)
    lines.push(`${INDENT}final ${fieldType(property, names)} ${property.name};`)
  }
  if (properties.length > 0) lines.push('')
  lines.push(
    properties.length > 0
      ? [
          `${INDENT}const ${name}({`,
          ...properties.map((property) => `${INDENT}${INDENT}${property.field.optional ? '' : 'required '}this.${property.name},`),
          `${INDENT}});`,
        ].join('\n')
      : `${INDENT}const ${name}();`,
    '',
    `${INDENT}factory ${name}.fromJson(Map<String, dynamic> json) => _$${name}FromJson(json);`,
    '',
    `${INDENT}Map<String, dynamic> toJson() => _$${name}ToJson(this);`,
    '}',
  )
  return lines.join('\n')
}

function freezedClass(item: ClassDef, names: Names): string {
  const name = names.className(item.id)
  const parameters = names.properties(item).map((property) => {
    const key = jsonKey(property)
    return `${INDENT}${INDENT}${key ? `${key} ` : ''}${property.field.optional ? '' : 'required '}${fieldType(property, names)} ${property.name},`
  })
  return [
    '@freezed',
    `abstract class ${name} with _$${name} {`,
    parameters.length > 0 ? `${INDENT}const factory ${name}({\n${parameters.join('\n')}\n${INDENT}}) = _${name};` : `${INDENT}const factory ${name}() = _${name};`,
    '',
    `${INDENT}factory ${name}.fromJson(Map<String, dynamic> json) => _$${name}FromJson(json);`,
    '}',
  ].join('\n')
}

function quote(text: string): string {
  // Single quotes as Dart style prefers; $ starts an interpolation, so it is escaped too
  return `'${text.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\$/g, '\\$').replace(/\n/g, '\\n')}'`
}

function usage(schema: Schema, names: Names, fileName: string): string {
  const root = names.className(schema.classes[0].id)
  return [
    "import 'dart:convert';",
    '',
    `import '${fileName}';`,
    '',
    schema.root.kind === 'array'
      ? `final items = (jsonDecode(text) as List<dynamic>).map((e) => ${root}.fromJson(e as Map<String, dynamic>)).toList();`
      : `final root = ${root}.fromJson(jsonDecode(text) as Map<String, dynamic>);`,
    schema.root.kind === 'array' ? 'print(jsonEncode(items));' : 'print(jsonEncode(root.toJson()));',
    '',
  ].join('\n')
}

export const dart: Generator = {
  id: 'dart',
  label: 'Dart',
  options: [
    {
      id: 'style',
      choices: [
        { id: 'class', label: 'class + fromJson / toJson' },
        { id: 'json_serializable', label: 'json_serializable' },
        { id: 'freezed', label: 'freezed' },
      ],
    },
    {
      id: 'copyWith',
      styles: ['class'],
      choices: [
        { id: 'no', label: 'no' },
        { id: 'yes', label: 'copyWith' },
      ],
    },
  ],
  supportsMultipleFiles: true,
  generate,
}
