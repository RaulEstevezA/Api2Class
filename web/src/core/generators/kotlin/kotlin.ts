import type { ClassDef, PrimitiveType, Schema, TypeRef } from '../../schema.ts'
import { createNames, noClassesMessage, type Names, type Property } from '../common.ts'
import { optionValue, type GeneratedCode, type GenerateSettings, type Generator } from '../types.ts'

// Hard keywords: they can still be used as names between backticks
const KEYWORDS = new Set(
  'as break class continue do else false for fun if in interface is null object package return super this throw true try typealias typeof val var when while'.split(' '),
)

type Library = 'kotlinx' | 'gson' | 'moshi' | 'none'

// Dates and UUIDs stay as their text: none of the libraries reads java.time without extra adapters
const PRIMITIVES: Record<PrimitiveType, string> = {
  string: 'String',
  integer: 'Long',
  float: 'Double',
  boolean: 'Boolean',
  date: 'String',
  datetime: 'String',
  uuid: 'String',
  object: 'Map<String, Any?>',
  null: 'Any?',
  any: 'Any?',
}

const KOTLINX: Partial<Record<PrimitiveType, [string, string]>> = {
  object: ['JsonObject', 'kotlinx.serialization.json.JsonObject'],
  null: ['JsonElement?', 'kotlinx.serialization.json.JsonElement'],
  any: ['JsonElement?', 'kotlinx.serialization.json.JsonElement'],
}

const INDENT = '    '

function generate(schema: Schema, settings: GenerateSettings): GeneratedCode {
  if (schema.classes.length === 0) return { files: [{ name: 'Models.kt', code: `// ${noClassesMessage(schema)}\n` }], usage: null, notes: [] }

  const library = optionValue(kotlin, settings, 'library') as Library
  const names = createNames(schema, settings, { reserved: KEYWORDS, defaultNaming: 'camelCase', escapeReserved: (name) => `\`${name}\`` })

  const blocks = schema.classes.map((item) => {
    const imports = new Set<string>()
    return { item, code: dataClass(item, names, library, imports), imports }
  })
  const withImports = (imports: Set<string>, code: string) => {
    const lines = [...imports].sort().map((path) => `import ${path}`)
    return `${lines.length > 0 ? `${lines.join('\n')}\n\n` : ''}${code}\n`
  }
  const files = settings.multipleFiles
    ? blocks.map(({ item, code, imports }) => ({ name: `${names.className(item.id)}.kt`, code: withImports(imports, code) }))
    : [
        {
          name: `${names.className(schema.classes[0].id)}.kt`,
          code: withImports(new Set(blocks.flatMap((block) => [...block.imports])), blocks.map((block) => block.code).join('\n\n')),
        },
      ]
  return { files, usage: usage(schema, names, library), notes: names.notes }
}

function typeName(type: TypeRef, names: Names, library: Library, imports: Set<string>): string {
  if (type.kind === 'class') return names.className(type.classId)
  if (type.kind === 'array') {
    const items = typeName(type.items, names, library, imports)
    return `List<${type.itemsNullable && !items.endsWith('?') ? `${items}?` : items}>`
  }
  const kotlinx = library === 'kotlinx' ? KOTLINX[type.name] : undefined
  if (kotlinx) {
    imports.add(kotlinx[1])
    return kotlinx[0]
  }
  return PRIMITIVES[type.name]
}

function jsonName(property: Property, library: Library, imports: Set<string>): string | null {
  if (!property.renamed || library === 'none') return null
  const key = JSON.stringify(property.field.key)
  if (library === 'kotlinx') {
    imports.add('kotlinx.serialization.SerialName')
    return `@SerialName(${key})`
  }
  if (library === 'gson') {
    imports.add('com.google.gson.annotations.SerializedName')
    return `@SerializedName(${key})`
  }
  imports.add('com.squareup.moshi.Json')
  return `@Json(name = ${key})`
}

function dataClass(item: ClassDef, names: Names, library: Library, imports: Set<string>): string {
  const parameters = names.properties(item).map((property) => {
    const { field } = property
    let type = typeName(field.type, names, library, imports)
    if ((field.nullable || field.optional) && !type.endsWith('?')) type += '?'
    const annotation = jsonName(property, library, imports)
    // A default value lets kotlinx and Moshi accept the field when it is missing
    const parameter = `${INDENT}val ${property.name}: ${type}${field.optional ? ' = null' : ''},`
    return annotation ? `${INDENT}${annotation}\n${parameter}` : parameter
  })
  const annotations: string[] = []
  if (library === 'kotlinx') {
    imports.add('kotlinx.serialization.Serializable')
    annotations.push('@Serializable')
  } else if (library === 'moshi') {
    imports.add('com.squareup.moshi.JsonClass')
    annotations.push('@JsonClass(generateAdapter = true)')
  }
  const name = names.className(item.id)
  // A data class needs at least one property
  const declaration = parameters.length > 0 ? `data class ${name}(\n${parameters.join('\n')}\n)` : `class ${name}`
  return [...annotations, declaration].join('\n')
}

function usage(schema: Schema, names: Names, library: Library): string | null {
  const root = names.className(schema.classes[0].id)
  const list = schema.root.kind === 'array'
  const type = list ? `List<${root}>` : root
  const variable = list ? 'items' : 'root'
  if (library === 'kotlinx') {
    return [
      'import kotlinx.serialization.json.Json',
      '',
      'val json = Json { ignoreUnknownKeys = true }',
      `val ${variable} = json.decodeFromString<${type}>(text)`,
      '',
    ].join('\n')
  }
  if (library === 'gson') {
    return list
      ? `val ${variable}: ${type} = Gson().fromJson(text, object : TypeToken<${type}>() {}.type)\n`
      : `val ${variable} = Gson().fromJson(text, ${root}::class.java)\n`
  }
  if (library === 'moshi') {
    return list
      ? `val adapter = Moshi.Builder().build().adapter<${type}>(Types.newParameterizedType(List::class.java, ${root}::class.java))\nval ${variable} = adapter.fromJson(text)\n`
      : `val adapter = Moshi.Builder().build().adapter(${root}::class.java)\nval ${variable} = adapter.fromJson(text)\n`
  }
  return null
}

export const kotlin: Generator = {
  id: 'kotlin',
  label: 'Kotlin',
  options: [
    { id: 'style', choices: [{ id: 'data-class', label: 'data class' }] },
    {
      id: 'library',
      choices: [
        { id: 'kotlinx', label: 'kotlinx.serialization' },
        { id: 'gson', label: 'Gson' },
        { id: 'moshi', label: 'Moshi' },
        { id: 'none', label: 'none' },
      ],
    },
  ],
  supportsMultipleFiles: true,
  generate,
}
