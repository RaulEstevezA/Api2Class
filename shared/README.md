# Shared

Language-neutral resources used by both the web (TypeScript) and desktop (Python) versions.

## test-cases/

Test cases that define the expected behavior of every feature available in both versions. The Vitest suite (`web/`) loads them, and the pytest suite (`desktop/`) will load the same files, so if one implementation behaves differently, its tests fail.

| File | What it checks |
|---|---|
| `json.json` | JSON validation: valid inputs (numbers as `integer:15` / `float:29.0`) and, for invalid ones, error code, line, column, what was expected and the last property read |
| `format.json` | Formatting and minifying keep numbers, escapes, key order and repeated keys |
| `naming.json` | Splitting keys into words, PascalCase / camelCase / snake_case, English singular, class names |
| `analyze.json` | The model detected for each input and option: classes in order, each field as `type`, `type \| null`, `type (optional)`; class ids (paths) and value counts |
| `edits.json` | Edits applied by path: renames, types, flags, exclusions and the classes left out |
| `warnings.json` | Fields to review: mixed types (with counts), empty arrays and objects, only null |
| `generators/<case>/` | `input.json` and the exact code expected for each language and style, named `<language>-<style>.<ext>` (`python-dataclass.py`, `java-record.java`...) with the other options at their default |

When adding a feature that exists in both versions, add its cases here first. When adding a language or a style, add its expected file to every case in `generators/`.

The expected generated code is real code: see the [web README](../web/README_en.md#tests) for how each language was checked.

## How it maps to each version

Shared logic lives in a `core/` folder in each version, with no UI dependencies:

- Web: `web/src/core/` (TypeScript)
- Desktop: `desktop/api2class/core/` (Python, planned)

A file in one `core/` has its counterpart in the other (e.g. `analyze.ts` / `analyze.py`), and both must pass the cases in `test-cases/`.

## Notes for the desktop version

- JSON: write the parser by hand as in `web/src/core/json.ts` instead of using `json.loads`, so the error codes, positions and context match. Columns count characters (code points), not bytes or UTF-16 units. `\uXXXX` escapes forming a surrogate pair (`😀`) must become one character.
- Analysis: keep the order of keys as they first appear, number classes level by level (breadth-first) and merge identical classes children first, as the web does.
- Warnings sort mixed types by count with a stable sort, so ties keep the order in which the types were first found.
