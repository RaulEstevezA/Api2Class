# Changelog

Notable changes to Api2Class, the web and the desktop version together. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and versions follow [Semantic Versioning](https://semver.org/). The web version is published on every change to `main`; desktop releases are tagged `v<version>` and published on [Releases](https://github.com/RaulEstevezA/Api2Class/releases).

## [Unreleased]

### Added

- Web: privacy-first traffic and page-view measurement with Cloudflare Web Analytics.
- Web: the interface opens in the language chosen on the portfolio.
- Web: **Open in Mapper** sends the generated classes to [Mapper](https://github.com/RaulEstevezA/Mapper). The button is hidden for now, until the integration has been tested further.

## [0.1.1] - 2026-10-27

### Changed

- Desktop: the language switcher is in the intro card, without a header line, as in the web version.
- Desktop: "Developed by Raúl Estévez" at the bottom, linking to the portfolio.

### Fixed

- Desktop: the two analysis options are one under the other, with more space between them, as in the web version.
- Web: the field's **Edit** button says **Close** while its editor is open, so it is clear that clicking it again closes it.

## [0.1.0] - 2026-10-27

First release: the web version and the desktop version for Windows, macOS and Linux.

### Added

- Analysis of a JSON response into an editable model: a strict parser that keeps integers and floats apart, dates, date-times (RFC 3339) and UUIDs detected, classes with the same fields reused, always-empty objects as generic maps, and errors that say what was expected and after which property.
- A structure tree to edit the detected model: include or leave out each field, change its name, type (including a generic map instead of a class), optional and nullable, and rename classes and the root model. Edits are kept while the JSON changes.
- Code for 11 languages, plus JSON Schema (draft 2020-12) and Smithy IDL 2.0:
  - Python: dataclass, Pydantic or plain class.
  - Java: POJO, record or Lombok, with Jackson, Gson or no annotations.
  - TypeScript: interface, type or Zod 4.
  - C#: class or record, with System.Text.Json or Newtonsoft.
  - Kotlin data classes with kotlinx.serialization, Gson or Moshi.
  - Dart with fromJson / toJson, json_serializable or freezed.
  - Swift Codable structs, Go structs with json tags, PHP 8.1 readonly classes, Rust structs with serde and Scala 3 case classes with circe.
- Naming conventions, English singulars and safe identifiers, with notes when a name changes; one file or one file per class, downloaded as a `.zip`, and a usage example for each language.
- Format and minify JSON, open or drop `.json` files.
- English and Spanish interface. The JSON is processed locally and never sent to a server.
- Web: JSON, Structure and Code tabs on narrow screens, and a card under the workspace with the desktop download for the visitor's system, the source code and the other tools.
- Desktop: the same core as the web version, checked against the same shared test cases (`shared/`), packaged with PyInstaller and released by GitHub Actions with an automatic start-up check.

[Unreleased]: https://github.com/RaulEstevezA/Api2Class/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/RaulEstevezA/Api2Class/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/RaulEstevezA/Api2Class/releases/tag/v0.1.0
