import { describe, expect, it } from 'vitest'
import { analyze } from './analyze.ts'
import { createMapperHandoff, MAPPER_KEY, openInMapper } from './handoff.ts'
import { parseJson } from './json.ts'
import { toModelSchema } from './modelSchema.ts'
import { findGenerator } from './generators/index.ts'
import { DEFAULT_SETTINGS } from './generators/types.ts'

function schemaOf(json: string) {
  const parsed = parseJson(json)
  if (!parsed.ok) throw new Error('json')
  return analyze(parsed.value)
}

const JSON_TEXT = '{"order_id": 7, "notes": null, "meta": {}, "customer": {"name": "Ana"}, "lines": [{"sku": "A", "qty": 2}], "tags": ["new"]}'

describe('model schema for the other tools', () => {
  it('converts classes, types and nullability', () => {
    const schema = schemaOf(JSON_TEXT)
    expect(toModelSchema(schema)).toEqual({
      format: 'model-schema',
      version: 1,
      origin: { format: 'json', tool: 'api2class' },
      root: 'Root',
      models: [
        {
          name: 'Root',
          kind: 'object',
          fields: [
            { name: 'order_id', type: { kind: 'primitive', name: 'integer' }, nullable: false, optional: false },
            { name: 'notes', type: { kind: 'primitive', name: 'any' }, nullable: true, optional: false },
            { name: 'meta', type: { kind: 'map', key: { kind: 'primitive', name: 'string' }, value: { kind: 'primitive', name: 'any' } }, nullable: false, optional: false },
            { name: 'customer', type: { kind: 'model', name: 'Customer' }, nullable: false, optional: false },
            { name: 'lines', type: { kind: 'array', items: { kind: 'model', name: 'Line' } }, nullable: false, optional: false },
            { name: 'tags', type: { kind: 'array', items: { kind: 'primitive', name: 'string' } }, nullable: false, optional: false },
          ],
        },
        { name: 'Customer', kind: 'object', fields: [{ name: 'name', type: { kind: 'primitive', name: 'string' }, nullable: false, optional: false }] },
        {
          name: 'Line',
          kind: 'object',
          fields: [
            { name: 'sku', type: { kind: 'primitive', name: 'string' }, nullable: false, optional: false },
            { name: 'qty', type: { kind: 'primitive', name: 'integer' }, nullable: false, optional: false },
          ],
        },
      ],
      enums: [],
    })
  })
})

describe('Open in Mapper', () => {
  it('passes the generated code and the model schema through sessionStorage', () => {
    const schema = schemaOf(JSON_TEXT)
    const output = findGenerator('kotlin').generate(schema, DEFAULT_SETTINGS)
    const handoff = createMapperHandoff(schema, output, 'kotlin')
    expect(handoff).toMatchObject({ format: 'model-handoff', version: 1, from: 'api2class', role: 'source', model: 'Root', text: { format: 'kotlin' } })
    expect(handoff.text.content).toContain('data class Root(')

    const stored = new Map<string, string>()
    let opened = ''
    expect(openInMapper(handoff, { setItem: (key, value) => void stored.set(key, value) }, (url) => (opened = url))).toBe(true)
    expect(JSON.parse(stored.get(MAPPER_KEY)!)).toEqual(handoff)
    expect(opened).toBe('/tools/Mapper/')
  })

  it('says so when the browser cannot keep the model', () => {
    const schema = schemaOf(JSON_TEXT)
    const handoff = createMapperHandoff(schema, findGenerator('python').generate(schema, DEFAULT_SETTINGS), 'python')
    const full = {
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    }
    expect(openInMapper(handoff, full, () => {})).toBe(false)
  })
})
