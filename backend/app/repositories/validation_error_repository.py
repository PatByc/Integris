from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.validation_error import ValidationError


async def get_for_document(
    db: AsyncSession, document_id: UUID
) -> list[ValidationError]:
    result = await db.execute(
        select(ValidationError)
        .where(ValidationError.document_id == document_id)
        .order_by(ValidationError.created_at)
    )
    return list(result.scalars().all())


async def delete_for_draft(db: AsyncSession, invoice_draft_id: UUID) -> None:
    await db.execute(
        delete(ValidationError).where(ValidationError.invoice_draft_id == invoice_draft_id)
    )


async def bulk_insert(
    db: AsyncSession,
    errors: list,
    document_id: UUID,
    invoice_draft_id: UUID,
) -> None:
    for e in errors:
        db.add(ValidationError(
            document_id=document_id,
            invoice_draft_id=invoice_draft_id,
            rule_name=e.rule_name,
            field_path=e.field_path,
            message=e.message,
        ))
