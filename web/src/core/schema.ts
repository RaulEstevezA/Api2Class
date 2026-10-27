/** The intermediate model between the JSON and the generated code. Generators only read this model,
 * never the JSON, so whatever the user edits here is what ends up in the code. */

/** `date`, `datetime` and `uuid` are strings in the JSON, detected by their format. `object` is a
 * generic map (`dict`, `Map`, `Record`), used when the user prefers it to a class. */
export type PrimitiveType = 'string' | 'integer' | 'float' | 'boolean' | 'date' | 'datetime' | 'uuid' | 'object' | 'null' | 'any'

export type TypeRef =
  | { kind: 'primitive'; name: PrimitiveType }
  | { kind: 'array'; items: TypeRef; itemsNullable: boolean }
  | { kind: 'class'; classId: string }

/** Kinds of JSON value, as counted while analyzing */
export type ValueKind = 'string' | 'integer' | 'float' | 'boolean' | 'null' | 'object' | 'array'
export type Observed = Partial<Record<ValueKind, number>>

export interface Field {
  /** The key as written in the JSON */
  key: string
  /** Property name chosen by the user, used as is instead of converting the key */
  name?: string
  type: TypeRef
  /** Missing in some of the objects it was found in */
  optional: boolean
  /** null in some objects, and a real value in others */
  nullable: boolean
  /** How many values of each kind were found, for the field itself and, for arrays, for the
   * innermost items. Only facts of the JSON: edits do not change them. */
  observed: Observed
  itemsObserved?: Observed
}

export interface ClassDef {
  /** Path of the first object it comes from (`#`, `#/address`, `#/orders/[]`). Stable while the
   * JSON keeps its shape, so edits can be attached to it. */
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

/** The class a type leads to, directly or through arrays. */
export function classOf(type: TypeRef): string | null {
  if (type.kind === 'class') return type.classId
  if (type.kind === 'array') return classOf(type.items)
  return null
}

/** The type at the bottom of a type, through arrays (`Order[][]` → `Order`). */
export function innermostType(type: TypeRef): Exclude<TypeRef, { kind: 'array' }> {
  return type.kind === 'array' ? innermostType(type.items) : type
}

/** Path of a field, from the id of its class: `#/orders/[]` + `id` → `#/orders/[]/id`. Keys are
 * escaped as in JSON Pointer, and `[]` stands for array items. */
export function childPath(path: string, key: string): string {
  return `${path}/${key.replace(/~/g, '~0').replace(/\//g, '~1').replace(/^\[\]$/, '~2')}`
}
