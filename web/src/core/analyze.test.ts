import { describe, expect, it } from 'vitest'
import cases from '../../../shared/test-cases/analyze.json'
import { analyze, type AnalyzeOptions } from './analyze.ts'
import { parseJson } from './json.ts'
import { describeType, type Field, type Observed, type Schema } from './schema.ts'

interface AnalyzeCase {
  description: string
  input?: unknown
  inputText?: string
  rootName?: string
  options?: AnalyzeOptions
  expected?: { root: string; classes: [string, Record<string, string>][] }
  expectedIds?: string[]
  /** By field key, in any class */
  expectedObserved?: Record<string, { observed: Observed; itemsObserved?: Observed }>
}

function describeField(field: Field, schema: Schema): string {
  return `${describeType(field.type, schema)}${field.nullable ? ' | null' : ''}${field.optional ? ' (optional)' : ''}`
}

/** Same layout as the shared cases. Entries instead of objects so the order of fields is compared too. */
function summary(schema: Schema) {
  return {
    root: describeType(schema.root, schema),
    classes: schema.classes.map((item) => [item.name, item.fields.map((field) => [field.key, describeField(field, schema)])]),
  }
}

describe('analyze', () => {
  it.each(cases as AnalyzeCase[])('$description', ({ input, inputText, rootName, options, expected, expectedIds, expectedObserved }) => {
    const parsed = parseJson(inputText ?? JSON.stringify(input))
    if (!parsed.ok) throw new Error('Invalid test input')
    const schema = analyze(parsed.value, { rootName, ...options })
    if (expected) {
      expect(summary(schema)).toEqual({
        root: expected.root,
        classes: expected.classes.map(([name, fields]) => [name, Object.entries(fields)]),
      })
    }
    if (expectedIds) expect(schema.classes.map((item) => item.id)).toEqual(expectedIds)
    if (expectedObserved) {
      const fields = new Map(schema.classes.flatMap((item) => item.fields.map((field) => [field.key, field])))
      for (const [key, { observed, itemsObserved }] of Object.entries(expectedObserved)) {
        expect(fields.get(key)?.observed, key).toEqual(observed)
        expect(fields.get(key)?.itemsObserved, key).toEqual(itemsObserved)
      }
    }
  })
})
