import { childPath, classOf, type ClassDef, type Field, type PrimitiveType, type Schema, type TypeRef } from './schema.ts'

export interface ClassEdit {
  name?: string
}

export interface FieldEdit {
  /** Property name to use in the code instead of the one derived from the JSON key */
  name?: string
  /** Replaces the detected type; arrays keep being arrays (`Order[]` → `object[]`) */
  type?: PrimitiveType
  optional?: boolean
  nullable?: boolean
  excluded?: boolean
}

/** Changes made by the user, by path: classes by id (`#/orders/[]`), fields by the id of their
 * class and their key (`#/orders/[]/total`). Kept apart from the analysis, so they survive changes
 * to the JSON as long as the paths still exist. */
export interface Edits {
  classes: Record<string, ClassEdit>
  fields: Record<string, FieldEdit>
}

export const NO_EDITS: Edits = { classes: {}, fields: {} }

export function hasEdits(edits: Edits): boolean {
  return Object.keys(edits.classes).length > 0 || Object.keys(edits.fields).length > 0
}

export function fieldPath(classId: string, key: string): string {
  return childPath(classId, key)
}

/** Sets or clears part of an edit; an edit left empty is removed. */
export function updateEdit<T extends object>(edits: Record<string, T>, path: string, change: Partial<T>): Record<string, T> {
  const merged = { ...edits[path], ...change } as Record<string, unknown>
  for (const key of Object.keys(merged)) if (merged[key] === undefined) delete merged[key]
  const next = { ...edits }
  if (Object.keys(merged).length === 0) delete next[path]
  else next[path] = merged as T
  return next
}

function replaceInnermost(type: TypeRef, name: PrimitiveType): TypeRef {
  if (type.kind === 'array') return { ...type, items: replaceInnermost(type.items, name) }
  return { kind: 'primitive', name }
}

/** Applies a field's edit to it: what the code is generated from. */
export function editedField(field: Field, edit: FieldEdit | undefined): Field {
  if (!edit) return field
  const result: Field = { ...field }
  if (edit.name !== undefined && edit.name.trim() !== '') result.name = edit.name.trim()
  if (edit.type !== undefined) result.type = replaceInnermost(field.type, edit.type)
  if (edit.optional !== undefined) result.optional = edit.optional
  if (edit.nullable !== undefined) result.nullable = edit.nullable
  return result
}

/** The schema the code is generated from: edits applied, excluded fields removed, and classes that
 * nothing uses any more left out. */
export function applyEdits(schema: Schema, edits: Edits): Schema {
  const byId = new Map(schema.classes.map((item) => [item.id, item]))
  const edited = new Map<string, ClassDef>()

  function visit(classId: string) {
    if (edited.has(classId)) return
    const item = byId.get(classId)!
    const name = edits.classes[classId]?.name?.trim()
    const result: ClassDef = { ...item, name: name || item.name, fields: [] }
    edited.set(classId, result)
    for (const field of item.fields) {
      const edit = edits.fields[fieldPath(classId, field.key)]
      if (edit?.excluded) continue
      const final = editedField(field, edit)
      result.fields.push(final)
      const nested = classOf(final.type)
      if (nested) visit(nested)
    }
  }

  const rootClass = classOf(schema.root)
  if (rootClass) visit(rootClass)
  // Same order as the analysis
  return { root: schema.root, classes: schema.classes.filter((item) => edited.has(item.id)).map((item) => edited.get(item.id)!) }
}
