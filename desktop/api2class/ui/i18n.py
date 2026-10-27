"""English and Spanish texts. Mirrors web/src/i18n/messages.ts for the texts both versions share."""

from collections.abc import Callable
from dataclasses import dataclass

from PySide6.QtCore import QObject, QSettings, Signal

from ..core.generators.types import NameNote
from ..core.json_parser import JsonErrorInfo
from ..core.warnings import SchemaWarning


def _plural(n: int, one: str, many: str) -> str:
    return one if n == 1 else many.format(n=n)


def _found(found: str | None) -> str:
    """The character found, readable even when it is invisible (a line break, a tab)."""
    if found is None:
        return ""
    import json

    escaped = json.dumps(found, ensure_ascii=False)[1:-1]
    return f"“{escaped or found}”"


@dataclass(frozen=True)
class Messages:
    tagline: str
    intro_description: str
    privacy_short: str
    language_label: str
    input_title: str
    input_placeholder: str
    load_example: str
    open_file: str
    format: str
    minify: str
    clear: str
    open_dialog: str
    json_files: str
    file_too_large: Callable[[str], str]
    file_error: Callable[[str], str]
    input_valid: str
    json_empty: str
    error_position: Callable[[int, int], str]
    json_error: Callable[[JsonErrorInfo], str]
    structure_title: str
    structure_empty: str
    structure_no_classes: str
    structure_summary: Callable[[int, int], str]
    root_name: str
    root_array: str
    optional: str
    nullable: str
    review: str
    warning_count: Callable[[int], str]
    warning_text: Callable[[SchemaWarning], str]
    field_included: str
    field_excluded: str
    edit_hint: str
    edit_title: Callable[[str], str]
    property_name: str
    field_type: str
    detected_type: Callable[[str], str]
    map_type: str
    class_name_label: str
    reset_edits: str
    detect_formats: str
    merge_identical: str
    column_field: str
    column_type: str
    output_title: str
    target_language: str
    option_label: Callable[[str], str]
    no_library: str
    property_naming: str
    naming_default: str
    naming_keep: str
    multiple_files: str
    usage_title: str
    names_changed: Callable[[int], str]
    name_note: Callable[[NameNote], str]
    copy: str
    copied: str
    save: str
    save_zip: Callable[[int], str]
    saved: Callable[[str], str]


_EXPECTED_EN = {
    "value": "a value",
    "key": "a property name in double quotes",
    "colon": "“:”",
    "commaOrBrace": "“,” or “}”",
    "commaOrBracket": "“,” or “]”",
}

_EXPECTED_ES = {
    "value": "un valor",
    "key": "un nombre de propiedad entre comillas dobles",
    "colon": "“:”",
    "commaOrBrace": "“,” o “}”",
    "commaOrBracket": "“,” o “]”",
}


def _json_error_en(error: JsonErrorInfo) -> str:
    after = "" if error.key is None else f" after “{error.key}”"
    found = _found(error.found)
    code = error.code
    if code == "empty":
        return "Paste a JSON response to start."
    if code == "unexpectedEnd":
        if error.expected:
            return f"The JSON ends too early: expected {_EXPECTED_EN[error.expected]}{after}."
        return "The JSON ends too early: a string is not closed."
    if code == "unexpectedCharacter":
        hint = (
            " JSON uses double quotes."
            if error.found == "'"
            else " JSON does not allow comments."
            if error.found == "/"
            else ""
        )
        return f"Expected {_EXPECTED_EN[error.expected or 'value']}{after}, found {found}.{hint}"
    if code == "trailingComma":
        return f"Comma before {found}{after}: remove it."
    if code == "invalidNumber":
        return "Invalid number: JSON does not allow leading zeros or a dot without decimals."
    if code == "invalidEscape":
        return f"Unknown escape sequence \\{error.found or ''}."
    if code == "controlCharacter":
        return "Line break or tab inside a string: write it as \\n or \\t."
    if code == "trailingContent":
        return "There is more text after the end of the JSON."
    return "The JSON is nested too deep (more than 512 levels)."


