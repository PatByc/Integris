from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.review_action import ReviewAction


async def insert(
    db: AsyncSession,
    document_id: UUID,
    user_id: UUID,
    action: str,
    diff: dict | None = None,
    notes: str | None = None,
) -> ReviewAction:
    review_action = ReviewAction(
        document_id=document_id,
        user_id=user_id,
        action=action,
        diff=diff,
        notes=notes,
    )
    db.add(review_action)
    await db.flush()
    await db.refresh(review_action)
    return review_action
