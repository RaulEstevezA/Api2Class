import { describe, expect, it } from 'vitest'
import { analyze } from '../analyze.ts'
import { parseJson } from '../json.ts'
import { generators } from './index.ts'

// shared/test-cases/generators/<case>/input.json and one expected file per language and style:
// python-dataclass.py, java-pojo.java...
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

const targets = generators.flatMap((generator) => generator.styles.map((style) => ({ generator, style })))

describe.each([...caseFiles])('%s', (_caseName, contents) => {
  const parsed = parseJson(contents.get('input.json') ?? '')
  if (!parsed.ok) throw new Error('Invalid input.json')
  const schema = analyze(parsed.value)

  it.each(targets.map((target) => ({ ...target, name: `${target.generator.id}-${target.style.id}` })))(
    '$name',
    ({ generator, style, name }) => {
      const { fileName, code } = generator.generate(schema, { style: style.id })
      const expected = contents.get(name + fileName.slice(fileName.lastIndexOf('.')))
      expect(expected, `missing expected file ${name}`).toBeDefined()
      expect(code).toBe(expected)
    },
  )
})

it('there are generator cases', () => {
  expect(caseFiles.size).toBeGreaterThan(0)
})

it('names the file after the root class', () => {
  const parsed = parseJson('{"id": 1}')
  if (!parsed.ok) throw new Error('Invalid input')
  const fileNames = generators.map((generator) => generator.generate(analyze(parsed.value, 'UserProfile'), { style: generator.styles[0].id }).fileName)
  expect(fileNames).toEqual(['user_profile.py', 'UserProfile.java'])
})