def _json_error_es(error: JsonErrorInfo) -> str:
    after = "" if error.key is None else f" después de “{error.key}”"
    found = _found(error.found)
    code = error.code
    if code == "empty":
        return "Pega una respuesta JSON para empezar."
    if code == "unexpectedEnd":
        if error.expected:
            return f"El JSON termina antes de tiempo: se esperaba {_EXPECTED_ES[error.expected]}{after}."
        return "El JSON termina antes de tiempo: falta cerrar las comillas de un texto."
    if code == "unexpectedCharacter":
        hint = (
            " JSON usa comillas dobles."
            if error.found == "'"
            else " JSON no admite comentarios."
            if error.found == "/"
            else ""
        )
        return f"Se esperaba {_EXPECTED_ES[error.expected or 'value']}{after}, pero hay {found}.{hint}"
    if code == "trailingComma":
        return f"Coma antes de {found}{after}: quítala."
    if code == "invalidNumber":
        return "Número no válido: JSON no admite ceros a la izquierda ni un punto sin decimales."
    if code == "invalidEscape":
        return f"Secuencia de escape desconocida: \\{error.found or ''}."
    if code == "controlCharacter":
        return "Salto de línea o tabulador dentro de un texto: escríbelo como \\n o \\t."
    if code == "trailingContent":
        return "Hay más texto después del final del JSON."
    return "El JSON tiene demasiados niveles (más de 512)."


def _counts(warning: SchemaWarning) -> str:
    return ", ".join(f"{kind} ×{count}" for kind, count in warning.counts or [])


def _warning_en(warning: SchemaWarning) -> str:
    return {
        "mixedTypes": f"values of different types ({_counts(warning)}), so it is left as any. Choose a type.",
        "emptyArray": "the array is always empty, so the type of its items is unknown. Choose a type.",
        "emptyObject": "the object is always empty, so it is left as a generic map. Choose a type if it has fields.",
    }.get(warning.code, "it is always null, so its real type is unknown. Choose a type.")


def _warning_es(warning: SchemaWarning) -> str:
    return {
        "mixedTypes": f"valores de tipos distintos ({_counts(warning)}), así que queda como any. Elige un tipo.",
        "emptyArray": "el array siempre está vacío, así que no se sabe el tipo de sus elementos. Elige un tipo.",
        "emptyObject": "el objeto siempre está vacío, así que queda como mapa genérico. Elige un tipo si tiene campos.",
    }.get(warning.code, "siempre es null, así que no se sabe su tipo real. Elige un tipo.")


def _note(note: NameNote, reserved: str, invalid: str) -> str:
    where = f"{note.class_name}.{note.key}" if note.key else note.class_name
    return f"{where} → {note.name} ({reserved if note.reason == 'reserved' else invalid})"


EN = Messages(
    tagline="Turn JSON API responses into typed models",
    intro_description=(
        "Paste a JSON response from an API (from Postman, the browser or a log), review and edit the structure "
        "detected, and get ready-to-use models for Python, Java, TypeScript, C#, Kotlin, Dart, Swift, Go, PHP, Rust "
        "or Scala, or a JSON Schema or Smithy definition."
    ),
    privacy_short="Processed locally",
    language_label="Language",
    input_title="JSON INPUT",
    input_placeholder="Paste a JSON response here, or drop a .json file…",
    load_example="Example",
    open_file="Open",
    format="Format",
    minify="Minify",
    clear="Clear",
    open_dialog="Open JSON file",
    json_files="JSON files (*.json);;All files (*)",
    file_too_large=lambda name: f"“{name}” is larger than 50 MB.",
    file_error=lambda name: f"“{name}” could not be read.",
    input_valid="Valid JSON",
    json_empty="Paste a JSON response to start.",
    error_position=lambda line, column: f"Line {line}, column {column}",
    json_error=_json_error_en,
    structure_title="DETECTED STRUCTURE",
    structure_empty="The structure detected will appear here when the JSON is valid.",
    structure_no_classes="There are no objects in this JSON, so there are no classes to generate.",
    structure_summary=lambda classes, fields: (
        f"{_plural(classes, '1 class', '{n} classes')} · {_plural(fields, '1 field', '{n} fields')}"
    ),
    root_name="Root model name",
    root_array="list at the root",
    optional="optional",
    nullable="nullable",
    review="review",
    warning_count=lambda n: _plural(n, "1 field to review", "{n} fields to review"),
    warning_text=_warning_en,
    field_included="Included in the code: uncheck to leave it out",
    field_excluded="Left out of the code: check to include it",
    edit_hint="Select a field to edit its name, type, optional and nullable.",
    edit_title=lambda key: f"Edit “{key}”",
    property_name="Property name",
    field_type="Type",
    detected_type=lambda type_name: f"{type_name} (detected)",
    map_type="object (generic map)",
    class_name_label="Class name",
    reset_edits="Reset edits",
    detect_formats="Detect dates and UUIDs",
    merge_identical="Reuse classes with the same fields",
    column_field="Field",
    column_type="Type",
    output_title="GENERATED CODE",
    target_language="Programming language",
    option_label=lambda option_id: {"style": "Style", "library": "Library", "copyWith": "copyWith"}.get(
        option_id, option_id
    ),
    no_library="none",
    property_naming="Property names",
    naming_default="Language default",
    naming_keep="As in the JSON",
    multiple_files="One file per class",
    usage_title="Usage example",
    names_changed=lambda n: _plural(n, "1 name changed", "{n} names changed"),
    name_note=lambda note: _note(note, "reserved word", "not a valid name"),
    copy="Copy",
    copied="Copied",
    save="Save",
    save_zip=lambda n: f"Save .zip ({n} files)",
    saved=lambda path: f"Saved in {path}",
)

