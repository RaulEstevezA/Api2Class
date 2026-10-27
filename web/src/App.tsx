import { useDeferredValue, useMemo, useState } from 'react'
import './App.css'
import { AppFooter } from './components/AppFooter.tsx'
import { AppHeader } from './components/AppHeader.tsx'
import { GeneratedCodePanel } from './components/GeneratedCodePanel.tsx'
import { IntroPanel } from './components/IntroPanel.tsx'
import { JsonInputPanel } from './components/JsonInputPanel.tsx'
import { StructureTree } from './components/StructureTree.tsx'
import { analyze } from './core/analyze.ts'
import { applyEdits, NO_EDITS, type Edits } from './core/edits.ts'
import { findGenerator } from './core/generators/index.ts'
import { parseJson } from './core/json.ts'
import { schemaWarnings } from './core/warnings.ts'
import { useStoredState } from './hooks/useStoredState.ts'

function App() {
  // Kept only in memory: pasted API responses may contain personal data or tokens
  const [input, setInput] = useState('')
  // Changes to the detected model; also only in memory, since they name the user's data
  const [edits, setEdits] = useState<Edits>(NO_EDITS)
  // Only the choice of language and style is remembered
  const [generatorId, setGeneratorId] = useStoredState('api2class.generator', () => 'python')
  const [styles, setStyles] = useStoredState<Record<string, string>>('api2class.styles', () => ({}))

  // Large responses are parsed after the keystroke is painted, so typing stays smooth
  const deferredInput = useDeferredValue(input)
  const parsed = useMemo(() => parseJson(deferredInput), [deferredInput])
  const detected = useMemo(() => (parsed.ok ? analyze(parsed.value) : null), [parsed])
  const schema = useMemo(() => (detected ? applyEdits(detected, edits) : null), [detected, edits])
  const warnings = useMemo(() => (schema ? schemaWarnings(schema) : []), [schema])

  const generator = findGenerator(generatorId)
  const style = generator.styles.find((item) => item.id === styles[generator.id])?.id ?? generator.styles[0].id
  const output = useMemo(() => (schema ? generator.generate(schema, { style }) : null), [schema, generator, style])

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
          <StructureTree schema={detected} edits={edits} onEditsChange={setEdits} warnings={warnings} />
          <GeneratedCodePanel
            generator={generator}
            style={style}
            onGeneratorChange={setGeneratorId}
            onStyleChange={(id) => setStyles((current) => ({ ...current, [generator.id]: id }))}
            output={output}
          />
        </div>
      </main>
      <AppFooter />
    </div>
  )
}

export default App
