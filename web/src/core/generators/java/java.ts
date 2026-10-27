import type { ClassDef, PrimitiveType, Schema, TypeRef } from '../../schema.ts'
import { createNames, noClassesMessage, type Names, type Property } from '../common.ts'
import { optionValue, type GeneratedCode, type GenerateSettings, type Generator } from '../types.ts'

const KEYWORDS = new Set(
  'abstract assert boolean break byte case catch char class const continue default do double else enum extends false final finally float for goto if implements import instanceof int interface long native new null package private protected public return short static strictfp super switch synchronized this throw throws transient true try void volatile while var record yield _'.split(
    ' ',
  ),
)

// Boxed types, so any field can be null
const PRIMITIVES: Record<PrimitiveType, string> = {
  string: 'String',
  integer: 'Long',
  float: 'Double',
  boolean: 'Boolean',
  date: 'LocalDate',
  datetime: 'OffsetDateTime',
  uuid: 'UUID',
  object: 'Map<String, Object>',
  null: 'Object',
  any: 'Object',
}

const IMPORTS: Partial<Record<PrimitiveType, string>> = {
  date: 'java.time.LocalDate',
  datetime: 'java.time.OffsetDateTime',
  object: 'java.util.Map',
  uuid: 'java.util.UUID',
}

const ANNOTATIONS = {
  jackson: { import: 'com.fasterxml.jackson.annotation.JsonProperty', name: 'JsonProperty' },
  gson: { import: 'com.google.gson.annotations.SerializedName', name: 'SerializedName' },
}

const INDENT = '    '

function generate(schema: Schema, settings: GenerateSettings): GeneratedCode {
  if (schema.classes.length === 0) return { files: [{ name: 'Model.java', code: `// ${noClassesMessage(schema)}\n` }], usage: null, notes: [] }

  const style = optionValue(java, settings, 'style')
  const library = optionValue(java, settings, 'library') as 'jackson' | 'gson' | 'none'
  const names = createNames(schema, settings, { reserved: KEYWORDS, defaultNaming: 'camelCase' })

  const blocks = schema.classes.map((item, index) => {
    const imports = new Set<string>()
    // Only one class per file can be public, named like the file
    const visibility = settings.multipleFiles || index === 0 ? 'public ' : ''
    const code =
      style === 'record'
        ? record(item, names, library, imports, visibility)
        : style === 'lombok'
          ? lombokClass(item, names, library, imports, visibility)
          : pojo(item, names, library, imports, visibility)
    return { item, code, imports }
  })

  const withImports = (imports: Set<string>, code: string) => {
    const lines = [...imports].sort().map((path) => `import ${path};`)
    return `${lines.length > 0 ? `${lines.join('\n')}\n\n` : ''}${code}\n`
  }

  const files = settings.multipleFiles
    ? blocks.map(({ item, code, imports }) => ({ name: `${names.className(item.id)}.java`, code: withImports(imports, code) }))
    : [
        {
          name: `${names.className(schema.classes[0].id)}.java`,
          code: withImports(new Set(blocks.flatMap((block) => [...block.imports])), blocks.map((block) => block.code).join('\n\n')),
        },
      ]
  return { files, usage: usage(schema, names, library), notes: names.notes }
}

function typeName(type: TypeRef, names: Names, library: string, imports: Set<string>): string {
  if (type.kind === 'class') return names.className(type.classId)
  if (type.kind === 'array') {
    imports.add('java.util.List')
    return `List<${typeName(type.items, names, library, imports)}>`
  }
  // Gson has no adapters for java.time: dates stay as their ISO text
  if (library === 'gson' && (type.name === 'date' || type.name === 'datetime')) return 'String'
  const path = IMPORTS[type.name]
  if (path) imports.add(path)
  return PRIMITIVES[type.name]
}

/** The annotation that maps a renamed property to its JSON key, if the library needs one. */
function jsonName(property: Property, library: string, imports: Set<string>): string | null {
  if (!property.renamed || library === 'none') return null
  const annotation = ANNOTATIONS[library as keyof typeof ANNOTATIONS]
  imports.add(annotation.import)
  return `@${annotation.name}(${JSON.stringify(property.field.key)})`
}

