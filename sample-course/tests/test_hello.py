import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from scaffolds.hello import say_hello


def test_returns_correct_string():
    assert say_hello() == "Hello, World!"


def test_return_type_is_str():
    result = say_hello()
    assert isinstance(result, str), f"Expected str, got {type(result).__name__}"


def test_not_none():
    assert say_hello() is not None, "Function returned None — did you forget the return statement?"
