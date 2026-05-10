import logging
import os
from uuid import UUID

from workers.base_worker import BaseWorker
from workers.db import (
    get_connection,
    get_document,
    get_ksef_submission_for_document,
    get_xml_export_for_document,
    insert_audit_event,
    insert_ksef_submission,
    update_document_status,
    update_ksef_submission,
)
from workers.ksef_client import KsefClient, KsefError
from workers.queue import KSEF_QUEUE

logger = logging.getLogger(__name__)


class KsefSubmissionWorker(BaseWorker):
    def __init__(self) -> None:
        super().__init__(KSEF_QUEUE)

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

            if doc["status"] != "xml_generated":
                logger.warning(
                    "Document %s not in xml_generated status (status=%s), skipping",
                    document_id,
                    doc["status"],
                )
                return

            # Idempotency: skip if already submitted/accepted
            existing = get_ksef_submission_for_document(conn, document_id)
            if existing and existing["status"] in ("submitted", "accepted"):
                logger.info("Document %s already submitted (status=%s), skipping", document_id, existing["status"])
                return

            xml_export = get_xml_export_for_document(conn, document_id)
            if xml_export is None:
                raise ValueError("No XML export found for document")

            xml_bytes = xml_export["xml_content"].encode("utf-8")
            xml_export_id = str(xml_export["id"])

            update_document_status(conn, document_id, "submission_pending")
            conn.commit()

            submission_id = insert_ksef_submission(conn, document_id, xml_export_id)
            conn.commit()

            try:
                client = KsefClient(
                    api_url=os.environ.get("KSEF_API_URL", ""),
                    nip=os.environ.get("KSEF_CLIENT_ID", ""),
                    token=os.environ.get("KSEF_CLIENT_SECRET", ""),
                    public_key_pem=os.environ.get("KSEF_PUBLIC_KEY_PEM", ""),
                )
                client.authenticate()
                client.open_session()
                try:
                    ksef_ref = client.submit_invoice(xml_bytes)
                finally:
                    client.close_session()
                    client.close()

                update_ksef_submission(
                    conn,
                    submission_id,
                    status="submitted",
                    ksef_reference_id=ksef_ref,
                    response_payload={"referenceNumber": ksef_ref},
                )
                update_document_status(conn, document_id, "submitted")
                conn.commit()

                insert_audit_event(
                    conn,
                    document_id,
                    company_id,
                    "ksef.submission.succeeded",
                    {"ksef_reference_id": ksef_ref},
                )
                conn.commit()
                logger.info("Invoice submitted to KSeF for document %s (ref=%s)", document_id, ksef_ref)

            except Exception as exc:
                error_msg = str(exc)
                update_ksef_submission(
                    conn,
                    submission_id,
                    status="rejected",
                    error_details={"error": error_msg, "attempt": attempt},
                )
                update_document_retry_count_local(conn, document_id, attempt)
                conn.commit()

                if attempt >= self.MAX_RETRIES:
                    update_document_status(conn, document_id, "rejected")
                    insert_audit_event(
                        conn,
                        document_id,
                        company_id,
                        "ksef.submission.failed",
                        {"error": error_msg, "attempt": attempt},
                    )
                    conn.commit()
                raise

        finally:
            conn.close()


def update_document_retry_count_local(conn, document_id: UUID, count: int) -> None:
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE documents SET retry_count = %s, updated_at = NOW() WHERE id = %s",
            (count, str(document_id)),
        )


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    KsefSubmissionWorker().run()
