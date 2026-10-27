import { useI18n } from '../i18n/useI18n.ts'
import './AppFooter.css'

export function AppFooter() {
  const { t } = useI18n()

  return (
    <footer className="app-footer">
      <span>{t.license}</span>
      <a href="https://github.com/RaulEstevezA/Api2Class" target="_blank" rel="noopener">
        {t.sourceCode}
      </a>
      <a href="https://raulesteveza.github.io/">Raúl Estévez</a>
    </footer>
  )
}
