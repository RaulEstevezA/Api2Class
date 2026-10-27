"""Checks that the packaged app works: run by the release workflow as `Api2Class --smoke-test`.

PyInstaller only bundles what it sees imported, so a module loaded in an unusual way can be missing
from the executable even though every test passes. This opens the window, loads the example, generates
the code of every language and saves a .zip, then exits with 0.
"""

import sys
import tempfile
import zipfile
from pathlib import Path

from PySide6.QtCore import QTimer


def check(window) -> None:
    from api2class.core.generators import GENERATORS
    from api2class.ui.example import EXAMPLE_JSON

    window.json_panel.set_text(EXAMPLE_JSON)
    for generator in GENERATORS:
        window.session.set_generator(generator.id)
        assert window.code_panel.code.toPlainText().strip(), generator.id
    window.session.set_generator("java")
    window.session.set_multiple_files(True)
    with tempfile.TemporaryDirectory() as folder:
        target = Path(folder) / "models.zip"
        window.code_panel.save(str(target))
        with zipfile.ZipFile(target) as archive:
            assert len(archive.namelist()) == 3


def main() -> None:
    from api2class.ui.app import create_app

    app, window = create_app([])
    window.show()

    def run() -> None:
        try:
            check(window)
        except Exception as error:
            print(f"Smoke test failed: {error!r}", file=sys.stderr)
            app.exit(1)
        else:
            print("Smoke test passed")
            app.exit(0)

    QTimer.singleShot(0, run)
    sys.exit(app.exec())
