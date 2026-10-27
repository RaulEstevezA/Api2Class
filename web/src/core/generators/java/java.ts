import { toCamelCase } from '../../naming.ts'
import type { PrimitiveType, Schema, TypeRef } from '../../schema.ts'
import { classNames, noClassesMessage, propertyNames } from '../common.ts'
import type { Generator } from '../types.ts'

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

const INDENT = '    '

function generate(schema: Schema) {
  if (schema.classes.length === 0) return { fileName: 'Model.java', code: `// ${noClassesMessage(schema)}\n` }

  const names = classNames(schema, KEYWORDS)
  const imports = new Set<string>()

  function typeName(type: TypeRef): string {
    if (type.kind === 'class') return names.get(type.classId)!
    if (type.kind === 'array') {
      imports.add('java.util.List')
      return `List<${typeName(type.items)}>`
    }
    const path = IMPORTS[type.name]
    if (path) imports.add(path)
    return PRIMITIVES[type.name]
  }

  const blocks = schema.classes.map((item, classIndex) => {
    const properties = propertyNames(item, toCamelCase, KEYWORDS)
    const types = item.fields.map((field) => typeName(field.type))
    const declarations = item.fields.map((field, index) => {
      const declaration = `${INDENT}private ${types[index]} ${properties[index]};`
      if (properties[index] === field.key) return declaration
      // Jackson reads and writes the field with its JSON key
      imports.add('com.fasterxml.jackson.annotation.JsonProperty')
      return `${INDENT}@JsonProperty(${JSON.stringify(field.key)})\n${declaration}`
    })
    const accessors = properties.map((property, index) => {
      // userId → getUserId; class_ → getClass_ (getClass is final in Object)
      const suffix = property.charAt(0).toUpperCase() + property.slice(1)
      return [
        `${INDENT}public ${types[index]} get${suffix}() {`,
        `${INDENT}${INDENT}return ${property};`,
        `${INDENT}}`,
        '',
        `${INDENT}public void set${suffix}(${types[index]} ${property}) {`,
        `${INDENT}${INDENT}this.${property} = ${property};`,
        `${INDENT}}`,
      ].join('\n')
    })
    // Only the root class can be public: Java allows one public class per file, named like the file
    const header = `${classIndex === 0 ? 'public ' : ''}class ${names.get(item.id)} {`
    const body = [declarations.join('\n'), ...accessors].filter((part) => part !== '')
    return body.length > 0 ? `${header}\n${body.join('\n\n')}\n}` : `${header}\n}`
  })

  const importLines = [...imports]
    .sort()
    .map((path) => `import ${path};`)
    .join('\n')
  const code = `${importLines ? `${importLines}\n\n` : ''}${blocks.join('\n\n')}\n`
  return { fileName: `${names.get(schema.classes[0].id)}.java`, code }
}

export const java: Generator = {
  id: 'java',
  label: 'Java',
  styles: [{ id: 'pojo', label: 'POJO' }],
  generate,
}
