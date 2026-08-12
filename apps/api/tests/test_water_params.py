from datetime import date, timedelta

from models import Action, Installation
from water_params import (
    default_maintenance_tasks,
    extract_current_conditions,
    extract_current_smartchlor_status,
    sanitizer_capabilities,
)

TODAY = date.today()
YESTERDAY = TODAY - timedelta(days=1)


def make_action(**kwargs) -> Action:
    defaults = dict(date=TODAY, action_type="Measurement", notes="")
    defaults.update(kwargs)
    return Action(**defaults)


def make_installation(**kwargs) -> Installation:
    defaults = dict(user_id=1, type="pool", sanitizer="chlorine")
    defaults.update(kwargs)
    return Installation(**defaults)


# ── sanitizer_capabilities ───────────────────────────────────────────────

def test_sanitizer_capabilities_chlorine():
    caps = sanitizer_capabilities("chlorine")
    assert caps["requires_numeric_free_chlorine"] is True
    assert caps["supports_free_chlorine_target"] is True
    assert caps["supports_chlorine_dose_recommendation"] is True
    assert caps["supports_smartchlor_status"] is False


def test_sanitizer_capabilities_bromine():
    caps = sanitizer_capabilities("bromine")
    assert caps["requires_numeric_free_chlorine"] is False
    assert caps["supports_free_chlorine_target"] is False
    assert caps["supports_chlorine_dose_recommendation"] is False
    assert caps["supports_smartchlor_status"] is False


def test_sanitizer_capabilities_salt():
    caps = sanitizer_capabilities("salt")
    assert caps["requires_numeric_free_chlorine"] is True
    assert caps["supports_chlorine_dose_recommendation"] is True
    assert caps["supports_smartchlor_status"] is False


def test_sanitizer_capabilities_frog_smartchlor():
    caps = sanitizer_capabilities("frog_smartchlor")
    assert caps["requires_numeric_free_chlorine"] is False
    assert caps["supports_free_chlorine_target"] is False
    assert caps["supports_chlorine_dose_recommendation"] is False
    assert caps["supports_smartchlor_status"] is True


def test_sanitizer_capabilities_unknown_falls_back_to_chlorine():
    assert sanitizer_capabilities("unknown") == sanitizer_capabilities("chlorine")


# ── extract_current_conditions: stale-chlorine suppression gate ─────────

def test_extract_current_conditions_suppresses_chlorine_for_frog_smartchlor():
    installation = make_installation(sanitizer="frog_smartchlor")
    actions = [make_action(notes="pH 7.4 chlorine 3 TAC 100")]
    result = extract_current_conditions(actions, installation)
    assert "chlorine" not in result
    assert result["ph"]["value"] == 7.4
    assert result["tac"]["value"] == 100


def test_extract_current_conditions_suppresses_chlorine_for_bromine():
    installation = make_installation(sanitizer="bromine")
    actions = [make_action(notes="pH 7.4 chlorine 3 bromine 4")]
    result = extract_current_conditions(actions, installation)
    assert "chlorine" not in result
    assert result["bromine"]["value"] == 4


def test_extract_current_conditions_keeps_chlorine_for_chlorine_sanitizer():
    installation = make_installation(sanitizer="chlorine")
    actions = [make_action(notes="pH 7.4 chlorine 3")]
    result = extract_current_conditions(actions, installation)
    assert result["chlorine"]["value"] == 3


def test_extract_current_conditions_keeps_chlorine_for_salt_sanitizer():
    installation = make_installation(sanitizer="salt")
    actions = [make_action(notes="pH 7.4 chlorine 3")]
    result = extract_current_conditions(actions, installation)
    assert result["chlorine"]["value"] == 3


def test_extract_current_conditions_no_installation_never_suppresses():
    """The safety net: extract_current_conditions is also called without an
    installation in some contexts (or a caller may omit it) — chlorine must
    never be silently suppressed just because no installation was passed."""
    actions = [make_action(notes="pH 7.4 chlorine 3")]
    result = extract_current_conditions(actions, installation=None)
    assert result["chlorine"]["value"] == 3


# ── extract_current_smartchlor_status ────────────────────────────────────

def test_extract_current_smartchlor_status_newest_wins():
    actions = [
        make_action(date=YESTERDAY, smartchlor_status="ok"),
        make_action(date=TODAY, smartchlor_status="out"),
    ]
    result = extract_current_smartchlor_status(actions)
    assert result == {"status": "out", "date": TODAY}


def test_extract_current_smartchlor_status_none_when_never_checked():
    actions = [make_action(notes="pH 7.4")]
    assert extract_current_smartchlor_status(actions) is None


def test_extract_current_smartchlor_status_ignores_non_measurement_actions():
    actions = [make_action(action_type="Add product", smartchlor_status="out")]
    assert extract_current_smartchlor_status(actions) is None


# ── default_maintenance_tasks ────────────────────────────────────────────

def test_default_maintenance_tasks_frog_smartchlor_swaps_ph_task():
    specs = default_maintenance_tasks("spa", "frog_smartchlor")
    keys = {s["builtin_key"] for s in specs}
    assert "ph_measurement" not in keys
    strip_check = next(s for s in specs if s["builtin_key"] == "frog_strip_check")
    assert strip_check["interval_days"] == 3  # spa cadence preserved
    assert set(strip_check["action_types"]) == {"Measurement", "pH Measurement"}


def test_default_maintenance_tasks_chlorine_unchanged():
    specs = default_maintenance_tasks("pool", "chlorine")
    keys = {s["builtin_key"] for s in specs}
    assert "ph_measurement" in keys
    assert "frog_strip_check" not in keys


def test_default_maintenance_tasks_no_sanitizer_arg_unchanged():
    """Backward-compatible default: omitting sanitizer entirely behaves like
    before this feature existed."""
    specs = default_maintenance_tasks("pool")
    keys = {s["builtin_key"] for s in specs}
    assert "ph_measurement" in keys
