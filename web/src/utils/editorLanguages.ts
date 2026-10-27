import { LanguageSupport, StreamLanguage, type StreamParser } from '@codemirror/language'

const legacy = (parser: StreamParser<unknown>) => new LanguageSupport(StreamLanguage.define(parser))

// Loaded on demand: only the language being viewed is downloaded
const LOADERS: Record<string, () => Promise<LanguageSupport>> = {
  json: async () => (await import('@codemirror/lang-json')).json(),
  python: async () => (await import('@codemirror/lang-python')).python(),
  java: async () => (await import('@codemirror/lang-java')).java(),
  typescript: async () => (await import('@codemirror/lang-javascript')).javascript({ typescript: true }),
  go: async () => (await import('@codemirror/lang-go')).go(),
  php: async () => (await import('@codemirror/lang-php')).php(),
  rust: async () => (await import('@codemirror/lang-rust')).rust(),
  csharp: async () => legacy((await import('@codemirror/legacy-modes/mode/clike')).csharp),
  kotlin: async () => legacy((await import('@codemirror/legacy-modes/mode/clike')).kotlin),
  dart: async () => legacy((await import('@codemirror/legacy-modes/mode/clike')).dart),
  scala: async () => legacy((await import('@codemirror/legacy-modes/mode/clike')).scala),
  swift: async () => legacy((await import('@codemirror/legacy-modes/mode/swift')).swift),
  jsonschema: async () => (await import('@codemirror/lang-json')).json(),
  // Smithy reads like Java or Kotlin as far as highlighting goes
  smithy: async () => legacy((await import('@codemirror/legacy-modes/mode/clike')).kotlin),
}

const cache = new Map<string, Promise<LanguageSupport>>()

/** Syntax highlighting for a generator id. */
export function editorLanguage(id: string): Promise<LanguageSupport> {
  if (!cache.has(id)) cache.set(id, (LOADERS[id] ?? LOADERS.json)())
  return cache.get(id)!
}
