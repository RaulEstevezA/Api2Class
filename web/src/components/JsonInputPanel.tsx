import { json } from '@codemirror/lang-json'
import { useRef, useState, type DragEvent } from 'react'
import { formatJson, minifyJson } from '../core/format.ts'
import type { ParseResult } from '../core/json.ts'
import { useI18n } from '../i18n/useI18n.ts'
import { EXAMPLE_JSON } from '../utils/example.ts'
import { CodeEditor } from './CodeEditor.tsx'
import { Pane } from './Pane.tsx'
import './JsonInputPanel.css'

const jsonLanguage = json()
// Far above any API response; avoids freezing the tab with a huge file dropped by mistake
const MAX_FILE_SIZE = 50 * 1024 * 1024

interface JsonInputPanelProps {
  value: string
  onChange: (value: string) => void
  result: ParseResult
}

export function JsonInputPanel({ value, onChange, result }: JsonInputPanelProps) {
  const { t } = useI18n()
  const fileInput = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const error = result.ok ? null : result.error

  function change(text: string) {
    setFileError(null)
    onChange(text)
  }

  /** Read in the browser: the file is never uploaded. */
  async function openFile(file: File) {
    if (file.size > MAX_FILE_SIZE) {
      setFileError(t.fileTooLarge(file.name))
      return
    }
    try {
      change(await file.text())
    } catch {
      setFileError(t.fileError(file.name))
    }
  }

  function hasFiles(event: DragEvent) {
    return event.dataTransfer.types.includes('Files')
  }

  return (
    <div
      className={`json-input${dragging ? ' json-input--dragging' : ''}`}
      onDragOver={(event) => {
        if (!hasFiles(event)) return
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false)
      }}
      onDropCapture={(event) => {
        if (!hasFiles(event)) return
        // Captured before CodeMirror, which would otherwise try to insert the file as text
        event.preventDefault()
        event.stopPropagation()
        setDragging(false)
        const file = event.dataTransfer.files[0]
        if (file) void openFile(file)
      }}
    >
      <Pane
        title={t.inputTitle}
        actions={
          <>
            <button type="button" className="button button--small" onClick={() => change(EXAMPLE_JSON)}>
              {t.loadExample}
            </button>
            <button type="button" className="button button--small" onClick={() => fileInput.current?.click()}>
              {t.openFile}
            </button>
            <button
              type="button"
              className="button button--small"
              disabled={!result.ok}
              onClick={() => result.ok && change(formatJson(result.value))}
            >
              {t.format}
            </button>
            <button
              type="button"
              className="button button--small"
              disabled={!result.ok}
              onClick={() => result.ok && change(minifyJson(result.value))}
            >
              {t.minify}
            </button>
            <button type="button" className="button button--small" onClick={() => change('')} disabled={value === ''}>
              {t.clear}
            </button>
            <input
              ref={fileInput}
              type="file"
              accept=".json,application/json,text/plain"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (file) void openFile(file)
              }}
            />
          </>
        }
        footer={
          fileError ? (
            <p className="json-status json-status--error" role="alert">
              {fileError}
            </p>
          ) : error === null ? (
            <p className="json-status json-status--ok">{t.inputValid}</p>
          ) : error.code === 'empty' ? (
            <p className="json-status">{t.jsonEmpty}</p>
          ) : (
            <p className="json-status json-status--error" role="alert">
              <strong>{t.errorPosition(error.line, error.column)}</strong> · {t.jsonError(error)}
            </p>
          )
        }
      >
        <CodeEditor
          value={value}
          onChange={change}
          language={jsonLanguage}
          label={t.inputLabel}
          placeholder={t.inputPlaceholder}
          errorLine={error && error.code !== 'empty' ? error.line : null}
        />
        {dragging && <div className="json-input__drop">{t.dropFile}</div>}
      </Pane>
    </div>
  )
}
