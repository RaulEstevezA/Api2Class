import './App.css'
import { AppFooter } from './components/AppFooter.tsx'
import { AppHeader } from './components/AppHeader.tsx'

function App() {
  return (
    <div className="app">
      <AppHeader wide={false} />
      <main className="app__main">
        <h1>Api2Class</h1>
      </main>
      <AppFooter />
    </div>
  )
}

export default App
