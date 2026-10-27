import { useState } from 'react'
import { describeType, findClass, type Field, type Schema, type TypeRef } from '../core/schema.ts'
import { useI18n } from '../i18n/useI18n.ts'
import { Pane } from './Pane.tsx'
import './StructureTree.css'

/** The class a type leads to, directly or through arrays. */
function classOf(type: TypeRef): string | null {
  if (type.kind === 'class') return type.classId
  if (type.kind === 'array') return classOf(type.items)
  return null
}

/** The primitive at the bottom of a type, to flag the ones that need a look (any, null). */
function primitiveOf(type: TypeRef): string | null {
  if (type.kind === 'primitive') return type.name
  if (type.kind === 'array') return primitiveOf(type.items)
  return null
}

export function StructureTree({ schema }: { schema: Schema | null }) {
  const { t } = useI18n()
  // Paths of collapsed nodes; everything starts expanded
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  function toggle(path: string) {
    setCollapsed((current) => {
      const next = new Set(current)
      if (!next.delete(path)) next.add(path)
      return next
    })
  }

  if (!schema) {
    return (
      <Pane title={t.structureTitle}>
        <p className="structure__empty">{t.structureEmpty}</p>
      </Pane>
    )
  }

  const fieldCount = schema.classes.reduce((total, item) => total + item.fields.length, 0)

  function renderFields(classId: string, path: string) {
    const fields = findClass(schema!, classId).fields
    if (fields.length === 0) return <p className="structure__no-fields">{t.structureNoFields}</p>
    return <ul className="structure__list">{fields.map((field) => renderField(field, `${path}/${field.key}`))}</ul>
  }

  function renderField(field: Field, path: string) {
    const nested = classOf(field.type)
    const primitive = primitiveOf(field.type)
    const open = !collapsed.has(path)
    return (
      <li key={path} className="structure__item">
        <div className="structure__row">
          {nested ? (
            <button type="button" className="structure__toggle" aria-expanded={open} aria-label={open ? t.collapse : t.expand} onClick={() => toggle(path)}>
              {open ? '▾' : '▸'}
            </button>
          ) : (
            <span className="structure__toggle" aria-hidden="true" />
          )}
          <span className="structure__key">{field.key}</span>
          <span className="structure__colon">:</span>
          <span className={`structure__type${nested ? ' structure__type--class' : ''}`}>{describeType(field.type, schema!)}</span>
          {field.optional && <span className="structure__badge">{t.optional}</span>}
          {field.nullable && <span className="structure__badge">{t.nullable}</span>}
          {primitive === 'any' && (
            <span className="structure__badge structure__badge--warning" title={t.anyHint}>
              {t.review}
            </span>
          )}
          {primitive === 'null' && (
            <span className="structure__badge structure__badge--warning" title={t.nullHint}>
              {t.review}
            </span>
          )}
        </div>
        {nested && open && renderFields(nested, path)}
      </li>
    )
  }

  const rootClass = classOf(schema.root)

  return (
    <Pane title={t.structureTitle} footer={<p className="structure__summary">{t.structureSummary(schema.classes.length, fieldCount)}</p>}>
      <div className="structure">
        <div className="structure__row structure__row--root">
          <span className="structure__type structure__type--class">{describeType(schema.root, schema)}</span>
          {schema.root.kind === 'array' && <span className="structure__badge">{t.rootArray}</span>}
        </div>
        {rootClass ? renderFields(rootClass, '') : <p className="structure__no-fields">{t.structureNoClasses}</p>}
      </div>
    </Pane>
  )
}
