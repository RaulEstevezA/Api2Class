import type { GeneratedCode } from './generators/types.ts'
import { toModelSchema } from './modelSchema.ts'
import type { Schema } from './schema.ts'

/** "Open in Mapper": the generated classes and their model schema, passed to Mapper through
 * sessionStorage (same origin, raulesteveza.github.io). Contract: Mapper's docs/interoperability.md. */

export const MAPPER_PATH = '/tools/Mapper/'
export const MAPPER_KEY = 'mapper.incoming'

export function createMapperHandoff(schema: Schema, output: GeneratedCode, language: string) {
  const model = toModelSchema(schema)
  // Several files (one per class) are read by Mapper as one text
  const content = output.files.map((file) => file.code).join('\n\n')
  return {
    format: 'model-handoff',
    version: 1,
    from: 'api2class',
    role: 'source',
    ...(model.root ? { model: model.root } : {}),
    schema: model,
    text: { format: language, content },
  }
}

/** Leaves the handoff for Mapper and opens it in the same tab. Returns false when the browser cannot keep
 * it (storage blocked or full): the user is told and nothing is lost. */
export function openInMapper(handoff: ReturnType<typeof createMapperHandoff>, storage: Pick<Storage, 'setItem'> = sessionStorage, navigate = (url: string) => window.location.assign(url)): boolean {
  try {
    storage.setItem(MAPPER_KEY, JSON.stringify(handoff))
  } catch {
    return false
  }
  navigate(MAPPER_PATH)
  return true
}
