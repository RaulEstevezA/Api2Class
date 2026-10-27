import json

import pytest

from api2class.core.analyze import analyze
from api2class.core.edits import Edits, apply_edits, update_edit
from api2class.core.json_parser import parse_json
from api2class.core.schema import Field, Schema, describe_type, find_class
from api2class.core.warnings import schema_warnings

from .conftest import load_cases

EDIT_CASES = load_cases("edits.json")
WARNING_CASES = load_cases("warnings.json")


def schema_of(data) -> Schema:
    return analyze(parse_json(json.dumps(data, ensure_ascii=False)).value)


def describe_field(field: Field, schema: Schema) -> str:
    flags = f"{' | null' if field.nullable else ''}{' (optional)' if field.optional else ''}"
    return f"{describe_type(field.type, schema)}{flags}{f' as {field.name}' if field.name else ''}"


@pytest.mark.parametrize("case", EDIT_CASES, ids=lambda case: case["description"])
def test_apply_edits(case):
    schema = apply_edits(schema_of(case["input"]), Edits.from_dict(case["edits"]))
    expected = case["expected"]
    assert {
        "root": describe_type(schema.root, schema),
        "classes": [[item.name, [[f.key, describe_field(f, schema)] for f in item.fields]] for item in schema.classes],
    } == {
        "root": expected["root"],
        "classes": [[name, [list(e) for e in fields.items()]] for name, fields in expected["classes"]],
    }


def test_leaves_the_detected_schema_untouched():
    schema = schema_of({"id": 1})
    apply_edits(schema, Edits({"#": {"name": "X"}}, {"#/id": {"type": "string"}}))
    assert schema.classes[0].name == "Root"
    assert schema.classes[0].fields[0].type.name == "integer"


@pytest.mark.parametrize("case", WARNING_CASES, ids=lambda case: case["description"])
def test_schema_warnings(case):
    schema = apply_edits(schema_of(case["input"]), Edits.from_dict(case.get("edits", {})))
    warnings = []
    for warning in schema_warnings(schema):
        entry = {"code": warning.code, "key": warning.key, "class": find_class(schema, warning.class_id).name}
        if warning.counts is not None:
            entry["counts"] = [list(pair) for pair in warning.counts]
        warnings.append(entry)
    assert warnings == case["expected"]


def test_update_edit_merges_and_removes_empty_edits():
    fields = update_edit({}, "#/id", {"type": "string"})
    fields = update_edit(fields, "#/id", {"optional": True})
    assert fields == {"#/id": {"type": "string", "optional": True}}
    fields = update_edit(fields, "#/id", {"type": None, "optional": None})
    assert fields == {}
    assert Edits({}, fields).is_empty()
