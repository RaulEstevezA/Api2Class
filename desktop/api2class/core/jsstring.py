"""JavaScript's JSON.stringify for strings, which the web version uses to quote keys and values."""

import json


def js_string(value: str) -> str:
    """`"text"` with the same escapes as JSON.stringify: quotes, backslashes and control characters."""
    return json.dumps(value, ensure_ascii=False)
