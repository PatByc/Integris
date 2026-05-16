# KSeF UPO Polling Worker — Step 5 of the pipeline (time-based, not queue-based).
# Runs a loop every 30 seconds. Each cycle fetches all submissions still in "submitted"
# status from the DB and polls the KSeF status API for each one.
# UPO = "Urzędowe Potwierdzenie Odbioru" — the official acceptance receipt from KSeF.
# Status 200 from KSeF → marks document accepted, stores the UPO URL.
# Status 405+ from KSeF → marks document rejected.
# In dry_run mode → immediately marks everything as accepted with a fake KSeF number.
import logging
import os
import time
from uuid import UUID

from workers.db import (
    MAX_POLLING_ATTEMPTS,
    get_connection,
    get_submitted_ksef_submissions,
    insert_audit_event,
    update_document_status,
    update_ksef_submission_poll_result,
)
from workers.ksef_client import KsefClient, KsefError

logger = logging.getLogger(__name__)

_POLL_INTERVAL       = 30
_KSEF_ENV_DRY_RUN    = "dry_run"
_KSEF_ENV_SANDBOX    = "sandbox"
_KSEF_ENV_PRODUCTION = "production"
_CODE_SUCCESS        = 200
_CODE_ERROR_MIN      = 405

_DEFAULT_URLS = {
    _KSEF_ENV_SANDBOX:    "https://api-test.ksef.mf.gov.pl/v2",
    _KSEF_ENV_PRODUCTION: "https://api.ksef.mf.gov.pl/v2",
}


def _api_url(ksef_env: str) -> str:
    return os.environ.get("KSEF_API_URL", "").strip() or _DEFAULT_URLS.get(ksef_env, "")


class KsefUpoPollingWorker:
    def run(self) -> None:
        logger.info("UPO Polling Worker started (interval=%ds, max_attempts=%d)",
                    _POLL_INTERVAL, MAX_POLLING_ATTEMPTS)
        while True:
            try:
                self._scan_cycle()
            except Exception:
                logger.exception("Unhandled error in UPO poll cycle")
            time.sleep(_POLL_INTERVAL)

    def _scan_cycle(self) -> None:
        ksef_env = os.environ.get("KSEF_ENV", _KSEF_ENV_DRY_RUN).strip().lower()

        conn = get_connection()
        try:
            submissions = get_submitted_ksef_submissions(conn)
        finally:
            conn.close()

        if not submissions:
            return

        logger.info("UPO poll: %d submitted document(s)", len(submissions))

        if ksef_env == _KSEF_ENV_DRY_RUN:
            for sub in submissions:
                self._accept_dry_run(sub)
            return

        client = KsefClient(
            api_url=_api_url(ksef_env),
            nip=os.environ.get("KSEF_CLIENT_ID", ""),
            token=os.environ.get("KSEF_CLIENT_SECRET", ""),
            public_key_pem=os.environ.get("KSEF_PUBLIC_KEY_PEM", ""),
        )
        try:
            client.authenticate()
        except KsefError:
            logger.exception("KSeF auth failed; skipping poll cycle")
            client.close()
            return
        try:
            for sub in submissions:
                self._poll_one(client, sub, ksef_env)
        finally:
            client.close()

    def _accept_dry_run(self, sub: dict) -> None:
        document_id = UUID(str(sub["document_id"]))
        company_id  = UUID(str(sub["company_id"]))
        fake_num    = f"DRY-KSEF-{str(document_id)[:8].upper()}"
        attempts    = sub["polling_attempts"] + 1
        conn = get_connection()
        try:
            update_ksef_submission_poll_result(conn, str(sub["id"]), "accepted",
                                               attempts, ksef_number=fake_num)
            update_document_status(conn, document_id, "accepted")
            conn.commit()
            insert_audit_event(conn, document_id, company_id, "ksef.upo.accepted",
                               {"ksef_number": fake_num, "dry_run": True})
            conn.commit()
            logger.info("DRY RUN: accepted %s (%s)", document_id, fake_num)
        except Exception:
            conn.rollback()
            logger.exception("DRY RUN: error accepting %s", sub["id"])
        finally:
            conn.close()

    def _poll_one(self, client: KsefClient, sub: dict, ksef_env: str) -> None:
        document_id   = UUID(str(sub["document_id"]))
        company_id    = UUID(str(sub["company_id"]))
        submission_id = str(sub["id"])
        attempts      = sub["polling_attempts"] + 1

        if not sub["ksef_session_ref"]:
            self._reject(submission_id, document_id, company_id, attempts,
                         {"error": "missing ksef_session_ref"})
            return

        try:
            result = client.get_invoice_status(sub["ksef_session_ref"],
                                               sub["ksef_reference_id"])
        except KsefError as exc:
            logger.warning("Poll transient error for %s: %s", submission_id, exc)
            conn = get_connection()
            try:
                update_ksef_submission_poll_result(conn, submission_id, "submitted",
                                                   attempts,
                                                   error_details={"last_poll_error": str(exc)})
                conn.commit()
            finally:
                conn.close()
            return

        code = result["status_code"]
        conn = get_connection()
        try:
            if code == _CODE_SUCCESS:
                update_ksef_submission_poll_result(conn, submission_id, "accepted",
                                                   attempts,
                                                   ksef_number=result["ksef_number"],
                                                   upo_url=result["upo_url"])
                update_document_status(conn, document_id, "accepted")
                conn.commit()
                insert_audit_event(conn, document_id, company_id, "ksef.upo.accepted",
                                   {"ksef_number": result["ksef_number"], "env": ksef_env})
                conn.commit()
                logger.info("ACCEPTED %s (ksef_number=%s)", document_id, result["ksef_number"])
            elif code >= _CODE_ERROR_MIN:
                update_ksef_submission_poll_result(conn, submission_id, "rejected",
                                                   attempts,
                                                   error_details={"status_code": code})
                update_document_status(conn, document_id, "rejected")
                conn.commit()
                insert_audit_event(conn, document_id, company_id, "ksef.upo.rejected",
                                   {"status_code": code, "env": ksef_env})
                conn.commit()
                logger.warning("REJECTED %s (status_code=%d)", document_id, code)
            else:
                # 100 or 150 — still processing
                update_ksef_submission_poll_result(conn, submission_id, "submitted", attempts)
                conn.commit()
                logger.debug("Still processing %s (code=%d, attempt=%d)",
                             document_id, code, attempts)
        except Exception:
            conn.rollback()
            logger.exception("DB error for submission %s", submission_id)
        finally:
            conn.close()

    def _reject(self, submission_id: str, document_id: UUID, company_id: UUID,
                attempts: int, error_details: dict) -> None:
        conn = get_connection()
        try:
            update_ksef_submission_poll_result(conn, submission_id, "rejected",
                                               attempts, error_details=error_details)
            update_document_status(conn, document_id, "rejected")
            conn.commit()
            insert_audit_event(conn, document_id, company_id, "ksef.upo.rejected",
                               error_details)
            conn.commit()
        finally:
            conn.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    KsefUpoPollingWorker().run()
