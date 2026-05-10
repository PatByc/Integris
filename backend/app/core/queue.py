import json
from uuid import UUID

import redis as redis_lib

from app.core.config import settings

OCR_QUEUE = "ocr_jobs"
EXTRACTION_QUEUE = "extraction_jobs"
XML_QUEUE = "xml_jobs"
KSEF_QUEUE = "ksef_submission_jobs"


def enqueue_ocr_job(document_id: UUID) -> None:
    r = redis_lib.from_url(settings.redis_url)
    r.rpush(OCR_QUEUE, json.dumps({"document_id": str(document_id)}))


def enqueue_extraction_job(document_id: UUID) -> None:
    r = redis_lib.from_url(settings.redis_url)
    r.rpush(EXTRACTION_QUEUE, json.dumps({"document_id": str(document_id)}))


def enqueue_xml_job(document_id: UUID) -> None:
    r = redis_lib.from_url(settings.redis_url)
    r.rpush(XML_QUEUE, json.dumps({"document_id": str(document_id)}))


def enqueue_ksef_submission_job(document_id: UUID) -> None:
    r = redis_lib.from_url(settings.redis_url)
    r.rpush(KSEF_QUEUE, json.dumps({"document_id": str(document_id)}))
