from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_membership, get_current_user
from app.core.database import get_db
from app.core.queue import enqueue_extraction_job, enqueue_ocr_job, enqueue_xml_job
from app.models.company import CompanyMembership
from app.models.document import AuditEvent
from app.repositories import invoice_draft_repository, validation_error_repository, xml_export_repository
from app.repositories.document_repository import get_by_id, list_by_company
from app.schemas.document_schema import DocumentListOut, DocumentOut
from app.schemas.invoice_draft_schema import InvoiceDraftOut, InvoiceDraftUpdate, LineItemOut
from app.schemas.validation_error_schema import ValidationErrorOut
from app.services import audit_service, document_service, invoice_review_service
from app.services.company_service import ensure_profile


class AuditEventOut(BaseModel):
    event_type: str
    created_at: datetime
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
    doc = await document_service.upload(
        db,
        company_id=membership.company_id,
        user_id=user["user_id"],
        file=file,
    )
    await db.commit()
    enqueue_ocr_job(doc.id)
    return DocumentOut.model_validate(doc)


@router.get("", response_model=DocumentListOut)
async def list_documents(
    membership: Annotated[CompanyMembership, Depends(get_current_membership)],
    db: AsyncSession = Depends(get_db),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> DocumentListOut:
    items, total = await list_by_company(db, membership.company_id, limit=limit, offset=offset)
    return DocumentListOut(
        items=[DocumentOut.model_validate(d) for d in items],
        total=total,
    )


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
