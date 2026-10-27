import type { JsonValue } from './json.ts'

/** Writes a parsed value back as JSON. Unlike JSON.stringify, numbers keep their text (`29.0`, big
 * integers) and repeated keys are kept, so formatting never changes what the JSON says. */
export function formatJson(value: JsonValue, indent = 2): string {
  const unit = ' '.repeat(indent)

  function write(item: JsonValue, depth: number): string {
    switch (item.kind) {
      case 'null':
        return 'null'
      case 'boolean':
        return String(item.value)
      case 'number':
        return item.text
      case 'string':
        return JSON.stringify(item.value)
      case 'array':
      case 'object': {
        const [open, close] = item.kind === 'array' ? ['[', ']'] : ['{', '}']
        const parts =
          item.kind === 'array'
            ? item.items.map((child) => write(child, depth + 1))
            : item.entries.map(([key, child]) => `${JSON.stringify(key)}:${indent > 0 ? ' ' : ''}${write(child, depth + 1)}`)
        if (parts.length === 0) return open + close
        if (indent === 0) return open + parts.join(',') + close
        const inner = unit.repeat(depth + 1)
        return `${open}\n${inner}${parts.join(`,\n${inner}`)}\n${unit.repeat(depth)}${close}`
      }
    }
  }

  return write(value, 0)
}

export function minifyJson(value: JsonValue): string {
  return formatJson(value, 0)
}
