# KSeF Submission Worker — Step 4 of the pipeline.
# Reads the generated FA(3) XML, authenticates with the KSeF API, opens a session,
# posts the XML, and records the KSeF reference number returned by the API.
# Supports three modes via KSEF_ENV env var:
#   dry_run    — no HTTP call, assigns a fake DRY-RUN-XXXXXXXX reference (default for dev)
#   sandbox    — submits to the KSeF test environment (api-test.ksef.mf.gov.pl)
#   production — submits to the live KSeF (api.ksef.mf.gov.pl)
# Idempotent: skips re-submission if the document is already submitted/accepted.
# Status → submission_pending → submitted on success, rejected after 3 retries.
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
    update_document_retry_count,
    update_document_status,
    update_ksef_submission,
)
from workers.ksef_client import KsefClient, KsefError
from workers.queue import KSEF_QUEUE

logger = logging.getLogger(__name__)

_KSEF_ENV_SANDBOX = "sandbox"
_KSEF_ENV_PRODUCTION = "production"
_KSEF_ENV_DRY_RUN = "dry_run"

_DEFAULT_URLS = {
    _KSEF_ENV_SANDBOX: "https://api-test.ksef.mf.gov.pl/v2",
    _KSEF_ENV_PRODUCTION: "https://api.ksef.mf.gov.pl/v2",
}


def _resolve_api_url(ksef_env: str) -> str:
    override = os.environ.get("KSEF_API_URL", "").strip()
    if override:
        return override
    return _DEFAULT_URLS.get(ksef_env, "")


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

            ksef_env = os.environ.get("KSEF_ENV", _KSEF_ENV_DRY_RUN).strip().lower()

            try:
                if ksef_env == _KSEF_ENV_DRY_RUN:
                    ksef_ref = f"DRY-RUN-{str(document_id)[:8].upper()}"
                    session_ref = None
                    logger.info("DRY RUN: simulated KSeF submission for document %s (fake_ref=%s)", document_id, ksef_ref)
                    audit_meta = {"ksef_reference_id": ksef_ref, "dry_run": True}
                elif ksef_env in (_KSEF_ENV_SANDBOX, _KSEF_ENV_PRODUCTION):
                    if ksef_env == _KSEF_ENV_PRODUCTION:
                        logger.warning("Submitting to PRODUCTION KSeF for document %s", document_id)
                    client = KsefClient(
                        api_url=_resolve_api_url(ksef_env),
                        nip=os.environ.get("KSEF_CLIENT_ID", ""),
                        token=os.environ.get("KSEF_CLIENT_SECRET", ""),
                        public_key_pem=os.environ.get("KSEF_PUBLIC_KEY_PEM", ""),
                    )
                    client.authenticate()
                    session_ref = client.open_session()
                    try:
                        ksef_ref = client.submit_invoice(xml_bytes)
                    finally:
                        client.close_session()
                        client.close()
                    logger.info("Invoice submitted to KSeF (%s) for document %s (ref=%s)", ksef_env, document_id, ksef_ref)
                    audit_meta = {"ksef_reference_id": ksef_ref, "env": ksef_env}
                else:
                    raise ValueError(f"Unknown KSEF_ENV value: {ksef_env!r}. Expected: dry_run, sandbox, production")

                update_ksef_submission(
                    conn,
                    submission_id,
                    status="submitted",
                    ksef_reference_id=ksef_ref,
                    ksef_session_ref=session_ref,
                    response_payload={"referenceNumber": ksef_ref},
                )
                update_document_status(conn, document_id, "submitted")
                conn.commit()

                insert_audit_event(conn, document_id, company_id, "ksef.submission.succeeded", audit_meta)
                conn.commit()

            except Exception as exc:
                error_msg = str(exc)
                update_ksef_submission(
                    conn,
                    submission_id,
                    status="rejected",
                    error_details={"error": error_msg, "attempt": attempt},
                )
                update_document_retry_count(conn, document_id, attempt)
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


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    KsefSubmissionWorker().run()
