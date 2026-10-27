import { describe, expect, it } from 'vitest'
import { messages } from './messages.ts'

describe('messages', () => {
  it('every language has the same keys as English', () => {
    for (const translated of Object.values(messages)) {
      expect(Object.keys(translated).sort()).toEqual(Object.keys(messages.en).sort())
      expect(Object.keys(translated.jsonError).sort()).toEqual(Object.keys(messages.en.jsonError).sort())
    }
  })

  it('give a hint for the usual mistakes when pasting JSON', () => {
    expect(messages.en.jsonError.unexpectedCharacter("'")).toContain('double quotes')
    expect(messages.es.jsonError.unexpectedCharacter('/')).toContain('comentarios')
  })
})
