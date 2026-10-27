import { java } from '@codemirror/lang-java'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import type { LanguageSupport } from '@codemirror/language'
import { useEffect, useState } from 'react'
import type { GeneratedCode, Generator } from '../core/generators/types.ts'
import { generators } from '../core/generators/index.ts'
import { useI18n } from '../i18n/useI18n.ts'
import { downloadBlob } from '../utils/download.ts'
import { CodeEditor } from './CodeEditor.tsx'
import { Pane } from './Pane.tsx'
import './GeneratedCodePanel.css'

// Syntax highlighting for each generator id
const EDITOR_LANGUAGES: Record<string, LanguageSupport> = {
  python: python(),
  java: java(),
  typescript: javascript({ typescript: true }),
}

interface GeneratedCodePanelProps {
  generator: Generator
  style: string
  onGeneratorChange: (id: string) => void
  onStyleChange: (id: string) => void
  output: GeneratedCode | null
}

export function GeneratedCodePanel({ generator, style, onGeneratorChange, onStyleChange, output }: GeneratedCodePanelProps) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  async function copy() {
    if (!output) return
    try {
      await navigator.clipboard.writeText(output.code)
      setCopied(true)
    } catch {
      // Clipboard blocked (permissions, insecure context): the code can still be selected by hand
    }
  }

  function download() {
    if (output) downloadBlob(new Blob([output.code], { type: 'text/plain;charset=utf-8' }), output.fileName)
  }

  return (
    <Pane
      title={t.outputTitle}
      actions={
        <>
          <select
            className="select"
            aria-label={t.targetLanguage}
            value={generator.id}
            onChange={(event) => onGeneratorChange(event.target.value)}
          >
            {generators.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <select
            className="select"
            aria-label={t.modelStyle}
            value={style}
            disabled={generator.styles.length < 2}
            onChange={(event) => onStyleChange(event.target.value)}
          >
            {generator.styles.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </>
      }
      footer={
        <div className="generated__footer">
          <span className="generated__file">{output?.fileName ?? ''}</span>
          <div className="generated__actions">
            <button type="button" className="button button--small" onClick={copy} disabled={!output}>
              {copied ? t.copied : t.copy}
            </button>
            <button type="button" className="button button--small button--primary" onClick={download} disabled={!output}>
              {t.download}
            </button>
          </div>
        </div>
      }
    >
      <CodeEditor
        value={output?.code ?? ''}
        language={EDITOR_LANGUAGES[generator.id] ?? EDITOR_LANGUAGES.typescript}
        readOnly
        label={t.outputLabel(generator.label)}
        placeholder={t.outputEmpty}
      />
    </Pane>
  )
}
