# Api2Class

Client-side tool that turns JSON API responses into classes and typed models for several programming languages, **without sending the JSON to a server**.

**Try it online:** [raulesteveza.github.io/tools/Api2Class](https://raulesteveza.github.io/tools/Api2Class/)

- 🇬🇧 **English:** [Full documentation](./README_en.md)
- 🇪🇸 **Español:** [Documentación completa](./README_es.md)

<p align="center">
  <a href="https://raulesteveza.github.io/tools/Api2Class/">
    <img src="docs/images/web_app.png" alt="Api2Class web version turning a JSON response into TypeScript interfaces" width="720">
  </a>
</p>

## What is this repository?

Api2Class helps developers write the models for the JSON an API returns: paste a response (from Postman, the browser or a log), review the structure detected, and copy or download the classes for Python, Java or TypeScript.

It is not just a JSON → code converter: between the JSON and the code there is a model that shows what was detected (which fields are optional, which can be null, which types are doubtful), so the result can be checked before it is used.

The repository contains two versions of the same tool:

- **[Web](./web/README_en.md)**: React + TypeScript + Vite. Everything runs in the browser. Available at [raulesteveza.github.io/tools/Api2Class](https://raulesteveza.github.io/tools/Api2Class/).
- **Desktop**: Python + PySide6. Planned.

Both versions will share their expected behavior through language-neutral test cases in [`shared/`](./shared/README.md).

## Suggestions

Ideas for improvements, bugs or a language you would like Api2Class to support: write to [contact.raulesteveza@gmail.com](mailto:contact.raulesteveza@gmail.com).

## Developer

**Raul Estevez**

- [Personal Website](https://raulesteveza.github.io/)
- [LinkedIn Profile](https://www.linkedin.com/in/raulesteveza/)

## License

[MIT](./LICENSE)
