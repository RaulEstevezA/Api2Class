import { useI18n } from '../i18n/useI18n.ts'
import './IntroPanel.css'

/** Presentation strip above the workspace, styled like the portfolio's project windows. Links and
 * downloads are in LinksPanel, under the workspace. */
export function IntroPanel() {
  const { t } = useI18n()

  return (
    <section className="intro window">
      <div className="intro__text">
        <div className="intro__title">
          <h1 className="intro__name">
            <img className="intro__icon" src={`${import.meta.env.BASE_URL}favicon.svg`} width="32" height="32" alt="" />
            Api2Class
          </h1>
          <span className="intro__badge">{t.privacyShort}</span>
        </div>
        <p className="intro__subtitle">{t.tagline}</p>
        <p className="intro__description">{t.introDescription}</p>
      </div>
    </section>
  )
}
