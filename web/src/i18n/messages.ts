import type { JsonErrorCode } from '../core/json.ts'

const en = {
  tagline: 'Turn JSON API responses into typed models',
  introDescription:
    'Paste a JSON response from an API (from Postman, the browser or a log), review the structure detected and get ready-to-use classes for Python, Java or TypeScript.',
  privacyShort: 'Processed locally',
  privacyNote: 'Processed locally in your browser. Your API data never leaves your device.',
  introCode: 'Source code',
  introAllTools: 'All tools',
  languageLabel: 'Language',
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
  anyHint: 'Values of different types were found here, so the type is left open (any). Check it.',
  nullHint: 'Only null was found here, so the real type cannot be known. Check it.',
  expand: 'Expand',
  collapse: 'Collapse',
  outputTitle: 'Generated code',
  outputLabel: (language: string) => `Generated ${language} code`,
  outputEmpty: 'The generated code will appear here.',
  targetLanguage: 'Programming language',
  modelStyle: 'Model style',
  copy: 'Copy',
  copied: 'Copied',
  download: 'Download',
  errorPosition: (line: number, column: number) => `Line ${line}, column ${column}`,
  jsonError: {
    empty: () => 'Paste a JSON response to start.',
    unexpectedEnd: () => 'The JSON ends too early: a bracket, brace or quote is not closed.',
    unexpectedCharacter: (found: string) =>
      found === "'"
        ? 'Unexpected single quote: JSON strings and keys use double quotes.'
        : found === '/'
          ? 'Unexpected /: JSON does not allow comments.'
          : `Unexpected ${found}: a comma, colon or quote may be missing.`,
    trailingComma: () => 'Comma before a closing bracket or brace: remove it.',
    invalidNumber: () => 'Invalid number: JSON does not allow leading zeros or a dot without decimals.',
    invalidEscape: () => 'Unknown escape sequence after \\.',
    controlCharacter: () => 'Line break or tab inside a string: write it as \\n or \\t.',
    trailingContent: () => 'There is more text after the end of the JSON.',
    tooDeep: () => 'The JSON is nested too deep (more than 512 levels).',
  } satisfies Record<JsonErrorCode, (found: string) => string>,
}

export type Messages = typeof en

const es: Messages = {
  tagline: 'Convierte respuestas JSON de APIs en modelos tipados',
  introDescription:
    'Pega una respuesta JSON de una API (de Postman, del navegador o de un log), revisa la estructura detectada y obtén clases listas para usar en Python, Java o TypeScript.',
  privacyShort: 'Procesado en local',
  privacyNote: 'Se procesa en tu navegador. Los datos de tu API no salen de tu dispositivo.',
  introCode: 'Código fuente',
  introAllTools: 'Todas las herramientas',
  languageLabel: 'Idioma',
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
  anyHint: 'Aquí hay valores de tipos distintos, así que el tipo queda abierto (any). Revísalo.',
  nullHint: 'Aquí solo aparece null, así que no se puede saber el tipo real. Revísalo.',
  expand: 'Desplegar',
  collapse: 'Plegar',
  outputTitle: 'Código generado',
  outputLabel: (language: string) => `Código ${language} generado`,
  outputEmpty: 'El código generado aparecerá aquí.',
  targetLanguage: 'Lenguaje de programación',
  modelStyle: 'Estilo del modelo',
  copy: 'Copiar',
  copied: 'Copiado',
  download: 'Descargar',
  errorPosition: (line: number, column: number) => `Línea ${line}, columna ${column}`,
  jsonError: {
    empty: () => 'Pega una respuesta JSON para empezar.',
    unexpectedEnd: () => 'El JSON termina antes de tiempo: falta cerrar un corchete, una llave o unas comillas.',
    unexpectedCharacter: (found: string) =>
      found === "'"
        ? 'Comilla simple inesperada: en JSON los textos y las claves van entre comillas dobles.'
        : found === '/'
          ? '/ inesperado: JSON no admite comentarios.'
          : `${found} inesperado: puede que falte una coma, dos puntos o unas comillas.`,
    trailingComma: () => 'Coma antes de cerrar un corchete o una llave: quítala.',
    invalidNumber: () => 'Número no válido: JSON no admite ceros a la izquierda ni un punto sin decimales.',
    invalidEscape: () => 'Secuencia de escape desconocida después de \\.',
    controlCharacter: () => 'Salto de línea o tabulador dentro de un texto: escríbelo como \\n o \\t.',
    trailingContent: () => 'Hay más texto después del final del JSON.',
    tooDeep: () => 'El JSON tiene demasiados niveles (más de 512).',
  },
}

export const messages = { en, es }
export type Language = keyof typeof messages
export const languages = Object.keys(messages) as Language[]
