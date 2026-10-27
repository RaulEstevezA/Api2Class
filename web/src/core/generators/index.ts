import { csharp } from './csharp/csharp.ts'
import { dart } from './dart/dart.ts'
import { java } from './java/java.ts'
import { kotlin } from './kotlin/kotlin.ts'
import { python } from './python/python.ts'
import type { Generator } from './types.ts'
import { typescript } from './typescript/typescript.ts'

/** Every available language, in the order they are offered: the most used first, then the
 * languages for describing APIs. */
export const generators: Generator[] = [python, java, typescript, csharp, kotlin, dart]

export function findGenerator(id: string): Generator {
  return generators.find((generator) => generator.id === id) ?? generators[0]
}
