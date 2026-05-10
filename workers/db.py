import json
import os
import uuid
from uuid import UUID

from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

import psycopg2
import psycopg2.extras


def get_connection():
    return psycopg2.connect(
        os.environ["DATABASE_URL"],
        cursor_factory=psycopg2.extras.RealDictCursor,
    )


def get_document(conn, document_id: UUID) -> dict | None:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, company_id, storage_path, status, retry_count FROM documents WHERE id = %s",
            (str(document_id),),
        )
        return cur.fetchone()


def update_document_status(conn, document_id: UUID, status: str) -> None:
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE documents SET status = %s, updated_at = NOW() WHERE id = %s",
            (status, str(document_id)),
        )


def update_document_retry_count(conn, document_id: UUID, count: int) -> None:
    with conn.cursor() as cur:
        cur.execute(
            "UPDATE documents SET retry_count = %s, updated_at = NOW() WHERE id = %s",
            (count, str(document_id)),
        )


def insert_ocr_result(
    conn,
    document_id: UUID,
    raw_text: str | None,
    page_count: int | None,
    provider: str,
    attempt_number: int,
    error_message: str | None,
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO ocr_results
                (id, document_id, raw_text, page_count, provider, attempt_number, error_message, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
            """,
            (
                str(uuid.uuid4()),
                str(document_id),
                raw_text,
                page_count,
                provider,
                attempt_number,
                error_message,
            ),
        )


def get_latest_ocr_result(conn, document_id: UUID) -> dict | None:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, raw_text, page_count FROM ocr_results WHERE document_id = %s ORDER BY created_at DESC LIMIT 1",
            (str(document_id),),
        )
        return cur.fetchone()


def insert_invoice_draft(conn, document_id: UUID, company_id: UUID, data: dict) -> str:
    draft_id = str(uuid.uuid4())
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO invoice_drafts (
                id, document_id, company_id,
                seller_name, seller_nip, seller_address,
                buyer_name, buyer_nip, buyer_address,
                invoice_number, issue_date, sale_date, payment_due_date,
                payment_method, currency,
                net_total, vat_total, gross_total,
                vat_summary, confidence, flags,
                created_at, updated_at
            ) VALUES (
                %s, %s, %s,
                %s, %s, %s,
                %s, %s, %s,
                %s, %s, %s, %s,
                %s, %s,
                %s, %s, %s,
                %s, %s, %s,
                NOW(), NOW()
            )
            """,
            (
                draft_id, str(document_id), str(company_id),
                data.get("seller_name"), data.get("seller_nip"), data.get("seller_address"),
                data.get("buyer_name"), data.get("buyer_nip"), data.get("buyer_address"),
                data.get("invoice_number"),
                data.get("issue_date"), data.get("sale_date"), data.get("payment_due_date"),
                data.get("payment_method"), data.get("currency", "PLN"),
                data.get("net_total"), data.get("vat_total"), data.get("gross_total"),
                json.dumps(data.get("vat_summary") or []),
                data.get("confidence"),
                json.dumps(data.get("flags") or []),
            ),
        )
    return draft_id


def insert_invoice_line_item(conn, draft_id: str, item: dict, sort_order: int) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO invoice_line_items (
                id, invoice_draft_id,
                description, quantity, unit, unit_price_net,
                vat_rate, net_amount, vat_amount, gross_amount,
                sort_order, created_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            """,
            (
                str(uuid.uuid4()), draft_id,
                item.get("description"), item.get("quantity"), item.get("unit"),
                item.get("unit_price_net"), item.get("vat_rate"),
                item.get("net_amount"), item.get("vat_amount"), item.get("gross_amount"),
                sort_order,
            ),
        )


def insert_audit_event(
    conn,
    document_id: UUID,
    company_id: UUID,
    event_type: str,
    metadata: dict,
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO audit_events (id, document_id, company_id, event_type, metadata, created_at)
            VALUES (%s, %s, %s, %s, %s, NOW())
            """,
            (
                str(uuid.uuid4()),
                str(document_id),
                str(company_id),
                event_type,
                json.dumps(metadata),
            ),
        )


def get_invoice_draft_for_document(conn, document_id: UUID) -> dict | None:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT * FROM invoice_drafts WHERE document_id = %s ORDER BY created_at DESC LIMIT 1",
            (str(document_id),),
        )
        return cur.fetchone()


def get_invoice_line_items_for_draft(conn, draft_id: str) -> list[dict]:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT * FROM invoice_line_items WHERE invoice_draft_id = %s ORDER BY sort_order",
            (draft_id,),
        )
        return cur.fetchall()


def insert_xml_export(
    conn,
    document_id: UUID,
    xml_content: str,
    content_hash: str,
) -> str:
    export_id = str(uuid.uuid4())
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO xml_exports (id, document_id, xml_content, content_hash, schema_version, created_at)
            VALUES (%s, %s, %s, %s, 'FA(3)', NOW())
            """,
            (export_id, str(document_id), xml_content, content_hash),
        )
    return export_id


def get_xml_export_for_document(conn, document_id: UUID) -> dict | None:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, xml_content, content_hash FROM xml_exports WHERE document_id = %s ORDER BY created_at DESC LIMIT 1",
            (str(document_id),),
        )
        return cur.fetchone()


def get_ksef_submission_for_document(conn, document_id: UUID) -> dict | None:
    with conn.cursor() as cur:
        cur.execute(
            "SELECT id, status, ksef_reference_id FROM ksef_submissions WHERE document_id = %s ORDER BY created_at DESC LIMIT 1",
            (str(document_id),),
        )
        return cur.fetchone()


def insert_ksef_submission(conn, document_id: UUID, xml_export_id: str) -> str:
    submission_id = str(uuid.uuid4())
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO ksef_submissions (id, document_id, xml_export_id, status, created_at, updated_at)
            VALUES (%s, %s, %s, 'pending', NOW(), NOW())
            """,
            (submission_id, str(document_id), xml_export_id),
        )
    return submission_id


def update_ksef_submission(
    conn,
    submission_id: str,
    status: str,
    ksef_reference_id: str | None = None,
    response_payload: dict | None = None,
    error_details: dict | None = None,
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            UPDATE ksef_submissions
            SET status = %s,
                ksef_reference_id = COALESCE(%s, ksef_reference_id),
                response_payload = COALESCE(%s::jsonb, response_payload),
                error_details = COALESCE(%s::jsonb, error_details),
                updated_at = NOW()
            WHERE id = %s
            """,
            (
                status,
                ksef_reference_id,
                json.dumps(response_payload) if response_payload is not None else None,
                json.dumps(error_details) if error_details is not None else None,
                submission_id,
            ),
        )


def insert_validation_errors(
    conn,
    document_id: UUID,
    invoice_draft_id: str,
    errors: list,
) -> None:
    if not errors:
        return
    with conn.cursor() as cur:
        for error in errors:
            cur.execute(
                """
                INSERT INTO validation_errors
                    (id, document_id, invoice_draft_id, rule_name, field_path, message, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, NOW())
                """,
                (
                    str(uuid.uuid4()),
                    str(document_id),
                    invoice_draft_id,
                    error.rule_name,
                    error.field_path,
                    error.message,
                ),
            )
