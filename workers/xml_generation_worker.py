import hashlib
import logging
from uuid import UUID

from workers.base_worker import BaseWorker
from workers.db import (
    get_connection,
    get_document,
    get_invoice_draft_for_document,
    get_invoice_line_items_for_draft,
    insert_audit_event,
    insert_xml_export,
    update_document_retry_count,
    update_document_status,
)
from workers.fa3_xml import generate_fa3_xml
from workers.queue import XML_QUEUE

logger = logging.getLogger(__name__)


class XmlGenerationWorker(BaseWorker):
    def __init__(self) -> None:
        super().__init__(XML_QUEUE)

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

            if doc["status"] != "approved":
                logger.warning(
                    "Document %s is not in approved status (status=%s), skipping",
                    document_id,
                    doc["status"],
                )
                return

            try:
                draft = get_invoice_draft_for_document(conn, document_id)
                if draft is None:
                    raise ValueError("No invoice draft found for document")

                line_items = get_invoice_line_items_for_draft(conn, str(draft["id"]))

                xml_bytes = generate_fa3_xml(dict(draft), [dict(li) for li in line_items])
                content_hash = hashlib.sha256(xml_bytes).hexdigest()
                xml_str = xml_bytes.decode("utf-8")

                insert_xml_export(conn, document_id, xml_str, content_hash)
                update_document_status(conn, document_id, "xml_generated")
                conn.commit()

                insert_audit_event(
                    conn,
                    document_id,
                    company_id,
                    "xml_generation.succeeded",
                    {
                        "content_hash": content_hash,
                        "size_bytes": len(xml_bytes),
                        "line_item_count": len(line_items),
                    },
                )
                conn.commit()
                logger.info("XML generated for document %s (hash=%s)", document_id, content_hash[:12])

            except Exception as exc:
                error_message = str(exc)
                update_document_retry_count(conn, document_id, attempt)
                conn.commit()
                if attempt >= self.MAX_RETRIES:
                    insert_audit_event(
                        conn,
                        document_id,
                        company_id,
                        "xml_generation.failed",
                        {"error": error_message, "attempt": attempt},
                    )
                    conn.commit()
                raise

        finally:
            conn.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    XmlGenerationWorker().run()
