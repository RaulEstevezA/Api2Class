import { describe, expect, it } from 'vitest'
import { analyze } from '../analyze.ts'
import { parseJson } from '../json.ts'
import { generators } from './index.ts'
import { DEFAULT_SETTINGS } from './types.ts'

// shared/test-cases/generators/<case>/input.json and one expected file per language and style:
// python-dataclass.py, java-pojo.java... (other options keep their default)
const files = import.meta.glob<string>('../../../../shared/test-cases/generators/*/*', {
  query: '?raw',
  import: 'default',
  eager: true,
})

const caseFiles = new Map<string, Map<string, string>>()
for (const [path, content] of Object.entries(files)) {
  const [caseName, fileName] = path.split('/').slice(-2)
  if (!caseFiles.has(caseName)) caseFiles.set(caseName, new Map())
  caseFiles.get(caseName)!.set(fileName, content)
}

const targets = generators.flatMap((generator) =>
  generator.options[0].choices.map((style) => ({ generator, style: style.id, name: `${generator.id}-${style.id}` })),
)

function schemaOf(text: string, rootName?: string) {
  const parsed = parseJson(text)
  if (!parsed.ok) throw new Error('Invalid input')
  return analyze(parsed.value, { rootName })
}

describe.each([...caseFiles])('%s', (_caseName, contents) => {
  const schema = schemaOf(contents.get('input.json') ?? '')

  it.each(targets)('$name', ({ generator, style, name }) => {
    const { files } = generator.generate(schema, { ...DEFAULT_SETTINGS, options: { style } })
    expect(files).toHaveLength(1)
    const { name: fileName, code } = files[0]
    const expected = contents.get(name + fileName.slice(fileName.lastIndexOf('.')))
    expect(expected, `missing expected file ${name}`).toBeDefined()
    expect(code).toBe(expected)
  })
})

it('there are generator cases', () => {
  expect(caseFiles.size).toBeGreaterThan(0)
})

describe.each(generators)('$label', (generator) => {
  const schema = schemaOf('{"id": 1, "address": {"city": "Villaluna"}, "orders": [{"total": 1.5}]}', 'UserProfile')

  it('names the file after the root class', () => {
    const [file] = generator.generate(schema, DEFAULT_SETTINGS).files
    expect(file.name.replace(/\..*$/, '').replace(/[_-]/g, '').toLowerCase()).toBe('userprofile')
  })

  it.runIf(generator.supportsMultipleFiles)('can write one file per class', () => {
    const { files } = generator.generate(schema, { ...DEFAULT_SETTINGS, multipleFiles: true })
    expect(files).toHaveLength(3)
    expect(new Set(files.map((file) => file.name)).size).toBe(3)
  })

  it('every option has choices and the style comes first', () => {
    expect(generator.options[0].id).toBe('style')
    for (const option of generator.options) expect(option.choices.length).toBeGreaterThan(0)
  })
})
