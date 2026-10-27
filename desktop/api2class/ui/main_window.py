"""Main window: header with the language switcher, the intro card and the three panels. Unlike the web
version, it has no links: the app works on its own, without going online."""

from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QButtonGroup,
    QFrame,
    QHBoxLayout,
    QLabel,
    QMainWindow,
    QPushButton,
    QSplitter,
    QVBoxLayout,
    QWidget,
)

from .code_panel import CodePanel
from .i18n import MESSAGES, I18n
from .json_panel import JsonPanel
from .session import Session
from .structure_panel import StructurePanel


class LanguageSwitcher(QWidget):
    def __init__(self, i18n: I18n):
        super().__init__()
        layout = QHBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(4)
        group = QButtonGroup(self)
        self._buttons = {}
        for code in MESSAGES:
            button = QPushButton(code.upper())
            button.setProperty("lang", True)
            button.setCheckable(True)
            button.clicked.connect(lambda _=False, code=code: i18n.set_language(code))
            group.addButton(button)
            layout.addWidget(button)
            self._buttons[code] = button
        self._i18n = i18n
        i18n.changed.connect(self._sync)
        self._sync()

    def _sync(self) -> None:
        self._buttons[self._i18n.language].setChecked(True)


class MainWindow(QMainWindow):
    def __init__(self, i18n: I18n, session: Session):
        super().__init__()
        self._i18n = i18n
        self.session = session
        self.setWindowTitle("Api2Class")
        self.resize(1440, 900)

        central = QWidget()
        page = QVBoxLayout(central)
        page.setContentsMargins(24, 16, 24, 16)
        page.setSpacing(16)

        header = QHBoxLayout()
        brand = QLabel("Api2Class")
        brand.setStyleSheet("font-weight: 600;")
        header.addWidget(brand)
        header.addStretch()
        header.addWidget(LanguageSwitcher(i18n))
        page.addLayout(header)

        intro = QFrame()
        intro.setObjectName("card")
        intro_layout = QHBoxLayout(intro)
        intro_layout.setContentsMargins(40, 32, 40, 32)
        text = QVBoxLayout()
        title_row = QHBoxLayout()
        title = QLabel("Api2Class")
        title.setProperty("role", "title")
        self.privacy_tag = QLabel()
        self.privacy_tag.setProperty("role", "privacyTag")
        title_row.addWidget(title)
        title_row.addWidget(self.privacy_tag)
        title_row.addStretch()
        text.addLayout(title_row)
        self.tagline = QLabel()
        self.tagline.setProperty("role", "subtitle")
        self.description = QLabel()
        self.description.setProperty("role", "muted")
        self.description.setWordWrap(True)
        for label in (self.tagline, self.description):
            text.addWidget(label)
        intro_layout.addLayout(text, 1)
        page.addWidget(intro)

        self.json_panel = JsonPanel(i18n, session)
        self.structure_panel = StructurePanel(i18n, session)
        self.code_panel = CodePanel(i18n, session)
        splitter = QSplitter(Qt.Orientation.Horizontal)
        for panel in (self.json_panel, self.structure_panel, self.code_panel):
            splitter.addWidget(panel)
        splitter.setChildrenCollapsible(False)
        splitter.setSizes([1, 1, 1])
        page.addWidget(splitter, 1)

        self.setCentralWidget(central)
        i18n.changed.connect(self._retranslate)
        self._retranslate()

    def _retranslate(self) -> None:
        t = self._i18n.t
        self.privacy_tag.setText(t.privacy_short)
        self.tagline.setText(t.tagline)
        self.description.setText(t.intro_description)
