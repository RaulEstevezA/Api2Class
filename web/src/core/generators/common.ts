import { convertCase, safeIdentifier, uniqueName, type NamingConvention } from '../naming.ts'
import { classOf, describeType, innermostType, type ClassDef, type Field, type PrimitiveType, type Schema, type TypeRef } from '../schema.ts'
import type { GenerateSettings, NameNote } from './types.ts'

export interface LanguageRules {
  /** Words that cannot be used as names */
  reserved: ReadonlySet<string>
  /** Convention for properties when the user keeps the default */
  defaultNaming: NamingConvention | 'keep'
  /** How a reserved word is made usable: `class_` by default; Kotlin and Swift use backticks */
  escapeReserved?: (name: string) => string
  /** Put before names starting with a digit: `_2fa` by default */
  digitPrefix?: string
  /** Fixes a converted name to the language's conventions (Go initialisms: Id → ID) */
  adjust?: (name: string) => string
  /** Any string can be a property name (TypeScript quotes them), so they are never escaped */
  anyPropertyName?: boolean
}

export interface Property {
  field: Field
  name: string
  /** The name differs from the JSON key, so the code needs to map it */
  renamed: boolean
}

const IDENTIFIER = /^[\p{L}_][\p{L}\p{N}_]*$/u

/** Names valid in the target language for every class and property, and the notes about the ones
 * that had to change. Every generator uses it, so names are decided the same way everywhere. */
export function createNames(schema: Schema, settings: GenerateSettings, rules: LanguageRules) {
  const notes: NameNote[] = []
  const digitPrefix = rules.digitPrefix ?? '_'
  const escape = rules.escapeReserved ?? ((name: string) => `${name}_`)

  function valid(name: string, fallback: string, note: Omit<NameNote, 'name' | 'reason'> | null): string {
    let result = name === '' ? fallback : name
    let reason: NameNote['reason'] | null = name === '' ? 'invalid' : null
    if (/^\p{N}/u.test(result)) {
      result = digitPrefix + result
      reason = 'invalid'
    }
    if (rules.reserved.has(result)) {
      result = escape(result)
      reason = 'reserved'
    }
    if (reason && note) notes.push({ ...note, name: result, reason })
    return result
  }

  const usedClasses = new Set<string>()
  const classNames = new Map(
    schema.classes.map((item) => [
      item.id,
      uniqueName(valid(safeIdentifier(item.name, new Set(), 'Model'), 'Model', { className: item.name, key: '' }), usedClasses),
    ]),
  )

  const naming = settings.naming === 'default' ? rules.defaultNaming : settings.naming

  function convert(key: string): string {
    if (naming === 'keep' && (IDENTIFIER.test(key) || rules.anyPropertyName)) return key
    const converted = convertCase(key, naming === 'keep' ? 'camelCase' : naming)
    return rules.adjust ? rules.adjust(converted) : converted
  }

  const propertyCache = new Map<string, Property[]>()

  return {
    notes,
    className: (classId: string) => classNames.get(classId)!,
    /** Property names of a class, in field order. A name chosen by the user is used as is. Two fields
     * that end up with the same name (`userId` and `user_id` in snake_case) get a number. */
    properties(item: ClassDef): Property[] {
      if (!propertyCache.has(item.id)) {
        const used = new Set<string>()
        propertyCache.set(
          item.id,
          item.fields.map((field) => {
            const wanted = field.name ?? convert(field.key)
            const name = uniqueName(
              rules.anyPropertyName ? wanted : valid(wanted, 'field', { className: classNames.get(item.id)!, key: field.key }),
              used,
            )
            return { field, name, renamed: name !== field.key }
          }),
        )
      }
      return propertyCache.get(item.id)!
    },
  }
}

export type Names = ReturnType<typeof createNames>

/** Text for a JSON without objects, such as `[1, 2, 3]`: there is nothing to generate. */
export function noClassesMessage(schema: Schema): string {
  return `The JSON root is ${describeType(schema.root, schema)}: there are no objects to generate classes from.`
}

/** Primitive types used anywhere in a class, to know which imports it needs. */
export function primitivesUsed(fields: Field[]): Set<PrimitiveType> {
  const used = new Set<PrimitiveType>()
  for (const field of fields) {
    const inner = innermostType(field.type)
    if (inner.kind === 'primitive') used.add(inner.name)
  }
  return used
}

/** Classes a class refers to directly, in field order. */
export function dependencies(item: ClassDef): string[] {
  return [...new Set(item.fields.map((field) => classOf(field.type)).filter((id): id is string => id !== null))]
}

/** Classes ordered so each one comes after the ones it uses (for languages that need it: Zod, Rust
 * consts...). Otherwise breadth-first order is kept. */
export function dependencyOrder(schema: Schema): ClassDef[] {
  const byId = new Map(schema.classes.map((item) => [item.id, item]))
  const ordered: ClassDef[] = []
  const done = new Set<string>()
  function visit(item: ClassDef) {
    if (done.has(item.id)) return
    done.add(item.id)
    for (const dependency of dependencies(item)) visit(byId.get(dependency)!)
    ordered.push(item)
  }
  for (const item of schema.classes) visit(item)
  return ordered
}

/** Whether a type is an array, at any level of nesting. */
export function isArray(type: TypeRef): boolean {
  return type.kind === 'array'
}

/** Required fields first, keeping their order: for languages where defaults must go last. */
export function requiredFirst<T extends { field: Field }>(properties: T[]): T[] {
  return [...properties.filter((property) => !property.field.optional), ...properties.filter((property) => property.field.optional)]
}
