import { useState } from 'react'
import type { AnalyzeOptions } from '../core/analyze.ts'
import { editedField, fieldPath, hasEdits, updateEdit, type Edits, type FieldEdit } from '../core/edits.ts'
import { classOf, innermostType, type Field, type PrimitiveType, type Schema, type TypeRef } from '../core/schema.ts'
import type { SchemaWarning } from '../core/warnings.ts'
import { useI18n } from '../i18n/useI18n.ts'
import { Pane } from './Pane.tsx'
import './StructureTree.css'

const TYPE_CHOICES: PrimitiveType[] = ['string', 'integer', 'float', 'boolean', 'date', 'datetime', 'uuid', 'object', 'any']

interface StructureTreeProps {
  /** As detected: the tree also shows excluded fields, so they can be included again */
  schema: Schema | null
  edits: Edits
  onEditsChange: (edits: Edits) => void
  warnings: SchemaWarning[]
  analysis: Required<Pick<AnalyzeOptions, 'detectFormats' | 'mergeIdentical'>>
  onAnalysisChange: (analysis: StructureTreeProps['analysis']) => void
}

export function StructureTree({ schema, edits, onEditsChange, warnings, analysis, onAnalysisChange }: StructureTreeProps) {
  const { t } = useI18n()
  // Paths of collapsed nodes; everything starts expanded
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  // Path of the field whose editor is open
  const [editing, setEditing] = useState<string | null>(null)

  const settings = (
    <div className="structure__settings">
      {(['detectFormats', 'mergeIdentical'] as const).map((setting) => (
        <label key={setting}>
          <input type="checkbox" checked={analysis[setting]} onChange={(event) => onAnalysisChange({ ...analysis, [setting]: event.target.checked })} />
          {t[setting]}
        </label>
      ))}
    </div>
  )

  if (!schema) {
    return (
      <Pane title={t.structureTitle}>
        {settings}
        <p className="structure__empty">{t.structureEmpty}</p>
      </Pane>
    )
  }
  const detected = schema
  const byId = new Map(detected.classes.map((item) => [item.id, item]))

  function toggle(path: string) {
    setCollapsed((current) => {
      const next = new Set(current)
      if (!next.delete(path)) next.add(path)
      return next
    })
  }

  function className(classId: string): string {
    return edits.classes[classId]?.name?.trim() || byId.get(classId)!.name
  }

  function describe(type: TypeRef): string {
    if (type.kind === 'primitive') return type.name
    if (type.kind === 'class') return className(type.classId)
    return type.itemsNullable ? `(${describe(type.items)} | null)[]` : `${describe(type.items)}[]`
  }

  function editField(path: string, change: Partial<FieldEdit>) {
    onEditsChange({ ...edits, fields: updateEdit(edits.fields, path, change) })
  }

  function renameClass(classId: string, name: string) {
    onEditsChange({ ...edits, classes: updateEdit(edits.classes, classId, { name: name === '' ? undefined : name }) })
  }

  function renderFields(classId: string, ancestors: string[]) {
    const fields = byId.get(classId)!.fields
    if (fields.length === 0) return <p className="structure__no-fields">{t.structureNoFields}</p>
    return <ul className="structure__list">{fields.map((field) => renderField(classId, field, ancestors))}</ul>
  }

  function renderField(classId: string, field: Field, ancestors: string[]) {
    const path = fieldPath(classId, field.key)
    // Tree position, unique even when a shared class appears in several places
    const node = `${ancestors.join('>')}>${path}`
    const edit = edits.fields[path]
    const final = editedField(field, edit)
    const excluded = edit?.excluded === true
    const nested = classOf(final.type)
    const inner = innermostType(final.type)
    const open = !collapsed.has(node)
    const warning = warnings.find((item) => item.classId === classId && item.key === field.key)
    return (
      <li key={node} className={`structure__item${excluded ? ' structure__item--excluded' : ''}`}>
        <div className="structure__row">
          <input
            type="checkbox"
            className="structure__include"
            checked={!excluded}
            aria-label={t.includeField(field.key)}
            title={excluded ? t.fieldExcluded : t.fieldIncluded}
            onChange={(event) => editField(path, { excluded: event.target.checked ? undefined : true })}
          />
          {nested && !excluded ? (
            <button type="button" className="structure__toggle" aria-expanded={open} aria-label={open ? t.collapse : t.expand} onClick={() => toggle(node)}>
              {open ? '▾' : '▸'}
            </button>
          ) : (
            <span className="structure__toggle" aria-hidden="true" />
          )}
          <span className="structure__key">{field.key}</span>
          {final.name && <span className="structure__rename">→ {final.name}</span>}
          <span className="structure__colon">:</span>
          <span className={`structure__type${nested ? ' structure__type--class' : ''}${edit?.type ? ' structure__type--edited' : ''}`}>
            {describe(final.type)}
          </span>
          {final.optional && <span className="structure__badge">{t.optional}</span>}
          {final.nullable && <span className="structure__badge">{t.nullable}</span>}
          {warning && !excluded && (
            <span className="structure__badge structure__badge--warning" title={t.warningText(warning)}>
              {t.review}
            </span>
          )}
          <button
            type="button"
            className="structure__edit"
            aria-expanded={editing === node}
            aria-label={t.editField(field.key)}
            title={t.editField(field.key)}
            onClick={() => setEditing(editing === node ? null : node)}
          >
            {t.edit}
          </button>
        </div>
        {editing === node && (
          <div className="structure__editor">
            <label>
              <span>{t.propertyName}</span>
              <input type="text" value={edit?.name ?? ''} placeholder={field.key} onChange={(event) => editField(path, { name: event.target.value || undefined })} />
            </label>
            <label>
              <span>{t.fieldType}</span>
              <select
                value={edit?.type ?? ''}
                onChange={(event) => editField(path, { type: (event.target.value || undefined) as PrimitiveType | undefined })}
              >
                <option value="">{t.detectedType(describe(innermostType(field.type)))}</option>
                {TYPE_CHOICES.filter((choice) => !(inner.kind === 'primitive' && choice === inner.name && !edit?.type)).map((choice) => (
                  <option key={choice} value={choice}>
                    {choice === 'object' ? t.mapType : choice}
                  </option>
                ))}
              </select>
            </label>
            {nested && (
              <label>
                <span>{t.classNameLabel}</span>
                <input
                  type="text"
                  value={edits.classes[nested]?.name ?? ''}
                  placeholder={byId.get(nested)!.name}
                  onChange={(event) => renameClass(nested, event.target.value)}
                />
              </label>
            )}
            <div className="structure__checks">
              <label>
                <input type="checkbox" checked={final.optional} onChange={(event) => editField(path, { optional: event.target.checked === field.optional ? undefined : event.target.checked })} />
                {t.optional}
              </label>
              <label>
                <input type="checkbox" checked={final.nullable} onChange={(event) => editField(path, { nullable: event.target.checked === field.nullable ? undefined : event.target.checked })} />
                {t.nullable}
              </label>
            </div>
          </div>
        )}
        {/* A class already open above is not expanded again (two fields of the same class inside each other) */}
        {nested && open && !excluded && !ancestors.includes(nested) && renderFields(nested, [...ancestors, nested])}
      </li>
    )
  }

  const rootClass = classOf(detected.root)
  const fieldCount = detected.classes.reduce((total, item) => total + item.fields.length, 0)

  return (
    <Pane
      title={t.structureTitle}
      actions={
        hasEdits(edits) && (
          <button type="button" className="button button--small" onClick={() => onEditsChange({ classes: {}, fields: {} })}>
            {t.resetEdits}
          </button>
        )
      }
      footer={<p className="structure__summary">{t.structureSummary(detected.classes.length, fieldCount)}</p>}
    >
      {settings}
      <div className="structure">
        {warnings.length > 0 && (
          <details className="structure__warnings">
            <summary>{t.warningCount(warnings.length)}</summary>
            <ul>
              {warnings.map((warning) => (
                <li key={`${warning.classId}/${warning.key}`}>
                  <code>
                    {className(warning.classId)}.{warning.key}
                  </code>
                  : {t.warningText(warning)}
                </li>
              ))}
            </ul>
          </details>
        )}
        <div className="structure__row structure__row--root">
          {rootClass ? (
            <input
              type="text"
              className="structure__root-name"
              aria-label={t.rootName}
              title={t.rootName}
              value={edits.classes[rootClass]?.name ?? ''}
              placeholder={byId.get(rootClass)!.name}
              onChange={(event) => renameClass(rootClass, event.target.value)}
            />
          ) : (
            <span className="structure__type">{describe(detected.root)}</span>
          )}
          {detected.root.kind === 'array' && <span className="structure__badge">{t.rootArray}</span>}
        </div>
        {rootClass ? renderFields(rootClass, [rootClass]) : <p className="structure__no-fields">{t.structureNoClasses}</p>}
      </div>
    </Pane>
  )
}
