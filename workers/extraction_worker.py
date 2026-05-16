# Extraction Worker — Step 2 of the pipeline.
# Reads the raw OCR text stored by the OCR worker and sends it to GPT-4.1-mini
# with a strict system prompt that demands a specific JSON schema (seller, buyer,
# amounts, line items, VAT breakdown, etc.). The LLM response is parsed, stored as
# an invoice_draft + line_items, then validated against business rules (missing NIP,
# totals mismatch, etc.). Validation errors are stored separately for display in the
# review UI. Status → needs_review on success, extraction_failed after 3 retries.
import json
import logging
import os
from uuid import UUID

import openai

from workers.base_worker import BaseWorker
from workers.db import (
    get_connection,
    get_document,
    get_latest_ocr_result,
    insert_audit_event,
    insert_invoice_draft,
    insert_invoice_line_item,
    insert_validation_errors,
    update_document_retry_count,
    update_document_status,
)
from workers.validation import validate_invoice_draft
from workers.queue import EXTRACTION_QUEUE

logger = logging.getLogger(__name__)

_SYSTEM_PROMPT = """\
You are an invoice data extraction assistant for Polish companies.
You receive raw OCR text from a Polish VAT invoice (Faktura VAT) and extract structured data.

Return a single JSON object with these exact fields:
- seller_name: string or null
- seller_nip: string (digits only, e.g. "1234567890") or null
- seller_address: string or null
- buyer_name: string or null
- buyer_nip: string (digits only) or null
- buyer_address: string or null
- invoice_number: string or null
- issue_date: string "YYYY-MM-DD" or null
- sale_date: string "YYYY-MM-DD" or null
- payment_due_date: string "YYYY-MM-DD" or null
- payment_method: string (e.g. "przelew", "gotówka") or null
- currency: string (default "PLN")
- net_total: number or null
- vat_total: number or null
- gross_total: number or null
- vat_summary: array of {"vat_rate": number, "net_amount": number, "vat_amount": number}
- confidence: number 0.0–1.0 reflecting overall extraction quality
- flags: array of strings for issues found (e.g. "missing_buyer_nip", "totals_mismatch", "unclear_date")
- line_items: array of objects with keys: description, quantity, unit, unit_price_net, vat_rate, net_amount, vat_amount, gross_amount (each number or null)

Rules:
- Use null for any field you cannot read clearly from the text.
- NIP numbers must be digits only — strip dashes and spaces.
- Dates must be ISO format YYYY-MM-DD.
- Amounts must be numbers, not strings.
- If computed line item totals do not match header totals, add "totals_mismatch" to flags.
- Do not invent data. When uncertain, use null and lower the confidence score.
"""


class ExtractionWorker(BaseWorker):
    def __init__(self) -> None:
        super().__init__(EXTRACTION_QUEUE)

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

            if attempt == 1:
                update_document_status(conn, document_id, "extraction_processing")
                update_document_retry_count(conn, document_id, 0)
                conn.commit()
                insert_audit_event(conn, document_id, company_id, "extraction.started", {})
                conn.commit()

            try:
                ocr_result = get_latest_ocr_result(conn, document_id)
                if not ocr_result or not ocr_result["raw_text"]:
                    raise ValueError("No OCR text available for extraction")

                data = _extract_invoice(ocr_result["raw_text"])
                draft_id = insert_invoice_draft(conn, document_id, company_id, data)
                line_items = data.get("line_items") or []
                for i, item in enumerate(line_items):
                    insert_invoice_line_item(conn, draft_id, item, sort_order=i)

                validation_errors = validate_invoice_draft(data, line_items)
                insert_validation_errors(conn, document_id, draft_id, validation_errors)

                update_document_status(conn, document_id, "needs_review")
                conn.commit()
                insert_audit_event(
                    conn,
                    document_id,
                    company_id,
                    "extraction.succeeded",
                    {
                        "confidence": data.get("confidence"),
                        "flags_count": len(data.get("flags") or []),
                        "validation_error_count": len(validation_errors),
                    },
                )
                conn.commit()

            except Exception as exc:
                error_message = str(exc)
                update_document_retry_count(conn, document_id, attempt)
                conn.commit()
                if attempt >= self.MAX_RETRIES:
                    update_document_status(conn, document_id, "extraction_failed")
                    conn.commit()
                    insert_audit_event(
                        conn,
                        document_id,
                        company_id,
                        "extraction.failed",
                        {"error": error_message, "attempt": attempt},
                    )
                    conn.commit()
                raise
        finally:
            conn.close()


MAX_OCR_CHARS = 12_000


def _extract_invoice(raw_text: str) -> dict:
    truncated = raw_text[:MAX_OCR_CHARS]
    client = openai.OpenAI(api_key=os.environ["OPENAI_API_KEY"], timeout=60.0)
    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": truncated},
        ],
        temperature=0,
    )
    return json.loads(response.choices[0].message.content)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    ExtractionWorker().run()
