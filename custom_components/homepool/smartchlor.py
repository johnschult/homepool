"""FROG @ease SmartChlor cartridge status formatting for the homepool integration.

Deliberately free of any `homeassistant.*` import so it can be unit-tested with
plain pytest (see tests/test_smartchlor.py), exactly like api.py/external.py.
"""
from __future__ import annotations

SMARTCHLOR_STATUSES = ("ok", "out")


def smartchlor_status_label(status: str | None) -> str:
    """Friendly display text for a SmartChlor cartridge status. Never invents a
    numeric free-chlorine reading — "ok"/"out" are the only meaningful states;
    anything else (None, an unrecognized string) reads as "not checked"."""
    if status == "ok":
        return "OK — cartridge active"
    if status == "out":
        return "OUT — replace cartridge"
    return "Not checked"
