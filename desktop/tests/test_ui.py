import zipfile

from PySide6.QtCore import Qt
from PySide6.QtWidgets import QApplication

from api2class.core.analyze import analyze
from api2class.core.generators import find_generator
from api2class.core.generators.types import GenerateSettings
from api2class.core.json_parser import parse_json
from api2class.ui.example import EXAMPLE_JSON


def uncheck(window, key):
    top_item(window, key).setCheckState(0, Qt.CheckState.Unchecked)
    # The edit is applied right after the signal
    QApplication.processEvents()


def top_item(window, key):
    tree = window.structure_panel.tree
    return next(tree.topLevelItem(i) for i in range(tree.topLevelItemCount()) if tree.topLevelItem(i).text(0) == key)


def test_example_generates_the_same_code_as_the_core(window):
    window.json_panel.set_text(EXAMPLE_JSON)
    expected = find_generator("python").generate(analyze(parse_json(EXAMPLE_JSON).value), GenerateSettings())
    assert window.code_panel.code.toPlainText() == expected.files[0].code
    assert window.code_panel.file_name.text() == "root.py"
    assert window.json_panel.status.text() == window._i18n.t.input_valid


def test_invalid_json_shows_where_and_what(window):
    window.json_panel.set_text('{"name": "Ana" "email": 1}')
    t = window._i18n.t
    assert t.error_position(1, 16) in window.json_panel.status.text()
    assert window.code_panel.code.toPlainText() == ""
    assert not window.code_panel.save_button.isEnabled()


def test_unchecking_a_field_leaves_it_out_of_the_code(window):
    window.json_panel.set_text(EXAMPLE_JSON)
    uncheck(window, "email")
    assert "email" not in window.code_panel.code.toPlainText()
    assert window.session.edits.fields == {"#/email": {"excluded": True}}
    window.structure_panel.reset.click()
    assert "email" in window.code_panel.code.toPlainText()


def test_editing_a_field_changes_the_code(window):
    window.json_panel.set_text(EXAMPLE_JSON)
    top_item(window, "id").setSelected(True)
    panel = window.structure_panel
    panel.property_name.textEdited.emit("user_id")
    panel.field_type.setCurrentIndex(panel.field_type.findData("string"))
    panel.field_type.activated.emit(panel.field_type.currentIndex())
    code = window.code_panel.code.toPlainText()
    assert 'user_id: str  # JSON: "id"' in code
    panel.root_name.textEdited.emit("UserResponse")
    assert "class UserResponse:" in window.code_panel.code.toPlainText()


def test_several_files_are_saved_as_a_zip(window, tmp_path):
    window.json_panel.set_text(EXAMPLE_JSON)
    window.session.set_generator("java")
    window.code_panel.multiple.setChecked(True)
    assert window.code_panel.tabs.count() == 3
    target = tmp_path / "models.zip"
    window.code_panel.save(str(target))
    with zipfile.ZipFile(target) as archive:
        assert sorted(archive.namelist()) == ["models/Address.java", "models/Order.java", "models/Root.java"]
        assert "public class Address" in archive.read("models/Address.java").decode()


def test_single_file_is_saved_as_is(window, tmp_path):
    window.json_panel.set_text(EXAMPLE_JSON)
    window.session.set_generator("typescript")
    target = tmp_path / "Root.ts"
    window.code_panel.save(str(target))
    assert target.read_text(encoding="utf-8") == window.code_panel.code.toPlainText()


def test_open_and_reformat_a_file(window, tmp_path):
    path = tmp_path / "response.json"
    path.write_text('﻿{"a":[1,2.0]}', encoding="utf-8")
    window.json_panel.open_file(str(path))
    window.json_panel._buttons["format"].click()
    assert window.json_panel.editor.toPlainText() == '{\n  "a": [\n    1,\n    2.0\n  ]\n}'


def test_options_and_language_switch(window):
    window.json_panel.set_text(EXAMPLE_JSON)
    window.session.set_generator("kotlin")
    window.session.set_option("library", "moshi")
    assert "@JsonClass(generateAdapter = true)" in window.code_panel.code.toPlainText()
    window._i18n.set_language("en")
    assert window.code_panel.title.text() == "Generated code"
    window._i18n.set_language("es")
    assert window.code_panel.title.text() == "Código generado"


def test_clearing_the_json_clears_the_edits(window):
    window.json_panel.set_text(EXAMPLE_JSON)
    uncheck(window, "email")
    window.json_panel._buttons["clear"].click()
    assert window.session.edits.is_empty()


def test_credit_links_to_the_portfolio(window):
    text = window.credit.text()
    assert "Desarrollado por" in text or "Developed by" in text
    assert 'href="https://raulesteveza.github.io/"' in text
    assert window.credit.openExternalLinks()
