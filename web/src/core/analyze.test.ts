import { describe, expect, it } from 'vitest'
import cases from '../../../shared/test-cases/analyze.json'
import { analyze } from './analyze.ts'
import { parseJson } from './json.ts'
import { describeType, type Field, type Schema } from './schema.ts'

interface AnalyzeCase {
  description: string
  input?: unknown
  inputText?: string
  rootName?: string
  expected: { root: string; classes: [string, Record<string, string>][] }
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
  it.each(cases as AnalyzeCase[])('$description', ({ input, inputText, rootName, expected }) => {
    const parsed = parseJson(inputText ?? JSON.stringify(input))
    if (!parsed.ok) throw new Error('Invalid test input')
    expect(summary(analyze(parsed.value, rootName))).toEqual({
      root: expected.root,
      classes: expected.classes.map(([name, fields]) => [name, Object.entries(fields)]),
    })
  })
})

it('gives every class a different id', () => {
  const parsed = parseJson('{"a": {"x": 1}, "b": [{"y": 2}]}')
  if (!parsed.ok) throw new Error('Invalid test input')
  const ids = analyze(parsed.value).classes.map((item) => item.id)
  expect(new Set(ids).size).toBe(ids.length)
})
