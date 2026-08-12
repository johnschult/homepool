"""Unit tests for FROG @ease SmartChlor status formatting.

Run with (from this directory): python -m pytest test_smartchlor.py -v
Or from the repo root: python -m pytest --rootdir=custom_components/homepool/tests \
  custom_components/homepool/tests/test_smartchlor.py -v

Like test_api.py/test_external.py, this needs no
pytest-homeassistant-custom-component harness: smartchlor.py has zero
homeassistant.* imports on purpose. See test_api.py's docstring for why
rootdir has to be pinned here.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from smartchlor import smartchlor_status_label  # noqa: E402


def test_label_for_ok() -> None:
    assert smartchlor_status_label("ok") == "OK — cartridge active"


def test_label_for_out() -> None:
    assert smartchlor_status_label("out") == "OUT — replace cartridge"


def test_label_for_none() -> None:
    assert smartchlor_status_label(None) == "Not checked"


def test_label_for_unrecognized_value() -> None:
    """Never fabricates a status for garbage input — degrades to "not checked"
    rather than guessing."""
    assert smartchlor_status_label("something_else") == "Not checked"
    assert smartchlor_status_label("") == "Not checked"
