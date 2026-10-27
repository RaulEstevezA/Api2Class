# Api2Class · Web

Web version of Api2Class. Everything happens in the browser: the JSON is not sent to any server.

**Try it online:** [raulesteveza.github.io/tools/Api2Class](https://raulesteveza.github.io/tools/Api2Class/)

What the tool does and its philosophy are in the [main README](../README_en.md). This one explains how it is built and how to run it.

## Technologies

| | What for |
|---|---|
| [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org) | Interface and language |
| [Vite](https://vite.dev) | Development server and build |
| [CodeMirror 6](https://codemirror.net) | JSON editor and generated code viewer (each language's highlighting is loaded only when used) |
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
    json.ts             Strict JSON parser: errors with what was expected and where, integers and floats apart
    format.ts           Format and minify without changing any number or key
    analyze.ts          JSON → intermediate model: classes, types, formats, optional, nullable, shared classes
    schema.ts           The intermediate model, the only input of the generators
    edits.ts            User edits by path, applied on top of the detected model
    warnings.ts         Fields to review: mixed types, empty arrays and objects, only null
    naming.ts           PascalCase / camelCase / snake_case, singular, valid identifiers
    generators/
      types.ts          Generator interface, options and settings
      index.ts          List of available generators
      common.ts         Names valid in each language (createNames), shared by every generator
      python/ java/ typescript/ csharp/ kotlin/ dart/ swift/ go/ php/ rust/ scala/ jsonschema/ smithy/
  components/           React interface (one component per panel, with its CSS)
  i18n/                 English and Spanish texts
  hooks/                useStoredState: remembers preferences in the browser
  utils/                Downloads, .zip writer, syntax highlighting loader and the example JSON
```

`core/` does not depend on React: it is the part tested with the shared cases, and it will have its counterpart in the desktop version.

## Adding a language

1. Create `src/core/generators/<language>/<language>.ts` exporting a `Generator`: `id`, `label`, `options` (the style first), `supportsMultipleFiles` and `generate(schema, settings)`, which returns the files, a usage example and the names it had to change.
2. Decide names with `createNames` (reserved words, default convention, how to escape keywords) instead of converting keys by hand.
3. Add it to the list in `src/core/generators/index.ts` and its syntax highlighting in `src/utils/editorLanguages.ts`.
4. Add the expected output of each case and style in `shared/test-cases/generators/<case>/<language>-<style>.<ext>`. The tests fail while any is missing.

A generator only reads the intermediate model (`Schema`), never the JSON, so it does not need to know how the JSON was analyzed or edited.

## Tests

```bash
npm test
```

Around 300 tests. Most read their cases from [`shared/test-cases/`](../shared/README.md): JSON validation and formatting, analysis, edits, warnings, names and, for each language and style, the exact code expected for each sample input.

The expected code has also been run with each language's real tools, outside this repository:

| Language | Check |
|---|---|
| Python | Python 3.12 reads every input with `from_dict` / Pydantic 2.14 and writes it back unchanged |
| Java | Compiled and run with Jackson 2.18, Gson 2.11 and Lombok: every input round trips |
| TypeScript | `tsc --strict`; Zod 4.6 accepts every input |
| Dart | Dart 3.13 reads and writes back every input (plain class, with and without `copyWith`) |
| Swift | Compiled with Swift 6.4: every input is decoded and encoded back |
| PHP | PHP 8.3 with `strict_types`: every input round trips |
| Rust | serde 1 with Rust 1.88: every input round trips |
| JSON Schema | Every schema passes the 2020-12 metaschema and validates its input |
| C#, Kotlin, Go, Scala, Smithy | Not compiled yet (no toolchain on the development machine) |

## Privacy

- There is no server and no API calls: the JSON is analyzed and the code generated in memory, and downloads are created in the browser.
- No analytics or cookies. The pasted JSON and the edits are not saved, not even in the browser; the only things kept in `localStorage` are preferences: interface language, theme, programming language, options and naming.

## Current limits

| | Limit | Reason |
|---|---|---|
| Nesting | 512 levels | Avoid exhausting the stack; API responses are far from it |
| Values of different types in a field | Typed `any` (`Object`, `unknown`, `JsonElement`...) | Unions are not generated yet: the type can be chosen by hand |
| Dates in Kotlin, Rust, Go (dates without time) and Swift (dates without time) | Kept as strings | Their usual libraries need extra adapters or crates for them |
| Rust, Scala, JSON Schema, Smithy | One file | Several files would need a module layout that depends on the project |
| Scala | Fields keep the JSON keys | circe derives codecs from the field names |

[Back to main README](../README_en.md)
