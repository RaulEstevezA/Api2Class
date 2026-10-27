import json

import pytest

from api2class.core.analyze import analyze
from api2class.core.json_parser import parse_json
from api2class.core.schema import Field, Schema, describe_type

from .conftest import load_cases

CASES = load_cases("analyze.json")


def describe_field(field: Field, schema: Schema) -> str:
    flags = f"{' | null' if field.nullable else ''}{' (optional)' if field.optional else ''}"
    return f"{describe_type(field.type, schema)}{flags}"


def summary(schema: Schema):
    """Same layout as the shared cases, with lists so the order of fields is compared too."""
    return {
        "root": describe_type(schema.root, schema),
        "classes": [
            [item.name, [[field.key, describe_field(field, schema)] for field in item.fields]]
            for item in schema.classes
        ],
    }


def schema_of(case) -> Schema:
    text = case.get("inputText") or json.dumps(case["input"], ensure_ascii=False)
    options = case.get("options", {})
    return analyze(
        parse_json(text).value,
        root_name=case.get("rootName", "Root"),
        detect_formats=options.get("detectFormats", True),
        merge_identical=options.get("mergeIdentical", True),
    )


@pytest.mark.parametrize("case", CASES, ids=lambda case: case["description"])
def test_shared_cases(case):
    schema = schema_of(case)
    if "expected" in case:
        expected = case["expected"]
        assert summary(schema) == {
            "root": expected["root"],
            "classes": [[name, [list(entry) for entry in fields.items()]] for name, fields in expected["classes"]],
        }
    if "expectedIds" in case:
        assert [item.id for item in schema.classes] == case["expectedIds"]
    if "expectedObserved" in case:
        fields = {field.key: field for item in schema.classes for field in item.fields}
        for key, expected in case["expectedObserved"].items():
            assert fields[key].observed == expected["observed"], key
            assert fields[key].items_observed == expected.get("itemsObserved"), key
