const en = {
  tagline: 'Turn JSON API responses into typed models',
  languageLabel: 'Language',
  license: 'MIT License',
  sourceCode: 'Source code',
}

export type Messages = typeof en

const es: Messages = {
  tagline: 'Convierte respuestas JSON de APIs en modelos tipados',
  languageLabel: 'Idioma',
  license: 'Licencia MIT',
  sourceCode: 'Código fuente',
}

export const messages = { en, es }
export type Language = keyof typeof messages
export const languages = Object.keys(messages) as Language[]
