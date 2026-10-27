import { useDeferredValue, useMemo, useState } from 'react'
import './App.css'
import { AppFooter } from './components/AppFooter.tsx'
import { AppHeader } from './components/AppHeader.tsx'
import { IntroPanel } from './components/IntroPanel.tsx'
import { JsonInputPanel } from './components/JsonInputPanel.tsx'
import { StructureTree } from './components/StructureTree.tsx'
import { analyze } from './core/analyze.ts'
import { parseJson } from './core/json.ts'

function App() {
  // Kept only in memory: pasted API responses may contain personal data or tokens
  const [input, setInput] = useState('')
  // Large responses are parsed after the keystroke is painted, so typing stays smooth
  const deferredInput = useDeferredValue(input)
  const parsed = useMemo(() => parseJson(deferredInput), [deferredInput])
  const schema = useMemo(() => (parsed.ok ? analyze(parsed.value) : null), [parsed])

  return (
    <div className="app">
      <AppHeader wide />
      <main className="app__main app__main--wide">
        <IntroPanel />
        <div className="workspace">
          <JsonInputPanel value={input} onChange={setInput} result={parsed} />
          <StructureTree schema={schema} />
        </div>
      </main>
      <AppFooter />
    </div>
  )
}

export default App
