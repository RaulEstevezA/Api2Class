import type { JsonValue } from './json.ts'
import { className, uniqueName } from './naming.ts'
import type { ClassDef, Field, PrimitiveType, Schema, TypeRef } from './schema.ts'

/** Everything seen in one position of the JSON. Every object of an array is merged into the same
 * shape, so a field missing from some of them can be told apart from one that is always there. */
interface Shape {
  count: number
  nulls: number
  primitives: Set<'string' | 'integer' | 'float' | 'boolean'>
  object: ObjectShape | null
  /** Items of every array seen here, merged */
  array: Shape | null
}

interface ObjectShape {
  count: number
  fields: Map<string, Shape>
}

type Kind =
  | { kind: 'primitive'; name: PrimitiveType }
  | { kind: 'object'; object: ObjectShape }
  | { kind: 'array'; items: Shape }

function emptyShape(): Shape {
  return { count: 0, nulls: 0, primitives: new Set(), object: null, array: null }
}

function addValue(shape: Shape, value: JsonValue) {
  shape.count++
  switch (value.kind) {
    case 'null':
      shape.nulls++
      break
    case 'string':
    case 'boolean':
      shape.primitives.add(value.kind)
      break
    case 'number':
      shape.primitives.add(value.integer ? 'integer' : 'float')
      break
    case 'array':
      shape.array ??= emptyShape()
      for (const item of value.items) addValue(shape.array, item)
      break
    case 'object': {
      shape.object ??= { count: 0, fields: new Map() }
      shape.object.count++
      // A repeated key counts once, with its last value (as JSON.parse does)
      for (const [key, item] of new Map(value.entries)) {
        let field = shape.object.fields.get(key)
        if (!field) shape.object.fields.set(key, (field = emptyShape()))
        addValue(field, item)
      }
      break
    }
  }
}

/** What a shape is once nulls are set aside. Mixed kinds become `any`, except integers mixed with
 * floats, which are floats. */
function kindOf(shape: Shape): Kind {
  const kinds = shape.primitives.size + (shape.object ? 1 : 0) + (shape.array ? 1 : 0)
  if (kinds === 0) return { kind: 'primitive', name: shape.nulls > 0 ? 'null' : 'any' }
  if (kinds === 1) {
    if (shape.object) return { kind: 'object', object: shape.object }
    if (shape.array) return { kind: 'array', items: shape.array }
    return { kind: 'primitive', name: [...shape.primitives][0] }
  }
  if (kinds === 2 && shape.primitives.has('integer') && shape.primitives.has('float')) {
    return { kind: 'primitive', name: 'float' }
  }
  return { kind: 'primitive', name: 'any' }
}

function isNullable(shape: Shape): boolean {
  const kind = kindOf(shape)
  return shape.nulls > 0 && !(kind.kind === 'primitive' && kind.name === 'null')
}

/** The object a shape leads to, directly or through arrays (`orders: [{...}]`, `matrix: [[{...}]]`). */
function nestedObject(shape: Shape): { object: ObjectShape; arrayItem: boolean } | null {
  const kind = kindOf(shape)
  if (kind.kind === 'object') return { object: kind.object, arrayItem: false }
  if (kind.kind === 'array') {
    const inner = nestedObject(kind.items)
    return inner && { object: inner.object, arrayItem: true }
  }
  return null
}

/** Builds the intermediate model of a parsed JSON value. */
export function analyze(value: JsonValue, rootName = 'Root'): Schema {
  const root = emptyShape()
  addValue(root, value)

  // Classes are named level by level, so shallow objects get the simplest names
  const classes: ClassDef[] = []
  const shapes: ObjectShape[] = []
  const ids = new Map<ObjectShape, string>()
  const used = new Set<string>()
  const queue: { object: ObjectShape; name: string; parent: string }[] = []

  const rootObject = nestedObject(root)
  if (rootObject) queue.push({ object: rootObject.object, name: rootName, parent: '' })

  while (queue.length > 0) {
    const { object, name, parent } = queue.shift()!
    const id = `c${classes.length + 1}`
    // `address` inside User and inside Company: Address, then CompanyAddress
    const finalName = used.has(name) && parent !== '' && !used.has(parent + name) ? parent + name : name
    classes.push({ id, name: uniqueName(finalName, used), fields: [] })
    shapes.push(object)
    ids.set(object, id)
    for (const [key, field] of object.fields) {
      const nested = nestedObject(field)
      if (nested) queue.push({ object: nested.object, name: className(key, nested.arrayItem), parent: classes.at(-1)!.name })
    }
  }

  function typeOf(shape: Shape): TypeRef {
    const kind = kindOf(shape)
    if (kind.kind === 'primitive') return kind
    if (kind.kind === 'object') return { kind: 'class', classId: ids.get(kind.object)! }
    return { kind: 'array', items: typeOf(kind.items), itemsNullable: isNullable(kind.items) }
  }

  classes.forEach((item, index) => {
    const object = shapes[index]
    item.fields = [...object.fields].map(
      ([key, shape]): Field => ({
        key,
        type: typeOf(shape),
        optional: shape.count < object.count,
        nullable: isNullable(shape),
      }),
    )
  })

  return { root: typeOf(root), classes }
}
