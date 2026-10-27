# Api2Class · Web

Versión web de Api2Class. Todo ocurre en el navegador: el JSON no se envía a ningún servidor.

**Pruébala online:** [raulesteveza.github.io/tools/Api2Class](https://raulesteveza.github.io/tools/Api2Class/)

Qué hace la herramienta y su filosofía están en el [README principal](../README_es.md). Aquí se explica cómo está construida y cómo ejecutarla.

## Tecnologías

| | Para qué |
|---|---|
| [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org) | Interfaz y lenguaje |
| [Vite](https://vite.dev) | Servidor de desarrollo y compilación |
| [CodeMirror 6](https://codemirror.net) | Editor del JSON y visor del código generado (el resaltado de cada lenguaje se carga solo cuando se usa) |
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
    json.ts             Parser JSON estricto: errores con qué se esperaba y dónde, enteros y decimales separados
    format.ts           Formatear y minificar sin cambiar ningún número ni clave
    analyze.ts          JSON → modelo intermedio: clases, tipos, formatos, opcionales, nullable, clases compartidas
    schema.ts           El modelo intermedio, la única entrada de los generadores
    edits.ts            Ediciones del usuario por ruta, aplicadas sobre el modelo detectado
    warnings.ts         Campos para revisar: tipos mezclados, arrays y objetos vacíos, solo null
    naming.ts           PascalCase / camelCase / snake_case, singular, identificadores válidos
    generators/
      types.ts          Interfaz Generator, opciones y ajustes
      index.ts          Lista de generadores disponibles
      common.ts         Nombres válidos en cada lenguaje (createNames), comunes a todos los generadores
      python/ java/ typescript/ csharp/ kotlin/ dart/ swift/ go/ php/ rust/ scala/ jsonschema/ smithy/
  components/           Interfaz React (un componente por panel, con su CSS)
  i18n/                 Textos en inglés y castellano
  hooks/                useStoredState: recuerda las preferencias en el navegador
  utils/                Descargas, creación de .zip, carga del resaltado de sintaxis y el JSON de ejemplo
```

`core/` no depende de React: es la parte que se prueba con los casos compartidos y la que tiene su equivalente en `desktop/api2class/core/`.

## Añadir un lenguaje

1. Crear `src/core/generators/<lenguaje>/<lenguaje>.ts` exportando un `Generator`: `id`, `label`, `options` (el estilo primero), `supportsMultipleFiles` y `generate(schema, settings)`, que devuelve los archivos, un ejemplo de uso y los nombres que ha tenido que cambiar.
2. Decidir los nombres con `createNames` (palabras reservadas, convención por defecto, cómo escapar las palabras clave) en lugar de convertir las claves a mano.
3. Añadirlo a la lista de `src/core/generators/index.ts` y su resaltado de sintaxis en `src/utils/editorLanguages.ts`.
4. Añadir la salida esperada de cada caso y estilo en `shared/test-cases/generators/<caso>/<lenguaje>-<estilo>.<ext>`. Los tests fallan mientras falte alguna.

Un generador solo lee el modelo intermedio (`Schema`), nunca el JSON, así que no necesita saber cómo se ha analizado ni editado.

## Tests

```bash
npm test
```

Unos 300 tests. La mayoría leen sus casos de [`shared/test-cases/`](../shared/README.md): validación y formato del JSON, análisis, ediciones, avisos, nombres y, para cada lenguaje y estilo, el código exacto esperado para cada entrada de ejemplo.

El código esperado también se ha ejecutado con las herramientas reales de cada lenguaje, fuera de este repositorio:

| Lenguaje | Comprobación |
|---|---|
| Python | Python 3.12 lee cada entrada con `from_dict` / Pydantic 2.14 y la vuelve a escribir sin cambios |
| Java | Compilado y ejecutado con Jackson 2.18, Gson 2.11 y Lombok: cada entrada hace el viaje de ida y vuelta |
| TypeScript | `tsc --strict`; Zod 4.6 acepta cada entrada |
| Dart | Dart 3.13 lee y vuelve a escribir cada entrada (clase normal, con y sin `copyWith`) |
| Swift | Compilado con Swift 6.4: cada entrada se decodifica y se vuelve a codificar |
| PHP | PHP 8.3 con `strict_types`: cada entrada hace el viaje de ida y vuelta |
| Rust | serde 1 con Rust 1.88: cada entrada hace el viaje de ida y vuelta |
| JSON Schema | Cada esquema pasa el metaesquema 2020-12 y valida su entrada |
| C#, Kotlin, Go, Scala, Smithy | Todavía sin compilar (no hay compilador en el equipo de desarrollo) |

## Privacidad

- No hay servidor ni llamadas a APIs: el JSON se analiza y el código se genera en memoria, y las descargas se crean en el navegador.
- No hay analítica ni cookies. Ni el JSON pegado ni las ediciones se guardan, ni siquiera en el navegador; lo único que se guarda en el `localStorage` son preferencias: idioma de la interfaz, tema, lenguaje de programación, opciones y nombres.

## Límites actuales

| | Límite | Motivo |
|---|---|---|
| Anidamiento | 512 niveles | No agotar la pila; las respuestas de APIs quedan muy lejos |
| Valores de tipos distintos en un campo | Tipo `any` (`Object`, `unknown`, `JsonElement`...) | Todavía no se generan uniones: el tipo se puede elegir a mano |
| Fechas en Kotlin, Rust, Go (fechas sin hora) y Swift (fechas sin hora) | Se quedan como texto | Sus librerías habituales necesitan adaptadores o crates aparte |
| Rust, Scala, JSON Schema, Smithy | Un archivo | Varios archivos necesitarían una estructura de módulos que depende del proyecto |
| Scala | Los campos conservan las claves del JSON | circe deriva los codecs de los nombres de los campos |

[Volver al README principal](../README_es.md)
