import { java } from './java/java.ts'
import { python } from './python/python.ts'
import type { Generator } from './types.ts'

/** Every available language, in the order they are offered. */
export const generators: Generator[] = [python, java]

export function findGenerator(id: string): Generator {
  return generators.find((generator) => generator.id === id) ?? generators[0]
}
