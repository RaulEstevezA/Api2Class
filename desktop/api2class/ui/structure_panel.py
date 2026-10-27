"""Detected structure: a tree with a checkbox per field, the analysis options, the warnings, the root
model name and an editor for the selected field. Mirrors web/src/components/StructureTree.tsx."""

from PySide6.QtCore import Qt, QTimer
from PySide6.QtGui import QBrush, QColor
from PySide6.QtWidgets import (
    QCheckBox,
    QComboBox,
    QFormLayout,
    QFrame,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QPushButton,
    QTreeWidget,
    QTreeWidgetItem,
    QVBoxLayout,
)

from ..core.edits import Edits, edited_field, field_path, update_edit
from ..core.schema import Field, TypeRef, class_of, innermost_type
from .i18n import I18n
from .pane import Pane, section
from .session import Session
from .theme import MUTED, SYNTAX, WARNING

TYPE_CHOICES = ["string", "integer", "float", "boolean", "date", "datetime", "uuid", "object", "any"]
_NODE = Qt.ItemDataRole.UserRole


class StructurePanel(Pane):
    def __init__(self, i18n: I18n, session: Session):
        super().__init__()
        self._i18n = i18n
        self._session = session
        self._nodes: dict[str, tuple[str, Field]] = {}
        self._collapsed: set[str] = set()
        self._selected: str | None = None
        self._rebuilding = False

        self.reset = QPushButton()
        self.reset.clicked.connect(lambda: session.set_edits(Edits()))
        self.header.addWidget(self.reset)

        options = section()
        # One under the other, as in the web: side by side they do not fit in a narrow pane
        row = QVBoxLayout(options)
        row.setContentsMargins(16, 0, 16, 10)
        row.setSpacing(6)
        self.detect_formats = QCheckBox()
        self.merge_identical = QCheckBox()
        for box in (self.detect_formats, self.merge_identical):
            box.toggled.connect(
                lambda _=False: session.set_analysis(self.detect_formats.isChecked(), self.merge_identical.isChecked())
            )
            row.addWidget(box)
        row.addStretch()
        self.body.addWidget(options)

        content = section()
        column = QVBoxLayout(content)
        column.setContentsMargins(14, 0, 14, 8)
        column.setSpacing(8)
        self.warnings = QLabel()
        self.warnings.setProperty("role", "warningBox")
        self.warnings.setWordWrap(True)
        column.addWidget(self.warnings)
        root_row = QHBoxLayout()
        self.root_label = QLabel()
        self.root_label.setProperty("role", "muted")
        self.root_name = QLineEdit()
        self.root_name.textEdited.connect(self._rename_root)
        self.root_tag = QLabel()
        self.root_tag.setProperty("role", "muted")
        root_row.addWidget(self.root_label)
        root_row.addWidget(self.root_name, 1)
        root_row.addWidget(self.root_tag)
        column.addLayout(root_row)
        self.empty = QLabel()
        self.empty.setProperty("role", "muted")
        self.empty.setWordWrap(True)
        column.addWidget(self.empty)
        self.body.addWidget(content)

        self.tree = QTreeWidget()
        self.tree.setColumnCount(2)
        self.tree.setUniformRowHeights(True)
        self.tree.itemChanged.connect(self._item_changed)
        self.tree.itemSelectionChanged.connect(self._selection_changed)
        self.tree.itemCollapsed.connect(lambda item: self._collapsed.add(item.data(0, _NODE)))
        self.tree.itemExpanded.connect(lambda item: self._collapsed.discard(item.data(0, _NODE)))
        self.body.addWidget(self.tree, 1)

        self.editor = QFrame()
        self.editor.setObjectName("editor")
        self.editor.setProperty("section", "editor")
        form_box = QVBoxLayout(self.editor)
        form_box.setContentsMargins(12, 10, 12, 10)
        self.editor_title = QLabel()
        self.editor_title.setStyleSheet("font-weight: 600;")
        form_box.addWidget(self.editor_title)
        form = QFormLayout()
        self.property_name = QLineEdit()
        self.property_name.textEdited.connect(lambda text: self._edit_field({"name": text or None}))
        self.field_type = QComboBox()
        self.field_type.activated.connect(lambda _=0: self._edit_field({"type": self.field_type.currentData() or None}))
        self.class_name = QLineEdit()
        self.class_name.textEdited.connect(self._rename_class)
        self.optional = QCheckBox()
        self.optional.clicked.connect(lambda checked: self._edit_flag("optional", checked))
        self.nullable = QCheckBox()
        self.nullable.clicked.connect(lambda checked: self._edit_flag("nullable", checked))
        self._form_labels = [QLabel() for _ in range(3)]
        form.addRow(self._form_labels[0], self.property_name)
        form.addRow(self._form_labels[1], self.field_type)
        form.addRow(self._form_labels[2], self.class_name)
        flags = QHBoxLayout()
        flags.addWidget(self.optional)
        flags.addWidget(self.nullable)
        flags.addStretch()
        form.addRow(flags)
        form_box.addLayout(form)
        self.hint = QLabel()
        self.hint.setProperty("role", "muted")
        self.hint.setWordWrap(True)
        wrapper = section()
        bottom = QVBoxLayout(wrapper)
        bottom.setContentsMargins(14, 8, 14, 8)
        bottom.addWidget(self.hint)
        bottom.addWidget(self.editor)
        self.body.addWidget(wrapper)

        self.summary = QLabel()
        self.summary.setProperty("role", "muted")
        self.footer.addWidget(self.summary)

        session.changed.connect(self._sync)
        i18n.changed.connect(self._retranslate)
        self._retranslate()

    # Edits

    def _class_name(self, class_id: str) -> str:
        detected = next(item for item in self._session.detected.classes if item.id == class_id)
        return (self._session.edits.classes.get(class_id, {}).get("name") or "").strip() or detected.name

    def _describe(self, type_ref: TypeRef) -> str:
        if type_ref.kind == "primitive":
            return type_ref.name
        if type_ref.kind == "class":
            return self._class_name(type_ref.class_id)
        items = self._describe(type_ref.items)
        return f"({items} | null)[]" if type_ref.items_nullable else f"{items}[]"

    def _edit_field(self, change: dict, path: str | None = None) -> None:
        path = path or (self._nodes[self._selected][0] if self._selected in self._nodes else None)
        if path is None:
            return
        edits = self._session.edits
        self._session.set_edits(Edits(edits.classes, update_edit(edits.fields, path, change)))

    def _edit_flag(self, flag: str, checked: bool) -> None:
        path, field = self._nodes[self._selected]
        # Back to what was detected: the edit is removed rather than kept with the same value
        self._edit_field({flag: None if checked == getattr(field, flag) else checked})

    def _rename_class(self, name: str, class_id: str | None = None) -> None:
        if class_id is None:
            _, field = self._nodes[self._selected]
            class_id = class_of(
                edited_field(field, self._session.edits.fields.get(self._nodes[self._selected][0])).type
            )
        edits = self._session.edits
        self._session.set_edits(Edits(update_edit(edits.classes, class_id, {"name": name or None}), edits.fields))

    def _rename_root(self, name: str) -> None:
        root_class = class_of(self._session.detected.root)
        if root_class:
            self._rename_class(name, root_class)

    def _item_changed(self, item: QTreeWidgetItem, column: int) -> None:
        if self._rebuilding or column != 0:
            return
        path = self._nodes[item.data(0, _NODE)][0]
        change = {"excluded": None if item.checkState(0) == Qt.CheckState.Checked else True}
        # Applied once the signal returns: the edit rebuilds the tree, which deletes this very item
        QTimer.singleShot(0, lambda: self._edit_field(change, path))

    def _selection_changed(self) -> None:
        if self._rebuilding:
            return
        items = self.tree.selectedItems()
        self._selected = items[0].data(0, _NODE) if items else None
        self._sync_editor()

    # Display

    def _retranslate(self) -> None:
        t = self._i18n.t
        self.title.setText(t.structure_title)
        self.reset.setText(t.reset_edits)
        self.detect_formats.setText(t.detect_formats)
        self.merge_identical.setText(t.merge_identical)
        self.root_label.setText(t.root_name)
        self.tree.setHeaderLabels([t.column_field, t.column_type])
        self.hint.setText(t.edit_hint)
        for label, text in zip(self._form_labels, (t.property_name, t.field_type, t.class_name_label), strict=True):
            label.setText(text)
        self.optional.setText(t.optional)
        self.nullable.setText(t.nullable)
        self._sync()

    def _sync(self) -> None:
        session, t = self._session, self._i18n.t
        for box, value in (
            (self.detect_formats, session.detect_formats),
            (self.merge_identical, session.merge_identical),
        ):
            box.blockSignals(True)
            box.setChecked(value)
            box.blockSignals(False)
        self.reset.setVisible(not session.edits.is_empty())
        detected = session.detected
        self.empty.setVisible(detected is None or class_of(detected.root) is None)
        self.empty.setText(t.structure_empty if detected is None else t.structure_no_classes)
        root_class = class_of(detected.root) if detected else None
        for widget in (self.root_label, self.root_name):
            widget.setVisible(root_class is not None)
        self.root_tag.setVisible(bool(detected) and detected.root.kind == "array")
        self.root_tag.setText(t.root_array)
        if root_class:
            self.root_name.setPlaceholderText(next(item.name for item in detected.classes if item.id == root_class))
            wanted = session.edits.classes.get(root_class, {}).get("name", "")
            if self.root_name.text() != wanted:
                self.root_name.setText(wanted)
        warnings = session.warnings
        self.warnings.setVisible(bool(warnings))
        if warnings:
            lines = [f"• {self._class_name(w.class_id)}.{w.key}: {t.warning_text(w)}" for w in warnings]
            self.warnings.setText(f"{t.warning_count(len(warnings))}\n" + "\n".join(lines))
        fields = sum(len(item.fields) for item in detected.classes) if detected else 0
        self.summary.setText(t.structure_summary(len(detected.classes), fields) if detected else "")
        self._rebuild_tree()
        self._sync_editor()

    def _rebuild_tree(self) -> None:
        self._rebuilding = True
        scroll = self.tree.verticalScrollBar().value()
        self.tree.clear()
        self._nodes = {}
        detected = self._session.detected
        root_class = class_of(detected.root) if detected else None
        self.tree.setVisible(root_class is not None)
        if root_class:
            self._add_fields(self.tree.invisibleRootItem(), root_class, [root_class])
        self.tree.resizeColumnToContents(0)
        self.tree.verticalScrollBar().setValue(scroll)
        self._rebuilding = False

    def _add_fields(self, parent: QTreeWidgetItem, class_id: str, ancestors: list[str]) -> None:
        t, session = self._i18n.t, self._session
        detected = next(item for item in session.detected.classes if item.id == class_id)
        for field in detected.fields:
            path = field_path(class_id, field.key)
            # Tree position, unique even when a shared class appears in several places
            node = ">".join(ancestors) + ">" + path
            edit = session.edits.fields.get(path)
            final = edited_field(field, edit)
            excluded = bool(edit and edit.get("excluded"))
            item = QTreeWidgetItem(parent)
            item.setData(0, _NODE, node)
            self._nodes[node] = (path, field)
            item.setFlags(item.flags() | Qt.ItemFlag.ItemIsUserCheckable)
            item.setCheckState(0, Qt.CheckState.Unchecked if excluded else Qt.CheckState.Checked)
            item.setToolTip(0, t.field_excluded if excluded else t.field_included)
            item.setText(0, f"{field.key} → {final.name}" if final.name else field.key)
            badges = [t.optional] * final.optional + [t.nullable] * final.nullable
            warning = next((w for w in session.warnings if w.class_id == class_id and w.key == field.key), None)
            if warning and not excluded:
                badges.append(t.review)
                item.setToolTip(1, t.warning_text(warning))
            item.setText(1, " · ".join([self._describe(final.type), *badges]))
            nested = class_of(final.type)
            if excluded:
                for column in (0, 1):
                    font = item.font(column)
                    font.setStrikeOut(True)
                    item.setFont(column, font)
                    item.setForeground(column, QBrush(QColor(MUTED)))
            else:
                item.setForeground(0, QBrush(QColor(SYNTAX["property"])))
                color = WARNING if warning else SYNTAX["type"] if nested else SYNTAX["constant"]
                item.setForeground(1, QBrush(QColor(color)))
            if node == self._selected:
                item.setSelected(True)
            # A class already open above is not expanded again (two fields of the same class inside each other)
            if nested and not excluded and nested not in ancestors:
                self._add_fields(item, nested, [*ancestors, nested])
                item.setExpanded(node not in self._collapsed)

    def _sync_editor(self) -> None:
        selected = self._nodes.get(self._selected) if self._selected else None
        self.editor.setVisible(selected is not None)
        self.hint.setVisible(selected is None and self._session.detected is not None and bool(self._nodes))
        if selected is None:
            return
        path, field = selected
        t, edits = self._i18n.t, self._session.edits
        edit = edits.fields.get(path, {})
        final = edited_field(field, edit)
        self.editor_title.setText(t.edit_title(field.key))
        self.property_name.setPlaceholderText(field.key)
        if self.property_name.text() != (edit.get("name") or ""):
            self.property_name.setText(edit.get("name") or "")
        self.field_type.blockSignals(True)
        self.field_type.clear()
        inner = innermost_type(field.type)
        self.field_type.addItem(t.detected_type(self._describe(inner)), "")
        for choice in TYPE_CHOICES:
            if inner.kind == "primitive" and choice == inner.name and not edit.get("type"):
                continue
            self.field_type.addItem(t.map_type if choice == "object" else choice, choice)
        self.field_type.setCurrentIndex(max(0, self.field_type.findData(edit.get("type") or "")))
        self.field_type.blockSignals(False)
        nested = class_of(final.type)
        self.class_name.setVisible(nested is not None)
        self._form_labels[2].setVisible(nested is not None)
        if nested:
            self.class_name.setPlaceholderText(
                next(item.name for item in self._session.detected.classes if item.id == nested)
            )
            wanted = edits.classes.get(nested, {}).get("name", "")
            if self.class_name.text() != wanted:
                self.class_name.setText(wanted)
        self.optional.setChecked(final.optional)
        self.nullable.setChecked(final.nullable)
