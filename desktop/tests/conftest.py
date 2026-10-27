import json
import os
from pathlib import Path

# Interface tests run without opening windows
os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")

SHARED_CASES = Path(__file__).resolve().parents[2] / "shared" / "test-cases"


def load_cases(name: str):
    """Loads a shared test case file, the same one the web version's tests read."""
    return json.loads((SHARED_CASES / name).read_text(encoding="utf-8"))
