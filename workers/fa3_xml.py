"""
Deterministic FA(3) XML generator for KSeF (Krajowy System e-Faktur).
No I/O, no external dependencies — stdlib xml.etree.ElementTree only.

Schema source (official, Ministerstwo Finansów):
  references/schemat_FA(3)_v1-0E.xsd
  https://github.com/CIRFMF/ksef-docs/blob/main/faktury/schemy/FA/schemat_FA(3)_v1-0E.xsd

Namespace: http://crd.gov.pl/wzor/2025/06/25/13775/
Version:   FA (3)  /  wersjaSchemy 1-0E
"""

import xml.etree.ElementTree as ET
from datetime import datetime, timezone

FA3_NS = "http://crd.gov.pl/wzor/2025/06/25/13775/"

# VAT rate (%) → FA(3) suffix for P_13_X / P_14_X elements
# Suffixes per official schema: 23%→1, 8%→2, 5%→3, 0%→4, zwolniony→5
_VAT_SUFFIX: dict[int, str] = {23: "1", 8: "2", 5: "3", 0: "4"}

ET.register_namespace("", FA3_NS)


def _el(parent: ET.Element, tag: str, text: str | None = None) -> ET.Element:
    e = ET.SubElement(parent, f"{{{FA3_NS}}}{tag}")
    if text is not None:
        e.text = text
    return e


def _amt(value) -> str:
    """Format a monetary value as 2 decimal places (TKwotowy type)."""
    from decimal import Decimal, ROUND_HALF_UP
    return str(Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def _adres(parent: ET.Element, address: str | None) -> None:
    """Append a TAdres element. KodKraju (PL) is required by the schema."""
    adres = _el(parent, "Adres")
    _el(adres, "KodKraju", "PL")
    _el(adres, "AdresL1", str(address) if address else "")


def generate_fa3_xml(draft: dict, line_items: list[dict]) -> bytes:
    """
    Generate FA(3) XML from an approved invoice draft.

    draft       — row from invoice_drafts (psycopg2 RealDictRow or plain dict)
    line_items  — rows from invoice_line_items ordered by sort_order
    Returns     — UTF-8 encoded XML bytes with XML declaration
    """
    root = ET.Element(f"{{{FA3_NS}}}Faktura")

    # ── Naglowek (header) ────────────────────────────────────────────────────
    naglowek = _el(root, "Naglowek")
    kod = _el(naglowek, "KodFormularza", "FA")
    kod.set("kodSystemowy", "FA (3)")
    kod.set("wersjaSchemy", "1-0E")
    _el(naglowek, "WariantFormularza", "3")
    # DataWytworzeniaFa must be UTC (minInclusive 2025-09-01T00:00:00Z per XSD)
    _el(naglowek, "DataWytworzeniaFa",
        datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))
    _el(naglowek, "SystemInfo", "Integris")

    # ── Podmiot1 (seller) ────────────────────────────────────────────────────
    # Adres is REQUIRED for Podmiot1 per schema
    podmiot1 = _el(root, "Podmiot1")
    dane1 = _el(podmiot1, "DaneIdentyfikacyjne")
    _el(dane1, "NIP", str(draft.get("seller_nip") or ""))
    _el(dane1, "Nazwa", str(draft.get("seller_name") or ""))   # schema: Nazwa, not PelnaNazwa
    _adres(podmiot1, draft.get("seller_address"))

    # ── Podmiot2 (buyer) ─────────────────────────────────────────────────────
    # DaneIdentyfikacyjne.Adres is optional for buyer; include it when available
    podmiot2 = _el(root, "Podmiot2")
    dane2 = _el(podmiot2, "DaneIdentyfikacyjne")
    _el(dane2, "NIP", str(draft.get("buyer_nip") or ""))
    if draft.get("buyer_name"):
        _el(dane2, "Nazwa", str(draft["buyer_name"]))          # optional for TPodmiot2
    if draft.get("buyer_address"):
        _adres(podmiot2, draft["buyer_address"])

    # ── Fa (invoice body) ────────────────────────────────────────────────────
    fa = _el(root, "Fa")
    _el(fa, "KodWaluty", str(draft.get("currency") or "PLN"))

    # P_1 — data wystawienia (issue date) — required
    if draft.get("issue_date"):
        _el(fa, "P_1", str(draft["issue_date"]))

    # P_1M — miejsce wystawienia (place of issuance) — optional, skip
    # P_2 — numer faktury — required
    if draft.get("invoice_number"):
        _el(fa, "P_2", str(draft["invoice_number"]))

    # P_6 — data dokonania/zakończenia dostawy (sale/delivery date)
    # Include only when sale_date differs from issue_date (or when sale_date is set)
    sale_date = draft.get("sale_date")
    issue_date = draft.get("issue_date")
    if sale_date and str(sale_date) != str(issue_date or ""):
        _el(fa, "P_6", str(sale_date))

    # ── VAT summary (P_13_X / P_14_X) ───────────────────────────────────────
    # Each VAT rate group (P_13_X + P_14_X) must appear together per XSD sequence.
    vat_summary = draft.get("vat_summary") or []
    for entry in vat_summary:
        rate = int(float(entry.get("vat_rate", 0)))
        suffix = _VAT_SUFFIX.get(rate)
        if suffix is None:
            continue
        net = entry.get("net_amount")
        vat = entry.get("vat_amount")
        if net is not None:
            _el(fa, f"P_13_{suffix}", _amt(net))
        # P_14_X is required within the sequence even for 0% (value = 0.00)
        if vat is not None:
            _el(fa, f"P_14_{suffix}", _amt(vat))
        elif rate == 0:
            _el(fa, f"P_14_{suffix}", "0.00")

    # P_15 — kwota należności ogółem (gross total) — required
    if draft.get("gross_total") is not None:
        _el(fa, "P_15", _amt(draft["gross_total"]))

    # ── Adnotacje ────────────────────────────────────────────────────────────
    # P_16 / P_17 / P_18 / P_18A all required within Adnotacje.
    # "2" = nie (no) for standard invoices without special mechanisms.
    adnotacje = _el(fa, "Adnotacje")
    _el(adnotacje, "P_16", "2")   # podzielona płatność (split payment): nie
    _el(adnotacje, "P_17", "2")   # VAT reverse-charge (odwrotne obciążenie): nie
    _el(adnotacje, "P_18", "2")   # faktura uproszczona (simplified invoice): nie
    _el(adnotacje, "P_18A", "2")  # samofakturowanie (self-billing): nie

    # ── FaWiersze (line items) ───────────────────────────────────────────────
    # Placed after Adnotacje per schema ordering (FaWiersze is a sibling of Fa)
    fa_wiersze = _el(root, "FaWiersze")
    for i, item in enumerate(line_items, 1):
        wiersz = _el(fa_wiersze, "FaWiersz")
        _el(wiersz, "NrWierszaFa", str(i))
        if item.get("description"):
            _el(wiersz, "P_7", str(item["description"]))      # schema: P_7, not P_7W
        if item.get("unit"):
            _el(wiersz, "P_8A", str(item["unit"]))
        if item.get("quantity") is not None:
            _el(wiersz, "P_8B", str(item["quantity"]))
        if item.get("unit_price_net") is not None:
            _el(wiersz, "P_9A", str(item["unit_price_net"]))
        if item.get("net_amount") is not None:
            _el(wiersz, "P_11", str(item["net_amount"]))
        if item.get("vat_rate") is not None:
            _el(wiersz, "P_12", str(int(float(item["vat_rate"]))))

    ET.indent(root, space="  ")
    return ET.tostring(root, encoding="UTF-8", xml_declaration=True)
