import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { takeIncoming } from './core/incoming.ts'
import { I18nProvider } from './i18n/I18nProvider.tsx'

// Read once per page load, outside React: StrictMode would otherwise take it twice and lose it
const incoming = takeIncoming(sessionStorage)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <App incoming={incoming} />
    </I18nProvider>
  </StrictMode>,
)
