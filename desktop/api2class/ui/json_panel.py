"""JSON input: editor, example, open, format, minify, clear, and the validation status."""

from pathlib import Path

from PySide6.QtCore import Qt, QTimer, Signal
from PySide6.QtWidgets import QFileDialog, QHBoxLayout, QLabel, QPushButton

from ..core.format import format_json, minify_json
from .code_view import CodeView
from .example import EXAMPLE_JSON
from .i18n import I18n
from .pane import Pane, section
from .session import Session

# Far above any API response; avoids freezing the window with a huge file opened by mistake
MAX_FILE_SIZE = 50 * 1024 * 1024


class JsonEditor(CodeView):
    """Editor that opens .json files dropped on it instead of inserting their path."""

    file_dropped = Signal(str)

    def dragEnterEvent(self, event) -> None:  # noqa: N802 (Qt's name)
        if event.mimeData().hasUrls():
            event.acceptProposedAction()
        else:
            super().dragEnterEvent(event)

    def dragMoveEvent(self, event) -> None:  # noqa: N802 (Qt's name)
        if event.mimeData().hasUrls():
            event.acceptProposedAction()
        else:
            super().dragMoveEvent(event)

    def dropEvent(self, event) -> None:  # noqa: N802 (Qt's name)
        urls = event.mimeData().urls()
        if urls and urls[0].isLocalFile():
            event.acceptProposedAction()
            self.file_dropped.emit(urls[0].toLocalFile())
        else:
            super().dropEvent(event)


class JsonPanel(Pane):
    def __init__(self, i18n: I18n, session: Session):
        super().__init__()
        self._i18n = i18n
        self._session = session
        self._file_error: str | None = None

        # Buttons on their own row, so the title is never cut
        toolbar = section()
        actions = QHBoxLayout(toolbar)
        actions.setContentsMargins(14, 0, 14, 10)
        actions.setSpacing(6)
        self._buttons = {}
        for name, action in (
            ("load_example", lambda: self.set_text(EXAMPLE_JSON)),
            ("open_file", self.choose_file),
            ("format", lambda: self._reformat(format_json)),
            ("minify", lambda: self._reformat(minify_json)),
            ("clear", lambda: self.set_text("")),
        ):
            button = QPushButton()
            button.clicked.connect(action)
            actions.addWidget(button)
            self._buttons[name] = button
        actions.addStretch()
        self.body.addWidget(toolbar)

        self.editor = JsonEditor("json")
        self.editor.file_dropped.connect(self.open_file)
        self.body.addWidget(self.editor)
        self.status = QLabel()
        self.status.setWordWrap(True)
        self.footer.addWidget(self.status, 1)

        # Large responses are analyzed once typing pauses, so the editor stays smooth
        self._timer = QTimer(self)
        self._timer.setSingleShot(True)
        self._timer.setInterval(150)
        self._timer.timeout.connect(lambda: session.set_text(self.editor.toPlainText()))
        self.editor.textChanged.connect(self._timer.start)

        session.changed.connect(self._sync)
        i18n.changed.connect(self._retranslate)
        self._retranslate()

    def set_text(self, text: str) -> None:
        self._file_error = None
        self.editor.setPlainText(text)
        self._timer.stop()
        self._session.set_text(text)

    def choose_file(self) -> None:
        path, _ = QFileDialog.getOpenFileName(self, self._i18n.t.open_dialog, "", self._i18n.t.json_files)
        if path:
            self.open_file(path)

    def open_file(self, path: str) -> None:
        """Read on this computer: the file is never uploaded anywhere."""
        file = Path(path)
        try:
            if file.stat().st_size > MAX_FILE_SIZE:
                self._show_file_error(self._i18n.t.file_too_large(file.name))
                return
            # utf-8-sig: a byte order mark from some editors is dropped
            self.set_text(file.read_text(encoding="utf-8-sig"))
        except (OSError, UnicodeDecodeError):
            self._show_file_error(self._i18n.t.file_error(file.name))

    def _show_file_error(self, message: str) -> None:
        self._file_error = message
        self._sync()

    def _reformat(self, write) -> None:
        if self._session.parsed.ok:
            self.set_text(write(self._session.parsed.value))

    def _retranslate(self) -> None:
        t = self._i18n.t
        self.title.setText(t.input_title)
        for name, button in self._buttons.items():
            button.setText(getattr(t, name))
        self.editor.setPlaceholderText(t.input_placeholder)
        self._sync()

    def _sync(self) -> None:
        t = self._i18n.t
        result = self._session.parsed
        self._buttons["format"].setEnabled(result.ok)
        self._buttons["minify"].setEnabled(result.ok)
        self._buttons["clear"].setEnabled(bool(self._session.text))
        error = result.error
        if self._file_error:
            self._set_status(self._file_error, "error")
        elif result.ok:
            self._set_status(t.input_valid, "success")
        elif error.code == "empty":
            self._set_status(t.json_empty, "muted")
        else:
            self._set_status(
                f"<b>{t.error_position(error.line, error.column)}</b> · {_escape(t.json_error(error))}", "error"
            )
        self.editor.highlight_error_line(error.line if error and error.code != "empty" else None)

    def _set_status(self, text: str, role: str) -> None:
        self.status.setTextFormat(Qt.TextFormat.RichText if "<b>" in text else Qt.TextFormat.PlainText)
        self.status.setText(text)
        self.status.setProperty("role", role)
        self.status.style().unpolish(self.status)
        self.status.style().polish(self.status)


def _escape(text: str) -> str:
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
