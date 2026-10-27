import { describe, expect, it } from 'vitest'
import { parseJson } from '../core/json.ts'
import { messages } from './messages.ts'

function parseError(text: string) {
  const result = parseJson(text)
  if (result.ok) throw new Error('Expected invalid JSON')
  return result.error
}

describe('messages', () => {
  it('every language has the same keys as English', () => {
    for (const translated of Object.values(messages)) {
      expect(Object.keys(translated).sort()).toEqual(Object.keys(messages.en).sort())
    }
  })

  it('use singular for one', () => {
    expect(messages.en.structureSummary(1, 1)).toBe('1 class · 1 field')
    expect(messages.es.structureSummary(3, 12)).toBe('3 clases · 12 campos')
  })

  it('say what was expected and after which property', () => {
    const error = { code: 'unexpectedCharacter', line: 3, column: 3, found: '"', expected: 'commaOrBrace', key: 'email' } as const
    expect(messages.en.jsonError(error)).toBe('Expected “,” or “}” after “email”, found “\\"”.')
    expect(messages.es.jsonError(error)).toBe('Se esperaba “,” o “}” después de “email”, pero hay “\\"”.')
  })

  it('give a hint for the usual mistakes when pasting JSON', () => {
    expect(messages.en.jsonError(parseError("{'id': 1}"))).toContain('double quotes')
    expect(messages.es.jsonError(parseError('{"a": 1 // id\n}'))).toContain('comentarios')
  })

  it('show invisible characters', () => {
    expect(messages.en.jsonError(parseError('{"a": 1\t\u0001}'))).toContain('“\\u0001”')
  })
})
