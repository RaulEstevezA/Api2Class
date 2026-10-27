import { describe, expect, it } from 'vitest'
import cases from '../../../shared/test-cases/naming.json'
import { className, convertCase, safeIdentifier, singularize, splitWords, uniqueName, type NamingConvention } from './naming.ts'

describe('splitWords', () => {
  it.each(cases.words)('$input', ({ input, expected }) => {
    expect(splitWords(input)).toEqual(expected)
  })
})

describe.each(['PascalCase', 'camelCase', 'snake_case'] as const)('%s', (convention: NamingConvention) => {
  it.each(cases[convention])('$input', ({ input, expected }) => {
    expect(convertCase(input, convention)).toBe(expected)
  })
})

describe('singularize', () => {
  it.each(cases.singular)('$input', ({ input, expected }) => {
    expect(singularize(input)).toBe(expected)
  })
})

describe('className', () => {
  it.each(cases.className)('"$input" (array item: $arrayItem)', ({ input, arrayItem, expected }) => {
    expect(className(input, arrayItem)).toBe(expected)
  })
})

describe('safeIdentifier', () => {
  const reserved = new Set(['class', 'from'])

  it('keeps valid names', () => expect(safeIdentifier('city', reserved, 'field')).toBe('city'))
  it('uses the fallback for empty names', () => expect(safeIdentifier('', reserved, 'field')).toBe('field'))
  it('prefixes names starting with a digit', () => expect(safeIdentifier('2fa', reserved, 'field')).toBe('_2fa'))
  it('suffixes reserved words', () => expect(safeIdentifier('from', reserved, 'field')).toBe('from_'))
})

it('uniqueName numbers repeated names', () => {
  const used = new Set<string>()
  expect([uniqueName('id', used), uniqueName('id', used), uniqueName('id', used), uniqueName('name', used)]).toEqual([
    'id',
    'id2',
    'id3',
    'name',
  ])
})
