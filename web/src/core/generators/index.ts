import { csharp } from './csharp/csharp.ts'
import { dart } from './dart/dart.ts'
import { go } from './go/go.ts'
import { java } from './java/java.ts'
import { jsonSchema } from './jsonschema/jsonschema.ts'
import { kotlin } from './kotlin/kotlin.ts'
import { php } from './php/php.ts'
import { python } from './python/python.ts'
import { rust } from './rust/rust.ts'
import { scala } from './scala/scala.ts'
import { swift } from './swift/swift.ts'
import type { Generator } from './types.ts'
import { typescript } from './typescript/typescript.ts'

/** Every available language, in the order they are offered: the most used first, then the
 * languages for describing APIs. */
export const generators: Generator[] = [python, java, typescript, csharp, kotlin, dart, swift, go, php, rust, scala, jsonSchema]

export function findGenerator(id: string): Generator {
  return generators.find((generator) => generator.id === id) ?? generators[0]
}
