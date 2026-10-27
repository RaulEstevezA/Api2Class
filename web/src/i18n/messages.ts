import type { JsonErrorInfo, JsonExpected } from '../core/json.ts'
import type { NameNote } from '../core/generators/types.ts'
import type { SchemaWarning } from '../core/warnings.ts'

const EXPECTED_EN: Record<JsonExpected, string> = {
  value: 'a value',
  key: 'a property name in double quotes',
  colon: '“:”',
  commaOrBrace: '“,” or “}”',
  commaOrBracket: '“,” or “]”',
}

const EXPECTED_ES: Record<JsonExpected, string> = {
  value: 'un valor',
  key: 'un nombre de propiedad entre comillas dobles',
  colon: '“:”',
  commaOrBrace: '“,” o “}”',
  commaOrBracket: '“,” o “]”',
}

/** The character found, readable even when it is invisible (a line break, a tab). */
function describeFound(found: string | undefined): string {
  if (found === undefined) return ''
  const escaped = JSON.stringify(found).slice(1, -1)
  return `“${escaped || found}”`
}

const en = {
  tagline: 'Turn JSON API responses into typed models',
  introDescription:
    'Paste a JSON response from an API (from Postman, the browser or a log), review and edit the structure detected, and get ready-to-use models for Python, Java, TypeScript, C#, Kotlin, Dart, Swift, Go, PHP, Rust or Scala, or a JSON Schema or Smithy definition.',
  privacyShort: 'Processed locally',
  introCode: 'Source code',
  introAllTools: 'All tools',
  downloadDesktop: 'Download for desktop',
  downloadFor: (platform: string) => `Download for ${platform}`,
  otherPlatforms: 'Other platforms',
  otherArchitecture: (architecture: string) => `${architecture} version`,
  downloadNote: 'Desktop version for Windows, macOS and Linux. It is not signed, so the first time your system will show a warning.',
  howToOpen: 'How to open it',
  howToOpenUrl: 'https://github.com/RaulEstevezA/Api2Class/blob/main/desktop/README_en.md#opening-it-the-first-time',
  languageLabel: 'Language',
  themeLabel: 'Theme',
  workspaceTabs: 'Workspace',
  tabs: { input: 'JSON', structure: 'Structure', output: 'Code' },
  themes: { dark: 'Dark', light: 'Light', system: 'System' },
  license: 'MIT License',
  sourceCode: 'Source code',
  inputTitle: 'JSON input',
  inputLabel: 'JSON to analyze',
  inputPlaceholder: 'Paste a JSON response here…',
  loadExample: 'Example',
  openFile: 'Open',
  format: 'Format',
  minify: 'Minify',
  clear: 'Clear',
  dropFile: 'Drop the .json file to open it',
  fileTooLarge: (name: string) => `“${name}” is larger than 50 MB.`,
  fileError: (name: string) => `“${name}” could not be read.`,
  inputValid: 'Valid JSON',
  structureTitle: 'Detected structure',
  structureEmpty: 'The structure detected will appear here when the JSON is valid.',
  structureNoFields: 'No fields',
  structureNoClasses: 'There are no objects in this JSON, so there are no classes to generate.',
  structureSummary: (classes: number, fields: number) =>
    `${classes === 1 ? '1 class' : `${classes} classes`} · ${fields === 1 ? '1 field' : `${fields} fields`}`,
  rootArray: 'list at the root',
  optional: 'optional',
  nullable: 'nullable',
  review: 'review',
  warningCount: (n: number) => (n === 1 ? '1 field to review' : `${n} fields to review`),
  warningText: (warning: SchemaWarning) =>
    warning.code === 'mixedTypes'
      ? `values of different types (${warning.counts!.map(([kind, count]) => `${kind} ×${count}`).join(', ')}), so it is left as any. Choose a type.`
      : warning.code === 'emptyArray'
        ? 'the array is always empty, so the type of its items is unknown. Choose a type.'
        : warning.code === 'emptyObject'
          ? 'the object is always empty, so it is left as a generic map. Choose a type if it has fields.'
          : 'it is always null, so its real type is unknown. Choose a type.',
  edit: 'Edit',
  editField: (key: string) => `Edit “${key}”`,
  includeField: (key: string) => `Include “${key}” in the code`,
  fieldIncluded: 'Included in the code: uncheck to leave it out',
  fieldExcluded: 'Left out of the code: check to include it',
  propertyName: 'Property name',
  fieldType: 'Type',
  detectedType: (type: string) => `${type} (detected)`,
  mapType: 'object (generic map)',
  classNameLabel: 'Class name',
  rootName: 'Root model name',
  resetEdits: 'Reset edits',
  expand: 'Expand',
  collapse: 'Collapse',
  optionLabel: (id: string) => ({ style: 'Style', library: 'Library', copyWith: 'copyWith' })[id] ?? id,
  noLibrary: 'none',
  propertyNaming: 'Property names',
  namingDefault: 'Language default',
  namingKeep: 'As in the JSON',
  multipleFiles: 'One file per class',
  files: 'Generated files',
  downloadZip: (n: number) => `Download .zip (${n} files)`,
  usageTitle: 'Usage example',
  namesChanged: (n: number) => (n === 1 ? '1 name changed' : `${n} names changed`),
  nameNote: (note: NameNote) =>
    `${note.key ? `${note.className}.${note.key}` : note.className} → ${note.name} (${note.reason === 'reserved' ? 'reserved word' : 'not a valid name'})`,
  detectFormats: 'Detect dates and UUIDs',
  mergeIdentical: 'Reuse classes with the same fields',
  outputTitle: 'Generated code',
  outputLabel: (language: string) => `Generated ${language} code`,
  outputEmpty: 'The generated code will appear here.',
  targetLanguage: 'Programming language',
  modelStyle: 'Model style',
  copy: 'Copy',
  copied: 'Copied',
  download: 'Download',
  errorPosition: (line: number, column: number) => `Line ${line}, column ${column}`,
  jsonEmpty: 'Paste a JSON response to start.',
  jsonError: (error: JsonErrorInfo) => {
    const after = error.key === undefined ? '' : ` after “${error.key}”`
    const found = describeFound(error.found)
    switch (error.code) {
      case 'empty':
        return 'Paste a JSON response to start.'
      case 'unexpectedEnd':
        return error.expected
          ? `The JSON ends too early: expected ${EXPECTED_EN[error.expected]}${after}.`
          : 'The JSON ends too early: a string is not closed.'
      case 'unexpectedCharacter':
        return `Expected ${EXPECTED_EN[error.expected ?? 'value']}${after}, found ${found}.${
          error.found === "'" ? ' JSON uses double quotes.' : error.found === '/' ? ' JSON does not allow comments.' : ''
        }`
      case 'trailingComma':
        return `Comma before ${found}${after}: remove it.`
      case 'invalidNumber':
        return 'Invalid number: JSON does not allow leading zeros or a dot without decimals.'
      case 'invalidEscape':
        return `Unknown escape sequence \\${error.found ?? ''}.`
      case 'controlCharacter':
        return 'Line break or tab inside a string: write it as \\n or \\t.'
      case 'trailingContent':
        return 'There is more text after the end of the JSON.'
      case 'tooDeep':
        return 'The JSON is nested too deep (more than 512 levels).'
    }
  },
}

