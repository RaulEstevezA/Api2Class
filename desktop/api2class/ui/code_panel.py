"""Generated code: language and its options, property naming, one file per class, file tabs, usage
example, names changed, copy and save. Mirrors web/src/components/GeneratedCodePanel.tsx."""

import zipfile
from pathlib import Path

from PySide6.QtCore import QTimer
from PySide6.QtWidgets import (
    QApplication,
    QCheckBox,
    QComboBox,
    QFileDialog,
    QGridLayout,
    QLabel,
    QPlainTextEdit,
    QPushButton,
    QTabBar,
    QWidget,
)

from ..core.generators import GENERATORS
from ..core.generators.types import option_value
from .code_view import CodeView
from .highlighter import monospace_font
from .i18n import I18n
from .pane import Pane, section
from .paths import in_downloads
from .session import Session

NAMINGS = ["default", "camelCase", "snake_case", "PascalCase", "keep"]


class CodePanel(Pane):
    def __init__(self, i18n: I18n, session: Session):
        super().__init__()
        self._i18n = i18n
        self._session = session
        self._file_index = 0
        self.last_saved: str | None = None

        self.language = QComboBox()
        for generator in GENERATORS:
            self.language.addItem(generator.label, generator.id)
        self.language.activated.connect(lambda _=0: session.set_generator(self.language.currentData()))
        self.header.addWidget(self.language)

        settings = section()
        self._grid = QGridLayout(settings)
        self._grid.setContentsMargins(14, 0, 14, 8)
        self._grid.setHorizontalSpacing(10)
        self._option_widgets: list[QWidget] = []
        self.naming_label = QLabel()
        self.naming_label.setProperty("role", "muted")
        self.naming = QComboBox()
        self.naming.activated.connect(lambda _=0: session.set_naming(self.naming.currentData()))
        self.multiple = QCheckBox()
        self.multiple.toggled.connect(session.set_multiple_files)
        self.body.addWidget(settings)

        self.tabs = QTabBar()
        self.tabs.setExpanding(False)
        self.tabs.setDrawBase(False)
        self.tabs.currentChanged.connect(self._select_file)
        self.body.addWidget(self.tabs)
        self.code = CodeView(read_only=True)
        self.body.addWidget(self.code, 1)

        self.usage_toggle = QPushButton()
        self.usage_toggle.setProperty("link", True)
        self.usage_toggle.setCheckable(True)
        self.usage_toggle.toggled.connect(lambda shown: self.usage.setVisible(shown))
        usage_row = section()
        usage_layout = QGridLayout(usage_row)
        usage_layout.setContentsMargins(14, 6, 14, 6)
        usage_layout.addWidget(self.usage_toggle, 0, 0)
        self.usage = QPlainTextEdit()
        self.usage.setReadOnly(True)
        self.usage.setFont(monospace_font())
        self.usage.setMaximumHeight(130)
        self.usage.setVisible(False)
        usage_layout.addWidget(self.usage, 1, 0)
        self.body.addWidget(usage_row)

        self.file_name = QLabel()
        self.file_name.setProperty("role", "muted")
        self.file_name.setFont(monospace_font())
        self.notes = QLabel()
        self.notes.setProperty("role", "warning")
        self.copy_button = QPushButton()
        self.copy_button.clicked.connect(self.copy)
        self.save_button = QPushButton()
        self.save_button.setProperty("primary", True)
        self.save_button.clicked.connect(self.save)
        self.footer.addWidget(self.file_name)
        self.footer.addWidget(self.notes)
        self.footer.addStretch()
        self.footer.addWidget(self.copy_button)
        self.footer.addWidget(self.save_button)

        self._copied = QTimer(self)
        self._copied.setSingleShot(True)
        self._copied.setInterval(2000)
        self._copied.timeout.connect(self._retranslate)

        session.changed.connect(self._sync)
        i18n.changed.connect(self._retranslate)
        self._retranslate()

    @property
    def files(self):
        return self._session.output.files if self._session.output else []

    def copy(self) -> None:
        files = self.files
        if files:
            QApplication.clipboard().setText(files[min(self._file_index, len(files) - 1)].code)
            self.copy_button.setText(self._i18n.t.copied)
            self._copied.start()

    def save(self, path: str | None = None) -> None:
        """Saves the file, or a .zip with every file. path skips the dialog (tests)."""
        files = self.files
        if not files:
            return
        if len(files) == 1:
            target = path or QFileDialog.getSaveFileName(self, self._i18n.t.save, in_downloads(files[0].name))[0]
            if target:
                Path(target).write_text(files[0].code, encoding="utf-8")
        else:
            root = self._session.schema.classes[0].name if self._session.schema.classes else "models"
            default = f"{root}-{self._session.generator.id}.zip"
            target = (
                path or QFileDialog.getSaveFileName(self, self._i18n.t.save, in_downloads(default), "ZIP (*.zip)")[0]
            )
            if target:
                with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as archive:
                    for file in files:
                        archive.writestr(f"models/{file.name}", file.code)
        if target:
            self.last_saved = target
            self.notes.setText(self._i18n.t.saved(target))

    def _select_file(self, index: int) -> None:
        self._file_index = max(0, index)
        self._show_code()

    def _show_code(self) -> None:
        files = self.files
        file = files[min(self._file_index, len(files) - 1)] if files else None
        self.code.set_text_keeping_position(file.code if file else "")
        self.file_name.setText(file.name if file else "")

    def _retranslate(self) -> None:
        t = self._i18n.t
        self.title.setText(t.output_title)
        self.language.setToolTip(t.target_language)
        self.naming_label.setText(t.property_naming)
        self.naming.blockSignals(True)
        self.naming.clear()
        for naming in NAMINGS:
            label = t.naming_default if naming == "default" else t.naming_keep if naming == "keep" else naming
            self.naming.addItem(label, naming)
        self.naming.blockSignals(False)
        self.multiple.setText(t.multiple_files)
        self.usage_toggle.setText(t.usage_title)
        self.copy_button.setText(t.copy)
        self._sync()

    def _rebuild_options(self) -> None:
        session, t = self._session, self._i18n.t
        generator = session.generator
        style = option_value(generator.options, session.settings, "style")
        for widget in self._option_widgets:
            self._grid.removeWidget(widget)
            widget.deleteLater()
        self._option_widgets = []
        column = 0
        for option in generator.options:
            if option.styles and style not in option.styles:
                continue
            label = QLabel(t.option_label(option.id))
            label.setProperty("role", "muted")
            combo = QComboBox()
            for choice in option.choices:
                combo.addItem(t.no_library if choice.id == "none" else choice.label, choice.id)
            combo.setCurrentIndex(combo.findData(option_value(generator.options, session.settings, option.id)))
            combo.activated.connect(
                lambda _=0, option_id=option.id, combo=combo: session.set_option(option_id, combo.currentData())
            )
            self._grid.addWidget(label, 0, column)
            self._grid.addWidget(combo, 1, column)
            self._option_widgets += [label, combo]
            column += 1
        self._grid.addWidget(self.naming_label, 0, column)
        self._grid.addWidget(self.naming, 1, column)
        self._grid.addWidget(self.multiple, 2, 0, 1, column + 1)
        self._grid.setColumnStretch(column + 1, 1)
        self._options_for = (generator.id, style, self._i18n.language)

    def _sync(self) -> None:
        session, t = self._session, self._i18n.t
        generator = session.generator
        self.language.setCurrentIndex(self.language.findData(generator.id))
        style = option_value(generator.options, session.settings, "style")
        if getattr(self, "_options_for", None) != (generator.id, style, self._i18n.language):
            self._rebuild_options()
        self.naming.setCurrentIndex(self.naming.findData(session.naming))
        self.multiple.blockSignals(True)
        self.multiple.setChecked(session.multiple_files)
        self.multiple.blockSignals(False)
        self.multiple.setVisible(generator.supports_multiple_files)
        self.code.set_language(generator.id)

        files = self.files
        self.tabs.blockSignals(True)
        while self.tabs.count():
            self.tabs.removeTab(0)
        if len(files) > 1:
            for file in files:
                self.tabs.addTab(file.name)
            self.tabs.setCurrentIndex(min(self._file_index, len(files) - 1))
        else:
            self._file_index = 0
        self.tabs.blockSignals(False)
        self.tabs.setVisible(len(files) > 1)
        self._show_code()

        output = session.output
        usage = output.usage if output else None
        self.usage_toggle.setVisible(usage is not None)
        self.usage.setPlainText(usage or "")
        notes = output.notes if output else []
        self.notes.setText(t.names_changed(len(notes)) if notes else "")
        self.notes.setToolTip("\n".join(t.name_note(note) for note in notes))
        self.copy_button.setEnabled(bool(files))
        self.save_button.setEnabled(bool(files))
        self.save_button.setText(t.save_zip(len(files)) if len(files) > 1 else t.save)
