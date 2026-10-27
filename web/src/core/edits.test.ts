import { describe, expect, it } from 'vitest'
import editCases from '../../../shared/test-cases/edits.json'
import warningCases from '../../../shared/test-cases/warnings.json'
import { analyze } from './analyze.ts'
import { applyEdits, hasEdits, NO_EDITS, updateEdit, type Edits } from './edits.ts'
import { parseJson } from './json.ts'
import { describeType, findClass, type Field, type Schema } from './schema.ts'
import { schemaWarnings } from './warnings.ts'

function schemaOf(input: unknown): Schema {
  const parsed = parseJson(JSON.stringify(input))
  if (!parsed.ok) throw new Error('Invalid test input')
  return analyze(parsed.value)
}

function describeField(field: Field, schema: Schema): string {
  const flags = `${field.nullable ? ' | null' : ''}${field.optional ? ' (optional)' : ''}`
  return `${describeType(field.type, schema)}${flags}${field.name ? ` as ${field.name}` : ''}`
}

describe('applyEdits', () => {
  it.each(editCases)('$description', ({ input, edits, expected }) => {
    const schema = applyEdits(schemaOf(input), edits as unknown as Edits)
    expect({
      root: describeType(schema.root, schema),
      classes: schema.classes.map((item) => [item.name, item.fields.map((field) => [field.key, describeField(field, schema)])]),
    }).toEqual({ root: expected.root, classes: expected.classes.map(([name, fields]) => [name, Object.entries(fields)]) })
  })

  it('leaves the detected schema untouched', () => {
    const schema = schemaOf({ id: 1 })
    applyEdits(schema, { classes: { '#': { name: 'X' } }, fields: { '#/id': { type: 'string' } } })
    expect(schema.classes[0].name).toBe('Root')
    expect(schema.classes[0].fields[0].type).toEqual({ kind: 'primitive', name: 'integer' })
  })
})

describe('schemaWarnings', () => {
  it.each(warningCases)('$description', ({ input, edits, expected }) => {
    const schema = applyEdits(schemaOf(input), (edits as unknown as Edits | undefined) ?? NO_EDITS)
    const warnings = schemaWarnings(schema).map(({ classId, ...warning }) => ({ ...warning, class: findClass(schema, classId).name }))
    expect(warnings).toEqual(expected.map((warning) => ({ ...warning })))
  })
})

describe('updateEdit', () => {
  it('merges changes and removes edits left empty', () => {
    let fields = updateEdit<Edits['fields'][string]>({}, '#/id', { type: 'string' })
    fields = updateEdit(fields, '#/id', { optional: true })
    expect(fields).toEqual({ '#/id': { type: 'string', optional: true } })
    fields = updateEdit(fields, '#/id', { type: undefined, optional: undefined })
    expect(fields).toEqual({})
    expect(hasEdits({ classes: {}, fields })).toBe(false)
  })
})
