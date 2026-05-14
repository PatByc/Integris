"""
Unit tests for workers/fa3_xml.py — deterministic FA(3) XML generation.
No DB, no async, no external dependencies.
"""

import xml.etree.ElementTree as ET
from datetime import date, datetime, timezone
from decimal import Decimal
from unittest.mock import MagicMock

import pytest

from fa3_xml import FA3_NS, generate_fa3_xml


# ── Helpers ───────────────────────────────────────────────────────────────────

def _tag(local: str) -> str:
    return f"{{{FA3_NS}}}{local}"


def _find(root: ET.Element, *path: str) -> ET.Element | None:
    """Walk a dot-separated path under root using the FA3 namespace."""
    el = root
    for step in path:
        el = el.find(_tag(step))
        if el is None:
            return None
    return el


def _text(root: ET.Element, *path: str) -> str | None:
    el = _find(root, *path)
    return el.text if el is not None else None


def _parse(xml_bytes: bytes) -> ET.Element:
    return ET.fromstring(xml_bytes)


@pytest.fixture
def draft(valid_draft):
    d = dict(valid_draft)
    d["issue_date"] = str(d["issue_date"])
    d["sale_date"] = str(d["sale_date"])
    d["payment_due_date"] = str(d.get("payment_due_date", ""))
    d["net_total"] = str(d["net_total"])
    d["vat_total"] = str(d["vat_total"])
    d["gross_total"] = str(d["gross_total"])
    return d


@pytest.fixture
def line_items(valid_line_item):
    li = dict(valid_line_item)
    li["net_amount"] = str(li["net_amount"])
    li["vat_amount"] = str(li["vat_amount"])
    li["gross_amount"] = str(li["gross_amount"])
    li["unit_price_net"] = str(li["unit_price_net"])
    li["quantity"] = str(li["quantity"])
    return [li]


# ── Basic structure ───────────────────────────────────────────────────────────

def test_returns_bytes(draft, line_items):
    result = generate_fa3_xml(draft, line_items)
    assert isinstance(result, bytes)


def test_starts_with_xml_declaration(draft, line_items):
    result = generate_fa3_xml(draft, line_items)
    assert result.startswith(b"<?xml")


def test_parseable_xml(draft, line_items):
    result = generate_fa3_xml(draft, line_items)
    # Should not raise
    root = ET.fromstring(result)
    assert root is not None


def test_root_namespace(draft, line_items):
    result = generate_fa3_xml(draft, line_items)
    root = _parse(result)
    assert FA3_NS in root.tag


def test_kod_formularza(draft, line_items):
    root = _parse(generate_fa3_xml(draft, line_items))
    kod = _find(root, "Naglowek", "KodFormularza")
    assert kod is not None
    assert kod.text == "FA"
    assert kod.get("kodSystemowy") == "FA (3)"
    assert kod.get("wersjaSchemy") == "1-0E"


# ── Determinism ───────────────────────────────────────────────────────────────

def test_deterministic(draft, line_items, monkeypatch):
    """Same input must produce identical bytes when the timestamp is fixed."""
    fixed = datetime(2025, 10, 1, 12, 0, 0, tzinfo=timezone.utc)

    mock_dt = MagicMock()
    mock_dt.now.return_value = fixed
    mock_dt.timezone = timezone
    monkeypatch.setattr("fa3_xml.datetime", mock_dt)

    result1 = generate_fa3_xml(draft, line_items)
    result2 = generate_fa3_xml(draft, line_items)
    assert result1 == result2


# ── Seller (Podmiot1) ─────────────────────────────────────────────────────────

def test_seller_nip(draft, line_items):
    root = _parse(generate_fa3_xml(draft, line_items))
    nip = _text(root, "Podmiot1", "DaneIdentyfikacyjne", "NIP")
    assert nip == draft["seller_nip"]


def test_seller_name(draft, line_items):
    root = _parse(generate_fa3_xml(draft, line_items))
    nazwa = _text(root, "Podmiot1", "DaneIdentyfikacyjne", "Nazwa")
    assert nazwa == draft["seller_name"]


def test_seller_address_required(draft, line_items):
    root = _parse(generate_fa3_xml(draft, line_items))
    # Podmiot1 must always have Adres with KodKraju=PL
    kod_kraju = _text(root, "Podmiot1", "Adres", "KodKraju")
    assert kod_kraju == "PL"


# ── Buyer (Podmiot2) ──────────────────────────────────────────────────────────

def test_buyer_nip(draft, line_items):
    root = _parse(generate_fa3_xml(draft, line_items))
    nip = _text(root, "Podmiot2", "DaneIdentyfikacyjne", "NIP")
    assert nip == draft["buyer_nip"]


def test_no_buyer_address_no_crash(draft, line_items):
    d = {**draft, "buyer_address": None}
    result = generate_fa3_xml(d, line_items)
    root = _parse(result)
    # No Adres under Podmiot2 when buyer_address is None
    adres = _find(root, "Podmiot2", "Adres")
    assert adres is None


