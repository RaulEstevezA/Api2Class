import pytest

from api2class.core.naming import class_name, convert_case, safe_identifier, singularize, split_words, unique_name

from .conftest import load_cases

CASES = load_cases("naming.json")


@pytest.mark.parametrize("case", CASES["words"], ids=lambda case: case["input"])
def test_split_words(case):
    assert split_words(case["input"]) == case["expected"]


@pytest.mark.parametrize(
    ("convention", "case"),
    [(convention, case) for convention in ("PascalCase", "camelCase", "snake_case") for case in CASES[convention]],
    ids=lambda value: value["input"] if isinstance(value, dict) else value,
)
def test_conventions(convention, case):
    assert convert_case(case["input"], convention) == case["expected"]


@pytest.mark.parametrize("case", CASES["singular"], ids=lambda case: case["input"])
def test_singularize(case):
    assert singularize(case["input"]) == case["expected"]


@pytest.mark.parametrize("case", CASES["className"], ids=lambda case: f"{case['input']}-{case['arrayItem']}")
def test_class_name(case):
    assert class_name(case["input"], case["arrayItem"]) == case["expected"]


def test_safe_identifier():
    reserved = {"class", "from"}
    assert safe_identifier("city", reserved, "field") == "city"
    assert safe_identifier("", reserved, "field") == "field"
    assert safe_identifier("2fa", reserved, "field") == "_2fa"
    assert safe_identifier("from", reserved, "field") == "from_"


def test_unique_name():
    used: set[str] = set()
    assert [unique_name("id", used), unique_name("id", used), unique_name("id", used), unique_name("name", used)] == [
        "id",
        "id2",
        "id3",
        "name",
    ]
