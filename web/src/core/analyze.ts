import type { JsonValue } from './json.ts'
import { className, splitWords, uniqueName } from './naming.ts'
import { childPath, type ClassDef, type Field, type Observed, type PrimitiveType, type Schema, type TypeRef, type ValueKind } from './schema.ts'

export interface AnalyzeOptions {
  rootName?: string
  /** Strings that are all ISO 8601 dates, date-times or UUIDs get that type */
  detectFormats?: boolean
  /** Objects with exactly the same fields become one class (billing_address and shipping_address → Address) */
  mergeIdentical?: boolean
}

type StringFormat = 'date' | 'datetime' | 'uuid'

/** Everything seen in one position of the JSON. Every object of an array is merged into the same
 * shape, so a field missing from some of them can be told apart from one that is always there. */
interface Shape {
  count: number
  kinds: Observed
  /** How many of the strings match each format */
  formats: Record<StringFormat, number>
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

const FORMATS: [StringFormat, RegExp][] = [
  ['date', /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/],
  ['datetime', /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])[T ]([01]\d|2[0-3]):[0-5]\d(:[0-5]\d(\.\d+)?)?(Z|[+-]([01]\d|2[0-3]):?[0-5]\d)?$/],
  ['uuid', /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/],
]

function emptyShape(): Shape {
  return { count: 0, kinds: {}, formats: { date: 0, datetime: 0, uuid: 0 }, object: null, array: null }
}

function addValue(shape: Shape, value: JsonValue) {
  shape.count++
  const kind: ValueKind = value.kind === 'number' ? (value.integer ? 'integer' : 'float') : value.kind
  shape.kinds[kind] = (shape.kinds[kind] ?? 0) + 1
  if (value.kind === 'string') {
    for (const [format, pattern] of FORMATS) if (pattern.test(value.value)) shape.formats[format]++
  } else if (value.kind === 'array') {
    shape.array ??= emptyShape()
    for (const item of value.items) addValue(shape.array, item)
  } else if (value.kind === 'object') {
    shape.object ??= { count: 0, fields: new Map() }
    shape.object.count++
    // A repeated key counts once, with its last value (as JSON.parse does)
    for (const [key, item] of new Map(value.entries)) {
      let field = shape.object.fields.get(key)
      if (!field) shape.object.fields.set(key, (field = emptyShape()))
      addValue(field, item)
    }
  }
}

