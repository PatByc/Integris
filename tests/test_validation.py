"""
Unit tests for workers/validation.py — all 13 deterministic validation rules.
No DB, no async, no external dependencies.
"""

import copy
from datetime import date, timedelta
from decimal import Decimal

import pytest

from validation import validate_invoice_draft, validate_nip


# ── Helpers ──────────────────────────────────────────────────────────────────

def rule_names(errors) -> list[str]:
    return [e.rule_name for e in errors]


def field_paths(errors) -> list[str | None]:
    return [e.field_path for e in errors]


# ── NIP checksum ──────────────────────────────────────────────────────────────

def test_validate_nip_valid():
    assert validate_nip("5261040828") is True


def test_validate_nip_invalid_checksum():
    # Last digit changed from 8 to 9
    assert validate_nip("5261040829") is False


def test_validate_nip_wrong_length_short():
    assert validate_nip("526104082") is False  # 9 digits


def test_validate_nip_wrong_length_long():
    assert validate_nip("52610408280") is False  # 11 digits


def test_validate_nip_strips_dashes():
    # "526-104-08-28" → digits "5261040828" → valid
    assert validate_nip("526-104-08-28") is True


def test_validate_nip_strips_spaces():
    assert validate_nip("526 104 08 28") is True



# ── Happy path ────────────────────────────────────────────────────────────────

def test_valid_invoice_no_errors(valid_draft, valid_line_item):
    errors = validate_invoice_draft(valid_draft, [valid_line_item])
    assert errors == [], f"Expected no errors, got: {errors}"


def test_valid_invoice_no_line_items(valid_draft):
    # Line items are optional for validation (rules skip when list is empty)
    errors = validate_invoice_draft(valid_draft, [])
    assert errors == []


# ── Required fields ───────────────────────────────────────────────────────────

def test_missing_seller_name(valid_draft, valid_line_item):
    d = {**valid_draft, "seller_name": None}
    assert "required_seller_name" in rule_names(validate_invoice_draft(d, [valid_line_item]))


def test_missing_seller_nip(valid_draft, valid_line_item):
    d = {**valid_draft, "seller_nip": None}
    assert "required_seller_nip" in rule_names(validate_invoice_draft(d, [valid_line_item]))


def test_missing_buyer_name(valid_draft, valid_line_item):
    d = {**valid_draft, "buyer_name": None}
    assert "required_buyer_name" in rule_names(validate_invoice_draft(d, [valid_line_item]))


def test_missing_invoice_number(valid_draft, valid_line_item):
    d = {**valid_draft, "invoice_number": None}
    assert "required_invoice_number" in rule_names(validate_invoice_draft(d, [valid_line_item]))


def test_missing_issue_date(valid_draft, valid_line_item):
    d = {**valid_draft, "issue_date": None}
    assert "required_issue_date" in rule_names(validate_invoice_draft(d, [valid_line_item]))


def test_gross_total_zero(valid_draft, valid_line_item):
    d = {**valid_draft, "gross_total": Decimal("0")}
    assert "required_gross_total" in rule_names(validate_invoice_draft(d, [valid_line_item]))


def test_gross_total_negative(valid_draft, valid_line_item):
    d = {**valid_draft, "gross_total": Decimal("-1.00")}
    assert "required_gross_total" in rule_names(validate_invoice_draft(d, [valid_line_item]))


def test_gross_total_none(valid_draft, valid_line_item):
    d = {**valid_draft, "gross_total": None}
    assert "required_gross_total" in rule_names(validate_invoice_draft(d, [valid_line_item]))


def test_all_required_fields_missing():
    empty = {}
    errors = validate_invoice_draft(empty, [])
    names = rule_names(errors)
    for rule in [
        "required_seller_name",
        "required_seller_nip",
        "required_buyer_name",
        "required_invoice_number",
        "required_issue_date",
        "required_gross_total",
    ]:
        assert rule in names, f"{rule} missing from errors: {names}"


# ── NIP validation rules ──────────────────────────────────────────────────────

def test_invalid_seller_nip_rule(valid_draft, valid_line_item):
    d = {**valid_draft, "seller_nip": "1234567890"}  # wrong checksum
    assert "invalid_seller_nip" in rule_names(validate_invoice_draft(d, [valid_line_item]))


def test_invalid_buyer_nip_rule(valid_draft, valid_line_item):
    d = {**valid_draft, "buyer_nip": "1234567890"}  # wrong checksum: sum=230, 230%11=10 ≠ 0
    assert "invalid_buyer_nip" in rule_names(validate_invoice_draft(d, [valid_line_item]))


def test_nip_not_validated_when_absent(valid_draft, valid_line_item):
    # buyer_nip absent → no invalid_buyer_nip error
    d = {**valid_draft, "buyer_nip": None}
    assert "invalid_buyer_nip" not in rule_names(validate_invoice_draft(d, [valid_line_item]))


# ── Totals consistency ────────────────────────────────────────────────────────

def test_totals_mismatch(valid_draft, valid_line_item):
    # net(100) + vat(23) = 123, but gross set to 130 → difference 7 > 0.02
    d = {**valid_draft, "gross_total": Decimal("130.00")}
    assert "totals_mismatch" in rule_names(validate_invoice_draft(d, [valid_line_item]))


