from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.invoice_draft import InvoiceDraft, InvoiceLineItem
from app.repositories import (
    invoice_draft_repository,
    review_action_repository,
    validation_error_repository,
)
from app.repositories.document_repository import get_by_id
from app.schemas.invoice_draft_schema import InvoiceDraftUpdate
from app.services import audit_service, invoice_validation_service

_REVIEW_STATUSES = {"needs_review", "validation_failed"}
_DRAFT_FIELDS = [
    "seller_name", "seller_nip", "seller_address",
    "buyer_name", "buyer_nip", "buyer_address",
    "invoice_number", "issue_date", "sale_date", "payment_due_date",
    "payment_method", "currency",
    "net_total", "vat_total", "gross_total",
]


async def update_draft(
    db: AsyncSession,
    document_id: UUID,
    company_id: UUID,
    user_id: UUID,
    update: InvoiceDraftUpdate,
) -> tuple[InvoiceDraft, list[InvoiceLineItem], list]:
    draft = await invoice_draft_repository.get_for_document(db, document_id, company_id)
    if draft is None:
        raise HTTPException(status_code=404, detail="Invoice draft not found")

    # Apply non-None header fields and track diff
    diff: dict = {}
    for field in _DRAFT_FIELDS:
        new_val = getattr(update, field)
        if new_val is not None:
            old_val = getattr(draft, field)
            if str(old_val) != str(new_val):
                diff[field] = {"from": str(old_val), "to": str(new_val)}
            setattr(draft, field, new_val)

    draft.updated_at = datetime.now(timezone.utc)

    # Replace line items if provided
    if update.line_items is not None:
        await db.execute(
            delete(InvoiceLineItem).where(InvoiceLineItem.invoice_draft_id == draft.id)
        )
        line_items: list[InvoiceLineItem] = []
        for i, item in enumerate(update.line_items):
            li = InvoiceLineItem(
                invoice_draft_id=draft.id,
                description=item.description,
                quantity=item.quantity,
                unit=item.unit,
                unit_price_net=item.unit_price_net,
                vat_rate=item.vat_rate,
                net_amount=item.net_amount,
                vat_amount=item.vat_amount,
                gross_amount=item.gross_amount,
                sort_order=item.sort_order,
            )
            db.add(li)
            line_items.append(li)
    else:
        line_items = await invoice_draft_repository.get_line_items(db, draft.id)

    await db.flush()

    # Re-validate and replace errors
    await validation_error_repository.delete_for_draft(db, draft.id)
    new_errors = invoice_validation_service.validate_draft(draft, line_items)
    await validation_error_repository.bulk_insert(db, new_errors, document_id, draft.id)

    # Log correction action
    await review_action_repository.insert(
        db, document_id, user_id, "correction", diff=diff or None
    )

    await db.commit()
    await db.refresh(draft)

    if update.line_items is not None:
        line_items = await invoice_draft_repository.get_line_items(db, draft.id)

    updated_errors = await validation_error_repository.get_for_document(db, document_id)
    return draft, line_items, updated_errors


async def approve(
    db: AsyncSession,
    document_id: UUID,
    company_id: UUID,
    user_id: UUID,
    membership_role: str,
) -> InvoiceDraft:
    if membership_role == "viewer":
        raise HTTPException(status_code=403, detail="Viewers cannot approve invoices")

    doc = await get_by_id(db, document_id=document_id, company_id=company_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.status not in _REVIEW_STATUSES:
        raise HTTPException(
            status_code=422,
            detail=f"Document must be in needs_review or validation_failed status (current: {doc.status})",
        )

    draft = await invoice_draft_repository.get_for_document(db, document_id, company_id)
    if draft is None:
        raise HTTPException(status_code=422, detail="No invoice draft found for this document")

    line_items = await invoice_draft_repository.get_line_items(db, draft.id)
    errors = invoice_validation_service.validate_draft(draft, line_items)
    if errors:
        raise HTTPException(
            status_code=422,
            detail=f"Resolve all validation errors before approving ({len(errors)} error(s) remaining)",
        )

    doc.status = "approved"
    await db.flush()

    await review_action_repository.insert(db, document_id, user_id, "approval")
    await audit_service.log(
        db,
        company_id=company_id,
        event_type="review.approved",
        user_id=user_id,
        document_id=document_id,
        metadata={},
    )

    await db.commit()
    await db.refresh(doc)
    return doc
