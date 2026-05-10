import logging
import os
from uuid import UUID

import httpx
from google.cloud import vision

from workers.base_worker import BaseWorker
from workers.db import (
    get_connection,
    get_document,
    insert_audit_event,
    insert_ocr_result,
    update_document_retry_count,
    update_document_status,
)
from workers.queue import OCR_QUEUE, enqueue_extraction_job

logger = logging.getLogger(__name__)


class OcrWorker(BaseWorker):
    def __init__(self) -> None:
        super().__init__(OCR_QUEUE)

    def handle(self, job: dict) -> None:
        document_id = UUID(job["document_id"])
        attempt = job.get("_attempt", 1)

        conn = get_connection()
        try:
            doc = get_document(conn, document_id)
            if doc is None:
                logger.error("Document not found: %s", document_id)
                return

            company_id = doc["company_id"]
            storage_path = doc["storage_path"]

            if attempt == 1:
                update_document_status(conn, document_id, "ocr_processing")
                update_document_retry_count(conn, document_id, 0)
                conn.commit()
                insert_audit_event(conn, document_id, company_id, "ocr.started", {})
                conn.commit()

            try:
                raw_text, page_count = _run_ocr(storage_path)
                insert_ocr_result(conn, document_id, raw_text, page_count, "google_vision", attempt, None)
                update_document_status(conn, document_id, "extraction_processing")
                conn.commit()
                insert_audit_event(
                    conn, document_id, company_id, "ocr.succeeded", {"page_count": page_count}
                )
                conn.commit()
                enqueue_extraction_job(document_id)
            except Exception as exc:
                error_message = str(exc)
                insert_ocr_result(
                    conn, document_id, None, None, "google_vision", attempt, error_message
                )
                update_document_retry_count(conn, document_id, attempt)
                conn.commit()
                if attempt >= self.MAX_RETRIES:
                    update_document_status(conn, document_id, "ocr_failed")
                    conn.commit()
                    insert_audit_event(
                        conn,
                        document_id,
                        company_id,
                        "ocr.failed",
                        {"error": error_message, "attempt": attempt},
                    )
                    conn.commit()
                raise
        finally:
            conn.close()


def _run_ocr(storage_path: str) -> tuple[str, int]:
    pdf_bytes = _download_from_storage(storage_path)

    client = vision.ImageAnnotatorClient()
    input_config = vision.InputConfig(
        content=pdf_bytes,
        mime_type="application/pdf",
    )
    feature = vision.Feature(type_=vision.Feature.Type.DOCUMENT_TEXT_DETECTION)
    request = vision.AnnotateFileRequest(
        input_config=input_config,
        features=[feature],
    )
    response = client.batch_annotate_files(requests=[request])

    text_parts: list[str] = []
    page_count = 0
    for file_response in response.responses:
        for page_response in file_response.responses:
            if page_response.full_text_annotation:
                text_parts.append(page_response.full_text_annotation.text)
            page_count += 1

    return "\n".join(text_parts), page_count


def _download_from_storage(storage_path: str) -> bytes:
    supabase_url = os.environ["SUPABASE_URL"]
    service_role_key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    bucket = os.environ.get("SUPABASE_STORAGE_BUCKET", "invoices")

    url = f"{supabase_url}/storage/v1/object/{bucket}/{storage_path}"
    with httpx.Client(timeout=60.0) as client:
        response = client.get(url, headers={"Authorization": f"Bearer {service_role_key}"})
    response.raise_for_status()
    return response.content


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    OcrWorker().run()