/** Builds the intermediate model of a parsed JSON value. */
export function analyze(value: JsonValue, options: AnalyzeOptions = {}): Schema {
  const { rootName = 'Root', detectFormats = true, mergeIdentical = true } = options
  const root = emptyShape()
  addValue(root, value)

  /** What a shape is once nulls are set aside. Mixed kinds become `any`, except integers mixed
   * with floats, which are floats. */
  function kindOf(shape: Shape): Kind {
    const kinds = (Object.keys(shape.kinds) as ValueKind[]).filter((kind) => kind !== 'null')
    if (kinds.length === 0) return { kind: 'primitive', name: shape.kinds.null ? 'null' : 'any' }
    if (kinds.length === 2 && kinds.includes('integer') && kinds.includes('float')) return { kind: 'primitive', name: 'float' }
    if (kinds.length > 1) return { kind: 'primitive', name: 'any' }
    if (kinds[0] === 'object') return { kind: 'object', object: shape.object! }
    if (kinds[0] === 'array') return { kind: 'array', items: shape.array! }
    if (kinds[0] === 'string' && detectFormats) {
      const format = FORMATS.find(([name]) => shape.formats[name] === shape.kinds.string)
      if (format) return { kind: 'primitive', name: format[0] }
    }
    return { kind: 'primitive', name: kinds[0] }
  }

  function isNullable(shape: Shape): boolean {
    const kind = kindOf(shape)
    return Boolean(shape.kinds.null) && !(kind.kind === 'primitive' && kind.name === 'null')
  }

  /** The object a shape leads to, directly or through arrays (`orders: [{...}]`, `matrix: [[{...}]]`). */
  function nestedObject(shape: Shape, path: string): { object: ObjectShape; arrayItem: boolean; path: string } | null {
    const kind = kindOf(shape)
    if (kind.kind === 'object') return { object: kind.object, arrayItem: false, path }
    if (kind.kind === 'array') {
      const inner = nestedObject(kind.items, `${path}/[]`)
      return inner && { ...inner, arrayItem: true }
    }
    return null
  }

  // 1. Every object position becomes a node, level by level (breadth-first)
  interface Node {
    object: ObjectShape
    path: string
    baseName: string
    parent: number | null
  }
  const nodes: Node[] = []
  const nodeOf = new Map<ObjectShape, number>()
  const rootObject = nestedObject(root, '#')
  if (rootObject) {
    nodes.push({ object: rootObject.object, path: rootObject.path, baseName: rootName, parent: null })
    nodeOf.set(rootObject.object, 0)
  }
  for (let index = 0; index < nodes.length; index++) {
    for (const [key, field] of nodes[index].object.fields) {
      const nested = nestedObject(field, childPath(nodes[index].path, key))
      if (!nested) continue
      nodeOf.set(nested.object, nodes.length)
      nodes.push({ object: nested.object, path: nested.path, baseName: className(key, nested.arrayItem), parent: index })
    }
  }

  // 2. Objects with the same fields share one class. Children are compared first (they come later
  // in breadth-first order), so two classes are the same when their nested classes are too.
  const groupOf = nodes.map((_, index) => index)
  if (mergeIdentical) {
    const signatures = new Map<string, number>()
    const typeSignature = (shape: Shape): string => {
      const kind = kindOf(shape)
      if (kind.kind === 'primitive') return kind.name
      if (kind.kind === 'object') return `#${groupOf[nodeOf.get(kind.object)!]}`
      return `[${typeSignature(kind.items)}${isNullable(kind.items) ? '?' : ''}]`
    }
    for (let index = nodes.length - 1; index >= 0; index--) {
      const { object } = nodes[index]
      // Empty objects ({}) say nothing about what they are: never merged
      if (object.fields.size === 0) continue
      const signature = JSON.stringify(
        [...object.fields].map(([key, shape]) => [key, typeSignature(shape), shape.count < object.count, isNullable(shape)]),
      )
      const existing = signatures.get(signature)
      if (existing === undefined) signatures.set(signature, index)
      else groupOf[index] = existing
    }
    // Point every member at the first node of its group in breadth-first order
    const first = new Map<number, number>()
    groupOf.forEach((group, index) => {
      if (!first.has(group)) first.set(group, index)
      groupOf[index] = first.get(group)!
    })
  }

  // 3. Names, in breadth-first order so shallow objects get the simplest ones
  const classes: ClassDef[] = []
  const classOfNode = new Map<number, ClassDef>()
  const used = new Set<string>()
  nodes.forEach((node, index) => {
    if (groupOf[index] !== index) return
    const members = nodes.filter((_, other) => groupOf[other] === index)
    const name = members.length > 1 ? commonName(members.map((member) => member.baseName)) : node.baseName
    const parentName = node.parent === null ? '' : classOfNode.get(groupOf[node.parent])!.name
    // `address` inside User and inside Company: Address, then CompanyAddress
    const finalName = used.has(name) && parentName !== '' && !used.has(parentName + name) ? parentName + name : name
    const item: ClassDef = { id: node.path, name: uniqueName(finalName, used), fields: [] }
    classes.push(item)
    classOfNode.set(index, item)
  })

  function typeOf(shape: Shape): TypeRef {
    const kind = kindOf(shape)
    if (kind.kind === 'primitive') return kind
    if (kind.kind === 'object') return { kind: 'class', classId: classOfNode.get(groupOf[nodeOf.get(kind.object)!])!.id }
    return { kind: 'array', items: typeOf(kind.items), itemsNullable: isNullable(kind.items) }
  }

  function innermostItems(shape: Shape): Observed {
    const kind = kindOf(shape)
    return kind.kind === 'array' ? innermostItems(kind.items) : shape.kinds
  }

  nodes.forEach((node, index) => {
    if (groupOf[index] !== index) return
    classOfNode.get(index)!.fields = [...node.object.fields].map(([key, shape]): Field => {
      const field: Field = {
        key,
        type: typeOf(shape),
        optional: shape.count < node.object.count,
        nullable: isNullable(shape),
        observed: { ...shape.kinds },
      }
      if (kindOf(shape).kind === 'array') field.itemsObserved = { ...innermostItems(shape.array!) }
      return field
    })
  })

  return { root: typeOf(root), classes }
}

/** Name for a class shared by several objects: the words their names end with in common
 * (BillingAddress + ShippingAddress → Address), or the first name if they have none. */
function commonName(names: string[]): string {
  const words = names.map((name) => splitWords(name))
  const common: string[] = []
  for (let back = 1; ; back++) {
    const word = words[0].at(-back)
    if (word === undefined || words.some((other) => other.at(-back) !== word)) break
    common.unshift(word)
  }
  return common.length > 0 ? common.join('') : names[0]
}
