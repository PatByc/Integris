import uuid
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document
from app.models.invoice_draft import InvoiceDraft


async def create(
    db: AsyncSession,
    company_id: UUID,
    user_id: UUID,
    filename: str,
    storage_path: str,
    file_size_bytes: int,
    document_id: UUID | None = None,
) -> Document:
    doc = Document(
        id=document_id or uuid.uuid4(),
        company_id=company_id,
        uploaded_by=user_id,
        filename=filename,
        storage_path=storage_path,
        file_size_bytes=file_size_bytes,
        status="uploaded",
    )
    db.add(doc)
    await db.flush()
    await db.refresh(doc)
    return doc


async def list_by_company(
    db: AsyncSession,
    company_id: UUID,
    limit: int,
    offset: int,
    status: str | None = None,
    q: str | None = None,
) -> tuple[list[Document], int]:
    base = select(Document).where(Document.company_id == company_id)
    if status:
        base = base.where(Document.status == status)
    if q:
        pattern = f"%{q}%"
        base = base.outerjoin(
            InvoiceDraft, InvoiceDraft.document_id == Document.id
        ).where(
            or_(
                Document.filename.ilike(pattern),
                InvoiceDraft.seller_name.ilike(pattern),
                InvoiceDraft.buyer_name.ilike(pattern),
                InvoiceDraft.invoice_number.ilike(pattern),
                InvoiceDraft.seller_nip.ilike(pattern),
                InvoiceDraft.buyer_nip.ilike(pattern),
            )
        )

    total_result = await db.execute(
        select(func.count()).select_from(base.subquery())
    )
    total = total_result.scalar_one()

    result = await db.execute(
        base.order_by(Document.created_at.desc()).limit(limit).offset(offset)
    )
    items = list(result.scalars().all())
    return items, total


async def get_by_id(
    db: AsyncSession, document_id: UUID, company_id: UUID
) -> Document | None:
    result = await db.execute(
        select(Document).where(
            Document.id == document_id,
            Document.company_id == company_id,
        )
    )
    return result.scalar_one_or_none()
