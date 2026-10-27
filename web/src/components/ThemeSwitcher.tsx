import { useEffect } from 'react'
import { useStoredState } from '../hooks/useStoredState.ts'
import { useI18n } from '../i18n/useI18n.ts'
import './LanguageSwitcher.css'

export type Theme = 'dark' | 'light' | 'system'
const THEMES: Theme[] = ['dark', 'light', 'system']

/** Dark like the portfolio by default; the choice is remembered in the browser. */
export function ThemeSwitcher() {
  const { t } = useI18n()
  const [theme, setTheme] = useStoredState<Theme>('api2class.theme', () => 'dark')

  useEffect(() => {
    document.documentElement.dataset.theme = THEMES.includes(theme) ? theme : 'dark'
  }, [theme])

  return (
    <div className="language-switcher" role="group" aria-label={t.themeLabel}>
      {THEMES.map((option) => (
        <button key={option} type="button" className="language-switcher__option" aria-pressed={option === theme} onClick={() => setTheme(option)}>
          {t.themes[option]}
        </button>
      ))}
    </div>
  )
}
