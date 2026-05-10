from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document
from app.models.ocr_result import OcrResult


async def get_latest_for_document(
    db: AsyncSession, document_id: UUID, company_id: UUID
) -> OcrResult | None:
    result = await db.execute(
        select(OcrResult)
        .join(Document, OcrResult.document_id == Document.id)
        .where(
            OcrResult.document_id == document_id,
            Document.company_id == company_id,
        )
        .order_by(OcrResult.created_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()