export type Messages = typeof en

const es: Messages = {
  tagline: 'Convierte respuestas JSON de APIs en modelos tipados',
  introDescription:
    'Pega una respuesta JSON de una API (de Postman, del navegador o de un log), revisa y edita la estructura detectada, y obtén modelos listos para usar en Python, Java, TypeScript, C#, Kotlin, Dart, Swift, Go, PHP, Rust o Scala, o una definición en JSON Schema o Smithy.',
  privacyShort: 'Procesado en local',
  introCode: 'Código fuente',
  introAllTools: 'Todas las herramientas',
  downloadDesktop: 'Descargar para escritorio',
  downloadFor: (platform: string) => `Descargar para ${platform}`,
  otherPlatforms: 'Otras plataformas',
  otherArchitecture: (architecture: string) => `Versión ${architecture}`,
  downloadNote: 'Versión de escritorio para Windows, macOS y Linux. No está firmada, así que la primera vez el sistema mostrará un aviso.',
  howToOpen: 'Cómo abrirla',
  howToOpenUrl: 'https://github.com/RaulEstevezA/Api2Class/blob/main/desktop/README_es.md#abrirla-la-primera-vez',
  languageLabel: 'Idioma',
  themeLabel: 'Tema',
  workspaceTabs: 'Espacio de trabajo',
  tabs: { input: 'JSON', structure: 'Estructura', output: 'Código' },
  themes: { dark: 'Oscuro', light: 'Claro', system: 'Sistema' },
  license: 'Licencia MIT',
  sourceCode: 'Código fuente',
  inputTitle: 'Entrada JSON',
  inputLabel: 'JSON a analizar',
  inputPlaceholder: 'Pega aquí una respuesta JSON…',
  loadExample: 'Ejemplo',
  openFile: 'Abrir',
  format: 'Formatear',
  minify: 'Minificar',
  clear: 'Borrar',
  dropFile: 'Suelta el archivo .json para abrirlo',
  fileTooLarge: (name: string) => `“${name}” ocupa más de 50 MB.`,
  fileError: (name: string) => `No se ha podido leer “${name}”.`,
  inputValid: 'JSON válido',
  structureTitle: 'Estructura detectada',
  structureEmpty: 'La estructura detectada aparecerá aquí cuando el JSON sea válido.',
  structureNoFields: 'Sin campos',
  structureNoClasses: 'Este JSON no tiene objetos, así que no hay clases que generar.',
  structureSummary: (classes: number, fields: number) =>
    `${classes === 1 ? '1 clase' : `${classes} clases`} · ${fields === 1 ? '1 campo' : `${fields} campos`}`,
  rootArray: 'lista en la raíz',
  optional: 'opcional',
  nullable: 'nullable',
  review: 'revisar',
  warningCount: (n: number) => (n === 1 ? '1 campo para revisar' : `${n} campos para revisar`),
  warningText: (warning: SchemaWarning) =>
    warning.code === 'mixedTypes'
      ? `valores de tipos distintos (${warning.counts!.map(([kind, count]) => `${kind} ×${count}`).join(', ')}), así que queda como any. Elige un tipo.`
      : warning.code === 'emptyArray'
        ? 'el array siempre está vacío, así que no se sabe el tipo de sus elementos. Elige un tipo.'
        : warning.code === 'emptyObject'
          ? 'el objeto siempre está vacío, así que queda como mapa genérico. Elige un tipo si tiene campos.'
          : 'siempre es null, así que no se sabe su tipo real. Elige un tipo.',
  edit: 'Editar',
  editField: (key: string) => `Editar “${key}”`,
  includeField: (key: string) => `Incluir “${key}” en el código`,
  fieldIncluded: 'Incluido en el código: desmárcalo para quitarlo',
  fieldExcluded: 'Fuera del código: márcalo para incluirlo',
  propertyName: 'Nombre de la propiedad',
  fieldType: 'Tipo',
  detectedType: (type: string) => `${type} (detectado)`,
  mapType: 'object (mapa genérico)',
  classNameLabel: 'Nombre de la clase',
  rootName: 'Nombre del modelo raíz',
  resetEdits: 'Restablecer',
  expand: 'Desplegar',
  collapse: 'Plegar',
  optionLabel: (id: string) => ({ style: 'Estilo', library: 'Librería', copyWith: 'copyWith' })[id] ?? id,
  noLibrary: 'ninguna',
  propertyNaming: 'Nombres de propiedades',
  namingDefault: 'Por defecto del lenguaje',
  namingKeep: 'Como en el JSON',
  multipleFiles: 'Un archivo por clase',
  files: 'Archivos generados',
  downloadZip: (n: number) => `Descargar .zip (${n} archivos)`,
  usageTitle: 'Ejemplo de uso',
  namesChanged: (n: number) => (n === 1 ? '1 nombre cambiado' : `${n} nombres cambiados`),
  nameNote: (note: NameNote) =>
    `${note.key ? `${note.className}.${note.key}` : note.className} → ${note.name} (${note.reason === 'reserved' ? 'palabra reservada' : 'nombre no válido'})`,
  detectFormats: 'Detectar fechas y UUID',
  mergeIdentical: 'Reutilizar clases con los mismos campos',
  outputTitle: 'Código generado',
  outputLabel: (language: string) => `Código ${language} generado`,
  outputEmpty: 'El código generado aparecerá aquí.',
  targetLanguage: 'Lenguaje de programación',
  modelStyle: 'Estilo del modelo',
  copy: 'Copiar',
  copied: 'Copiado',
  download: 'Descargar',
  errorPosition: (line: number, column: number) => `Línea ${line}, columna ${column}`,
  jsonEmpty: 'Pega una respuesta JSON para empezar.',
  jsonError: (error: JsonErrorInfo) => {
    const after = error.key === undefined ? '' : ` después de “${error.key}”`
    const found = describeFound(error.found)
    switch (error.code) {
      case 'empty':
        return 'Pega una respuesta JSON para empezar.'
      case 'unexpectedEnd':
        return error.expected
          ? `El JSON termina antes de tiempo: se esperaba ${EXPECTED_ES[error.expected]}${after}.`
          : 'El JSON termina antes de tiempo: falta cerrar las comillas de un texto.'
      case 'unexpectedCharacter':
        return `Se esperaba ${EXPECTED_ES[error.expected ?? 'value']}${after}, pero hay ${found}.${
          error.found === "'"
            ? ' JSON usa comillas dobles.'
            : error.found === '/'
              ? ' JSON no admite comentarios.'
              : ''
        }`
      case 'trailingComma':
        return `Coma antes de ${found}${after}: quítala.`
      case 'invalidNumber':
        return 'Número no válido: JSON no admite ceros a la izquierda ni un punto sin decimales.'
      case 'invalidEscape':
        return `Secuencia de escape desconocida: \\${error.found ?? ''}.`
      case 'controlCharacter':
        return 'Salto de línea o tabulador dentro de un texto: escríbelo como \\n o \\t.'
      case 'trailingContent':
        return 'Hay más texto después del final del JSON.'
      case 'tooDeep':
        return 'El JSON tiene demasiados niveles (más de 512).'
    }
  },
}

export const messages = { en, es }
export type Language = keyof typeof messages
export const languages = Object.keys(messages) as Language[]