def test_totals_within_tolerance(valid_draft, valid_line_item):
    # Difference exactly 0.02 → no error (boundary: abs > 0.02)
    d = {**valid_draft, "gross_total": Decimal("123.02")}
    assert "totals_mismatch" not in rule_names(validate_invoice_draft(d, [valid_line_item]))


def test_totals_just_over_tolerance(valid_draft, valid_line_item):
    # Difference 0.021 → error
    d = {**valid_draft, "gross_total": Decimal("123.021")}
    assert "totals_mismatch" in rule_names(validate_invoice_draft(d, [valid_line_item]))


def test_totals_skipped_when_values_missing(valid_draft, valid_line_item):
    # Missing net_total → mismatch check skipped, no totals_mismatch error
    d = {**valid_draft, "net_total": None}
    assert "totals_mismatch" not in rule_names(validate_invoice_draft(d, [valid_line_item]))


# ── Line items total ──────────────────────────────────────────────────────────

def test_line_items_total_mismatch(valid_draft, valid_line_item):
    # Line item net=100, but draft net_total=200
    d = {**valid_draft, "net_total": Decimal("200.00")}
    assert "line_items_total_mismatch" in rule_names(validate_invoice_draft(d, [valid_line_item]))


def test_line_items_total_within_tolerance(valid_draft):
    # Two items summing to 99.99, net_total=100.00 → diff=0.01 ≤ 0.02 → no error
    item1 = {"net_amount": Decimal("50.00"), "vat_rate": 23}
    item2 = {"net_amount": Decimal("49.99"), "vat_rate": 23}
    d = {**valid_draft, "net_total": Decimal("100.00")}
    assert "line_items_total_mismatch" not in rule_names(validate_invoice_draft(d, [item1, item2]))


# ── Date rules ────────────────────────────────────────────────────────────────

def test_future_issue_date(valid_draft, valid_line_item):
    d = {**valid_draft, "issue_date": date.today() + timedelta(days=1)}
    assert "invalid_issue_date" in rule_names(validate_invoice_draft(d, [valid_line_item]))


def test_today_issue_date_is_valid(valid_draft, valid_line_item):
    d = {**valid_draft, "issue_date": date.today()}
    assert "invalid_issue_date" not in rule_names(validate_invoice_draft(d, [valid_line_item]))


def test_payment_before_issue_date(valid_draft, valid_line_item):
    d = {
        **valid_draft,
        "issue_date": date(2025, 10, 15),
        "payment_due_date": date(2025, 10, 1),
    }
    assert "invalid_payment_date" in rule_names(validate_invoice_draft(d, [valid_line_item]))


def test_payment_same_as_issue_date_is_valid(valid_draft, valid_line_item):
    d = {
        **valid_draft,
        "issue_date": date(2025, 10, 1),
        "payment_due_date": date(2025, 10, 1),
    }
    assert "invalid_payment_date" not in rule_names(validate_invoice_draft(d, [valid_line_item]))


def test_payment_date_skipped_when_absent(valid_draft, valid_line_item):
    d = {**valid_draft, "payment_due_date": None}
    assert "invalid_payment_date" not in rule_names(validate_invoice_draft(d, [valid_line_item]))


# ── VAT rate rules ────────────────────────────────────────────────────────────

@pytest.mark.parametrize("rate", [0, 5, 8, 23])
def test_valid_vat_rate_numeric(rate, valid_draft):
    item = {"vat_rate": rate, "net_amount": Decimal("100.00")}
    errors = validate_invoice_draft(valid_draft, [item])
    assert "invalid_vat_rate" not in rule_names(errors)


@pytest.mark.parametrize("rate", ["ZW", "NP"])
def test_valid_vat_rate_string(rate, valid_draft):
    item = {"vat_rate": rate, "net_amount": Decimal("100.00")}
    errors = validate_invoice_draft(valid_draft, [item])
    assert "invalid_vat_rate" not in rule_names(errors)


@pytest.mark.parametrize("rate", [7, 10, 25])
def test_invalid_vat_rate_numeric(rate, valid_draft):
    item = {"vat_rate": rate, "net_amount": Decimal("100.00")}
    errors = validate_invoice_draft(valid_draft, [item])
    assert "invalid_vat_rate" in rule_names(errors)


@pytest.mark.parametrize("rate", ["AB", "zwolniony", "VAT"])
def test_invalid_vat_rate_string(rate, valid_draft):
    item = {"vat_rate": rate, "net_amount": Decimal("100.00")}
    errors = validate_invoice_draft(valid_draft, [item])
    assert "invalid_vat_rate" in rule_names(errors)


def test_vat_rate_none_skipped(valid_draft):
    item = {"vat_rate": None, "net_amount": Decimal("100.00")}
    errors = validate_invoice_draft(valid_draft, [item])
    assert "invalid_vat_rate" not in rule_names(errors)


def test_multiple_line_item_vat_errors(valid_draft):
    items = [
        {"vat_rate": 7, "net_amount": Decimal("50.00")},   # invalid
        {"vat_rate": 23, "net_amount": Decimal("50.00")},  # valid
        {"vat_rate": 10, "net_amount": Decimal("0.00")},   # invalid
    ]
    errors = [e for e in validate_invoice_draft(valid_draft, items) if e.rule_name == "invalid_vat_rate"]
    assert len(errors) == 2
    paths = field_paths(errors)
    assert "line_items[0].vat_rate" in paths
    assert "line_items[2].vat_rate" in paths
    assert "line_items[1].vat_rate" not in paths
