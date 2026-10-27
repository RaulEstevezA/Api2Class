"""Every generator against the expected files in shared/test-cases/generators/<case>/, the same ones
the web version's tests read: <language>-<style>.<ext>, with the other options at their default."""

import pytest

from api2class.core.analyze import analyze
from api2class.core.generators import GENERATORS
from api2class.core.generators.types import GenerateSettings
from api2class.core.json_parser import parse_json

from .conftest import SHARED_CASES

CASES = sorted(path for path in (SHARED_CASES / "generators").iterdir() if path.is_dir())
TARGETS = [(generator, choice.id) for generator in GENERATORS for choice in generator.options[0].choices]


def schema_of(text: str, root_name: str = "Root"):
    return analyze(parse_json(text).value, root_name=root_name)


@pytest.mark.parametrize("case", CASES, ids=lambda path: path.name)
@pytest.mark.parametrize(
    ("generator", "style"), TARGETS, ids=lambda value: value if isinstance(value, str) else value.id
)
def test_expected_files(case, generator, style):
    schema = schema_of((case / "input.json").read_text(encoding="utf-8"))
    result = generator.generate(schema, GenerateSettings(options={"style": style}))
    assert len(result.files) == 1
    file = result.files[0]
    expected = case / f"{generator.id}-{style}{file.name[file.name.rindex('.') :]}"
    assert expected.exists(), f"missing expected file {expected.name}"
    assert file.code == expected.read_text(encoding="utf-8")


SAMPLE = '{"id": 1, "address": {"city": "Villaluna"}, "orders": [{"total": 1.5}]}'


@pytest.mark.parametrize("generator", GENERATORS, ids=lambda generator: generator.id)
def test_names_the_file_after_the_root_class(generator):
    file = generator.generate(schema_of(SAMPLE, "UserProfile"), GenerateSettings()).files[0]
    assert file.name.split(".")[0].replace("_", "").replace("-", "").lower() == "userprofile"


@pytest.mark.parametrize("generator", [g for g in GENERATORS if g.supports_multiple_files], ids=lambda g: g.id)
def test_can_write_one_file_per_class(generator):
    files = generator.generate(schema_of(SAMPLE, "UserProfile"), GenerateSettings(multiple_files=True)).files
    assert len(files) == 3
    assert len({file.name for file in files}) == 3


@pytest.mark.parametrize("generator", GENERATORS, ids=lambda generator: generator.id)
def test_the_style_comes_first(generator):
    assert generator.options[0].id == "style"
    assert all(option.choices for option in generator.options)
