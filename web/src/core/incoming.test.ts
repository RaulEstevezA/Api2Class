import { describe, expect, it } from 'vitest'
import { INCOMING_KEY, MAX_INCOMING_SIZE, readIncoming, takeIncoming } from './incoming.ts'

const handoff = {
  format: 'json-handoff',
  version: 1,
  from: 'api2data',
  text: { format: 'json', content: '{"id": 1}' },
  source: { method: 'GET', url: 'https://api.example.com/users/1' },
}

function storage(items: Record<string, string>) {
  return {
    getItem: (key: string) => items[key] ?? null,
    removeItem: (key: string) => void delete items[key],
  }
}

describe('JSON received from another tool', () => {
  it('reads what Api2Data sends', () => {
    expect(readIncoming(JSON.stringify(handoff))).toEqual({
      from: 'api2data',
      content: '{"id": 1}',
      source: { method: 'GET', url: 'https://api.example.com/users/1' },
    })
  })

  it('keeps the content even when it is not valid JSON: it is validated like pasted text', () => {
    expect(readIncoming({ ...handoff, text: { format: 'json', content: '{"id":' } })?.content).toBe('{"id":')
  })

  it('rejects anything unexpected', () => {
    expect(readIncoming('not json')).toBeNull()
    expect(readIncoming({ ...handoff, format: 'model-handoff' })).toBeNull()
    expect(readIncoming({ ...handoff, version: 2 })).toBeNull()
    expect(readIncoming({ ...handoff, from: 'somewhere' })).toBeNull()
    expect(readIncoming({ ...handoff, text: { format: 'xml', content: '<a/>' } })).toBeNull()
    expect(readIncoming({ ...handoff, text: { format: 'json', content: 'x'.repeat(MAX_INCOMING_SIZE + 1) } })).toBeNull()
  })

  it('ignores a source that is not an http address', () => {
    expect(readIncoming({ ...handoff, source: { method: 'GET', url: 'javascript:alert(1)' } })).toEqual({ from: 'api2data', content: '{"id": 1}' })
  })

  it('takes it once and removes it', () => {
    const items = { [INCOMING_KEY]: JSON.stringify(handoff) }
    const store = storage(items)
    expect(takeIncoming(store)?.content).toBe('{"id": 1}')
    expect(items).toEqual({})
    expect(takeIncoming(store)).toBeNull()
  })

  it('survives blocked storage', () => {
    const blocked = {
      getItem: () => {
        throw new Error('SecurityError')
      },
      removeItem: () => {},
    }
    expect(takeIncoming(blocked)).toBeNull()
  })
})
