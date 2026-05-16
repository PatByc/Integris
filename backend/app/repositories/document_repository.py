import uuid
from datetime import date, timedelta
from uuid import UUID

from sqlalchemy import Date as SADate, cast, func, or_, select
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


async def get_stats(db: AsyncSession, company_id: UUID) -> dict:
    r1 = await db.execute(
        select(func.count()).where(Document.company_id == company_id, Document.status == "needs_review")
    )
    pending_review: int = r1.scalar_one()

    r2 = await db.execute(
        select(func.count(), func.coalesce(func.sum(InvoiceDraft.gross_total), 0))
        .select_from(Document)
        .outerjoin(InvoiceDraft, InvoiceDraft.document_id == Document.id)
        .where(Document.company_id == company_id, Document.status == "xml_generated")
    )
    awaiting_count, awaiting_total = r2.one()

    r3a = await db.execute(
        select(func.count())
        .where(Document.company_id == company_id)
        .where(~Document.status.in_(["uploaded", "ocr_processing"]))
    )
    ocr_attempted: int = r3a.scalar_one()

    r3b = await db.execute(
        select(func.count())
        .where(Document.company_id == company_id, Document.status == "ocr_failed")
    )
    ocr_failed: int = r3b.scalar_one()
    ocr_rate = round((ocr_attempted - ocr_failed) / ocr_attempted, 4) if ocr_attempted else None

    return {
        "pending_review": pending_review,
        "awaiting_submission": int(awaiting_count),
        "awaiting_submission_gross_total": float(awaiting_total),
        "ocr_success_rate": ocr_rate,
    }


async def get_bento_stats(db: AsyncSession, company_id: UUID) -> dict:
    today = date.today()
    week_ago = today - timedelta(days=6)

    # Docs uploaded per day for the last 7 days
    r_days = await db.execute(
        select(
            cast(Document.created_at, SADate).label("day"),
            func.count().label("count"),
        )
        .where(Document.company_id == company_id, Document.created_at >= week_ago)
        .group_by(cast(Document.created_at, SADate))
    )
    day_map = {str(row.day): row.count for row in r_days}
    docs_per_day = [
        {"date": str(today - timedelta(days=i)), "count": day_map.get(str(today - timedelta(days=i)), 0)}
        for i in range(6, -1, -1)
    ]

    # Count of documents per status
    r_status = await db.execute(
        select(Document.status, func.count().label("count"))
        .where(Document.company_id == company_id)
        .group_by(Document.status)
    )
    status_breakdown = {row.status: row.count for row in r_status}

    # Total PDF storage used (summed from file_size_bytes stored at upload time)
    r_storage = await db.execute(
        select(func.coalesce(func.sum(Document.file_size_bytes), 0))
        .where(Document.company_id == company_id)
    )
    storage_bytes = int(r_storage.scalar_one())

    return {
        "docs_per_day": docs_per_day,
        "status_breakdown": status_breakdown,
        "storage_bytes": storage_bytes,
    }


async def list_by_company(
    db: AsyncSession,
    company_id: UUID,
    limit: int,
    offset: int,
    status: str | None = None,
    q: str | None = None,
    date_from: date | None = None,
) -> tuple[list[Document], int]:
    base = select(Document).where(Document.company_id == company_id)
    if status:
        base = base.where(Document.status == status)
    if date_from:
        base = base.where(Document.created_at >= date_from)
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
