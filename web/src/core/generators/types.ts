import type { NamingConvention } from '../naming.ts'
import type { Schema } from '../schema.ts'

/** A setting of a generator: its style, the serialization library... The first choice is the default. */
export interface GeneratorOption {
  id: string
  choices: { id: string; label: string }[]
  /** Only shown for these values of the style option */
  styles?: string[]
}

/** How property names are written: the language's usual convention, a chosen one, or the JSON keys
 * as they are (when they are valid identifiers). */
export type PropertyNaming = 'default' | NamingConvention | 'keep'

export interface GenerateSettings {
  /** By option id; missing ones take their first choice */
  options: Record<string, string>
  naming: PropertyNaming
  /** One file per class instead of a single file */
  multipleFiles: boolean
}

export interface GeneratedFile {
  name: string
  code: string
}

/** A name that had to change to be valid in the language. */
export interface NameNote {
  className: string
  key: string
  name: string
  reason: 'reserved' | 'invalid'
}

export interface GeneratedCode {
  files: GeneratedFile[]
  /** Short example of reading the JSON with the generated code, or null when there is nothing to read */
  usage: string | null
  notes: NameNote[]
}

/** One target language. Generators are independent from each other: adding a language means adding
 * its folder and registering it in generators/index.ts. */
export interface Generator {
  id: string
  label: string
  /** Settings, the style first */
  options: GeneratorOption[]
  supportsMultipleFiles: boolean
  generate(schema: Schema, settings: GenerateSettings): GeneratedCode
}

export const DEFAULT_SETTINGS: GenerateSettings = { options: {}, naming: 'default', multipleFiles: false }

/** The value of an option, or its default (first choice). */
export function optionValue(generator: Pick<Generator, 'options'>, settings: GenerateSettings, id: string): string {
  const option = generator.options.find((item) => item.id === id)
  if (!option) throw new Error(`Unknown option ${id}`)
  const value = settings.options[id]
  return option.choices.some((choice) => choice.id === value) ? value : option.choices[0].id
}
