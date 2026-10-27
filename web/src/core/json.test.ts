import { describe, expect, it } from 'vitest'
import cases from '../../../shared/test-cases/json.json'
import { MAX_DEPTH, parseJson, type JsonValue } from './json.ts'

/** Plain JSON for comparing with the shared cases; numbers become "integer:15" or "float:29.0". */
function toPlain(value: JsonValue): unknown {
  switch (value.kind) {
    case 'object':
      return Object.fromEntries(value.entries.map(([key, item]) => [key, toPlain(item)]))
    case 'array':
      return value.items.map(toPlain)
    case 'number':
      return `${value.integer ? 'integer' : 'float'}:${value.text}`
    case 'null':
      return null
    default:
      return value.value
  }
}

describe('valid JSON', () => {
  it.each(cases.valid)('$description', ({ input, expected }) => {
    const result = parseJson(input)
    if (!result.ok) throw new Error(`Unexpected error: ${JSON.stringify(result.error)}`)
    expect(toPlain(result.value)).toEqual(expected)
  })
})

describe('invalid JSON', () => {
  it.each(cases.invalid)('$description', ({ input, expected }) => {
    expect(parseJson(input)).toEqual({ ok: false, error: expected })
  })
})

it('keeps the order of keys and repeated keys', () => {
  expect(parseJson('{"b": 1, "a": 2, "b": 3}')).toMatchObject({
    ok: true,
    value: { entries: [['b', {}], ['a', {}], ['b', {}]] },
  })
})

it('rejects documents nested too deep instead of overflowing the stack', () => {
  const deep = '['.repeat(MAX_DEPTH + 1) + ']'.repeat(MAX_DEPTH + 1)
  expect(parseJson(deep)).toMatchObject({ ok: false, error: { code: 'tooDeep' } })
  const limit = '['.repeat(MAX_DEPTH) + ']'.repeat(MAX_DEPTH)
  expect(parseJson(limit).ok).toBe(true)
})
