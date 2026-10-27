# Api2Class

Tool that turns JSON API responses into classes and typed models **without sending the JSON to any server**.

**Try it online:** [raulesteveza.github.io/tools/Api2Class](https://raulesteveza.github.io/tools/Api2Class/)

<p align="center">
  <a href="https://raulesteveza.github.io/tools/Api2Class/">
    <img src="docs/images/web_app.png" alt="Api2Class web version turning a JSON response into TypeScript interfaces" width="720">
  </a>
</p>

## What it is for

When an application talks to an API, someone has to write the models that match its responses: one class per object, the right type for each field, lists, nested objects, fields that sometimes are not there... Doing it by hand is slow and easy to get wrong.

Api2Class does it from a real response:

```text
Paste the JSON  →  Review the structure detected  →  Choose language and style  →  Copy or download
```

```json
{
  "id": 15,
  "name": "Raul",
  "address": { "city": "Vinaros", "postal_code": "12500" },
  "orders": [{ "id": 101, "total": 29.95 }]
}
```

```text
Root
├── id: integer
├── name: string
├── address: Address
│   ├── city: string
│   └── postal_code: string
└── orders: Order[]
    ├── id: integer
    └── total: float
```

## Philosophy

- **The structure comes before the code.** The detected model is shown as a tree, so it is clear what was found before using the generated code.
- **Doubtful types are not guessed.** A field with values of different types is left open (`any`) and one that is only ever `null` stays `null`; both are flagged for review.
- **Data never leaves the device.** There is no server: the JSON is analyzed in the browser and the code is generated there. The pasted JSON is not saved anywhere, not even in the browser.

## What it does

### Read the JSON

- Strict validation, with the line and column of the error and a hint for the usual mistakes when copying a response: single quotes, comments, trailing commas, leading zeros.
- Numbers keep how they were written, so `29.0` is a float and `29` an integer.

### Detect the structure

| Detected | Example |
|---|---|
| Types | `string`, `integer`, `float`, `boolean`, `null`, objects and arrays |
| Nested objects | `address: {...}` → class `Address` |
| Arrays of objects, named in singular | `orders: [{...}]` → `Order[]`, `categories` → `Category` |
| Optional fields | Missing in some objects of an array |
| Nullable fields | `null` in some objects and a value in others |
| Integers and floats mixed | `float` |
| Values of different types | `any`, flagged for review |
| Repeated class names | `address` inside `company` → `CompanyAddress` |

### Generate the code

| Language | Style | Details |
|---|---|---|
| **Python** | dataclass | snake_case fields, `list[...]`, `\| None`; optional fields default to `None` |
| **Java** | POJO | Private fields with getters and setters, `Long` / `Double` / `Boolean`, `List<...>`, Jackson `@JsonProperty` when the name differs from the key |
| **TypeScript** | interface | Keys as in the JSON (quoted when needed), `?` for optional, `\| null` for nullable |

Names are made valid for each language: `class` → `class_`, `2fa` → `_2fa`, `Postal Code` → `postal_code` / `postalCode`. The code can be copied or downloaded as a file (`root.py`, `Root.java`, `Root.ts`).

### Coming next

Editing the model before generating (renaming classes and fields, changing types, marking fields optional, excluding fields), more styles (Pydantic, Java records, TypeScript types), C#, Dart and Kotlin, and the desktop version.

## Versions

| | Web | Desktop |
|---|---|---|
| Technology | React + TypeScript + Vite | Python + PySide6 |
| Runs in | The browser | Installable application (Windows, macOS, Linux) |
| Status | Published: [raulesteveza.github.io/tools/Api2Class](https://raulesteveza.github.io/tools/Api2Class/) | Planned |
| Documentation | [web/README_en.md](./web/README_en.md) | |

## Shared behavior

The two versions will be written separately (TypeScript and Python), but **they must behave the same**: the [`shared/`](./shared/README.md) folder contains the test cases that define what each part must do, from JSON validation to the exact code generated for each language. The web tests already read them; the desktop tests will read the same files.

## Repository structure

```
web/                     Web version (React + TypeScript + Vite)
  src/core/              Logic without UI: JSON parser, analysis, model, names, generators
  src/core/generators/   One folder per language
  src/components/        React interface
shared/                  Behavior common to both versions
  test-cases/            JSON test cases and expected generated code
docs/                    Images
```

## Suggestions

Ideas for improvements, bugs or a language you would like Api2Class to support: write to [contact.raulesteveza@gmail.com](mailto:contact.raulesteveza@gmail.com).

## Developer

**Raul Estevez**

- [Personal Website](https://raulesteveza.github.io/)
- [LinkedIn Profile](https://www.linkedin.com/in/raulesteveza/)

## License

[MIT](./LICENSE)

[Back to main README](./README.md)
