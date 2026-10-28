import type { LanguageSupport } from '@codemirror/language'
import { useEffect, useState } from 'react'
import { generators } from '../core/generators/index.ts'
// import { createMapperHandoff, openInMapper } from '../core/handoff.ts'
import type { Schema } from '../core/schema.ts'
import { optionValue, type GeneratedCode, type GenerateSettings, type Generator, type PropertyNaming } from '../core/generators/types.ts'
import { useI18n } from '../i18n/useI18n.ts'
import { editorLanguage } from '../utils/editorLanguages.ts'
import { downloadBlob } from '../utils/download.ts'
import { createZip } from '../utils/zip.ts'
import { CodeEditor } from './CodeEditor.tsx'
import { Pane } from './Pane.tsx'
import './GeneratedCodePanel.css'

const NAMINGS: PropertyNaming[] = ['default', 'camelCase', 'snake_case', 'PascalCase', 'keep']

interface GeneratedCodePanelProps {
  generator: Generator
  settings: GenerateSettings
  onGeneratorChange: (id: string) => void
  onSettingsChange: (settings: GenerateSettings) => void
  output: GeneratedCode | null
  /** Base name for the .zip with every file */
  rootName: string
  /** The schema the code comes from, sent to Mapper with the code */
  schema: Schema | null
}

export function GeneratedCodePanel({ generator, settings, onGeneratorChange, onSettingsChange, output, rootName }: GeneratedCodePanelProps) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)
  // const [mapperError, setMapperError] = useState(false)
  const [selectedFile, setSelectedFile] = useState(0)
  const [language, setLanguage] = useState<LanguageSupport | null>(null)
  const style = optionValue(generator, settings, 'style')
  const files = output?.files ?? []
  const file = files[Math.min(selectedFile, files.length - 1)] ?? null

  // Highlighting for each language is loaded only when it is first used
  useEffect(() => {
    let active = true
    void editorLanguage(generator.id).then((loaded) => {
      if (active) setLanguage(loaded)
    })
    return () => {
      active = false
    }
  }, [generator.id])

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  async function copy() {
    if (!file) return
    try {
      await navigator.clipboard.writeText(file.code)
      setCopied(true)
    } catch {
      // Clipboard blocked (permissions, insecure context): the code can still be selected by hand
    }
  }

  function download() {
    if (files.length === 1) {
      downloadBlob(new Blob([files[0].code], { type: 'text/plain;charset=utf-8' }), files[0].name)
    } else if (files.length > 1) {
      const zip = createZip(files.map((item) => ({ name: `models/${item.name}`, content: item.code })))
      downloadBlob(new Blob([zip], { type: 'application/zip' }), `${rootName || 'models'}-${generator.id}.zip`)
    }
  }

  function setOption(id: string, value: string) {
    onSettingsChange({ ...settings, options: { ...settings.options, [id]: value } })
  }

  return (
    <Pane
      title={t.outputTitle}
      actions={
        <select className="select" aria-label={t.targetLanguage} value={generator.id} onChange={(event) => onGeneratorChange(event.target.value)}>
          {generators.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      }
      footer={
        <div className="generated__footer">
          <span className="generated__info">
            {file && <span className="generated__file">{file.name}</span>}
            {output && output.notes.length > 0 && (
              <span className="generated__notes" title={output.notes.map((note) => t.nameNote(note)).join('\n')}>
                {t.namesChanged(output.notes.length)}
              </span>
            )}
          </span>
          <div className="generated__actions">
            {/* Mapper estará disponible cuando la integración haya superado más pruebas.
            <button
              type="button"
              className="button"
              title={t.openInMapperTitle}
              disabled={!schema || !output || files.length === 0}
              onClick={() => {
                if (schema && output) setMapperError(!openInMapper(createMapperHandoff(schema, output, generator.id)))
              }}
            >
              {t.openInMapper}
            </button>
            */}
            <button type="button" className="button" onClick={copy} disabled={!file}>
              {copied ? t.copied : t.copy}
            </button>
            <button type="button" className="button button--primary" onClick={download} disabled={files.length === 0}>
              {files.length > 1 ? t.downloadZip(files.length) : t.download}
            </button>
          </div>
          {/* {mapperError && (
            <p className="generated__error" role="alert">
              {t.openInMapperError}
            </p>
          )} */}
        </div>
      }
    >
      <div className="generated">
        <div className="generated__settings">
          {generator.options
            .filter((option) => !option.styles || option.styles.includes(style))
            .map((option) => (
              <label key={option.id}>
                <span>{t.optionLabel(option.id)}</span>
                <select className="select" value={optionValue(generator, settings, option.id)} onChange={(event) => setOption(option.id, event.target.value)}>
                  {option.choices.map((choice) => (
                    <option key={choice.id} value={choice.id}>
                      {choice.id === 'none' ? t.noLibrary : choice.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          <label>
            <span>{t.propertyNaming}</span>
            <select
              className="select"
              value={settings.naming}
              onChange={(event) => onSettingsChange({ ...settings, naming: event.target.value as PropertyNaming })}
            >
              {NAMINGS.map((naming) => (
                <option key={naming} value={naming}>
                  {naming === 'default' ? t.namingDefault : naming === 'keep' ? t.namingKeep : naming}
                </option>
              ))}
            </select>
          </label>
          {generator.supportsMultipleFiles && (
            <label className="generated__check">
              <input
                type="checkbox"
                checked={settings.multipleFiles}
                onChange={(event) => onSettingsChange({ ...settings, multipleFiles: event.target.checked })}
              />
              {t.multipleFiles}
            </label>
          )}
        </div>
        {files.length > 1 && (
          <div className="generated__files" role="tablist" aria-label={t.files}>
            {files.map((item, index) => (
              <button
                key={item.name}
                type="button"
                role="tab"
                aria-selected={item === file}
                className="generated__file-tab"
                onClick={() => setSelectedFile(index)}
              >
                {item.name}
              </button>
            ))}
          </div>
        )}
        <div className="generated__editor">
          <CodeEditor value={file?.code ?? ''} language={language} readOnly label={t.outputLabel(generator.label)} placeholder={t.outputEmpty} />
        </div>
        {output?.usage && (
          <details className="generated__usage">
            <summary>{t.usageTitle}</summary>
            <pre>{output.usage}</pre>
          </details>
        )}
      </div>
    </Pane>
  )
}
