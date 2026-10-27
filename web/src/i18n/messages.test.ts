import { describe, expect, it } from 'vitest'
import { messages } from './messages.ts'

describe('messages', () => {
  it('every language has the same keys as English', () => {
    for (const translated of Object.values(messages)) {
      expect(Object.keys(translated).sort()).toEqual(Object.keys(messages.en).sort())
    }
  })
})
