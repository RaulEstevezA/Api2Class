import { toSnakeCase } from '../../naming.ts'
import type { PrimitiveType, Schema, TypeRef } from '../../schema.ts'
import { classNames, noClassesMessage, propertyNames } from '../common.ts'
import type { Generator } from '../types.ts'

const KEYWORDS = new Set(
  'False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield'.split(
    ' ',
  ),
)

const PRIMITIVES: Record<PrimitiveType, string> = {
  string: 'str',
  integer: 'int',
  float: 'float',
  boolean: 'bool',
  date: 'date',
  datetime: 'datetime',
  uuid: 'UUID',
  object: 'dict[str, Any]',
  null: 'None',
  any: 'Any',
}

function generate(schema: Schema) {
  const fileName = `${toSnakeCase(schema.classes[0]?.name ?? '') || 'models'}.py`
  if (schema.classes.length === 0) return { fileName, code: `# ${noClassesMessage(schema)}\n` }

  const names = classNames(schema, KEYWORDS)
  const used = new Set<PrimitiveType>()

  function typeName(type: TypeRef): string {
    if (type.kind === 'class') return names.get(type.classId)!
    if (type.kind === 'array') return `list[${typeName(type.items)}${type.itemsNullable ? ' | None' : ''}]`
    used.add(type.name)
    return PRIMITIVES[type.name]
  }

  const blocks = schema.classes.map((item) => {
    const properties = propertyNames(item, toSnakeCase, KEYWORDS)
    const lines = item.fields.map((field, index) => {
      const name = properties[index]
      let type = typeName(field.type)
      if ((field.nullable || field.optional) && type !== 'None') type += ' | None'
      const line = `    ${name}: ${type}${field.optional ? ' = None' : ''}`
      return { line: name === field.key ? line : `${line}  # JSON: ${JSON.stringify(field.key)}`, optional: field.optional }
    })
    // Fields with a default value must come after the ones without one
    const body = [...lines.filter((line) => !line.optional), ...lines.filter((line) => line.optional)].map((line) => line.line)
    return ['@dataclass', `class ${names.get(item.id)}:`, ...(body.length > 0 ? body : ['    pass'])].join('\n')
  })

  const dates = [...(used.has('date') ? ['date'] : []), ...(used.has('datetime') ? ['datetime'] : [])]
  const imports = [
    'from __future__ import annotations',
    '',
    'from dataclasses import dataclass',
    ...(dates.length > 0 ? [`from datetime import ${dates.join(', ')}`] : []),
    ...(used.has('any') || used.has('object') ? ['from typing import Any'] : []),
    ...(used.has('uuid') ? ['from uuid import UUID'] : []),
  ]
  return { fileName, code: `${imports.join('\n')}\n\n\n${blocks.join('\n\n\n')}\n` }
}

export const python: Generator = {
  id: 'python',
  label: 'Python',
  styles: [{ id: 'dataclass', label: 'dataclass' }],
  generate,
}
