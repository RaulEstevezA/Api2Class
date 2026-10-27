/** The intermediate model between the JSON and the generated code. Generators only read this model,
 * never the JSON, so whatever the user edits here is what ends up in the code. */

export type PrimitiveType = 'string' | 'integer' | 'float' | 'boolean' | 'null' | 'any'

export type TypeRef =
  | { kind: 'primitive'; name: PrimitiveType }
  | { kind: 'array'; items: TypeRef; itemsNullable: boolean }
  | { kind: 'class'; classId: string }

export interface Field {
  /** The key as written in the JSON */
  key: string
  type: TypeRef
  /** Missing in some of the objects it was found in */
  optional: boolean
  /** null in some objects, and a real value in others */
  nullable: boolean
}

export interface ClassDef {
  id: string
  name: string
  fields: Field[]
}

export interface Schema {
  /** The type of the whole JSON: usually a class, or an array of a class */
  root: TypeRef
  /** In the order they were found, the root class first */
  classes: ClassDef[]
}

export function findClass(schema: Schema, classId: string): ClassDef {
  const found = schema.classes.find((item) => item.id === classId)
  if (!found) throw new Error(`Unknown class ${classId}`)
  return found
}

/** Language-neutral description of a type: `integer`, `Order[]`, `(string | null)[]`. */
export function describeType(type: TypeRef, schema: Schema): string {
  if (type.kind === 'primitive') return type.name
  if (type.kind === 'class') return findClass(schema, type.classId).name
  const items = describeType(type.items, schema)
  return type.itemsNullable ? `(${items} | null)[]` : `${items}[]`
}