function fieldDeclarations(item: ClassDef, names: Names, library: string, imports: Set<string>): string[] {
  return names.properties(item).map((property) => {
    const annotation = jsonName(property, library, imports)
    const declaration = `${INDENT}private ${typeName(property.field.type, names, library, imports)} ${property.name};`
    const comment = property.renamed && library === 'none' ? ` // JSON: ${JSON.stringify(property.field.key)}` : ''
    return annotation ? `${INDENT}${annotation}\n${declaration}` : declaration + comment
  })
}

function pojo(item: ClassDef, names: Names, library: string, imports: Set<string>, visibility: string): string {
  const declarations = fieldDeclarations(item, names, library, imports)
  const accessors = names.properties(item).map((property) => {
    const type = typeName(property.field.type, names, library, imports)
    // userId → getUserId; class_ → getClass_ (getClass is final in Object)
    const suffix = property.name.charAt(0).toUpperCase() + property.name.slice(1)
    return [
      `${INDENT}public ${type} get${suffix}() {`,
      `${INDENT}${INDENT}return ${property.name};`,
      `${INDENT}}`,
      '',
      `${INDENT}public void set${suffix}(${type} ${property.name}) {`,
      `${INDENT}${INDENT}this.${property.name} = ${property.name};`,
      `${INDENT}}`,
    ].join('\n')
  })
  const header = `${visibility}class ${names.className(item.id)} {`
  const body = [declarations.join('\n'), ...accessors].filter((part) => part !== '')
  return body.length > 0 ? `${header}\n${body.join('\n\n')}\n}` : `${header}\n}`
}

function lombokClass(item: ClassDef, names: Names, library: string, imports: Set<string>, visibility: string): string {
  imports.add('lombok.Data')
  const declarations = fieldDeclarations(item, names, library, imports)
  const header = `@Data\n${visibility}class ${names.className(item.id)} {`
  return declarations.length > 0 ? `${header}\n${declarations.join('\n')}\n}` : `${header}\n}`
}

function record(item: ClassDef, names: Names, library: string, imports: Set<string>, visibility: string): string {
  const components = names.properties(item).map((property) => {
    const annotation = jsonName(property, library, imports)
    const component = `${typeName(property.field.type, names, library, imports)} ${property.name}`
    return `${INDENT}${annotation ? `${annotation} ` : ''}${component}`
  })
  const name = `${visibility}record ${names.className(item.id)}`
  return components.length > 0 ? `${name}(\n${components.join(',\n')}\n) {}` : `${name}() {}`
}

function usage(schema: Schema, names: Names, library: string): string | null {
  const root = names.className(schema.classes[0].id)
  const list = schema.root.kind === 'array'
  if (library === 'jackson') {
    return [
      'ObjectMapper mapper = new ObjectMapper()',
      '    .findAndRegisterModules() // java.time types (jackson-datatype-jsr310)',
      '    .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);',
      list ? `List<${root}> items = mapper.readValue(json, new TypeReference<List<${root}>>() {});` : `${root} root = mapper.readValue(json, ${root}.class);`,
      '',
    ].join('\n')
  }
  if (library === 'gson') {
    return [
      'Gson gson = new Gson();',
      list ? `List<${root}> items = gson.fromJson(json, new TypeToken<List<${root}>>() {}.getType());` : `${root} root = gson.fromJson(json, ${root}.class);`,
      '',
    ].join('\n')
  }
  return null
}

export const java: Generator = {
  id: 'java',
  label: 'Java',
  options: [
    {
      id: 'style',
      choices: [
        { id: 'pojo', label: 'POJO' },
        { id: 'record', label: 'record' },
        { id: 'lombok', label: 'Lombok' },
      ],
    },
    {
      id: 'library',
      choices: [
        { id: 'jackson', label: 'Jackson' },
        { id: 'gson', label: 'Gson' },
        { id: 'none', label: 'none' },
      ],
    },
  ],
  supportsMultipleFiles: true,
  generate,
}
