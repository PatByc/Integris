from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class LineItemOut(BaseModel):
    id: UUID
    description: str | None
    quantity: Decimal | None
    unit: str | None
    unit_price_net: Decimal | None
    vat_rate: Decimal | None
    net_amount: Decimal | None
    vat_amount: Decimal | None
    gross_amount: Decimal | None
    sort_order: int

    model_config = {"from_attributes": True}


class InvoiceDraftOut(BaseModel):
    id: UUID
    document_id: UUID
    seller_name: str | None
    seller_nip: str | None
    seller_address: str | None
    buyer_name: str | None
    buyer_nip: str | None
    buyer_address: str | None
    invoice_number: str | None
    issue_date: date | None
    sale_date: date | None
    payment_due_date: date | None
    payment_method: str | None
    currency: str | None
    net_total: Decimal | None
    vat_total: Decimal | None
    gross_total: Decimal | None
    vat_summary: list | None
    confidence: Decimal | None
    flags: list | None
    created_at: datetime
    line_items: list[LineItemOut] = []

    model_config = {"from_attributes": True}


class LineItemUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID | None = None
    description: str | None = None
    quantity: Decimal | None = None
    unit: str | None = None
    unit_price_net: Decimal | None = None
    vat_rate: Decimal | None = None
    net_amount: Decimal | None = None
    vat_amount: Decimal | None = None
    gross_amount: Decimal | None = None
    sort_order: int = 0


class InvoiceDraftUpdate(BaseModel):
    seller_name: str | None = None
    seller_nip: str | None = None
    seller_address: str | None = None
    buyer_name: str | None = None
    buyer_nip: str | None = None
    buyer_address: str | None = None
    invoice_number: str | None = None
    issue_date: date | None = None
    sale_date: date | None = None
    payment_due_date: date | None = None
    payment_method: str | None = None
    currency: str | None = None
    net_total: Decimal | None = None
    vat_total: Decimal | None = None
    gross_total: Decimal | None = None
    line_items: list[LineItemUpdate] | None = None
