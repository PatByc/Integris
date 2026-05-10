from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.xml_export import XmlExport


async def get_for_document(db: AsyncSession, document_id: UUID) -> XmlExport | None:
    result = await db.execute(
        select(XmlExport)
        .where(XmlExport.document_id == document_id)
        .order_by(XmlExport.created_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()
