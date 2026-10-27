import { innermostType, type Observed, type Schema, type ValueKind } from './schema.ts'

export type WarningCode = 'mixedTypes' | 'emptyArray' | 'emptyObject' | 'onlyNull'

export interface SchemaWarning {
  code: WarningCode
  classId: string
  key: string
  /** For mixedTypes: how many values of each kind, most frequent first */
  counts?: [ValueKind, number][]
}

/** Fields whose type could not be detected and should be checked by hand. Computed on the edited
 * schema: a field whose type the user has set no longer warns. */
export function schemaWarnings(schema: Schema): SchemaWarning[] {
  const warnings: SchemaWarning[] = []
  for (const item of schema.classes) {
    for (const field of item.fields) {
      const inner = innermostType(field.type)
      if (inner.kind !== 'primitive' || field.typeEdited) continue
      const observed: Observed = field.type.kind === 'array' ? (field.itemsObserved ?? {}) : field.observed
      const at = { classId: item.id, key: field.key }
      if (inner.name === 'any' && field.type.kind === 'array' && Object.keys(observed).length === 0) {
        warnings.push({ code: 'emptyArray', ...at })
      } else if (inner.name === 'any' && Object.keys(observed).length > 1) {
        const counts = (Object.entries(observed) as [ValueKind, number][])
          .filter(([kind]) => kind !== 'null')
          .sort((a, b) => b[1] - a[1])
        warnings.push({ code: 'mixedTypes', ...at, counts })
      } else if (inner.name === 'object') {
        // Only detected as a map when every object was empty
        warnings.push({ code: 'emptyObject', ...at })
      } else if (inner.name === 'null') {
        warnings.push({ code: 'onlyNull', ...at })
      }
    }
  }
  return warnings
}
