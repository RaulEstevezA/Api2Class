# Api2Class · Web

Versión web de Api2Class. Todo ocurre en el navegador: el JSON no se envía a ningún servidor.

**Pruébala online:** [raulesteveza.github.io/tools/Api2Class](https://raulesteveza.github.io/tools/Api2Class/)

Qué hace la herramienta y su filosofía están en el [README principal](../README_es.md). Aquí se explica cómo está construida y cómo ejecutarla.

## Tecnologías

| | Para qué |
|---|---|
| [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org) | Interfaz y lenguaje |
| [Vite](https://vite.dev) | Servidor de desarrollo y compilación |
| [CodeMirror 6](https://codemirror.net) | Editor del JSON y visor del código generado |
| [Vitest](https://vitest.dev) | Tests |
| [oxlint](https://oxc.rs) | Análisis estático |

El JSON se lee con un parser propio (`src/core/json.ts`) en lugar de `JSON.parse`: `JSON.parse` convierte `29.0` en `29`, así que no distingue un campo float de uno integer, y sus mensajes de error cambian de un navegador a otro.

## Ejecutar en local

Requisitos: Node.js 20.19+ o 22.12+.

```bash
cd web
npm install
npm run dev          # servidor de desarrollo en http://localhost:5173
npm test             # tests unitarios (Vitest)
npm run test:watch   # tests en modo observación
npm run lint         # análisis con oxlint
npm run build        # comprobación de tipos y compilación en dist/
npm run preview      # sirve la compilación en http://localhost:4173/tools/Api2Class/
```

Para probar con respuestas reales de APIs se puede crear una carpeta `local-data/` en cualquier parte del repositorio: está en el `.gitignore`, así que su contenido no se sube nunca.

## Estructura

```
src/
  core/                 Lógica sin interfaz ni React (cada módulo con su test)
    json.ts             Parser JSON estricto: errores con línea y columna, enteros y decimales separados
    analyze.ts          JSON → modelo intermedio (clases, tipos, opcionales, nullable)
    schema.ts           El modelo intermedio, la única entrada de los generadores
    naming.ts           PascalCase / camelCase / snake_case, singular, identificadores válidos
    generators/
      types.ts          Interfaz Generator
      index.ts          Lista de generadores disponibles
      common.ts         Utilidades comunes a los generadores (nombres válidos y sin repetir)
      python/  java/  typescript/
  components/           Interfaz React (un componente por panel, con su CSS)
  i18n/                 Textos en inglés y castellano
  hooks/                useStoredState: recuerda opciones en el navegador
  utils/                Descargas y el JSON de ejemplo
```

`core/` no depende de React: es la parte que se prueba con los casos compartidos y la que tendrá su equivalente en la versión de escritorio.

## Añadir un lenguaje

1. Crear `src/core/generators/<lenguaje>/<lenguaje>.ts` exportando un `Generator`: `id`, `label`, `styles` y `generate(schema, options)`, que devuelve el nombre del archivo y el código.
2. Añadirlo a la lista de `src/core/generators/index.ts`.
3. Añadir su resaltado de sintaxis en `src/components/GeneratedCodePanel.tsx`.
4. Añadir la salida esperada de cada caso en `shared/test-cases/generators/<caso>/<lenguaje>-<estilo>.<ext>`. Los tests fallan mientras falte alguno.

Un generador solo lee el modelo intermedio (`Schema`), nunca el JSON, así que no necesita saber cómo se ha analizado.

## Tests

```bash
npm test
```

La mayoría de los tests leen sus casos de [`shared/test-cases/`](../shared/README.md): validación del JSON, análisis, nombres y, para cada lenguaje, el código exacto esperado para cada entrada de ejemplo. Los archivos esperados de Python se han ejecutado con Python 3.12, los de Java se han compilado con `javac` y los de TypeScript se han comprobado con `tsc --strict`.

## Privacidad

- No hay servidor ni llamadas a APIs: el JSON se analiza y el código se genera en memoria, y las descargas se crean en el navegador.
- No hay analítica ni cookies. El JSON pegado no se guarda, ni siquiera en el navegador; lo único que se guarda en el `localStorage` son preferencias: idioma de la interfaz, lenguaje de programación y estilo.

## Límites actuales

| | Límite | Motivo |
|---|---|---|
| Anidamiento | 512 niveles | No agotar la pila; las respuestas de APIs quedan muy lejos |
| Valores de tipos distintos en un campo | Tipo `any` (`Object`, `unknown`) | Todavía no se generan uniones |
| Java | Un archivo con todas las clases, solo la raíz pública | Descargar un archivo por clase necesita un .zip |

[Volver al README principal](../README_es.md)
