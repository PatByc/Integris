from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_membership, get_current_user
from app.core.database import get_db
from app.models.company import CompanyMembership
from app.models.document import AuditEvent, Document

router = APIRouter(prefix="/notifications", tags=["notifications"])

NOTIF_LABELS: dict[str, str] = {
    "document.uploaded":          "Invoice uploaded",
    "ocr.started":                "OCR started",
    "ocr.succeeded":              "OCR completed",
    "ocr.failed":                 "OCR failed",
    "ocr.retry_requested":        "OCR retry requested",
    "extraction.started":         "Data extraction started",
    "extraction.succeeded":       "Data extracted",
    "extraction.failed":          "Extraction failed",
    "extraction.retry_requested": "Extraction retry requested",
    "review.approved":            "Invoice approved",
    "xml_generation.succeeded":   "XML generated",
    "xml_generation.failed":      "XML generation failed",
    "ksef.submission.requested":  "KSeF submission requested",
    "ksef.submission.succeeded":  "Submitted to KSeF",
    "ksef.submission.failed":     "KSeF submission failed",
    "ksef.upo.accepted":          "Accepted by KSeF",
    "ksef.upo.rejected":          "Rejected by KSeF",
}


class NotificationItem(BaseModel):
    event_type: str
    label: str
    document_id: UUID | None
    document_filename: str | None
    created_at: datetime
    is_unread: bool
    model_config = ConfigDict(from_attributes=True)


class NotificationsOut(BaseModel):
    unread_count: int
    items: list[NotificationItem]


@router.get("", response_model=NotificationsOut)
async def list_notifications(
    user: Annotated[dict, Depends(get_current_user)],
    membership: Annotated[CompanyMembership, Depends(get_current_membership)],
    db: AsyncSession = Depends(get_db),
) -> NotificationsOut:
    result = await db.execute(
        text("SELECT last_read_at FROM notification_reads WHERE user_id = :uid"),
        {"uid": str(user["user_id"])},
    )
    row = result.fetchone()
    last_read_at: datetime | None = row[0] if row else None

    result = await db.execute(
        select(AuditEvent, Document.filename)
        .outerjoin(Document, AuditEvent.document_id == Document.id)
        .where(AuditEvent.company_id == membership.company_id)
        .order_by(AuditEvent.created_at.desc())
        .limit(20)
    )
    rows = result.all()

    items = []
    unread_count = 0
    for event, filename in rows:
        is_unread = last_read_at is None or event.created_at > last_read_at
        if is_unread:
            unread_count += 1
        items.append(NotificationItem(
            event_type=event.event_type,
            label=NOTIF_LABELS.get(event.event_type, event.event_type),
            document_id=event.document_id,
            document_filename=filename,
            created_at=event.created_at,
            is_unread=is_unread,
        ))

    return NotificationsOut(unread_count=unread_count, items=items)


@router.post("/read", status_code=204)
async def mark_all_read(
    user: Annotated[dict, Depends(get_current_user)],
    membership: Annotated[CompanyMembership, Depends(get_current_membership)],
    db: AsyncSession = Depends(get_db),
) -> Response:
    await db.execute(
        text("""
            INSERT INTO notification_reads (user_id, last_read_at)
            VALUES (:uid, NOW())
            ON CONFLICT (user_id) DO UPDATE SET last_read_at = NOW()
        """),
        {"uid": str(user["user_id"])},
    )
    await db.commit()
    return Response(status_code=204)
