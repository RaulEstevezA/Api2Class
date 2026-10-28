import { findClass, type Schema, type TypeRef } from './schema.ts'

/** The schema in the format shared by the tools of the family (Api2Class → Mapper → DBCreate).
 * Its definition and rules are in Mapper's docs/interoperability.md; this is the subset Api2Class needs. */

type CommonType =
  | { kind: 'primitive'; name: string }
  | { kind: 'array'; items: CommonType; itemsNullable?: boolean }
  | { kind: 'map'; key: CommonType; value: CommonType }
  | { kind: 'model'; name: string }

export interface CommonField {
  name: string
  type: CommonType
  nullable: boolean
  optional: boolean
  /** The JSON key, when the property was renamed */
  serializedName?: string
}

export interface ModelSchema {
  format: 'model-schema'
  version: 1
  origin: { format: 'json'; tool: 'api2class' }
  root?: string
  models: { name: string; kind: 'object'; fields: CommonField[] }[]
  enums: []
}

function commonType(type: TypeRef, schema: Schema): { type: CommonType; nullable: boolean } {
  switch (type.kind) {
    case 'class':
      return { type: { kind: 'model', name: findClass(schema, type.classId).name }, nullable: false }
    case 'array': {
      const items = commonType(type.items, schema)
      const array: CommonType = { kind: 'array', items: items.type }
      if (type.itemsNullable || items.nullable) array.itemsNullable = true
      return { type: array, nullable: false }
    }
    case 'primitive':
      // A generic object is a map of any values; a value that was always null is any value, nullable
      if (type.name === 'object') return { type: { kind: 'map', key: { kind: 'primitive', name: 'string' }, value: { kind: 'primitive', name: 'any' } }, nullable: false }
      if (type.name === 'null') return { type: { kind: 'primitive', name: 'any' }, nullable: true }
      return { type: { kind: 'primitive', name: type.name }, nullable: false }
  }
}

/** Converts the schema the code is generated from (with the user's edits applied). */
export function toModelSchema(schema: Schema): ModelSchema {
  const models = schema.classes.map((item) => ({
    name: item.name,
    kind: 'object' as const,
    fields: item.fields.map((field) => {
      const converted = commonType(field.type, schema)
      const name = field.name ?? field.key
      const common: CommonField = { name, type: converted.type, nullable: field.nullable || converted.nullable, optional: field.optional }
      if (name !== field.key) common.serializedName = field.key
      return common
    }),
  }))
  const root = schema.root.kind === 'class' ? findClass(schema, schema.root.classId).name : schema.classes[0]?.name
  return { format: 'model-schema', version: 1, origin: { format: 'json', tool: 'api2class' }, ...(root ? { root } : {}), models, enums: [] }
}
