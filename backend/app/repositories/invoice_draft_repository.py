from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.invoice_draft import InvoiceDraft, InvoiceLineItem


async def get_for_document(
    db: AsyncSession, document_id: UUID, company_id: UUID
) -> InvoiceDraft | None:
    result = await db.execute(
        select(InvoiceDraft)
        .where(
            InvoiceDraft.document_id == document_id,
            InvoiceDraft.company_id == company_id,
        )
        .order_by(InvoiceDraft.created_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def get_line_items(
    db: AsyncSession, invoice_draft_id: UUID
) -> list[InvoiceLineItem]:
    result = await db.execute(
        select(InvoiceLineItem)
        .where(InvoiceLineItem.invoice_draft_id == invoice_draft_id)
        .order_by(InvoiceLineItem.sort_order)
    )
    return list(result.scalars().all())
