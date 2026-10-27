import pytest

from api2class.core.json_parser import MAX_DEPTH, JsonValue, parse_json

from .conftest import load_cases

CASES = load_cases("json.json")


def to_plain(value: JsonValue):
    """Plain JSON for comparing with the shared cases; numbers become "integer:15" or "float:29.0"."""
    if value.kind == "object":
        return {key: to_plain(item) for key, item in value.entries}
    if value.kind == "array":
        return [to_plain(item) for item in value.items]
    if value.kind == "number":
        return f"{'integer' if value.integer else 'float'}:{value.text}"
    if value.kind == "null":
        return None
    return value.value


@pytest.mark.parametrize("case", CASES["valid"], ids=lambda case: case["description"])
def test_valid(case):
    result = parse_json(case["input"])
    assert result.ok, result.error
    assert to_plain(result.value) == case["expected"]


@pytest.mark.parametrize("case", CASES["invalid"], ids=lambda case: case["description"])
def test_invalid(case):
    result = parse_json(case["input"])
    assert not result.ok
    assert result.error.to_dict() == case["expected"]


def test_keeps_the_order_of_keys_and_repeated_keys():
    result = parse_json('{"b": 1, "a": 2, "b": 3}')
    assert [key for key, _ in result.value.entries] == ["b", "a", "b"]


def test_rejects_documents_nested_too_deep():
    deep = "[" * (MAX_DEPTH + 1) + "]" * (MAX_DEPTH + 1)
    assert parse_json(deep).error.code == "tooDeep"
    limit = "[" * MAX_DEPTH + "]" * MAX_DEPTH
    assert parse_json(limit).ok
