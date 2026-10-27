import pytest

from api2class.core.format import format_json, minify_json
from api2class.core.json_parser import parse_json

from .conftest import load_cases

CASES = load_cases("format.json")


@pytest.mark.parametrize("case", CASES, ids=lambda case: case["description"])
def test_shared_cases(case):
    parsed = parse_json(case["input"])
    assert format_json(parsed.value) == case["formatted"]
    assert minify_json(parsed.value) == case["minified"]
