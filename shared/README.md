# Shared

Language-neutral resources used by both the web (TypeScript) and desktop (Python) versions.

## test-cases/

Test cases that define the expected behavior of every feature available in both versions. The Vitest suite (`web/`) loads them, and the pytest suite (`desktop/`) will load the same files, so if one implementation behaves differently, its tests fail.

| File | What it checks |
|---|---|
| `json.json` | JSON validation: valid inputs (numbers as `integer:15` / `float:29.0`) and error code, line and column for invalid ones |
| `naming.json` | Splitting keys into words, PascalCase / camelCase / snake_case, English singular, class names |
| `analyze.json` | The model detected for each input: classes in order, and each field as `type`, `type \| null`, `type (optional)` |
| `generators/<case>/` | `input.json` and the exact code expected for each language and style: `python-dataclass.py`, `java-pojo.java`, `typescript-interface.ts` |

When adding a feature that exists in both versions, add its cases here first. When adding a language or a style, add its expected file to every case in `generators/`.

The expected generated code is real code: the Python files run with Python 3.11+, the Java ones compile with `javac` (with Jackson's `@JsonProperty` on the classpath) and the TypeScript ones pass `tsc --strict`.

## How it maps to each version

Shared logic lives in a `core/` folder in each version, with no UI dependencies:

- Web: `web/src/core/` (TypeScript)
- Desktop: `desktop/api2class/core/` (Python, planned)

A file in one `core/` has its counterpart in the other (e.g. `analyze.ts` / `analyze.py`), and both must pass the cases in `test-cases/`.

## Notes for the desktop version

- JSON: write the parser by hand as in `web/src/core/json.ts` instead of using `json.loads`, so the error codes and positions match. Columns count characters (code points), not bytes or UTF-16 units. `\uXXXX` escapes forming a surrogate pair (`😀`) must become one character.
- Analysis: keep the order of keys as they first appear, and number classes level by level (breadth-first), as the web does.
