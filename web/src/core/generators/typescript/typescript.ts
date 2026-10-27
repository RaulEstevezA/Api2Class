import type { ClassDef, PrimitiveType, Schema, TypeRef } from '../../schema.ts'
import { createNames, dependencies, dependencyOrder, noClassesMessage, type Names, type Property } from '../common.ts'
import { optionValue, type GeneratedCode, type GenerateSettings, type Generator } from '../types.ts'

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

// Zod 4
const ZOD: Record<PrimitiveType, string> = {
  string: 'z.string()',
  integer: 'z.number().int()',
  float: 'z.number()',
  boolean: 'z.boolean()',
  date: 'z.iso.date()',
  datetime: 'z.iso.datetime({ offset: true })',
  uuid: 'z.uuid()',
  object: 'z.record(z.string(), z.unknown())',
  null: 'z.null()',
  any: 'z.unknown()',
}

const INDENT = '  '
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/

function generate(schema: Schema, settings: GenerateSettings): GeneratedCode {
  if (schema.classes.length === 0) return { files: [{ name: 'model.ts', code: `// ${noClassesMessage(schema)}\n` }], usage: null, notes: [] }

  const style = optionValue(typescript, settings, 'style')
  const names = createNames(schema, settings, { reserved: RESERVED_TYPES, defaultNaming: 'keep', anyPropertyName: true })
  const zod = style === 'zod'
  // Zod schemas are constants: each one has to be declared after the ones it uses
  const classes = zod ? dependencyOrder(schema) : schema.classes
  const blocks = classes.map((item) => ({ item, code: zod ? zodSchema(item, names) : declaration(item, names, style) }))

  const rootName = names.className(schema.classes[0].id)
  let files: GeneratedCode['files']
  if (settings.multipleFiles) {
    files = blocks.map(({ item, code }) => {
      const imports = dependencies(item)
        .filter((dependency) => dependency !== item.id)
        .map((dependency) => {
          const name = names.className(dependency)
          return zod ? `import { ${name}Schema } from './${name}';` : `import type { ${name} } from './${name}';`
        })
        .sort()
      const header = [...(zod ? ["import { z } from 'zod';"] : []), ...imports]
      return { name: `${names.className(item.id)}.ts`, code: `${header.length > 0 ? `${header.join('\n')}\n\n` : ''}${code}\n` }
    })
  } else {
    const header = zod ? "import { z } from 'zod';\n\n" : ''
    files = [{ name: `${rootName}.ts`, code: `${header}${blocks.map((block) => block.code).join('\n\n')}\n` }]
  }
  return { files, usage: usage(schema, rootName, style), notes: names.notes }
}

/** Property as written in the type: the JSON key (quoted when it needs it), or the name chosen. */
function propertyKey(property: Property): string {
  return IDENTIFIER.test(property.name) ? property.name : JSON.stringify(property.name)
}

function typeName(type: TypeRef, names: Names): string {
  if (type.kind === 'class') return names.className(type.classId)
  if (type.kind === 'array') return type.itemsNullable ? `(${typeName(type.items, names)} | null)[]` : `${typeName(type.items, names)}[]`
  return PRIMITIVES[type.name]
}

function declaration(item: ClassDef, names: Names, style: string): string {
  const lines = names.properties(item).map((property) => {
    const { field } = property
    const type = typeName(field.type, names)
    const line = `${INDENT}${propertyKey(property)}${field.optional ? '?' : ''}: ${field.nullable && type !== 'null' ? `${type} | null` : type};`
    // Interfaces describe the JSON as it arrives: a renamed property no longer matches it
    return property.renamed ? `${line} // JSON: ${JSON.stringify(field.key)}` : line
  })
  const name = names.className(item.id)
  const body = lines.length > 0 ? `{\n${lines.join('\n')}\n}` : '{}'
  return style === 'type' ? `export type ${name} = ${body};` : `export interface ${name} ${body}`
}

function zodType(type: TypeRef, names: Names): string {
  if (type.kind === 'class') return `${names.className(type.classId)}Schema`
  if (type.kind === 'array') return `z.array(${zodType(type.items, names)}${type.itemsNullable ? '.nullable()' : ''})`
  return ZOD[type.name]
}

function zodSchema(item: ClassDef, names: Names): string {
  const name = names.className(item.id)
  // Zod validates the JSON as it arrives, so properties are always its keys
  const lines = names.properties(item).map(({ field }) => {
    const key = IDENTIFIER.test(field.key) ? field.key : JSON.stringify(field.key)
    const nullable = field.nullable && !(field.type.kind === 'primitive' && field.type.name === 'null')
    return `${INDENT}${key}: ${zodType(field.type, names)}${nullable ? '.nullable()' : ''}${field.optional ? '.optional()' : ''},`
  })
  const object = lines.length > 0 ? `z.object({\n${lines.join('\n')}\n})` : 'z.object({})'
  return `export const ${name}Schema = ${object};\nexport type ${name} = z.infer<typeof ${name}Schema>;`
}

function usage(schema: Schema, rootName: string, style: string): string {
  const list = schema.root.kind === 'array'
  if (style === 'zod') {
    return [
      `import { ${rootName}Schema } from './${rootName}';`,
      '',
      '// Throws if the response does not match the model',
      list ? `const items = ${rootName}Schema.array().parse(JSON.parse(text));` : `const root = ${rootName}Schema.parse(JSON.parse(text));`,
      '',
    ].join('\n')
  }
  return [
    `import type { ${rootName} } from './${rootName}';`,
    '',
    '// Types are not checked at run time: the JSON is trusted to match',
    list ? `const items = JSON.parse(text) as ${rootName}[];` : `const root = JSON.parse(text) as ${rootName};`,
    '',
  ].join('\n')
}

export const typescript: Generator = {
  id: 'typescript',
  label: 'TypeScript',
  options: [
    {
      id: 'style',
      choices: [
        { id: 'interface', label: 'interface' },
        { id: 'type', label: 'type' },
        { id: 'zod', label: 'Zod' },
      ],
    },
  ],
  supportsMultipleFiles: true,
  generate,
}
