"""What the window shows: the JSON, the model detected, the user's edits and the generated code.

Every change recomputes what depends on it and emits changed, so the three panels stay in sync. Only
preferences are stored (QSettings); the JSON and the edits stay in memory, as in the web version.
"""

import json

from PySide6.QtCore import QObject, QSettings, Signal

from ..core.analyze import analyze
from ..core.edits import Edits, apply_edits
from ..core.generators import find_generator
from ..core.generators.types import GeneratedCode, GenerateSettings, Generator
from ..core.json_parser import ParseResult, parse_json
from ..core.schema import Schema
from ..core.warnings import SchemaWarning, schema_warnings


class Session(QObject):
    changed = Signal()

    def __init__(self, settings: QSettings):
        super().__init__()
        self._settings = settings
        self.text = ""
        self.edits = Edits()
        self.detect_formats = _bool(settings.value("detectFormats", True))
        self.merge_identical = _bool(settings.value("mergeIdentical", True))
        self.generator_id: str = str(settings.value("generator", "python"))
        self.options: dict[str, dict[str, str]] = _json(settings.value("options", "{}"), {})
        self.naming = str(settings.value("naming", "default"))
        self.multiple_files = _bool(settings.value("multipleFiles", False))
        self.parsed: ParseResult = parse_json("")
        self.detected: Schema | None = None
        self.schema: Schema | None = None
        self.warnings: list[SchemaWarning] = []
        self.output: GeneratedCode | None = None
        self._recompute(parse=True)

    @property
    def generator(self) -> Generator:
        return find_generator(self.generator_id)

    @property
    def settings(self) -> GenerateSettings:
        generator = self.generator
        return GenerateSettings(
            dict(self.options.get(generator.id, {})),
            self.naming,
            self.multiple_files and generator.supports_multiple_files,
        )

    def set_text(self, text: str) -> None:
        if text == self.text:
            return
        self.text = text
        # Starting over: edits of the previous JSON would only get in the way
        if not text.strip():
            self.edits = Edits()
        self._recompute(parse=True)

    def set_edits(self, edits: Edits) -> None:
        self.edits = edits
        self._recompute()

    def set_analysis(self, detect_formats: bool, merge_identical: bool) -> None:
        self.detect_formats, self.merge_identical = detect_formats, merge_identical
        self._settings.setValue("detectFormats", detect_formats)
        self._settings.setValue("mergeIdentical", merge_identical)
        self._recompute(analyze_again=True)

    def set_generator(self, generator_id: str) -> None:
        self.generator_id = generator_id
        self._settings.setValue("generator", generator_id)
        self._recompute()

    def set_option(self, option_id: str, value: str) -> None:
        self.options.setdefault(self.generator_id, {})[option_id] = value
        self._settings.setValue("options", json.dumps(self.options))
        self._recompute()

    def set_naming(self, naming: str) -> None:
        self.naming = naming
        self._settings.setValue("naming", naming)
        self._recompute()

    def set_multiple_files(self, multiple: bool) -> None:
        self.multiple_files = multiple
        self._settings.setValue("multipleFiles", multiple)
        self._recompute()

    def _recompute(self, parse: bool = False, analyze_again: bool = False) -> None:
        if parse:
            self.parsed = parse_json(self.text)
        if parse or analyze_again:
            self.detected = (
                analyze(self.parsed.value, detect_formats=self.detect_formats, merge_identical=self.merge_identical)
                if self.parsed.ok
                else None
            )
        self.schema = apply_edits(self.detected, self.edits) if self.detected else None
        self.warnings = schema_warnings(self.schema) if self.schema else []
        self.output = self.generator.generate(self.schema, self.settings) if self.schema else None
        self.changed.emit()


def _bool(value) -> bool:
    # QSettings gives back "true" / "false" strings with the INI format
    return value in (True, "true", "1", 1)


def _json(value, default):
    try:
        result = json.loads(value)
        return result if isinstance(result, dict) else default
    except (TypeError, ValueError):
        return default
