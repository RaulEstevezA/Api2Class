/** JSON received from another tool of the family (Api2Data → Api2Class) without a server, following
 * personal_web_style patterns/tool-continuity.md. The sender leaves a `json-handoff` in sessionStorage under
 * `api2class.incoming` and opens Api2Class in the same tab; it is read once and removed. */

export const INCOMING_KEY = 'api2class.incoming'
export const JSON_HANDOFF_FORMAT = 'json-handoff'
export const JSON_HANDOFF_VERSION = 1

// Far above any response worth turning into models, and small enough for sessionStorage
export const MAX_INCOMING_SIZE = 4 * 1024 * 1024

/** Tools that may send JSON to Api2Class. */
export type SenderId = 'api2data'
const SENDERS: readonly SenderId[] = ['api2data']

export interface Incoming {
  from: SenderId
  /** The JSON text, unparsed: it is validated like pasted text */
  content: string
  /** Where the JSON came from, to tell the user ("GET https://api.example.com/users") */
  source?: { method: string; url: string }
}

/** Checks a received handoff. Anything unexpected is rejected: the content comes from outside the page. */
export function readIncoming(value: unknown): Incoming | null {
  if (typeof value === 'string') {
    if (value.length > MAX_INCOMING_SIZE * 2) return null
    try {
      return readIncoming(JSON.parse(value))
    } catch {
      return null
    }
  }
  if (typeof value !== 'object' || value === null) return null
  const handoff = value as Record<string, unknown>
  if (handoff.format !== JSON_HANDOFF_FORMAT || handoff.version !== JSON_HANDOFF_VERSION) return null
  if (!SENDERS.includes(handoff.from as SenderId)) return null
  const text = handoff.text as Record<string, unknown> | undefined
  if (!text || text.format !== 'json' || typeof text.content !== 'string' || text.content.length > MAX_INCOMING_SIZE) return null
  const incoming: Incoming = { from: handoff.from as SenderId, content: text.content }
  const source = handoff.source as Record<string, unknown> | undefined
  if (source && typeof source.method === 'string' && typeof source.url === 'string' && /^https?:\/\//.test(source.url))
    incoming.source = { method: source.method.slice(0, 16), url: source.url.slice(0, 2048) }
  return incoming
}

/** Takes the JSON left for Api2Class, once: it is removed as soon as it is read, so reloading the page starts empty. */
export function takeIncoming(storage: Pick<Storage, 'getItem' | 'removeItem'>): Incoming | null {
  try {
    const raw = storage.getItem(INCOMING_KEY)
    if (raw === null) return null
    storage.removeItem(INCOMING_KEY)
    return readIncoming(raw)
  } catch {
    return null
  }
}
