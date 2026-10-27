import { LanguageSwitcher } from './LanguageSwitcher.tsx'
// Light, dark and system themes are ready but turned off: the portfolio and DataCleanr only have the
// dark one. To turn them on, uncomment this import, <ThemeSwitcher /> below and the script in index.html.
// import { ThemeSwitcher } from './ThemeSwitcher.tsx'
import './AppHeader.css'

/** Same navigation bar as the portfolio, so moving between the website and the tool feels seamless. */
export function AppHeader({ wide }: { wide: boolean }) {
  // Matches the width of the content below: the intro card, or the wider three-column workspace
  return (
    <header className={`app-header${wide ? ' app-header--wide' : ''}`}>
      <nav className="app-header__nav">
        <a href="https://raulesteveza.github.io/" className="app-header__logo">
          Raúl Estévez
        </a>
        <div className="app-header__controls">
          {/* <ThemeSwitcher /> */}
          <LanguageSwitcher />
        </div>
      </nav>
    </header>
  )
}
