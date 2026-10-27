import { json } from '@codemirror/lang-json'
import type { ParseResult } from '../core/json.ts'
import { useI18n } from '../i18n/useI18n.ts'
import { EXAMPLE_JSON } from '../utils/example.ts'
import { CodeEditor } from './CodeEditor.tsx'
import { Pane } from './Pane.tsx'
import './JsonInputPanel.css'

const jsonLanguage = json()

interface JsonInputPanelProps {
  value: string
  onChange: (value: string) => void
  result: ParseResult
}

export function JsonInputPanel({ value, onChange, result }: JsonInputPanelProps) {
  const { t } = useI18n()
  const error = result.ok ? null : result.error
  const found = error?.found === undefined ? '' : JSON.stringify(error.found).slice(1, -1) || error.found

  return (
    <Pane
      title={t.inputTitle}
      actions={
        <>
          <button type="button" className="button button--small" onClick={() => onChange(EXAMPLE_JSON)}>
            {t.loadExample}
          </button>
          <button type="button" className="button button--small" onClick={() => onChange('')} disabled={value === ''}>
            {t.clear}
          </button>
        </>
      }
      footer={
        error === null ? (
          <p className="json-status json-status--ok">{t.inputValid}</p>
        ) : error.code === 'empty' ? (
          <p className="json-status">{t.jsonError.empty()}</p>
        ) : (
          <p className="json-status json-status--error" role="alert">
            <strong>{t.errorPosition(error.line, error.column)}</strong> · {t.jsonError[error.code](found)}
          </p>
        )
      }
    >
      <CodeEditor
        value={value}
        onChange={onChange}
        language={jsonLanguage}
        label={t.inputLabel}
        placeholder={t.inputPlaceholder}
        errorLine={error && error.code !== 'empty' ? error.line : null}
      />
    </Pane>
  )
}
