from dataclasses import dataclass
from datetime import date
from decimal import Decimal, InvalidOperation

from app.models.invoice_draft import InvoiceDraft, InvoiceLineItem

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


def validate_draft(
    draft: InvoiceDraft, line_items: list[InvoiceLineItem]
) -> list[ValidationErrorRecord]:
    errors: list[ValidationErrorRecord] = []

    def err(rule: str, field: str | None, msg: str) -> None:
        errors.append(ValidationErrorRecord(rule_name=rule, field_path=field, message=msg))

    # Required fields
    if not draft.seller_name:
        err("required_seller_name", "seller_name", "Seller name is required")
    if not draft.seller_nip:
        err("required_seller_nip", "seller_nip", "Seller NIP is required")
    if not draft.buyer_name:
        err("required_buyer_name", "buyer_name", "Buyer name is required")
    if not draft.invoice_number:
        err("required_invoice_number", "invoice_number", "Invoice number is required")
    if not draft.issue_date:
        err("required_issue_date", "issue_date", "Issue date is required")

    if draft.gross_total is None or draft.gross_total <= 0:
        err("required_gross_total", "gross_total", "Gross total is required and must be greater than 0")

    # NIP checksum validation
    if draft.seller_nip and not validate_nip(draft.seller_nip):
        err("invalid_seller_nip", "seller_nip", f"Seller NIP '{draft.seller_nip}' has an invalid checksum or format")

    if draft.buyer_nip and not validate_nip(draft.buyer_nip):
        err("invalid_buyer_nip", "buyer_nip", f"Buyer NIP '{draft.buyer_nip}' has an invalid checksum or format")

    # Totals consistency: net + vat must equal gross (±0.02)
    if draft.gross_total is not None and draft.net_total is not None and draft.vat_total is not None:
        computed = draft.net_total + draft.vat_total
        if abs(computed - draft.gross_total) > Decimal("0.02"):
            err(
                "totals_mismatch",
                "gross_total",
                f"net_total ({draft.net_total}) + vat_total ({draft.vat_total}) = {computed} does not match gross_total ({draft.gross_total})",
            )

    # Line item net sum vs net_total (±0.02)
    if line_items and draft.net_total is not None:
        line_net_sum = sum(item.net_amount or Decimal("0") for item in line_items)
        if abs(line_net_sum - draft.net_total) > Decimal("0.02"):
            err(
                "line_items_total_mismatch",
                "net_total",
                f"Sum of line item net amounts ({line_net_sum}) does not match net_total ({draft.net_total})",
            )

    # Issue date must not be in the future
    if draft.issue_date is not None and draft.issue_date > date.today():
        err("invalid_issue_date", "issue_date", f"Issue date {draft.issue_date} is in the future")

    # Payment due date must be >= issue date
    if draft.payment_due_date is not None and draft.issue_date is not None:
        if draft.payment_due_date < draft.issue_date:
            err(
                "invalid_payment_date",
                "payment_due_date",
                f"Payment due date {draft.payment_due_date} is before issue date {draft.issue_date}",
            )

    # VAT rates must be 0, 5, 8, 23 or ZW/NP
    for i, item in enumerate(line_items):
        if item.vat_rate is None:
            continue
        try:
            rate_int = int(item.vat_rate)
            if rate_int not in VALID_VAT_RATES:
                err(
                    "invalid_vat_rate",
                    f"line_items[{i}].vat_rate",
                    f"VAT rate {item.vat_rate} is not a valid Polish VAT rate (0, 5, 8, 23, ZW, NP)",
                )
        except (InvalidOperation, ValueError):
            err(
                "invalid_vat_rate",
                f"line_items[{i}].vat_rate",
                f"VAT rate '{item.vat_rate}' is not a valid Polish VAT rate",
            )

    return errors