# ── Invoice body (Fa) ─────────────────────────────────────────────────────────

def test_issue_date_p1(draft, line_items):
    root = _parse(generate_fa3_xml(draft, line_items))
    assert _text(root, "Fa", "P_1") == str(draft["issue_date"])


def test_invoice_number_p2(draft, line_items):
    root = _parse(generate_fa3_xml(draft, line_items))
    assert _text(root, "Fa", "P_2") == draft["invoice_number"]


def test_gross_total_p15(draft, line_items):
    root = _parse(generate_fa3_xml(draft, line_items))
    p15 = _text(root, "Fa", "P_15")
    assert p15 == "123.00"


def test_p15_two_decimal_places(line_items):
    d = {
        "seller_name": "S", "seller_nip": "5261040828", "seller_address": "a",
        "buyer_name": "B", "buyer_nip": "7342867148",
        "invoice_number": "X", "issue_date": "2025-10-01", "currency": "PLN",
        "gross_total": "100",  # no decimals in input
        "vat_summary": [],
    }
    root = _parse(generate_fa3_xml(d, line_items))
    p15 = _text(root, "Fa", "P_15")
    assert p15 == "100.00"


# ── Sale date (P_6) ───────────────────────────────────────────────────────────

def test_sale_date_omitted_when_same_as_issue(draft, line_items):
    d = {**draft, "issue_date": "2025-10-01", "sale_date": "2025-10-01"}
    root = _parse(generate_fa3_xml(d, line_items))
    assert _find(root, "Fa", "P_6") is None


def test_sale_date_present_when_different(draft, line_items):
    d = {**draft, "issue_date": "2025-10-01", "sale_date": "2025-09-30"}
    root = _parse(generate_fa3_xml(d, line_items))
    p6 = _text(root, "Fa", "P_6")
    assert p6 == "2025-09-30"


# ── VAT summary ───────────────────────────────────────────────────────────────

def test_vat_summary_23pct(draft, line_items):
    root = _parse(generate_fa3_xml(draft, line_items))
    # 23% maps to suffix "1" → P_13_1 and P_14_1
    p13_1 = _text(root, "Fa", "P_13_1")
    p14_1 = _text(root, "Fa", "P_14_1")
    assert p13_1 == "100.00"
    assert p14_1 == "23.00"


def test_vat_summary_0pct_has_p14(line_items):
    """0% VAT must still emit P_14_4 = 0.00 per schema."""
    d = {
        "seller_name": "S", "seller_nip": "5261040828", "seller_address": "a",
        "buyer_name": "B", "buyer_nip": "7342867148",
        "invoice_number": "X", "issue_date": "2025-10-01", "currency": "PLN",
        "gross_total": "100.00",
        "vat_summary": [{"vat_rate": 0, "net_amount": "100.00", "vat_amount": "0.00"}],
    }
    root = _parse(generate_fa3_xml(d, line_items))
    # suffix for 0% is "4"
    p13_4 = _text(root, "Fa", "P_13_4")
    p14_4 = _text(root, "Fa", "P_14_4")
    assert p13_4 == "100.00"
    assert p14_4 == "0.00"


# ── Adnotacje defaults ────────────────────────────────────────────────────────

def test_adnotacje_defaults(draft, line_items):
    root = _parse(generate_fa3_xml(draft, line_items))
    for element in ["P_16", "P_17", "P_18", "P_18A"]:
        val = _text(root, "Fa", "Adnotacje", element)
        assert val == "2", f"{element} should be '2' (nie), got {val!r}"


# ── Line items (FaWiersze) ────────────────────────────────────────────────────

def test_line_items_count(draft, line_items):
    root = _parse(generate_fa3_xml(draft, line_items))
    fa_wiersze = _find(root, "FaWiersze")
    assert fa_wiersze is not None
    rows = list(fa_wiersze.findall(_tag("FaWiersz")))
    assert len(rows) == len(line_items)


def test_line_item_numbering(draft):
    items = [
        {"description": "Item 1", "vat_rate": 23, "net_amount": "10.00", "quantity": "1"},
        {"description": "Item 2", "vat_rate": 23, "net_amount": "10.00", "quantity": "1"},
        {"description": "Item 3", "vat_rate": 23, "net_amount": "10.00", "quantity": "1"},
    ]
    root = _parse(generate_fa3_xml(draft, items))
    fa_wiersze = _find(root, "FaWiersze")
    rows = list(fa_wiersze.findall(_tag("FaWiersz")))
    numbers = [r.find(_tag("NrWierszaFa")).text for r in rows]
    assert numbers == ["1", "2", "3"]


def test_no_line_items(draft):
    result = generate_fa3_xml(draft, [])
    root = _parse(result)
    fa_wiersze = _find(root, "FaWiersze")
    assert fa_wiersze is not None
    assert list(fa_wiersze) == []
