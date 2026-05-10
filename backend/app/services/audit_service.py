from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import AuditEvent


async def log(
    db: AsyncSession,
    company_id: UUID,
    event_type: str,
    user_id: UUID | None = None,
    document_id: UUID | None = None,
    metadata: dict | None = None,
) -> None:
    event = AuditEvent(
        company_id=company_id,
        event_type=event_type,
        user_id=user_id,
        document_id=document_id,
        event_metadata=metadata or {},
    )
    db.add(event)
    await db.flush()