ES = Messages(
    tagline="Convierte respuestas JSON de APIs en modelos tipados",
    intro_description=(
        "Pega una respuesta JSON de una API (de Postman, del navegador o de un log), revisa y edita la estructura "
        "detectada, y obtén modelos listos para usar en Python, Java, TypeScript, C#, Kotlin, Dart, Swift, Go, PHP, "
        "Rust o Scala, o una definición en JSON Schema o Smithy."
    ),
    privacy_short="Procesado en local",
    language_label="Idioma",
    input_title="ENTRADA JSON",
    input_placeholder="Pega aquí una respuesta JSON, o suelta un archivo .json…",
    load_example="Ejemplo",
    open_file="Abrir",
    format="Formatear",
    minify="Minificar",
    clear="Borrar",
    open_dialog="Abrir archivo JSON",
    json_files="Archivos JSON (*.json);;Todos los archivos (*)",
    file_too_large=lambda name: f"“{name}” ocupa más de 50 MB.",
    file_error=lambda name: f"No se ha podido leer “{name}”.",
    input_valid="JSON válido",
    json_empty="Pega una respuesta JSON para empezar.",
    error_position=lambda line, column: f"Línea {line}, columna {column}",
    json_error=_json_error_es,
    structure_title="ESTRUCTURA DETECTADA",
    structure_empty="La estructura detectada aparecerá aquí cuando el JSON sea válido.",
    structure_no_classes="Este JSON no tiene objetos, así que no hay clases que generar.",
    structure_summary=lambda classes, fields: (
        f"{_plural(classes, '1 clase', '{n} clases')} · {_plural(fields, '1 campo', '{n} campos')}"
    ),
    root_name="Nombre del modelo raíz",
    root_array="lista en la raíz",
    optional="opcional",
    nullable="nullable",
    review="revisar",
    warning_count=lambda n: _plural(n, "1 campo para revisar", "{n} campos para revisar"),
    warning_text=_warning_es,
    field_included="Incluido en el código: desmárcalo para quitarlo",
    field_excluded="Fuera del código: márcalo para incluirlo",
    edit_hint="Selecciona un campo para editar su nombre, tipo, opcional y nullable.",
    edit_title=lambda key: f"Editar “{key}”",
    property_name="Nombre de la propiedad",
    field_type="Tipo",
    detected_type=lambda type_name: f"{type_name} (detectado)",
    map_type="object (mapa genérico)",
    class_name_label="Nombre de la clase",
    reset_edits="Restablecer",
    detect_formats="Detectar fechas y UUID",
    merge_identical="Reutilizar clases con los mismos campos",
    column_field="Campo",
    column_type="Tipo",
    output_title="CÓDIGO GENERADO",
    target_language="Lenguaje de programación",
    option_label=lambda option_id: {"style": "Estilo", "library": "Librería", "copyWith": "copyWith"}.get(
        option_id, option_id
    ),
    no_library="ninguna",
    property_naming="Nombres de propiedades",
    naming_default="Por defecto del lenguaje",
    naming_keep="Como en el JSON",
    multiple_files="Un archivo por clase",
    usage_title="Ejemplo de uso",
    names_changed=lambda n: _plural(n, "1 nombre cambiado", "{n} nombres cambiados"),
    name_note=lambda note: _note(note, "palabra reservada", "nombre no válido"),
    copy="Copiar",
    copied="Copiado",
    save="Guardar",
    save_zip=lambda n: f"Guardar .zip ({n} archivos)",
    saved=lambda path: f"Guardado en {path}",
)

MESSAGES = {"en": EN, "es": ES}


class I18n(QObject):
    """The current language, remembered in the settings. Widgets listen to changed to update their texts."""

    changed = Signal()

    def __init__(self, settings: QSettings):
        super().__init__()
        self._settings = settings
        stored = settings.value("language")
        if stored not in MESSAGES:
            from PySide6.QtCore import QLocale

            stored = "es" if QLocale.system().name().startswith("es") else "en"
        self.language: str = stored

    @property
    def t(self) -> Messages:
        return MESSAGES[self.language]

    def set_language(self, language: str) -> None:
        if language == self.language:
            return
        self.language = language
        self._settings.setValue("language", language)
        self.changed.emit()
