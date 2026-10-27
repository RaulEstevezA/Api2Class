import { useI18n } from '../i18n/useI18n.ts'
import './IntroPanel.css'

const TOOLS_URL = 'https://raulesteveza.github.io/tools/'
const SOURCE_URL = 'https://github.com/RaulEstevezA/Api2Class'

/** Presentation strip above the workspace, styled like the portfolio's project windows. */
export function IntroPanel() {
  const { t } = useI18n()

  return (
    <section className="intro window">
      <div className="intro__text">
        <div className="intro__title">
          <h1>Api2Class</h1>
          <span className="intro__badge">{t.privacyShort}</span>
        </div>
        <p className="intro__subtitle">{t.tagline}</p>
        <p className="intro__description">{t.introDescription}</p>
        <p className="intro__privacy" role="note">
          {t.privacyNote}
        </p>
      </div>

      <div className="intro__actions">
        <a className="button" href={SOURCE_URL} target="_blank" rel="noopener">
          {t.introCode}
        </a>
        <a className="button" href={TOOLS_URL}>
          {t.introAllTools}
        </a>
      </div>
    </section>
  )
}
