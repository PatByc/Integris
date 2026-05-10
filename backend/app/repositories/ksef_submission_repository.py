from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ksef_submission import KsefSubmission


async def get_for_document(db: AsyncSession, document_id: UUID) -> KsefSubmission | None:
    result = await db.execute(
        select(KsefSubmission)
        .where(KsefSubmission.document_id == document_id)
        .order_by(KsefSubmission.created_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def get_accepted_for_document(db: AsyncSession, document_id: UUID) -> KsefSubmission | None:
    result = await db.execute(
        select(KsefSubmission)
        .where(
            KsefSubmission.document_id == document_id,
            KsefSubmission.status == "accepted",
        )
        .order_by(KsefSubmission.created_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()
