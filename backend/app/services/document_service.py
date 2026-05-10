import uuid
from uuid import UUID

import httpx
from fastapi import HTTPException, UploadFile
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.document import Document
from app.repositories import document_repository
from app.services import audit_service

MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB


async def upload(
    db: AsyncSession,
    company_id: UUID,
    user_id: UUID,
    file: UploadFile,
) -> Document:
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=422, detail="Only PDF files are accepted")

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=422, detail="File exceeds the 25 MB limit")

    document_id = uuid.uuid4()
    filename = file.filename or f"{document_id}.pdf"
    storage_path = f"{company_id}/{document_id}/{filename}"

    await _upload_to_storage(storage_path, file_bytes)

    doc = await document_repository.create(
        db,
        company_id=company_id,
        user_id=user_id,
        filename=filename,
        storage_path=storage_path,
        file_size_bytes=len(file_bytes),
        document_id=document_id,
    )

    await audit_service.log(
        db,
        company_id=company_id,
        event_type="document.uploaded",
        user_id=user_id,
        document_id=doc.id,
        metadata={"filename": filename, "file_size_bytes": len(file_bytes)},
    )

    return doc


async def fetch_pdf_bytes(storage_path: str) -> bytes:
    url = (
        f"{settings.supabase_url}/storage/v1/object"
        f"/{settings.supabase_storage_bucket}/{storage_path}"
    )
    headers = {"Authorization": f"Bearer {settings.supabase_service_role_key}"}
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers, timeout=60.0)
    if response.status_code != 200:
        raise HTTPException(status_code=502, detail="Could not fetch PDF from storage")
    return response.content


async def delete_document(db: AsyncSession, document_id: UUID, company_id: UUID, storage_path: str) -> None:
    params = {"id": str(document_id)}
    await db.execute(text("DELETE FROM audit_events WHERE document_id = :id"), params)
    await db.execute(text("DELETE FROM review_actions WHERE document_id = :id"), params)
    await db.execute(text("DELETE FROM validation_errors WHERE document_id = :id"), params)
    await db.execute(text(
        "DELETE FROM invoice_line_items WHERE invoice_draft_id IN "
        "(SELECT id FROM invoice_drafts WHERE document_id = :id)"
    ), params)
    await db.execute(text("DELETE FROM invoice_drafts WHERE document_id = :id"), params)
    await db.execute(text("DELETE FROM ksef_submissions WHERE document_id = :id"), params)
    await db.execute(text("DELETE FROM xml_exports WHERE document_id = :id"), params)
    await db.execute(text("DELETE FROM ocr_results WHERE document_id = :id"), params)
    await db.execute(
        text("DELETE FROM documents WHERE id = :id AND company_id = :company_id"),
        {"id": str(document_id), "company_id": str(company_id)},
    )
    await _delete_from_storage(storage_path)


async def _upload_to_storage(storage_path: str, file_bytes: bytes) -> None:
    url = (
        f"{settings.supabase_url}/storage/v1/object"
        f"/{settings.supabase_storage_bucket}/{storage_path}"
    )
    headers = {
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "Content-Type": "application/pdf",
    }
    async with httpx.AsyncClient() as client:
        response = await client.post(url, content=file_bytes, headers=headers, timeout=60.0)
    if response.status_code not in (200, 201):
        raise HTTPException(status_code=502, detail="Storage upload failed")


async def _delete_from_storage(storage_path: str) -> None:
    url = (
        f"{settings.supabase_url}/storage/v1/object"
        f"/{settings.supabase_storage_bucket}/{storage_path}"
    )
    headers = {"Authorization": f"Bearer {settings.supabase_service_role_key}"}
    async with httpx.AsyncClient() as client:
        await client.delete(url, headers=headers, timeout=30.0)
