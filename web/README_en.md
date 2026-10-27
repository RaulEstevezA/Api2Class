# Api2Class · Web

Web version of Api2Class. Everything happens in the browser: the JSON is not sent to any server.

**Try it online:** [raulesteveza.github.io/tools/Api2Class](https://raulesteveza.github.io/tools/Api2Class/)

What the tool does and its philosophy are in the [main README](../README_en.md). This one explains how it is built and how to run it.

## Technologies

| | What for |
|---|---|
| [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org) | Interface and language |
| [Vite](https://vite.dev) | Development server and build |
| [CodeMirror 6](https://codemirror.net) | JSON editor and generated code viewer |
| [Vitest](https://vitest.dev) | Tests |
| [oxlint](https://oxc.rs) | Static analysis |

The JSON is read with a parser of its own (`src/core/json.ts`) instead of `JSON.parse`: `JSON.parse` turns `29.0` into `29`, so it cannot tell a float field from an integer one, and its error messages change from one browser to another.

## Run locally

Requirements: Node.js 20.19+ or 22.12+.

```bash
cd web
npm install
npm run dev          # development server at http://localhost:5173
npm test             # unit tests (Vitest)
npm run test:watch   # tests in watch mode
npm run lint         # oxlint analysis
npm run build        # type check and build into dist/
npm run preview      # serves the build at http://localhost:4173/tools/Api2Class/
```

To try real API responses, create a `local-data/` folder anywhere in the repository: it is in `.gitignore`, so its contents are never committed.

## Structure

```
src/
  core/                 Logic without UI or React (each module with its test)
    json.ts             Strict JSON parser: errors with line and column, integers and floats apart
    analyze.ts          JSON → intermediate model (classes, types, optional, nullable)
    schema.ts           The intermediate model, the only input of the generators
    naming.ts           PascalCase / camelCase / snake_case, singular, valid identifiers
    generators/
      types.ts          Generator interface
      index.ts          List of available generators
      common.ts         Helpers shared by generators (valid and unique names)
      python/  java/  typescript/
  components/           React interface (one component per panel, with its CSS)
  i18n/                 English and Spanish texts
  hooks/                useStoredState: remembers options in the browser
  utils/                Downloads and the example JSON
```

`core/` does not depend on React: it is the part tested with the shared cases, and it will have its counterpart in the desktop version.

## Adding a language

1. Create `src/core/generators/<language>/<language>.ts` exporting a `Generator`: `id`, `label`, `styles` and `generate(schema, options)`, which returns the file name and the code.
2. Add it to the list in `src/core/generators/index.ts`.
3. Add its syntax highlighting in `src/components/GeneratedCodePanel.tsx`.
4. Add the expected output of each case in `shared/test-cases/generators/<case>/<language>-<style>.<ext>`. The tests fail while any case is missing.

A generator only reads the intermediate model (`Schema`), never the JSON, so it does not need to know how the JSON was analyzed.

## Tests

```bash
npm test
```

Most tests read their cases from [`shared/test-cases/`](../shared/README.md): JSON validation, analysis, names and, for each language, the exact code expected for each sample input. The expected Python files have been run with Python 3.12, the Java ones compiled with `javac` and the TypeScript ones checked with `tsc --strict`.

## Privacy

- There is no server and no API calls: the JSON is analyzed and the code generated in memory, and downloads are created in the browser.
- No analytics or cookies. The pasted JSON is not saved, not even in the browser; the only things kept in `localStorage` are preferences: interface language, programming language and style.

## Current limits

| | Limit | Reason |
|---|---|---|
| Nesting | 512 levels | Avoid exhausting the stack; API responses are far from it |
| Values of different types in a field | Typed `any` (`Object`, `unknown`) | Unions are not generated yet |
| Java | One file with every class, only the root one public | Downloading one file per class needs a .zip |

[Back to main README](../README_en.md)
