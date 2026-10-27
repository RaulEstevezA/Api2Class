import { useDeferredValue, useMemo, useState } from 'react'
import './App.css'
import { AppFooter } from './components/AppFooter.tsx'
import { AppHeader } from './components/AppHeader.tsx'
import { GeneratedCodePanel } from './components/GeneratedCodePanel.tsx'
import { IntroPanel } from './components/IntroPanel.tsx'
import { JsonInputPanel } from './components/JsonInputPanel.tsx'
import { StructureTree } from './components/StructureTree.tsx'
import { analyze } from './core/analyze.ts'
import { findGenerator } from './core/generators/index.ts'
import { parseJson } from './core/json.ts'
import { useStoredState } from './hooks/useStoredState.ts'

function App() {
  // Kept only in memory: pasted API responses may contain personal data or tokens
  const [input, setInput] = useState('')
  // Only the choice of language and style is remembered
  const [generatorId, setGeneratorId] = useStoredState('api2class.generator', () => 'python')
  const [styles, setStyles] = useStoredState<Record<string, string>>('api2class.styles', () => ({}))

  // Large responses are parsed after the keystroke is painted, so typing stays smooth
  const deferredInput = useDeferredValue(input)
  const parsed = useMemo(() => parseJson(deferredInput), [deferredInput])
  const schema = useMemo(() => (parsed.ok ? analyze(parsed.value) : null), [parsed])

  const generator = findGenerator(generatorId)
  const style = generator.styles.find((item) => item.id === styles[generator.id])?.id ?? generator.styles[0].id
  const output = useMemo(() => (schema ? generator.generate(schema, { style }) : null), [schema, generator, style])

  return (
    <div className="app">
      <AppHeader wide />
      <main className="app__main app__main--wide">
        <IntroPanel />
        <div className="workspace">
          <JsonInputPanel value={input} onChange={setInput} result={parsed} />
          <StructureTree schema={schema} />
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
