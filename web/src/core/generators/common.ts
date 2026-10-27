import { safeIdentifier, uniqueName } from '../naming.ts'
import { describeType, type ClassDef, type Schema } from '../schema.ts'

/** Class names valid in the target language, by class id. */
export function classNames(schema: Schema, reserved: ReadonlySet<string>): Map<string, string> {
  const used = new Set<string>()
  return new Map(schema.classes.map((item) => [item.id, uniqueName(safeIdentifier(item.name, reserved, 'Model'), used)]))
}

/** Property names of a class valid in the target language, in field order. Two keys that end up with
 * the same name (`userId` and `user_id` in snake_case) get a number. */
export function propertyNames(item: ClassDef, convert: (key: string) => string, reserved: ReadonlySet<string>): string[] {
  const used = new Set<string>()
  return item.fields.map((field) => uniqueName(safeIdentifier(convert(field.key), reserved, 'field'), used))
}

/** Text for a JSON without objects, such as `[1, 2, 3]`: there is nothing to generate. */
export function noClassesMessage(schema: Schema): string {
  return `The JSON root is ${describeType(schema.root, schema)}: there are no objects to generate classes from.`
}
