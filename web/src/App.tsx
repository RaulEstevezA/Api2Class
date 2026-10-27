import { useDeferredValue, useMemo, useState } from 'react'
import './App.css'
import { AppFooter } from './components/AppFooter.tsx'
import { AppHeader } from './components/AppHeader.tsx'
import { GeneratedCodePanel } from './components/GeneratedCodePanel.tsx'
import { IntroPanel } from './components/IntroPanel.tsx'
import { JsonInputPanel } from './components/JsonInputPanel.tsx'
import { StructureTree } from './components/StructureTree.tsx'
import { analyze, type AnalyzeOptions } from './core/analyze.ts'
import { applyEdits, NO_EDITS, type Edits } from './core/edits.ts'
import { findGenerator } from './core/generators/index.ts'
import type { GenerateSettings, PropertyNaming } from './core/generators/types.ts'
import { parseJson } from './core/json.ts'
import { schemaWarnings } from './core/warnings.ts'
import { useStoredState } from './hooks/useStoredState.ts'

type AnalysisSettings = Required<Pick<AnalyzeOptions, 'detectFormats' | 'mergeIdentical'>>

function App() {
  // Kept only in memory: pasted API responses may contain personal data or tokens
  const [input, setInput] = useState('')
  // Changes to the detected model; also only in memory, since they name the user's data
  const [edits, setEdits] = useState<Edits>(NO_EDITS)
  // Only preferences are remembered
  const [analysis, setAnalysis] = useStoredState<AnalysisSettings>('api2class.analysis', () => ({ detectFormats: true, mergeIdentical: true }))
  const [generatorId, setGeneratorId] = useStoredState('api2class.generator', () => 'python')
  const [options, setOptions] = useStoredState<Record<string, Record<string, string>>>('api2class.options', () => ({}))
  const [naming, setNaming] = useStoredState<PropertyNaming>('api2class.naming', () => 'default')
  const [multipleFiles, setMultipleFiles] = useStoredState('api2class.multipleFiles', () => false)

  // Large responses are parsed after the keystroke is painted, so typing stays smooth
  const deferredInput = useDeferredValue(input)
  const parsed = useMemo(() => parseJson(deferredInput), [deferredInput])
  const detected = useMemo(() => (parsed.ok ? analyze(parsed.value, analysis) : null), [parsed, analysis])
  const schema = useMemo(() => (detected ? applyEdits(detected, edits) : null), [detected, edits])
  const warnings = useMemo(() => (schema ? schemaWarnings(schema) : []), [schema])

  const generator = findGenerator(generatorId)
  const settings: GenerateSettings = useMemo(
    () => ({ options: options[generator.id] ?? {}, naming, multipleFiles: multipleFiles && generator.supportsMultipleFiles }),
    [options, generator, naming, multipleFiles],
  )
  const output = useMemo(() => (schema ? generator.generate(schema, settings) : null), [schema, generator, settings])

  return (
    <div className="app">
      <AppHeader wide />
      <main className="app__main app__main--wide">
        <IntroPanel />
        <div className="workspace">
          <JsonInputPanel
            value={input}
            onChange={(text) => {
              setInput(text)
              // Starting over: edits of the previous JSON would only get in the way
              if (text.trim() === '') setEdits(NO_EDITS)
            }}
            result={parsed}
          />
          <StructureTree
            schema={detected}
            edits={edits}
            onEditsChange={setEdits}
            warnings={warnings}
            analysis={analysis}
            onAnalysisChange={setAnalysis}
          />
          <GeneratedCodePanel
            generator={generator}
            settings={settings}
            onGeneratorChange={setGeneratorId}
            onSettingsChange={(next) => {
              setOptions((current) => ({ ...current, [generator.id]: next.options }))
              setNaming(next.naming)
              setMultipleFiles(next.multipleFiles)
            }}
            output={output}
            rootName={schema?.classes[0]?.name ?? ''}
          />
        </div>
      </main>
      <AppFooter />
    </div>
  )
}

export default App
