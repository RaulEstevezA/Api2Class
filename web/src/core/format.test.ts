import { describe, expect, it } from 'vitest'
import cases from '../../../shared/test-cases/format.json'
import { formatJson, minifyJson } from './format.ts'
import { parseJson } from './json.ts'

describe.each(cases)('$description', ({ input, formatted, minified }) => {
  const parsed = parseJson(input)
  if (!parsed.ok) throw new Error('Invalid test input')

  it('formats with two spaces', () => expect(formatJson(parsed.value)).toBe(formatted))
  it('minifies', () => expect(minifyJson(parsed.value)).toBe(minified))
})
