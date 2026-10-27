import type { JsonErrorInfo, JsonExpected } from '../core/json.ts'
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
  warningCount: (n: number) => (n === 1 ? '1 field to review' : `${n} fields to review`),
  warningText: (warning: SchemaWarning) =>
    warning.code === 'mixedTypes'
      ? `values of different types (${warning.counts!.map(([kind, count]) => `${kind} ×${count}`).join(', ')}), so it is left as any. Choose a type.`
      : warning.code === 'emptyArray'
        ? 'the array is always empty, so the type of its items is unknown. Choose a type.'
        : 'it is always null, so its real type is unknown. Choose a type.',
  edit: 'Edit',
  editField: (key: string) => `Edit “${key}”`,
  includeField: (key: string) => `Include “${key}” in the code`,
  propertyName: 'Property name',
  fieldType: 'Type',
  detectedType: (type: string) => `${type} (detected)`,
  mapType: 'object (generic map)',
  classNameLabel: 'Class name',
  rootName: 'Root model name',
  resetEdits: 'Reset edits',
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
  warningCount: (n: number) => (n === 1 ? '1 campo para revisar' : `${n} campos para revisar`),
  warningText: (warning: SchemaWarning) =>
    warning.code === 'mixedTypes'
      ? `valores de tipos distintos (${warning.counts!.map(([kind, count]) => `${kind} ×${count}`).join(', ')}), así que queda como any. Elige un tipo.`
      : warning.code === 'emptyArray'
        ? 'el array siempre está vacío, así que no se sabe el tipo de sus elementos. Elige un tipo.'
        : 'siempre es null, así que no se sabe su tipo real. Elige un tipo.',
  edit: 'Editar',
  editField: (key: string) => `Editar “${key}”`,
  includeField: (key: string) => `Incluir “${key}” en el código`,
  propertyName: 'Nombre de la propiedad',
  fieldType: 'Tipo',
  detectedType: (type: string) => `${type} (detectado)`,
  mapType: 'object (mapa genérico)',
  classNameLabel: 'Nombre de la clase',
  rootName: 'Nombre del modelo raíz',
  resetEdits: 'Restablecer',
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
