import os
from datetime import date, datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile
from fastapi.responses import Response, JSONResponse
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_membership, get_current_user
from app.core.database import get_db
from app.core.queue import enqueue_extraction_job, enqueue_ksef_submission_job, enqueue_ocr_job, enqueue_xml_job
from app.models.company import CompanyMembership
from app.models.document import AuditEvent
from app.repositories import invoice_draft_repository, ksef_submission_repository, validation_error_repository, xml_export_repository
from app.repositories import document_repository as doc_repo
from app.repositories.company_repository import check_upload_limit, increment_upload_count
from app.repositories.document_repository import get_by_id, list_by_company
from app.schemas.document_schema import DocumentListOut, DocumentOut
from app.schemas.invoice_draft_schema import InvoiceDraftOut, InvoiceDraftUpdate, LineItemOut
from app.schemas.validation_error_schema import ValidationErrorOut
from app.services import audit_service, document_service, invoice_review_service
from app.services.company_service import ensure_profile


class DashboardStatsOut(BaseModel):
    pending_review: int
    awaiting_submission: int
    awaiting_submission_gross_total: float
    ocr_success_rate: float | None


class BentoStatsOut(BaseModel):
    docs_per_day: list[dict]
    status_breakdown: dict[str, int]
    storage_bytes: int
    storage_quota_bytes: int


class ValidationQueueItemOut(BaseModel):
    id: UUID
    filename: str
    status: str
    seller_name: str | None
    confidence: float | None
    error_count: int
    first_error_rule: str | None
    created_at: datetime


class ValidationQueueOut(BaseModel):
    items: list[ValidationQueueItemOut]
    pending_count: int
    total_errors: int
    avg_confidence: float | None
    error_free_count: int


class AuditEventOut(BaseModel):
    event_type: str
    created_at: datetime
    user_id: UUID | None = None
    event_metadata: dict = {}
    model_config = ConfigDict(from_attributes=True)

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload", response_model=DocumentOut, status_code=201)
async def upload_document(
    file: UploadFile,
    user: Annotated[dict, Depends(get_current_user)],
    membership: Annotated[CompanyMembership, Depends(get_current_membership)],
    db: AsyncSession = Depends(get_db),
) -> DocumentOut:
    await ensure_profile(db, user["user_id"], user["email"])
    used, limit, is_at_limit = await check_upload_limit(db, membership.company_id)
    if is_at_limit:
        raise HTTPException(status_code=403, detail="upload_limit_reached")
    doc = await document_service.upload(
        db,
        company_id=membership.company_id,
        user_id=user["user_id"],
        file=file,
    )
    await increment_upload_count(db, membership.company_id)
    await db.commit()
    enqueue_ocr_job(doc.id)
    return DocumentOut.model_validate(doc)


@router.get("/validation-queue", response_model=ValidationQueueOut)
async def get_validation_queue(
    membership: Annotated[CompanyMembership, Depends(get_current_membership)],
    db: AsyncSession = Depends(get_db),
) -> ValidationQueueOut:
    data = await doc_repo.get_validation_queue(db, membership.company_id)
    return ValidationQueueOut(**data)


@router.get("/bento-stats", response_model=BentoStatsOut)
async def get_bento_stats(
    membership: Annotated[CompanyMembership, Depends(get_current_membership)],
    db: AsyncSession = Depends(get_db),
) -> BentoStatsOut:
    data = await doc_repo.get_bento_stats(db, membership.company_id)
    quota = int(os.getenv("STORAGE_QUOTA_BYTES", str(1024 ** 3)))
    return BentoStatsOut(**data, storage_quota_bytes=quota)


@router.get("/stats", response_model=DashboardStatsOut)
async def get_dashboard_stats(
    membership: Annotated[CompanyMembership, Depends(get_current_membership)],
    db: AsyncSession = Depends(get_db),
) -> DashboardStatsOut:
    data = await doc_repo.get_stats(db, membership.company_id)
    return DashboardStatsOut(**data)


@router.get("", response_model=DocumentListOut)
async def list_documents(
    membership: Annotated[CompanyMembership, Depends(get_current_membership)],
    db: AsyncSession = Depends(get_db),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    status: str | None = Query(default=None),
    q: str | None = Query(default=None),
    date_from: date | None = Query(default=None),
) -> DocumentListOut:
    items, total = await list_by_company(
        db, membership.company_id,
        limit=limit, offset=offset, status=status, q=q, date_from=date_from,
    )
    return DocumentListOut(
        items=[DocumentOut.model_validate(d) for d in items],
        total=total,
    )


