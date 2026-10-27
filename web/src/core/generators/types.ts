import type { Schema } from '../schema.ts'

export interface GeneratorStyle {
  id: string
  label: string
}

export interface GenerateOptions {
  /** One of the generator's style ids */
  style: string
}

export interface GeneratedCode {
  fileName: string
  code: string
}

/** One target language. Generators are independent from each other: adding a language means adding
 * its folder and registering it in generators/index.ts. */
export interface Generator {
  id: string
  label: string
  styles: GeneratorStyle[]
  generate(schema: Schema, options: GenerateOptions): GeneratedCode
}
