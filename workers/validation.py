from dataclasses import dataclass
from datetime import date
from decimal import Decimal, InvalidOperation
from typing import Any

VALID_VAT_RATES = {0, 5, 8, 23}
VALID_VAT_STRINGS = {"ZW", "NP"}
_NIP_WEIGHTS = [6, 5, 7, 2, 3, 4, 5, 6, 7]


@dataclass
class ValidationErrorRecord:
    rule_name: str
    field_path: str | None
    message: str


def validate_nip(nip: str) -> bool:
    digits = "".join(c for c in nip if c.isdigit())
    if len(digits) != 10:
        return False
    total = sum(int(digits[i]) * _NIP_WEIGHTS[i] for i in range(9))
    return (total % 11) == int(digits[9])


def _to_decimal(value: Any) -> Decimal | None:
    if value is None:
        return None
    try:
        return Decimal(str(value))
    except InvalidOperation:
        return None


def _to_date(value: Any) -> date | None:
    if value is None:
        return None
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        try:
            return date.fromisoformat(value)
        except ValueError:
            return None
    return None


def validate_invoice_draft(
    draft: dict, line_items: list[dict]
) -> list[ValidationErrorRecord]:
    errors: list[ValidationErrorRecord] = []

    def err(rule: str, field: str | None, msg: str) -> None:
        errors.append(ValidationErrorRecord(rule_name=rule, field_path=field, message=msg))

    # Required fields
    if not draft.get("seller_name"):
        err("required_seller_name", "seller_name", "Seller name is required")
    if not draft.get("seller_nip"):
        err("required_seller_nip", "seller_nip", "Seller NIP is required")
    if not draft.get("buyer_name"):
        err("required_buyer_name", "buyer_name", "Buyer name is required")
    if not draft.get("invoice_number"):
        err("required_invoice_number", "invoice_number", "Invoice number is required")
    if not draft.get("issue_date"):
        err("required_issue_date", "issue_date", "Issue date is required")

    gross_total = _to_decimal(draft.get("gross_total"))
    if gross_total is None or gross_total <= 0:
        err("required_gross_total", "gross_total", "Gross total is required and must be greater than 0")

    # NIP checksum validation (only if field is present)
    seller_nip = draft.get("seller_nip")
    if seller_nip and not validate_nip(seller_nip):
        err("invalid_seller_nip", "seller_nip", f"Seller NIP '{seller_nip}' has an invalid checksum or format")

    buyer_nip = draft.get("buyer_nip")
    if buyer_nip and not validate_nip(buyer_nip):
        err("invalid_buyer_nip", "buyer_nip", f"Buyer NIP '{buyer_nip}' has an invalid checksum or format")

    # Totals consistency: net + vat must equal gross (±0.02)
    net_total = _to_decimal(draft.get("net_total"))
    vat_total = _to_decimal(draft.get("vat_total"))
    if gross_total is not None and net_total is not None and vat_total is not None:
        computed = net_total + vat_total
        if abs(computed - gross_total) > Decimal("0.02"):
            err(
                "totals_mismatch",
                "gross_total",
                f"net_total ({net_total}) + vat_total ({vat_total}) = {computed} does not match gross_total ({gross_total})",
            )

    # Sum of line item net amounts must match net_total (±0.02)
    if line_items and net_total is not None:
        line_net_sum = sum(
            (_to_decimal(item.get("net_amount")) or Decimal("0")) for item in line_items
        )
        if abs(line_net_sum - net_total) > Decimal("0.02"):
            err(
                "line_items_total_mismatch",
                "net_total",
                f"Sum of line item net amounts ({line_net_sum}) does not match net_total ({net_total})",
            )

    # Issue date must not be in the future
    issue_date = _to_date(draft.get("issue_date"))
    today = date.today()
    if issue_date is not None and issue_date > today:
        err("invalid_issue_date", "issue_date", f"Issue date {issue_date} is in the future")

    # Payment due date must be >= issue date
    payment_due_date = _to_date(draft.get("payment_due_date"))
    if payment_due_date is not None and issue_date is not None:
        if payment_due_date < issue_date:
            err(
                "invalid_payment_date",
                "payment_due_date",
                f"Payment due date {payment_due_date} is before issue date {issue_date}",
            )

    # VAT rates must be 0, 5, 8, 23 (numeric) or ZW, NP (string)
    for i, item in enumerate(line_items):
        vat_rate = item.get("vat_rate")
        if vat_rate is None:
            continue
        if isinstance(vat_rate, str):
            if vat_rate.upper() not in VALID_VAT_STRINGS:
                err(
                    "invalid_vat_rate",
                    f"line_items[{i}].vat_rate",
                    f"VAT rate '{vat_rate}' is not a valid Polish VAT rate (0, 5, 8, 23, ZW, NP)",
                )
        else:
            try:
                rate_int = int(Decimal(str(vat_rate)))
                if rate_int not in VALID_VAT_RATES:
                    err(
                        "invalid_vat_rate",
                        f"line_items[{i}].vat_rate",
                        f"VAT rate {vat_rate} is not a valid Polish VAT rate (0, 5, 8, 23, ZW, NP)",
                    )
            except (InvalidOperation, ValueError):
                err(
                    "invalid_vat_rate",
                    f"line_items[{i}].vat_rate",
                    f"VAT rate '{vat_rate}' is not a valid Polish VAT rate",
                )

    return errors