@router.delete("/{document_id}", status_code=204)
async def delete_document(
    document_id: UUID,
    user: Annotated[dict, Depends(get_current_user)],
    membership: Annotated[CompanyMembership, Depends(get_current_membership)],
    db: AsyncSession = Depends(get_db),
) -> Response:
    doc = await get_by_id(db, document_id=document_id, company_id=membership.company_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    await document_service.delete_document(db, document_id, membership.company_id, doc.storage_path)
    await db.commit()
    return Response(status_code=204)


@router.get("/{document_id}", response_model=DocumentOut)
async def get_document(
    document_id: UUID,
    membership: Annotated[CompanyMembership, Depends(get_current_membership)],
    db: AsyncSession = Depends(get_db),
) -> DocumentOut:
    doc = await get_by_id(db, document_id=document_id, company_id=membership.company_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocumentOut.model_validate(doc)


@router.post("/{document_id}/retry-ocr", response_model=DocumentOut)
async def retry_ocr(
    document_id: UUID,
    user: Annotated[dict, Depends(get_current_user)],
    membership: Annotated[CompanyMembership, Depends(get_current_membership)],
    db: AsyncSession = Depends(get_db),
) -> DocumentOut:
    doc = await get_by_id(db, document_id=document_id, company_id=membership.company_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.status != "ocr_failed":
        raise HTTPException(status_code=422, detail="Document is not in ocr_failed status")

    doc.status = "uploaded"
    doc.retry_count = 0
    await db.flush()

    await audit_service.log(
        db,
        company_id=membership.company_id,
        event_type="ocr.retry_requested",
        user_id=user["user_id"],
        document_id=doc.id,
        metadata={},
    )

    await db.commit()
    await db.refresh(doc)
    enqueue_ocr_job(doc.id)
    return DocumentOut.model_validate(doc)


@router.get("/{document_id}/draft", response_model=InvoiceDraftOut)
async def get_draft(
    document_id: UUID,
    membership: Annotated[CompanyMembership, Depends(get_current_membership)],
    db: AsyncSession = Depends(get_db),
) -> InvoiceDraftOut:
    doc = await get_by_id(db, document_id=document_id, company_id=membership.company_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    draft = await invoice_draft_repository.get_for_document(db, document_id, membership.company_id)
    if draft is None:
        raise HTTPException(status_code=404, detail="Invoice draft not found")
    line_items = await invoice_draft_repository.get_line_items(db, draft.id)
    out = InvoiceDraftOut.model_validate(draft)
    out.line_items = [LineItemOut.model_validate(li) for li in line_items]
    return out


@router.patch("/{document_id}/draft", response_model=InvoiceDraftOut)
async def update_draft(
    document_id: UUID,
    body: InvoiceDraftUpdate,
    user: Annotated[dict, Depends(get_current_user)],
    membership: Annotated[CompanyMembership, Depends(get_current_membership)],
    db: AsyncSession = Depends(get_db),
) -> InvoiceDraftOut:
    draft, line_items, _ = await invoice_review_service.update_draft(
        db,
        document_id=document_id,
        company_id=membership.company_id,
        user_id=user["user_id"],
        update=body,
    )
    out = InvoiceDraftOut.model_validate(draft)
    out.line_items = [LineItemOut.model_validate(li) for li in line_items]
    return out


@router.post("/{document_id}/approve", response_model=DocumentOut)
async def approve_document(
    document_id: UUID,
    user: Annotated[dict, Depends(get_current_user)],
    membership: Annotated[CompanyMembership, Depends(get_current_membership)],
    db: AsyncSession = Depends(get_db),
) -> DocumentOut:
    doc = await invoice_review_service.approve(
        db,
        document_id=document_id,
        company_id=membership.company_id,
        user_id=user["user_id"],
        membership_role=membership.role,
    )
    enqueue_xml_job(doc.id)
    return DocumentOut.model_validate(doc)


@router.get("/{document_id}/pdf")
async def get_pdf(
    document_id: UUID,
    membership: Annotated[CompanyMembership, Depends(get_current_membership)],
    db: AsyncSession = Depends(get_db),
) -> Response:
    doc = await get_by_id(db, document_id=document_id, company_id=membership.company_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    pdf_bytes = await document_service.fetch_pdf_bytes(doc.storage_path)
    return Response(content=pdf_bytes, media_type="application/pdf")


@router.get("/{document_id}/validation-errors", response_model=list[ValidationErrorOut])
async def get_validation_errors(
    document_id: UUID,
    membership: Annotated[CompanyMembership, Depends(get_current_membership)],
    db: AsyncSession = Depends(get_db),
) -> list[ValidationErrorOut]:
    doc = await get_by_id(db, document_id=document_id, company_id=membership.company_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    errors = await validation_error_repository.get_for_document(db, document_id)
    return [ValidationErrorOut.model_validate(e) for e in errors]


_XML_READY_STATUSES = {"xml_generated", "submission_pending", "submitted", "accepted"}


@router.get("/{document_id}/xml-export")
async def download_xml_export(
    document_id: UUID,
    membership: Annotated[CompanyMembership, Depends(get_current_membership)],
    db: AsyncSession = Depends(get_db),
) -> Response:
    doc = await get_by_id(db, document_id=document_id, company_id=membership.company_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.status not in _XML_READY_STATUSES:
        raise HTTPException(status_code=404, detail="XML not yet generated")
    xml_export = await xml_export_repository.get_for_document(db, document_id)
    if xml_export is None:
        raise HTTPException(status_code=404, detail="XML export not found")
    return Response(
        content=xml_export.xml_content.encode("utf-8"),
        media_type="application/xml",
        headers={"Content-Disposition": f'attachment; filename="invoice_{document_id}.xml"'},
    )


@router.get("/{document_id}/history", response_model=list[AuditEventOut])
async def get_document_history(
    document_id: UUID,
    membership: Annotated[CompanyMembership, Depends(get_current_membership)],
    db: AsyncSession = Depends(get_db),
) -> list[AuditEventOut]:
    doc = await get_by_id(db, document_id=document_id, company_id=membership.company_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    result = await db.execute(
        select(AuditEvent)
        .where(AuditEvent.document_id == document_id)
        .order_by(AuditEvent.created_at)
    )
    events = result.scalars().all()
    return [AuditEventOut.model_validate(e) for e in events]


@router.post("/{document_id}/submit", response_model=DocumentOut)
async def submit_to_ksef(
    document_id: UUID,
    user: Annotated[dict, Depends(get_current_user)],
    membership: Annotated[CompanyMembership, Depends(get_current_membership)],
    db: AsyncSession = Depends(get_db),
) -> DocumentOut:
    doc = await get_by_id(db, document_id=document_id, company_id=membership.company_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.status != "xml_generated":
        raise HTTPException(status_code=422, detail="Document must be in xml_generated status to submit")

    await audit_service.log(
        db,
        company_id=membership.company_id,
        event_type="ksef.submission.requested",
        user_id=user["user_id"],
        document_id=doc.id,
        metadata={},
    )
    await db.commit()
    await db.refresh(doc)
    enqueue_ksef_submission_job(doc.id)
    return DocumentOut.model_validate(doc)


@router.get("/{document_id}/upo")
async def get_upo(
    document_id: UUID,
    membership: Annotated[CompanyMembership, Depends(get_current_membership)],
    db: AsyncSession = Depends(get_db),
) -> dict:
    doc = await get_by_id(db, document_id=document_id, company_id=membership.company_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.status != "accepted":
        raise HTTPException(status_code=404, detail="UPO not available")
    submission = await ksef_submission_repository.get_accepted_for_document(db, document_id)
    if submission is None or not submission.upo_url:
        raise HTTPException(status_code=404, detail="UPO not available (dry run mode)")
    return {"upo_url": submission.upo_url}


@router.post("/{document_id}/retry-submission", response_model=DocumentOut)
async def retry_submission(
    document_id: UUID,
    user: Annotated[dict, Depends(get_current_user)],
    membership: Annotated[CompanyMembership, Depends(get_current_membership)],
    db: AsyncSession = Depends(get_db),
) -> DocumentOut:
    doc = await get_by_id(db, document_id=document_id, company_id=membership.company_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.status != "rejected":
        raise HTTPException(status_code=422, detail="Document is not in rejected status")

    doc.status = "xml_generated"
    doc.retry_count = 0
    await db.flush()

    await audit_service.log(
        db,
        company_id=membership.company_id,
        event_type="ksef.submission.requested",
        user_id=user["user_id"],
        document_id=doc.id,
        metadata={"retry": True},
    )

    await db.commit()
    await db.refresh(doc)
    enqueue_ksef_submission_job(doc.id)
    return DocumentOut.model_validate(doc)


@router.post("/{document_id}/retry-extraction", response_model=DocumentOut)
async def retry_extraction(
    document_id: UUID,
    user: Annotated[dict, Depends(get_current_user)],
    membership: Annotated[CompanyMembership, Depends(get_current_membership)],
    db: AsyncSession = Depends(get_db),
) -> DocumentOut:
    doc = await get_by_id(db, document_id=document_id, company_id=membership.company_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.status != "extraction_failed":
        raise HTTPException(status_code=422, detail="Document is not in extraction_failed status")

    doc.status = "extraction_processing"
    doc.retry_count = 0
    await db.flush()

    await audit_service.log(
        db,
        company_id=membership.company_id,
        event_type="extraction.retry_requested",
        user_id=user["user_id"],
        document_id=doc.id,
        metadata={},
    )

    await db.commit()
    await db.refresh(doc)
    enqueue_extraction_job(doc.id)
    return DocumentOut.model_validate(doc)
