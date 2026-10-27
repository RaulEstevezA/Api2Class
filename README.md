# Api2Class

Client-side tool that turns JSON API responses into classes and typed models for 11 programming languages, JSON Schema and Smithy, **without sending the JSON to a server**.

**Try it online:** [raulesteveza.github.io/tools/Api2Class](https://raulesteveza.github.io/tools/Api2Class/)

- 🇬🇧 **English:** [Full documentation](./README_en.md)
- 🇪🇸 **Español:** [Documentación completa](./README_es.md)

<p align="center">
  <a href="https://raulesteveza.github.io/tools/Api2Class/">
    <img src="docs/images/web_app.png" alt="Api2Class web version: JSON input, editable detected structure and generated Kotlin code" width="720">
  </a>
</p>

## What is this repository?

Api2Class helps developers write the models for the JSON an API returns: paste a response (from Postman, the browser or a log), review and edit the structure detected, and copy or download the classes for Python, Java, TypeScript, C#, Kotlin, Dart, Swift, Go, PHP, Rust or Scala, or a JSON Schema or Smithy definition.

It is not just a JSON → code converter: between the JSON and the code there is an editable model that shows what was detected (which fields are optional, which can be null, which types are doubtful) and lets you rename, retype or exclude anything before generating.

The repository contains two versions of the same tool:

- **[Web](./web/README_en.md)**: React + TypeScript + Vite. Everything runs in the browser. Available at [raulesteveza.github.io/tools/Api2Class](https://raulesteveza.github.io/tools/Api2Class/).
- **[Desktop](./desktop/README_en.md)**: Python + PySide6. Installable app for Windows, macOS and Linux, with the same features and exactly the same generated code.

Both versions share their expected behavior through language-neutral test cases in [`shared/`](./shared/README.md).

## Suggestions

Ideas for improvements, bugs or a language you would like Api2Class to support: write to [contact.raulesteveza@gmail.com](mailto:contact.raulesteveza@gmail.com).

## Developer

**Raul Estevez**

- [Personal Website](https://raulesteveza.github.io/)
- [LinkedIn Profile](https://www.linkedin.com/in/raulesteveza/)

## License

[MIT](./LICENSE)
