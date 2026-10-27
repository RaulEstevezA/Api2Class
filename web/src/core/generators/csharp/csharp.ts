import type { ClassDef, PrimitiveType, Schema, TypeRef } from '../../schema.ts'
import { createNames, noClassesMessage, requiredFirst, type Names, type Property } from '../common.ts'
import { optionValue, type GeneratedCode, type GenerateSettings, type Generator } from '../types.ts'

const KEYWORDS = new Set(
  'abstract as base bool break byte case catch char checked class const continue decimal default delegate do double else enum event explicit extern false finally fixed float for foreach goto if implicit in int interface internal is lock long namespace new null object operator out override params private protected public readonly ref return sbyte sealed short sizeof stackalloc static string struct switch this throw true try typeof uint ulong unchecked unsafe ushort using virtual void volatile while'.split(
    ' ',
  ),
)

const PRIMITIVES: Record<PrimitiveType, string> = {
  string: 'string',
  integer: 'long',
  float: 'double',
  boolean: 'bool',
  date: 'DateOnly',
  datetime: 'DateTimeOffset',
  uuid: 'Guid',
  object: 'Dictionary<string, object?>',
  null: 'object?',
  any: 'object?',
}

const ATTRIBUTES = {
  'system.text.json': { using: 'System.Text.Json.Serialization', name: 'JsonPropertyName' },
  newtonsoft: { using: 'Newtonsoft.Json', name: 'JsonProperty' },
}

const INDENT = '    '

function generate(schema: Schema, settings: GenerateSettings): GeneratedCode {
  if (schema.classes.length === 0) return { files: [{ name: 'Models.cs', code: `// ${noClassesMessage(schema)}\n` }], usage: null, notes: [] }

  const style = optionValue(csharp, settings, 'style')
  const library = optionValue(csharp, settings, 'library') as keyof typeof ATTRIBUTES
  // C# escapes keywords with @, and properties are PascalCase
  const names = createNames(schema, settings, { reserved: KEYWORDS, defaultNaming: 'PascalCase', escapeReserved: (name) => `@${name}` })

  const blocks = schema.classes.map((item) => {
    const usings = new Set<string>()
    const code = style === 'record' ? record(item, names, library, usings) : classDeclaration(item, names, library, usings)
    return { item, code, usings }
  })

  const withUsings = (usings: Set<string>, code: string) => {
    const lines = [...usings].sort((a, b) => (a.startsWith('System') === b.startsWith('System') ? a.localeCompare(b) : a.startsWith('System') ? -1 : 1))
    // Nullable reference types, so string? and string mean what they say
    return `${lines.map((line) => `using ${line};`).join('\n')}${lines.length > 0 ? '\n\n' : ''}#nullable enable\n\n${code}\n`
  }

  const files = settings.multipleFiles
    ? blocks.map(({ item, code, usings }) => ({ name: `${names.className(item.id)}.cs`, code: withUsings(usings, code) }))
    : [
        {
          name: `${names.className(schema.classes[0].id)}.cs`,
          code: withUsings(new Set(blocks.flatMap((block) => [...block.usings])), blocks.map((block) => block.code).join('\n\n')),
        },
      ]
  return { files, usage: usage(schema, names, library), notes: names.notes }
}

function typeName(type: TypeRef, names: Names, usings: Set<string>): string {
  if (type.kind === 'class') return names.className(type.classId)
  if (type.kind === 'array') {
    usings.add('System.Collections.Generic')
    const items = typeName(type.items, names, usings)
    return `List<${type.itemsNullable && !items.endsWith('?') ? `${items}?` : items}>`
  }
  if (type.name === 'date' || type.name === 'datetime' || type.name === 'uuid') usings.add('System')
  if (type.name === 'object') usings.add('System.Collections.Generic')
  return PRIMITIVES[type.name]
}

/** The property type: `?` when it can be null or missing. */
function propertyType(property: Property, names: Names, usings: Set<string>): string {
  const type = typeName(property.field.type, names, usings)
  return (property.field.nullable || property.field.optional) && !type.endsWith('?') ? `${type}?` : type
}

/** C# does not allow a member named like its class: `Item.Item` becomes `Item.ItemValue`. */
function memberName(property: Property, className: string): string {
  return property.name === className ? `${property.name}Value` : property.name
}

function attribute(property: Property, name: string, library: keyof typeof ATTRIBUTES, usings: Set<string>): string | null {
  if (name === property.field.key) return null
  usings.add(ATTRIBUTES[library].using)
  return `[${ATTRIBUTES[library].name}(${JSON.stringify(property.field.key)})]`
}

function classDeclaration(item: ClassDef, names: Names, library: keyof typeof ATTRIBUTES, usings: Set<string>): string {
  const className = names.className(item.id)
  const members = names.properties(item).map((property) => {
    const name = memberName(property, className)
    const lines: string[] = []
    const json = attribute(property, name, library, usings)
    if (json) lines.push(`${INDENT}${json}`)
    // required: the JSON always has it, and System.Text.Json fails if it is missing
    const required = property.field.optional ? '' : 'required '
    lines.push(`${INDENT}public ${required}${propertyType(property, names, usings)} ${name} { get; set; }`)
    return lines.join('\n')
  })
  return `public class ${className}\n{\n${members.join('\n\n')}${members.length > 0 ? '\n' : ''}}`
}

function record(item: ClassDef, names: Names, library: keyof typeof ATTRIBUTES, usings: Set<string>): string {
  const className = names.className(item.id)
  // Parameters with a default value must come last
  const parameters = requiredFirst(names.properties(item)).map((property) => {
    const name = memberName(property, className)
    const json = attribute(property, name, library, usings)
    return `${INDENT}${json ? `[property: ${json.slice(1, -1)}] ` : ''}${propertyType(property, names, usings)} ${name}${property.field.optional ? ' = null' : ''}`
  })
  return parameters.length > 0 ? `public record ${className}(\n${parameters.join(',\n')}\n);` : `public record ${className}();`
}

function usage(schema: Schema, names: Names, library: keyof typeof ATTRIBUTES): string {
  const root = names.className(schema.classes[0].id)
  const type = schema.root.kind === 'array' ? `List<${root}>` : root
  const variable = schema.root.kind === 'array' ? 'items' : 'root'
  if (library === 'newtonsoft') return `var ${variable} = JsonConvert.DeserializeObject<${type}>(json);\n`
  return `using System.Text.Json;\n\nvar ${variable} = JsonSerializer.Deserialize<${type}>(json);\n`
}

export const csharp: Generator = {
  id: 'csharp',
  label: 'C#',
  options: [
    {
      id: 'style',
      choices: [
        { id: 'class', label: 'class' },
        { id: 'record', label: 'record' },
      ],
    },
    {
      id: 'library',
      choices: [
        { id: 'system.text.json', label: 'System.Text.Json' },
        { id: 'newtonsoft', label: 'Newtonsoft.Json' },
      ],
    },
  ],
  supportsMultipleFiles: true,
  generate,
}
